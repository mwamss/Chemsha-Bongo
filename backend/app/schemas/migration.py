from typing import Dict, Optional
from pydantic import BaseModel, Field, field_validator


class LocalStorageBlitzStats(BaseModel):
    bestScore: int = Field(default=0, ge=0, le=15000)
    bestRating: str = Field(default="Novice", max_length=50)
    workoutsCompleted: int = Field(default=0, ge=0, le=1000000)


class LocalStorageTotals(BaseModel):
    gamesPlayed: int = Field(default=0, ge=0, le=1000000)
    correctAnswers: int = Field(default=0, ge=0, le=100000000)
    wrongAnswers: int = Field(default=0, ge=0, le=100000000)
    highestOverallStreak: int = Field(default=0, ge=0, le=50)


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

    @field_validator("highScores")
    @classmethod
    def validate_high_scores(cls, values):
        if len(values) > 10 or any(not key or len(key) > 50 or score < 0 or score > 5000 for key, score in values.items()):
            raise ValueError("Legacy scores exceed the allowed range.")
        return values

    @field_validator("bestStreaks")
    @classmethod
    def validate_streaks(cls, values):
        if len(values) > 10 or any(not key or len(key) > 50 or streak < 0 or streak > 50 for key, streak in values.items()):
            raise ValueError("Legacy streaks exceed the allowed range.")
        return values


class MigrationResultResponse(BaseModel):
    success: bool
    message: str
    high_scores_merged: int
    streaks_merged: int
    workouts_merged: int

