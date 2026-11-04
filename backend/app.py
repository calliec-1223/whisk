from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from conversions import convert
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

import chat_queue
from taskqueue import QueueFull
from assistant import ask_claude, extract_recipe
import recipe_import
import secrets
import math
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)  # real client IP behind Render's proxy

FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', 'http://localhost:3000')
CORS(app, resources={r"/*": {"origins": [FRONTEND_ORIGIN], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

db_url = os.getenv('DATABASE_URL', 'sqlite:///whisk.db')
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True}  # Neon closes idle connections
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
if not app.config['JWT_SECRET_KEY']:
    raise RuntimeError('JWT_SECRET_KEY is not set')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)  # library default is 15 minutes

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
# Generous default for normal browsing; signup, login and chat set stricter limits.
# In-memory counters reset on restart and aren't shared between server processes;
# set RATELIMIT_STORAGE_URI (e.g. a Redis URL) to share them.
limiter = Limiter(get_remote_address, app=app,
                  default_limits=["2000 per day", "300 per hour"],
                  storage_uri=os.getenv('RATELIMIT_STORAGE_URI', 'memory://'),
                  # Local load tests only: RATELIMIT_ENABLED=0 turns limits off.
                  enabled=os.getenv('RATELIMIT_ENABLED', '1') != '0')

class Recipe (db.Model):
    id = db.Column(db.Integer, primary_key = True)
    title = db.Column(db.String(100), nullable = False)
    ingredients = db.Column(db.Text, nullable = False)
    steps = db.Column(db.Text, nullable = False)
    notes = db.Column(db.Text)
    servings = db.Column(db.Integer, nullable = False, default = 1)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable = False, index = True)
    category = db.Column(db.String(50), nullable=True)
    source_url = db.Column(db.String(500), nullable=True)  # where an imported recipe came from


class User(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(80), unique = True, nullable = False)
    email = db.Column(db.String(120), unique = True, nullable = True)  # optional; NULL when not given
    password = db.Column(db.String(200), nullable = False)


class Bake(db.Model):
    """One finished bake of a recipe, with the medal the baker gave it."""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    # Set to NULL if the recipe is deleted, so past bakes still count toward stickers
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=True, index=True)
    category = db.Column(db.String(50), nullable=True)  # copied from the recipe at bake time
    medal = db.Column(db.String(10), nullable=False)
    baked_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class Sticker(db.Model):
    """A sticker the user has earned. Once earned it stays, even if recipes are deleted."""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    key = db.Column(db.String(40), nullable=False)
    earned_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (db.UniqueConstraint('user_id', 'key'),)


