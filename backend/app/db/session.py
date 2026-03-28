from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Normalize the database URL for psycopg2 driver
db_url = settings.database_url

# Strip channel_binding param — psycopg2 does not support it
if "channel_binding" in db_url:
    import re
    db_url = re.sub(r"[&?]channel_binding=[^&]*", "", db_url)

if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)

# Add sslmode for cloud databases (Supabase, Neon, etc.)
connect_args: dict = {}
engine_options: dict = {"future": True, "pool_pre_ping": True}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif "localhost" not in db_url and "127.0.0.1" not in db_url:
    connect_args["sslmode"] = "require"

if connect_args:
    engine_options["connect_args"] = connect_args

engine = create_engine(db_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

