"""
Scheduler engine -- THE compliance-critical component (PRD, TRD C2).

Hard rules, enforced here by construction, not by prompting:
  - No model import. No network call. No learned component of any kind.
  - Intervals are literal values from the ruleset file. Never computed from
    patient characteristics. Never "personalised."
  - The only orderable field on any milestone is days overdue. No score,
    priority, tier or severity field exists anywhere in this module.
  - Every milestone carries the rule id, ruleset version and citation that
    produced it (NFR-25).

scripts/compliance_audit.py greps this module (and the schema) to enforce
the above in CI. If a change here needs a model import to work, the change
is wrong, not the audit.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
import yaml

RULESET_PATH = Path(__file__).parent.parent / "rulesets" / "ruleset.yaml"


@dataclass
class Milestone:
    type: str
    due_date: date
    window_opens: date
    window_closes: date
    state: str  # "due" | "done" | "pending" | "missed" | "not_applicable"
    rule_id: str
    ruleset_version: str
    citation: str
    entitlement: str | None = None

    @property
    def days_overdue(self) -> int:
        """The single sort key. Do not add a second one."""
        if self.state in ("done", "not_applicable"):
            return -1
        delta = (date.today() - self.due_date).days
        return max(delta, 0)


@dataclass
class Ruleset:
    version: str
    rules: list[dict] = field(default_factory=list)

    @classmethod
    def load(cls, path: Path = RULESET_PATH) -> "Ruleset":
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return cls(version=data["version"], rules=data["rules"])


ANCHORS = ("delivery_date", "pregnancy_start_date")


def _resolve_offset(anchor_date: date, expr: str) -> date:
    """Parses literal offsets like 'delivery_date + 6 weeks' or
    'pregnancy_start_date + 20 weeks'. No arithmetic on patient
    characteristics -- the offset itself is a fixed published value from the
    ruleset, this function only does the date math."""
    for name in ANCHORS:
        expr = expr.replace(name, "")
    parts = expr.strip().split()
    sign, n, unit = parts[0], int(parts[1]), parts[2]
    days = n * 7 if unit.startswith("week") else n
    return anchor_date + (timedelta(days=days) if sign == "+" else -timedelta(days=days))


def _resolve_state(today: date, window_opens: date, window_closes: date) -> str:
    """FR-C3: due | pending | missed, computed purely from dates. "done" is
    never set here -- it's an override applied later at the record layer
    (record/router.py._with_milestones), since this function has no idea
    whether an ASHA has recorded a completed visit."""
    if today < window_opens:
        return "pending"
    if today > window_closes:
        return "missed"
    return "due"


def generate_milestones(
    delivery_date: date | None,
    clinical_events: list[str],
    ruleset: Ruleset | None = None,
    today: date | None = None,
    pregnancy_start_date: date | None = None,
) -> list[Milestone]:
    """Pure function: record facts in, milestone list out. No I/O beyond
    the ruleset file load (done once by the caller/router, not per call,
    to keep this testable without disk access). `today` defaults to the
    real today but is an explicit parameter so golden tests can pin it.

    Each rule names the one date it counts from (`anchor`, default
    delivery_date). Postpartum rules need delivery_date. Antenatal rules
    need pregnancy_start_date AND no delivery_date: once she has delivered
    the antenatal schedule stops. If the anchor date is missing the rule is
    skipped -- nothing is ever guessed or back-calculated."""
    ruleset = ruleset or Ruleset.load()
    today = today or date.today()
    milestones: list[Milestone] = []

    for rule in ruleset.rules:
        anchor_name = rule.get("anchor", "delivery_date")
        if anchor_name == "delivery_date":
            anchor_date = delivery_date
        elif anchor_name == "pregnancy_start_date":
            anchor_date = pregnancy_start_date if delivery_date is None else None
        else:
            raise ValueError(f"rule {rule['id']}: unknown anchor {anchor_name!r}")
        if anchor_date is None:
            continue

        trigger = rule["when"].get("clinical_event")
        if trigger == "always" or trigger in clinical_events:
            due = _resolve_offset(anchor_date, rule["due"])
            open_off, close_off = rule["window"]
            window_opens = due + timedelta(days=_days(open_off))
            window_closes = due + timedelta(days=_days(close_off))
            milestones.append(
                Milestone(
                    type=rule["generates"],
                    due_date=due,
                    window_opens=window_opens,
                    window_closes=window_closes,
                    state=_resolve_state(today, window_opens, window_closes),
                    rule_id=rule["id"],
                    ruleset_version=ruleset.version,
                    citation=rule["citation"],
                    entitlement=rule.get("entitlement"),
                )
            )
    return milestones


def _days(offset: str) -> int:
    sign = -1 if offset.strip().startswith("-") else 1
    n, unit = offset.strip().lstrip("+-").split()
    n = int(n)
    return sign * (n * 7 if unit.startswith("week") else n)
