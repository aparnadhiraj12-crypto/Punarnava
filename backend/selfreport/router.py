"""
Self-report service.

Not in the original v0 PRD scope -- added after. Lets a mother keep her
own log spanning pregnancy through postpartum: doctor visits, issues she
noticed, medication she reports taking, and general notes, in her own
words.

The boundary that matters, stated plainly because it protects the same
defence the scheduler relies on: this is HER account, never the clinical
record. record.router's ClinicalEvent is something a clinician wrote down
and the PRD's whole defence for the scheduler rests on "we transcribe, we
never infer" (see docs -- Master PRD, "Where the line is genuinely
close"). If a self-reported entry ever changed a milestone, a due date, or
got merged into clinical_events, that defence breaks for the entire
product, not just this feature. So:

  - This module never writes to record.router's _WOMEN, _COMPLETIONS or
    ClinicalEvent structures, and nothing here is called from the
    scheduler's path.
  - Entries are never scored, summarised, or assessed. Saving one always
    returns the same fixed safety note, regardless of what she wrote (same
    pattern as journal.router and safety.router).
  - The Handoff screen should show these under a clearly separate "What
    she reported" heading, never blended into the clinical events list.
    The doctor reads both and decides what matters -- the system doesn't
    decide for him.
  - The "medication" type here is HER own log of what she reports
    taking -- separate from clinical.router's prescribed-medication
    entries, which are clinician-entered and transcribed, never her own
    words. Keep the two distinct; do not merge them.

Still stubbed: in-memory only, resets on restart. No auth check yet, same
caveat as journal.router -- wire in auth.router.get_current_user before
this holds real data.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timezone
import uuid

router = APIRouter()

TYPES = ("doctor_visit", "issue", "note", "medication")

_ENTRIES: dict[str, list[dict]] = {}

_SAFETY_NOTE = (
    "This is saved to your log. If anything feels urgent, please contact "
    "your ASHA or see danger signs for what to do next."
)


class SelfReportRequest(BaseModel):
    woman_id: str
    type: str
    text: str
    visit_date: Optional[date] = None       # doctor_visit only
    provider_name: Optional[str] = None     # doctor_visit only, her own words
    medication_name: Optional[str] = None   # medication only, her own words


@router.post("/self-report")
def add_entry(req: SelfReportRequest):
    if req.type not in TYPES:
        raise HTTPException(400, f"type must be one of {TYPES}")
    if not req.text.strip():
        raise HTTPException(400, "text cannot be empty")

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": req.type,
        "text": req.text,
        "visit_date": req.visit_date.isoformat() if req.visit_date else None,
        "provider_name": req.provider_name,
        "medication_name": req.medication_name,
    }
    _ENTRIES.setdefault(req.woman_id, []).append(entry)
    return {"status": "created", "entry": entry, "safety_note": _SAFETY_NOTE}


@router.get("/self-report/{woman_id}")
def list_entries(woman_id: str):
    entries = list(reversed(_ENTRIES.get(woman_id, [])))
    return {"entries": entries}