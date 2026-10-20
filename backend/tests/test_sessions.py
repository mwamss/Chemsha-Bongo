def test_record_game_session(client):
    # Register user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "gamer@example.com",
            "username": "speedy_gamer",
            "password": "Password123!",
            "surname": "Speedy",
        },
    )
    assert reg.status_code == 201, reg.text
    headers = {"X-CSRF-Token": reg.json()["csrf_token"]}

    # 1. Record first game round
    payload = {
        "game_id": "color-clash",
        "mode": "free-play",
        "score": 1200,
        "max_streak": 8,
        "correct_count": 12,
        "wrong_count": 1,
        "duration_sec": 30,
        "client_session_id": "sess-test-unique-001",
    }
    res = client.post("/api/v1/sessions/game", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["is_new_high_score"] is True
    assert data["is_new_best_streak"] is True
    assert data["high_score"] == 1200
    assert data["best_streak"] == 8

    # 2. Duplicate submission with same client_session_id is idempotent
    dup_res = client.post("/api/v1/sessions/game", json=payload, headers=headers)
    assert dup_res.status_code == 201
    assert dup_res.json()["is_new_high_score"] is False

    # 3. Higher score round updates Personal Best
    payload2 = {
        "game_id": "color-clash",
        "mode": "free-play",
        "score": 1500,
        "max_streak": 10,
        "correct_count": 15,
        "wrong_count": 0,
        "duration_sec": 30,
        "client_session_id": "sess-test-unique-002",
    }
    res2 = client.post("/api/v1/sessions/game", json=payload2, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["is_new_high_score"] is True
    assert res2.json()["high_score"] == 1500


def test_record_daily_blitz(client):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "blitz_player@example.com",
            "username": "blitz_champ",
            "password": "Password123!",
            "surname": "Champ",
        },
    )
    assert reg.status_code == 201, reg.text
    headers = {"X-CSRF-Token": reg.json()["csrf_token"]}

    blitz_payload = {
        "total_score": 3600,
        "rating": "Master",
        "duration_sec": 90,
        "client_session_id": "blitz-sess-001",
        "rounds": [
            {"game_id": "color-clash", "round_order": 1, "score": 1200, "accuracy_pct": 95, "max_streak": 8},
            {"game_id": "rapid-math", "round_order": 2, "score": 1200, "accuracy_pct": 90, "max_streak": 7},
            {"game_id": "confusing-arrows", "round_order": 3, "score": 1200, "accuracy_pct": 92, "max_streak": 9},
        ],
    }
    res = client.post("/api/v1/sessions/blitz", json=blitz_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["is_new_blitz_high"] is True
    assert data["best_blitz_score"] == 3600
    assert data["rating"] == "Genius"

