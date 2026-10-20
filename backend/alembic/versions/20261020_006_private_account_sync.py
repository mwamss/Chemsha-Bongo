"""Add opt-in account sync for journal and rhythm data.

Revision ID: 20261020_006
Revises: 20261020_005
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261020_006"
down_revision: Union[str, None] = "20261020_005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.add_column(sa.Column("private_sync_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "user_private_data",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("banja_entries", sa.JSON(), nullable=False),
        sa.Column("banja_tombstones", sa.JSON(), nullable=False),
        sa.Column("daily_rhythm", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_private_data")
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("private_sync_enabled")
