
"""Illustrative meal options, not medical or condition-specific advice."""

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
                "allergen_list_complete": False,
                "taste_tags": list(recipe["taste_tags"]),
                "meal_types": list(recipe["meal_types"]),
                "affordability": recipe["affordability"],
                "condition_tags": [],
                "limit_notes": (
                    "Illustrative meal idea, not an individual medical diet. "
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
