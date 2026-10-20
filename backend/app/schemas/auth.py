import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=10, max_length=128)
    surname: Optional[str] = Field(default="", max_length=100)


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(..., min_length=20, max_length=8192)


class TokenResponse(BaseModel):
    expires_in_minutes: int
    csrf_token: Optional[str] = None
    user_id: uuid.UUID
    username: str
    surname: str


class AuthMeResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    surname: str
    avatar_color: str
    has_avatar: bool
    google_connected: bool
    sound_muted: bool
    haptics_enabled: bool
    ambient_enabled: bool
    spotify_uri: Optional[str] = None
    private_sync_enabled: bool = False
    csrf_token: str

