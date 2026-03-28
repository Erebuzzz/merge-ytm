from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

def generate_uuid() -> str:
    return str(uuid4())

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

class User(Base):
    __tablename__ = "user"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String, unique=True)
    emailVerified: Mapped[bool] = mapped_column(Boolean)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)

    encrypted_auth: Mapped[str | None] = mapped_column(Text, nullable=True)
    auth_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    playlist_sources: Mapped[list["PlaylistSource"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "session"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    token: Mapped[str] = mapped_column(String, unique=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)
    ipAddress: Mapped[str | None] = mapped_column(String, nullable=True)
    userAgent: Mapped[str | None] = mapped_column(String, nullable=True)
    userId: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))

class Account(Base):
    __tablename__ = "account"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    accountId: Mapped[str] = mapped_column(String)
    providerId: Mapped[str] = mapped_column(String)
    userId: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))
    accessToken: Mapped[str | None] = mapped_column(Text, nullable=True)
    refreshToken: Mapped[str | None] = mapped_column(Text, nullable=True)
    idToken: Mapped[str | None] = mapped_column(Text, nullable=True)
    accessTokenExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    refreshTokenExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    password: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)

class Verification(Base):
    __tablename__ = "verification"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    identifier: Mapped[str] = mapped_column(String)
    value: Mapped[str] = mapped_column(String)
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    createdAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updatedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class PlaylistSource(TimestampMixin, Base):
    __tablename__ = "playlist_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), index=True)
    source_type: Mapped[str] = mapped_column(String(20))
    source_value: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    track_count: Mapped[int] = mapped_column(Integer, default=0)
    tracks: Mapped[list[dict]] = mapped_column(JSON, default=list)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="playlist_sources")

class Blend(TimestampMixin, Base):
    __tablename__ = "blends"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    participant_a_id: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), index=True)
    participant_b_id: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="pending")
    compatibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    tracks_common: Mapped[list[dict]] = mapped_column(JSON, default=list)
    tracks_a: Mapped[list[dict]] = mapped_column(JSON, default=list)
    tracks_b: Mapped[list[dict]] = mapped_column(JSON, default=list)
    tracks_recommended: Mapped[list[dict]] = mapped_column(JSON, default=list)
    diagnostics: Mapped[dict] = mapped_column(JSON, default=dict)
    youtube_playlist_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    participant_a: Mapped["User"] = relationship(foreign_keys=[participant_a_id])
    participant_b: Mapped["User"] = relationship(foreign_keys=[participant_b_id])
