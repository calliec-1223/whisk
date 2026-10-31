import pytest

from tests.test_recipes import create, only_recipe


def bake(client, headers, recipe_id, medal="gold"):
    return client.post(f"/recipes/{recipe_id}/bakes", json={"medal": medal}, headers=headers)


def earned(client, headers):
    stickers = client.get("/stickers", headers=headers).get_json()
    return {s["key"] for s in stickers if s["earned_at"]}


@pytest.mark.parametrize("method, path", [
    ("post", "/recipes/1/bakes"),
    ("get", "/stickers"),
    ("post", "/stickers/claim"),
])
def test_requires_login(client, method, path):
    assert getattr(client, method)(path).status_code == 401


# --- bakes ---

def test_new_recipe_has_no_bakes(client, auth_headers):
    create(client, auth_headers)
    recipe = only_recipe(client, auth_headers)
    assert recipe["bake_count"] == 0
    assert recipe["best_medal"] is None


def test_bake_counts_and_keeps_best_medal(client, auth_headers):
    create(client, auth_headers)
    rid = only_recipe(client, auth_headers)["id"]
    assert bake(client, auth_headers, rid, "silver").status_code == 201
    res = bake(client, auth_headers, rid, "bronze")
    assert res.get_json()["bake_count"] == 2
    assert res.get_json()["best_medal"] == "silver"
    recipe = only_recipe(client, auth_headers)
    assert (recipe["bake_count"], recipe["best_medal"]) == (2, "silver")


@pytest.mark.parametrize("medal", [None, "", "platinum", 3])
def test_bake_rejects_bad_medal(client, auth_headers, medal):
    create(client, auth_headers)
    rid = only_recipe(client, auth_headers)["id"]
    assert bake(client, auth_headers, rid, medal).status_code == 400


def test_cannot_bake_someone_elses_recipe(client, auth_headers, other_headers):
    create(client, auth_headers)
    rid = only_recipe(client, auth_headers)["id"]
    assert bake(client, other_headers, rid).status_code == 404


def test_deleting_a_baked_recipe_works_and_keeps_stickers(client, auth_headers):
    create(client, auth_headers)
    rid = only_recipe(client, auth_headers)["id"]
    bake(client, auth_headers, rid, "gold")
    assert client.delete(f"/recipes/{rid}", headers=auth_headers).status_code == 202
    assert {"first-recipe", "first-bake", "first-gold"} <= earned(client, auth_headers)


# --- stickers ---

def test_sticker_book_lists_every_sticker(client, auth_headers):
    stickers = client.get("/stickers", headers=auth_headers).get_json()
    assert len(stickers) == 10
    assert all(s["earned_at"] is None for s in stickers)
    assert {"key", "name", "how", "earned_at"} <= set(stickers[0])


def test_saving_a_recipe_awards_first_recipe_once(client, auth_headers):
    assert create(client, auth_headers).get_json()["new_stickers"] == ["first-recipe"]
    assert create(client, auth_headers).get_json()["new_stickers"] == []


def test_five_recipes_awards_collector(client, auth_headers):
    for i in range(4):
        create(client, auth_headers, title=f"R{i}")
    assert create(client, auth_headers, title="R5").get_json()["new_stickers"] == ["recipe-5"]


def test_first_gold_bake_awards_bake_and_gold_stickers(client, auth_headers):
    create(client, auth_headers)
    rid = only_recipe(client, auth_headers)["id"]
    assert bake(client, auth_headers, rid, "gold").get_json()["new_stickers"] == ["first-bake", "first-gold"]


def test_variety_needs_four_categories(client, auth_headers):
    ids = []
    for cat in ["cookies", "cakes", "bread", "pies"]:
        create(client, auth_headers, title=cat, category=cat)
    ids = [r["id"] for r in client.get("/recipes", headers=auth_headers).get_json()]
    for rid in ids[:3]:
        assert "variety" not in bake(client, auth_headers, rid, "bronze").get_json()["new_stickers"]
    assert "variety" in bake(client, auth_headers, ids[3], "bronze").get_json()["new_stickers"]


def test_stickers_are_per_user(client, auth_headers, other_headers):
    create(client, auth_headers)
    assert earned(client, other_headers) == set()


def test_claim_browser_sticker(client, auth_headers):
    res = client.post("/stickers/claim", json={"key": "spinner"}, headers=auth_headers)
    assert res.get_json()["new_stickers"] == ["spinner"]
    again = client.post("/stickers/claim", json={"key": "spinner"}, headers=auth_headers)
    assert again.get_json()["new_stickers"] == []


@pytest.mark.parametrize("key", ["first-gold", "made-up", None])
def test_cannot_claim_earned_only_stickers(client, auth_headers, key):
    res = client.post("/stickers/claim", json={"key": key}, headers=auth_headers)
    assert res.status_code == 400
