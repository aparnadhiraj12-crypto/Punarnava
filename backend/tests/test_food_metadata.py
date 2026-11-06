"""Contracts for illustrative recipes, not certified products or price surveys."""
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from wellness.food_options import RECIPES, STAGES, build_food_options


def test_allergen_completeness_is_scoped_to_explicit_illustrative_ingredients():
    options = build_food_options()
    assert {item["id"] for item in options} == {
        f"food-{recipe['key']}-{stage}" for recipe in RECIPES for stage in STAGES
    }
    assert len(options) == len(RECIPES) * len(STAGES)
    expected_allergens = {
        "rice-moong": [], "vegetable-poha": [], "curd-rice": ["milk"],
        "banana-peanut": ["peanut"], "paneer-rice": ["milk"],
    }
    for recipe in RECIPES:
        for stage in STAGES:
            item = next(item for item in options if item["id"] == f"food-{recipe['key']}-{stage}")
            assert item["allergen_list_complete"] is True
            assert item["ingredients"] == recipe["ingredients"]
            assert item["allergens"] == expected_allergens[recipe["key"]]
            notes = item["limit_notes"].lower()
            assert "listed ingredients only" in notes
            assert "not certified" in notes
            assert "cross-contact" in notes
            assert "labels" in item["avoid_notes"].lower()
            assert item["nutrients"] is None
            assert item["condition_tags"] == []
            assert item["is_demo"] is True


def test_affordability_boundaries_are_calculated_from_documented_serving_assumptions():
    for item in build_food_options():
        estimate = item["affordability_estimate"]
        assert estimate["currency"] == "INR"
        assert estimate["basis"] == "ingredient cost per illustrative serving"
        assert estimate["servings"] == 1
        assert estimate["is_illustrative"] is True
        notes = " ".join(estimate["assumptions"]).lower()
        for required in ("not surveyed", "not a quote", "fuel", "labour", "local", "raw", "edible"):
            assert required in notes
        lines = estimate["ingredients"]
        assert [line["ingredient"] for line in lines] == item["ingredients"]
        for line in lines:
            assert line["quantity_g"] > 0
            assert line["unit_price_basis"] == "INR per kg"
            assert 0 <= line["unit_price_min"] <= line["unit_price_max"]
        for bound in ("min", "max"):
            calculated = sum((
                Decimal(str(line["quantity_g"])) * Decimal(str(line[f"unit_price_{bound}"]))
                / Decimal("1000") for line in lines
            ), Decimal("0")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            assert Decimal(str(estimate[bound])) == calculated
        assert 0 < estimate["min"] <= estimate["max"]
        assert item["affordability"] in {"low", "medium"}
