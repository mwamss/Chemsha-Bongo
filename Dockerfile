FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_SPOTIFY_CLIENT_ID=
ARG VITE_SPOTIFY_REDIRECT_URI=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_SPOTIFY_CLIENT_ID=$VITE_SPOTIFY_CLIENT_ID \
    VITE_SPOTIFY_REDIRECT_URI=$VITE_SPOTIFY_REDIRECT_URI
RUN npm run build

FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000
WORKDIR /workspace
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-build /workspace/frontend/dist ./frontend/dist
RUN useradd --system --create-home app && chown -R app:app /workspace
USER app
EXPOSE 8000
CMD ["sh", "-c", "alembic -c backend/alembic.ini upgrade head && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
