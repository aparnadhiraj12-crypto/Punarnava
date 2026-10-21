from diet.schema import DietProfile, DietCheckin
from diet.engine import build_plan


def ids(plan):
    return [c.rule_id for c in plan.cards]


def test_every_stage_has_a_stage_card():
    profiles = [
        DietProfile(stage="pregnant", trimester=1),
        DietProfile(stage="pregnant", trimester=2),
        DietProfile(stage="pregnant", trimester=3),
        DietProfile(stage="postpartum", postpartum_day=10, lactating=True),
        DietProfile(stage="postpartum", postpartum_day=10, lactating=False),
    ]
    for p in profiles:
        stage_cards = [c for c in build_plan(p).cards if c.layer == "stage"]
        assert len(stage_cards) == 1, p


def test_t3_hypertension_heartburn_constipation():
    plan = build_plan(
        DietProfile(stage="pregnant", trimester=3, conditions=["hypertension"]),
        DietCheckin(symptoms=["heartburn", "constipation"]),
    )
    assert ids(plan) == [
        "DIET-SAFE-02", "DIET-STG-T3-01", "DIET-COND-HTN-01",
        "DIET-SYM-CONSTIP-01", "DIET-SYM-HEARTBURN-01",
    ]


def test_postpartum_not_lactating_thyroid_nonveg_low_appetite():
    plan = build_plan(
        DietProfile(stage="postpartum", postpartum_day=10, lactating=False,
                    conditions=["hypothyroid"], diet_type="nonveg"),
        DietCheckin(symptoms=["low_appetite"]),
    )
    assert ids(plan) == [
        "DIET-SAFE-02", "DIET-STG-PP-01", "DIET-COND-THYROID-01",
        "DIET-SYM-APPETITE-01", "DIET-PREF-NONVEG-01",
    ]


def test_lactating_and_not_lactating_are_exclusive():
    lac = ids(build_plan(DietProfile(stage="postpartum", postpartum_day=10, lactating=True)))
    non = ids(build_plan(DietProfile(stage="postpartum", postpartum_day=10, lactating=False)))
    assert "DIET-STG-PP-LAC-01" in lac and "DIET-STG-PP-01" not in lac
    assert "DIET-STG-PP-01" in non and "DIET-STG-PP-LAC-01" not in non


def test_egg_preference_card():
    plan = build_plan(DietProfile(stage="pregnant", trimester=1, diet_type="egg"))
    assert ids(plan) == ["DIET-STG-T1-01", "DIET-PREF-EGG-01"]


def test_veg_default_adds_no_preference_card():
    plan = build_plan(DietProfile(stage="pregnant", trimester=1, diet_type="veg"))
    assert ids(plan) == ["DIET-STG-T1-01"]


def test_hypertension_note_is_fixed_text():
    a = build_plan(DietProfile(stage="pregnant", trimester=1, conditions=["hypertension"]))
    b = build_plan(DietProfile(stage="postpartum", postpartum_day=5, conditions=["hypertension"]))
    tip_a = next(c.tip for c in a.cards if c.rule_id == "DIET-COND-HTN-01")
    tip_b = next(c.tip for c in b.cards if c.rule_id == "DIET-COND-HTN-01")
    assert tip_a == tip_b