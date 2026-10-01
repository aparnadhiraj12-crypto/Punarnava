"""
Clinical entry service.

A clinic-role user (per auth.router) can add a medication entry that shows
up on the mother's own timeline as "prescribed by your doctor" --
distinct from selfreport's medication type, which is HER own log of what
she reports taking. Same separation principle as clinical_events vs
self-reported issues: a clinician wrote this down, so it is transcribed
and shown, never inferred or generated.

Adding an entry requires a token whose role is "clinic" (require_role).
Reading entries is not gated yet.
"""
from fastapi import APIRouter, HTTPException
from auth.router import require_role
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


@router.post("/medication")
def add_prescribed_medication(req: PrescribedMedicationRequest, token: str):
    require_role(token, {"clinic", "doctor"})
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
