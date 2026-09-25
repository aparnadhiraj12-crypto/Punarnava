"""
Ingestion service.

Owns: photo/PDF intake of MCP cards and discharge summaries -> draft
structured record with per-field confidence and provenance (FR-A1..A10).

Wired tonight: submit_manual_entry() (FR-A8) now actually builds a
WomanRecord and calls record.create_woman() in-process, so the manual
fallback is a real end-to-end path: form -> record -> scheduler (via the
record service's live milestone computation) -> queue/timeline.

Still stubbed: preprocess / region detection / VLM extraction /
normalisation / validation / confirmation-queue generation for photo/PDF
intake (FR-A1..A7, FR-A9, FR-A10). Depth over breadth was always the v0
call here (TRD C1) — tonight's demo uses the manual path only, honestly.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

from record.router import create_woman, WomanRecord, ClinicalEvent

router = APIRouter()


class ManualEntry(BaseModel):
    """~15 fields, the FR-A8 manual fallback."""
    woman_name: str
    delivery_date: date
    mode_of_delivery: str  # "LSCS" | "normal" | "assisted"
    discharge_hb: Optional[float] = Field(None, description="g/dL")
    gestational_diabetes: bool = False
    on_metformin: bool = False
    hypertensive_in_pregnancy: bool = False
    significant_blood_loss: bool = False
    language: str = "te"


@router.post("/manual")
def submit_manual_entry(entry: ManualEntry):
    """FR-A8, now real: builds clinical_events from the flags the ASHA/
    clinic staff ticked, creates the woman's record, and returns it with
    milestones already attached (via record service's live computation)."""
    events: list[ClinicalEvent] = []
    if entry.gestational_diabetes:
        events.append(ClinicalEvent(type="gestational_diabetes", source="manual"))
    if entry.hypertensive_in_pregnancy:
        events.append(ClinicalEvent(type="hypertensive_in_pregnancy", source="manual"))
    if entry.significant_blood_loss:
        events.append(ClinicalEvent(type="significant_blood_loss", source="manual"))

    record = WomanRecord(
        name=entry.woman_name,
        language=entry.language,
        delivery_date=entry.delivery_date,
        mode_of_delivery=entry.mode_of_delivery,
        clinical_events=events,
        discharge_hb=entry.discharge_hb,
        incomplete=False,
    )
    saved = create_woman(record)
    return {"status": "created", "woman": saved}


@router.post("/document")
def upload_document():
    """STUB: FR-A1/A2/A3. Real version accepts JPEG/PNG/HEIC/PDF, runs
    preprocess -> region detection -> VLM extraction -> normalisation ->
    validation, and returns a draft record with confidence per field.
    Tonight's demo uses /manual only — say so honestly on stage."""
    return {
        "status": "not implemented",
        "todo": [
            "FR-A1 accept image/pdf upload",
            "FR-A2 region detection for target MCP card layout",
            "FR-A3 schema-constrained VLM extraction per region",
            "FR-A4 physiological plausibility validation",
            "FR-A5 below-threshold fields -> confirmation queue",
            "FR-A6 store raw/normalised/confidence as distinct fields",
        ],
    }
