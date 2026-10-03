"""
Scheduler router — thin HTTP wrapper over engine.py.

Keep this thin on purpose: all decision logic lives in engine.py so that a
non-engineer reviewer can audit engine.py + ruleset.yaml in one sitting
without wading through routing/serialization code.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from typing import Optional

from .engine import generate_milestones

router = APIRouter()


class ScheduleRequest(BaseModel):
    delivery_date: Optional[date] = None
    pregnancy_start_date: Optional[date] = None  # antenatal rules; used only while not delivered
    clinical_events: list[str] = []


@router.post("/generate")
def generate(req: ScheduleRequest):
    if req.delivery_date is None and req.pregnancy_start_date is None:
        raise HTTPException(422, "give delivery_date or pregnancy_start_date")
    milestones = generate_milestones(
        req.delivery_date, req.clinical_events,
        pregnancy_start_date=req.pregnancy_start_date,
    )
    # Sort by days_overdue descending — the ONLY sort key permitted anywhere
    # in this system. See docs/compliance.md.
    milestones.sort(key=lambda m: m.days_overdue, reverse=True)
    return [
        {
            "type": m.type,
            "due_date": m.due_date.isoformat(),
            "window": {"opens": m.window_opens.isoformat(), "closes": m.window_closes.isoformat()},
            "state": m.state,
            "days_overdue": m.days_overdue,
            "rule_id": m.rule_id,
            "ruleset_version": m.ruleset_version,
            "citation": m.citation,
            "entitlement": m.entitlement,
        }
        for m in milestones
    ]


@router.get("/{woman_id}")
def get_schedule(woman_id: str, token: str = None):
    """Milestones for one mother, computed live by the record service."""
    from fastapi import HTTPException
    from auth.router import require_record_access
    require_record_access(token, woman_id)
    from record.router import _WOMEN, _with_milestones
    if woman_id not in _WOMEN:
        raise HTTPException(404, "not found")
    rec = _with_milestones(_WOMEN[woman_id])
    return {"woman_id": woman_id, "milestones": rec["milestones"], "max_days_overdue": rec["max_days_overdue"]}
