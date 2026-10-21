import re
from pathlib import Path
import yaml

PATH = Path(__file__).parent.parent / "rulesets" / "diet_rules.yaml"
FORBIDDEN = {"priority", "severity", "score", "tier", "rank", "risk_level", "acuity"}
LAYERS = {"safety", "stage", "bmi", "condition", "symptom", "preference"}
WHEN_KEYS = {"stage", "trimester", "lactating", "condition", "symptom", "diet_type", "always"}
ADVICE_KEYS = {"eat", "limit", "tip", "note"}


def load():
    with open(PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def test_has_version_and_rules():
    data = load()
    assert data["version"]
    assert len(data["rules"]) >= 7


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


def test_every_citation_marked_verify_until_signed_off():
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


def test_no_numbers_in_advice_text():
    # no gram, calorie or dose targets (false precision)
    for r in load()["rules"]:
        blob = " ".join(
            [str(x) for k in ("eat", "limit") for x in r["advice"].get(k, [])]
            + [r["advice"].get("tip", ""), r["advice"].get("note", "")]
        )
        assert not re.search(r"\d", blob.replace("1 hour", "")), r["id"]