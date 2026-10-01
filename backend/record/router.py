"""
Record service.

Owns: the longitudinal record. Single source of truth. Per PRD: Woman is
the root and persists across pregnancies; infant attaches to Pregnancy and
never replaces the mother's own record (FR-B2).

Wired tonight: create_woman() is a plain function other modules call
in-process (ingestion does this), not just an HTTP shell. GET endpoints
attach live-computed milestones by calling the scheduler engine directly --
matches TRD's v0 simplification ("run all four as modules inside one
FastAPI application... keep module boundaries honest").

Still stubbed: real persistence (Postgres -- this is in-memory and resets on
restart), consent-at-data-layer enforcement (FR-G1..G4), audit trail
(FR-B4), FHIR export (FR-B5).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timezone
import uuid

from scheduler.engine import generate_milestones

router = APIRouter()

# In-memory only -- replaced by Postgres in the real v0 build. Never treat
# this as anything but a demo fixture. Resets on every server restart.
_WOMEN: dict[str, dict] = {}

# Milestones are derived live (never stored -- see _with_milestones), so
# "done" needs somewhere to persist. This is the Interaction-outcome
# override: {woman_id: {rule_id: "done"}}. A real build stores this as an
# Interaction entity (TRD data model) with full provenance; this is the
# in-memory stand-in for tonight.
_COMPLETIONS: dict[str, dict[str, str]] = {}

# Every outreach response, kept regardless of outcome -- this IS the
# "operational dataset nobody currently has" the PRD calls out (could-not-go
# reasons). {woman_id: [{rule_id, outcome, reason, at}]}. In-memory only,
# same caveat as _WOMEN/_COMPLETIONS: resets on restart, Postgres in v1.
_INTERACTIONS: dict[str, list[dict]] = {}


def mark_milestone(woman_id: str, rule_id: str, outcome: str, reason: str | None = None) -> bool:
    """Called by outreach.router on a recorded response. 'done' persists as
    a state override -- 'not_done'/'could_not_go' leave the milestone's
    computed state (due/missed) alone, which is correct: not going doesn't
    make it not due. Every response, whatever the outcome, is logged to
    _INTERACTIONS so could-not-go reasons are never silently dropped.
    Returns False if the woman isn't known."""
    if woman_id not in _WOMEN:
        return False
    if outcome == "done":
        _COMPLETIONS.setdefault(woman_id, {})[rule_id] = "done"
    _INTERACTIONS.setdefault(woman_id, []).append({
        "rule_id": rule_id,
        "outcome": outcome,
        "reason": reason,
        "at": datetime.now(timezone.utc).isoformat(),
    })
    return True


def list_interactions(woman_id: str | None = None) -> list[dict]:
    """Backing function for GET /women/{id}/interactions and the aggregate
    could-not-go endpoint. Returns a flat list; woman_id filters to one
    mother, omit it for the full cross-panel dataset (the secondary metric
    the PRD names: 'distribution of could-not-go reasons')."""
    if woman_id is not None:
        return _INTERACTIONS.get(woman_id, [])
    return [
        {**entry, "woman_id": wid}
        for wid, entries in _INTERACTIONS.items()
        for entry in entries
    ]


class ClinicalEvent(BaseModel):
    """Transcribed, never inferred (per PRD: 'we read a field'). e.g. GDM,
    preeclampsia, PPH, caesarean."""
    type: str
    source: str = "manual"  # "manual" | "document"


class WomanRecord(BaseModel):
    id: Optional[str] = None
    name: str
    age: Optional[int] = None
    village: Optional[str] = None
    phone: Optional[str] = None
    language: str = "te"
    pregnancy_start_date: Optional[date] = None
    delivery_date: date
    mode_of_delivery: Optional[str] = None  # "LSCS" | "normal" | "assisted"
    medications: list[str] = []
    food_preferences: list[str] = []
    consent: bool = False
    postpartum_day: Optional[int] = None  # computed, never stored (FR-B3)
    clinical_events: list[ClinicalEvent] = []
    discharge_hb: Optional[float] = None
    incomplete: bool = False  # FR-B6: mark incomplete, never reject


def create_woman(record: WomanRecord, fixed_id: str | None = None) -> dict:
    """Plain function, callable in-process by other modules (ingestion
    calls this directly -- see ingestion/router.py). fixed_id lets startup
    seeding create a stable, demo-friendly ID."""
    record.id = fixed_id or str(uuid.uuid4())
    _WOMEN[record.id] = record.model_dump(mode="json")
    return _WOMEN[record.id]


def _with_milestones(rec: dict) -> dict:
    """Attaches live-computed milestones + postpartum_day. Milestones are
    never stored -- they're derived from delivery_date + clinical_events on
    every read, so a corrected record always recomputes correctly (FR-C7)."""
    rec = dict(rec)
    rec["postpartum_day"] = (date.today() - date.fromisoformat(rec["delivery_date"])).days
    events = [e["type"] for e in rec["clinical_events"]]
    milestones = generate_milestones(date.fromisoformat(rec["delivery_date"]), events)
    overrides = _COMPLETIONS.get(rec["id"], {})

    entries = []
    for m in milestones:
        state = "done" if overrides.get(m.rule_id) == "done" else m.state
        days_overdue = -1 if state == "done" else m.days_overdue
        entries.append(
            {
                "type": m.type,
                "due_date": m.due_date.isoformat(),
                "state": state,
                "days_overdue": days_overdue,
                "rule_id": m.rule_id,
                "citation": m.citation,
                "entitlement": m.entitlement,
            }
        )
    entries.sort(key=lambda e: e["days_overdue"], reverse=True)
    rec["milestones"] = entries
    rec["max_days_overdue"] = entries[0]["days_overdue"] if entries else -1
    return rec


@router.post("/women")
def create_woman_record(record: WomanRecord):
    return create_woman(record)


@router.get("/women/{woman_id}")
def get_woman_record(woman_id: str):
    if woman_id not in _WOMEN:
        raise HTTPException(404, "not found")
    return _with_milestones(_WOMEN[woman_id])


@router.get("/women")
def list_women():
    """Backing endpoint for the ASHA queue. Sorted by max_days_overdue --
    the ONLY sort key permitted (FR-E1). Do not add a second one here."""
    all_women = [_with_milestones(w) for w in _WOMEN.values()]
    all_women.sort(key=lambda w: w["max_days_overdue"], reverse=True)
    return all_women


@router.get("/women/{woman_id}/interactions")
def get_woman_interactions(woman_id: str):
    """Every recorded response for one mother -- done, not_done and
    could_not_go, each with its reason if given. This is what proves a
    could-not-go reason was actually captured, not just accepted and
    discarded."""
    if woman_id not in _WOMEN:
        raise HTTPException(404, "not found")
    return list_interactions(woman_id)


@router.get("/interactions/reasons")
def get_reason_distribution():
    """Secondary metric from the PRD: 'distribution of could-not-go
    reasons -- the operational dataset nobody currently has.' Counts across
    every mother, could_not_go responses only."""
    counts: dict[str, int] = {}
    for entry in list_interactions():
        if entry["outcome"] == "could_not_go" and entry["reason"]:
            counts[entry["reason"]] = counts.get(entry["reason"], 0) + 1
    return counts
