import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, DateTime, ForeignKey, Index, Uuid, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.game import Game


class PersonalBest(Base):
    __tablename__ = "personal_bests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    game_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("games.id", ondelete="RESTRICT"),
        primary_key=True
    )
    high_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="personal_bests")
    game: Mapped["Game"] = relationship("Game", back_populates="personal_bests")

    __table_args__ = (
        Index("ix_personal_bests_leaderboard", "game_id", "high_score"),
    )

