# Deployment Guide

Merge deploys as two separate Vercel projects:

- `merge-frontend` — Next.js app, root directory `frontend`
- `merge-backend` — FastAPI app, root directory `backend`

The backend **must** point at the `backend` directory. If it points at the repo root, Vercel serves a `NOT_FOUND` page for every route.

## Project settings

### Frontend

| Setting | Value |
|---|---|
| Project name | `merge-frontend` |
| Root Directory | `frontend` |
| Framework Preset | `Next.js` |

### Backend

| Setting | Value |
|---|---|
| Project name | `merge-backend` |
| Root Directory | `backend` |
| Framework Preset | `Other` |
| Request routing | `backend/vercel.json` rewrites `/(.*) → app/main.py` |

## Environment variables

### Frontend

```text
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.vercel.app
NEON_AUTH_BASE_URL=https://your-neon-auth-base-url
NEON_AUTH_COOKIE_SECRET=replace-with-a-long-random-secret
```

- The frontend expects the backend **root domain** — do not include `/api`. The app strips a trailing `/api` automatically if you paste it by mistake.
- `NEON_AUTH_COOKIE_SECRET` is independent of the backend `SECRET_KEY`.

**Neon Auth trusted origins** — add all of these:

- `http://localhost:3000` (local development)
- your production frontend domain
- each active Vercel preview URL (or use the Neon + Vercel integration to handle previews automatically)

### Backend

Required:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/merge
REDIS_URL=redis://default:PASSWORD@HOST:6379/0
SECRET_KEY=replace-with-a-long-random-secret
FRONTEND_URL=https://your-frontend-domain.vercel.app
DEBUG=false
```

Optional tuning:

```text
MAX_PLAYLIST_LINKS=5
LIKED_SONGS_LIMIT=5000
TOTAL_TRACKS_LIMIT=50
MAX_TRACKS_PER_SECTION=20
YTMUSIC_RETRY_ATTEMPTS=3
```

## Recommended deploy order

1. Set backend project root to `backend` and configure env variables.
2. Deploy the backend.
3. Set frontend env variables (use the deployed backend URL for `NEXT_PUBLIC_API_BASE_URL`).
4. Deploy the frontend.
5. Add the deployed frontend URL to Neon Auth trusted origins.

## Smoke checks

After backend deploy:

```
GET https://your-backend-domain.vercel.app/
→ {"status":"ok","message":"Backend is running"}

GET https://your-backend-domain.vercel.app/health
→ {"status":"ok"}
```

After frontend deploy:

- Homepage loads without errors
- No `/favicon.ico` 404 in the browser console
- Creating a blend reaches the backend successfully

## Common failure modes

### Backend shows `NOT_FOUND`

- Backend project root is set to `.` instead of `backend`
- Backend env variables are missing
- Wrong Vercel project was redeployed

### API calls fail from the frontend

- `NEXT_PUBLIC_API_BASE_URL` points at the wrong backend URL
- `NEON_AUTH_BASE_URL` or `NEON_AUTH_COOKIE_SECRET` is missing
- `FRONTEND_URL` on the backend does not match the deployed frontend domain
- Database or Redis credentials are invalid

### Auth returns `403 Invalid origin`

- The current frontend URL is not in Neon Auth trusted origins
- `NEON_AUTH_BASE_URL` points at a different Neon Auth environment
- You are testing from a preview URL that was never added to trusted origins

Fix: open the exact URL you are using, add it to Neon Auth trusted origins, and retry.

### `/favicon.ico` 404 in console

The frontend serves `/favicon.ico` explicitly. If you still see the 404, the deployment is serving a stale build — trigger a redeploy.

## Infrastructure notes

### Database

Merge uses PostgreSQL. Recommended providers: Neon, Supabase, Railway.

Tables are created automatically on startup via `Base.metadata.create_all()`. For production, replace this with Alembic migrations.

### Redis

Required for Celery job queuing and rate limiting. Recommended providers: Upstash, Railway, Render.

If `REDIS_URL` is not set, Celery tasks are disabled and the app falls back to synchronous processing. Rate limiting fails open (requests are allowed through) when Redis is unavailable.

### Celery worker

The Vercel backend does not run a persistent Celery worker. For async job processing in production, deploy a separate worker process on Railway, Render, or Fly.io pointing at the same `DATABASE_URL` and `REDIS_URL`.

```bash
cd backend
celery -A app.tasks worker --loglevel=info
```
