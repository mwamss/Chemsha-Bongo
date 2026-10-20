import uuid
from typing import Optional
from fastapi import Depends, HTTPException, Request, status, Cookie, Header
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.security import decode_access_token, validate_csrf_token
from backend.app.db.session import get_db
from backend.app.models.user import User


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
    cookie_token: Optional[str] = Cookie(default=None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(default=None),
) -> Optional[User]:
    """
    Extract current authenticated user either from HttpOnly cookie or Bearer header.
    Returns None if unauthenticated.
    """
    token: Optional[str] = None
    is_cookie_auth = False

    # 1. Bearer Header takes priority for API clients/testing
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
    elif cookie_token:
        token = cookie_token
        is_cookie_auth = True

    if not token:
        return None

    user_id_str = decode_access_token(token)
    if not user_id_str:
        return None

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        return None

    # 2. CSRF check for state-changing requests when authenticated via cookie
    if is_cookie_auth and request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # Exempt auth endpoints (login/register/logout) where session doesn't exist yet
        path = request.url.path
        if not any(path.endswith(route) for route in (
            "/auth/login",
            "/auth/register",
            "/auth/google",
            "/auth/logout",
        )):
            csrf_header = request.headers.get("X-CSRF-Token")
            if not csrf_header or not validate_csrf_token(csrf_header, str(user_uuid)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token validation failed. Please refresh and retry."
                )

    user = db.scalar(select(User).where(User.id == user_uuid))
    if not user or not user.is_active:
        return None

    return user


def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Enforce authenticated user, raising 401 if missing."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

