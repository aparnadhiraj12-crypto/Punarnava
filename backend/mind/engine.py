"""
Mind engine -- deterministic, model-free, same pattern as diet/engine.py.

  - No model import. No network call. No randomness.
  - Inputs are SELF-DECLARED taps (MindProfile, MindCheckin). Never reads the
    journal, clinical_events or the clinician's record.
  - Nothing is scored, counted or assessed. Ticking any feeling adds the SAME
    fixed support card whichever feeling it was and however many were ticked.
  - The crisis card shows for everyone, always.
  - Output is ordered by the rule's plain `order` number, then id (stable).
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from functools import lru_cache
from pathlib import Path
from typing import Optional
import yaml

from diet.schema import Stage
from mind.schema import MindProfile, MindCheckin

RULESET_PATH = Path(__file__).parent.parent / "rulesets" / "mind_rules.yaml"
KNOWN_WHEN = {"stage", "trimester", "phase", "feeling", "any_feeling", "always"}


@dataclass
class Card:
    rule_id: str
    layer: str
    citation: str
    try_this: list[str] = field(default_factory=list)
    tip: Optional[str] = None
    note: Optional[str] = None
    contacts: list[dict] = field(default_factory=list)


@dataclass
class MindPlan:
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


def _phase(profile: MindProfile, ruleset: dict) -> Optional[str]:
    if profile.stage != Stage.postpartum:
        return None
    limit = ruleset["postpartum_early_until_day"]
    return "early" if profile.postpartum_day <= limit else "later"


def _matches(when: dict, profile: MindProfile, checkin: MindCheckin, phase: Optional[str]) -> bool:
    for key, want in when.items():
        if key == "always":
            if not want:
                return False
        elif key == "any_feeling":
            if bool(checkin.feelings) != bool(want):
                return False
        elif key == "stage":
            if profile.stage.value != want:
                return False
        elif key == "trimester":
            if profile.trimester != want:
                return False
        elif key == "phase":
            if phase != want:
                return False
        elif key == "feeling":
            have = {f.value for f in checkin.feelings}
            if not have & set(want):
                return False
    return True


def build_plan(
    profile: MindProfile,
    checkin: Optional[MindCheckin] = None,
    ruleset: Optional[dict] = None,
) -> MindPlan:
    checkin = checkin or MindCheckin()
    ruleset = ruleset or load_ruleset()
    rules = ruleset["rules"]
    for r in rules:
        _check_when_keys(r)

    phase = _phase(profile, ruleset)
    fired = [r for r in rules if _matches(r["when"], profile, checkin, phase)]
    fired.sort(key=lambda r: (r["order"], r["id"]))

    cards = []
    for r in fired:
        a = r["advice"]
        cards.append(Card(
            rule_id=r["id"], layer=r["layer"], citation=r["citation"],
            try_this=list(a.get("try_this", [])),
            tip=a.get("tip"), note=a.get("note"),
            contacts=[dict(c) for c in a.get("contacts", [])],
        ))
    return MindPlan(ruleset_version=ruleset["version"], cards=cards)