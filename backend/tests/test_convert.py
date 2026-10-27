import pytest

from conversions import INGREDIENT_DENSITIES


def convert(client, **body):
    return client.post("/convert", json=body)


def test_grams_to_cups(client):
    resp = convert(client, ingredient="flour", amount=240, from_unit="grams")
    assert resp.status_code == 200
    assert resp.get_json() == {"ingredient": "flour", "amount": 2.0, "unit": "cup"}


def test_cups_to_grams(client):
    resp = convert(client, ingredient="Flour ", amount="1", from_unit="cup")
    assert resp.get_json()["amount"] == INGREDIENT_DENSITIES["flour"]["grams_per_unit"]


def test_cups_of_teaspoon_ingredient_uses_48_teaspoons_per_cup(client):
    per_tsp = INGREDIENT_DENSITIES["salt"]["grams_per_unit"]
    resp = convert(client, ingredient="salt", amount=1, from_unit="cup")
    assert resp.get_json()["amount"] == round(48 * per_tsp, 2)


def test_teaspoons_of_cup_ingredient(client):
    per_cup = INGREDIENT_DENSITIES["flour"]["grams_per_unit"]
    resp = convert(client, ingredient="flour", amount=48, from_unit="teaspoon")
    assert resp.get_json()["amount"] == per_cup


@pytest.mark.parametrize("body, message", [
    ({}, "required"),
    ({"ingredient": "flour", "from_unit": "cup"}, "required"),
    ({"ingredient": "flour", "amount": "abc", "from_unit": "cup"}, "must be a number"),
    ({"ingredient": "flour", "amount": -1, "from_unit": "cup"}, "greater than 0"),
    ({"ingredient": "flour", "amount": "nan", "from_unit": "cup"}, "greater than 0"),
    ({"ingredient": "unobtainium", "amount": 1, "from_unit": "cup"}, "not found"),
    ({"ingredient": "flour", "amount": 1, "from_unit": "gallon"}, "Unknown unit"),
])
def test_bad_input_returns_400(client, body, message):
    resp = client.post("/convert", json=body)
    assert resp.status_code == 400
    assert message in resp.get_json()["error"]


def test_non_json_body_returns_400(client):
    resp = client.post("/convert", data="x", content_type="text/plain")
    assert resp.status_code == 400
