"""Importing a recipe from a web page: address safety checks, reading
schema.org Recipe data, and the /recipes/import route.

No test touches the network: DNS lookups and HTTP are replaced with fakes."""

import json
import socket

import httpx
import pytest

import app as app_module
import recipe_import
from recipe_import import RecipeImportError, check_url, fetch_page, find_recipe


def page_with(*jsonld):
    """An HTML page carrying the given JSON-LD blocks."""
    scripts = ''.join(f'<script type="application/ld+json">{json.dumps(j)}</script>' for j in jsonld)
    return f'<html><head>{scripts}</head><body><h1>Hello</h1></body></html>'


COOKIE = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    'name': 'Brown Butter Cookies &amp; Sea Salt',
    'recipeYield': 'Makes 24 cookies',
    'recipeCategory': 'Dessert',
    'recipeIngredient': ['1 cup <b>butter</b>', '2 cups flour', '  '],
    'recipeInstructions': [
        {'@type': 'HowToStep', 'text': 'Brown the butter.'},
        {'@type': 'HowToStep', 'text': 'Mix &amp; bake.'},
    ],
}


# ---------- Reading schema.org Recipe data ----------

def test_reads_a_plain_recipe():
    recipe = find_recipe(page_with(COOKIE))
    assert recipe == {
        'title': 'Brown Butter Cookies & Sea Salt',
        'ingredients': ['1 cup butter', '2 cups flour'],   # tags stripped, blank line dropped
        'steps': ['Brown the butter.', 'Mix & bake.'],
        'servings': 24,
        'category': 'cookies',                             # guessed from the title
    }


def test_finds_the_recipe_inside_a_graph():
    page = page_with({'@context': 'https://schema.org', '@graph': [
        {'@type': 'WebPage', 'name': 'Some page'},
        {**COOKIE, '@type': ['Recipe', 'NewsArticle']},
    ]})
    assert find_recipe(page)['title'] == 'Brown Butter Cookies & Sea Salt'


def test_reads_steps_grouped_in_sections_and_plain_text():
    sections = {**COOKIE, 'recipeInstructions': [
        {'@type': 'HowToSection', 'name': 'Dough', 'itemListElement': [
            {'@type': 'HowToStep', 'text': 'Cream butter.'},
            {'@type': 'HowToStep', 'text': 'Add flour.'},
        ]},
        {'@type': 'HowToSection', 'name': 'Bake', 'itemListElement': [
            {'@type': 'HowToStep', 'text': 'Bake 12 minutes.'},
        ]},
    ]}
    assert find_recipe(page_with(sections))['steps'] == ['Cream butter.', 'Add flour.', 'Bake 12 minutes.']

    text = {**COOKIE, 'recipeInstructions': 'Cream butter.\nAdd flour.\n\nBake.'}
    assert find_recipe(page_with(text))['steps'] == ['Cream butter.', 'Add flour.', 'Bake.']


def test_tips_mixed_into_the_steps_are_left_out():
    # King Arthur lists HowToTips after the HowToSteps
    with_tips = {**COOKIE, 'recipeInstructions': [
        {'@type': 'HowToStep', 'name': 'Step 1', 'text': 'Mix.'},
        {'@type': 'HowToStep', 'name': 'Step 2', 'text': 'Bake.'},
        {'@type': 'HowToTip', 'text': 'Use less water in summer.'},
        {'@type': ['HowToTip'], 'text': 'Freeze for longer storage.'},
    ]}
    assert find_recipe(page_with(with_tips))['steps'] == ['Mix.', 'Bake.']


@pytest.mark.parametrize('yield_value, servings', [
    (12, 12), ('8', 8), (['4 servings', '4'], 4), ('a lot', None), (None, None),
])
def test_reads_servings_in_any_form(yield_value, servings):
    assert find_recipe(page_with({**COOKIE, 'recipeYield': yield_value}))['servings'] == servings


def test_skips_broken_json_and_non_recipes():
    page = ('<script type="application/ld+json">{not json</script>'
            + page_with({'@type': 'Organization', 'name': 'A blog'}, COOKIE))
    assert find_recipe(page)['title'] == 'Brown Butter Cookies & Sea Salt'


