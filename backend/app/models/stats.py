import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Integer, String, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.user import User


class UserAggregatedStats(Base):
    __tablename__ = "user_aggregated_stats"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    total_games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_wrong: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    highest_overall_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blitz_workouts_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_blitz_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_blitz_rating: Mapped[str] = mapped_column(String(50), default="Novice", nullable=False)
    last_played_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="aggregated_stats")

