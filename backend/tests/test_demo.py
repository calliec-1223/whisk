from datetime import timedelta

import app as app_module
from conftest import make_user
from demo import DEMO_RECIPES


def start_demo(client):
    res = client.post("/demo")
    assert res.status_code == 201
    return {"Authorization": f"Bearer {res.get_json()['token']}"}


def test_demo_box_has_the_sample_recipes(client):
    headers = start_demo(client)
    recipes = client.get("/recipes", headers=headers).get_json()
    assert sorted(r["title"] for r in recipes) == sorted(r["title"] for r in DEMO_RECIPES)


def test_demo_box_has_bakes_and_stickers(client):
    headers = start_demo(client)
    recipes = client.get("/recipes", headers=headers).get_json()
    assert sum(r["bake_count"] for r in recipes) == sum(len(r["medals"]) for r in DEMO_RECIPES)
    earned = [s["key"] for s in client.get("/stickers", headers=headers).get_json() if s["earned_at"]]
    assert "recipe-5" in earned and "first-gold" in earned


def test_demo_me_says_demo(client):
    headers = start_demo(client)
    me = client.get("/me", headers=headers).get_json()
    assert me["demo"] is True
    assert me["name"] == "Guest"


def test_normal_account_is_not_demo(client, auth_headers):
    assert client.get("/me", headers=auth_headers).get_json()["demo"] is False


def test_each_visitor_gets_a_private_box(client):
    first = start_demo(client)
    second = start_demo(client)
    recipe_id = client.get("/recipes", headers=first).get_json()[0]["id"]
    assert client.delete(f"/recipes/{recipe_id}", headers=first).status_code == 202
    assert len(client.get("/recipes", headers=first).get_json()) == len(DEMO_RECIPES) - 1
    assert len(client.get("/recipes", headers=second).get_json()) == len(DEMO_RECIPES)
    assert client.get(f"/recipes/{recipe_id}", headers=second).status_code == 404


def expire_all_demos():
    with app_module.app.app_context():
        for user in app_module.User.query.filter(app_module.User.demo_expires_at.isnot(None)):
            user.demo_expires_at = app_module.utc_now_naive() - timedelta(minutes=1)
        app_module.db.session.commit()


def counts():
    with app_module.app.app_context():
        return {model.__name__: model.query.count()
                for model in (app_module.User, app_module.Recipe, app_module.Bake,
                              app_module.Sticker, app_module.ShareLink)}


def test_expired_demos_are_deleted_with_everything_they_made(client):
    old = start_demo(client)
    recipe_id = client.get("/recipes", headers=old).get_json()[0]["id"]
    assert client.post(f"/recipes/{recipe_id}/share", headers=old).status_code == 201
    expire_all_demos()
    before = counts()
    start_demo(client)  # starting a new demo clears out expired ones
    after = counts()
    assert after["User"] == before["User"]  # one removed, one added
    assert after["Recipe"] == before["Recipe"]
    assert after["ShareLink"] == 0


def test_cleanup_leaves_real_accounts_alone(client, auth_headers):
    client.post("/recipes", headers=auth_headers,
                json={"title": "Mine", "ingredients": "flour", "steps": "mix", "servings": 2})
    start_demo(client)
    expire_all_demos()
    start_demo(client)
    assert [r["title"] for r in client.get("/recipes", headers=auth_headers).get_json()] == ["Mine"]


def test_demo_cannot_be_logged_into_with_a_password(client):
    start_demo(client)
    with app_module.app.app_context():
        username = app_module.User.query.filter(app_module.User.demo_expires_at.isnot(None)).first().username
    for password in ("", "demo", username):
        assert client.post("/login", json={"username": username, "password": password}).status_code in (400, 401)


def test_demo_is_rate_limited(limited_client):
    codes = [limited_client.post("/demo").status_code for _ in range(11)]
    assert codes[:10] == [201] * 10
    assert codes[10] == 429


def test_shared_link_from_a_demo_still_saves_into_a_real_box(client):
    demo = start_demo(client)
    recipe_id = client.get("/recipes", headers=demo).get_json()[0]["id"]
    token = client.post(f"/recipes/{recipe_id}/share", headers=demo).get_json()["token"]
    mine = make_user(client, "carol")
    assert client.post(f"/shared/{token}/save", headers=mine).status_code == 201
    expire_all_demos()
    start_demo(client)
    assert len(client.get("/recipes", headers=mine).get_json()) == 1
