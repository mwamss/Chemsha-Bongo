from datetime import date
import hashlib
import json
import os
import random
from fastapi import APIRouter, Query, Response
from pydantic import BaseModel
import inspirational_quotes

router = APIRouter()


class QuoteResponse(BaseModel):
    quote: str
    author: str
    category: str = "COGNITIVE ANCHOR • INSPIRATIONAL WISDOM"
    primary_text: str | None = None
    secondary_text: str | None = None
    collection: str = "Inspirational Quotes Library"
    aphorism_number: str = "#1"
    date: str | None = None


# Cached collection directly loaded from inspirational-quotes library
_package_quotes_cache: list[dict] = []


def _assign_category(text: str) -> str:
    lower = text.lower()
    if any(k in lower for k in ["mind", "learn", "think", "thought", "intellect", "brain", "curious", "knowledge", "vessel"]):
        return "COGNITIVE ANCHOR • ACTIVE INTELLECT"
    if any(k in lower for k in ["fail", "mistake", "defeat", "struggle", "fall", "resilien"]):
        return "COGNITIVE ANCHOR • RESILIENCE & GROWTH"
    if any(k in lower for k in ["time", "patience", "wait", "moment", "hurry", "slow", "today", "tomorrow"]):
        return "TEMPORAL FOCUS • ATTENTION PACING"
    if any(k in lower for k in ["peace", "calm", "silence", "soul", "within", "still", "seren"]):
        return "MINDFUL EQUANIMITY • INNER CALM"
    if any(k in lower for k in ["success", "work", "action", "do", "goal", "dream", "achieve", "win"]):
        return "MOTIVATION • PURPOSE & ACTION"
    return "COGNITIVE ANCHOR • INSPIRATIONAL WISDOM"


def _load_all_package_quotes() -> list[dict]:
    global _package_quotes_cache
    if not _package_quotes_cache:
        dirpath = os.path.dirname(inspirational_quotes.__file__)
        quotes_path = os.path.join(dirpath, "quotes.json")
        try:
            with open(quotes_path, "rb") as f:
                raw_list = json.loads(f.read().decode("utf-8", errors="ignore"))
                for idx, item in enumerate(raw_list):
                    q_text = item.get("text", "").strip()
                    author_val = item.get("from", "").strip() or "Unknown"
                    _package_quotes_cache.append({
                        "id": idx + 1,
                        "quote": q_text,
                        "author": author_val,
                        "category": _assign_category(q_text),
                    })
        except Exception:
            _package_quotes_cache = []
    return _package_quotes_cache


@router.get("/daily", response_model=QuoteResponse)
def get_daily_inspirational_quote():
    """
    Returns the deterministic mindful Daily Quote of the day directly from the
    inspirational-quotes package library.
    All users on the same day share the same inspirational contemplation.
    """
    quotes = _load_all_package_quotes()
    if not quotes:
        res = inspirational_quotes.quote()
        raw_q = res.get("quote", "The only people who never fail are those who never try.")
        raw_a = res.get("author", "Ilka Chase")
        return QuoteResponse(
            quote=raw_q,
            author=raw_a,
            primary_text=f"“{raw_q}”",
            category="COGNITIVE ANCHOR • RESILIENCE & GROWTH",
            collection="Inspirational Quotes Library",
            aphorism_number="#1",
        )

    today_str = date.today().isoformat()
    hash_digest = hashlib.md5(today_str.encode("utf-8")).hexdigest()
    index = int(hash_digest, 16) % len(quotes)
    item = quotes[index]

    return QuoteResponse(
        quote=item["quote"],
        author=item["author"],
        primary_text=f"“{item['quote']}”",
        secondary_text=None,
        category=item["category"],
        collection="Inspirational Quotes Library",
        aphorism_number=f"#{item['id']}",
        date=today_str,
    )


@router.get("/random", response_model=QuoteResponse)
def get_random_inspirational_quote(
    response: Response,
    exclude: str | None = Query(None, description="Previous quote to avoid repeating"),
    _t: int | None = Query(None, description="Cache buster timestamp"),
):
    """
    Directly connects to inspirational_quotes.quote() from the library to return
    a random inspirational quote with the package's exact quote and author.
    Sets explicit cache headers so consecutive clicks always receive fresh quotes.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    quotes = _load_all_package_quotes()

    res = inspirational_quotes.quote()
    quote_text = res.get("quote", "Keep growing every day.")
    author_text = res.get("author", "Unknown")

    # If exclude is specified and matches the drawn quote, draw from the package list to guarantee variance
    if exclude and quotes and (quote_text.strip() == exclude.strip() or f"“{quote_text.strip()}”" == exclude.strip()):
        candidates = [q for q in quotes if q["quote"] != exclude.strip() and f"“{q['quote']}”" != exclude.strip()]
        if candidates:
            chosen = random.choice(candidates)
            quote_text = chosen["quote"]
            author_text = chosen["author"]

    # Match ID and category from cached package quotes
    matched_id = None
    for item in quotes:
        if item["quote"] == quote_text:
            matched_id = item["id"]
            break

    aph_number = f"#{matched_id}" if matched_id else f"#{random.randint(1, 326)}"

    return QuoteResponse(
        quote=quote_text,
        author=author_text,
        primary_text=f"“{quote_text}”",
        secondary_text=None,
        category=_assign_category(quote_text),
        collection="Inspirational Quotes Library",
        aphorism_number=aph_number,
    )


@router.get("/all", response_model=list[QuoteResponse])
def get_all_aphorisms(
    limit: int = Query(350, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Returns the full collection of 326 quotes directly from the inspirational-quotes
    package library for the dedicated Quotes Sanctuary page.
    """
    quotes = _load_all_package_quotes()
    slice_items = quotes[offset:offset + limit]

    results: list[QuoteResponse] = []
    for q in slice_items:
        results.append(
            QuoteResponse(
                quote=q["quote"],
                author=q["author"],
                primary_text=f"“{q['quote']}”",
                secondary_text=None,
                category=q["category"],
                collection="Inspirational Quotes Library",
                aphorism_number=f"#{q['id']}",
            )
        )
    return results
