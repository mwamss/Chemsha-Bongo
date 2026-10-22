"""Store optional private daily wellbeing check-ins.

Revision ID: 20261021_008
Revises: 20261020_007
Create Date: 2026-10-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261021_008"
down_revision: Union[str, None] = "20261020_007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_private_data") as batch_op:
        batch_op.add_column(sa.Column("wellbeing_checkins", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade() -> None:
    with op.batch_alter_table("user_private_data") as batch_op:
        batch_op.drop_column("wellbeing_checkins")
