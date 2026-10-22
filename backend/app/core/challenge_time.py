from datetime import datetime
from zoneinfo import ZoneInfo

from backend.app.core.config import settings


def challenge_date():
    """Return the current challenge date in the configured IANA timezone."""
    return datetime.now(ZoneInfo(settings.CHALLENGE_TIMEZONE)).date()
