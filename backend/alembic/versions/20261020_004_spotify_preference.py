"""Store a player's Spotify embed selection.

Revision ID: 20261020_004
Revises: 20261020_003
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261020_004"
down_revision: Union[str, None] = "20261020_003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.add_column(sa.Column("spotify_uri", sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("spotify_uri")
