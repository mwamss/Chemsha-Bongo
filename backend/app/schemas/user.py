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
    has_avatar: bool = False


class UserSettingsUpdate(BaseModel):
    sound_muted: Optional[bool] = None
    haptics_enabled: Optional[bool] = None
    ambient_enabled: Optional[bool] = None
    spotify_uri: Optional[str] = Field(
        None,
        max_length=255,
        pattern=r"^(|spotify:(playlist|album|track|artist|show|episode):[A-Za-z0-9]+)$",
    )
    private_sync_enabled: Optional[bool] = None


class UserSettingsRead(BaseModel):
    sound_muted: bool
    haptics_enabled: bool
    ambient_enabled: bool
    spotify_uri: Optional[str] = None
    private_sync_enabled: bool = False

