"""Import a recipe from a web page.

1. fetch_page() downloads the page, refusing addresses inside our own network
   (localhost, 10.x.x.x, cloud metadata at 169.254.169.254, ...). Without that
   check anyone could make our server request internal services for them
   (server-side request forgery, "SSRF").
2. find_recipe() reads the page's schema.org Recipe data: most recipe sites embed
   it as JSON-LD for search engines, so no guessing is needed.
3. page_text() gives the readable text, for an AI fallback when a page has no
   Recipe data (see assistant.extract_recipe).

The result is not saved: the user checks it in the recipe form first.
"""

import html
import ipaddress
import json
import re
import socket
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx

MAX_BYTES = 2_000_000      # a recipe page's HTML is well under this
TIMEOUT_SECONDS = 8
MAX_REDIRECTS = 5
USER_AGENT = 'WhiskRecipeImporter/1.0'

# Our categories, and words that suggest each one
CATEGORY_WORDS = {
    'cookies': ('cookie', 'biscotti', 'snickerdoodle', 'shortbread', 'macaron'),
    'cakes': ('cake', 'cheesecake', 'cupcake', 'torte'),
    'bread': ('bread', 'loaf', 'focaccia', 'sourdough', 'brioche', 'bagel', 'roll', 'baguette'),
    'muffins': ('muffin', 'scone'),
    'pies': ('pie', 'tart', 'galette', 'cobbler', 'crumble'),
    'pastry': ('pastry', 'croissant', 'danish', 'puff', 'eclair', 'choux', 'strudel'),
    'no-bake': ('no-bake', 'no bake', 'tiramisu', 'mousse', 'pudding', 'fudge'),
}


class RecipeImportError(Exception):
    """A problem worth showing to the user, like a blocked or unreachable address."""


# ---------- 1. Fetching safely ----------

