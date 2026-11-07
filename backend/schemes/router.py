"""Application progress recorded by a mother or her assigned ASHA."""
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth.router import require_role
from record.router import _WOMEN

router = APIRouter()
SCHEME_PROGRESS = {}
SCHEMES = ("pmmvy", "jsy")
SchemeId = Literal["pmmvy", "jsy"]


class ProgressUpdate(BaseModel):
    status: Literal["to_check", "applied", "received"]


def check_access(token: str, woman_id: str):
    session = require_role(token, {"mother", "asha"})
    linked_id = session.get("linked_id")
    if not linked_id:
        raise HTTPException(403, "Account has no linked record")
    if session["role"] == "mother" and linked_id != woman_id:
        raise HTTPException(403, "Access denied")

    woman = _WOMEN.get(woman_id)
    if woman is None:
        raise HTTPException(404, "Mother record not found")
    if session["role"] == "asha" and woman.get("assigned_asha") != linked_id:
        raise HTTPException(403, "Access denied")


@router.get("/{woman_id}")
def get_progress(woman_id: str, token: str):
    check_access(token, woman_id)
    saved = SCHEME_PROGRESS.get(woman_id, {})
    return {"schemes": {scheme: saved.get(scheme, "to_check") for scheme in SCHEMES}}


@router.put("/{woman_id}/{scheme}")
def update_progress(woman_id: str, scheme: SchemeId, req: ProgressUpdate, token: str):
    check_access(token, woman_id)
    SCHEME_PROGRESS.setdefault(woman_id, {})[scheme] = req.status
    return {"scheme": scheme, "status": req.status}
