import uuid
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field


class GameSessionCreate(BaseModel):
    game_id: str
    mode: str = Field(default="free-play", pattern=r"^(free-play|blitz)$")
    score: int = Field(..., ge=0, le=10000)
    max_streak: int = Field(..., ge=0, le=100)
    correct_count: int = Field(default=0, ge=0, le=200)
    wrong_count: int = Field(default=0, ge=0, le=200)
    duration_sec: int = Field(default=30, ge=5, le=300)
    client_session_id: str = Field(..., min_length=10, max_length=64)


class GameSessionResponse(BaseModel):
    session_id: uuid.UUID
    is_new_high_score: bool
    is_new_best_streak: bool
    high_score: int
    best_streak: int
    accuracy_pct: int


class BlitzRoundCreate(BaseModel):
    game_id: str
    round_order: int = Field(..., ge=1, le=5)
    score: int = Field(..., ge=0, le=10000)
    accuracy_pct: int = Field(..., ge=0, le=100)
    max_streak: int = Field(..., ge=0, le=100)


class DailyBlitzSessionCreate(BaseModel):
    total_score: int = Field(..., ge=0, le=30000)
    rating: str = Field(..., min_length=2, max_length=50)
    duration_sec: int = Field(default=90, ge=15, le=600)
    client_session_id: str = Field(..., min_length=10, max_length=64)
    rounds: List[BlitzRoundCreate] = Field(..., min_length=1, max_length=5)


class DailyBlitzSessionResponse(BaseModel):
    blitz_session_id: uuid.UUID
    is_new_blitz_high: bool
    best_blitz_score: int
    best_blitz_rating: str
    total_score: int
    rating: str
    blitz_date: date

