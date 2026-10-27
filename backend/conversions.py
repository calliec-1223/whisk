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

VOLUME_IN_TEASPOONS = {"teaspoon": 1, "cup": 48}


def convert(ingredient, amount, from_unit):
    if ingredient not in INGREDIENT_DENSITIES:
        return {"error": f"{ingredient} not found"}
    data = INGREDIENT_DENSITIES[ingredient]
    grams_per_unit = data ["grams_per_unit"]
    base_unit = data["unit"]

    if from_unit == "grams":
        result = amount / grams_per_unit
        to_unit = base_unit
    elif from_unit in VOLUME_IN_TEASPOONS:
        # Densities are stored per cup or per teaspoon, so convert volumes first
        in_base_unit = amount * VOLUME_IN_TEASPOONS[from_unit] / VOLUME_IN_TEASPOONS[base_unit]
        result = in_base_unit * grams_per_unit
        to_unit = "grams"
    else:
        return {"error": f"Unknown unit: {from_unit}"}

    return {
        "ingredient": ingredient,
        "amount": round(result, 2),
        "unit": to_unit
    }
