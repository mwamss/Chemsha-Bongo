# Chemsha Bongo Developer & Deployment Guide

This guide walks you through setting up and running Chemsha Bongo locally.

---

## 1. Prerequisites
* **Python 3.11+**
* **Node.js 18+** & npm
* **Docker & Docker Compose** (for local PostgreSQL 16)

---

## 2. Quickstart with Docker Compose

### Step 1: Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optionally adjust `SECRET_KEY` and database credentials in `.env`)*

### Step 2: Start PostgreSQL Database
```bash
docker compose up -d
```
This spins up PostgreSQL 16 on port `5432` with a persistent Docker volume `chemsha_bongo_postgres_data`.

### Step 3: Run Database Migrations & Seeds
```bash
python -m alembic -c backend/alembic.ini upgrade head
```

---

## 3. Running the Backend (FastAPI)

Install dependencies:
```bash
pip install -r backend/requirements.txt
```

Launch the FastAPI development server:
```bash
uvicorn backend.app.main:app --reload --port 8000
```
* **Interactive OpenAPI Docs**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
* **ReDoc**: [http://127.0.0.1:8000/api/v1/redoc](http://127.0.0.1:8000/api/v1/redoc)
* **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 4. Running the Frontend (Vite + React)

Navigate into the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. All `/api` requests are automatically proxied to the FastAPI server at `http://127.0.0.1:8000`.

To build the production bundle:
```bash
npm run build
```

---

## 5. Running the Automated Test Suite

Run pytest with verbose output:
```bash
python -m pytest backend/tests -v
```
All 7 tests run against an isolated in-memory test database, covering:
* User registration, duplicate detection, and login
* Dual HttpOnly cookie & Bearer token authentication
* CSRF token protection on state-changing requests
* Anti-cheat sanity checks and scoring bounds
* Daily Blitz 3-round workout validation
* Unlimited Daily Blitz attempts and tie-breaking leaderboard rules
* Browser `localStorage` (`chemsha_bongo_data_v1`) migration ingestion

---

## 6. Standalone Vanilla Dev Server (Legacy Mode)

The original vanilla single-page engine is preserved and remains fully functional:
```bash
python serve.py
```
Open [http://127.0.0.1:8000](http://127.0.0.1:8000) for zero-dependency local testing.

