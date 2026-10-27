import pytest

RECIPE = {
    "title": "Brown butter cookies",
    "ingredients": "flour, butter, sugar",
    "steps": "mix; bake",
    "notes": "chill dough",
    "servings": 24,
    "category": "cookies",
}


def create(client, headers, **overrides):
    return client.post("/recipes", json={**RECIPE, **overrides}, headers=headers)


def only_recipe(client, headers):
    recipes = client.get("/recipes", headers=headers).get_json()
    assert len(recipes) == 1
    return recipes[0]


# --- auth required ---

@pytest.mark.parametrize("method, path", [
    ("get", "/recipes"),
    ("post", "/recipes"),
    ("put", "/recipes/1"),
    ("delete", "/recipes/1"),
])
def test_requires_token(client, method, path):
    resp = getattr(client, method)(path, json=RECIPE)
    assert resp.status_code == 401


def test_malformed_token_returns_422(client):
    resp = client.get("/recipes", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 422


# --- create and read ---

def test_new_user_has_no_recipes(client, auth_headers):
    resp = client.get("/recipes", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json() == []


def test_create_then_list(client, auth_headers):
    assert create(client, auth_headers).status_code == 201
    recipe = only_recipe(client, auth_headers)
    assert isinstance(recipe.pop("id"), int)
    assert recipe == RECIPE


def test_notes_and_category_default_to_empty(client, auth_headers):
    body = {k: v for k, v in RECIPE.items() if k not in ("notes", "category")}
    assert client.post("/recipes", json=body, headers=auth_headers).status_code == 201
    recipe = only_recipe(client, auth_headers)
    assert recipe["notes"] == ""
    assert recipe["category"] == ""


# --- update ---

def test_update_changes_all_fields(client, auth_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    updated = {
        "title": "Oat cookies",
        "ingredients": "oats",
        "steps": "stir",
        "notes": "",
        "servings": 12,
        "category": "breakfast",
    }
    resp = client.put(f"/recipes/{recipe_id}", json=updated, headers=auth_headers)
    assert resp.status_code == 200
    assert only_recipe(client, auth_headers) == {"id": recipe_id, **updated}


def test_update_missing_recipe_returns_404(client, auth_headers):
    resp = client.put("/recipes/999", json=RECIPE, headers=auth_headers)
    assert resp.status_code == 404


# --- delete ---

def test_delete_removes_recipe(client, auth_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    resp = client.delete(f"/recipes/{recipe_id}", headers=auth_headers)
    assert resp.status_code == 202  # unusual; 200 or 204 would be more standard
    assert client.get("/recipes", headers=auth_headers).get_json() == []


def test_delete_missing_recipe_returns_404(client, auth_headers):
    assert client.delete("/recipes/999", headers=auth_headers).status_code == 404


# --- users can't touch each other's recipes ---

def test_users_only_see_their_own_recipes(client, auth_headers, other_headers):
    create(client, auth_headers)
    assert client.get("/recipes", headers=other_headers).get_json() == []


def test_user_cannot_update_others_recipe(client, auth_headers, other_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    resp = client.put(f"/recipes/{recipe_id}", json={**RECIPE, "title": "hacked"},
                      headers=other_headers)
    assert resp.status_code == 404
    assert only_recipe(client, auth_headers)["title"] == RECIPE["title"]


def test_user_cannot_delete_others_recipe(client, auth_headers, other_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    assert client.delete(f"/recipes/{recipe_id}", headers=other_headers).status_code == 404
    only_recipe(client, auth_headers)


# Bad input returns 400, not a 500.

@pytest.mark.parametrize("missing", ["title", "ingredients", "steps", "servings"])
def test_create_missing_required_field_returns_400(client, auth_headers, missing):
    body = {k: v for k, v in RECIPE.items() if k != missing}
    assert client.post("/recipes", json=body, headers=auth_headers).status_code == 400


def test_update_without_category_succeeds(client, auth_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    body = {k: v for k, v in RECIPE.items() if k != "category"}
    resp = client.put(f"/recipes/{recipe_id}", json=body, headers=auth_headers)
    assert resp.status_code == 200


@pytest.mark.parametrize("missing", ["title", "ingredients", "steps", "servings"])
def test_update_missing_required_field_returns_400(client, auth_headers, missing):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    body = {k: v for k, v in RECIPE.items() if k != missing}
    resp = client.put(f"/recipes/{recipe_id}", json=body, headers=auth_headers)
    assert resp.status_code == 400
    assert only_recipe(client, auth_headers)["title"] == RECIPE["title"]


def test_create_without_json_body_returns_400(client, auth_headers):
    resp = client.post("/recipes", data="not json", content_type="text/plain",
                       headers=auth_headers)
    assert resp.status_code == 400


# --- single recipe ---

def test_get_single_recipe(client, auth_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    resp = client.get(f"/recipes/{recipe_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json() == {"id": recipe_id, **RECIPE}


def test_get_single_recipe_of_other_user_returns_404(client, auth_headers, other_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    assert client.get(f"/recipes/{recipe_id}", headers=other_headers).status_code == 404


# --- validation ---

@pytest.mark.parametrize("field, length", [
    ("title", 101), ("notes", 201), ("category", 51),
])
def test_too_long_field_returns_400(client, auth_headers, field, length):
    resp = create(client, auth_headers, **{field: "x" * length})
    assert resp.status_code == 400
    assert "characters or fewer" in resp.get_json()["error"]


def test_max_length_fields_are_accepted(client, auth_headers):
    resp = create(client, auth_headers, title="x" * 100, notes="x" * 200)
    assert resp.status_code == 201


@pytest.mark.parametrize("servings", ["abc", 0, -2, 1.5, "1.5", 1001, True])
def test_invalid_servings_returns_400(client, auth_headers, servings):
    resp = create(client, auth_headers, servings=servings)
    assert resp.status_code == 400
    assert "Servings" in resp.get_json()["error"]


def test_servings_as_numeric_string_is_stored_as_int(client, auth_headers):
    assert create(client, auth_headers, servings=" 12 ").status_code == 201
    assert only_recipe(client, auth_headers)["servings"] == 12


def test_non_text_title_returns_400(client, auth_headers):
    assert create(client, auth_headers, title=123).status_code == 400


def test_blank_title_returns_400(client, auth_headers):
    assert create(client, auth_headers, title="   ").status_code == 400


def test_update_validates_too(client, auth_headers):
    create(client, auth_headers)
    recipe_id = only_recipe(client, auth_headers)["id"]
    resp = client.put(f"/recipes/{recipe_id}", json={**RECIPE, "servings": "lots"},
                      headers=auth_headers)
    assert resp.status_code == 400
    assert only_recipe(client, auth_headers)["servings"] == RECIPE["servings"]


def test_recipe_user_id_is_indexed(client):
    from sqlalchemy import inspect
    import app as app_module
    with app_module.app.app_context():
        indexes = inspect(app_module.db.engine).get_indexes("recipe")
    assert any(ix["column_names"] == ["user_id"] for ix in indexes)
