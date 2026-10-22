"""
Movement API -- stateless.

POST /api/movement/plan takes the self-declared profile and today's comfort
chips, runs the deterministic engine and returns the plan. Nothing is stored
and nothing is read from record.router or clinical_events. Any logged-in
account may call it; it holds no one's record.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth.router import get_current_user
from movement.engine import build_plan
from movement.schema import MovementCheckin, MovementProfile

router = APIRouter()

_DISCLAIMER = (
    "This is general guidance, not a treatment plan. "
    "Always follow your doctor's, ANM's or physiotherapist's advice."
)


class PlanRequest(BaseModel):
    profile: MovementProfile
    checkin: Optional[MovementCheckin] = None


@router.post("/plan")
def make_plan(req: PlanRequest, token: str):
    if get_current_user(token) is None:
        raise HTTPException(401, "invalid or expired token")
    plan = build_plan(req.profile, req.checkin)
    return {**plan.to_dict(), "disclaimer": _DISCLAIMER}