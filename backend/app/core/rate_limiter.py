from __future__ import annotations

import logging
from typing import Callable

import redis
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

USER_LIMIT = 60
IP_LIMIT = 100
WINDOW_SECONDS = 60


class RateLimiter(BaseHTTPMiddleware):
    def __init__(self, app, redis_client: redis.Redis | None = None) -> None:
        super().__init__(app)
        self._redis: redis.Redis | None = redis_client
        if self._redis is None and settings.redis_url:
            try:
                self._redis = redis.from_url(settings.redis_url, decode_responses=True)
            except Exception as exc:
                logger.warning("RateLimiter: could not connect to Redis: %s", exc)

    def _incr_with_expire(self, key: str) -> int | None:
        """Increment counter; set TTL on first write. Returns new count or None on error."""
        if self._redis is None:
            return None
        try:
            pipe = self._redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, WINDOW_SECONDS, nx=True)
            results = pipe.execute()
            return int(results[0])
        except Exception as exc:
            logger.warning("RateLimiter: Redis error: %s", exc)
            return None

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # --- Per-IP check ---
        client_ip = request.client.host if request.client else "unknown"
        ip_count = self._incr_with_expire(f"rate:ip:{client_ip}")
        if ip_count is not None and ip_count > IP_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

        # --- Per-user check (best-effort token extraction) ---
        token: str | None = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()
        elif "session" in request.cookies:
            token = request.cookies["session"]

        if token:
            user_count = self._incr_with_expire(f"rate:user:{token[:64]}")
            if user_count is not None and user_count > USER_LIMIT:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                    headers={"Retry-After": str(WINDOW_SECONDS)},
                )

        return await call_next(request)
