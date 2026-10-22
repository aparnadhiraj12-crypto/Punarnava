"""
Mind inputs -- all SELF-DECLARED, tapped by her today.

Compliance boundary: nothing here is read from the journal, clinical_events
or the clinician's record. The feelings are labels she picks today; the
engine never infers, counts or scores them.

Harm-to-self or harm-to-baby statements are deliberately NOT accepted as
feelings. They go to a human through the always-visible crisis card, never
through this engine.

No field may be named priority, severity, score, tier, rank, risk_level or
acuity (scripts/compliance_audit.py).
"""
from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, model_validator

from diet.schema import Stage


class Feeling(str, Enum):
    anxious = "anxious"
    sad = "sad"
    overwhelmed = "overwhelmed"
    burned_out = "burned_out"
    lonely = "lonely"
    irritable = "irritable"
    frustrated = "frustrated"
    not_sleeping = "not_sleeping"


class MindProfile(BaseModel):
    stage: Stage
    trimester: Optional[int] = Field(None, ge=1, le=3)
    postpartum_day: Optional[int] = Field(None, ge=0, le=730)

    @model_validator(mode="after")
    def _stage_matches_fields(self):
        if self.stage == Stage.pregnant and self.trimester is None:
            raise ValueError("trimester is required when stage is pregnant")
        if self.stage == Stage.postpartum and self.postpartum_day is None:
            raise ValueError("postpartum_day is required when stage is postpartum")
        return self


class MindCheckin(BaseModel):
    """'How are you feeling today?' Her taps, nothing else."""
    feelings: list[Feeling] = []