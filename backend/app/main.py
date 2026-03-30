from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.db.session import engine
from app.models import Base

settings = get_settings()

app = FastAPI(title=settings.app_name, version=settings.app_version, debug=settings.debug)

def _parse_frontend_origins(value: str | None) -> list[str]:
    if not value:
        return ["*"]
    origins = [origin.strip().rstrip("/") for origin in value.split(",")]
    parsed = [origin for origin in origins if origin]
    return parsed or ["*"]


# CORS: allow the configured frontend origin(s) and localhost during development.
frontend_origins = _parse_frontend_origins(settings.frontend_url)
allow_any_origin = "*" in frontend_origins

allowed_origins: list[str] = ["*"] if allow_any_origin else frontend_origins
if not allow_any_origin and "http://localhost:3000" not in allowed_origins:
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=not allow_any_origin,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """Create only public schema tables on startup."""
    try:
        public_tables = [
            t for t in Base.metadata.sorted_tables
            if t.schema is None
        ]
        Base.metadata.create_all(bind=engine, tables=public_tables)
    except Exception:
        pass


# backend/vercel.json rewrites all requests to this app, so the API is served at the root path.
app.include_router(router)
