from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User, UserProfile
from backend.app.models.settings import UserSettings
from backend.app.schemas.user import (
    UserProfileRead,
    UserProfileUpdate,
    UserSettingsRead,
    UserSettingsUpdate,
)

router = APIRouter()


@router.get("/profile", response_model=UserProfileRead)
def get_profile(current_user: User = Depends(get_current_user)):
    profile = current_user.profile
    if not profile:
        return UserProfileRead(surname="", display_name=None, avatar_color="#1e3a34")
    return UserProfileRead(
        surname=profile.surname,
        display_name=profile.display_name,
        avatar_color=profile.avatar_color,
    )


@router.patch("/profile", response_model=UserProfileRead)
def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    if payload.surname is not None:
        profile.surname = payload.surname.strip()
    if payload.display_name is not None:
        profile.display_name = payload.display_name.strip()
    if payload.avatar_color is not None:
        profile.avatar_color = payload.avatar_color

    db.commit()
    db.refresh(profile)

    return UserProfileRead(
        surname=profile.surname,
        display_name=profile.display_name,
        avatar_color=profile.avatar_color,
    )


@router.get("/settings", response_model=UserSettingsRead)
def get_settings(current_user: User = Depends(get_current_user)):
    settings = current_user.settings
    if not settings:
        return UserSettingsRead(sound_muted=False, haptics_enabled=True, ambient_enabled=False)
    return UserSettingsRead(
        sound_muted=settings.sound_muted,
        haptics_enabled=settings.haptics_enabled,
        ambient_enabled=settings.ambient_enabled,
    )


@router.patch("/settings", response_model=UserSettingsRead)
def update_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = current_user.settings
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    if payload.sound_muted is not None:
        settings.sound_muted = payload.sound_muted
    if payload.haptics_enabled is not None:
        settings.haptics_enabled = payload.haptics_enabled
    if payload.ambient_enabled is not None:
        settings.ambient_enabled = payload.ambient_enabled

    db.commit()
    db.refresh(settings)

    return UserSettingsRead(
        sound_muted=settings.sound_muted,
        haptics_enabled=settings.haptics_enabled,
        ambient_enabled=settings.ambient_enabled,
    )

