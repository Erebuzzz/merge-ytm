# Deployment Guide

This repository is deployed as two separate Vercel projects:

- `ytmusic-sync-frontend`
- `ytmusic-sync-backend`

The backend must point at the `backend` directory. If it points at the repository root, Vercel can finish the build quickly and still serve a platform `NOT_FOUND` page for every route.

## Project Settings

### Frontend

- Project name: `ytmusic-sync-frontend`
- Root Directory: `frontend`
- Framework Preset: `Next.js`

### Backend

- Project name: `ytmusic-sync-backend`
- Root Directory: `backend`
- Framework Preset: `Other`
- Request routing: `backend/vercel.json` rewrites `/(.*)` to `app/main.py`

## Environment Variables

### Frontend

Add these variables to Preview and Production:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.vercel.app
NEON_AUTH_BASE_URL=https://your-neon-auth-base-url
NEON_AUTH_COOKIE_SECRET=replace-with-a-long-random-secret
```

The frontend expects the backend root domain. If you accidentally include `/api`, the app strips that suffix before sending requests.
The Neon Auth cookie secret is separate from the backend `SECRET_KEY`.

You also need to trust the frontend origins in Neon Auth:

- `http://localhost:3000` for local development
- your production frontend domain
- each active preview deployment domain if you manage Neon Auth manually

If you connected Neon Auth through the Neon and Vercel integration with auth enabled, Neon can inject `NEON_AUTH_BASE_URL` and add trusted production and preview domains automatically. Manual setups still need these origins added explicitly.

### Backend

Add these required variables to Preview and Production:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/ytmusic_sync
REDIS_URL=redis://default:PASSWORD@HOST:6379/0
SECRET_KEY=replace-with-a-long-random-secret
FRONTEND_URL=https://your-frontend-domain.vercel.app
DEBUG=false
```

`FRONTEND_URL` may be a single origin or a comma-separated list of origins. This is useful when you need both production and preview frontend domains to pass backend CORS checks.

Optional tuning variables:

```text
MAX_PLAYLIST_LINKS=5
LIKED_SONGS_LIMIT=5000
TOTAL_TRACKS_LIMIT=50
MAX_TRACKS_PER_SECTION=20
YTMUSIC_RETRY_ATTEMPTS=3
```

## Recommended Deploy Order

1. Update backend project settings and env variables.
2. Deploy the backend.
3. Update frontend env variables.
4. Deploy the frontend.

## Smoke Checks

After backend deploy:

```text
GET https://your-backend-domain.vercel.app/
GET https://your-backend-domain.vercel.app/health
```

Expected behavior:

- `/` returns `{"status":"ok","message":"Backend is running"}`
- `/health` returns `{"status":"ok"}`

After frontend deploy:

- load the homepage
- confirm the browser console no longer shows `/favicon.ico` as a 404
- confirm create blend requests reach the backend successfully

## Common Failure Modes

### Backend alias shows `NOT_FOUND`

Usually caused by one of these:

- backend project root is set to `.`
- backend project env variables are missing
- the wrong Vercel project was redeployed

### Frontend can load but API calls fail

Usually caused by one of these:

- `NEXT_PUBLIC_API_BASE_URL` points at the wrong backend deployment
- `NEON_AUTH_BASE_URL` or `NEON_AUTH_COOKIE_SECRET` is missing
- `FRONTEND_URL` on the backend does not match the frontend domain
- database or redis credentials are invalid

### Auth endpoints return `403` with `Invalid origin`

Usually caused by one of these:

- the current frontend URL is missing from Neon Auth trusted origins
- `NEON_AUTH_BASE_URL` points at a different Neon Auth environment than the one you configured
- you are testing from a Vercel preview URL that was never added to trusted origins

Recommended checks:

1. Open the deployed frontend URL you are actually using.
2. Add that exact origin to Neon Auth trusted origins.
3. Keep `http://localhost:3000` trusted for local development.
4. If you rely on preview deployments, trust each preview origin or switch to the Neon and Vercel auth integration so previews are wired automatically.

### Browser logs `/favicon.ico` 404

The frontend now includes a dedicated `/favicon.ico` route. If you still see the 404 after these changes, the frontend deployment is still serving an older build.
