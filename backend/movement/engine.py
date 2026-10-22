"""
Movement engine -- deterministic, model-free, same pattern as diet/engine.py.

  - No model import. No network call. No randomness.
  - Inputs are SELF-DECLARED (MovementProfile, MovementCheckin). Never reads
    clinical_events or the clinician's record.
  - REST GATE: if she says her doctor asked her to rest, only gate and
    safety cards come back, and the media list is empty. No exercise content.
  - Media (videos/articles) come from rulesets/movement_media.yaml. Each item
    was reviewed by a person. Nothing is generated.
  - Output is ordered by the rule's plain `order` number, then id (stable).
  - No minutes, reps, heart rates or targets are ever produced.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from functools import lru_cache
from pathlib import Path
from typing import Optional
import yaml

from diet.schema import Stage
from movement.schema import MovementProfile, MovementCheckin

RULES_PATH = Path(__file__).parent.parent / "rulesets" / "movement_rules.yaml"
MEDIA_PATH = Path(__file__).parent.parent / "rulesets" / "movement_media.yaml"
KNOWN_WHEN = {"stage", "trimester", "delivery_mode", "doctor_said_rest",
              "activity_before", "condition", "today", "always"}
GATE_LAYERS = {"gate", "safety"}


@dataclass
class Card:
    rule_id: str
    layer: str
    citation: str
    good_to_try: list[str] = field(default_factory=list)
    go_gently: list[str] = field(default_factory=list)
    avoid: list[str] = field(default_factory=list)
    stop_signs: list[str] = field(default_factory=list)
    tip: Optional[str] = None
    note: Optional[str] = None


@dataclass
class MediaItem:
    id: str
    kind: str
    title: str
    publisher: str
    url: str
    language: str
    length: str
    topic: str
    reviewed_by: str
    reviewed_on: str
    citation: str


@dataclass
class MovementPlan:
    ruleset_version: str
    media_version: str
    rest_gate: bool
    cards: list[Card]
    media: list[MediaItem]

    def to_dict(self) -> dict:
        return asdict(self)


@lru_cache(maxsize=4)
def load_rules(path: Path = RULES_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


@lru_cache(maxsize=4)
def load_media(path: Path = MEDIA_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _check_when_keys(rule: dict) -> None:
    unknown = set(rule["when"]) - KNOWN_WHEN
    if unknown:
        raise ValueError(f"{rule['id']}: unknown 'when' key(s) {sorted(unknown)}")


def _matches(when: dict, profile: MovementProfile, checkin: MovementCheckin) -> bool:
    for key, want in when.items():
        if key == "always":
            if not want:
                return False
        elif key == "doctor_said_rest":
            if profile.doctor_said_rest != want:
                return False
        elif key == "stage":
            if profile.stage.value != want:
                return False
        elif key == "trimester":
            if profile.trimester != want:
                return False
        elif key == "delivery_mode":
            if profile.delivery_mode is None or profile.delivery_mode.value != want:
                return False
        elif key == "activity_before":
            if profile.activity_before is None or profile.activity_before.value != want:
                return False
        elif key == "condition":
            have = {c.value for c in profile.conditions}
            if not have & set(want):
                return False
        elif key == "today":
            have = {t.value for t in checkin.today}
            if not have & set(want):
                return False
    return True


def _media_stage(profile: MovementProfile) -> str:
    if profile.stage == Stage.pregnant:
        return f"pregnant_t{profile.trimester}"
    return "postpartum"


def _pick_media(profile: MovementProfile, media: dict) -> list[MediaItem]:
    stage = _media_stage(profile)
    mode = profile.delivery_mode.value if profile.delivery_mode else "any"
    picked = []
    for i in media["items"]:
        if i["stage"] != stage:
            continue
        if i["delivery_mode"] not in ("any", mode):
            continue
        picked.append(MediaItem(
            id=i["id"], kind=i["kind"], title=i["title"], publisher=i["publisher"],
            url=i["url"], language=i["language"], length=i["length"], topic=i["topic"],
            reviewed_by=i["reviewed_by"], reviewed_on=str(i["reviewed_on"]),
            citation=i["citation"],
        ))
    picked.sort(key=lambda m: m.id)
    return picked


def build_plan(
    profile: MovementProfile,
    checkin: Optional[MovementCheckin] = None,
    ruleset: Optional[dict] = None,
    media: Optional[dict] = None,
) -> MovementPlan:
    checkin = checkin or MovementCheckin()
    ruleset = ruleset or load_rules()
    media = media or load_media()
    rules = ruleset["rules"]
    for r in rules:
        _check_when_keys(r)

    fired = [r for r in rules if _matches(r["when"], profile, checkin)]
    fired.sort(key=lambda r: (r["order"], r["id"]))

    gated = any(r["layer"] == "gate" for r in fired)
    if gated:
        fired = [r for r in fired if r["layer"] in GATE_LAYERS]

    cards = []
    for r in fired:
        a = r["advice"]
        cards.append(Card(
            rule_id=r["id"], layer=r["layer"], citation=r["citation"],
            good_to_try=list(a.get("good_to_try", [])),
            go_gently=list(a.get("go_gently", [])),
            avoid=list(a.get("avoid", [])),
            stop_signs=list(a.get("stop_signs", [])),
            tip=a.get("tip"), note=a.get("note"),
        ))

    items = [] if gated else _pick_media(profile, media)
    return MovementPlan(
        ruleset_version=ruleset["version"],
        media_version=media["version"],
        rest_gate=gated,
        cards=cards,
        media=items,
    )