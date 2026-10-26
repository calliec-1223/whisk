# Whisk

A full-stack baking app. Save and organize recipes, convert baking units, and ask an AI assistant questions that draw on your saved recipes.

**Live demo:** https://whisk-ten.vercel.app

The backend runs on a free tier and sleeps when idle, so the first load after a quiet period can take up to a minute.

## Features

- Account signup and login with JWT authentication and bcrypt password hashing
- Create, edit, delete, and categorize recipes, stored per user
- Ingredient unit converter
- Baking assistant powered by Claude, using the user's saved recipes as context

## Tech stack

- **Frontend:** React, React Router (Create React App), deployed on Vercel
- **Backend:** Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Flask-Limiter, served by gunicorn on Render
- **Database:** PostgreSQL on Neon in production, SQLite locally
- **AI:** Anthropic API, called server-side only

## Architecture

Browser -> React app (Vercel) -> Flask REST API (Render) -> PostgreSQL (Neon)
                                        |
                                        -> Anthropic API

## Design decisions

- The Anthropic key stays on the server, and the chat endpoint requires login.
- Chat is rate limited per client, input length is capped, and the model's output length is capped, to control cost and abuse.
- The assistant reads the user's recipes from the database instead of trusting data sent by the browser.
- CORS allows only the deployed frontend origin.
- Configuration comes from environment variables, with SQLite as the local default and Postgres in production.

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

## Environment variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET_KEY` | Signs login tokens (required) |
| `ANTHROPIC_API_KEY` | Enables the baking assistant |
| `DATABASE_URL` | Postgres connection string (defaults to local SQLite) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (defaults to http://localhost:3000) |
| `REACT_APP_API_URL` | Backend URL used by the frontend build |

## Roadmap

- Automated API tests and CI
- Shared rate limiting across instances