from typing import Dict, Optional
from pydantic import BaseModel, Field


class LocalStorageBlitzStats(BaseModel):
    bestScore: int = Field(default=0, ge=0)
    bestRating: str = Field(default="Novice")
    workoutsCompleted: int = Field(default=0, ge=0)


class LocalStorageTotals(BaseModel):
    gamesPlayed: int = Field(default=0, ge=0)
    correctAnswers: int = Field(default=0, ge=0)
    wrongAnswers: int = Field(default=0, ge=0)
    highestOverallStreak: int = Field(default=0, ge=0)


class LocalStorageSettings(BaseModel):
    soundMuted: bool = False
    hapticsEnabled: bool = True


class LocalStorageProfile(BaseModel):
    surname: Optional[str] = ""


class LocalStorageMigrationRequest(BaseModel):
    profile: Optional[LocalStorageProfile] = None
    highScores: Dict[str, int] = Field(default_factory=dict)
    bestStreaks: Dict[str, int] = Field(default_factory=dict)
    blitzStats: Optional[LocalStorageBlitzStats] = None
    totals: Optional[LocalStorageTotals] = None
    settings: Optional[LocalStorageSettings] = None


class MigrationResultResponse(BaseModel):
    success: bool
    message: str
    high_scores_merged: int
    streaks_merged: int
    workouts_merged: int

