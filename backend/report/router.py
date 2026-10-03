"""
Doctor report service: "view report" on the handoff screen.

This is a COMPILATION, not a calculation. It assembles data that already
exists elsewhere in the system into one page. It computes nothing new
about her, infers nothing, and produces no score, status, level, or
summary sentence about her mental or physical state. The doctor's own
judgment is what turns this into an assessment -- same as reading a paper
file today.

Guardrail for anyone editing this file later: every field below is either
copied verbatim from another module's output, or is a plain count of
existing rows (e.g. "3 milestones missed" -- a count, not a judgment).
The instant this file computes something like "recovery_score",
"mental_health_status", or "risk_level", it has crossed into clinical
risk scoring / interpretation of medical data, which are two of the six
things explicitly excluded from this build. If you're tempted to add a
field like that, stop and read docs/compliance.md first.

journal_activity is deliberately the only journal-related field, and it
is a boolean plus a count -- "has she used it, how many entries" -- never
what's in the entries, never a mood summary, never a trend. The content
of her journal is not compiled here, ever.
"""
from fastapi import APIRouter, HTTPException
import secrets
import time

from record.router import _WOMEN, _with_milestones
from selfreport.router import _ENTRIES as _SELF_ENTRIES
from clinical.router import _PRESCRIBED
from journal.router import _ENTRIES as _JOURNAL_ENTRIES

from auth.router import require_record_access

router = APIRouter()


@router.get("/{woman_id}")
def full_report(woman_id: str, token: str = None):
    require_record_access(token, woman_id)
    return build_report(woman_id)


def build_report(woman_id: str):
    if woman_id not in _WOMEN:
        raise HTTPException(404, "not found")

    rec = _with_milestones(_WOMEN[woman_id])
    self_entries = list(reversed(_SELF_ENTRIES.get(woman_id, [])))
    prescribed = list(reversed(_PRESCRIBED.get(woman_id, [])))
    journal_count = len(_JOURNAL_ENTRIES.get(woman_id, []))

    milestone_counts = {"done": 0, "due": 0, "pending": 0, "missed": 0, "not_applicable": 0}
    for m in rec["milestones"]:
        milestone_counts[m["state"]] = milestone_counts.get(m["state"], 0) + 1

    return {
        "name": rec["name"],
        "postpartum_day": rec["postpartum_day"],
        "mode_of_delivery": rec["mode_of_delivery"],
        "clinical_events": rec["clinical_events"],
        "discharge_hb": rec["discharge_hb"],
        "milestones": rec["milestones"],
        "milestone_counts": milestone_counts,
        "self_reported": self_entries,
        "prescribed_medication": prescribed,
        "journal_activity": {
            "has_entries": journal_count > 0,
            "entry_count": journal_count,
        },
    }


# ---- handoff link: a receiving clinic opens the report without an account ----
_HANDOFF: dict[str, dict] = {}
_HANDOFF_DAYS = 7


@router.post("/{woman_id}/handoff-link")
def create_handoff_link(woman_id: str, token: str = None):
    """The mother, her assigned ASHA, or a doctor creates a time-limited link.
    It opens the same compiled report above -- never her journal text."""
    require_record_access(token, woman_id)
    if woman_id not in _WOMEN:
        raise HTTPException(404, "not found")
    link = secrets.token_urlsafe(16)
    _HANDOFF[link] = {"woman_id": woman_id, "expires_at": time.time() + _HANDOFF_DAYS * 86400}
    return {"share_token": link, "expires_in_days": _HANDOFF_DAYS}


@router.get("/shared/{share_token}")
def shared_report(share_token: str):
    entry = _HANDOFF.get(share_token)
    if entry is None or entry["expires_at"] < time.time():
        raise HTTPException(404, "this link has expired or is not valid")
    return build_report(entry["woman_id"])
