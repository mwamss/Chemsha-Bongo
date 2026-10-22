from datetime import datetime, timezone

from backend.app.core import challenge_time


def test_challenge_date_uses_configured_timezone(monkeypatch):
    class FixedDateTime:
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 10, 20, 22, 30, tzinfo=timezone.utc).astimezone(tz)

    monkeypatch.setattr(challenge_time, "datetime", FixedDateTime)
    monkeypatch.setattr(challenge_time.settings, "CHALLENGE_TIMEZONE", "Africa/Nairobi")

    assert challenge_time.challenge_date().isoformat() == "2026-10-21"
