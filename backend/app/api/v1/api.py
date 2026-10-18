from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    auth,
    users,
    games,
    sessions,
    statistics,
    leaderboard,
    migration,
    quotes,
    reflections,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Preferences"])
api_router.include_router(games.router, prefix="/games", tags=["Game Catalog"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Game Sessions"])
api_router.include_router(statistics.router, prefix="/statistics", tags=["Player Statistics"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["Leaderboards"])
api_router.include_router(migration.router, prefix="/sync", tags=["Data Migration"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["Inspirational Quotes"])
api_router.include_router(reflections.router, prefix="/reflections", tags=["Reflection & Mental Check-In"])

