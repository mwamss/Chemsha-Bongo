"""Make browser legacy-data import idempotent.

Revision ID: 20261020_005
Revises: 20261020_004
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261020_005"
down_revision: Union[str, None] = "20261020_004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.add_column(sa.Column("legacy_imported_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.drop_column("legacy_imported_at")