def test_no_recipe_data_returns_none():
    assert find_recipe('<html><body><p>Just a blog post</p></body></html>') is None
    # A Recipe without steps isn't worth importing
    assert find_recipe(page_with({**COOKIE, 'recipeInstructions': []})) is None


def test_page_text_leaves_out_scripts_and_menus():
    page = ('<nav>Home About</nav><script>var x = 1</script>'
            '<main><h1>Scones</h1><p>2 cups flour</p></main>')
    assert recipe_import.page_text(page) == 'Scones\n2 cups flour'


# ---------- Address safety checks ----------

def fake_dns(monkeypatch, table):
    """Make hostname lookups answer from `table` instead of real DNS."""
    def getaddrinfo(host, port, *args, **kwargs):
        if host not in table:
            raise socket.gaierror('not found')
        family = socket.AF_INET6 if ':' in table[host] else socket.AF_INET
        return [(family, socket.SOCK_STREAM, 6, '', (table[host], port))]
    monkeypatch.setattr(recipe_import.socket, 'getaddrinfo', getaddrinfo)


@pytest.mark.parametrize('address', [
    '127.0.0.1',         # this machine
    '10.0.0.5',          # private network
    '192.168.1.1',       # home router
    '169.254.169.254',   # cloud metadata service
    '::1',               # this machine, IPv6
    '0.0.0.0',
])
def test_refuses_addresses_inside_our_network(monkeypatch, address):
    fake_dns(monkeypatch, {'sneaky.example': address})
    with pytest.raises(RecipeImportError, match="isn't allowed"):
        check_url('http://sneaky.example/recipe')


def test_allows_public_addresses(monkeypatch):
    fake_dns(monkeypatch, {'bakery.example': '93.184.216.34'})
    check_url('https://bakery.example/cookies')  # no error


@pytest.mark.parametrize('url', ['ftp://bakery.example/x', 'file:///etc/passwd', 'bakery.example', 'http://'])
def test_refuses_non_web_addresses(url):
    with pytest.raises(RecipeImportError, match='full web address'):
        check_url(url)


def test_unknown_site(monkeypatch):
    fake_dns(monkeypatch, {})
    with pytest.raises(RecipeImportError, match="Couldn't find that website"):
        check_url('https://nowhere.example/')


REAL_CLIENT = httpx.Client


