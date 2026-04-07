from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from conversions import convert

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
    } for r in recipes ])

@app.route('/recipes', methods = ['POST'])
def add_recipe():
    data = request.get_json()
    recipe = Recipe(
        title = data['title'],
        ingredients = data ['ingredients'],
        steps = data ['steps'],
        notes = data.get('notes', '')
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

if __name__ == '__main__':
    app.run(debug=True)