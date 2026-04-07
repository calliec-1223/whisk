from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)

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

if __name__ == '__main__':
    app.run(debug=True)