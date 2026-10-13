from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    surname: str
    avatar_color: str
    score: int
    secondary_metric: Optional[int] = None  # streak or accuracy
    achieved_at: datetime


class DailyBlitzLeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    surname: str
    avatar_color: str
    total_score: int
    rating: str
    played_at: datetime


class LeaderboardResponse(BaseModel):
    game_id: Optional[str] = None
    timeframe: str
    entries: List[LeaderboardEntry]


class DailyBlitzLeaderboardResponse(BaseModel):
    challenge_date: date
    timezone: str
    entries: List[DailyBlitzLeaderboardEntry]

