"""initial

Revision ID: 4f6709c24153
Revises: 
Create Date: 2026-04-01 21:05:16.911554

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '4f6709c24153'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # All FK columns referencing neon_auth.user.id must be UUID (Neon Auth stores user.id as UUID).
    # Our own PKs (blends.id, etc.) stay as VARCHAR(36) since they use uuid4() strings.

    op.create_table('blends',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('participant_a_id', UUID(as_uuid=False), nullable=False),
    sa.Column('participant_b_id', UUID(as_uuid=False), nullable=False),
    sa.Column('status', sa.String(length=24), nullable=False),
    sa.Column('compatibility_score', sa.Float(), nullable=False),
    sa.Column('tracks_common', sa.JSON(), nullable=False),
    sa.Column('tracks_a', sa.JSON(), nullable=False),
    sa.Column('tracks_b', sa.JSON(), nullable=False),
    sa.Column('tracks_recommended', sa.JSON(), nullable=False),
    sa.Column('diagnostics', sa.JSON(), nullable=False),
    sa.Column('youtube_playlist_id', sa.String(length=128), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['participant_a_id'], ['neon_auth.user.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['participant_b_id'], ['neon_auth.user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_blends_participant_a_id'), 'blends', ['participant_a_id'], unique=False)
    op.create_index(op.f('ix_blends_participant_b_id'), 'blends', ['participant_b_id'], unique=False)

    op.create_table('playlist_sources',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', UUID(as_uuid=False), nullable=False),
    sa.Column('source_type', sa.String(length=20), nullable=False),
    sa.Column('source_value', sa.String(length=512), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('track_count', sa.Integer(), nullable=False),
    sa.Column('tracks', sa.JSON(), nullable=False),
    sa.Column('failure_reason', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['neon_auth.user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_playlist_sources_user_id'), 'playlist_sources', ['user_id'], unique=False)

    op.create_table('jobs',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('job_type', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('progress', sa.Integer(), nullable=False),
    sa.Column('blend_id', sa.String(length=36), nullable=False),
    sa.Column('owner_id', UUID(as_uuid=False), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('celery_task_id', sa.String(length=128), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['blend_id'], ['blends.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['owner_id'], ['neon_auth.user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_job_blend_status', 'jobs', ['blend_id', 'status'], unique=False)
    op.create_index(op.f('ix_jobs_blend_id'), 'jobs', ['blend_id'], unique=False)
    op.create_index(op.f('ix_jobs_owner_id'), 'jobs', ['owner_id'], unique=False)

    op.create_table('blend_feedback',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', UUID(as_uuid=False), nullable=False),
    sa.Column('blend_id', sa.String(length=36), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=True),
    sa.Column('quick_option', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['blend_id'], ['blends.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['neon_auth.user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'blend_id', name='uq_blend_feedback')
    )
    op.create_index(op.f('ix_blend_feedback_blend_id'), 'blend_feedback', ['blend_id'], unique=False)
    op.create_index(op.f('ix_blend_feedback_user_id'), 'blend_feedback', ['user_id'], unique=False)

    op.create_table('track_feedback',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', UUID(as_uuid=False), nullable=False),
    sa.Column('blend_id', sa.String(length=36), nullable=False),
    sa.Column('track_id', sa.String(length=512), nullable=False),
    sa.Column('action', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['blend_id'], ['blends.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['neon_auth.user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'blend_id', 'track_id', name='uq_track_feedback')
    )
    op.create_index(op.f('ix_track_feedback_blend_id'), 'track_feedback', ['blend_id'], unique=False)
    op.create_index('ix_track_feedback_user_blend', 'track_feedback', ['user_id', 'blend_id'], unique=False)
    op.create_index(op.f('ix_track_feedback_user_id'), 'track_feedback', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_track_feedback_user_id'), table_name='track_feedback')
    op.drop_index('ix_track_feedback_user_blend', table_name='track_feedback')
    op.drop_index(op.f('ix_track_feedback_blend_id'), table_name='track_feedback')
    op.drop_table('track_feedback')
    op.drop_index(op.f('ix_blend_feedback_user_id'), table_name='blend_feedback')
    op.drop_index(op.f('ix_blend_feedback_blend_id'), table_name='blend_feedback')
    op.drop_table('blend_feedback')
    op.drop_index(op.f('ix_jobs_owner_id'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_blend_id'), table_name='jobs')
    op.drop_index('ix_job_blend_status', table_name='jobs')
    op.drop_table('jobs')
    op.drop_index(op.f('ix_playlist_sources_user_id'), table_name='playlist_sources')
    op.drop_table('playlist_sources')
    op.drop_index(op.f('ix_blends_participant_b_id'), table_name='blends')
    op.drop_index(op.f('ix_blends_participant_a_id'), table_name='blends')
    op.drop_table('blends')
