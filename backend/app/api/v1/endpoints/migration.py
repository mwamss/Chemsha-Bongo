from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User, UserProfile
from backend.app.models.settings import UserSettings
from backend.app.models.stats import UserAggregatedStats
from backend.app.models.personal_best import PersonalBest
from backend.app.models.game import Game
from backend.app.schemas.migration import LocalStorageMigrationRequest, MigrationResultResponse

router = APIRouter()


@router.post("/migrate-local", response_model=MigrationResultResponse)
def migrate_local_storage_data(
    payload: LocalStorageMigrationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Safely ingest and merge a player's browser localStorage data into their authenticated account.
    Uses deterministic conflict resolution: max(server, local) for records, preserving existing data.
    """
    high_scores_merged = 0
    streaks_merged = 0
    workouts_merged = 0

    # 1. Merge High Scores & Best Streaks
    for game_id, score in payload.highScores.items():
        streak = payload.bestStreaks.get(game_id, 0)
        
        # Verify valid game
        game = db.scalar(select(Game).where(Game.id == game_id))
        if not game:
            continue

        pb = db.scalar(
            select(PersonalBest).where(
                PersonalBest.user_id == current_user.id,
                PersonalBest.game_id == game_id,
            )
        )
        if not pb:
            pb = PersonalBest(
                user_id=current_user.id,
                game_id=game_id,
                high_score=score,
                best_streak=streak,
            )
            db.add(pb)
            high_scores_merged += 1
            if streak > 0:
                streaks_merged += 1
        else:
            if score > pb.high_score:
                pb.high_score = score
                high_scores_merged += 1
            if streak > pb.best_streak:
                pb.best_streak = streak
                streaks_merged += 1

    # 2. Merge Blitz Stats & Totals
    stats = current_user.aggregated_stats
    if not stats:
        stats = UserAggregatedStats(user_id=current_user.id)
        db.add(stats)

    if payload.blitzStats:
        if payload.blitzStats.bestScore > stats.best_blitz_score:
            stats.best_blitz_score = payload.blitzStats.bestScore
            stats.best_blitz_rating = payload.blitzStats.bestRating
        stats.blitz_workouts_completed += payload.blitzStats.workoutsCompleted
        workouts_merged += payload.blitzStats.workoutsCompleted

    if payload.totals:
        stats.total_games_played += payload.totals.gamesPlayed
        stats.total_correct += payload.totals.correctAnswers
        stats.total_wrong += payload.totals.wrongAnswers
        if payload.totals.highestOverallStreak > stats.highest_overall_streak:
            stats.highest_overall_streak = payload.totals.highestOverallStreak

    # 3. Adopt Surname if server is blank
    if payload.profile and payload.profile.surname:
        profile = current_user.profile
        if not profile:
            profile = UserProfile(user_id=current_user.id, surname=payload.profile.surname.strip())
            db.add(profile)
        elif not profile.surname.strip():
            profile.surname = payload.profile.surname.strip()

    # 4. Merge Settings
    if payload.settings:
        user_settings = current_user.settings
        if not user_settings:
            user_settings = UserSettings(user_id=current_user.id)
            db.add(user_settings)
        user_settings.sound_muted = payload.settings.soundMuted
        user_settings.haptics_enabled = payload.settings.hapticsEnabled

    db.commit()

    return MigrationResultResponse(
        success=True,
        message="Local data successfully merged into your account.",
        high_scores_merged=high_scores_merged,
        streaks_merged=streaks_merged,
        workouts_merged=workouts_merged,
    )

