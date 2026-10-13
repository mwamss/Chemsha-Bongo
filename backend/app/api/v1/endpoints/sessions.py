from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
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
    # 1. Check idempotency
    existing = db.scalar(
        select(GameSession).where(GameSession.client_session_id == payload.client_session_id)
    )
    if existing:
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
    if payload.max_streak > (payload.correct_count + 1):
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

    # 5. Update or Create Personal Best
    pb = db.scalar(
        select(PersonalBest).where(
            PersonalBest.user_id == current_user.id,
            PersonalBest.game_id == payload.game_id,
        )
    )
    is_new_high = False
    is_new_streak = False

    if not pb:
        pb = PersonalBest(
            user_id=current_user.id,
            game_id=payload.game_id,
            high_score=payload.score,
            best_streak=payload.max_streak,
        )
        db.add(pb)
        is_new_high = True
        is_new_streak = True
    else:
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

    stats.total_games_played += 1
    stats.total_correct += payload.correct_count
    stats.total_wrong += payload.wrong_count
    if payload.max_streak > stats.highest_overall_streak:
        stats.highest_overall_streak = payload.max_streak
    stats.last_played_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)
    db.refresh(pb)

    return GameSessionResponse(
        session_id=session.id,
        is_new_high_score=is_new_high,
        is_new_best_streak=is_new_streak,
        high_score=pb.high_score,
        best_streak=pb.best_streak,
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
    # 1. Idempotency check
    existing = db.scalar(
        select(DailyBlitzSession).where(DailyBlitzSession.client_session_id == payload.client_session_id)
    )
    if existing:
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

    # 2. Validation
    sum_round_scores = sum(r.score for r in payload.rounds)
    if abs(sum_round_scores - payload.total_score) > 10:  # Allow minor rounding tolerance
        raise HTTPException(
            status_code=400,
            detail=f"Blitz total score ({payload.total_score}) must equal sum of round scores ({sum_round_scores})."
        )

    today_date = datetime.now(timezone.utc).date()

    blitz_session = DailyBlitzSession(
        user_id=current_user.id,
        blitz_date=today_date,
        total_score=payload.total_score,
        rating=payload.rating,
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
        stats.best_blitz_rating = payload.rating
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

