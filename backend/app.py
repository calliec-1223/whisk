from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from conversions import convert
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

import anthropic
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', 'http://localhost:3000')
CORS(app, resources={r"/*": {"origins": [FRONTEND_ORIGIN], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

db_url = os.getenv('DATABASE_URL', 'sqlite:///whisk.db')
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True}
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
if not app.config['JWT_SECRET_KEY']:
    raise RuntimeError('JWT_SECRET_KEY is not set')

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
limiter = Limiter(get_remote_address, app=app,
                  default_limits=["2000 per day", "300 per hour"],
                  storage_uri="memory://")

class Recipe (db.Model):
    id = db.Column(db.Integer, primary_key = True)
    title = db.Column(db.String(100), nullable = False)
    ingredients = db.Column(db.Text, nullable = False)
    steps = db.Column(db.Text, nullable = False)
    notes = db.Column(db.Text)
    servings = db.Column(db.Integer, nullable = False, default = 1)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable = False)
    category = db.Column(db.String(50), nullable=True)


class User(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(80), unique = True, nullable = False)
    email = db.Column(db.String(120), unique = True, nullable = False)
    password = db.Column(db.String(200), nullable = False)

with app.app_context():
    db.create_all()

@app.route('/ping')
@limiter.exempt
def ping():
    return {"message": "Whisk backend is running!"}

@app.route('/recipes', methods = ['GET'])
@jwt_required()
def get_recipes():
    user_id = get_jwt_identity()
    recipes = Recipe.query.filter_by(user_id = user_id).all()
    return jsonify([{
        'id': r.id,
        'title': r.title,
        'ingredients': r.ingredients,
        'steps': r.steps,
        'notes': r.notes,
        'servings': r.servings,
        'category': r.category

    } for r in recipes ])

@app.route('/recipes', methods = ['POST'])
@jwt_required()
def add_recipe():
    user_id = get_jwt_identity()
    data = request.get_json()
    recipe = Recipe(
        title = data['title'],
        ingredients = data ['ingredients'],
        steps = data ['steps'],
        notes = data.get('notes', ''),
        servings = data ['servings'],
        user_id = user_id,
        category = data.get('category', '')

    )
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
    data = request.get_json()
    result = convert(
        data['ingredient'],
        float(data['amount']),
        data['from_unit']
    )
    return jsonify(result)

@app.route('/chat', methods=['POST'])
@limiter.limit("20 per hour")
@jwt_required()
def chat():
    data = request.get_json() or {}
    user_message = (data.get('message') or '').strip()
    if not user_message or len(user_message) > 1000:
        return jsonify({'error': 'Message must be 1 to 1000 characters'}), 400

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
def signup():
    data = request.get_json()

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
def login():
    data = request.get_json()

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
    
    data = request.get_json()
    recipe.title = data['title']
    recipe.ingredients = data['ingredients']
    recipe.steps = data['steps']
    recipe.notes = data.get('notes', '')
    recipe.servings = data['servings']
    
    db.session.commit()
    return jsonify({'message': 'Recipe updated!'}), 200

if __name__ == '__main__':
    app.run(debug=True)