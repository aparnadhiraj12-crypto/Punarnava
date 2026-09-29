"""
Safety service: danger-sign guidance.

PRD J2 / Rule 2: if a mother reports a symptom, the system does NOT assess
it. It shows the existing government danger-sign guidance verbatim and
helps her reach a human. Routing is logistics; assessing is not ours.

That is enforced by the shape of this endpoint. It accepts NO symptom, NO
woman_id and NO clinical input of any kind, and returns the same fixed
content to everyone. There is nothing here to score, rank or interpret.
Extra query parameters are ignored (a test proves it).

Rule 3 (no generated clinical text): the guidance below is a DRAFT
PLACEHOLDER list, marked verified=False and citing VERIFY, in the same way
ruleset.yaml and the wellness content are. It must be replaced with the
verbatim text from the official government source before it is shown as
real guidance. Whoever pastes it in should keep the wording exactly as
published and update source_citation and verified. Do not paraphrase.

The action is a fixed routing instruction (contact her ASHA or go to the
nearest facility). Phone numbers are deliberately not included because
emergency and free-transport numbers vary by state -- add them per state
once the pilot state is chosen.

Language: only English is seeded. Any other language falls back to English
and says so in the response (NFR-18: degrade with disclosure, never a dead
end). Translation of the official text is a clinical-review task, not
something to auto-generate.
"""
from fastapi import APIRouter
from typing import Optional

router = APIRouter()

_CITATION = "VERIFY -- MoHFW postnatal danger signs (draft placeholder, replace with verbatim official text)"

_GUIDANCE: dict[str, list[dict]] = {
    "en": [
        {"id": f"DS-{i:02d}", "text": text, "source_citation": _CITATION, "verified": False}
        for i, text in enumerate([
            "Heavy vaginal bleeding",
            "High fever",
            "Severe headache or blurred vision",
            "Fits (convulsions)",
            "Difficulty breathing or chest pain",
            "Severe pain in the lower belly",
            "Foul-smelling vaginal discharge",
        ], start=1)
    ],
}

# Fixed routing instruction. Not derived from anything she reports.
_ACTION = {
    "type": "contact_human",
    "options": ["asha", "nearest_facility"],
    "message": "Please contact your ASHA or go to the nearest health facility.",
}


@router.get("/danger-signs")
def danger_signs(language: Optional[str] = "en"):
    served = language if language in _GUIDANCE else "en"
    return {
        "language_requested": language,
        "language_served": served,
        "fallback": served != language,
        "guidance": _GUIDANCE[served],
        "action": _ACTION,
    }
