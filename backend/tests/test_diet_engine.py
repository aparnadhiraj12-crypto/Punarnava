import copy
import pytest
from diet.schema import DietProfile, DietCheckin
from diet.engine import build_plan, load_ruleset


def ids(plan):
    return [c.rule_id for c in plan.cards]


def test_t1_with_nausea():
    plan = build_plan(
        DietProfile(stage="pregnant", trimester=1),
        DietCheckin(symptoms=["nausea"]),
    )
    assert ids(plan) == ["DIET-SAFE-01", "DIET-STG-T1-01", "DIET-SYM-NAUSEA-01"]


def test_t1_nothing_else_has_no_safety_cards():
    plan = build_plan(DietProfile(stage="pregnant", trimester=1))
    assert ids(plan) == ["DIET-STG-T1-01"]


def test_postpartum_lactating_gdm():
    plan = build_plan(
        DietProfile(stage="postpartum", postpartum_day=20, lactating=True, conditions=["gdm"])
    )
    assert ids(plan) == ["DIET-SAFE-02", "DIET-STG-PP-LAC-01", "DIET-COND-GDM-01"]


def test_diabetes_also_fires_gdm_rule():
    plan = build_plan(
        DietProfile(stage="postpartum", postpartum_day=20, conditions=["diabetes"])
    )
    assert "DIET-COND-GDM-01" in ids(plan)


def test_everything_together_is_ordered_safety_first():
    plan = build_plan(
        DietProfile(stage="pregnant", trimester=1, conditions=["anaemia"]),
        DietCheckin(symptoms=["nausea", "vomiting"]),
    )
    assert ids(plan) == [
        "DIET-SAFE-01", "DIET-SAFE-02", "DIET-STG-T1-01",
        "DIET-COND-ANAEMIA-01", "DIET-SYM-NAUSEA-01",
    ]


def test_vomiting_alone_shows_safety_note_but_no_nausea_card():
    plan = build_plan(
        DietProfile(stage="pregnant", trimester=1),
        DietCheckin(symptoms=["vomiting"]),
    )
    assert "DIET-SAFE-01" in ids(plan)
    assert "DIET-SYM-NAUSEA-01" not in ids(plan)


def test_safety_card_is_fixed_text_not_assessed():
    # Rule 2: same fixed note regardless of anything else about her
    a = build_plan(DietProfile(stage="pregnant", trimester=1), DietCheckin(symptoms=["nausea"]))
    b = build_plan(
        DietProfile(stage="pregnant", trimester=3, weight_kg=40, conditions=["gdm"]),
        DietCheckin(symptoms=["nausea"]),
    )
    note_a = next(c.note for c in a.cards if c.rule_id == "DIET-SAFE-01")
    note_b = next(c.note for c in b.cards if c.rule_id == "DIET-SAFE-01")
    assert note_a == note_b


def test_deterministic():
    p = DietProfile(stage="pregnant", trimester=1, conditions=["anaemia"])
    c = DietCheckin(symptoms=["nausea"])
    assert build_plan(p, c).to_dict() == build_plan(p, c).to_dict()


def test_every_card_traceable():
    plan = build_plan(
        DietProfile(stage="pregnant", trimester=1, conditions=["gdm", "anaemia"]),
        DietCheckin(symptoms=["nausea"]),
    )
    assert plan.ruleset_version == load_ruleset()["version"]
    for c in plan.cards:
        assert c.rule_id and c.layer and c.citation


def test_weight_does_not_change_output_yet():
    base = DietProfile(stage="pregnant", trimester=1)
    heavy = DietProfile(stage="pregnant", trimester=1, height_cm=150, weight_kg=95)
    light = DietProfile(stage="pregnant", trimester=1, height_cm=150, weight_kg=38)
    assert build_plan(base).to_dict() == build_plan(heavy).to_dict() == build_plan(light).to_dict()


def test_empty_ruleset_returns_empty_plan_not_error():
    plan = build_plan(
        DietProfile(stage="pregnant", trimester=2),
        ruleset={"version": "x", "rules": []},
    )
    assert plan.cards == []


def test_unknown_when_key_fails_loudly():
    bad = {"version": "x", "rules": [{
        "id": "BAD-01", "layer": "stage", "order": 1,
        "when": {"trimestr": 1}, "advice": {"tip": "x"}, "citation": "VERIFY",
    }]}
    with pytest.raises(ValueError):
        build_plan(DietProfile(stage="pregnant", trimester=1), ruleset=bad)