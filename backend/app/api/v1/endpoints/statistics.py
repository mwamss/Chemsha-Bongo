from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.personal_best import PersonalBest
from backend.app.models.stats import UserAggregatedStats
from backend.app.schemas.statistics import StatsSummaryResponse, PersonalBestRead

router = APIRouter()


@router.get("/summary", response_model=StatsSummaryResponse)
def get_user_statistics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's complete statistical totals and personal best records."""
    stats = current_user.aggregated_stats
    if not stats:
        stats = UserAggregatedStats(user_id=current_user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)

    pbs = db.scalars(select(PersonalBest).where(PersonalBest.user_id == current_user.id)).all()
    pb_dict: Dict[str, PersonalBestRead] = {
        pb.game_id: PersonalBestRead(high_score=pb.high_score, best_streak=pb.best_streak)
        for pb in pbs
    }

    total_ans = stats.total_correct + stats.total_wrong
    accuracy = round((stats.total_correct / total_ans) * 100) if total_ans > 0 else 100

    return StatsSummaryResponse(
        games_played=stats.total_games_played,
        correct_answers=stats.total_correct,
        wrong_answers=stats.total_wrong,
        accuracy=accuracy,
        highest_overall_streak=stats.highest_overall_streak,
        blitz_workouts=stats.blitz_workouts_completed,
        best_blitz_score=stats.best_blitz_score,
        best_blitz_rating=stats.best_blitz_rating,
        personal_bests=pb_dict,
    )