class ShareLink(db.Model):
    """A public, read-only link to one recipe. The token is the only secret:
    random and unguessable, and deleting the row turns the link off."""
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    token = db.Column(db.String(32), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

with app.app_context():
    db.create_all()
    # create_all doesn't add indexes to tables that already exist
    db.session.execute(text('CREATE INDEX IF NOT EXISTS ix_recipe_user_id ON recipe (user_id)'))
    # Email became optional. create_all doesn't change existing tables, so drop
    # the old NOT NULL rule on Postgres (safe to run every startup). SQLite can't
    # alter columns: an old local whisk.db needs to be recreated.
    if db.engine.dialect.name == 'postgresql':
        db.session.execute(text('ALTER TABLE "user" ALTER COLUMN email DROP NOT NULL'))
    # create_all doesn't add new columns to existing tables either, so add any
    # that are missing. Works on SQLite and Postgres; does nothing once added.
    recipe_columns = {c['name'] for c in inspect(db.engine).get_columns('recipe')}
    if 'source_url' not in recipe_columns:
        db.session.execute(text('ALTER TABLE recipe ADD COLUMN source_url VARCHAR(500)'))
    db.session.commit()

RECIPE_REQUIRED_FIELDS = ('title', 'ingredients', 'steps', 'servings')
RECIPE_TEXT_FIELDS = ('title', 'ingredients', 'steps', 'notes', 'category', 'source_url')
# Match the column sizes so Postgres never rejects a save with a 500
RECIPE_MAX_LENGTHS = {'title': 100, 'ingredients': 10000, 'steps': 20000, 'notes': 200, 'category': 50,
                      'source_url': 500}
MAX_SERVINGS = 1000

def is_blank(value):
    return value is None or (isinstance(value, str) and not value.strip())

def parse_servings(value):
    if isinstance(value, bool):
        return None
    try:
        servings = int(str(value).strip())
    except ValueError:
        return None
    return servings if 1 <= servings <= MAX_SERVINGS else None

def validate_recipe(data):
    """Return (fields, None) if the recipe is valid, else (None, error message)."""
    missing = [f for f in RECIPE_REQUIRED_FIELDS if is_blank(data.get(f))]
    if missing:
        return None, f"Missing required fields: {', '.join(missing)}"

    fields = {}
    for name in RECIPE_TEXT_FIELDS:
        value = data.get(name) or ''
        if not isinstance(value, str):
            return None, f'{name.capitalize()} must be text'
        if len(value) > RECIPE_MAX_LENGTHS[name]:
            return None, f'{name.capitalize()} must be {RECIPE_MAX_LENGTHS[name]} characters or fewer'
        fields[name] = value

    if fields['source_url'] and not fields['source_url'].startswith(('http://', 'https://')):
        return None, 'Source must be a web address'
    fields['source_url'] = fields['source_url'] or None

    fields['servings'] = parse_servings(data['servings'])
    if fields['servings'] is None:
        return None, f'Servings must be a whole number from 1 to {MAX_SERVINGS}'
    return fields, None

MEDALS = ('bronze', 'silver', 'gold')  # worst to best

# Sticker catalog, in the order the sticker book shows them.
STICKERS = [
    ('first-recipe', 'First recipe', 'Save your first recipe'),
    ('recipe-5', 'Recipe collector', 'Save 5 recipes'),
    ('recipe-10', 'Full cookbook', 'Save 10 recipes'),
    ('first-bake', 'First bake', 'Finish a recipe in cooking mode'),
    ('bake-10', 'Busy baker', 'Finish 10 bakes'),
    ('first-gold', 'Gold medal', 'Give a bake a gold medal'),
    ('gold-3', 'Triple gold', 'Earn 3 gold medals'),
    ('variety', 'Variety baker', 'Bake from 4 different categories'),
    ('shopping-list', 'Ready to shop', 'Tick off a whole shopping list'),
    ('spinner', 'Let the wheel decide', 'Spin the "What should I bake?" wheel'),
]
STICKER_KEYS = {key for key, _, _ in STICKERS}
# Stickers for things that only happen in the browser, so the app claims them itself
CLAIMABLE_STICKERS = {'shopping-list', 'spinner'}


def award_stickers(user_id, extra_keys=()):
    """Give the user any stickers they now qualify for. Returns the newly earned keys."""
    recipe_count = Recipe.query.filter_by(user_id=user_id).count()
    bakes = Bake.query.filter_by(user_id=user_id).all()
    golds = sum(1 for b in bakes if b.medal == 'gold')
    categories = {b.category for b in bakes if b.category}

    qualifies = {
        'first-recipe': recipe_count >= 1,
        'recipe-5': recipe_count >= 5,
        'recipe-10': recipe_count >= 10,
        'first-bake': len(bakes) >= 1,
        'bake-10': len(bakes) >= 10,
        'first-gold': golds >= 1,
        'gold-3': golds >= 3,
        'variety': len(categories) >= 4,
    }
    wanted = {k for k, ok in qualifies.items() if ok} | set(extra_keys)
    have = {s.key for s in Sticker.query.filter_by(user_id=user_id).all()}
    new = [key for key, _, _ in STICKERS if key in wanted and key not in have]
    for key in new:
        db.session.add(Sticker(user_id=user_id, key=key))
    db.session.commit()
    return new


def as_utc(dt):
    """Databases hand back naive datetimes; ours are always stored in UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def bake_stats(user_id):
    """{recipe_id: {'bake_count': n, 'best_medal': 'gold' | ...}} for the user's recipes."""
    stats = {}
    for b in Bake.query.filter_by(user_id=user_id).filter(Bake.recipe_id.isnot(None)).all():
        s = stats.setdefault(b.recipe_id, {'bake_count': 0, 'best_medal': None})
        s['bake_count'] += 1
        if s['best_medal'] is None or MEDALS.index(b.medal) > MEDALS.index(s['best_medal']):
            s['best_medal'] = b.medal
    return stats


def recipe_to_dict(r):
    return {
        'id': r.id,
        'title': r.title,
        'ingredients': r.ingredients,
        'steps': r.steps,
        'notes': r.notes,
        'servings': r.servings,
        'category': r.category,
        'source_url': r.source_url,
    }


def recipe_with_stats(r, stats):
    d = recipe_to_dict(r)
    d.update(stats.get(r.id, {'bake_count': 0, 'best_medal': None}))
    return d

@app.route('/ping')
@limiter.exempt
def ping():
    return {"message": "Whisk backend is running!"}

@app.route('/recipes', methods = ['GET'])
@jwt_required()
def get_recipes():
    user_id = get_jwt_identity()
    recipes = Recipe.query.filter_by(user_id = user_id).all()
    stats = bake_stats(user_id)
    shares = {s.recipe_id: s.token for s in ShareLink.query.filter_by(user_id=user_id).all()}
    return jsonify([{**recipe_with_stats(r, stats), 'share_token': shares.get(r.id)} for r in recipes])

@app.route('/recipes/<int:id>', methods=['GET'])
@jwt_required()
def get_recipe(id):
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id=id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    link = ShareLink.query.filter_by(recipe_id=recipe.id).first()
    return jsonify({**recipe_with_stats(recipe, bake_stats(user_id)), 'share_token': link.token if link else None})

@app.route('/recipes', methods = ['POST'])
@jwt_required()
def add_recipe():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    fields, error = validate_recipe(data)
    if error:
        return jsonify({'error': error}), 400
    recipe = Recipe(user_id=user_id, **fields)
    db.session.add(recipe)
    db.session.commit()
    new_stickers = award_stickers(user_id)
    return jsonify({'message': 'Recipe saved!', 'new_stickers': new_stickers}), 201

@app.route('/recipes/<int:id>', methods = ['DELETE'])
@jwt_required()
def delete_recipe(id):
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id = id, user_id = user_id).first()
    if not recipe:
        return jsonify ({'error': 'Recipe not found'}), 404 
    Bake.query.filter_by(recipe_id=recipe.id).update({'recipe_id': None})
    ShareLink.query.filter_by(recipe_id=recipe.id).delete()
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe deleted!'}), 202

