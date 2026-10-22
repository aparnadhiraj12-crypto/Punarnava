import pytest
from mind.schema import MindProfile, MindCheckin, Feeling
from mind.engine import build_plan, load_ruleset


def ids(plan):
    return [c.rule_id for c in plan.cards]


def test_t1_baseline_has_crisis_card_and_stage_card_only():
    plan = build_plan(MindProfile(stage="pregnant", trimester=1))
    assert ids(plan) == ["MIND-SAFE-01", "MIND-STG-T1-01"]


def test_t2_anxious():
    plan = build_plan(MindProfile(stage="pregnant", trimester=2), MindCheckin(feelings=["anxious"]))
    assert ids(plan) == ["MIND-SAFE-01", "MIND-SAFE-02", "MIND-STG-T2-01", "MIND-TODAY-ANXIOUS-01"]


def test_t3_overwhelmed_and_not_sleeping():
    plan = build_plan(
        MindProfile(stage="pregnant", trimester=3),
        MindCheckin(feelings=["overwhelmed", "not_sleeping"]),
    )
    assert ids(plan) == [
        "MIND-SAFE-01", "MIND-SAFE-02", "MIND-STG-T3-01",
        "MIND-TODAY-OVERWHELMED-01", "MIND-TODAY-SLEEP-01",
    ]


def test_postpartum_early():
    plan = build_plan(MindProfile(stage="postpartum", postpartum_day=10))
    assert ids(plan) == ["MIND-SAFE-01", "MIND-STG-PP-EARLY-01"]


def test_postpartum_phase_boundary():
    early = build_plan(MindProfile(stage="postpartum", postpartum_day=42))
    later = build_plan(MindProfile(stage="postpartum", postpartum_day=43))
    assert "MIND-STG-PP-EARLY-01" in ids(early) and "MIND-STG-PP-LATER-01" not in ids(early)
    assert "MIND-STG-PP-LATER-01" in ids(later) and "MIND-STG-PP-EARLY-01" not in ids(later)
    day0 = build_plan(MindProfile(stage="postpartum", postpartum_day=0))
    assert "MIND-STG-PP-EARLY-01" in ids(day0)


def test_crisis_card_always_present():
    profiles = [
        MindProfile(stage="pregnant", trimester=1),
        MindProfile(stage="pregnant", trimester=2),
        MindProfile(stage="pregnant", trimester=3),
        MindProfile(stage="postpartum", postpartum_day=5),
        MindProfile(stage="postpartum", postpartum_day=200),
    ]
    for p in profiles:
        assert "MIND-SAFE-01" in ids(build_plan(p))


def test_support_card_shows_for_every_single_feeling():
    p = MindProfile(stage="postpartum", postpartum_day=20)
    for f in Feeling:
        assert "MIND-SAFE-02" in ids(build_plan(p, MindCheckin(feelings=[f.value]))), f


def test_support_card_absent_when_nothing_ticked():
    plan = build_plan(MindProfile(stage="pregnant", trimester=2), MindCheckin(feelings=[]))
    assert "MIND-SAFE-02" not in ids(plan)


def test_support_card_identical_whatever_she_ticks():
    p = MindProfile(stage="pregnant", trimester=2)

    def card(feelings):
        plan = build_plan(p, MindCheckin(feelings=feelings))
        c = next(c for c in plan.cards if c.rule_id == "MIND-SAFE-02")
        return (c.note, c.tip, c.contacts)

    base = card(["lonely"])
    assert card(["burned_out"]) == base
    assert card(["anxious", "sad", "overwhelmed", "not_sleeping"]) == base


def test_every_single_feeling_gets_same_shape_no_escalation():
    p = MindProfile(stage="postpartum", postpartum_day=20)
    shapes = set()
    for f in Feeling:
        plan = build_plan(p, MindCheckin(feelings=[f.value]))
        shapes.add((len(plan.cards), tuple(c.layer for c in plan.cards)))
    assert shapes == {(4, ("safety", "safety", "stage", "today"))}


def test_irritable_and_frustrated_share_a_card():
    p = MindProfile(stage="pregnant", trimester=1)
    a = ids(build_plan(p, MindCheckin(feelings=["irritable"])))
    b = ids(build_plan(p, MindCheckin(feelings=["frustrated"])))
    assert "MIND-TODAY-IRRITABLE-01" in a and "MIND-TODAY-IRRITABLE-01" in b


def test_deterministic():
    p = MindProfile(stage="pregnant", trimester=3)
    c = MindCheckin(feelings=["anxious", "lonely"])
    assert build_plan(p, c).to_dict() == build_plan(p, c).to_dict()


def test_every_card_traceable():
    plan = build_plan(MindProfile(stage="pregnant", trimester=2), MindCheckin(feelings=["sad"]))
    assert plan.ruleset_version == load_ruleset()["version"]
    for c in plan.cards:
        assert c.rule_id and c.layer and c.citation


def test_unknown_when_key_fails_loudly():
    bad = {"version": "x", "postpartum_early_until_day": 42, "rules": [{
        "id": "BAD-01", "layer": "stage", "order": 1,
        "when": {"trimestr": 1}, "advice": {"tip": "x"}, "citation": "VERIFY",
    }]}
    with pytest.raises(ValueError):
        build_plan(MindProfile(stage="pregnant", trimester=1), ruleset=bad)