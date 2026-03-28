from __future__ import annotations

import re
import ssl

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()
db_url = settings.database_url

# ---------------------------------------------------------------------------
# Driver normalisation
# ---------------------------------------------------------------------------
# Vercel's serverless environment ships no C extensions, so psycopg2 and
# psycopg3 (binary) are unavailable.  pg8000 is pure Python and is listed in
# requirements.txt, so we force every postgres* URL variant to use it.
#
# Handles all of:
#   postgresql://...
#   postgres://...
#   postgresql+psycopg://...      (psycopg3 – config.py default)
#   postgresql+psycopg2://...
#   postgresql+pg8000://...       (already correct – idempotent)
db_url = re.sub(r"^postgres(?:ql)?(?:\+\w+)?://", "postgresql+pg8000://", db_url)

# ---------------------------------------------------------------------------
# Strip query-string parameters that pg8000 does not understand
# ---------------------------------------------------------------------------
# SQLAlchemy forwards unknown query params directly to the DBAPI connect()
# call; pg8000 raises an error for any it doesn't recognise.
_UNSUPPORTED_PARAMS = ("sslmode", "channel_binding")


def _strip_unsupported(url: str) -> str:
    for param in _UNSUPPORTED_PARAMS:
        # Replace `?param=val&rest` → `?rest`
        url = re.sub(rf"\?{param}=[^&]*&", "?", url)
        # Replace `?param=val`      → `` (no remaining params)
        url = re.sub(rf"\?{param}=[^&]*$", "", url)
        # Replace `&param=val`      → ``
        url = re.sub(rf"&{param}=[^&]*", "", url)
    return url


db_url = _strip_unsupported(db_url)

# ---------------------------------------------------------------------------
# Engine / connect-args
# ---------------------------------------------------------------------------
connect_args: dict = {}
engine_options: dict = {"future": True, "pool_pre_ping": True}

if db_url.startswith("sqlite"):
    # SQLite needs this flag when used outside the creating thread
    connect_args["check_same_thread"] = False
elif "localhost" not in db_url and "127.0.0.1" not in db_url:
    # pg8000 requires an ssl.SSLContext object rather than the sslmode string
    connect_args["ssl_context"] = ssl.create_default_context()

if connect_args:
    engine_options["connect_args"] = connect_args

engine = create_engine(db_url, **engine_options)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
