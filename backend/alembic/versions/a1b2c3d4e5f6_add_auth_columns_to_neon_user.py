"""Add auth columns to neon_auth.user

Revision ID: a1b2c3d4e5f6
Revises: c0a39bc39e71
Create Date: 2026-04-16 12:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c0a39bc39e71"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("encrypted_auth", sa.Text(), nullable=True),
        schema="neon_auth",
    )
    op.add_column(
        "user",
        sa.Column("auth_uploaded_at", sa.DateTime(timezone=True), nullable=True),
        schema="neon_auth",
    )
    op.add_column(
        "user",
        sa.Column("auth_method", sa.String(20), nullable=True),
        schema="neon_auth",
    )


def downgrade() -> None:
    op.drop_column("user", "auth_method", schema="neon_auth")
    op.drop_column("user", "auth_uploaded_at", schema="neon_auth")
    op.drop_column("user", "encrypted_auth", schema="neon_auth")
