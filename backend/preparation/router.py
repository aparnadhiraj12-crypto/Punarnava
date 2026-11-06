"""Private visit preparation; no clinical inference or schedule changes."""
from copy import deepcopy
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from auth.router import require_self
from record.router import _WOMEN, _with_milestones
from preparation.content import guidance_for

router = APIRouter()
_PREPARATIONS: dict[str, dict] = {}


class ChecklistItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    checked: bool = False


class Preparation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_due_date: date
    checklist: list[ChecklistItem] = Field(max_length=30)
    questions: str = Field(default="", max_length=5000)


def _milestone(woman_id, rule_id, token):
    # Unlike the staff-readable record, these are HER private notes, even in demo mode.
    require_self(token, woman_id)
    woman = _WOMEN.get(woman_id)
    if woman is None:
        raise HTTPException(404, "mother record not found")
    milestone = next((m for m in _with_milestones(woman)["milestones"] if m["rule_id"] == rule_id), None)
    if milestone is None:
        raise HTTPException(404, "milestone not found in your journey")
    return milestone


def _default_preparation():
    return {"questions": "", "checklist": [
        {"label": label, "checked": False} for label in (
            "Appointment or referral details, if available",
            "My health records and previous reports, if available",
            "My written questions for this visit",
        )
    ]}


@router.get("/women/{woman_id}/milestones/{rule_id}")
def get_preparation(woman_id: str, rule_id: str, token: str = ""):
    milestone = _milestone(woman_id, rule_id, token)
    saved = _PREPARATIONS.get(woman_id, {}).get(rule_id, {}).get(milestone["due_date"])
    return {"milestone": milestone, "preparation": deepcopy(saved) if saved is not None else _default_preparation(),
            "guidance": guidance_for(milestone)}


@router.put("/women/{woman_id}/milestones/{rule_id}")
def save_preparation(woman_id: str, rule_id: str, req: Preparation, token: str = ""):
    milestone = _milestone(woman_id, rule_id, token)
    if req.expected_due_date.isoformat() != milestone["due_date"]:
        raise HTTPException(409, "Your Journey has changed. Return to Journey and open this milestone again before saving.")
    _PREPARATIONS.setdefault(woman_id, {}).setdefault(rule_id, {})[milestone["due_date"]] = req.model_dump(exclude={"expected_due_date"})
    return get_preparation(woman_id, rule_id, token)
