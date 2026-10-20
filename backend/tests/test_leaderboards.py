import time

def test_daily_blitz_leaderboard_rules(client):
    # Register Player 1
    p1_response = client.post(
        "/api/v1/auth/register",
        json={"email": "p1@example.com", "username": "player_one", "password": "Password123!", "surname": "One"}
    )
    t1 = p1_response.cookies.get("chemsha_session")

    # Register Player 2
    p2_response = client.post(
        "/api/v1/auth/register",
        json={"email": "p2@example.com", "username": "player_two", "password": "Password123!", "surname": "Two"}
    )
    t2 = p2_response.cookies.get("chemsha_session")

    # Player 1 submits first Blitz attempt (score: 2500)
    client.post(
        "/api/v1/sessions/blitz",
        json={
            "total_score": 2500,
            "rating": "Adept",
            "client_session_id": "p1-attempt-1",
            "rounds": [
                {"game_id": "color-clash", "round_order": 1, "score": 800, "accuracy_pct": 90, "max_streak": 5},
                {"game_id": "rapid-math", "round_order": 2, "score": 800, "accuracy_pct": 90, "max_streak": 5},
                {"game_id": "chimp-memory", "round_order": 3, "score": 900, "accuracy_pct": 90, "max_streak": 5},
            ]
        },
        headers={"Authorization": f"Bearer {t1}"}
    )

    # Player 1 submits second Blitz attempt (score: 3800 - new high)
    client.post(
        "/api/v1/sessions/blitz",
        json={
            "total_score": 3800,
            "rating": "Genius",
            "client_session_id": "p1-attempt-2",
            "rounds": [
                {"game_id": "color-clash", "round_order": 1, "score": 1200, "accuracy_pct": 95, "max_streak": 8},
                {"game_id": "rapid-math", "round_order": 2, "score": 1300, "accuracy_pct": 95, "max_streak": 8},
                {"game_id": "chimp-memory", "round_order": 3, "score": 1300, "accuracy_pct": 95, "max_streak": 8},
            ]
        },
        headers={"Authorization": f"Bearer {t1}"}
    )

    # Player 2 submits Blitz attempt (score: 3200)
    client.post(
        "/api/v1/sessions/blitz",
        json={
            "total_score": 3200,
            "rating": "Expert",
            "client_session_id": "p2-attempt-1",
            "rounds": [
                {"game_id": "color-clash", "round_order": 1, "score": 1000, "accuracy_pct": 90, "max_streak": 6},
                {"game_id": "rapid-math", "round_order": 2, "score": 1100, "accuracy_pct": 90, "max_streak": 7},
                {"game_id": "chimp-memory", "round_order": 3, "score": 1100, "accuracy_pct": 90, "max_streak": 7},
            ]
        },
        headers={"Authorization": f"Bearer {t2}"}
    )

    # Query Blitz Leaderboard
    res = client.get("/api/v1/leaderboard/blitz")
    assert res.status_code == 200
    data = res.json()
    entries = data["entries"]

    # Exactly 2 entries (each player appears only once despite player 1 having 2 attempts)
    assert len(entries) == 2
    assert entries[0]["username"] == "player_one"
    assert entries[0]["total_score"] == 3800
    assert entries[0]["rank"] == 1

    assert entries[1]["username"] == "player_two"
    assert entries[1]["total_score"] == 3200
    assert entries[1]["rank"] == 2

