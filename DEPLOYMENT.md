# Deployment Guide

## Infrastructure

| Service | Platform | Free tier |
|---|---|---|
| Frontend | Vercel | Free forever |
| Backend API | Render | Free (spins down after 15 min idle) |
| Celery worker | Fly.io | Free (3 VMs forever) |
| Redis | Upstash | Free (10k req/day) |
| PostgreSQL | Neon | Free (already set up for auth) |

---

## Step 1 — Upstash Redis

1. Go to [upstash.com](https://upstash.com) → sign up with GitHub
2. **Create Database** → Redis → free tier → pick closest region
3. Copy the **Redis URL** from the dashboard (use the TLS `rediss://` version)

---

## Step 2 — Render Backend

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect GitHub → select your repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -e ".[dev]"`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free
4. Add environment variables:

```
DATABASE_URL=<your Neon URL — no sslmode params, app handles SSL>
REDIS_URL=<your Upstash Redis URL>
SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(32))">
FRONTEND_URL=https://your-app.vercel.app
DEBUG=false
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
YOUTUBE_OAUTH_REDIRECT_URI=https://your-app.onrender.com/auth/youtube/callback
FEEDBACK_LIKE_BOOST=10.0
FEEDBACK_DISLIKE_PENALTY=10.0
FEEDBACK_SKIP_PENALTY=5.0
```

5. Deploy → copy your Render URL (e.g. `merge-backend.onrender.com`)

### Keep Render awake (free)

Render free services spin down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. To prevent this:

1. Go to [uptimerobot.com](https://uptimerobot.com) → sign up free
2. **Add New Monitor** → HTTP(s)
3. URL: `https://your-app.onrender.com/health`
4. Monitoring interval: **5 minutes**
5. Save

UptimeRobot pings `/health` every 5 minutes, keeping Render awake 24/7 at no cost.

---

## Step 3 — Fly.io Celery Worker

The Celery worker only needs 3 env vars — it shares the same DB and Redis as the backend.

### Install flyctl

```powershell
# Windows PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

Close and reopen terminal, then:

```bash
fly auth login
```

### Deploy

```bash
cd backend
fly launch --name merge-celery-worker --no-deploy
# When prompted: No to Postgres, No to Redis
```

Set secrets:

```bash
fly secrets set \
  DATABASE_URL="<your Neon URL>" \
  REDIS_URL="<your Upstash Redis URL>" \
  SECRET_KEY="<same value as Render>"
```

Deploy as a worker process:

```bash
fly deploy --command "celery -A app.tasks worker --loglevel=info --concurrency=2"
```

Verify:

```bash
fly logs
# Should show: celery@xxxx ready. Concurrency: 2
```

---

## Step 4 — Google Cloud Console

Add your Render URL to authorized redirect URIs:

1. Go to [console.cloud.google.com/apis/credentials?project=merge-ytmusic](https://console.cloud.google.com/apis/credentials?project=merge-ytmusic)
2. Click your OAuth 2.0 Client ID
3. **Authorized redirect URIs** → **+ Add URI**
4. Add: `https://your-app.onrender.com/auth/youtube/callback`
5. Save

---

## Step 5 — Vercel Frontend

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import repo
2. **Root Directory**: `frontend`, **Framework**: Next.js
3. Add environment variables:

```
NEXT_PUBLIC_API_BASE_URL=https://your-app.onrender.com
NEON_AUTH_BASE_URL=https://your-neon-auth-base-url
NEON_AUTH_COOKIE_SECRET=<python -c "import secrets; print(secrets.token_hex(32))">
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<from Google Cloud Console>
```

4. Deploy → copy production URL (e.g. `https://merge.vercel.app`)

---

## Step 6 — Wire everything together

1. **Neon Auth** → add `https://merge.vercel.app` to trusted origins
2. **Render** → update `FRONTEND_URL=https://merge.vercel.app` → redeploy
3. **Fly** → no changes needed (worker doesn't use FRONTEND_URL)

---

## Environment variable reference

| Variable | Render | Fly worker | Vercel |
|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | — |
| `REDIS_URL` | ✅ | ✅ | — |
| `SECRET_KEY` | ✅ | ✅ | — |
| `FRONTEND_URL` | ✅ | — | — |
| `DEBUG` | ✅ | — | — |
| `GOOGLE_CLIENT_ID` | ✅ | — | — |
| `GOOGLE_CLIENT_SECRET` | ✅ | — | — |
| `YOUTUBE_OAUTH_REDIRECT_URI` | ✅ | — | — |
| `FEEDBACK_*` | ✅ | — | — |
| `NEXT_PUBLIC_API_BASE_URL` | — | — | ✅ |
| `NEON_AUTH_BASE_URL` | — | — | ✅ |
| `NEON_AUTH_COOKIE_SECRET` | — | — | ✅ |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | — | — | ✅ |

---

## Smoke checks after deploy

```bash
# Backend
curl https://your-app.onrender.com/health
# → {"status":"ok"}

# Celery worker
fly logs --app merge-celery-worker
# → celery@xxxx ready. Concurrency: 2
```

Browser checks:
1. Homepage loads
2. Sign up → dashboard loads
3. "Connect YouTube Music" → OAuth flow → toast appears
4. Create blend → results page loads
5. Export to YouTube Music
6. Sign out → protected routes return 401

---

## Common failure modes

### Render returns 502 or times out on first request
Free tier is sleeping. Wait 30 seconds and retry. Set up UptimeRobot (Step 2) to prevent this.

### OAuth callback fails
- Check `YOUTUBE_OAUTH_REDIRECT_URI` on Render matches exactly what's in Google Cloud Console
- Check the URI is added to authorized redirect URIs in Google Cloud Console

### Celery jobs not processing
- Check `fly logs` — worker may have crashed
- Verify `REDIS_URL` is identical on both Render and Fly
- Check Upstash dashboard for connection count

### Auth returns `403 Invalid origin`
- Add your Vercel production URL to Neon Auth trusted origins
- Make sure `NEON_AUTH_BASE_URL` is correct in Vercel env vars
