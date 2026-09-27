"""
Outreach service.

Owns: voice/WhatsApp/in-app delivery, language selection, quiet hours,
frequency caps, and routing could-not-go reasons back to the record
service (FR-D1..D8).

Wired: /respond calls record.mark_milestone(), so a "done" tap persists
(survives a refresh / GET), and every outcome -- including not_done and
could_not_go with its reason -- is logged to the Interaction record. See
GET /record/women/{id}/interactions and GET /record/interactions/reasons
for the resulting dataset (the PRD's "operational dataset nobody currently
has").

Still stubbed: Sarvam AI ASR/TTS/MT integration, WhatsApp Business API
delivery, quiet-hours/frequency-cap enforcement.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from enum import Enum

from record.router import mark_milestone

router = APIRouter()


class CouldNotGoReason(str, Enum):
    no_transport = "no_transport"
    no_money = "no_money"
    no_childcare = "no_childcare"
    family_did_not_permit = "family_did_not_permit"
    facility_closed = "facility_closed"
    did_not_know = "did_not_know"


class ResponseIn(BaseModel):
    woman_id: str
    rule_id: str | None = None  # which milestone; None = "most overdue" (ASHA quick-tap)
    outcome: str  # "done" | "not_done" | "could_not_go"
    reason: CouldNotGoReason | None = None


@router.post("/respond")
def record_response(resp: ResponseIn):
    """Persists via record.mark_milestone(): 'done' becomes a state
    override the ASHA queue and mother timeline both reflect on next fetch;
    every outcome (including not_done/could_not_go with its reason) is
    logged to the Interaction record -- see GET /record/women/{id}/interactions
    and GET /record/interactions/reasons for the resulting dataset."""
    rule_id = resp.rule_id
    if rule_id is None:
        # ASHA queue's quick two-tap doesn't pick a specific milestone --
        # apply to whichever is most overdue for this woman right now.
        from record.router import _with_milestones, _WOMEN
        if resp.woman_id not in _WOMEN:
            raise HTTPException(404, "woman not found")
        milestones = _with_milestones(_WOMEN[resp.woman_id])["milestones"]
        if not milestones:
            return {"status": "no outstanding milestones for this woman"}
        rule_id = milestones[0]["rule_id"]

    ok = mark_milestone(resp.woman_id, rule_id, resp.outcome, resp.reason)
    if not ok:
        raise HTTPException(404, "woman not found")
    return {"status": "persisted", "rule_id": rule_id, "outcome": resp.outcome, "reason": resp.reason}


@router.post("/send/{milestone_id}")
def send_reminder(milestone_id: str):
    """STUB: FR-D1/D2. Real version selects template, fills slots (item,
    date, location, entitlement -- never free generation), and delivers via
    voice/WhatsApp in the mother's registered language."""
    return {"status": "not implemented", "milestone_id": milestone_id}
