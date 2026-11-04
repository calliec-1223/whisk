"""Share links (public read-only recipe pages) and /me."""

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


# ---------- Who's logged in ----------

def test_me_uses_the_username_when_no_name_is_set(client, auth_headers):
    assert client.get('/me', headers=auth_headers).get_json() == {
        'username': 'alice', 'display_name': None, 'name': 'alice'}


def test_name_given_at_signup(client):
    client.post('/signup', json={'username': 'cq99', 'password': 'pw123456', 'display_name': '  Callie  '})
    token = client.post('/login', json={'username': 'cq99', 'password': 'pw123456'}).get_json()['token']
    me = client.get('/me', headers={'Authorization': f'Bearer {token}'}).get_json()
    assert me['name'] == 'Callie'  # trimmed


def test_signup_name_is_checked(client):
    resp = client.post('/signup', json={'username': 'x', 'password': 'pw123456', 'display_name': 'a' * 41})
    assert resp.status_code == 400
    resp = client.post('/signup', json={'username': 'y', 'password': 'pw123456', 'display_name': 7})
    assert resp.status_code == 400


def test_changing_the_name_later(client, auth_headers):
    resp = client.put('/me', json={'display_name': 'Ali   B'}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['name'] == 'Ali B'
    assert client.get('/me', headers=auth_headers).get_json()['display_name'] == 'Ali B'

    # Blank goes back to the username
    assert client.put('/me', json={'display_name': '   '}, headers=auth_headers).get_json()['name'] == 'alice'
    assert client.put('/me', json={'display_name': 'a' * 41}, headers=auth_headers).status_code == 400
    assert client.put('/me', json={'display_name': 'x'}).status_code == 401


def test_me_needs_login(client):
    assert client.get('/me').status_code == 401
