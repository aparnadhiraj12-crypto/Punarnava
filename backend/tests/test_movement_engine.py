import pytest
from movement.schema import MovementProfile, MovementCheckin
from movement.engine import build_plan, load_rules, load_media

EMPTY_MEDIA = {"version": "m0", "items": []}


def ids(plan):
    return [c.rule_id for c in plan.cards]


def _item(item_id, stage, mode="any"):
    return {
        "id": item_id, "kind": "video", "title": "t", "publisher": "p",
        "url": "https://example.org/x", "language": "en", "length": "short",
        "stage": stage, "delivery_mode": mode, "topic": "walking",
        "reviewed_by": "r", "reviewed_on": "2026-10-01", "citation": "VERIFY",
    }


MEDIA = {"version": "m1", "items": [
    _item("M-A", "pregnant_t2"),
    _item("M-B", "postpartum", "csection"),
    _item("M-C", "postpartum", "normal"),
    _item("M-D", "postpartum", "any"),
]}


def test_pregnant_t1_baseline():
    plan = build_plan(MovementProfile(stage="pregnant", trimester=1), media=EMPTY_MEDIA)
    assert ids(plan) == ["MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-03", "MOVE-STG-T1-01"]
    assert plan.rest_gate is False


def test_t2_hypertension_tired_back_notactive():
    plan = build_plan(
        MovementProfile(stage="pregnant", trimester=2, conditions=["hypertension"],
                        activity_before="not_active"),
        MovementCheckin(today=["tired", "back_ache"]),
        media=EMPTY_MEDIA,
    )
    assert ids(plan) == [
        "MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-03", "MOVE-STG-T2-01",
        "MOVE-COND-HTN-01", "MOVE-TODAY-TIRED-01", "MOVE-TODAY-BACK-01",
        "MOVE-PREF-NOTACTIVE-01",
    ]


def test_t3_anaemia_sleep_active():
    plan = build_plan(
        MovementProfile(stage="pregnant", trimester=3, conditions=["anaemia"],
                        activity_before="active"),
        MovementCheckin(today=["not_sleeping"]),
        media=EMPTY_MEDIA,
    )
    assert ids(plan) == [
        "MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-03", "MOVE-STG-T3-01",
        "MOVE-COND-ANAEMIA-01", "MOVE-TODAY-SLEEP-01", "MOVE-PREF-ACTIVE-01",
    ]


def test_postpartum_normal():
    plan = build_plan(
        MovementProfile(stage="postpartum", postpartum_day=10, delivery_mode="normal"),
        media=EMPTY_MEDIA,
    )
    assert ids(plan) == ["MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-04", "MOVE-STG-PP-NORMAL-01"]


def test_postpartum_csection_with_chips():
    plan = build_plan(
        MovementProfile(stage="postpartum", postpartum_day=10, delivery_mode="csection"),
        MovementCheckin(today=["tight_shoulders", "low_energy"]),
        media=EMPTY_MEDIA,
    )
    assert ids(plan) == [
        "MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-04", "MOVE-STG-PP-CSEC-01",
        "MOVE-TODAY-LOWENERGY-01", "MOVE-TODAY-SHOULDERS-01",
    ]


def test_postpartum_not_sure_is_default():
    plan = build_plan(MovementProfile(stage="postpartum", postpartum_day=10), media=EMPTY_MEDIA)
    assert ids(plan) == ["MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-04", "MOVE-STG-PP-UNSURE-01"]


def test_rest_gate_shows_only_gate_and_safety_pregnant():
    plan = build_plan(
        MovementProfile(stage="pregnant", trimester=2, doctor_said_rest=True,
                        conditions=["hypertension"], activity_before="active"),
        MovementCheckin(today=["tired", "back_ache"]),
        media=MEDIA,
    )
    assert ids(plan) == ["MOVE-GATE-01", "MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-03"]
    assert plan.rest_gate is True
    assert plan.media == []
    assert {c.layer for c in plan.cards} <= {"gate", "safety"}


def test_rest_gate_postpartum():
    plan = build_plan(
        MovementProfile(stage="postpartum", postpartum_day=5, delivery_mode="csection",
                        doctor_said_rest=True),
        MovementCheckin(today=["tired"]),
        media=MEDIA,
    )
    assert ids(plan) == ["MOVE-GATE-01", "MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-04"]
    assert plan.media == []


def test_no_gate_without_flag():
    plan = build_plan(MovementProfile(stage="pregnant", trimester=2), media=MEDIA)
    assert "MOVE-GATE-01" not in ids(plan)
    assert plan.rest_gate is False


def test_stop_signs_identical_for_everyone():
    a = build_plan(MovementProfile(stage="pregnant", trimester=1), media=EMPTY_MEDIA)
    b = build_plan(
        MovementProfile(stage="pregnant", trimester=3, conditions=["hypertension"],
                        activity_before="active"),
        MovementCheckin(today=["tired"]),
        media=EMPTY_MEDIA,
    )
    sa = next(c.stop_signs for c in a.cards if c.rule_id == "MOVE-SAFE-01")
    sb = next(c.stop_signs for c in b.cards if c.rule_id == "MOVE-SAFE-01")
    assert sa and sa == sb


def test_deterministic():
    p = MovementProfile(stage="postpartum", postpartum_day=20, delivery_mode="normal")
    c = MovementCheckin(today=["tired"])
    assert build_plan(p, c, media=MEDIA).to_dict() == build_plan(p, c, media=MEDIA).to_dict()


def test_every_card_traceable():
    plan = build_plan(
        MovementProfile(stage="pregnant", trimester=2, conditions=["anaemia"]),
        MovementCheckin(today=["tired"]),
        media=EMPTY_MEDIA,
    )
    assert plan.ruleset_version == load_rules()["version"]
    assert plan.media_version == "m0"
    for c in plan.cards:
        assert c.rule_id and c.layer and c.citation


def test_unknown_when_key_fails_loudly():
    bad = {"version": "x", "rules": [{
        "id": "BAD-01", "layer": "stage", "order": 1,
        "when": {"trimestr": 1}, "advice": {"tip": "x"}, "citation": "VERIFY",
    }]}
    with pytest.raises(ValueError):
        build_plan(MovementProfile(stage="pregnant", trimester=1), ruleset=bad, media=EMPTY_MEDIA)


def test_media_matches_stage_and_delivery():
    t2 = build_plan(MovementProfile(stage="pregnant", trimester=2), media=MEDIA)
    assert [m.id for m in t2.media] == ["M-A"]
    t1 = build_plan(MovementProfile(stage="pregnant", trimester=1), media=MEDIA)
    assert t1.media == []
    cs = build_plan(MovementProfile(stage="postpartum", postpartum_day=9, delivery_mode="csection"), media=MEDIA)
    assert [m.id for m in cs.media] == ["M-B", "M-D"]
    nm = build_plan(MovementProfile(stage="postpartum", postpartum_day=9, delivery_mode="normal"), media=MEDIA)
    assert [m.id for m in nm.media] == ["M-C", "M-D"]


def test_media_hidden_by_gate():
    plan = build_plan(
        MovementProfile(stage="pregnant", trimester=2, doctor_said_rest=True), media=MEDIA)
    assert plan.media == []


def test_media_not_sure_gets_only_any():
    plan = build_plan(MovementProfile(stage="postpartum", postpartum_day=9), media=MEDIA)
    assert [m.id for m in plan.media] == ["M-D"]


def test_real_media_file_loads_as_list():
    plan = build_plan(MovementProfile(stage="pregnant", trimester=2))
    assert isinstance(plan.media, list)
    assert plan.media_version == load_media()["version"]