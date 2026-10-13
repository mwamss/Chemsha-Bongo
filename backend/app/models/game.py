from typing import TYPE_CHECKING, List
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.personal_best import PersonalBest
    from backend.app.models.session import GameSession, BlitzRoundItem


class Game(Base, TimestampMixin):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g., 'color-clash'
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    category_label: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=False)
    color_accent: Mapped[str] = mapped_column(String(10), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    personal_bests: Mapped[List["PersonalBest"]] = relationship("PersonalBest", back_populates="game")
    sessions: Mapped[List["GameSession"]] = relationship("GameSession", back_populates="game")
    blitz_rounds: Mapped[List["BlitzRoundItem"]] = relationship("BlitzRoundItem", back_populates="game")

