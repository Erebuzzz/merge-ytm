# Code Review Notes

This document is a collaborator-focused review of the current scaffold.

## Scope

The repository now contains an initial full-stack implementation for:

- frontend flow
- backend API
- blend generation logic
- YT Music integration wrapper
- local infrastructure scaffolding

It was reviewed in the workspace with a mix of static inspection and deployment-focused verification. The frontend production build completed successfully, and both Vercel deployments reached the `READY` state.

## Deployment Review

### What changed for Vercel

- `backend/index.py` was added so Vercel has a clear Python entrypoint that exposes the FastAPI `app`.
- The SQLAlchemy session setup now handles SQLite correctly by setting `check_same_thread=False` when `DATABASE_URL` points at SQLite.
- CORS middleware now treats `FRONTEND_URL="*"` as a deliberate wildcard case and disables credentials for that mode.
- The Next.js auth upload page no longer depends on `useSearchParams()` during prerender, which avoids the build-time failure on `/auth-upload`.

### Why these fixes matter

- Without the Python entrypoint, the backend project is not deployment-friendly on Vercel.
- Without the SQLite-specific engine option, the lightweight serverless database path is fragile.
- Without the wildcard CORS branch, a temporary bootstrap deployment cannot call the API safely.
- Without the auth upload page fix, the frontend production build fails during prerender.

### Current deployment state

- the frontend production deployment is building successfully on Vercel
- the backend production deployment is marked `READY` on Vercel
- the frontend was verified by fetching the live deployment output
- direct backend HTTP verification is still blocked by Vercel deployment protection, so the platform-side deployment state is the current confirmation point

## Backend Review

### What is solid

- The API surface matches the requested product spec.
- The blend engine is isolated in its own service and easy to test independently.
- Auth file handling is separated from the main blend flow and encrypted before persistence.
- The YT Music integration is wrapped behind a dedicated service, which keeps controller code small and makes future mocking easier.
- The service layer keeps routes relatively thin and readable.

### What to watch

- `Base.metadata.create_all()` is useful for scaffolding but should be replaced with migrations before real deployment.
- `ytmusicapi` is unofficial and brittle, so the retry layer is necessary but not sufficient. Real telemetry around failures should be added next.
- Access control is not implemented yet. Right now the API shape assumes a private deployment or a trusted environment.
- Playlist and liked songs fetches are stored as JSON snapshots, which is good for speed early on, but a richer normalized track table may be better later for analytics and repeated blends.

## Frontend Review

### What is solid

- The UI follows the requested simple flow: home, create blend, result, and auth upload.
- Zustand is used only for session-level UI state, which keeps the store small.
- The create page supports both lightweight users and advanced users in one flow.
- The result page exposes export controls without hiding the backend dependency on auth uploads.

### What to watch

- The frontend assumes the backend is reachable at `NEXT_PUBLIC_API_BASE_URL`; failures are surfaced as messages but there is no retry UI yet.
- There is no optimistic progress state for long-running async Celery jobs yet. The current UI uses the synchronous path for simplicity.
- There is no authentication or share-link protection on result pages yet.

## Blend Logic Review

### Current behavior

- Shared tracks are based on normalized exact-key overlap.
- Side recommendations are scored by overlap ratio, artist similarity, and diversity.
- Duplicate cleanup uses fuzzy title and artist matching.

### Tradeoffs

- This is a good first version for an MVP because it is understandable and debuggable.
- It may still pick alternate song versions if YouTube metadata is noisy.
- Artist-based affinity is intentionally simple and should be tuned against real usage data.

## Security Review

### Current protections

- auth headers are encrypted before storage
- raw headers are not logged in controller code
- export requires a stored auth payload
- liked songs import fails cleanly when auth is missing

### Missing pieces

- user/session ownership enforcement
- auth upload size limits and content validation hardening
- secret rotation strategy
- rate limiting
- audit logging for export actions

## Test Review

### Present coverage

- there is a backend unit test file for the blend engine

### Missing coverage

- FastAPI endpoint tests
- YT Music wrapper tests with mocks
- frontend interaction tests
- full integration tests around create -> fetch -> generate -> export

## Recommended Next Steps

1. Install runtime toolchains and run the project locally.
2. Add migrations and a seed script.
3. Add API tests around the critical endpoints.
4. Move long-running fetches and export into the async UI path.
5. Add authentication and ownership checks before any public deployment.
