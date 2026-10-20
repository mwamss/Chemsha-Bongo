from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
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

MAX_AVATAR_BYTES = 512 * 1024
AVATAR_TYPES = {
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}


def _has_avatar(profile: UserProfile) -> bool:
    return profile.avatar_image is not None


@router.get("/profile", response_model=UserProfileRead)
def get_profile(current_user: User = Depends(get_current_user)):
    profile = current_user.profile
    if not profile:
        return UserProfileRead(surname="", display_name=None, avatar_color="#1e3a34", has_avatar=False)
    return UserProfileRead(
        surname=profile.surname,
        display_name=profile.display_name,
        avatar_color=profile.avatar_color,
        has_avatar=_has_avatar(profile),
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
        has_avatar=_has_avatar(profile),
    )


@router.put("/profile/avatar", status_code=status.HTTP_200_OK)
async def upload_profile_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mime_type = (file.content_type or "").lower()
    signature_check = AVATAR_TYPES.get(mime_type)
    if not signature_check:
        raise HTTPException(status_code=415, detail="Use a JPEG, PNG, or WebP image.")

    image_data = await file.read(MAX_AVATAR_BYTES + 1)
    if not image_data or len(image_data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Profile images must be 512 KB or smaller.")
    if not signature_check(image_data):
        raise HTTPException(status_code=415, detail="The uploaded file does not match its image type.")

    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.avatar_image = image_data
    profile.avatar_mime_type = mime_type
    db.commit()
    return {"has_avatar": True}


@router.get("/profile/avatar")
def get_profile_avatar(current_user: User = Depends(get_current_user)):
    profile = current_user.profile
    if not profile or not profile.avatar_image or not profile.avatar_mime_type:
        raise HTTPException(status_code=404, detail="No profile image is set.")

    return Response(
        content=profile.avatar_image,
        media_type=profile.avatar_mime_type,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.delete("/profile/avatar", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if profile:
        profile.avatar_image = None
        profile.avatar_mime_type = None
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/settings", response_model=UserSettingsRead)
def get_settings(current_user: User = Depends(get_current_user)):
    settings = current_user.settings
    if not settings:
        return UserSettingsRead(sound_muted=False, haptics_enabled=True, ambient_enabled=False, spotify_uri=None, private_sync_enabled=False)
    return UserSettingsRead(
        sound_muted=settings.sound_muted,
        haptics_enabled=settings.haptics_enabled,
        ambient_enabled=settings.ambient_enabled,
        spotify_uri=settings.spotify_uri,
        private_sync_enabled=settings.private_sync_enabled,
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
    if payload.spotify_uri is not None:
        settings.spotify_uri = payload.spotify_uri or None
    if payload.private_sync_enabled is not None:
        settings.private_sync_enabled = payload.private_sync_enabled

    db.commit()
    db.refresh(settings)

    return UserSettingsRead(
        sound_muted=settings.sound_muted,
        haptics_enabled=settings.haptics_enabled,
        ambient_enabled=settings.ambient_enabled,
        spotify_uri=settings.spotify_uri,
        private_sync_enabled=settings.private_sync_enabled,
    )