@app.route('/recipes/<int:id>/bakes', methods=['POST'])
@jwt_required()
def add_bake(id):
    """Record a finished bake with the medal the baker picked."""
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id=id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    medal = (request.get_json(silent=True) or {}).get('medal')
    if medal not in MEDALS:
        return jsonify({'error': 'Medal must be bronze, silver or gold'}), 400
    db.session.add(Bake(user_id=user_id, recipe_id=recipe.id, category=recipe.category, medal=medal))
    db.session.commit()
    new_stickers = award_stickers(user_id)
    stats = bake_stats(user_id).get(recipe.id)
    return jsonify({**stats, 'new_stickers': new_stickers}), 201

@app.route('/stickers', methods=['GET'])
@jwt_required()
def get_stickers():
    user_id = get_jwt_identity()
    earned = {s.key: s.earned_at for s in Sticker.query.filter_by(user_id=user_id).all()}
    return jsonify([
        {'key': key, 'name': name, 'how': how,
         'earned_at': as_utc(earned[key]).isoformat() if key in earned else None}
        for key, name, how in STICKERS
    ])

@app.route('/stickers/claim', methods=['POST'])
@jwt_required()
def claim_sticker():
    """Claim a sticker for something that happens only in the browser."""
    user_id = get_jwt_identity()
    key = (request.get_json(silent=True) or {}).get('key')
    if key not in CLAIMABLE_STICKERS:
        return jsonify({'error': 'That sticker can\'t be claimed'}), 400
    return jsonify({'new_stickers': award_stickers(user_id, extra_keys=[key])})

@app.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Who's logged in (the recipe box is titled with their name)."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'username': user.username})


# ---------- Importing a recipe from a website ----------

