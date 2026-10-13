"""initial_schema

Revision ID: 20261010_001
Revises: 
Create Date: 2026-10-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20261010_001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # 2. user_profiles
    op.create_table(
        'user_profiles',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('surname', sa.String(length=100), server_default='', nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=True),
        sa.Column('avatar_color', sa.String(length=7), server_default='#1e3a34', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )

    # 3. user_settings
    op.create_table(
        'user_settings',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('sound_muted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('haptics_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('ambient_enabled', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )

    # 4. user_aggregated_stats
    op.create_table(
        'user_aggregated_stats',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('total_games_played', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_correct', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_wrong', sa.Integer(), server_default='0', nullable=False),
        sa.Column('highest_overall_streak', sa.Integer(), server_default='0', nullable=False),
        sa.Column('blitz_workouts_completed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('best_blitz_score', sa.Integer(), server_default='0', nullable=False),
        sa.Column('best_blitz_rating', sa.String(length=50), server_default='Novice', nullable=False),
        sa.Column('last_played_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )

    # 5. games
    op.create_table(
        'games',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('subtitle', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('category_label', sa.String(length=100), nullable=False),
        sa.Column('icon', sa.String(length=10), nullable=False),
        sa.Column('color_accent', sa.String(length=10), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. personal_bests
    op.create_table(
        'personal_bests',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('game_id', sa.String(length=50), nullable=False),
        sa.Column('high_score', sa.Integer(), server_default='0', nullable=False),
        sa.Column('best_streak', sa.Integer(), server_default='0', nullable=False),
        sa.Column('achieved_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'game_id')
    )
    op.create_index('ix_personal_bests_leaderboard', 'personal_bests', ['game_id', 'high_score'])

    # 7. game_sessions
    op.create_table(
        'game_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('game_id', sa.String(length=50), nullable=False),
        sa.Column('mode', sa.String(length=20), server_default='free-play', nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('max_streak', sa.Integer(), server_default='0', nullable=False),
        sa.Column('correct_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('wrong_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('accuracy_pct', sa.Integer(), server_default='100', nullable=False),
        sa.Column('duration_sec', sa.Integer(), server_default='30', nullable=False),
        sa.Column('client_session_id', sa.String(length=64), nullable=False),
        sa.Column('is_flagged', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('played_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_game_sessions_client_session_id', 'game_sessions', ['client_session_id'], unique=True)
    op.create_index('ix_game_sessions_user_played', 'game_sessions', ['user_id', 'played_at'])
    op.create_index('ix_game_sessions_game_score', 'game_sessions', ['game_id', 'score'])

    # 8. daily_blitz_sessions
    op.create_table(
        'daily_blitz_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('blitz_date', sa.Date(), nullable=False),
        sa.Column('total_score', sa.Integer(), nullable=False),
        sa.Column('rating', sa.String(length=50), server_default='Novice', nullable=False),
        sa.Column('games_completed', sa.Integer(), server_default='3', nullable=False),
        sa.Column('duration_sec', sa.Integer(), server_default='90', nullable=False),
        sa.Column('client_session_id', sa.String(length=64), nullable=False),
        sa.Column('is_flagged', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('played_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_blitz_sessions_client_session_id', 'daily_blitz_sessions', ['client_session_id'], unique=True)
    op.create_index('ix_blitz_sessions_date_score', 'daily_blitz_sessions', ['blitz_date', 'total_score'])
    op.create_index('ix_blitz_sessions_user_date', 'daily_blitz_sessions', ['user_id', 'blitz_date'])

    # 9. blitz_round_items
    op.create_table(
        'blitz_round_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('blitz_session_id', sa.Uuid(), nullable=False),
        sa.Column('game_id', sa.String(length=50), nullable=False),
        sa.Column('round_order', sa.Integer(), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('accuracy_pct', sa.Integer(), nullable=False),
        sa.Column('max_streak', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['blitz_session_id'], ['daily_blitz_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('blitz_round_items')
    op.drop_table('daily_blitz_sessions')
    op.drop_table('game_sessions')
    op.drop_table('personal_bests')
    op.drop_table('games')
    op.drop_table('user_aggregated_stats')
    op.drop_table('user_settings')
    op.drop_table('user_profiles')
    op.drop_table('users')

