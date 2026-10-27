from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from conversions import convert
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

import anthropic
import math
import os
from datetime import timedelta
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
                  storage_uri=os.getenv('RATELIMIT_STORAGE_URI', 'memory://'))

class Recipe (db.Model):
    id = db.Column(db.Integer, primary_key = True)
    title = db.Column(db.String(100), nullable = False)
    ingredients = db.Column(db.Text, nullable = False)
    steps = db.Column(db.Text, nullable = False)
    notes = db.Column(db.Text)
    servings = db.Column(db.Integer, nullable = False, default = 1)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable = False, index = True)
    category = db.Column(db.String(50), nullable=True)


class User(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(80), unique = True, nullable = False)
    email = db.Column(db.String(120), unique = True, nullable = False)
    password = db.Column(db.String(200), nullable = False)

with app.app_context():
    db.create_all()
    # create_all doesn't add indexes to tables that already exist
    db.session.execute(text('CREATE INDEX IF NOT EXISTS ix_recipe_user_id ON recipe (user_id)'))
    db.session.commit()

RECIPE_REQUIRED_FIELDS = ('title', 'ingredients', 'steps', 'servings')
RECIPE_TEXT_FIELDS = ('title', 'ingredients', 'steps', 'notes', 'category')
# Match the column sizes so Postgres never rejects a save with a 500
RECIPE_MAX_LENGTHS = {'title': 100, 'ingredients': 10000, 'steps': 20000, 'notes': 200, 'category': 50}
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

    fields['servings'] = parse_servings(data['servings'])
    if fields['servings'] is None:
        return None, f'Servings must be a whole number from 1 to {MAX_SERVINGS}'
    return fields, None

def recipe_to_dict(r):
    return {
        'id': r.id,
        'title': r.title,
        'ingredients': r.ingredients,
        'steps': r.steps,
        'notes': r.notes,
        'servings': r.servings,
        'category': r.category,
    }

@app.route('/ping')
@limiter.exempt
def ping():
    return {"message": "Whisk backend is running!"}

@app.route('/recipes', methods = ['GET'])
@jwt_required()
def get_recipes():
    user_id = get_jwt_identity()
    recipes = Recipe.query.filter_by(user_id = user_id).all()
    return jsonify([recipe_to_dict(r) for r in recipes])

@app.route('/recipes/<int:id>', methods=['GET'])
@jwt_required()
def get_recipe(id):
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id=id, user_id=user_id).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    return jsonify(recipe_to_dict(recipe))

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
    return jsonify({'message': 'Recipe saved!'}), 201

@app.route('/recipes/<int:id>', methods = ['DELETE'])
@jwt_required()
def delete_recipe(id):
    user_id = get_jwt_identity()
    recipe = Recipe.query.filter_by(id = id, user_id = user_id).first()
    if not recipe:
        return jsonify ({'error': 'Recipe not found'}), 404 
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe deleted!'}), 202

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

@app.route('/chat', methods=['POST'])
@limiter.limit("20 per hour")
@jwt_required()
def chat():
    data = request.get_json() or {}
    user_message = (data.get('message') or '').strip()
    if not user_message or len(user_message) > 1000:
        return jsonify({'error': 'Message must be 1 to 1000 characters'}), 400

    # Use the saved recipes from the database, not whatever the client sends
    user_id = get_jwt_identity()
    recipes = Recipe.query.filter_by(user_id=user_id).limit(10).all()
    recipe_context = "\n".join([
        f"- {r.title} ({r.servings} servings): {r.ingredients[:300]}"
        for r in recipes
    ])

    try:
        client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        response = client.messages.create(
            model="claude-haiku-5-5",
            max_tokens=600,
            system=f"""You are a helpful baking assistant.
            The user has these recipes saved: {recipe_context}
            Help them with baking questions, troubleshooting, and suggestions.""",
            messages=[{"role": "user", "content": user_message}]
        )
        return jsonify({'response': response.content[0].text})
    except Exception:
        app.logger.exception('Claude API call failed')
        return jsonify({'error': 'The baking assistant is unavailable right now. Please try again later.'}), 503
    

@app.route ('/signup', methods = ['POST'])
@limiter.limit("10 per hour")
def signup():
    data = request.get_json(silent=True) or {}

    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'All fields are required'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400

    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8') 

    user = User(
        username = data['username'],
        email = data['email'],
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