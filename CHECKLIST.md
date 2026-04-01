# Merge — Implementation Checklist

Legend: `[x]` = done in code | `[!]` = manual action required | `[ ]` = not yet implemented

---

## 🔑 0. Google Cloud Console (one-time manual setup)

- [x] Google Cloud project `merge-ytmusic` created
- [x] YouTube Data API v3 enabled
- [x] OAuth 2.0 Client ID created — Client ID: `198246023843-g5r679jicvavjgu5tgupvvia6aka4a62.apps.googleusercontent.com`
- [x] ✅ **Rotate the client secret** — done
- [x] ✅ OAuth consent screen scopes added: `youtube.readonly` + `youtube`
- [x] ✅ Your Google account added as a test user
- [ ] Railway redirect URI added to authorized URIs after deploy: `https://your-backend.railway.app/auth/youtube/callback`

**Local `backend/.env` — add these:**
```
GOOGLE_CLIENT_ID=198246023843-g5r679jicvavjgu5tgupvvia6aka4a62.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-rotated-secret>
YOUTUBE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/youtube/callback
```

**Local `frontend/.env.local` — add:**
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=198246023843-g5r679jicvavjgu5tgupvvia6aka4a62.apps.googleusercontent.com
```

---

## 🔐 1. Authentication & Identity

### Neon Auth (app identity layer)
- [ ] `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` set in Vercel
- [ ] Neon Auth trusted origins include production Vercel URL
- [ ] Session cookie persists across page reloads in production (verify after deploy)

### Google OAuth for YouTube Music
- [x] `GET /auth/youtube/url` — builds and returns Google OAuth URL with `state=user_id`
- [x] `GET /auth/youtube/callback` — exchanges code for token, encrypts with Fernet, stores on `User`, sets `auth_method="oauth"`, redirects to `/dashboard?ytm_connected=1`
- [x] `auth_method` column on `User` model (`"oauth"` | `"headers"` | `None`)
- [x] `GET /user/youtube-status` — returns `{ connected: bool, method }`
- [x] `YTMusicService._build_client()` detects OAuth vs headers credentials, uses `OAuthCredentials` for auto token refresh
- [x] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_OAUTH_REDIRECT_URI` in `Settings`
- [x] Dashboard shows "YouTube Music connected" toast after OAuth redirect

---

## 🎵 2. YouTube Music Connection — Three-tier approach

| Tier | Method | What it unlocks |
|---|---|---|
| 1 (primary) | Google OAuth | Library playlists, liked songs, export |
| 2 (fallback) | `headers_auth.json` upload | Same as OAuth but manual |
| 3 (no auth) | Public playlist URLs only | Blend from public playlists, no export |

### Backend
- [x] `GET /user/playlists` — calls `get_library_playlists(limit=50)`, returns `[{id, title, count, thumbnail}]`
- [x] `GET /user/liked-songs/count` — returns count without fetching all tracks
- [x] `YTMusicService.get_library_playlists()` method
- [x] `YTMusicService.get_liked_songs_count()` method
- [x] `POST /user/upload-auth` sets `auth_method="headers"` on user record
- [x] `extract_playlist_id()` already handles bare playlist IDs — picker selections work as-is

### Frontend
- [x] `ConnectYouTubeMusic` component — OAuth button (primary), legacy upload toggle (secondary), connected state badge with method label
- [x] `PlaylistPicker` component — library playlists + liked songs, max 5 selections, loading skeleton, error state
- [x] Blend form integrates `ConnectYouTubeMusic` + `PlaylistPicker` per participant
- [x] Manual URL input kept as fallback inside `<details>` (collapsed when connected)
- [x] Legacy `headers_auth.json` upload kept but collapsed by default
- [x] New API functions: `getYouTubeAuthUrl`, `getYouTubeStatus`, `getUserPlaylists`, `getLikedSongsCount`

---

## ⚡ 3. Async Flow

