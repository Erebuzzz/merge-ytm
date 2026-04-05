from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk

from app.api.routes import router
from app.core.config import get_settings
from app.core.rate_limiter import RateLimiter
from app.db.session import engine
from app.models import Base

settings = get_settings()

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        send_default_pii=True,
        enable_logs=True,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        profile_session_sample_rate=1.0,
    )

app = FastAPI(title=settings.app_name, version=settings.app_version, debug=settings.debug)

# CORS: allow the configured frontend and localhost during development.
allowed_origins: list[str] = ["*"]
if settings.frontend_url and settings.frontend_url != "*":
    # Split by comma if the user wants to securely allow multiple environments
    allowed_origins = [url.strip() for url in settings.frontend_url.split(",")]
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True if settings.frontend_url != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimiter)


@app.on_event("startup")
def on_startup() -> None:
    """Run Alembic migrations on startup (production-safe).
    Falls back to create_all if Alembic is not configured (e.g. Vercel serverless).
    """
    try:
        from alembic.config import Config
        from alembic import command
        import os

        alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
        alembic_cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "alembic"))
        command.upgrade(alembic_cfg, "head")
    except Exception:
        # Fallback: create_all for environments without Alembic (Vercel, tests)
        try:
            public_tables = [t for t in Base.metadata.sorted_tables if t.schema is None]
            Base.metadata.create_all(bind=engine, tables=public_tables)
        except Exception:
            pass


# backend/vercel.json rewrites all requests to this app, so the API is served at the root path.
app.include_router(router)
