> **SUPERSEDED** — This task list was written for the initial rebrand. Auth upload tasks and related frontend components have been removed from the product. See `README.md` and `CHECKLIST.md` for the current state.

# Implementation Plan: Merge Rebrand & Refactor

## Overview

Incremental implementation of the full rebrand from "YTMusic Sync" to "Merge", plus new backend capabilities: feedback system, async job tracking, rate limiting, auth middleware, and security hardening. Each task builds on the previous and ends with all components wired together.

## Tasks

- [x] 1. Rebrand — string replacements and package metadata
  - Update `<Metadata>` title in `frontend/src/app/layout.tsx` to "Merge"
  - Update sidebar brand name and tagline in `layout.tsx`
  - Update GitHub star link to new repo slug
  - Update `app_name` in `backend/app/core/config.py` to "Merge"
  - Update `pyproject.toml` package name from `ytmusic-sync-backend` to `merge-backend`
  - Replace all remaining "YTMusic Sync" strings in `tasks.py`, `results-panel.tsx`, and documentation files
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Landing page refactor
  - Rewrite `frontend/src/app/page.tsx` hero section with new headline, secondary message, and CTAs
  - Add three feature-highlight cards: "Paste links", "Generate blend", "Export to YouTube Music"
  - Remove `brand-spotify` color references; use `brand-ytmusic` and neutral palette
  - Add community message block
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. New database models — Job, TrackFeedback, BlendFeedback
  - [x] 3.1 Add `Job`, `TrackFeedback`, and `BlendFeedback` SQLAlchemy models to `backend/app/models.py`
    - Include all fields, FK relationships, and unique constraints as specified in the design
    - _Requirements: 10.2, 11.4, 11.5_
  - [x] 3.2 Write property test for Job status progression (Property 8)
    - **Property 8: Job status progression**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

- [x] 4. Auth middleware
  - [x] 4.1 Create `backend/app/core/auth_middleware.py` with `get_current_user` FastAPI dependency
    - Reads `Authorization: Bearer` header or `session` cookie
    - Validates token against `neon_auth.session`; checks `expiresAt`
    - Returns `401` for missing, expired, or invalid tokens
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 12.1_
  - [x] 4.2 Apply `get_current_user` dependency to all existing routes in `backend/app/api/routes.py`
    - _Requirements: 3.4, 12.1_

- [x] 5. Rate limiter middleware
  - [x] 5.1 Create `backend/app/core/rate_limiter.py` as a FastAPI `BaseHTTPMiddleware`
    - Per-user limit: 60 req/min using Redis `INCR` + `EXPIRE` on `rate:user:{user_id}`
    - Per-IP limit: 100 req/min on `rate:ip:{ip}`
    - Returns `429` with `Retry-After: 60` header when exceeded
    - Fail open if Redis is unavailable
    - _Requirements: 12.6, 12.7_
  - [x] 5.2 Register `RateLimiter` middleware in `backend/app/main.py`
    - _Requirements: 12.6, 12.7_
  - [x] 5.3 Write property test for rate limit enforcement (Property 11)
    - **Property 11: Rate limit enforcement**
    - **Validates: Requirements 12.6**

- [x] 6. Normalization service — property tests
  - [x] 6.1 Verify `build_normalized_key` in `backend/app/services/normalization.py` satisfies the design spec (NFKD, lowercase, bracket removal, featuring credits, whitespace trim)
    - Update implementation if any step is missing
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_
  - [x] 6.2 Write property test for normalization idempotence (Property 1)
    - **Property 1: Normalization idempotence**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  - [x] 6.3 Write property test for deduplication stability (Property 2)
    - **Property 2: Deduplication stability**
    - **Validates: Requirements 7.6, 7.7**

- [x] 7. Blend engine — scoring, section limits, and property tests
  - [x] 7.1 Verify `generate_blend` in `backend/app/services/blend_engine.py` implements the scoring formula, compatibility score formula, 50-track total cap, and 20-track per-section cap
    - Add `feedback_boosts` parameter support
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  - [x] 7.2 Write property test for compatibility score bounds (Property 3)
    - **Property 3: Compatibility score bounds**
    - **Validates: Requirements 8.5**
  - [x] 7.3 Write property test for blend section size limits (Property 4)
    - **Property 4: Blend section size limits**
    - **Validates: Requirements 8.6, 8.7**
  - [x] 7.4 Write property test for intersection correctness (Property 5)
    - **Property 5: Intersection correctness**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 8. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 9. Playlist link validation
  - [x] 9.1 Add YouTube Music URL validation to the `PlaylistSource` Pydantic schema in `backend/app/schemas/api.py`
    - Reject inputs with more than 5 links per participant
    - Return descriptive error messages for invalid URLs
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 9.2 Add client-side YouTube Music URL pattern check in `frontend/src/components/blend/blend-form.tsx`
    - Display per-link error messages before submission
    - _Requirements: 4.2, 4.4_
  - [x] 9.3 Write property test for playlist link count enforcement (Property 6)
    - **Property 6: Playlist link count enforcement**
    - **Validates: Requirements 4.1, 4.3**