@app.route('/recipes/import', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required()
def import_recipe():
    """Read a recipe from a web page so the user can check it and save it.
    Nothing is saved here."""
    url = ((request.get_json(silent=True) or {}).get('url') or '')
    if not isinstance(url, str) or not url.strip() or len(url) > 500:
        return jsonify({'error': 'Paste the full link to a recipe page'}), 400
    url = url.strip()
    try:
        page = recipe_import.fetch_page(url)
    except recipe_import.RecipeImportError as e:
        return jsonify({'error': str(e)}), 400

    recipe, method = recipe_import.find_recipe(page), 'structured'
    if recipe is None:
        # No schema.org Recipe data on the page: ask Claude to read the text
        try:
            recipe, method = extract_recipe(recipe_import.page_text(page)), 'ai'
        except Exception:
            app.logger.exception('AI recipe extraction failed')
            recipe = None
    if recipe is None:
        return jsonify({'error': "Couldn't find a recipe on that page. Try another link."}), 422

    return jsonify({
        'title': recipe['title'][:RECIPE_MAX_LENGTHS['title']],
        'ingredients': [line[:300] for line in recipe['ingredients']][:100],
        'steps': [line[:2000] for line in recipe['steps']][:60],
        'servings': recipe['servings'],
        'category': recipe['category'],
        'source_url': url,
        'method': method,
    })


# ---------- Share links ----------

@app.route('/recipes/<int:id>/share', methods=['POST'])
@jwt_required()
def share_recipe(id):
    """Turn on the recipe's share link (or return the one it already has)."""
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id=id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    link = ShareLink.query.filter_by(recipe_id=recipe.id).first()
    if not link:
        link = ShareLink(recipe_id=recipe.id, user_id=user_id, token=secrets.token_urlsafe(16))
        db.session.add(link)
        db.session.commit()
    return jsonify({'token': link.token}), 201


@app.route('/recipes/<int:id>/share', methods=['DELETE'])
@jwt_required()
def unshare_recipe(id):
    """Turn the share link off. Anyone who has it gets "not found" from now on."""
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id=id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    ShareLink.query.filter_by(recipe_id=recipe.id).delete()
    db.session.commit()
    return jsonify({'message': 'Link turned off'}), 200


def shared_recipe_or_404(token):
    link = ShareLink.query.filter_by(token=token).first()
    return db.session.get(Recipe, link.recipe_id) if link else None


@app.route('/shared/<token>', methods=['GET'])
@limiter.limit("120 per hour")
def view_shared(token):
    """A shared recipe, for anyone with the link (no login needed).
    Only the recipe and its owner's username are shown: no ids, no other recipes."""
    recipe = shared_recipe_or_404(token)
    if not recipe:
        return jsonify({'error': 'This link is turned off or never existed'}), 404
    owner = db.session.get(User, recipe.user_id)
    d = recipe_to_dict(recipe)
    d.pop('id')
    return jsonify({**d, 'shared_by': owner.username})


@app.route('/shared/<token>/save', methods=['POST'])
@jwt_required()
def save_shared(token):
    """Copy a shared recipe into the logged-in user's own recipe box."""
    user_id = get_jwt_identity()
    recipe = shared_recipe_or_404(token)
    if not recipe:
        return jsonify({'error': 'This link is turned off or never existed'}), 404
    copy = Recipe(user_id=user_id, title=recipe.title, ingredients=recipe.ingredients, steps=recipe.steps,
                  notes=recipe.notes, servings=recipe.servings, category=recipe.category,
                  source_url=recipe.source_url)
    db.session.add(copy)
    db.session.commit()
    return jsonify({'id': copy.id, 'new_stickers': award_stickers(user_id)}), 201


@app.route('/convert', methods = ['POST'])
def convert_ingredient():
    data = request.get_json(silent=True) or {}
    ingredient = data.get('ingredient')
    from_unit = data.get('from_unit')
    if is_blank(ingredient) or is_blank(from_unit) or is_blank(data.get('amount')):
        return jsonify({'error': 'Ingredient, amount and unit are required'}), 400
    if not isinstance(ingredient, str) or not isinstance(from_unit, str):
        return jsonify({'error': 'Ingredient and unit must be text'}), 400
    try:
        amount = float(data['amount'])
    except (TypeError, ValueError):
        return jsonify({'error': 'Amount must be a number'}), 400
    if not math.isfinite(amount) or amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    result = convert(ingredient.strip().lower(), amount, from_unit)
    return jsonify(result), (400 if 'error' in result else 200)

# "queue" (default): /chat enqueues the question and returns at once; a worker
# (worker.py) asks Claude and the browser polls GET /chat/<job_id>.
# "sync": the original behavior, kept for before/after benchmarks and as a fallback.
CHAT_MODE = os.getenv('CHAT_MODE', 'queue')


def recipe_context_for(user_id):
    # Use the saved recipes from the database, not whatever the client sends
    recipes = Recipe.query.filter_by(user_id=user_id).limit(10).all()
    return "\n".join([
        f"- {r.title} ({r.servings} servings): {r.ingredients[:300]}"
        for r in recipes
    ])


@app.route('/chat', methods=['POST'])
@limiter.limit("20 per hour")
@jwt_required()
def chat():
    data = request.get_json() or {}
    user_message = (data.get('message') or '').strip()
    if not user_message or len(user_message) > 1000:
        return jsonify({'error': 'Message must be 1 to 1000 characters'}), 400

    user_id = get_jwt_identity()
    recipe_context = recipe_context_for(user_id)

    if CHAT_MODE == 'sync':
        try:
            return jsonify({'response': ask_claude(user_message, recipe_context)})
        except Exception:
            app.logger.exception('Claude API call failed')
            return jsonify({'error': 'The baking assistant is unavailable right now. Please try again later.'}), 503

    # Optional per-message id from the browser, used to ignore duplicate submissions.
    request_id = data.get('request_id')
    if request_id is not None and (not isinstance(request_id, str) or not 1 <= len(request_id) <= 100):
        return jsonify({'error': 'Invalid request_id'}), 400

    try:
        job_id = chat_queue.submit(user_id, user_message, recipe_context, request_id)
    except QueueFull:
        # Too many questions waiting: say so now instead of queueing one that
        # might not be answered for a long time.
        return jsonify({'error': 'The baking assistant is busy right now. Please try again in a minute.'}), 503
    except Exception:
        app.logger.exception('Could not enqueue chat job')
        return jsonify({'error': 'The baking assistant is unavailable right now. Please try again later.'}), 503
    # 202 Accepted: the question is queued; poll GET /chat/<job_id> for the answer.
    return jsonify({'job_id': job_id}), 202


@app.route('/chat/<job_id>', methods=['GET'])
@limiter.limit("1200 per hour")  # the browser checks about once a second while waiting
@jwt_required()
def chat_result(job_id):
    try:
        job = chat_queue.lookup(job_id)
    except Exception:
        app.logger.exception('Could not read chat job')
        return jsonify({'error': 'The baking assistant is unavailable right now. Please try again later.'}), 503

    if job is None:  # not in history yet: just enqueued
        return jsonify({'status': 'pending'})
    # Only the user who asked may read the answer. 404, not 403, so job ids
    # belonging to other users don't even confirm they exist.
    if job['payload'].get('user_id') != str(get_jwt_identity()):
        return jsonify({'error': 'Not found'}), 404
    if job['status'] == 'done':
        return jsonify({'status': 'done', 'response': job['result']})
    if job['status'] == 'dead':  # failed every retry
        return jsonify({'status': 'error',
                        'error': 'The baking assistant is unavailable right now. Please try again later.'})
    return jsonify({'status': 'pending'})  # waiting, running, or retrying


@app.route ('/signup', methods = ['POST'])
@limiter.limit("10 per hour")
def signup():
    data = request.get_json(silent=True) or {}

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400

    # Email is optional. A blank one is stored as NULL, not "", so several
    # users without an email don't collide on the unique rule.
    email = data.get('email')
    if email is not None and not isinstance(email, str):
        return jsonify({'error': 'Email must be text'}), 400
    email = (email or '').strip() or None
    if email is not None and ('@' not in email or len(email) > 120):
        return jsonify({'error': 'Please enter a valid email or leave it blank'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    if email is not None and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8') 

    user = User(
        username = data['username'],
        email = email,
        password = hashed_password
    )     
    db.session.add(user)
    db.session.commit() 
    return jsonify ({'message': 'Account created!'}), 201   


@app.route('/login', methods = ['POST'])     
@limiter.limit("30 per hour")
def login():
    data = request.get_json(silent=True) or {}
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400

    user = User.query.filter_by(username = data['username']).first()
    if not user or not bcrypt.check_password_hash(user.password,data['password']):
        return jsonify ({'error': 'Invalid username or password'}), 401
    
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token}), 200

@app.route('/recipes/<int:id>', methods=['PUT'])
@jwt_required()
def update_recipe(id):
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id=id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    data = request.get_json(silent=True) or {}
    fields, error = validate_recipe(data)
    if error:
        return jsonify({'error': error}), 400
    for name, value in fields.items():
        setattr(recipe, name, value)

    db.session.commit()
    return jsonify({'message': 'Recipe updated!'}), 200

if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_DEBUG') == '1')