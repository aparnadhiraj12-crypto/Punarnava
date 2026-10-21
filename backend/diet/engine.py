"""
Diet engine -- deterministic, model-free, same pattern as scheduler/engine.py.

  - No model import. No network call. No randomness.
  - Inputs are SELF-DECLARED (DietProfile, DietCheckin). Never reads
    clinical_events or the clinician's record.
  - Weight and height are accepted but do NOT change the output yet. No
    calorie, gram or dose figure is ever produced.
  - Output is ordered by the rule's plain `order` number, then id (stable).
  - Every card carries its rule id, layer and citation, and the plan carries
    the ruleset version, so any advice can be traced and audited.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from functools import lru_cache
from pathlib import Path
from typing import Optional
import yaml

from diet.schema import DietProfile, DietCheckin

RULESET_PATH = Path(__file__).parent.parent / "rulesets" / "diet_rules.yaml"
KNOWN_WHEN = {"stage", "trimester", "lactating", "condition", "symptom", "diet_type", "always"}


@dataclass
class Card:
    rule_id: str
    layer: str
    citation: str
    eat: list[str] = field(default_factory=list)
    limit: list[str] = field(default_factory=list)
    tip: Optional[str] = None
    note: Optional[str] = None


@dataclass
class DietPlan:
    ruleset_version: str
    cards: list[Card]

    def to_dict(self) -> dict:
        return asdict(self)


@lru_cache(maxsize=4)
def load_ruleset(path: Path = RULESET_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _check_when_keys(rule: dict) -> None:
    unknown = set(rule["when"]) - KNOWN_WHEN
    if unknown:
        raise ValueError(f"{rule['id']}: unknown 'when' key(s) {sorted(unknown)}")


def _matches(when: dict, profile: DietProfile, checkin: DietCheckin) -> bool:
    for key, want in when.items():
        if key == "always":
            if not want:
                return False
        elif key == "stage":
            if profile.stage.value != want:
                return False
        elif key == "trimester":
            if profile.trimester != want:
                return False
        elif key == "lactating":
            if profile.lactating != want:
                return False
        elif key == "diet_type":
            if profile.diet_type.value != want:
                return False
        elif key == "condition":
            have = {c.value for c in profile.conditions}
            if not have & set(want):
                return False
        elif key == "symptom":
            have = {s.value for s in checkin.symptoms}
            if not have & set(want):
                return False
    return True


def build_plan(
    profile: DietProfile,
    checkin: Optional[DietCheckin] = None,
    ruleset: Optional[dict] = None,
) -> DietPlan:
    checkin = checkin or DietCheckin()
    ruleset = ruleset or load_ruleset()
    rules = ruleset["rules"]
    for r in rules:
        _check_when_keys(r)

    fired = [r for r in rules if _matches(r["when"], profile, checkin)]
    fired.sort(key=lambda r: (r["order"], r["id"]))

    cards = []
    for r in fired:
        a = r["advice"]
        cards.append(Card(
            rule_id=r["id"],
            layer=r["layer"],
            citation=r["citation"],
            eat=list(a.get("eat", [])),
            limit=list(a.get("limit", [])),
            tip=a.get("tip"),
            note=a.get("note"),
        ))
    return DietPlan(ruleset_version=ruleset["version"], cards=cards)