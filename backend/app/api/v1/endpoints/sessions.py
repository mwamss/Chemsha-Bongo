from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.challenge_time import challenge_date as current_challenge_date
from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.game import Game
from backend.app.models.personal_best import PersonalBest
from backend.app.models.session import GameSession, DailyBlitzSession, BlitzRoundItem
from backend.app.models.stats import UserAggregatedStats
from backend.app.schemas.session import (
    GameSessionCreate,
    GameSessionResponse,
    DailyBlitzSessionCreate,
    DailyBlitzSessionResponse,
)

router = APIRouter()


@router.post("/game", response_model=GameSessionResponse, status_code=status.HTTP_201_CREATED)
def record_game_session(
    payload: GameSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Record an individual game round with bounds validation and anti-cheat checks.
    Idempotent by client_session_id.
    """
    # Serialize account record updates on PostgreSQL so concurrent submissions
    # cannot both create a PersonalBest or lose an aggregate-stat increment.
    db.scalar(select(User).where(User.id == current_user.id).with_for_update())

    # 1. Check idempotency
    existing = db.scalar(
        select(GameSession).where(GameSession.client_session_id == payload.client_session_id)
    )
    if existing:
        if existing.user_id != current_user.id:
            raise HTTPException(status_code=409, detail="This session identifier has already been used.")
        pb = db.scalar(
            select(PersonalBest).where(
                PersonalBest.user_id == current_user.id,
                PersonalBest.game_id == payload.game_id,
            )
        )
        return GameSessionResponse(
            session_id=existing.id,
            is_new_high_score=False,
            is_new_best_streak=False,
            high_score=pb.high_score if pb else existing.score,
            best_streak=pb.best_streak if pb else existing.max_streak,
            accuracy_pct=existing.accuracy_pct,
        )

    # 2. Validate Game exists
    game = db.scalar(select(Game).where(Game.id == payload.game_id))
    if not game:
        raise HTTPException(status_code=400, detail=f"Invalid game ID: {payload.game_id}")

    # 3. Anti-cheat heuristics & sanity bounds
    is_flagged = False
    rate = payload.score / max(1, payload.duration_sec)
    if rate > 200 or payload.score > settings.MAX_THEORETICAL_SCORE_PER_ROUND:
        is_flagged = True
    if payload.max_streak > payload.correct_count or payload.max_streak > settings.MAX_THEORETICAL_STREAK_PER_ROUND:
        is_flagged = True
    if payload.correct_count + payload.wrong_count > payload.duration_sec * 10:
        is_flagged = True

    total_ans = payload.correct_count + payload.wrong_count
    accuracy = round((payload.correct_count / total_ans) * 100) if total_ans > 0 else 100

    # 4. Create Session Record
    session = GameSession(
        user_id=current_user.id,
        game_id=payload.game_id,
        mode=payload.mode,
        score=payload.score,
        max_streak=payload.max_streak,
        correct_count=payload.correct_count,
        wrong_count=payload.wrong_count,
        accuracy_pct=accuracy,
        duration_sec=payload.duration_sec,
        client_session_id=payload.client_session_id,
        is_flagged=is_flagged,
    )
    db.add(session)

    # Flagged sessions are retained for review but never affect public or account records.
    pb = db.scalar(
        select(PersonalBest).where(
            PersonalBest.user_id == current_user.id,
            PersonalBest.game_id == payload.game_id,
        )
    )
    is_new_high = False
    is_new_streak = False

    if not pb and not is_flagged:
        pb = PersonalBest(
            user_id=current_user.id,
            game_id=payload.game_id,
            high_score=payload.score,
            best_streak=payload.max_streak,
            is_verified=True,
        )
        db.add(pb)
        is_new_high = True
        is_new_streak = True
    elif pb and not is_flagged:
        if payload.score >= pb.high_score:
            pb.is_verified = True
        if payload.score > pb.high_score:
            pb.high_score = payload.score
            is_new_high = True
        if payload.max_streak > pb.best_streak:
            pb.best_streak = payload.max_streak
            is_new_streak = True

    # 6. Update Aggregated Stats
    stats = current_user.aggregated_stats
    if not stats:
        stats = UserAggregatedStats(user_id=current_user.id)
        db.add(stats)

    if not is_flagged:
        stats.total_games_played += 1
        stats.total_correct += payload.correct_count
        stats.total_wrong += payload.wrong_count
        if payload.max_streak > stats.highest_overall_streak:
            stats.highest_overall_streak = payload.max_streak
        stats.last_played_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)
    if pb:
        db.refresh(pb)

    return GameSessionResponse(
        session_id=session.id,
        is_new_high_score=is_new_high,
        is_new_best_streak=is_new_streak,
        high_score=pb.high_score if pb else 0,
        best_streak=pb.best_streak if pb else 0,
        accuracy_pct=accuracy,
    )


@router.post("/blitz", response_model=DailyBlitzSessionResponse, status_code=status.HTTP_201_CREATED)
def record_daily_blitz(
    payload: DailyBlitzSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Record a 3-game Daily Blitz workout session.
    Validates round scores and enforces challenge date isolation.
    """
    # Keep repeated/concurrent submissions for one account ordered before the
    # idempotency check and aggregate-stat update.
    db.scalar(select(User).where(User.id == current_user.id).with_for_update())

    # 1. Idempotency check
    existing = db.scalar(
        select(DailyBlitzSession).where(DailyBlitzSession.client_session_id == payload.client_session_id)
    )
    if existing:
        if existing.user_id != current_user.id:
            raise HTTPException(status_code=409, detail="This session identifier has already been used.")
        stats = current_user.aggregated_stats
        return DailyBlitzSessionResponse(
            blitz_session_id=existing.id,
            is_new_blitz_high=False,
            best_blitz_score=stats.best_blitz_score if stats else existing.total_score,
            best_blitz_rating=stats.best_blitz_rating if stats else existing.rating,
            total_score=existing.total_score,
            rating=existing.rating,
            blitz_date=existing.blitz_date,
        )

    # Only completed three-game workouts can be ranked.
    if len(payload.rounds) != settings.DAILY_BLITZ_ROUNDS_REQUIRED:
        raise HTTPException(status_code=400, detail="A Daily Blitz must contain exactly three completed rounds.")
    if [r.round_order for r in payload.rounds] != list(range(1, settings.DAILY_BLITZ_ROUNDS_REQUIRED + 1)):
        raise HTTPException(status_code=400, detail="Blitz rounds must be ordered from 1 to 3.")
    if len({r.game_id for r in payload.rounds}) != settings.DAILY_BLITZ_ROUNDS_REQUIRED:
        raise HTTPException(status_code=400, detail="A Daily Blitz must contain three different games.")
    for round_item in payload.rounds:
        if not db.scalar(select(Game).where(Game.id == round_item.game_id)):
            raise HTTPException(status_code=400, detail=f"Invalid game ID: {round_item.game_id}")
        if round_item.score > settings.MAX_THEORETICAL_SCORE_PER_ROUND:
            raise HTTPException(status_code=400, detail="A blitz round score exceeds the allowed maximum.")
        if round_item.max_streak > settings.MAX_THEORETICAL_STREAK_PER_ROUND:
            raise HTTPException(status_code=400, detail="A blitz round streak exceeds the allowed maximum.")

    # Derive the rating server-side; never trust a client-supplied label.
    sum_round_scores = sum(r.score for r in payload.rounds)
    if sum_round_scores != payload.total_score:
        raise HTTPException(
            status_code=400,
            detail=f"Blitz total score ({payload.total_score}) must equal sum of round scores ({sum_round_scores})."
        )

    rating = "Novice"
    if payload.total_score >= 4500:
        rating = "Grandmaster"
    elif payload.total_score >= 3500:
        rating = "Genius"
    elif payload.total_score >= 2500:
        rating = "Sharpshooter"
    elif payload.total_score >= 1500:
        rating = "Quick Thinker"

    today_date = current_challenge_date()

    blitz_session = DailyBlitzSession(
        user_id=current_user.id,
        blitz_date=today_date,
        total_score=payload.total_score,
        rating=rating,
        games_completed=len(payload.rounds),
        duration_sec=payload.duration_sec,
        client_session_id=payload.client_session_id,
    )
    db.add(blitz_session)
    db.flush()

    # Add Blitz Round Items
    for r in payload.rounds:
        round_item = BlitzRoundItem(
            blitz_session_id=blitz_session.id,
            game_id=r.game_id,
            round_order=r.round_order,
            score=r.score,
            accuracy_pct=r.accuracy_pct,
            max_streak=r.max_streak,
        )
        db.add(round_item)

    # Update User Aggregated Stats
    stats = current_user.aggregated_stats
    if not stats:
        stats = UserAggregatedStats(user_id=current_user.id)
        db.add(stats)

    stats.blitz_workouts_completed += 1
    is_new_blitz_high = False
    if payload.total_score > stats.best_blitz_score:
        stats.best_blitz_score = payload.total_score
        stats.best_blitz_rating = rating
        is_new_blitz_high = True

    stats.last_played_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(blitz_session)
    db.refresh(stats)

    return DailyBlitzSessionResponse(
        blitz_session_id=blitz_session.id,
        is_new_blitz_high=is_new_blitz_high,
        best_blitz_score=stats.best_blitz_score,
        best_blitz_rating=stats.best_blitz_rating,
        total_score=blitz_session.total_score,
        rating=blitz_session.rating,
        blitz_date=today_date,
    )

