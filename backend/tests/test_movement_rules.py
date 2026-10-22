import os
import re
from pathlib import Path

import pytest
import yaml

from movement.schema import DeliveryMode, Today

PATH = Path(__file__).parent.parent / "rulesets" / "movement_rules.yaml"
FORBIDDEN = {"priority", "severity", "score", "tier", "rank", "risk_level", "acuity"}
LAYERS = {"gate", "safety", "stage", "condition", "today", "preference"}
WHEN_KEYS = {"stage", "trimester", "delivery_mode", "doctor_said_rest",
             "activity_before", "condition", "today", "always"}
ADVICE_KEYS = {"good_to_try", "go_gently", "avoid", "tip", "note", "stop_signs"}


def load():
    with open(PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def test_has_version_and_rules():
    data = load()
    assert data["version"]
    assert len(data["rules"]) >= 20


def test_ids_unique():
    ids = [r["id"] for r in load()["rules"]]
    assert len(ids) == len(set(ids))


def test_every_rule_has_required_fields():
    for r in load()["rules"]:
        for key in ("id", "layer", "order", "when", "advice", "citation"):
            assert key in r, f"{r.get('id')} missing {key}"
        assert r["layer"] in LAYERS, r["id"]
        assert isinstance(r["order"], int), r["id"]
        assert set(r["when"]) <= WHEN_KEYS, r["id"]
        assert set(r["advice"]) <= ADVICE_KEYS, r["id"]
        assert r["advice"], f"{r['id']} has empty advice"


def test_citations_marked_verify_until_signed_off():
    for r in load()["rules"]:
        assert r["citation"].startswith("VERIFY"), r["id"]


def test_no_forbidden_keys_anywhere():
    text = PATH.read_text(encoding="utf-8")
    for f in FORBIDDEN:
        assert not re.search(rf"^\s*-?\s*{f}\s*:", text, re.MULTILINE), f


def test_gate_then_safety_then_rest():
    rules = load()["rules"]
    gate = [r["order"] for r in rules if r["layer"] == "gate"]
    safety = [r["order"] for r in rules if r["layer"] == "safety"]
    others = [r["order"] for r in rules if r["layer"] not in ("gate", "safety")]
    assert max(gate) < min(safety)
    assert max(safety) < min(others)


def test_no_digits_in_advice_text():
    for r in load()["rules"]:
        parts = []
        for key in ("good_to_try", "go_gently", "avoid", "stop_signs"):
            parts += [str(x) for x in r["advice"].get(key, [])]
        parts += [r["advice"].get("tip", ""), r["advice"].get("note", "")]
        assert not re.search(r"\d", " ".join(parts)), r["id"]


def test_every_stage_is_covered():
    seen = set()
    for r in load()["rules"]:
        if r["layer"] != "stage":
            continue
        w = r["when"]
        seen.add((w.get("stage"), w.get("trimester") or w.get("delivery_mode")))
    assert seen >= {
        ("pregnant", 1), ("pregnant", 2), ("pregnant", 3),
        ("postpartum", "normal"), ("postpartum", "csection"), ("postpartum", "not_sure"),
    }


def test_when_values_are_valid():
    today_ok = {t.value for t in Today}
    delivery_ok = {d.value for d in DeliveryMode}
    for r in load()["rules"]:
        w = r["when"]
        if "today" in w:
            assert set(w["today"]) <= today_ok, r["id"]
        if "delivery_mode" in w:
            assert w["delivery_mode"] in delivery_ok, r["id"]
        if "doctor_said_rest" in w:
            assert w["doctor_said_rest"] is True, r["id"]


def test_exactly_one_gate_rule():
    gates = [r for r in load()["rules"] if r["layer"] == "gate"]
    assert len(gates) == 1
    assert gates[0]["when"] == {"doctor_said_rest": True}


@pytest.mark.skipif(not os.environ.get("PUNARNAVA_RELEASE"),
                    reason="release gate: set PUNARNAVA_RELEASE=1 to enforce")
def test_release_gate_no_unreviewed_rules():
    for r in load()["rules"]:
        assert not r["citation"].startswith("VERIFY"), r["id"]