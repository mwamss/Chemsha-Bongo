import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.api.v1.api import api_router
from backend.app.db.session import get_db
from backend.app.api.v1.endpoints.games import ensure_canonical_games


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure canonical games exist in DB using the configured get_db dependency
    db_gen = get_db()
    db = next(db_gen)
    try:
        ensure_canonical_games(db)
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Chemsha Bongo API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


# If frontend production build exists, mount static files at root
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
