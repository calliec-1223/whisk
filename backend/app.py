from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from conversions import convert

import anthropic
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app, methods = ["GET", "POST", "DELETE"])

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///whisk.db'
db = SQLAlchemy (app)

class Recipe (db.Model):
    id = db.Column(db.Integer, primary_key = True)
    title = db.Column(db.String(100), nullable = False)
    ingredients = db.Column(db.Text, nullable = False)
    steps = db.Column(db.Text, nullable = False)
    notes = db.Column(db.String(200))
    servings = db.Column(db.Integer, nullable = False, default = 1)

with app.app_context():
    db.create_all()

@app.route('/ping')
def ping():
    return {"message": "Whisk backend is running!"}

@app.route('/recipes', methods = ['GET'])
def get_recipes():
    recipes = Recipe.query.all()
    return jsonify([{
        'id': r.id,
        'title': r.title,
        'ingredients': r.ingredients,
        'steps': r.steps,
        'notes': r.notes,
        'servings': r.servings
    } for r in recipes ])

@app.route('/recipes', methods = ['POST'])
def add_recipe():
    data = request.get_json()
    recipe = Recipe(
        title = data['title'],
        ingredients = data ['ingredients'],
        steps = data ['steps'],
        notes = data.get('notes', ''),
        servings = data ['servings']
    )
    db.session.add(recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe saved!'}), 201

@app.route('/recipes/<int:id>', methods = ['DELETE'])
def delete_recipe(id):
    recipe = Recipe.query.get(id) 
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

@app.route('/chat', methods = ['POST'])
def chat():
    data = request.get_json()
    user_message = data['message']
    recipes = data.get('recipes', [])

    recipe_context = "\n".join([
        f"- {r['title']} ({r['servings']} servings): {r['ingredients']}"
        for r in recipes
    ])

    client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    response = client.messages.create(
        model = "claude-sonnet-4-20250514",
        max_tokens=1024,
        system= f"""You are a helpful baking assistant.
        The user has these recipes saved: {recipe_context}
        Help them with baking questions, troubleshooting, and suggestions.""",
        messages = [{"role": "user", "content": user_message}]
    )
    return jsonify({'response': response.content[0].text})

if __name__ == '__main__':
    app.run(debug=True)