def fake_web(monkeypatch, handler):
    """Serve HTTP from `handler` instead of the network."""
    def client(**kwargs):
        return REAL_CLIENT(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr(recipe_import.httpx, 'Client', client)


def test_checks_every_redirect(monkeypatch):
    # A public page that redirects to an internal address must be refused
    fake_dns(monkeypatch, {'bakery.example': '93.184.216.34', 'internal.example': '10.0.0.1'})
    fake_web(monkeypatch, lambda request: httpx.Response(302, headers={'location': 'http://internal.example/admin'}))
    with pytest.raises(RecipeImportError, match="isn't allowed"):
        fetch_page('https://bakery.example/cookies')


def test_follows_a_safe_redirect(monkeypatch):
    fake_dns(monkeypatch, {'bakery.example': '93.184.216.34'})

    def handler(request):
        if request.url.path == '/old':
            return httpx.Response(301, headers={'location': '/new'})
        return httpx.Response(200, html=page_with(COOKIE))
    fake_web(monkeypatch, handler)
    assert 'Brown Butter' in fetch_page('https://bakery.example/old')


def test_refuses_huge_and_non_html_pages(monkeypatch):
    fake_dns(monkeypatch, {'bakery.example': '93.184.216.34'})
    fake_web(monkeypatch, lambda r: httpx.Response(200, html='x' * (recipe_import.MAX_BYTES + 1)))
    with pytest.raises(RecipeImportError, match='too large'):
        fetch_page('https://bakery.example/')

    fake_web(monkeypatch, lambda r: httpx.Response(200, content=b'%PDF', headers={'content-type': 'application/pdf'}))
    with pytest.raises(RecipeImportError, match="isn't a web page"):
        fetch_page('https://bakery.example/recipe.pdf')


def test_sites_that_refuse_imports(monkeypatch):
    fake_dns(monkeypatch, {'bakery.example': '93.184.216.34'})
    fake_web(monkeypatch, lambda r: httpx.Response(403))
    with pytest.raises(RecipeImportError, match="doesn't allow importing"):
        fetch_page('https://bakery.example/')
    fake_web(monkeypatch, lambda r: httpx.Response(404))
    with pytest.raises(RecipeImportError, match='error 404'):
        fetch_page('https://bakery.example/')


def test_stops_redirect_loops(monkeypatch):
    fake_dns(monkeypatch, {'bakery.example': '93.184.216.34'})
    fake_web(monkeypatch, lambda r: httpx.Response(302, headers={'location': '/again'}))
    with pytest.raises(RecipeImportError, match='redirects too many times'):
        fetch_page('https://bakery.example/')


# ---------- The /recipes/import route ----------

def test_import_reads_recipe_data_and_saves_nothing(client, auth_headers, monkeypatch):
    monkeypatch.setattr(recipe_import, 'fetch_page', lambda url: page_with(COOKIE))
    resp = client.post('/recipes/import', json={'url': 'https://bakery.example/cookies'}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['method'] == 'structured'
    assert data['title'] == 'Brown Butter Cookies & Sea Salt'
    assert data['source_url'] == 'https://bakery.example/cookies'
    # The user checks it in the form first, so nothing is saved yet
    assert client.get('/recipes', headers=auth_headers).get_json() == []


def test_import_falls_back_to_ai_without_recipe_data(client, auth_headers, monkeypatch):
    monkeypatch.setattr(recipe_import, 'fetch_page', lambda url: '<p>Scones: 2 cups flour. Bake.</p>')
    seen = {}

    def fake_extract(text):
        seen['text'] = text
        return {'title': 'Scones', 'ingredients': ['2 cups flour'], 'steps': ['Bake.'],
                'servings': None, 'category': 'muffins'}
    monkeypatch.setattr(app_module, 'extract_recipe', fake_extract)
    resp = client.post('/recipes/import', json={'url': 'https://blog.example/scones'}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['method'] == 'ai'
    assert 'Scones' in seen['text']


@pytest.mark.parametrize('extract', [lambda text: None, lambda text: 1 / 0])
def test_import_with_no_recipe_found(client, auth_headers, monkeypatch, extract):
    monkeypatch.setattr(recipe_import, 'fetch_page', lambda url: '<p>About us</p>')
    monkeypatch.setattr(app_module, 'extract_recipe', extract)
    resp = client.post('/recipes/import', json={'url': 'https://blog.example/about'}, headers=auth_headers)
    assert resp.status_code == 422
    assert "Couldn't find a recipe" in resp.get_json()['error']


def test_import_shows_fetch_problems(client, auth_headers, monkeypatch):
    def blocked(url):
        raise RecipeImportError("That address isn't allowed.")
    monkeypatch.setattr(recipe_import, 'fetch_page', blocked)
    resp = client.post('/recipes/import', json={'url': 'http://localhost/'}, headers=auth_headers)
    assert resp.status_code == 400
    assert resp.get_json()['error'] == "That address isn't allowed."


@pytest.mark.parametrize('body', [{}, {'url': ''}, {'url': 42}, {'url': 'https://x.example/' + 'a' * 500}])
def test_import_needs_a_link(client, auth_headers, body):
    assert client.post('/recipes/import', json=body, headers=auth_headers).status_code == 400


def test_import_needs_login(client):
    assert client.post('/recipes/import', json={'url': 'https://bakery.example/'}).status_code == 401


def test_saved_recipe_keeps_its_source(client, auth_headers):
    recipe = {'title': 'Scones', 'ingredients': 'flour', 'steps': 'bake', 'servings': 8,
              'source_url': 'https://blog.example/scones'}
    assert client.post('/recipes', json=recipe, headers=auth_headers).status_code == 201
    assert client.get('/recipes', headers=auth_headers).get_json()[0]['source_url'] == 'https://blog.example/scones'

    bad = {**recipe, 'source_url': 'javascript:alert(1)'}
    assert client.post('/recipes', json=bad, headers=auth_headers).status_code == 400
