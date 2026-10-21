import pytest
from pydantic import ValidationError
from diet.schema import DietProfile, DietCheckin, Stage, Condition, Symptom


def test_valid_pregnant_profile():
    p = DietProfile(stage="pregnant", trimester=2, conditions=["gdm"])
    assert p.stage == Stage.pregnant
    assert p.conditions == [Condition.gdm]
    assert p.diet_type.value == "veg"


def test_valid_postpartum_profile():
    p = DietProfile(stage="postpartum", postpartum_day=10, lactating=True)
    assert p.lactating is True


def test_pregnant_requires_trimester():
    with pytest.raises(ValidationError):
        DietProfile(stage="pregnant")


def test_postpartum_requires_day():
    with pytest.raises(ValidationError):
        DietProfile(stage="postpartum")


def test_pregnant_cannot_be_lactating():
    with pytest.raises(ValidationError):
        DietProfile(stage="pregnant", trimester=1, lactating=True)


def test_unknown_condition_rejected():
    with pytest.raises(ValidationError):
        DietProfile(stage="pregnant", trimester=1, conditions=["cancer"])


def test_weight_out_of_range_rejected():
    with pytest.raises(ValidationError):
        DietProfile(stage="pregnant", trimester=1, weight_kg=5)


def test_checkin_symptoms():
    c = DietCheckin(symptoms=["nausea", "heartburn"])
    assert Symptom.nausea in c.symptoms