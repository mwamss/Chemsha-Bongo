def test_register_and_login(client):
    # 1. Register a new user
    register_payload = {
        "email": "testplayer@example.com",
        "username": "mindful_gamer",
        "password": "Password123!",
        "surname": "Mwamburi",
    }
    res = client.post("/api/v1/auth/register", json=register_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "mindful_gamer"
    assert data["surname"] == "Mwamburi"
    assert "access_token" not in data
    assert "csrf_token" in data

    # Verify HttpOnly cookie was set
    assert "chemsha_session" in res.cookies

    # 2. Duplicate registration fails
    dup_res = client.post("/api/v1/auth/register", json=register_payload)
    assert dup_res.status_code == 400

    # 3. Login with credentials
    login_payload = {
        "username_or_email": "mindful_gamer",
        "password": "Password123!",
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["username"] == "mindful_gamer"
    assert "access_token" not in login_data


def test_auth_me_and_csrf_protection(client):
    # Register and get session
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "csrf_test@example.com",
            "username": "csrf_user",
            "password": "SecurePassword1!",
            "surname": "Tester",
        },
    )
    csrf_token = reg.json()["csrf_token"]

    # Authentication is carried by the HttpOnly session cookie.
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["surname"] == "Tester"

    # State-changing request via cookie WITHOUT CSRF token fails with 403
    fail_res = client.patch(
        "/api/v1/users/profile",
        json={"surname": "UpdatedSurname"},
    )
    assert fail_res.status_code == 403

    # State-changing request WITH valid CSRF token succeeds
    success_res = client.patch(
        "/api/v1/users/profile",
        json={"surname": "UpdatedSurname"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert success_res.status_code == 200
    assert success_res.json()["surname"] == "UpdatedSurname"


def test_logout(client):
    res = client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    # Cookie should be cleared
    assert client.cookies.get("chemsha_session") is None

