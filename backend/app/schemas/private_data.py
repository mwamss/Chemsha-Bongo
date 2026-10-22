from datetime import date
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class JournalEntry(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    title: str = Field(default="", max_length=300)
    body: str = Field(default="", max_length=20000)
    session: str = Field(default="", max_length=100)
    promptId: Optional[int] = None
    promptCategory: str = Field(default="", max_length=100)
    tags: List[str] = Field(default_factory=list, max_length=20)
    localOnly: bool = False
    timestamp: str = Field(default="", max_length=100)
    wordCount: int = Field(default=0, ge=0, le=20000)
    isFavorite: bool = False
    hasVoiceNote: bool = False
    createdAt: int = Field(default=0, ge=0)
    updatedAt: int = Field(..., ge=0)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value):
        if any(not tag.strip() or len(tag) > 40 for tag in value):
            raise ValueError("Reflection tags must contain 1 to 40 characters.")
        return list(dict.fromkeys(tag.strip() for tag in value))


class RhythmDay(BaseModel):
    focusSessions: int = Field(default=0, ge=0, le=10000)
    focusSeconds: int = Field(default=0, ge=0, le=86400)
    restHonored: bool = False
    updatedAt: int = Field(default=0, ge=0)


class WellbeingCheckin(BaseModel):
    mood: str = Field(..., pattern="^(calm|okay|tense|low|energized)$")
    updatedAt: int = Field(..., ge=0)


class PrivateDataSync(BaseModel):
    banjaEntries: List[JournalEntry] = Field(default_factory=list, max_length=500)
    banjaTombstones: Dict[str, int] = Field(default_factory=dict)
    dailyRhythm: Dict[str, RhythmDay] = Field(default_factory=dict)
    wellbeingCheckins: Dict[str, WellbeingCheckin] = Field(default_factory=dict, max_length=365)

    @field_validator("banjaTombstones")
    @classmethod
    def bound_tombstones(cls, value):
        if len(value) > 10000 or any(not key or len(key) > 128 or timestamp < 0 for key, timestamp in value.items()):
            raise ValueError("Invalid journal deletion markers.")
        return value

    @field_validator("dailyRhythm")
    @classmethod
    def validate_dates(cls, value):
        if len(value) > 3650:
            raise ValueError("Rhythm history is too large.")
        for key in value:
            date.fromisoformat(key)
        return value

    @field_validator("wellbeingCheckins")
    @classmethod
    def validate_wellbeing_dates(cls, value):
        for key in value:
            date.fromisoformat(key)
        return value
