def test_local_storage_migration(client):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "migratee@example.com",
            "username": "migrator",
            "password": "Password123!",
            "surname": "",
        },
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate existing localStorage payload
    local_data = {
        "profile": {"surname": "Mwamburi"},
        "highScores": {
            "color-clash": 1400,
            "rapid-math": 1250,
        },
        "bestStreaks": {
            "color-clash": 9,
            "rapid-math": 8,
        },
        "blitzStats": {
            "bestScore": 3500,
            "bestRating": "Grandmaster",
            "workoutsCompleted": 7,
        },
        "totals": {
            "gamesPlayed": 25,
            "correctAnswers": 210,
            "wrongAnswers": 18,
            "highestOverallStreak": 14,
        },
        "settings": {
            "soundMuted": True,
            "hapticsEnabled": False,
        },
    }

    res = client.post("/api/v1/sync/migrate-local", json=local_data, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["high_scores_merged"] == 2
    assert data["workouts_merged"] == 7

    # Verify summary reflects the migrated data
    summary = client.get("/api/v1/statistics/summary", headers=headers).json()
    assert summary["games_played"] == 25
    assert summary["best_blitz_score"] == 3500
    assert summary["personal_bests"]["color-clash"]["high_score"] == 1400
    assert summary["personal_bests"]["color-clash"]["best_streak"] == 9

    # Verify profile surname was adopted
    profile = client.get("/api/v1/users/profile", headers=headers).json()
    assert profile["surname"] == "Mwamburi"

    # Verify settings were merged
    settings = client.get("/api/v1/users/settings", headers=headers).json()
    assert settings["sound_muted"] is True
    assert settings["haptics_enabled"] is False

