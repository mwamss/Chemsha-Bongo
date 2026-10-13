from typing import Optional
from pydantic import BaseModel, Field


class UserProfileUpdate(BaseModel):
    surname: Optional[str] = Field(None, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class UserProfileRead(BaseModel):
    surname: str
    display_name: Optional[str] = None
    avatar_color: str


class UserSettingsUpdate(BaseModel):
    sound_muted: Optional[bool] = None
    haptics_enabled: Optional[bool] = None
    ambient_enabled: Optional[bool] = None


class UserSettingsRead(BaseModel):
    sound_muted: bool
    haptics_enabled: bool
    ambient_enabled: bool

