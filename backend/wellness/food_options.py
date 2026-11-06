
"""Illustrative meal options, not medical or condition-specific advice.

Allergen completeness refers only to each recipe's explicit ingredient list,
never a product certification or a manufacturing/preparation cross-contact claim.
Cost inputs below are invented demonstration assumptions, not surveyed prices.
Every generated estimate includes the quantities and unit prices used, so callers
can audit its ingredient-only boundaries without treating them as market quotes.
"""
from decimal import Decimal, ROUND_HALF_UP

STAGES = (
    "pregnancy_t1",
    "pregnancy_t2",
    "pregnancy_t3",
    "postpartum_early",
    "postpartum_six_week",
    "postpartum_long",
)

RECIPES = [
    {
        "key": "rice-moong",
        "title": "Rice and moong dal",
        "ingredients": ["rice", "moong dal", "water", "salt"],
        "allergens": [],
        "taste_tags": ["vegetarian", "vegan"],
        "meal_types": ["lunch", "dinner"],
        "affordability": "low",
    },
    {
        "key": "vegetable-poha",
        "title": "Vegetable poha",
        "ingredients": [
            "flattened rice", "carrot", "peas", "oil", "water", "salt"
        ],
        "allergens": [],
        "taste_tags": ["vegetarian", "vegan"],
        "meal_types": ["breakfast", "snack"],
        "affordability": "low",
    },
    {
        "key": "curd-rice",
        "title": "Curd rice",
        "ingredients": ["rice", "curd (milk)", "water", "salt"],
        "allergens": ["milk"],
        "taste_tags": ["vegetarian"],
        "meal_types": ["lunch", "dinner"],
        "affordability": "low",
    },
    {
        "key": "banana-peanut",
        "title": "Banana with peanuts",
        "ingredients": ["banana", "roasted peanuts"],
        "allergens": ["peanut"],
        "taste_tags": ["vegetarian", "vegan"],
        "meal_types": ["snack"],
        "affordability": "low",
    },
    {
        "key": "paneer-rice",
        "title": "Paneer and vegetable rice",
        "ingredients": [
            "rice", "paneer (milk)", "carrot", "peas", "oil", "salt"
        ],
        "allergens": ["milk"],
        "taste_tags": ["vegetarian"],
        "meal_types": ["lunch", "dinner"],
        "affordability": "medium",
    },
]


# Invented INR/kg ranges, deliberately not a price survey or current quotation.
# All ingredient masses are grams; using one mass unit keeps the arithmetic
# explicit even for oil/water (no undocumented volume/density conversion).
UNIT_PRICE_ASSUMPTIONS = {
    "rice": (40, 80),
    "moong dal": (100, 180),
    "water": (0, 5),
    "salt": (15, 30),
    "flattened rice": (50, 100),
    "carrot": (20, 80),
    "peas": (60, 160),
    "oil": (100, 200),
    "curd (milk)": (60, 120),
    "banana": (30, 80),
    "roasted peanuts": (100, 220),
    "paneer (milk)": (250, 450),
}

# One illustrative serving, not a recommended portion or a nutritional target.
# Keys exactly match the explicit recipe ingredients; no implicit garnishes.
SERVING_QUANTITIES_G = {
    "rice-moong": {"rice": 60, "moong dal": 30, "water": 250, "salt": 0.5},
    "vegetable-poha": {
        "flattened rice": 60, "carrot": 40, "peas": 30,
        "oil": 5, "water": 60, "salt": 0.5,
    },
    "curd-rice": {"rice": 60, "curd (milk)": 100, "water": 180, "salt": 0.5},
    "banana-peanut": {"banana": 100, "roasted peanuts": 20},
    "paneer-rice": {
        "rice": 60, "paneer (milk)": 60, "carrot": 40,
        "peas": 30, "oil": 5, "salt": 0.5,
    },
}


def _affordability_estimate(recipe):
    ingredients = []
    totals = {"min": Decimal("0"), "max": Decimal("0")}
    for ingredient in recipe["ingredients"]:
        quantity = SERVING_QUANTITIES_G[recipe["key"]][ingredient]
        low, high = UNIT_PRICE_ASSUMPTIONS[ingredient]
        ingredients.append({
            "ingredient": ingredient,
            "quantity_g": quantity,
            "unit_price_basis": "INR per kg",
            "unit_price_min": low,
            "unit_price_max": high,
        })
        for bound, price in (("min", low), ("max", high)):
            totals[bound] += Decimal(str(quantity)) * Decimal(str(price)) / Decimal("1000")
    return {
        "currency": "INR",
        "basis": "ingredient cost per illustrative serving",
        "servings": 1,
        "is_illustrative": True,
        "min": float(totals["min"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "max": float(totals["max"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "ingredients": ingredients,
        "assumptions": [
            "Invented unit-price ranges for illustration: not surveyed and not a quote; local prices vary.",
            "Quantities are raw/dry ingredient masses, or edible ready-to-use masses for banana, curd, paneer and roasted peanuts.",
            "One illustrative serving only, not a recommended portion; no unlisted garnishes or substitutions included.",
            "Ingredient-only cost excludes fuel, labour, delivery, packaging and preparation losses.",
            "Boundary = sum(quantity_g / 1000 * unit_price); totals rounded to two INR decimals, half up.",
            "Legacy low/medium affordability labels are illustrative categories, not surveyed price thresholds.",
        ],
    }


def build_food_options():
    options = []
    for recipe in RECIPES:
        for stage in STAGES:
            options.append({
                "id": "food-" + recipe["key"] + "-" + stage,
                "type": "diet",
                "stage": stage,
                "region": "general",
                "title": recipe["title"],
                "body": (
                    "Example meal idea. Ingredients: "
                    + ", ".join(recipe["ingredients"])
                    + ". Affordability is an illustrative estimate; "
                    "local prices and portions vary."
                ),
                "ingredients": list(recipe["ingredients"]),
                "allergens": list(recipe["allergens"]),
                # Complete only for this explicitly listed illustrative recipe.
                "allergen_list_complete": True,
                "taste_tags": list(recipe["taste_tags"]),
                "meal_types": list(recipe["meal_types"]),
                "affordability": recipe["affordability"],
                "affordability_estimate": _affordability_estimate(recipe),
                "condition_tags": [],
                "limit_notes": (
                    "Illustrative meal idea, not an individual medical diet. "
                    "Allergen completeness covers listed ingredients only; "
                    "not certified for manufacturing or preparation cross-contact. "
                    "Follow any dietary restrictions given by your clinician."
                ),
                "nutrients": None,
                "avoid_notes": (
                    "Check ingredient labels and preparation for allergens. "
                    "Follow any individual dietary instructions from your clinician."
                ),
                "source_citation": (
                    "Illustrative recipe data; not a clinical guideline."
                ),
                "is_demo": True,
            })
    return options
