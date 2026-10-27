import pytest

import app as app_module
from conftest import login, signup


def test_signup_creates_user_with_hashed_password(client):
    resp = signup(client, "alice", password="secret123")
    assert resp.status_code == 201
    with app_module.app.app_context():
        user = app_module.User.query.filter_by(username="alice").one()
        assert user.email == "alice@example.com"
        assert user.password != "secret123"
        assert app_module.bcrypt.check_password_hash(user.password, "secret123")


@pytest.mark.parametrize("missing", ["username", "email", "password"])
def test_signup_missing_field_returns_400(client, missing):
    body = {"username": "alice", "email": "a@example.com", "password": "pw"}
    del body[missing]
    resp = client.post("/signup", json=body)
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "All fields are required"


def test_signup_duplicate_username_returns_400(client):
    signup(client, "alice", email="one@example.com")
    resp = signup(client, "alice", email="two@example.com")
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "Username already exists"


def test_signup_duplicate_email_returns_400(client):
    signup(client, "alice", email="same@example.com")
    resp = signup(client, "bob", email="same@example.com")
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "Email already registered"


def test_login_returns_working_token(client):
    signup(client, "alice")
    resp = login(client, "alice")
    assert resp.status_code == 200
    token = resp.get_json()["token"]
    recipes = client.get("/recipes", headers={"Authorization": f"Bearer {token}"})
    assert recipes.status_code == 200


def test_login_wrong_password_returns_401(client):
    signup(client, "alice")
    resp = login(client, "alice", password="wrong")
    assert resp.status_code == 401


def test_login_unknown_user_returns_401(client):
    resp = login(client, "nobody")
    assert resp.status_code == 401


def test_signup_rate_limited_after_10_per_hour(limited_client):
    for i in range(10):
        assert signup(limited_client, f"user{i}").status_code == 201
    assert signup(limited_client, "user10").status_code == 429


def test_login_rate_limited_after_30_per_hour(limited_client):
    for _ in range(30):
        assert login(limited_client, "nobody").status_code == 401
    assert login(limited_client, "nobody").status_code == 429


# Bad input returns 400, not a 500.

def test_login_missing_field_returns_400(client):
    resp = client.post("/login", json={"username": "alice"})
    assert resp.status_code == 400


def test_signup_without_json_body_returns_400(client):
    resp = client.post("/signup", data="not json", content_type="text/plain")
    assert resp.status_code == 400


def test_login_without_json_body_returns_400(client):
    resp = client.post("/login", data="not json", content_type="text/plain")
    assert resp.status_code == 400


def test_tokens_last_seven_days(client):
    assert app_module.app.config["JWT_ACCESS_TOKEN_EXPIRES"].days == 7


def test_normal_browsing_is_not_rate_limited(limited_client):
    from conftest import make_user
    headers = make_user(limited_client, "alice")
    for _ in range(100):
        assert limited_client.get("/recipes", headers=headers).status_code == 200