def check_url(url):
    """Raise RecipeImportError unless url is http(s) and its host resolves only to public addresses."""
    parts = urlparse(url)
    if parts.scheme not in ('http', 'https') or not parts.hostname:
        raise RecipeImportError('Enter a full web address starting with http:// or https://')
    try:
        port = parts.port or (443 if parts.scheme == 'https' else 80)
    except ValueError:
        raise RecipeImportError('That web address has an invalid port')
    try:
        infos = socket.getaddrinfo(parts.hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise RecipeImportError("Couldn't find that website. Check the address.")
    for info in infos:
        address = ipaddress.ip_address(info[4][0].split('%')[0])  # drop an IPv6 zone like %eth0
        if not address.is_global:
            raise RecipeImportError("That address isn't allowed.")


def fetch_page(url):
    """Download a page's HTML, checking every redirect hop the same way.

    Known gap: the host is looked up again when connecting, so a hostile DNS
    server could answer differently the second time ("DNS rebinding"). Closing
    that means connecting to the checked IP directly, which is more than this
    app needs today.
    """
    with httpx.Client(timeout=TIMEOUT_SECONDS, follow_redirects=False,
                      headers={'User-Agent': USER_AGENT}) as client:
        for _ in range(MAX_REDIRECTS + 1):
            check_url(url)
            try:
                with client.stream('GET', url) as response:
                    if response.is_redirect:
                        url = urljoin(url, response.headers.get('location', ''))
                        continue
                    if response.status_code in (401, 403, 429):
                        # Some big sites refuse automated requests; we respect that
                        raise RecipeImportError("That site doesn't allow importing. Add this one by hand.")
                    if response.status_code >= 400:
                        raise RecipeImportError(f"That page couldn't be opened (error {response.status_code}).")
                    if 'html' not in response.headers.get('content-type', ''):
                        raise RecipeImportError("That link isn't a web page.")
                    body = b''
                    for chunk in response.iter_bytes():
                        body += chunk
                        if len(body) > MAX_BYTES:
                            raise RecipeImportError('That page is too large to import.')
                    return body.decode(response.encoding or 'utf-8', errors='replace')
            except httpx.HTTPError:
                raise RecipeImportError("Couldn't reach that website. Try again later.")
        raise RecipeImportError('That link redirects too many times.')


# ---------- 2. Reading schema.org Recipe data ----------

class _PageReader(HTMLParser):
    """Collects JSON-LD blocks and the page's readable text in one pass."""

    SKIP = {'script', 'style', 'noscript', 'svg', 'nav', 'footer', 'header', 'form'}

    def __init__(self):
        super().__init__()
        self.json_blocks = []
        self.text = []
        self._in_json = False
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'script' and dict(attrs).get('type', '').lower() == 'application/ld+json':
            self._in_json = True
            self.json_blocks.append('')
        elif tag in self.SKIP:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag == 'script' and self._in_json:
            self._in_json = False
        elif tag in self.SKIP and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._in_json:
            self.json_blocks[-1] += data
        elif not self._skip_depth and data.strip():
            self.text.append(data.strip())


def read_page(page_html):
    reader = _PageReader()
    reader.feed(page_html)
    return reader


def _nodes(value):
    """Walk every dict inside JSON-LD (it can nest lists and @graph)."""
    if isinstance(value, list):
        for item in value:
            yield from _nodes(item)
    elif isinstance(value, dict):
        yield value
        for key in ('@graph', 'mainEntity', 'itemListElement'):
            if key in value:
                yield from _nodes(value[key])


def _is_recipe(node):
    kind = node.get('@type')
    kinds = kind if isinstance(kind, list) else [kind]
    return 'Recipe' in kinds


def clean(text):
    """Plain text from a JSON-LD string: no tags, entities decoded, spaces collapsed."""
    text = re.sub(r'<[^>]+>', ' ', str(text))
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def _steps(instructions):
    """recipeInstructions can be text, a list of text, HowToSteps, or HowToSections."""
    if isinstance(instructions, str):
        lines = re.split(r'\n+|(?<=\.)\s+(?=\d+\.\s)', instructions)
        return [clean(line) for line in lines if clean(line)]
    steps = []
    for item in instructions if isinstance(instructions, list) else [instructions]:
        if isinstance(item, str):
            steps.append(clean(item))
        elif isinstance(item, dict):
            if 'itemListElement' in item:      # a HowToSection groups more steps
                steps.extend(_steps(item['itemListElement']))
            elif item.get('text') or item.get('name'):
                steps.append(clean(item.get('text') or item.get('name')))
    return [s for s in steps if s]


def _servings(value):
    """recipeYield can be 12, "12", "Makes 24 cookies", or a list of those."""
    for item in value if isinstance(value, list) else [value]:
        match = re.search(r'\d+', str(item))
        if match and 1 <= int(match.group()) <= 1000:
            return int(match.group())
    return None


def guess_category(*texts):
    words = ' '.join(t for t in texts if t).lower()
    for category, keys in CATEGORY_WORDS.items():
        if any(re.search(r'\b' + re.escape(k), words) for k in keys):
            return category
    return 'other'


def recipe_from_jsonld(node):
    """Our recipe fields from a schema.org Recipe node."""
    category_text = node.get('recipeCategory')
    if isinstance(category_text, list):
        category_text = ' '.join(map(str, category_text))
    title = clean(node.get('name', ''))
    return {
        'title': title,
        'ingredients': [clean(i) for i in node.get('recipeIngredient') or node.get('ingredients') or [] if clean(i)],
        'steps': _steps(node.get('recipeInstructions') or []),
        'servings': _servings(node.get('recipeYield')),
        'category': guess_category(clean(category_text or ''), title),
    }


def find_recipe(page_html):
    """The first schema.org Recipe on the page with ingredients and steps, else None."""
    for block in read_page(page_html).json_blocks:
        try:
            data = json.loads(block)
        except ValueError:
            continue  # some sites put broken JSON-LD on the page; skip it
        for node in _nodes(data):
            if _is_recipe(node):
                recipe = recipe_from_jsonld(node)
                if recipe['title'] and recipe['ingredients'] and recipe['steps']:
                    return recipe
    return None


# ---------- 3. Text for the AI fallback ----------

def page_text(page_html, limit=15000):
    return '\n'.join(read_page(page_html).text)[:limit]
