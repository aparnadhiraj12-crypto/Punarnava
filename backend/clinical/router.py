"""
Clinical entry service.

A clinic-role user (per auth.router) can add a medication entry that shows
up on the mother's own timeline as "prescribed by your doctor" --
distinct from selfreport's medication type, which is HER own log of what
she reports taking. Same separation principle as clinical_events vs
self-reported issues: a clinician wrote this down, so it is transcribed
and shown, never inferred or generated.

Not wired to auth yet -- caller_role is accepted as a plain field for now
so the frontend can build against the real shape; swap it for
auth.router.get_current_user(token) once the frontend sends tokens on
every request. Do not remove the caller_role check when that happens --
tighten it, don't drop it.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

_PRESCRIBED: dict[str, list[dict]] = {}


class PrescribedMedicationRequest(BaseModel):
    woman_id: str
    medication_name: str
    dosage: Optional[str] = None
    instructions: Optional[str] = None
    prescribed_by: str
    caller_role: str = "clinic"


@router.post("/medication")
def add_prescribed_medication(req: PrescribedMedicationRequest):
    if req.caller_role != "clinic":
        raise HTTPException(403, "only a clinic account can add a prescribed medication entry")
    if not req.medication_name.strip():
        raise HTTPException(400, "medication_name cannot be empty")

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "medication_name": req.medication_name,
        "dosage": req.dosage,
        "instructions": req.instructions,
        "prescribed_by": req.prescribed_by,
    }
    _PRESCRIBED.setdefault(req.woman_id, []).append(entry)
    return {"status": "created", "entry": entry}


@router.get("/medication/{woman_id}")
def list_prescribed_medication(woman_id: str):
    return {"entries": list(reversed(_PRESCRIBED.get(woman_id, [])))}
