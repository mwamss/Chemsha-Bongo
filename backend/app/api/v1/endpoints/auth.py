import logging
import re
import secrets
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
from backend.app.schemas.auth import RegisterRequest, LoginRequest, GoogleLoginRequest, TokenResponse, AuthMeResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_google_credential(credential: str):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on this server.")
    try:
        from google.auth.exceptions import GoogleAuthError
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError:
        logger.exception("Google authentication dependency is unavailable")
        raise HTTPException(status_code=503, detail="Google sign-in is temporarily unavailable.")

    try:
        return id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            audience=settings.GOOGLE_CLIENT_ID,
        )
    except (ValueError, GoogleAuthError):
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified.")


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
    try:
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
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during registration:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(exc)}"
        )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Authenticate via username/email and password."""
    try:
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
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during login:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login service error: {str(exc)}",
        )


@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Verify a Google Identity Services token and sign in or create an account."""
    claims = verify_google_credential(payload.credential)

    google_sub = claims.get("sub")
    email = (claims.get("email") or "").strip().lower()
    if not google_sub or not email or claims.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="Google did not provide a verified account email.")

    user = db.scalar(select(User).where(User.google_sub == google_sub))
    if not user:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            # Google only authoritatively controls Gmail and verified Workspace addresses.
            is_authoritative_email = email.endswith("@gmail.com") or bool(claims.get("hd"))
            if not is_authoritative_email:
                raise HTTPException(
                    status_code=409,
                    detail="Sign in with your password first to connect this Google account.",
                )
            if user.google_sub and user.google_sub != google_sub:
                raise HTTPException(status_code=409, detail="This account is connected to another Google identity.")
            user.google_sub = google_sub
        else:
            username_base = re.sub(r"[^a-z0-9_-]", "", email.split("@", 1)[0])
            if len(username_base) < 3:
                username_base = f"{username_base or 'player'}_user"
            username_base = username_base[:42]
            username = username_base
            while db.scalar(select(User.id).where(User.username == username)):
                username = f"{username_base[:41]}_{secrets.token_hex(3)}"

            profile = UserProfile(
                surname=(claims.get("name") or "")[:100],
                display_name=(claims.get("name") or "")[:100] or None,
                avatar_color="#1e3a34",
            )
            user = User(
                email=email,
                username=username,
                hashed_password=get_password_hash(secrets.token_urlsafe(48)),
                google_sub=google_sub,
                is_active=True,
                is_verified=True,
                profile=profile,
                settings=UserSettings(),
                aggregated_stats=UserAggregatedStats(),
            )
            db.add(user)

    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated.")

    db.commit()
    db.refresh(user)
    access_token = create_access_token(str(user.id))
    csrf_token = generate_csrf_token(str(user.id))
    set_auth_cookie(response, access_token)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        csrf_token=csrf_token,
        user_id=user.id,
        username=user.username,
        surname=user.profile.surname if user.profile else "",
    )


@router.post("/google/link")
def link_google_identity(
    payload: GoogleLoginRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Attach a verified Google identity to the currently authenticated account."""
    claims = verify_google_credential(payload.credential)
    google_sub = claims.get("sub")
    if not google_sub or claims.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="Google did not provide a verified account identity.")

    linked_user = db.scalar(select(User).where(User.google_sub == google_sub))
    if linked_user and linked_user.id != current_user.id:
        raise HTTPException(status_code=409, detail="This Google account is connected to another Chemsha Bongo account.")
    if current_user.google_sub and current_user.google_sub != google_sub:
        raise HTTPException(status_code=409, detail="A different Google account is already connected.")

    current_user.google_sub = google_sub
    db.commit()
    return {"google_connected": True}


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
    has_avatar = bool(current_user.profile and current_user.profile.avatar_image)
    sound_muted = current_user.settings.sound_muted if current_user.settings else False
    haptics_enabled = current_user.settings.haptics_enabled if current_user.settings else True
    ambient_enabled = current_user.settings.ambient_enabled if current_user.settings else False
    spotify_uri = current_user.settings.spotify_uri if current_user.settings else None

    csrf_token = generate_csrf_token(str(current_user.id))

    return AuthMeResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        surname=surname,
        avatar_color=avatar_color,
        has_avatar=has_avatar,
        google_connected=bool(current_user.google_sub),
        sound_muted=sound_muted,
        haptics_enabled=haptics_enabled,
        ambient_enabled=ambient_enabled,
        spotify_uri=spotify_uri,
        csrf_token=csrf_token,
    )

