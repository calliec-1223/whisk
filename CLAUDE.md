# CLAUDE.md

Whisk is a recipe app for bakers: users sign up, save and edit recipes (with categories and ordered steps), convert ingredient amounts between cups and grams, and chat with a Claude-powered baking assistant that can see their saved recipes. The backend is a single-file Flask API (`backend/app.py`); the frontend is a Create React App in `frontend/`.

## Gotchas

- Tables are created with `db.create_all()` at startup; there are no migrations, so schema changes to existing tables need a manual migration or a fresh DB.
- Rate limits are stored in memory unless `RATELIMIT_STORAGE_URI` is set (e.g. a Redis URL).
- `REACT_APP_API_URL` is baked in at build time (falls back to `http://127.0.0.1:5000`). For a deployed build, set it before `npm run build`, and set the backend's `FRONTEND_ORIGIN` to the frontend's address so CORS doesn't block requests.

## Local setup

`backend/.env` (gitignored) needs `JWT_SECRET_KEY` (the app refuses to start without it) and `ANTHROPIC_API_KEY` (only for `/chat`). Optional: `DATABASE_URL` (defaults to SQLite at `backend/instance/whisk.db`), `FRONTEND_ORIGIN` (defaults to `http://localhost:3000`), `FLASK_DEBUG=1`.

## Tests

- Backend: `cd backend && pip install -r requirements-dev.txt && venv/bin/pytest`. `tests/conftest.py` points tests at an in-memory DB, never `instance/whisk.db`. Rate limits are off except in the tests that check them. `/chat` isn't covered.
- Frontend: `CI=true npm test -- --watchAll=false` for a single run. The only test, `src/App.test.js`, is the CRA placeholder and currently fails: Jest can't resolve `react-router-dom` v7, and even once that's fixed, the test looks for a "learn react" link the app no longer has.

## Deployment

`app.py` is set up for Render (`ProxyFix` for the real client IP) and a Neon Postgres DB (`pool_pre_ping`, `postgres://` URLs rewritten to `postgresql://`). Nothing deployment-related is checked into the repo.
