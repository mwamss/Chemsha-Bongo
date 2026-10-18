import hashlib
import json
import os
import random
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel

router = APIRouter()


class QuestionItem(BaseModel):
    id: int
    question: str
    category: str
    date: Optional[str] = None


class CategorySummary(BaseModel):
    name: str
    count: int


class SourceNote(BaseModel):
    title: str
    url: str
    use: str


class ReflectionMetaResponse(BaseModel):
    title: str
    description: str
    question_count: int
    usage_note: str
    source_notes: list[SourceNote] = []
    categories: list[CategorySummary] = []


_cached_data = None
_all_questions_cache = []


def _get_data_path() -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.abspath(os.path.join(current_dir, "../../../data/reflection_questions.json")),
        os.path.abspath(os.path.join(os.getcwd(), "backend/app/data/reflection_questions.json")),
        os.path.abspath(os.path.join(os.getcwd(), "app/data/reflection_questions.json")),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]


def _load_data():
    global _cached_data, _all_questions_cache
    if _cached_data is None:
        path = _get_data_path()
        with open(path, "r", encoding="utf-8") as f:
            _cached_data = json.load(f)
        _all_questions_cache = []
        for cat in _cached_data.get("categories", []):
            cat_name = cat.get("name", "")
            for q in cat.get("questions", []):
                _all_questions_cache.append({
                    "id": q["id"],
                    "question": q["question"],
                    "category": cat_name,
                })
    return _cached_data, _all_questions_cache


@router.get("/metadata", response_model=ReflectionMetaResponse)
def get_reflection_metadata():
    """
    Returns metadata about the 160 reflection questions collection,
    including usage notes, sources, and category breakdowns.
    """
    data, questions = _load_data()
    categories = [
        CategorySummary(name=cat["name"], count=len(cat.get("questions", [])))
        for cat in data.get("categories", [])
    ]
    sources = [
        SourceNote(
            title=s.get("title", ""),
            url=s.get("url", ""),
            use=s.get("use", ""),
        )
        for s in data.get("source_notes", [])
    ]
    return ReflectionMetaResponse(
        title=data.get("title", "Chemsha Bongo Reflection Questions"),
        description=data.get("description", ""),
        question_count=data.get("question_count", len(questions)),
        usage_note=data.get("usage_note", ""),
        source_notes=sources,
        categories=categories,
    )


@router.get("/categories", response_model=list[CategorySummary])
def get_reflection_categories():
    """
    Returns list of all 14 reflection question categories with item counts.
    """
    data, _ = _load_data()
    return [
        CategorySummary(name=cat["name"], count=len(cat.get("questions", [])))
        for cat in data.get("categories", [])
    ]


@router.get("/daily", response_model=QuestionItem)
def get_daily_reflection(response: Response):
    """
    Returns a deterministic daily reflection question based on today's calendar date.
    All users visiting on the same day receive the same anchor prompt.
    """
    _, questions = _load_data()
    if not questions:
        raise HTTPException(status_code=404, detail="No reflection questions found")

    today_str = date.today().isoformat()
    hash_digest = hashlib.md5(today_str.encode("utf-8")).hexdigest()
    index = int(hash_digest, 16) % len(questions)
    item = questions[index]

    response.headers["Cache-Control"] = "public, max-age=3600"
    return QuestionItem(
        id=item["id"],
        question=item["question"],
        category=item["category"],
        date=today_str,
    )


@router.get("/random", response_model=QuestionItem)
def get_random_reflection(
    response: Response,
    category: Optional[str] = Query(None, description="Optional category filter"),
    exclude_id: Optional[int] = Query(None, description="Question ID to exclude to prevent immediate repeats"),
    _t: Optional[str] = Query(None, description="Cache buster"),
):
    """
    Returns a random reflection prompt, optionally filtered by category.
    """
    _, all_q = _load_data()
    if not all_q:
        raise HTTPException(status_code=404, detail="No reflection questions found")

    pool = all_q
    if category:
        cat_lower = category.lower().strip()
        filtered = [q for q in all_q if cat_lower in q["category"].lower()]
        if filtered:
            pool = filtered

    if exclude_id is not None and len(pool) > 1:
        excluded = [q for q in pool if q["id"] != exclude_id]
        if excluded:
            pool = excluded

    item = random.choice(pool)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return QuestionItem(
        id=item["id"],
        question=item["question"],
        category=item["category"],
    )


@router.get("/all", response_model=list[QuestionItem])
def get_all_reflections(
    category: Optional[str] = Query(None, description="Optional category filter"),
):
    """
    Returns all 160 reflection questions, or filtered by category.
    """
    _, all_q = _load_data()
    if category:
        cat_lower = category.lower().strip()
        return [q for q in all_q if cat_lower in q["category"].lower()]
    return all_q