- [x] `pollJob()` wired into blend form submit — tries async path first, falls back to sync if Celery not configured
- [x] Progress bar shown during async generation (driven by `job.progress`)
- [x] Step labels per job type: "Fetching...", "Scoring...", "Creating playlist..."
- [x] `generateBlendAsync` and `getJobStatus` API functions added
- [x] Job `failed` status surfaces error message in UI
- [x] 10-minute polling timeout with descriptive error
- [x] `credentials: "include"` added to all `fetch` calls in `api.ts`
- [ ] Intermediate Celery task progress milestones (currently 0→100 jump):
  - [x] ✅ Fetch task: 10% on start → 100% done
  - [x] ✅ Generate task: 10% start → 30% normalization → 100% done
  - [x] ✅ Export task: 10% start → 50% playlist created → 100% done

---

## 🚦 4. Rate Limiting & Abuse Prevention

- [x] Per-user rate limit: 60 req/min via Redis (`RateLimiter` middleware)
- [x] Per-IP rate limit: 100 req/min via Redis
- [x] Duplicate job prevention on `POST /blend/generate/async` — checks for active `running` job
- [x] Idempotency on `POST /blend/generate` — returns existing result if `status=ready`
- [x] Auth file size cap: 1 MB
- [x] Playlist link cap: 5 per participant
- [x] ✅ Blend creation rate limit — max 10 blends per user per hour (429 with Retry-After)

---

## 🧠 5. Blend Engine

- [x] Scoring formula: `0.5×overlap + 0.3×artist_sim + 0.2×diversity + freq_weight`
- [x] Compatibility score: Dice coefficient `2×|shared| / (|A|+|B|) × 100`
- [x] Frequency weighting applied
- [x] Diversity constraints enforced
- [x] Both User A and User B feedback applied to scoring (was only User A before)
- [x] Feedback boost deltas configurable via `Settings` (`FEEDBACK_LIKE_BOOST`, `FEEDBACK_DISLIKE_PENALTY`, `FEEDBACK_SKIP_PENALTY`)
- [x] Section titles use participant names ("From Aanya" not "From User A")
- [x] ✅ Co-occurrence boosting — `_cooccurrence_boost()` added; tracks whose artist appears in both libraries get up to +15 score points
- [ ] Level 2: embedding similarity, cosine scoring, clustering (post-launch)

---

## 💬 6. Feedback System

