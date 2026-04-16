# Contributing

Thanks for contributing to Merge. This is a full-stack project mixing a Next.js frontend and a FastAPI backend — changes often touch both sides. Keep contributions small, focused, and well-documented.

## Before you start

- Read [README.md](./README.md) for product context, architecture, and local setup.
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) if your change touches routing, env variables, or Vercel config.
- Read [code_review.md](./code_review.md) for the current technical risk picture before making structural changes.
- Read [SECURITY.md](./SECURITY.md) if your change touches auth, encryption, or user data.

## Local setup

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Start infrastructure
docker compose up -d

# 3. Backend
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload

# 4. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Working style

- Keep API paths consistent with the root-path routing in `backend/vercel.json`.
- Prefer targeted fixes over broad rewrites unless the change has been discussed first.
- Update docs when the contributor workflow, deployment flow, or public API shape changes.
- Update `code_review.md` when you materially change architecture, behavior, or known risks.
- Do not commit secrets, auth headers, or real user data.

## Code quality

**Backend:**

- New service logic should have tests in `backend/tests/`.
- Property-based tests use Hypothesis — add them for correctness properties in `test_properties.py`.
- Run the test suite before opening a PR: `cd backend && pytest tests/ -v`
- The blend engine, normalization service, and feedback service are the most test-sensitive areas.

**Frontend:**

- Changes should build successfully: `cd frontend && npm run build`
- Keep Zustand store additions minimal — only add state that is genuinely shared across components.
- Client-side URL validation and form error handling should match backend validation rules.

## Commit guidance

- Use small, intentional commits.
- Write commit messages that describe the user-facing or deploy-facing effect.
- If your change modifies deployment assumptions, mention the affected project or env variable in the commit body.

## Pull request checklist

- [ ] Change is scoped to a single clear purpose
- [ ] README or supporting docs updated if behavior changed
- [ ] `code_review.md` still reflects the current repo state
- [ ] New env variables, routes, or deployment requirements are documented
- [ ] Backend tests pass (`pytest tests/ -v`)
- [ ] Frontend builds (`npm run build`)
- [ ] No secrets or local artifacts included

## Deployment-affecting changes

If your PR affects deployment, include in the description:

- Which Vercel project is affected (`merge-frontend` or `merge-backend`)
- Whether the root directory or build settings change
- Which env variables were added, removed, or renamed
- What smoke check confirms the deploy is healthy

## New API routes

When adding a route:

1. Add the `get_current_user` dependency (all protected routes require auth)
2. Add ownership checks if the route accesses blend or playlist-source data
3. Add the route to the API surface table in `README.md`
4. Add Pydantic request/response schemas in `backend/app/schemas/api.py`

## Database changes

The app uses Alembic for schema migrations. To add a new model:

1. Define it in `backend/app/models.py`
2. Run `alembic revision --autogenerate -m "description"` to generate a migration
3. Run `alembic upgrade head` to apply it locally
4. Commit the generated migration file in `backend/alembic/versions/`
