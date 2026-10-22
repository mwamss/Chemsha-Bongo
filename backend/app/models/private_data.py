import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import DateTime, ForeignKey, JSON, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class UserPrivateData(Base):
    __tablename__ = "user_private_data"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    banja_entries: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    banja_tombstones: Mapped[dict[str, int]] = mapped_column(JSON, default=dict, nullable=False)
    daily_rhythm: Mapped[dict[str, dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=False)
    wellbeing_checkins: Mapped[dict[str, dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