- [x] 10. Auth upload — security hardening
  - [x] 10.1 Add auth upload warning banner to `frontend/src/components/auth/auth-upload-panel.tsx`
    - Display warning before accepting file
    - _Requirements: 5.1_
  - [x] 10.2 Verify `encrypt_auth` / `decrypt_auth` in `backend/app/core/security.py` encrypts before storage and never persists plaintext
    - Add file size validation; reject files exceeding configured max
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 12.2_
  - [x] 10.3 Write property test for auth encryption round-trip (Property 9)
    - **Property 9: Auth encryption round-trip**
    - **Validates: Requirements 5.2, 5.3, 12.2**

- [x] 11. Async job tracking
  - [x] 11.1 Update Celery tasks in `backend/app/tasks.py` to create a `Job` record on task start and write status/progress updates throughout fetch, generate, and export flows
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 11.2 Add `GET /job/{job_id}` route to `backend/app/api/routes.py` returning `status`, `progress`, and `error_message`
    - Enforce ownership check (only job owner can poll)
    - _Requirements: 10.6, 12.5_
  - [x] 11.3 Add job polling logic to the frontend blend creation flow with exponential backoff (1s → 2s → 4s → 8s → max 10s, timeout after 10 min)
    - _Requirements: 10.1, 10.6_

- [x] 12. Feedback service and API
  - [x] 12.1 Create `backend/app/services/feedback_service.py` with `record_track_feedback`, `record_blend_feedback`, `compute_track_stats`, and `compute_blend_stats`
    - Upsert semantics for duplicate submissions; toggle logic for same-action re-submission
    - Async stats computation after write
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.12, 11.13_
  - [x] 12.2 Add `POST /feedback/track` and `POST /feedback/blend` routes to `backend/app/api/routes.py`
    - Wire to `FeedbackService`; apply `get_current_user` dependency
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 12.3 Add `submit_feedback` and `submit_blend_feedback` methods to `backend/app/services/blend_service.py`
    - Pass user's feedback history boosts into `BlendEngine.generate_blend`
    - _Requirements: 8.9, 11.1, 11.2_
  - [x] 12.4 Write property test for feedback toggle round-trip (Property 7)
    - **Property 7: Feedback toggle round-trip**
    - **Validates: Requirements 11.8**
  - [x] 12.5 Write property test for track feedback storage round-trip (Property 12)
    - **Property 12: Track feedback storage round-trip**
    - **Validates: Requirements 11.1, 11.4**
  - [x] 12.6 Write property test for blend feedback storage round-trip (Property 13)
    - **Property 13: Blend feedback storage round-trip**
    - **Validates: Requirements 11.2, 11.3, 11.5**

- [x] 13. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 14. Results panel — feedback UI
  - [x] 14.1 Add inline track feedback controls (👍 👎 ⏭) to `frontend/src/components/blend/results-panel.tsx`
    - Visible on hover/tap; instant visual feedback with animation on selection; toggle behavior
    - Display hint "Give a quick 👍 or 👎 to help improve recommendations" when no feedback submitted
    - _Requirements: 11.6, 11.7, 11.8, 11.10, 11.11_
  - [x] 14.2 Add blend-level feedback widget (1–5 stars + quick option) below the track list in `results-panel.tsx`
    - Render after first full scroll, after export, or after viewing — whichever occurs first
    - Make dismissible without blocking workflow
    - _Requirements: 11.2, 11.3, 11.9, 11.10_
  - [x] 14.3 Add feedback state (track actions, blend rating, quick option) to `frontend/src/store/blend-store.ts`
    - Wire feedback API calls to the new `/feedback/track` and `/feedback/blend` endpoints
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 15. Ownership and CORS security
  - [x] 15.1 Add ownership checks to all blend and playlist-source routes in `backend/app/api/routes.py`
    - Return `403` or `404` when the authenticated user is not a participant
    - _Requirements: 12.5_
  - [x] 15.2 Restrict CORS in `backend/app/main.py` to `FRONTEND_URL` in production
    - _Requirements: 12.3_
  - [x] 15.3 Write integration test for ownership isolation (Property 10)
    - **Property 10: Ownership isolation**
    - **Validates: Requirements 12.5**

- [x] 16. YTMusicService — retry, validation, and telemetry
  - Update `backend/app/services/ytmusic_client.py` to enforce 3-retry exponential backoff on all `ytmusicapi` calls
  - Skip tracks missing `videoId`, `title`, or `artist`; include skip count in fetch summary
  - Log fetch success rate and missing metadata ratio
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 17. Deployment config and documentation updates
  - Update `backend/vercel.json`, `docker-compose.yml`, `DEPLOYMENT.md`, and `README.md` to reference "Merge"
  - Ensure required env vars (`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `NEXT_PUBLIC_API_BASE_URL`, `FRONTEND_URL`) are documented in `.env.example` files
  - _Requirements: 1.3, 1.7, 15.1, 15.5_

- [x] 18. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use Hypothesis (Python); run with `pytest backend/tests/`
- Checkpoints ensure incremental validation before moving to the next phase
