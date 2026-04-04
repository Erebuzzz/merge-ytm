# Deployment Guide

## Infrastructure

| Service | Platform | Free tier |
|---|---|---|
| Frontend | Vercel | Free forever |
| Backend API | Render | Free (spins down after 15 min idle) |
| Celery worker | Render | Free (background worker) |
| Redis | Upstash | Free (10k req/day) |
| PostgreSQL | Neon | Free (already set up for auth) |

---

## Step 1 — Upstash Redis

1. Go to [upstash.com](https://upstash.com) → sign up with GitHub
2. **Create Database** → Redis → free tier → pick closest region
3. Copy the **Redis URL** from the dashboard (use the TLS `rediss://` version)

---

## Step 2 — Vercel Frontend

Since the backend needs the frontend URL for CORS and OAuth, it's easiest to set up an empty Vercel project first to get your URL.

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import repo
2. **Root Directory**: `frontend`, **Framework**: Next.js
3. We don't have the backend URL yet, but create the project anyway.
4. Copy your production URL (e.g. `https://merge.vercel.app`)

---

## Step 3 — Render Backend & Worker (Manual No-Card Free Tier)

To bypass Render's mandatory credit card capture for Blueprints, we will deploy this manually with a single unified free instance. Because our architecture securely embeds the Celery background worker inside a single Web Service via `start.sh`, this is entirely free!

1. Go to [render.com](https://render.com)
2. Click **New** → **Web Service** *(Do not click Blueprint!)*
3. Use the "Build and deploy from a Git repository" option and connect/paste your GitHub repository.
4. Fill in the required parameters securely:
   - **Name**: `merge-backend`
   - **Language**: `Python`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -e '.[dev]'`
   - **Start Command**: `bash start.sh`
   - **Instance Type**: Select **Free**
5. Expand **Advanced** and add the following Environment Variables precisely:

```
DATABASE_URL=<your Neon URL — no sslmode params, app handles SSL>
REDIS_URL=<your Upstash Redis URL>
SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(32))">
FRONTEND_URL=<your Vercel URL from Step 2>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
YOUTUBE_OAUTH_REDIRECT_URI=https://<your-render-url>/auth/youtube/callback
```
*(Wait until the web service finishes deploying to get its final URL for `YOUTUBE_OAUTH_REDIRECT_URI`, then update your environment logic in the render dashboard and redeploy.)*

### Keep Render awake (free)

Render free services spin down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. To prevent this:

1. Go to [uptimerobot.com](https://uptimerobot.com) → sign up free
2. **Add New Monitor** → HTTP(s)
3. URL: `https://merge-backend.onrender.com/health` (Replace with actual URL)
4. Monitoring interval: **5 minutes**
5. Save

---

## Step 4 — Google Cloud Console

Add your Render URL to authorized redirect URIs:

1. Go to [console.cloud.google.com/apis/credentials?project=merge-ytmusic](https://console.cloud.google.com/apis/credentials?project=merge-ytmusic)
2. Click your OAuth 2.0 Client ID
3. **Authorized redirect URIs** → **+ Add URI**
4. Add: `https://merge-backend.onrender.com/auth/youtube/callback`
5. Save

---

## Step 5 — Finalize Vercel Frontend

Now that you have your backend, return to Vercel to update your frontend environment variables.

1. In the Vercel Dashboard, go to your project → **Settings** → **Environment Variables**
2. Add the following:

```
NEXT_PUBLIC_API_BASE_URL=https://<your-render-url>
NEON_AUTH_BASE_URL=https://<your-neon-auth-base-url>
NEON_AUTH_COOKIE_SECRET=<python -c "import secrets; print(secrets.token_hex(32))">
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<from Google Cloud Console>
```

3. Go to **Deployments** and click **Redeploy**.

---

## Step 6 — Neon Auth Configuration

1. In the Neon Console → Auth → Settings
2. Add `https://merge.vercel.app` (your frontend URL) to the **Allowed Origins / Trusted Origins**.

---

## Smoke checks after deploy

```bash
# Backend
curl https://merge-backend.onrender.com/health
# → {"status":"ok"}
```

Browser checks:
1. Homepage loads correctly
2. Sign up → dashboard loads
3. "Connect YouTube Music" → OAuth flow → toast appears
4. Create blend → results page loads
5. Export to YouTube Music succeeds without errors
6. Sign out → protected routes enforce redirect
