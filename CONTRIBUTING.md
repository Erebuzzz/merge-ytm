# Contributing

Thank you for contributing to YTMusic Sync.

This repository mixes a Next.js frontend and a FastAPI backend, so changes tend to affect both runtime behavior and deployment shape. Keep changes small, reviewable, and documented.

## Before You Start

- Read [README.md](./README.md) for product context and architecture.
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) if your change touches routing, environment variables, or Vercel behavior.
- Read [code_review.md](./code_review.md) if you need the current technical risk picture before making a structural change.

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env.local`.
3. Start Postgres and Redis with `docker compose up -d`, or point the env values at your own services.
4. Start the backend from `backend/`.
5. Start the frontend from `frontend/`.

## Working Style

- Keep API paths consistent with the backend root-path routing defined in `backend/vercel.json`.
- Prefer targeted fixes over broad rewrites unless the change has been discussed first.
- Update docs whenever the contributor workflow, deployment flow, or public API shape changes.
- Update `code_review.md` when you materially change architecture, behavior, deployment assumptions, or known risks.
- Do not commit secrets, auth headers, or real user data.

## Code Quality Expectations

- Frontend changes should build successfully with `npm run build` from `frontend/`.
- Backend changes should be covered by tests when practical, especially for the blend engine or API behavior.
- If you cannot run a required verification step, say so clearly in the pull request.
- Keep naming direct and boring. Favor clarity over clever abstractions.

## Commit Guidance

- Use small, intentional commits.
- Write commit messages that describe the user-facing or deploy-facing effect.
- If your change modifies deployment assumptions, mention the affected project or environment variable in the commit body.

## Pull Request Checklist

- The change is scoped to a single clear purpose.
- README or supporting docs were updated if behavior changed.
- `code_review.md` still matches the current repo state.
- New env variables, routes, or deployment requirements are documented.
- No secrets or local machine artifacts are included.

## Communication

If a change affects deployment, note all of the following in the PR description:

- which Vercel project is affected
- whether the root directory changes
- which environment variables were added, removed, or renamed
- what smoke check proves the deploy is healthy
