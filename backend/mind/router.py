"""
Mind API -- stateless.

POST /api/mind/plan takes her stage and today's tapped feelings, runs the
deterministic engine and returns the plan. Nothing is stored. Nothing is
read from the journal, record.router or clinical_events. Any logged-in
account may call it; it holds no one's record.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth.router import get_current_user
from mind.engine import build_plan
from mind.schema import MindCheckin, MindProfile

router = APIRouter()

_DISCLAIMER = (
    "This is general support, not a diagnosis or treatment. "
    "If you are worried about how you feel, please talk to a doctor, "
    "a counsellor or your ASHA."
)


class PlanRequest(BaseModel):
    profile: MindProfile
    checkin: Optional[MindCheckin] = None


@router.post("/plan")
def make_plan(req: PlanRequest, token: str):
    if get_current_user(token) is None:
        raise HTTPException(401, "invalid or expired token")
    plan = build_plan(req.profile, req.checkin)
    return {**plan.to_dict(), "disclaimer": _DISCLAIMER}