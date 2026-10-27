# CLAUDE.md

Whisk is a recipe app for bakers: users sign up, save and edit recipes (with categories and ordered steps), convert ingredient amounts between cups and grams, and chat with a Claude-powered baking assistant that can see their saved recipes.

## Structure

```
backend/                 Flask API (single-file app)
  app.py                 Routes, SQLAlchemy models (User, Recipe), auth, rate limits, /chat
  conversions.py         Ingredient density table + convert() used by /convert
  .env                   Local secrets (gitignored)
  instance/whisk.db      Local SQLite DB, created automatically (gitignored)
  venv/                  Local virtualenv (gitignored, not shared)
frontend/                Create React App (react-scripts 5), React 19, react-router-dom 7
  src/App.js             Routes; ProtectedRoute checks for a JWT in localStorage
  src/Login.js, Signup.js
  src/Recipes.js         Recipe page: fetch, search, category filter
  src/RecipeList.js      Recipe cards (collapse, delete)
  src/RecipeForm.js      Shared add/edit recipe form (AddRecipe.js and EditRecipePage.js wrap it)
  src/categories.js      Recipe category list used by the form and the filter
  src/api.js             apiFetch (JSON requests) and authFetch (adds the login token,
                         sends the user to login on 401/422)
  src/Converter.js       Unit converter UI; ingredients.js lists the options
  src/Chatbot.js         Baking assistant chat (renders replies with react-markdown)
  src/ChatContext.js     Shared open/closed state for the assistant panel (provided by Layout)
  src/Layout.js, Navbar.js, Toast.js
  src/*.css, styles.css  Styles
```

### Backend API (`backend/app.py`)

| Route | Auth | Notes |
|---|---|---|
| `GET /ping` | – | Health check |
| `POST /signup` | – | 10/hour limit |
| `POST /login` | – | Returns `{token}` (JWT, identity = user id); 30/hour limit |
| `GET/POST /recipes` | JWT | Scoped to the current user |
| `GET/PUT/DELETE /recipes/<id>` | JWT | Scoped to the current user; 404 for other users' recipes |
| `POST /convert` | – | `{ingredient, amount, from_unit}`; units: `grams`, `cup`, `teaspoon` (1 cup = 48 tsp) |
| `POST /chat` | JWT | Calls Claude (`claude-haiku-5-5`) with up to 10 of the user's recipes as context; 20/hour limit |

Default rate limit is 2000/day, 300/hour per IP. Limits are stored in memory unless `RATELIMIT_STORAGE_URI` is set (e.g. a Redis URL). Login tokens last 7 days. Recipe input is validated in `validate_recipe()` (lengths match the column sizes; servings 1–1000). Tables are created with `db.create_all()` at startup; there are no migrations, so schema changes to existing tables need a manual migration or a fresh DB.

## Running locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
JWT_SECRET_KEY=<any random string>     # required; the app refuses to start without it
ANTHROPIC_API_KEY=<your key>           # needed only for /chat
# Optional:
# DATABASE_URL=postgresql://...        # defaults to sqlite:///whisk.db (backend/instance/whisk.db)
# FRONTEND_ORIGIN=http://localhost:3000  # CORS origin, this is the default
# FLASK_DEBUG=1                        # enable debug/reload
```

Run it:

```bash
cd backend
source venv/bin/activate
python app.py          # serves on http://127.0.0.1:5000
```

### Frontend

```bash
cd frontend
npm install
npm start              # http://localhost:3000
```

Components make requests through `apiFetch` / `authFetch` in `src/api.js`, which build URLs from `API_URL`. It reads `REACT_APP_API_URL` and falls back to `http://127.0.0.1:5000`. Create React App fills this value in at build time, so for a deployed build set `REACT_APP_API_URL` before `npm run build`, and set the backend's `FRONTEND_ORIGIN` to the frontend's address so requests aren't blocked.

## Tests

- **Backend:** pytest suite for auth and recipe routes in `backend/tests/`.
  ```bash
  cd backend
  pip install -r requirements-dev.txt
  venv/bin/pytest
  ```
  `tests/conftest.py` sets `JWT_SECRET_KEY` and `DATABASE_URL=sqlite://` before importing `app`, so tests use an in-memory database, never `instance/whisk.db`. Rate limits are off except in the tests that check them. `/chat` isn't covered.
- **Frontend:** `cd frontend && npm test` (Jest watch mode), or `CI=true npm test -- --watchAll=false` for a single run.

  The only test, `src/App.test.js`, is the Create React App placeholder. It currently fails: Jest can't resolve `react-router-dom` v7 (`Cannot find module 'react-router-dom' from 'src/App.js'`), and even once that's fixed, the test looks for a "learn react" link that the app no longer has.

## Deployment notes

`app.py` is set up for Render (`ProxyFix` for the real client IP) and a Neon Postgres DB (`pool_pre_ping`, `postgres://` URLs rewritten to `postgresql://`). Nothing deployment-related is checked into the repo.
