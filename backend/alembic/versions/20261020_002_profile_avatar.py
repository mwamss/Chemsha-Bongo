"""Add account profile image storage.

Revision ID: 20261020_002
Revises: 20261010_001
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261020_002"
down_revision: Union[str, None] = "20261010_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.add_column(sa.Column("avatar_image", sa.LargeBinary(), nullable=True))
        batch_op.add_column(sa.Column("avatar_mime_type", sa.String(length=32), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.drop_column("avatar_mime_type")
        batch_op.drop_column("avatar_image")