- [x] 👍/👎/⏭ per track — hover-visible, toggle behavior, calls `POST /feedback/track`
- [x] Blend rating 1–5 + quick option — calls `POST /feedback/blend`
- [x] Feedback stored in `TrackFeedback` + `BlendFeedback` tables
- [x] Like/skip ratios computed in `FeedbackService.compute_track_stats()`
- [x] Feedback influences scoring on next generate (both users' history applied)
- [x] ✅ Blend feedback widget trigger — shows after 30s timer, after export, or after last track scrolls into view (IntersectionObserver)
- [x] ✅ Persist feedback state across page refreshes — Zustand `persist` middleware with `localStorage`, only feedback fields persisted (draft/result stay session-only)
- [x] ✅ Feedback submission confirmation toast ("Thanks for the feedback!")
- [ ] Surface aggregate stats to user ("87% liked this track")

---

## 📊 7. Results Page UX

- [x] Loading skeleton via `Suspense` + `BlendSkeleton` component
- [x] Participant names in section titles ("From Aanya" not "From User A")
- [x] Error boundary with retry link
- [x] Compatibility score displayed
- [x] Track metadata (title, artist, score) displayed
- [x] ✅ "Regenerate" button — re-runs generate with updated feedback boosts, calls `router.refresh()`
- [x] ✅ Share link — "🔗 Share" button copies blend URL to clipboard, shows "✓ Copied!" confirmation
- [x] ✅ Export status shown inline in track list — section headers show "✓ Synced to YT Music" when `youtubePlaylistId` is set

---

## 🗄️ 8. Database & Migrations

- [ ] **Replace `Base.metadata.create_all()` with Alembic migrations** (critical before production data):
  - [x] ✅ `alembic.ini` created in `backend/`
  - [x] ✅ `alembic/env.py` configured — imports `Base`, uses `DATABASE_URL`, skips `neon_auth` schema
  - [x] ✅ `alembic/script.py.mako` template created
  - [x] ✅ `alembic/versions/` directory created
  - [x] ✅ `main.py` startup runs `alembic upgrade head`, falls back to `create_all`
  - [ ] Run `alembic revision --autogenerate -m "initial"` locally to generate first migration file
  - [ ] Commit the generated migration file before deploying
- [x] `auth_method` column on `User` model (will be created by `create_all` on fresh DB)
- [x] `Job`, `TrackFeedback`, `BlendFeedback` models with proper indexes and constraints
- [x] ✅ Composite indexes: `TrackFeedback(user_id, blend_id)` via `ix_track_feedback_user_blend`, `Job(blend_id, status)` via `ix_job_blend_status`
- [ ] Document `SECRET_KEY` rotation impact — rotating it invalidates all stored encrypted auth files

---

## ⚡ 9. Performance & Caching

- [ ] Cache normalized track records in Redis — key: `track:{normalized_key}`, TTL: 24h
- [ ] Cache playlist fetch results — key: `playlist:{playlist_id}:{user_id}`, TTL: 1h
- [ ] Skip re-fetching `PlaylistSource` if `updated_at` within last hour
- [ ] `GET /blend/{id}/regenerate` endpoint reusing cached tracks

---

## 🌍 10. Deployment — Render + Fly.io + Upstash + Vercel

### Infrastructure

| Service | Platform | Notes |
|---|---|---|
| Backend API | Render | Free, spins down after 15 min idle |
| Celery worker | Fly.io | Free, always-on |
| Redis | Upstash | Free, 10k req/day |
| PostgreSQL | Neon | Already set up for auth |
| Frontend | Vercel | Free forever |

### Keep Render awake — UptimeRobot (free)

Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30s.

1. Go to [uptimerobot.com](https://uptimerobot.com) → sign up free
2. **Add New Monitor** → HTTP(s)
3. URL: `https://your-app.onrender.com/health`
4. Interval: **5 minutes** → Save

UptimeRobot pings `/health` every 5 min, keeping Render awake 24/7 at no cost.

### Render — Backend API

1. [render.com](https://render.com) → **New → Web Service** → connect GitHub repo
2. Root Directory: `backend`, Build: `pip install -e ".[dev]"`, Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add env vars:

```
DATABASE_URL=<Neon URL — strip sslmode params>
REDIS_URL=<Upstash Redis URL>
SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(32))">
FRONTEND_URL=https://your-app.vercel.app
DEBUG=false
GOOGLE_CLIENT_ID=198246023843-g5r679jicvavjgu5tgupvvia6aka4a62.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<rotated-secret>
YOUTUBE_OAUTH_REDIRECT_URI=https://your-app.onrender.com/auth/youtube/callback
FEEDBACK_LIKE_BOOST=10.0
FEEDBACK_DISLIKE_PENALTY=10.0
FEEDBACK_SKIP_PENALTY=5.0
```

4. Deploy → copy Render URL

- [ ] Render backend deployed
- [ ] UptimeRobot monitor set up → pinging `/health` every 5 min
- [ ] `GET /health` returns `{"status":"ok"}`

### Fly.io — Celery Worker

```bash
# Install flyctl (Windows PowerShell — close and reopen terminal after)
iwr https://fly.io/install.ps1 -useb | iex

fly auth login
cd backend
fly launch --name merge-celery-worker --no-deploy
# No to Postgres, No to Redis when prompted

fly secrets set \
  DATABASE_URL="<Neon URL>" \
  REDIS_URL="<Upstash URL>" \
  SECRET_KEY="<same as Render>"

fly deploy --command "celery -A app.tasks worker --loglevel=info --concurrency=2"
fly logs   # verify: celery@xxxx ready. Concurrency: 2
```

- [ ] Fly.io worker deployed
- [ ] `fly logs` shows `celery@xxxx ready`

### Vercel — Frontend

1. [vercel.com](https://vercel.com) → New Project → root: `frontend`, preset: Next.js
2. Env vars:

```
NEXT_PUBLIC_API_BASE_URL=https://your-app.onrender.com
NEON_AUTH_BASE_URL=https://your-neon-auth-base-url
NEON_AUTH_COOKIE_SECRET=<python -c "import secrets; print(secrets.token_hex(32))">
NEXT_PUBLIC_GOOGLE_CLIENT_ID=198246023843-g5r679jicvavjgu5tgupvvia6aka4a62.apps.googleusercontent.com
```

3. Deploy → copy production URL
4. Add production URL to Neon Auth trusted origins
5. Update `FRONTEND_URL` on Render → redeploy

- [ ] Vercel project created and deployed
- [ ] Production URL added to Neon Auth trusted origins
- [ ] `FRONTEND_URL` updated on Render → redeployed
- [ ] Render URL added to Google Cloud Console authorized redirect URIs

### Post-deploy smoke checks
- [ ] Homepage loads
- [ ] Sign up with new account
- [ ] "Connect YouTube Music" → Google OAuth → dashboard shows toast
- [ ] Playlist picker shows library playlists
- [ ] Select playlists → generate blend → results page loads
- [ ] Export to YouTube Music creates playlist
- [ ] Submit track feedback (👍/👎/⏭)
- [ ] Submit blend rating
- [ ] Sign out → protected routes return 401

---

## 🧪 11. Testing

- [ ] FastAPI endpoint tests (`httpx.AsyncClient` + SQLite in-memory):
  - [ ] `GET /auth/youtube/url` — returns URL when `GOOGLE_CLIENT_ID` set, 501 when not
  - [ ] `GET /user/playlists` — 400 when not connected
  - [ ] `POST /blend/generate/async` — duplicate job prevention returns `already_running`
  - [ ] `POST /blend/generate` — idempotency when `status=ready`
  - [ ] `GET /blend/{id}` — 403 for non-participant
- [ ] `YTMusicService` mock tests — OAuth path vs headers path, retry behavior
- [ ] Playwright integration: sign up → connect YTM → pick playlists → generate → view results → export

---

## 🧩 12. UX Polish

- [x] ✅ Loading skeleton on results page (Suspense + BlendSkeleton)
- [x] ✅ Participant names in section titles
- [x] ✅ Register page copy fixed ("YouTube Music" not "Spotify-style")
- [x] ✅ Dashboard toast after OAuth redirect
- [x] ✅ Progress bar during async blend generation
- [x] ✅ Error boundary on results page with retry link
- [x] ✅ Per-link URL validation with inline error messages
- [x] ✅ Blend feedback widget trigger timing (30s / export / scroll)
- [x] ✅ Mobile-friendly feedback controls (always visible on mobile, hover on desktop)
- [x] ✅ Empty state illustration on dashboard (icon + descriptive copy + CTA)
- [x] ✅ ConnectYouTubeMusic shown on dashboard sidebar
- [x] ✅ Feedback submission confirmation toast
- [x] ✅ Regenerate button on results page

---

## 📝 What's left — ordered by priority

### Do before first deploy
1. [x] ✅ Rotate Google client secret
2. [x] ✅ OAuth consent screen scopes + test user added
3. [x] ✅ Alembic migration generated and applied
4. [ ] Render + Fly.io + Vercel deployment (Section 10)
5. [ ] Set up UptimeRobot to keep Render awake
6. [ ] Add Render URL to Google Cloud Console authorized redirect URIs

### Post-launch improvements
6. [ ] Persist feedback state across page refreshes — ✅ done above
7. [ ] Caching layer — Redis track/playlist cache (Section 9)
8. [ ] Full test suite (Section 11)
9. [ ] Aggregate feedback stats visible to users (Section 6)
10. [ ] Level 2 intelligence — embeddings, clustering (Section 5)
