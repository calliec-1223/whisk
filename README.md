# Whisk

A full-stack baking app. Save and organize recipes, convert baking units, and ask an AI assistant questions that draw on your saved recipes.

**Live demo:** https://whisk-ten.vercel.app
![Whisk screenshot](docs/screenshot.png)

The backend runs on a free tier and sleeps when idle, so the first load after a quiet period can take up to a minute.

## Features

- Account signup and login with JWT authentication and bcrypt password hashing; logins last 7 days
- Create, edit, delete, and categorize recipes, stored per user
- Search by title, filter by category, and page through recipes 10 at a time
- Scale a recipe to a different number of servings
- Shopping list built from the recipes you select, with checkboxes
- Ingredient-aware unit converter between grams, cups, and teaspoons
- Baking assistant powered by Claude that answers measurement, substitution, and troubleshooting questions, using the user's saved recipes as context
- Responsive layout for phones and desktop

## Tech stack

- **Frontend:** React, React Router (Create React App), deployed on Vercel
- **Backend:** Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Flask-Limiter, served by gunicorn on Render
- **Database:** PostgreSQL on Neon in production, SQLite locally
- **AI:** Anthropic API, called server-side only

## Architecture

Browser -> React app (Vercel) -> Flask REST API (Render) -> PostgreSQL (Neon)
                                        |
                                        -> Anthropic API

## Design

The interface uses a warm bakery palette (chocolate, blush cream, caramel), Zilla Slab headings, and small uppercase labels. Colors, type sizes, and spacing are defined once as CSS variables in `frontend/src/styles.css`, and text scales with screen width. Form inputs use 16px text so phones don't zoom in on focus.

## Design decisions

- The Anthropic key stays on the server, and the chat endpoint requires login.
- Chat is rate limited per client, input length is capped, and the model's output length is capped, to control cost and abuse.
- The assistant reads the user's recipes from the database instead of trusting data sent by the browser.
- CORS allows only the deployed frontend origin.
- Configuration comes from environment variables, with SQLite as the local default and Postgres in production.
- Recipe input is validated on the server (required fields, lengths that match the database columns, servings from 1 to 1000), so bad input returns a clear 400 instead of a server error. The converter validates its input the same way.
- Normal browsing has a generous rate limit (300 requests per hour per IP); signup, login, and chat have stricter limits.
- The frontend sends every request through two small helpers in `frontend/src/api.js`. The logged-in helper adds the token and returns the user to the login page if it has expired.
- Recipes are fetched individually by ID, so edit pages survive a refresh or a shared link.
- On page load the frontend pings the backend to start waking it from free-tier sleep.

## Run locally

```
git clone https://github.com/calliec-1223/whisk.git
cd whisk
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Create `backend/.env`:

```
JWT_SECRET_KEY=your-random-secret
ANTHROPIC_API_KEY=your-key
```

Start the backend:

```
cd backend
python app.py
```

In a second terminal, start the frontend:

```
cd frontend
npm install
npm start
```

The app runs at http://localhost:3000 and the API at http://127.0.0.1:5000.

## Tests

The backend has a pytest suite covering signup, login, rate limits, recipe CRUD, input validation, per-user access, and the converter. Tests use an in-memory SQLite database, so they never touch your local data.

```
pip install -r backend/requirements-dev.txt
cd backend
pytest
```

## Environment variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET_KEY` | Signs login tokens (required) |
| `ANTHROPIC_API_KEY` | Enables the baking assistant |
| `DATABASE_URL` | Postgres connection string (defaults to local SQLite) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (defaults to http://localhost:3000) |
| `REACT_APP_API_URL` | Backend URL used by the frontend build (set it before building; Create React App fills it in at build time) |
| `RATELIMIT_STORAGE_URI` | Optional shared store for rate limits, such as a Redis URL (defaults to in-memory) |

## Roadmap

- CI to run the backend tests and frontend build on every push
- Database migrations (Flask-Migrate) instead of `db.create_all()`
- Shared rate limiting across instances
- Keep the assistant's conversation history between questions and across pages