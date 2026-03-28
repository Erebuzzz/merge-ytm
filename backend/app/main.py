from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.db.session import engine
from app.models import Base

settings = get_settings()

app = FastAPI(title=settings.app_name, version=settings.app_version, debug=settings.debug)

# CORS — allow the Vercel frontend and localhost during development
allowed_origins: list[str] = ["*"]
if settings.frontend_url and settings.frontend_url != "*":
    allowed_origins = [
        settings.frontend_url,
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True if settings.frontend_url != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """Create tables on startup. Safe on serverless — runs once per cold start."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        # Allow the app to start even if DB is temporarily unreachable
        pass


# Mount routes WITHOUT /api prefix — frontend calls /blend/create directly
app.include_router(router)

