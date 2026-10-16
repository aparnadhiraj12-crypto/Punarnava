"""
Clinical entry service.

A doctor or clinic account can add a prescription or a blood-pressure reading
for a mother. Both show up in her app and on her ASHA's screen, separate from
her own self-report log. A clinician wrote this down, so it is stored and
shown exactly as typed, never inferred or generated.

Blood pressure is shown as numbers only. Nothing here labels a reading
"high" or "normal", because that would be interpreting medical data
(docs/compliance.md).

Writing requires a doctor or clinic token. Reading is limited to the mother,
her assigned ASHA, and doctor/clinic accounts (require_record_access).
"""
from fastapi import APIRouter, HTTPException
from auth.router import require_role, _USERS
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timezone
import uuid

router = APIRouter()

_PRESCRIBED: dict[str, list[dict]] = {}
_BP_READINGS: dict[str, list[dict]] = {}


def _author(session: dict, given: Optional[str]) -> str:
    """Who wrote this entry: what the doctor typed, else their account name."""
    if given and given.strip():
        return given.strip()
    user = _USERS.get(session.get("user_id"), {})
    return user.get("name") or "Your doctor"


def _require_known_woman(woman_id: str) -> None:
    from record.router import _WOMEN  # local import avoids a circular import
    if woman_id not in _WOMEN:
        raise HTTPException(404, "no mother with that id")


class PrescribedMedicationRequest(BaseModel):
    woman_id: str
    medication_name: str
    dosage: Optional[str] = None
    instructions: Optional[str] = None
    prescribed_by: Optional[str] = None  # defaults to the signed-in doctor's name


@router.post("/medication")
def add_prescribed_medication(req: PrescribedMedicationRequest, token: str):
    session = require_role(token, {"clinic", "doctor"})
    if not req.medication_name.strip():
        raise HTTPException(400, "medication_name cannot be empty")
    _require_known_woman(req.woman_id)

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "medication_name": req.medication_name,
        "dosage": req.dosage,
        "instructions": req.instructions,
        "prescribed_by": _author(session, req.prescribed_by),
    }
    _PRESCRIBED.setdefault(req.woman_id, []).append(entry)
    return {"status": "created", "entry": entry}


@router.get("/medication/{woman_id}")
def list_prescribed_medication(woman_id: str, token: str = None):
    from auth.router import require_record_access
    require_record_access(token, woman_id)
    return {"entries": list(reversed(_PRESCRIBED.get(woman_id, [])))}


class BPReadingRequest(BaseModel):
    woman_id: str
    systolic: int
    diastolic: int
    pulse: Optional[int] = None
    measured_on: Optional[date] = None
    note: Optional[str] = None


@router.post("/bp")
def add_bp_reading(req: BPReadingRequest, token: str):
    """Doctor/clinic records a blood-pressure reading. Stored as typed.
    The range checks below only catch typing mistakes (e.g. 1200 for 120);
    they are not clinical thresholds and nothing is flagged or labelled."""
    session = require_role(token, {"clinic", "doctor"})
    _require_known_woman(req.woman_id)
    if not 50 <= req.systolic <= 300 or not 30 <= req.diastolic <= 200:
        raise HTTPException(400, "systolic must be 50-300 and diastolic 30-200 mmHg")
    if req.diastolic >= req.systolic:
        raise HTTPException(400, "diastolic must be lower than systolic")
    if req.pulse is not None and not 20 <= req.pulse <= 250:
        raise HTTPException(400, "pulse must be 20-250 per minute")
    if req.measured_on and req.measured_on > date.today():
        raise HTTPException(400, "measured_on cannot be in the future")

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "measured_on": (req.measured_on or date.today()).isoformat(),
        "systolic": req.systolic,
        "diastolic": req.diastolic,
        "pulse": req.pulse,
        "note": (req.note or "").strip() or None,
        "recorded_by": _author(session, None),
    }
    _BP_READINGS.setdefault(req.woman_id, []).append(entry)
    return {"status": "created", "entry": entry}


@router.get("/bp/{woman_id}")
def list_bp_readings(woman_id: str, token: str = None):
    from auth.router import require_record_access
    require_record_access(token, woman_id)
    rows = _BP_READINGS.get(woman_id, [])
    return {"entries": sorted(rows, key=lambda e: (e["measured_on"], e["timestamp"]), reverse=True)}