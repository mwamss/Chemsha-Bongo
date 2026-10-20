from datetime import datetime, date, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, and_

from backend.app.core.config import settings
from backend.app.core.deps import get_db
from backend.app.models.user import User, UserProfile
from backend.app.models.personal_best import PersonalBest
from backend.app.models.session import DailyBlitzSession
from backend.app.schemas.leaderboard import (
    LeaderboardResponse,
    LeaderboardEntry,
    DailyBlitzLeaderboardResponse,
    DailyBlitzLeaderboardEntry,
)

router = APIRouter()


@router.get("/game/{game_id}", response_model=LeaderboardResponse)
def get_game_leaderboard(
    game_id: str,
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get top player high scores for a specific mini-game.
    Ranked by high_score descending, with tie-break by earliest achieved_at.
    """
    stmt = (
        select(PersonalBest, User, UserProfile)
        .join(User, PersonalBest.user_id == User.id)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .where(PersonalBest.game_id == game_id, PersonalBest.is_verified.is_(True))
        .order_by(desc(PersonalBest.high_score), PersonalBest.achieved_at.asc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()

    entries = []
    for rank, (pb, user, profile) in enumerate(rows, start=1):
        surname = profile.surname if profile and profile.surname else user.username
        avatar_color = profile.avatar_color if profile and profile.avatar_color else "#1e3a34"
        entries.append(
            LeaderboardEntry(
                rank=rank,
                user_id=str(user.id),
                username=user.username,
                surname=surname,
                avatar_color=avatar_color,
                score=pb.high_score,
                secondary_metric=pb.best_streak,
                achieved_at=pb.achieved_at,
            )
        )

    return LeaderboardResponse(
        game_id=game_id,
        timeframe="all_time",
        entries=entries,
    )


@router.get("/blitz", response_model=DailyBlitzLeaderboardResponse)
def get_daily_blitz_leaderboard(
    challenge_date: Optional[date] = None,
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get the official Daily Blitz leaderboard for a challenge date.
    Rules:
      - Unlimited attempts allowed.
      - Each player is ranked by their single highest qualifying completed score on this date.
      - Incomplete (games_completed < 3) or flagged attempts are excluded.
      - Tie-breaker: Earliest achieved timestamp wins.
    """
    if not challenge_date:
        challenge_date = datetime.now(timezone.utc).date()

    # Subquery: Player's best score on the challenge date
    best_scores_subq = (
        select(
            DailyBlitzSession.user_id,
            func.max(DailyBlitzSession.total_score).label("best_score"),
        )
        .where(
            and_(
                DailyBlitzSession.blitz_date == challenge_date,
                DailyBlitzSession.games_completed >= settings.DAILY_BLITZ_ROUNDS_REQUIRED,
                DailyBlitzSession.is_flagged == False,
            )
        )
        .group_by(DailyBlitzSession.user_id)
        .subquery()
    )

    # Main query: Join with session to get earliest played_at timestamp and user profile
    stmt = (
        select(
            DailyBlitzSession,
            User,
            UserProfile,
        )
        .join(
            best_scores_subq,
            and_(
                DailyBlitzSession.user_id == best_scores_subq.c.user_id,
                DailyBlitzSession.total_score == best_scores_subq.c.best_score,
            )
        )
        .join(User, DailyBlitzSession.user_id == User.id)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .where(DailyBlitzSession.blitz_date == challenge_date)
        .order_by(
            desc(DailyBlitzSession.total_score),
            DailyBlitzSession.played_at.asc()
        )
    )

    rows = db.execute(stmt).all()

    # Deduplicate users (in case same player scored the exact same top score multiple times)
    seen_users = set()
    entries = []
    rank = 1

    for session, user, profile in rows:
        if user.id in seen_users:
            continue
        seen_users.add(user.id)

        surname = profile.surname if profile and profile.surname else user.username
        avatar_color = profile.avatar_color if profile and profile.avatar_color else "#1e3a34"

        entries.append(
            DailyBlitzLeaderboardEntry(
                rank=rank,
                user_id=str(user.id),
                username=user.username,
                surname=surname,
                avatar_color=avatar_color,
                total_score=session.total_score,
                rating=session.rating,
                played_at=session.played_at,
            )
        )
        rank += 1
        if len(entries) >= limit:
            break

    return DailyBlitzLeaderboardResponse(
        challenge_date=challenge_date,
        timezone=settings.CHALLENGE_TIMEZONE,
        entries=entries,
    )

