"""
Meditation service.

Same compliance pattern as wellness.router: a sourced content library,
matched by stage only, never by clinical_events or anything she has
written in the journal. All content is fixed text with a source_citation
-- never generated (Rule 3).

This module never reads journal entries. A meditation suggestion must
never be triggered by or targeted at what she has logged -- that would be
inferring her mental state from her data, which is Rule 1/Rule 2 territory
(scoring and symptom assessment). The library is shown the same way to
everyone at a given stage; she picks what she wants to try.
"""
from fastapi import APIRouter
from typing import Optional
import uuid

router = APIRouter()

_CITATION = "VERIFY -- source to be confirmed by clinical lead (draft placeholder)"

_TECHNIQUES: list[dict] = [
    {
        "id": str(uuid.uuid4()), "stage": "pregnancy", "title": "Breathing for anxious moments",
        "body": "Slow breathing in for four counts, hold for four, out for six. A few minutes "
                "can help when worry spikes are frequent during pregnancy.",
        "source_citation": _CITATION,
    },
    {
        "id": str(uuid.uuid4()), "stage": "postpartum_early", "title": "Two minutes before a feed",
        "body": "A short body-scan before breastfeeding -- noticing shoulders, jaw and breath -- "
                "can help with the physical tension that builds up during frequent night feeds.",
        "source_citation": _CITATION,
    },
    {
        "id": str(uuid.uuid4()), "stage": "postpartum_early", "title": "When the house feels loud",
        "body": "Stepping into another room for five slow breaths before responding to a "
                "difficult conversation, including with family, is a small reset that helps "
                "many new mothers.",
        "source_citation": _CITATION,
    },
    {
        "id": str(uuid.uuid4()), "stage": "postpartum_six_week", "title": "A daily five-minute pause",
        "body": "Sitting quietly for five minutes, once a day, without a phone nearby, is enough "
                "to start noticing patterns in mood without needing to do anything about them yet.",
        "source_citation": _CITATION,
    },
]


@router.get("/techniques")
def get_techniques(stage: Optional[str] = None):
    if stage:
        return {"techniques": [t for t in _TECHNIQUES if t["stage"] == stage]}
    return {"techniques": _TECHNIQUES}
