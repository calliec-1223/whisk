"""Share links (public read-only recipe pages) and baker ranks."""

import pytest

from app import rank_for

RECIPE = {'title': 'Scones', 'ingredients': '2 cups flour\n1 egg', 'steps': 'Mix\nBake',
          'notes': 'Warm is best', 'servings': 8, 'category': 'muffins'}


def make_recipe(client, headers):
    assert client.post('/recipes', json=RECIPE, headers=headers).status_code == 201
    return client.get('/recipes', headers=headers).get_json()[-1]['id']


def share(client, headers, recipe_id):
    return client.post(f'/recipes/{recipe_id}/share', headers=headers)


# ---------- Share links ----------

def test_anyone_with_the_link_can_view(client, auth_headers):
    recipe_id = make_recipe(client, auth_headers)
    resp = share(client, auth_headers, recipe_id)
    assert resp.status_code == 201
    token = resp.get_json()['token']
    assert len(token) >= 20  # long enough that it can't be guessed

    viewed = client.get(f'/shared/{token}')  # no login
    assert viewed.status_code == 200
    data = viewed.get_json()
    assert data['title'] == 'Scones'
    assert data['shared_by'] == 'alice'
    assert 'id' not in data and 'user_id' not in data


def test_sharing_twice_gives_the_same_link(client, auth_headers):
    recipe_id = make_recipe(client, auth_headers)
    first = share(client, auth_headers, recipe_id).get_json()['token']
    assert share(client, auth_headers, recipe_id).get_json()['token'] == first
    assert client.get(f'/recipes/{recipe_id}', headers=auth_headers).get_json()['share_token'] == first
    assert client.get('/recipes', headers=auth_headers).get_json()[0]['share_token'] == first


def test_turning_a_link_off(client, auth_headers):
    recipe_id = make_recipe(client, auth_headers)
    token = share(client, auth_headers, recipe_id).get_json()['token']
    assert client.delete(f'/recipes/{recipe_id}/share', headers=auth_headers).status_code == 200
    assert client.get(f'/shared/{token}').status_code == 404
    # Sharing again makes a new link, so the old one stays dead
    assert share(client, auth_headers, recipe_id).get_json()['token'] != token


def test_deleting_the_recipe_turns_the_link_off(client, auth_headers):
    recipe_id = make_recipe(client, auth_headers)
    token = share(client, auth_headers, recipe_id).get_json()['token']
    client.delete(f'/recipes/{recipe_id}', headers=auth_headers)
    assert client.get(f'/shared/{token}').status_code == 404


def test_unknown_link(client):
    assert client.get('/shared/not-a-real-token').status_code == 404


def test_cant_share_someone_elses_recipe(client, auth_headers, other_headers):
    recipe_id = make_recipe(client, auth_headers)
    assert share(client, other_headers, recipe_id).status_code == 404
    assert client.delete(f'/recipes/{recipe_id}/share', headers=other_headers).status_code == 404


def test_saving_a_shared_recipe_makes_your_own_copy(client, auth_headers, other_headers):
    recipe_id = make_recipe(client, auth_headers)
    token = share(client, auth_headers, recipe_id).get_json()['token']

    resp = client.post(f'/shared/{token}/save', headers=other_headers)
    assert resp.status_code == 201
    assert resp.get_json()['new_stickers'] == ['first-recipe']
    bobs = client.get('/recipes', headers=other_headers).get_json()
    assert len(bobs) == 1
    assert bobs[0]['title'] == 'Scones' and bobs[0]['id'] != recipe_id
    assert bobs[0]['share_token'] is None  # the copy isn't shared

    # Editing the copy leaves the original alone
    client.put(f"/recipes/{bobs[0]['id']}", json={**RECIPE, 'title': 'Bob scones'}, headers=other_headers)
    assert client.get(f'/shared/{token}').get_json()['title'] == 'Scones'


def test_saving_needs_login_and_a_live_link(client, auth_headers, other_headers):
    recipe_id = make_recipe(client, auth_headers)
    token = share(client, auth_headers, recipe_id).get_json()['token']
    assert client.post(f'/shared/{token}/save').status_code == 401
    client.delete(f'/recipes/{recipe_id}/share', headers=auth_headers)
    assert client.post(f'/shared/{token}/save', headers=other_headers).status_code == 404


# ---------- Baker ranks ----------

@pytest.mark.parametrize('bakes, rank, next_rank', [
    (0, 'Kitchen Helper', 'Home Baker'),
    (2, 'Kitchen Helper', 'Home Baker'),
    (3, 'Home Baker', 'Pastry Chef'),
    (10, 'Pastry Chef', 'Head Baker'),
    (49, 'Head Baker', 'Master Baker'),
    (50, 'Master Baker', None),
    (500, 'Master Baker', None),
])
def test_rank_for(bakes, rank, next_rank):
    result = rank_for(bakes)
    assert result['rank'] == rank
    assert result['next_rank'] == next_rank


def test_me_shows_username_and_rank(client, auth_headers):
    data = client.get('/me', headers=auth_headers).get_json()
    assert data == {'username': 'alice', 'rank': 'Kitchen Helper', 'bakes': 0,
                    'rank_floor': 0, 'next_rank': 'Home Baker', 'next_rank_at': 3}


def test_bake_reports_a_rank_up(client, auth_headers):
    recipe_id = make_recipe(client, auth_headers)
    results = [client.post(f'/recipes/{recipe_id}/bakes', json={'medal': 'gold'}, headers=auth_headers).get_json()
               for _ in range(3)]
    assert [r['ranked_up'] for r in results] == [False, False, True]
    assert results[-1]['rank']['rank'] == 'Home Baker'
    assert client.get('/me', headers=auth_headers).get_json()['rank'] == 'Home Baker'


def test_me_needs_login(client):
    assert client.get('/me').status_code == 401
