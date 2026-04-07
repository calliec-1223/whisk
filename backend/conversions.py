INGREDIENT_DENSITIES = {
    "flour": {
        "unit": "cup", 
        "grams_per_unit": 120
    },
    "sugar": {
        "unit": "cup", 
        "grams_per_unit": 200
    },
    "butter": {
        "unit": "cup", 
        "grams_per_unit": 227
    },
    "brown sugar": {
        "unit": "cup", 
        "grams_per_unit": 220
    },
    "powdered sugar": {
        "unit": "cup", 
        "grams_per_unit": 120
    },
    "cocoa powder": {
        "unit": "cup", 
        "grams_per_unit": 100
    },    
    "oats": {
        "unit": "cup", 
        "grams_per_unit": 90
    },
    "milk": {
        "unit": "cup", 
        "grams_per_unit": 240
    },
    "water": {
        "unit": "cup", 
        "grams_per_unit": 240
    },
    "oil": {
        "unit": "cup", 
        "grams_per_unit": 216
    },
    "cornstarch": {
        "unit": "cup", 
        "grams_per_unit": 120
    },
    "salt": {
        "unit": "teaspoon", 
        "grams_per_unit": 6
    },
    "baking powder": {
        "unit": "teaspoon", 
        "grams_per_unit": 4
    },
    "baking soda": {
        "unit": "teaspoon", 
        "grams_per_unit": 6
    },
    "yeast": {
        "unit": "teaspoon", 
        "grams_per_unit": 3
    },
    "vanilla extract": {
        "unit": "teaspoon", 
        "grams_per_unit": 4
    },
    "cinnamon": {
        "unit": "teaspoon", 
        "grams_per_unit": 3
    },
    "honey": {
        "unit": "cup",
        "grams_per_unit": 340
    }
}

def convert(ingredient, amount, from_unit):
    if ingredient not in INGREDIENT_DENSITIES:
        return {"error": f"{ingredient} not found"}
    data = INGREDIENT_DENSITIES[ingredient]
    grams_per_unit = data ["grams_per_unit"]

    if from_unit == "grams":
        result = amount / grams_per_unit
        to_unit = data ["unit"]
    else:
        result = amount * grams_per_unit
        to_unit = "grams"
    
    return {
        "ingredient": ingredient,
        "amount": round(result, 2),
        "unit": to_unit
    }
