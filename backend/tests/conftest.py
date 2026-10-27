import os

# app.py configures itself on import, so these must be set first.
# An in-memory database keeps tests away from instance/whisk.db.
os.environ["JWT_SECRET_KEY"] = "test-secret-at-least-32-bytes-long!!"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

import pytest

import app as app_module


@pytest.fixture
def client():
    flask_app = app_module.app
    flask_app.config["TESTING"] = True
    app_module.limiter.enabled = False
    with flask_app.app_context():
        app_module.db.drop_all()
        app_module.db.create_all()
    yield flask_app.test_client()
    app_module.limiter.enabled = True
    app_module.limiter.reset()


@pytest.fixture
def limited_client(client):
    """Same as client, but with rate limits on and counters cleared."""
    app_module.limiter.reset()
    app_module.limiter.enabled = True
    return client


def signup(client, username="alice", email=None, password="pw123456"):
    return client.post("/signup", json={
        "username": username,
        "email": email or f"{username}@example.com",
        "password": password,
    })


def login(client, username="alice", password="pw123456"):
    return client.post("/login", json={"username": username, "password": password})


def make_user(client, username):
    assert signup(client, username).status_code == 201
    token = login(client, username).get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers(client):
    return make_user(client, "alice")


@pytest.fixture
def other_headers(client):
    return make_user(client, "bob")
