from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.db.session import get_db
from app.models import Session as AuthSession, User


def get_current_user(
    authorization: str | None = Header(default=None),
    session: str | None = Cookie(default=None),
    db: DBSession = Depends(get_db),
) -> User:
    token: str | None = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
    elif session:
        token = session

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    auth_session = db.query(AuthSession).filter(AuthSession.token == token).first()

    if auth_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    now = datetime.now(timezone.utc)
    expires = auth_session.expiresAt
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if now > expires:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    user = db.query(User).filter(User.id == auth_session.userId).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    return user
