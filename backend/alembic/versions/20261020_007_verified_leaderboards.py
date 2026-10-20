"""Keep imported and suspicious personal bests off public rankings.

Revision ID: 20261020_007
Revises: 20261020_006
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261020_007"
down_revision: Union[str, None] = "20261020_006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("personal_bests") as batch_op:
        batch_op.add_column(sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.true()))

    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE personal_bests
        SET is_verified = FALSE
        WHERE NOT EXISTS (
            SELECT 1 FROM game_sessions
            WHERE game_sessions.user_id = personal_bests.user_id
              AND game_sessions.game_id = personal_bests.game_id
              AND game_sessions.is_flagged = FALSE
              AND game_sessions.score >= personal_bests.high_score
        )
    """))


def downgrade() -> None:
    with op.batch_alter_table("personal_bests") as batch_op:
        batch_op.drop_column("is_verified")
