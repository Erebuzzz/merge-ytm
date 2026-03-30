# Security

Merge handles uploaded `headers_auth.json` files that contain YouTube Music session credentials. Treat all deployments as handling sensitive user data.

## Reporting a vulnerability

Do not open a public GitHub issue with full details.

Instead:

- Email `kshitiz23kumar@gmail.com`
- Include reproduction steps, affected routes or files, and estimated impact
- Use sanitized examples only — do not include real credentials

You will receive a response within 72 hours.

## Auth file handling

Uploaded `headers_auth.json` files contain browser session cookies for YouTube Music. The backend:

1. Validates the file is valid JSON and under 1 MB before processing
2. Encrypts the content with Fernet (AES-128-CBC) using a key derived from `SECRET_KEY`
3. Stores only the encrypted ciphertext — plaintext is never written to the database
4. Uses the credentials only for the duration of the active fetch or export operation
5. Never logs raw uploaded payloads

The frontend displays an explicit security warning before the file input is shown.

## Authentication and authorization

- All API routes except `GET /` and `GET /health` require a valid session token
- Tokens are validated against `neon_auth.session` and checked for expiry
- Missing or expired tokens return `401 Unauthorized`
- Blend and playlist-source routes enforce ownership — users cannot read or modify another user's data (returns `403` or `404`)

## Rate limiting

- Per-user: 60 requests per minute (keyed on session token)
- Per-IP: 100 requests per minute
- Exceeded limits return `429 Too Many Requests` with `Retry-After: 60`
- Rate limiter fails open if Redis is unavailable (requests are allowed through, a warning is logged)

## CORS

In production (`FRONTEND_URL` is set to a specific domain), CORS is restricted to that origin only. Wildcard CORS (`*`) is only active when `FRONTEND_URL="*"`, which is the default for local development.

## Secrets handling

- Never commit real auth headers, cookies, or tokens to the repository
- Never paste production secrets into issues or pull requests
- Store all secrets in platform environment variables only
- `SECRET_KEY` is used to derive the Fernet encryption key — rotating it invalidates all stored encrypted auth files
- `NEON_AUTH_COOKIE_SECRET` is independent of `SECRET_KEY` and affects frontend auth cookies

## Deployment hygiene

- Keep Preview and Production environment variables separate
- Verify `FRONTEND_URL` matches the deployed frontend domain exactly
- Verify Neon Auth trusted origins include all active frontend origins (local, production, preview)
- Remove unused preview deployments that were configured with sensitive values

## Scope — areas requiring extra care

- Auth file upload and encryption (`/user/upload-auth`, `core/security.py`)
- Playlist export routes (`/ytmusic/create-playlist`)
- Session validation (`core/auth_middleware.py`)
- Celery task payloads (avoid logging sensitive fields)
- Any logging around request bodies or external service responses
