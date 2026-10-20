import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, Boolean, ForeignKey, Uuid, LargeBinary, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.settings import UserSettings
    from backend.app.models.stats import UserAggregatedStats
    from backend.app.models.personal_best import PersonalBest
    from backend.app.models.session import GameSession, DailyBlitzSession


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    google_sub: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    settings: Mapped[Optional["UserSettings"]] = relationship(
        "UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    aggregated_stats: Mapped[Optional["UserAggregatedStats"]] = relationship(
        "UserAggregatedStats", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    personal_bests: Mapped[List["PersonalBest"]] = relationship(
        "PersonalBest", back_populates="user", cascade="all, delete-orphan"
    )
    game_sessions: Mapped[List["GameSession"]] = relationship(
        "GameSession", back_populates="user", cascade="all, delete-orphan"
    )
    blitz_sessions: Mapped[List["DailyBlitzSession"]] = relationship(
        "DailyBlitzSession", back_populates="user", cascade="all, delete-orphan"
    )


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    surname: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_color: Mapped[str] = mapped_column(String(7), default="#1e3a34", nullable=False)
    avatar_image: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    avatar_mime_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    legacy_imported_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="profile")

