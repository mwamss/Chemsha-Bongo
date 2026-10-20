# Chemsha Bongo

Chemsha Bongo is a cognitive exercise suite with five mini-games, Daily Blitz, account profiles, statistics, leaderboards, reflection prompts, a private local journal, and optional Spotify playback.

## Architecture

- **Frontend:** React 18 and Vite (`frontend/`). The production build is served by FastAPI from `frontend/dist`.
- **Backend:** FastAPI, SQLAlchemy, and Alembic (`backend/`).
- **Database:** SQLite for local development; PostgreSQL for production.
- **Authentication:** Google Identity Services or password sign-in, with an HttpOnly session cookie and CSRF protection.

## Local development

1. Install Python dependencies: `python -m pip install -r backend/requirements.txt`.
2. Install frontend dependencies: `cd frontend; npm ci`.
3. From the repository root, apply the database schema: `python -m alembic -c backend/alembic.ini upgrade head`.
4. Start the API from the repository root: `python -m uvicorn backend.app.main:app --reload --port 8000`.
5. In another terminal, run `npm run dev` from `frontend/`. Vite proxies `/api` to port 8000.
6. Open `http://127.0.0.1:5173/`.

For local Google sign-in, set `GOOGLE_CLIENT_ID` in a root `.env` and `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` to the same web client ID. Allow the frontend's exact origin (for example, `http://127.0.0.1:5173`) in Google Cloud. For Spotify, register the exact frontend origin with a trailing `/` as a redirect URI and set `VITE_SPOTIFY_CLIENT_ID` in `frontend/.env`. The redirect URI defaults to the current origin.

For an older development database created by the previous app version, back it up and inspect its tables and columns before using Alembic. Only if it contains the complete schema through revision `20261020_004` should you mark it at that revision and apply the newer migrations:

```powershell
python -m alembic -c backend/alembic.ini stamp 20261020_004
python -m alembic -c backend/alembic.ini upgrade head
```

Do not run the `stamp` command against a database whose schema has not been verified. A fresh database should use `upgrade head` directly. The existing local `chemsha_dev.db` is not migrated automatically by the app.

## Docker deployment

1. Copy `.env.example` to `.env` and replace every placeholder. Use two independent random secrets for `SECRET_KEY` and `CSRF_SECRET`. URL-encode any special characters in the PostgreSQL password inside `DATABASE_URL`.
2. Set the Google web client ID and Spotify client ID. Add `https://your-domain/` as the Spotify redirect URI and as the Google authorized JavaScript origin. The redirect must exactly match the configured callback URI.
3. For a fresh database, run `docker compose up --build -d` behind an HTTPS reverse proxy. The app service applies Alembic migrations before starting and serves the built frontend and API from the same origin. For an existing unversioned database, first verify its schema and stamp it at `20261020_004` only if it exactly matches that revision; do this before starting the app container.
4. Check `https://your-domain/health` and confirm sign-in, sync, and Spotify playback from the deployed origin.

Production configuration rejects development secrets, debug mode, insecure cookies, localhost CORS origins, and SQLite. Same-origin hosting does not require CORS; if the frontend is hosted separately, set `CORS_ORIGINS` to its exact HTTPS origin(s).

The built-in sign-in throttle is per application process. If you run multiple workers or replicas, add a shared rate limiter at your HTTPS proxy or use a shared store such as Redis.

The Spotify Web Playback SDK requires Spotify Premium. Spotify tokens stay in browser session storage and are not used as Chemsha Bongo account credentials.

## Data notes

- Game progress is stored locally for guests and can be imported into an account once. Authenticated game sessions and profile settings are stored by the backend.
- Reflection journal entries and weekly rhythm history stay local unless **Settings → Account data → Sync private reflections and rhythm** is enabled. Turning that option off removes the server copy and keeps the local copy. Use the Profile screen's backup export before clearing browser data.
- Public leaderboards display account names and scores. Do not put private information in a public display name.

## Maintenance

Apply schema changes with Alembic migrations. Do not use `Base.metadata.create_all()` as a production schema update mechanism. Keep database backups and test restores as part of deployment operations.

## License

MIT. See [LICENSE](LICENSE).
