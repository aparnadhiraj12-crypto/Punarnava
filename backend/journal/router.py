"""
Journal service.

Not in the original v0 PRD scope -- the PRD lists journaling under
"Deliberately deferred". Added on the team's decision, so keep that
context if a judge asks.

A private mood log: she picks an emoji, optionally writes a note, and
sees her own past entries back in order. That is ALL this module does.

Compliance boundary: nothing in this module reads, scores, summarises,
flags or reacts to what she writes. There is no score, severity, risk,
trend or streak field, and none may be added -- inferring anything from
her entries is symptom triage (Rule 2) and scoring (Rule 1). The only
operations are "append an entry" and "list my entries".

mood_emoji is restricted to a fixed set so the field stays a label, not
free text. The set is written as unicode escapes so this file stays
plain ASCII (PowerShell can mangle pasted emoji).

Still stubbed: in-memory only (resets on restart), and entries are not
yet scoped to the logged-in user via the auth token -- anyone who knows a
woman_id can read her entries. Wire get_current_user() from auth.router
in before this holds real data.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

# slightly smiling, neutral, crying, sleepy, angry (pouting) faces
ALLOWED_MOODS = {
    "\U0001F642",
    "\U0001F610",
    "\U0001F622",
    "\U0001F634",
    "\U0001F624",
}

# {woman_id: [entry, ...]}, oldest first.
_ENTRIES: dict[str, list[dict]] = {}


class JournalEntryRequest(BaseModel):
    woman_id: str
    mood_emoji: str
    note: Optional[str] = None


@router.post("/entry")
def add_entry(req: JournalEntryRequest):
    if req.mood_emoji not in ALLOWED_MOODS:
        raise HTTPException(400, "mood_emoji must be one of the supported set")
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mood_emoji": req.mood_emoji,
        "note": req.note,
    }
    _ENTRIES.setdefault(req.woman_id, []).append(entry)
    return {"status": "created", "entry": entry}


@router.get("/{woman_id}")
def list_entries(woman_id: str):
    """Newest first, so her latest entry is at the top. No filtering,
    counting or summarising on purpose."""
    entries = list(reversed(_ENTRIES.get(woman_id, [])))
    return {"entries": entries}
