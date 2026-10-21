"""
Diet API -- stateless.

POST /api/diet/plan takes the self-declared profile and today's check-in,
runs the deterministic engine and returns the plan. Nothing is stored and
nothing is read from record.router or clinical_events (see diet/engine.py).
Any logged-in account may call it; it holds no one's record.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth.router import get_current_user
from diet.engine import build_plan
from diet.schema import DietCheckin, DietProfile

router = APIRouter()

_DISCLAIMER = (
    "This is general food guidance, not a treatment plan. "
    "Always follow your doctor's or dietitian's advice."
)


class PlanRequest(BaseModel):
    profile: DietProfile
    checkin: Optional[DietCheckin] = None


@router.post("/plan")
def make_plan(req: PlanRequest, token: str):
    if get_current_user(token) is None:
        raise HTTPException(401, "invalid or expired token")
    plan = build_plan(req.profile, req.checkin)
    return {**plan.to_dict(), "disclaimer": _DISCLAIMER}