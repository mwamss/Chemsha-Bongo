import uuid
from datetime import datetime, date, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Integer, String, Boolean, Date, DateTime, ForeignKey, Index, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.game import Game


class GameSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "game_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    game_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("games.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    mode: Mapped[str] = mapped_column(String(20), default="free-play", nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    max_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accuracy_pct: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    client_session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    user: Mapped["User"] = relationship("User", back_populates="game_sessions")
    game: Mapped["Game"] = relationship("Game", back_populates="sessions")

    __table_args__ = (
        Index("ix_game_sessions_user_played", "user_id", "played_at"),
        Index("ix_game_sessions_game_score", "game_id", "score"),
    )


class DailyBlitzSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "daily_blitz_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    blitz_date: Mapped[date] = mapped_column(
        Date,
        default=lambda: datetime.now(timezone.utc).date(),
        nullable=False,
        index=True
    )
    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    rating: Mapped[str] = mapped_column(String(50), default="Novice", nullable=False)
    games_completed: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    client_session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    user: Mapped["User"] = relationship("User", back_populates="blitz_sessions")
    rounds: Mapped[List["BlitzRoundItem"]] = relationship(
        "BlitzRoundItem", back_populates="blitz_session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_blitz_sessions_date_score", "blitz_date", "total_score"),
        Index("ix_blitz_sessions_user_date", "user_id", "blitz_date"),
    )


class BlitzRoundItem(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "blitz_round_items"

    blitz_session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("daily_blitz_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    game_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("games.id", ondelete="RESTRICT"),
        nullable=False
    )
    round_order: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    accuracy_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    max_streak: Mapped[int] = mapped_column(Integer, nullable=False)

    blitz_session: Mapped["DailyBlitzSession"] = relationship("DailyBlitzSession", back_populates="rounds")
    game: Mapped["Game"] = relationship("Game", back_populates="blitz_rounds")

