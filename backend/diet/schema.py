"""
Diet inputs -- all SELF-DECLARED by the mother or her ASHA.

Compliance boundary (see wellness/router.py docstring): nothing here is read
from clinical_events or the clinician's record. The mother tells us; we never
infer. Conditions mean "my doctor told me I have this", not a diagnosis made
by this system.

No field may be named priority, severity, score, tier, rank, risk_level or
acuity (scripts/compliance_audit.py).
"""
from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class Stage(str, Enum):
    pregnant = "pregnant"
    postpartum = "postpartum"


class DietType(str, Enum):
    veg = "veg"
    egg = "egg"
    nonveg = "nonveg"


class Condition(str, Enum):
    gdm = "gdm"                    # gestational diabetes
    diabetes = "diabetes"          # pre-existing diabetes
    anaemia = "anaemia"
    hypertension = "hypertension"  # incl. pre-eclampsia history
    hypothyroid = "hypothyroid"


class Symptom(str, Enum):
    nausea = "nausea"
    vomiting = "vomiting"
    low_appetite = "low_appetite"
    constipation = "constipation"
    heartburn = "heartburn"


class DietProfile(BaseModel):
    """Changes rarely. Set at enrolment, edited when her situation changes."""
    stage: Stage
    trimester: Optional[int] = Field(None, ge=1, le=3)
    postpartum_day: Optional[int] = Field(None, ge=0, le=730)
    lactating: bool = False
    diet_type: DietType = DietType.veg
    height_cm: Optional[float] = Field(None, ge=120, le=200)
    weight_kg: Optional[float] = Field(None, ge=30, le=200)
    conditions: list[Condition] = []

    @model_validator(mode="after")
    def _stage_matches_fields(self):
        if self.stage == Stage.pregnant:
            if self.trimester is None:
                raise ValueError("trimester is required when stage is pregnant")
            if self.lactating:
                raise ValueError("lactating cannot be true while pregnant")
        if self.stage == Stage.postpartum and self.postpartum_day is None:
            raise ValueError("postpartum_day is required when stage is postpartum")
        return self


class DietCheckin(BaseModel):
    """Changes daily. 'How are you feeling today?'"""
    symptoms: list[Symptom] = []
    weight_kg: Optional[float] = Field(None, ge=30, le=200)