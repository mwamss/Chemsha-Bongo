from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.deps import get_db
from backend.app.models.game import Game
from backend.app.schemas.game import GameRead

router = APIRouter()

CANONICAL_GAMES = [
    {
        "id": "color-clash",
        "title": "Color Clash",
        "subtitle": "Inhibition Challenge",
        "category": "focus",
        "category_label": "Attention & Focus",
        "icon": "🎨",
        "color_accent": "#ef4444",
        "is_active": True,
    },
    {
        "id": "chimp-memory",
        "title": "Chimp Memory",
        "subtitle": "Working Memory Grid",
        "category": "memory",
        "category_label": "Working Memory",
        "icon": "🐵",
        "color_accent": "#10b981",
        "is_active": True,
    },
    {
        "id": "rapid-math",
        "title": "Rapid Math",
        "subtitle": "Mental Arithmetic",
        "category": "math",
        "category_label": "Mental Calculation",
        "icon": "⚡",
        "color_accent": "#3b82f6",
        "is_active": True,
    },
    {
        "id": "confusing-arrows",
        "title": "Confusing Arrows",
        "subtitle": "Spatial Direction Reflex",
        "category": "reflex",
        "category_label": "Spatial Reflexes",
        "icon": "🧭",
        "color_accent": "#f59e0b",
        "is_active": True,
    },
    {
        "id": "number-sequence",
        "title": "Pattern Sequence",
        "subtitle": "Pattern Deduction",
        "category": "logic",
        "category_label": "Logic & Induction",
        "icon": "🧩",
        "color_accent": "#8b5cf6",
        "is_active": True,
    },
]


def ensure_canonical_games(db: Session) -> None:
    """Ensure the 5 mini-games are registered in the database."""
    count = db.scalar(select(Game).limit(1))
    if not count:
        for g_data in CANONICAL_GAMES:
            db.add(Game(**g_data))
        db.commit()


@router.get("", response_model=List[GameRead])
def list_games(db: Session = Depends(get_db)):
    """List all available mini-games with their metadata."""
    ensure_canonical_games(db)
    games = db.scalars(select(Game).where(Game.is_active == True)).all()
    return games

