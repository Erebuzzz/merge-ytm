# Security

YTMusic Sync processes uploaded `headers_auth.json` files for private YouTube Music workflows. Treat this repository and all deployments as handling sensitive integration data.

## Reporting

If you discover a security issue, do not open a public GitHub issue with the full details.

Instead:

- email `kshitiz23kumar@gmail.com`
- include reproduction steps, impact, and affected routes or files
- share sanitized examples only

## Secrets Handling

- Never commit real auth headers, cookies, or tokens.
- Never paste production secrets into issues or pull requests.
- Store deploy-time secrets only in the platform environment variables.
- Rotate `SECRET_KEY` carefully and document the operational impact before changing it.

## Auth Upload Expectations

- Uploaded auth files must be treated as sensitive user material.
- Test with scrubbed fixtures whenever possible.
- Do not log raw uploaded payloads.
- Do not persist unencrypted copies outside the intended storage path.

## Deployment Hygiene

- Keep Preview and Production environment variables separate when possible.
- Verify `FRONTEND_URL` matches the deployed frontend domain.
- Remove unused preview deployments if they were configured with sensitive values during debugging.

## Scope Notes

Areas that deserve extra caution:

- auth file upload handling
- playlist export routes
- database access patterns
- Celery task payloads
- any logging around request payloads or external service responses
