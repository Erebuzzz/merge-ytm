# Code Review Notes

Collaborator-focused technical review of the current codebase. Updated after the Merge rebrand and refactor.

## What was built

This refactor delivered the full rebrand from "YTMusic Sync" to "Merge" plus a set of new backend capabilities:

- Auth middleware (`core/auth_middleware.py`) — session token validation on all protected routes
- Rate limiter middleware (`core/rate_limiter.py`) — per-user (60/min) and per-IP (100/min) via Redis
- Feedback system — `TrackFeedback` and `BlendFeedback` models, `FeedbackService`, and `/feedback/track` + `/feedback/blend` routes
- Async job tracking — `Job` model, Celery tasks write status/progress, `GET /job/{job_id}` polling endpoint
- Ownership checks — blend and playlist-source routes enforce participant membership
- Security hardening — auth file size validation (1 MB cap), CORS restricted to `FRONTEND_URL` in production
- Normalization improvements — NFKD unicode normalization, skip tracks missing `videoId` or `artist`
- Blend engine updates — Dice coefficient compatibility score, frequency weighting, feedback boosts
- Frontend feedback UI — inline track controls (👍 👎 ⏭), blend rating widget, Zustand feedback state
- Property-based test suite — 13 correctness properties covering normalization, blend engine, feedback, auth, rate limiting, and ownership

## Architecture

```
Frontend (Next.js + Zustand)
  └── FastAPI backend
        ├── RateLimiter middleware (Redis)
        ├── AuthMiddleware (neon_auth.session)
        └── Routes
              ├── BlendService
              │     ├── BlendEngine
              │     ├── NormalizationService
              │     ├── YTMusicService
              │     └── FeedbackService
              └── Celery (async jobs via Redis)
                    └── Job table (PostgreSQL)
```

## What is solid

**Backend:**
- Service layer is well-separated — routes are thin, logic lives in services
- Auth middleware is a FastAPI dependency (not middleware), which makes it easy to exclude specific routes
- Rate limiter fails open when Redis is unavailable — the API stays up
- Feedback service uses upsert semantics with toggle behavior for track actions
- Blend engine scoring formula matches the spec exactly
- Property-based tests cover all 13 correctness properties from the design doc
- YTMusicService has 3-retry exponential backoff on all `ytmusicapi` calls

**Frontend:**
- Feedback controls are hover-visible and non-blocking
- Job polling uses exponential backoff (1s → 2s → 4s → 8s → max 10s, 10-min timeout)
- Client-side URL validation mirrors backend Pydantic validation
- Zustand store is minimal — only shared cross-component state

## What to watch

**High priority:**

- `Base.metadata.create_all()` is still used on startup — replace with Alembic migrations before any production data is at risk
- The Celery worker is not deployed on Vercel — async job tracking only works if a separate worker process is running. The sync path (`POST /playlist/fetch?sync=true`) still works without it
- `ytmusicapi` is unofficial and can break on YouTube Music API changes — the retry layer helps but real telemetry around failure rates should be added

**Medium priority:**

- No end-to-end tests yet — the property tests cover logic but not the full HTTP request/response cycle
- Feedback boosts in the blend engine use hardcoded deltas (+10 like, -10 dislike, -5 skip) — these should be tunable via config
- The `GET /blends/mine` route still accepts a `user_id` query param alongside `current_user` — the param is now validated to match the authenticated user, but the route signature could be simplified to just use `current_user.id`
- Auth file encryption uses a key derived from `SECRET_KEY` via SHA-256 — rotating `SECRET_KEY` invalidates all stored encrypted auth files with no migration path

**Low priority:**

- The `New Discoveries` section uses `get_watch_playlist` (YouTube Music radio) — this is best-effort and may return empty results for some tracks
- Fuzzy matching thresholds (85 for same-artist, 90 for different-artist) are hardcoded — may need tuning against real user libraries
- The frontend blend feedback widget is always visible after page load — the spec says it should appear after first scroll, after export, or after viewing. The current implementation shows it immediately

## Security posture

**In place:**
- Session token validation on all protected routes
- Ownership checks on blend/playlist-source routes
- Auth file encryption (Fernet/AES-128-CBC)
- File size validation (1 MB cap)
- CORS restricted to `FRONTEND_URL` in production
- Rate limiting (60/user/min, 100/IP/min)

**Still missing:**
- Audit logging for export actions
- Secret rotation strategy for `SECRET_KEY` (requires re-encrypting all stored auth files)
- Content validation on auth file upload beyond JSON parsing and size check
- CSRF protection (currently relies on CORS + SameSite cookies)

## Test coverage

| Area | Coverage |
|---|---|
| Blend engine unit tests | ✅ `test_blend_engine.py` |
| Normalization idempotence (Property 1) | ✅ |
| Deduplication stability (Property 2) | ✅ |
| Compatibility score bounds (Property 3) | ✅ |
| Section size limits (Property 4) | ✅ |
| Intersection correctness (Property 5) | ✅ |
| Playlist link count enforcement (Property 6) | ✅ |
| Feedback toggle round-trip (Property 7) | ✅ |
| Job status progression (Property 8) | ✅ |
| Auth encryption round-trip (Property 9) | ✅ |
| Ownership isolation (Property 10) | ✅ |
| Rate limit enforcement (Property 11) | ✅ |
| Track feedback storage (Property 12) | ✅ |
| Blend feedback storage (Property 13) | ✅ |
| FastAPI endpoint tests | ❌ missing |
| YTMusicService mock tests | ❌ missing |
| Frontend interaction tests | ❌ missing |

## Recommended next steps

1. Add Alembic migrations — `create_all` is not safe for production schema changes
2. Deploy a Celery worker alongside the backend for async job processing
3. Add FastAPI endpoint tests using `httpx.AsyncClient` and a test database
4. Add telemetry around `ytmusicapi` failure rates and export accuracy
5. Tune feedback boost deltas and fuzzy matching thresholds against real usage data
6. Implement the blend feedback widget trigger logic (show after scroll/export/view)
