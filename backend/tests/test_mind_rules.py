import os
import re
from pathlib import Path

import pytest
import yaml

from mind.schema import Feeling

PATH = Path(__file__).parent.parent / "rulesets" / "mind_rules.yaml"
FORBIDDEN = {"priority", "severity", "score", "tier", "rank", "risk_level", "acuity"}
LAYERS = {"safety", "stage", "today"}
WHEN_KEYS = {"stage", "trimester", "phase", "feeling", "any_feeling", "always"}
ADVICE_KEYS = {"try_this", "tip", "note", "contacts"}
CONTACT_KEYS = {"name", "phone", "alt_phone", "detail"}
BANNED_WORDS = ["depress", "diagnos", "disorder", "severe", "mild", "risk",
                "you seem", "you may have", "you probably"]


def load():
    with open(PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _texts(rule):
    a = rule["advice"]
    out = list(a.get("try_this", [])) + [a.get("tip", ""), a.get("note", "")]
    for c in a.get("contacts", []):
        out += [c["name"], c.get("detail", "")]
    return out


def test_has_version_rules_and_early_limit():
    data = load()
    assert data["version"]
    assert isinstance(data["postpartum_early_until_day"], int)
    assert len(data["rules"]) >= 14


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


def test_safety_rules_sort_first():
    rules = load()["rules"]
    safety = [r["order"] for r in rules if r["layer"] == "safety"]
    others = [r["order"] for r in rules if r["layer"] != "safety"]
    assert max(safety) < min(others)


def test_digits_only_in_phone_fields():
    for r in load()["rules"]:
        assert not re.search(r"\d", " ".join(_texts(r))), r["id"]
        for c in r["advice"].get("contacts", []):
            assert re.fullmatch(r"[0-9+\- ]+", c["phone"]), r["id"]
            if "alt_phone" in c:
                assert re.fullmatch(r"[0-9+\- ]+", c["alt_phone"]), r["id"]


def test_contacts_shape():
    for r in load()["rules"]:
        for c in r["advice"].get("contacts", []):
            assert set(c) <= CONTACT_KEYS, r["id"]
            assert c["name"] and c["phone"], r["id"]


def test_no_assessment_language():
    for r in load()["rules"]:
        blob = " ".join(_texts(r)).lower()
        for w in BANNED_WORDS:
            assert w not in blob, f"{r['id']} contains '{w}'"


def test_every_feeling_has_a_today_card():
    covered = set()
    for r in load()["rules"]:
        if r["layer"] == "today":
            covered |= set(r["when"].get("feeling", []))
    assert covered >= {f.value for f in Feeling}


def test_every_stage_is_covered():
    seen = set()
    for r in load()["rules"]:
        if r["layer"] != "stage":
            continue
        w = r["when"]
        seen.add((w.get("stage"), w.get("trimester") or w.get("phase")))
    assert seen >= {("pregnant", 1), ("pregnant", 2), ("pregnant", 3),
                    ("postpartum", "early"), ("postpartum", "later")}


@pytest.mark.skipif(not os.environ.get("PUNARNAVA_RELEASE"),
                    reason="release gate: set PUNARNAVA_RELEASE=1 to enforce")
def test_release_gate_no_unreviewed_rules():
    for r in load()["rules"]:
        assert not r["citation"].startswith("VERIFY"), r["id"]