# Backend — Local Cable Subscription Reminder & Payment Management System

FastAPI + PostgreSQL + SQLAlchemy + Alembic + JWT auth.

## First-time setup

```bash
cp .env.example .env   # then edit .env with real values (never commit .env)
python -m venv .venv
.venv/Scripts/activate       # Windows
pip install -r requirements.txt
```

## Start the database (Docker)

Run from the repo root (not backend/), so it also picks up `backend/.env`:

```bash
docker compose --env-file backend/.env up -d
```

## Run migrations

```bash
alembic upgrade head
```

To create a new migration after changing models in `app/models/`:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

## Seed an admin user

```bash
python -m app.seed
```

Creates `admin@localcablenetwork.com` / `Admin@12345` (change the password after first login once a
password-change endpoint exists).

## Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

- Health check: `GET /health`
- Login: `POST /auth/login` with `{"email": ..., "password": ...}` → JWT
- Current user: `GET /auth/me` with `Authorization: Bearer <token>`
- Interactive docs: http://127.0.0.1:8000/docs
