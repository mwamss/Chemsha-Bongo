from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from backend.app.core.config import settings
from backend.app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    generate_csrf_token,
)
from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User, UserProfile
from backend.app.models.settings import UserSettings
from backend.app.models.stats import UserAggregatedStats
from backend.app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, AuthMeResponse

router = APIRouter()


def set_auth_cookie(response: Response, token: str) -> None:
    """Set secure HttpOnly authentication cookie."""
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register a new player account and establish authenticated session."""
    # Check if username or email exists
    existing = db.scalar(
        select(User).where(
            or_(User.email == payload.email.lower(), User.username == payload.username.lower())
        )
    )
    if existing:
        if existing.email.lower() == payload.email.lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        raise HTTPException(status_code=400, detail="Username is already taken.")

    # Create User
    new_user = User(
        email=payload.email.lower(),
        username=payload.username.lower(),
        hashed_password=get_password_hash(payload.password),
        is_active=True,
    )
    db.add(new_user)
    db.flush()  # populate new_user.id

    # Create associated Profile, Settings, and Stats
    profile = UserProfile(
        user_id=new_user.id,
        surname=payload.surname or "",
        avatar_color="#1e3a34",
    )
    user_settings = UserSettings(user_id=new_user.id)
    aggregated_stats = UserAggregatedStats(user_id=new_user.id)

    db.add_all([profile, user_settings, aggregated_stats])
    db.commit()
    db.refresh(new_user)

    # Issue access token
    access_token = create_access_token(str(new_user.id))
    csrf_token = generate_csrf_token(str(new_user.id))
    set_auth_cookie(response, access_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        csrf_token=csrf_token,
        user_id=new_user.id,
        username=new_user.username,
        surname=profile.surname,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Authenticate via username/email and password."""
    ident = payload.username_or_email.lower().strip()
    user = db.scalar(
        select(User).where(
            or_(User.email == ident, User.username == ident)
        )
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated.",
        )

    access_token = create_access_token(str(user.id))
    csrf_token = generate_csrf_token(str(user.id))
    set_auth_cookie(response, access_token)

    surname = user.profile.surname if user.profile else ""

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        csrf_token=csrf_token,
        user_id=user.id,
        username=user.username,
        surname=surname,
    )


@router.post("/logout")
def logout(response: Response):
    """Invalidate session by clearing the HttpOnly cookie."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=AuthMeResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get the currently authenticated user's profile and settings."""
    surname = current_user.profile.surname if current_user.profile else ""
    avatar_color = current_user.profile.avatar_color if current_user.profile else "#1e3a34"
    sound_muted = current_user.settings.sound_muted if current_user.settings else False
    haptics_enabled = current_user.settings.haptics_enabled if current_user.settings else True
    ambient_enabled = current_user.settings.ambient_enabled if current_user.settings else False

    csrf_token = generate_csrf_token(str(current_user.id))

    return AuthMeResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        surname=surname,
        avatar_color=avatar_color,
        sound_muted=sound_muted,
        haptics_enabled=haptics_enabled,
        ambient_enabled=ambient_enabled,
        csrf_token=csrf_token,
    )

