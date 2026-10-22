def test_user_profile_and_settings_persistence(client):
    # 1. Register a user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "settings_user@example.com",
            "username": "mindful_account",
            "password": "Password123!",
            "surname": "OriginalSurname",
        },
    )
    assert reg.status_code == 201, reg.text
    headers = {"X-CSRF-Token": reg.json()["csrf_token"]}

    # 2. Verify initial settings
    settings_res = client.get("/api/v1/users/settings", headers=headers)
    assert settings_res.status_code == 200
    settings_data = settings_res.json()
    assert settings_data["sound_muted"] is False
    assert settings_data["haptics_enabled"] is True
    assert settings_data["ambient_enabled"] is False

    # 3. Update settings (mute sound, disable haptics, enable ambient)
    patch_settings_res = client.patch(
        "/api/v1/users/settings",
        json={
            "sound_muted": True,
            "haptics_enabled": False,
            "ambient_enabled": True,
        },
        headers=headers,
    )
    assert patch_settings_res.status_code == 200
    updated_settings = patch_settings_res.json()
    assert updated_settings["sound_muted"] is True
    assert updated_settings["haptics_enabled"] is False
    assert updated_settings["ambient_enabled"] is True

    # 4. Update profile (surname and avatar color)
    patch_profile_res = client.patch(
        "/api/v1/users/profile",
        json={
            "surname": "Mwamburi",
            "avatar_color": "#356759",
        },
        headers=headers,
    )
    assert patch_profile_res.status_code == 200
    updated_profile = patch_profile_res.json()
    assert updated_profile["surname"] == "Mwamburi"
    assert updated_profile["avatar_color"] == "#356759"

    # 5. Verify /auth/me reflects the updated profile & settings
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["surname"] == "Mwamburi"
    assert me_data["avatar_color"] == "#356759"
    assert me_data["sound_muted"] is True
    assert me_data["haptics_enabled"] is False
    assert me_data["ambient_enabled"] is True


def test_user_stats_accumulate_in_account(client):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "stats_player@example.com",
            "username": "stats_champ",
            "password": "Password123!",
            "surname": "Champ",
        },
    )
    assert reg.status_code == 201, reg.text
    headers = {"X-CSRF-Token": reg.json()["csrf_token"]}

    # Play round 1 of Color Clash
    client.post(
        "/api/v1/sessions/game",
        json={
            "game_id": "color-clash",
            "mode": "free-play",
            "score": 1100,
            "max_streak": 6,
            "correct_count": 11,
            "wrong_count": 1,
            "duration_sec": 30,
            "client_session_id": "stats-play-001",
        },
        headers=headers,
    )

    # Play round 2 of Rapid Math
    client.post(
        "/api/v1/sessions/game",
        json={
            "game_id": "rapid-math",
            "mode": "free-play",
            "score": 1350,
            "max_streak": 9,
            "correct_count": 14,
            "wrong_count": 0,
            "duration_sec": 30,
            "client_session_id": "stats-play-002",
        },
        headers=headers,
    )

    # Query statistics summary
    stats_res = client.get("/api/v1/statistics/summary", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()

    assert stats["games_played"] == 2
    assert stats["correct_answers"] == 25
    assert stats["wrong_answers"] == 1
    assert stats["accuracy"] == 96
    assert stats["highest_overall_streak"] == 9
    assert stats["personal_bests"]["color-clash"]["high_score"] == 1100
    assert stats["personal_bests"]["rapid-math"]["high_score"] == 1350


def test_user_stats_accuracy_is_empty_before_any_answers(client):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new_stats_player@example.com",
            "username": "new_stats_player",
            "password": "Password123!",
            "surname": "New Player",
        },
    )
    assert reg.status_code == 201, reg.text
    headers = {"X-CSRF-Token": reg.json()["csrf_token"]}

    stats_res = client.get("/api/v1/statistics/summary", headers=headers)

    assert stats_res.status_code == 200
    assert stats_res.json()["accuracy"] is None

