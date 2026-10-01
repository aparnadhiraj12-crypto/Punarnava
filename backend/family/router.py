"""
Family (husband) access service.

PRD FR-D8 / FR-G3: "a separate, revocable grant with visibly narrower
scope than the mother's own view... she can see exactly what each
grantee can see." NFR-24: "consent state enforced at the data layer, not
only in the UI." Both are load-bearing here, not just quotes:

The scoping happens in THIS module's response, not by the frontend
choosing what to render. shared_view() below builds its own response by
calling record.router and selfreport.router directly and copying over
only the fields on the allow-list. It never returns the full woman record
or the full self-report list, so there is no field a compromised or
careless frontend could accidentally leak -- the data literally isn't in
the payload.

Explicitly excluded, always, regardless of what she grants: journal
entries (journal.router), self-reported "issue" entries. A grant cannot
widen these. If a future grant type is added that needs to include them,
that is a product decision requiring a new, clearly-named grant scope --
never a default expansion of this one.
"""
from fastapi import APIRouter, HTTPException
from auth.router import require_self
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

from record.router import _WOMEN, _with_milestones
from wellness.router import _CONTENT, _PROVIDERS
from selfreport.router import _ENTRIES as _SELF_ENTRIES
from clinical.router import _PRESCRIBED

router = APIRouter()

_GRANTS: dict[str, dict] = {}

ALLOWED_SELF_REPORT_TYPES = {"doctor_visit", "medication"}


DEFAULT_SCOPE = ["stage", "diet", "classes", "appointments"]


class GrantRequest(BaseModel):
    woman_id: str
    grantee_name: Optional[str] = None
    phone: Optional[str] = None
    scope: list[str] = DEFAULT_SCOPE  # what SHE chooses to share


@router.post("/grant")
def create_grant(req: GrantRequest, token: str):
    require_self(token, req.woman_id)
    if req.woman_id not in _WOMEN:
        raise HTTPException(404, "woman not found")
    name = req.grantee_name or req.phone
    if not name:
        raise HTTPException(422, "give grantee_name or phone")
    scope = [s for s in req.scope if s in DEFAULT_SCOPE]
    grant_id = str(uuid.uuid4())
    _GRANTS[grant_id] = {
        "id": grant_id,
        "woman_id": req.woman_id,
        "grantee_name": name,
        "phone": req.phone,
        "scope": scope,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "revoked": False,
    }
    return _GRANTS[grant_id]


@router.post("/grant/{grant_id}/revoke")
def revoke_grant(grant_id: str, token: str):
    if grant_id not in _GRANTS:
        raise HTTPException(404, "grant not found")
    require_self(token, _GRANTS[grant_id]["woman_id"])
    _GRANTS[grant_id]["revoked"] = True
    return _GRANTS[grant_id]


@router.get("/grants/{woman_id}")
def list_grants(woman_id: str, token: str):
    require_self(token, woman_id)
    return {"grants": [g for g in _GRANTS.values() if g["woman_id"] == woman_id]}


def _stage_for(rec: dict):
    """Stage only, never her clinical_events (wellness compliance boundary).
    Day cut-offs are a first guess for a clinician to confirm."""
    day = rec["postpartum_day"]
    if day is None or day < 0:
        tri = rec.get("trimester")
        return "pregnancy_t" + str(tri) if tri else None
    if day < 42:
        return "postpartum_early"
    if day < 182:
        return "postpartum_six_week"
    return "postpartum_long"


@router.get("/shared-view/{grant_id}")
def shared_view(grant_id: str):
    grant = _GRANTS.get(grant_id)
    if grant is None or grant["revoked"]:
        raise HTTPException(403, "this link is no longer valid")

    woman_id = grant["woman_id"]
    if woman_id not in _WOMEN:
        raise HTTPException(404, "not found")

    rec = _with_milestones(_WOMEN[woman_id])
    self_entries = [
        e for e in reversed(_SELF_ENTRIES.get(woman_id, []))
        if e["type"] in ALLOWED_SELF_REPORT_TYPES
    ]
    prescribed = list(reversed(_PRESCRIBED.get(woman_id, [])))
    stage = _stage_for(rec)
    scope = grant.get("scope", DEFAULT_SCOPE)

    return {
        "name": rec["name"],
        "postpartum_day": rec["postpartum_day"],
        "milestones": rec["milestones"] if "stage" in scope else [],
        "self_reported": self_entries if "appointments" in scope else [],
        "prescribed_medication": prescribed,
        "stage": stage if "stage" in scope else None,
        "diet": [c for c in _CONTENT if "diet" in scope and stage and c["stage"] == stage and c["type"] in ("diet", "hydration")],
        "exercise": [c for c in _CONTENT if "classes" in scope and stage and c["stage"] == stage and c["type"] == "exercise"],
        "classes": [pr for pr in _PROVIDERS if "classes" in scope and pr["type"] in ("yoga", "gym")],
    }
