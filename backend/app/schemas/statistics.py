from typing import Dict, Optional
from pydantic import BaseModel


class PersonalBestRead(BaseModel):
    high_score: int
    best_streak: int
    is_verified: bool = True


class StatsSummaryResponse(BaseModel):
    games_played: int
    correct_answers: int
    wrong_answers: int
    accuracy: Optional[int] = None
    highest_overall_streak: int
    blitz_workouts: int
    best_blitz_score: int
    best_blitz_rating: str
    personal_bests: Dict[str, PersonalBestRead]

