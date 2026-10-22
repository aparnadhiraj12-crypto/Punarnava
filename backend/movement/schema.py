"""
Movement inputs -- all SELF-DECLARED by the mother or her ASHA.

Compliance boundary: nothing here is read from clinical_events or the
clinician's record. She tells us; we never infer. doctor_said_rest means
"my doctor told me to rest", which hides all movement content (hard gate).

Today's chips are comfort labels only. Danger-type symptoms (bleeding,
severe headache, swelling, reduced baby movement) are deliberately NOT
accepted here: they go to the danger-signs page verbatim, never through
this engine.

No field may be named priority, severity, score, tier, rank, risk_level or
acuity (scripts/compliance_audit.py).
"""
from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, model_validator

from diet.schema import Condition, Stage


class DeliveryMode(str, Enum):
    normal = "normal"
    csection = "csection"
    not_sure = "not_sure"


class ActivityBefore(str, Enum):
    active = "active"
    not_active = "not_active"


class Today(str, Enum):
    tired = "tired"
    low_energy = "low_energy"
    back_ache = "back_ache"
    tight_shoulders = "tight_shoulders"
    not_sleeping = "not_sleeping"


class MovementProfile(BaseModel):
    """Changes rarely. Set once, edited when her situation changes."""
    stage: Stage
    trimester: Optional[int] = Field(None, ge=1, le=3)
    postpartum_day: Optional[int] = Field(None, ge=0, le=730)
    delivery_mode: Optional[DeliveryMode] = None
    doctor_said_rest: bool = False
    activity_before: Optional[ActivityBefore] = None
    conditions: list[Condition] = []

    @model_validator(mode="after")
    def _stage_matches_fields(self):
        if self.stage == Stage.pregnant and self.trimester is None:
            raise ValueError("trimester is required when stage is pregnant")
        if self.stage == Stage.postpartum:
            if self.postpartum_day is None:
                raise ValueError("postpartum_day is required when stage is postpartum")
            if self.delivery_mode is None:
                self.delivery_mode = DeliveryMode.not_sure
        return self


class MovementCheckin(BaseModel):
    """Changes daily. 'How is your body today?'"""
    today: list[Today] = []