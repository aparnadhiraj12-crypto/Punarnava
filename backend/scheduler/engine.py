"""
Scheduler engine — THE compliance-critical component (PRD, TRD C2).

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
        with open(path) as f:
            data = yaml.safe_load(f)
        return cls(version=data["version"], rules=data["rules"])


def _resolve_offset(delivery_date: date, expr: str) -> date:
    """Parses literal offsets like 'delivery_date + 6 weeks'. No arithmetic
    on patient characteristics — the offset itself is a fixed published
    value from the ruleset, this function only does the date math."""
    parts = expr.replace("delivery_date", "").strip().split()
    sign, n, unit = parts[0], int(parts[1]), parts[2]
    days = n * 7 if unit.startswith("week") else n
    return delivery_date + (timedelta(days=days) if sign == "+" else -timedelta(days=days))


def generate_milestones(
    delivery_date: date,
    clinical_events: list[str],
    ruleset: Ruleset | None = None,
) -> list[Milestone]:
    """Pure function: record facts in, milestone list out. No I/O beyond
    the ruleset file load (done once by the caller/router, not per call,
    to keep this testable without disk access)."""
    ruleset = ruleset or Ruleset.load()
    milestones: list[Milestone] = []

    for rule in ruleset.rules:
        trigger = rule["when"].get("clinical_event")
        if trigger == "always" or trigger in clinical_events:
            due = _resolve_offset(delivery_date, rule["due"])
            open_off, close_off = rule["window"]
            window_opens = due + timedelta(days=_days(open_off))
            window_closes = due + timedelta(days=_days(close_off))
            milestones.append(
                Milestone(
                    type=rule["generates"],
                    due_date=due,
                    window_opens=window_opens,
                    window_closes=window_closes,
                    state="due",
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
