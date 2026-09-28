"""
Auth service.

Not in the original v0 PRD scope -- added after, because the team decided
signup/login was needed before submission. Keep that context if a judge or
teammate asks why this wasn't in the original architecture diagram.

Owns: signup, login, and role-based tokens for three roles: mother, asha,
clinic. A token maps to exactly one linked_id, which other modules use to
scope what that user can see.

Mother signup creates her record: the linked_id of a mother account is the
id of a real WomanRecord (via record.router.create_woman), so her timeline
at /api/record/women/{linked_id} works straight after signup. If no
delivery_date is sent, the record is created with today's date and
incomplete=True (FR-B6: mark incomplete, never reject) -- the frontend
should ask for the delivery date at signup so this is the exception.
ASHA and clinic accounts get a placeholder id, since they have no record.

What this deliberately is NOT: production-grade auth. Passwords are salted
and hashed (PBKDF2, stdlib only, no new dependency), but there is no OTP,
no rate limiting, no password reset, and tokens are opaque random strings
held in memory (not real JWTs, no expiry). Nothing else in the backend
checks the token yet. Fine for a demo and wrong for real users -- say so
plainly if asked, same as CORS allow_origins=["*"].

An ASHA enrolling a mother who has no account of her own (the common real
case -- see PRD persona Lakshmi, "uses a phone that belongs to her
husband") still works without this module: ingestion.router's manual-entry
path creates a WomanRecord directly, no User required. Auth is additive,
not a gate in front of the existing enrolment flow.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
import hashlib
import hmac
import os
import secrets
import uuid

from record.router import create_woman, WomanRecord

router = APIRouter()

_USERS: dict[str, dict] = {}
_TOKENS: dict[str, dict] = {}
_BY_CONTACT: dict[str, str] = {}

ROLES = ("mother", "asha", "clinic")


def _hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000).hex()


def _make_linked_id(role: str) -> str:
    return f"{role}-{uuid.uuid4().hex[:8]}"


class SignupRequest(BaseModel):
    role: str
    phone_or_email: str
    password: str
    name: str
    # only used when role == "mother"; ignored for asha/clinic
    delivery_date: Optional[date] = None
    mode_of_delivery: Optional[str] = None


class LoginRequest(BaseModel):
    phone_or_email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    role: str
    linked_id: str


@router.post("/signup", response_model=AuthResponse)
def signup(req: SignupRequest):
    if req.role not in ROLES:
        raise HTTPException(400, f"role must be one of {ROLES}")
    if req.phone_or_email in _BY_CONTACT:
        raise HTTPException(409, "an account with this phone/email already exists")
    if len(req.password) < 4:
        raise HTTPException(400, "password too short")

    salt = os.urandom(16)
    user_id = str(uuid.uuid4())

    if req.role == "mother":
        record = create_woman(WomanRecord(
            name=req.name,
            delivery_date=req.delivery_date or date.today(),
            mode_of_delivery=req.mode_of_delivery,
            incomplete=req.delivery_date is None,
        ))
        linked_id = record["id"]
    else:
        linked_id = _make_linked_id(req.role)

    _USERS[user_id] = {
        "id": user_id,
        "role": req.role,
        "phone_or_email": req.phone_or_email,
        "password_hash": _hash_password(req.password, salt),
        "salt": salt.hex(),
        "name": req.name,
        "linked_id": linked_id,
    }
    _BY_CONTACT[req.phone_or_email] = user_id

    token = secrets.token_urlsafe(32)
    _TOKENS[token] = {"user_id": user_id, "role": req.role, "linked_id": linked_id}

    return AuthResponse(token=token, role=req.role, linked_id=linked_id)


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user_id = _BY_CONTACT.get(req.phone_or_email)
    if user_id is None:
        raise HTTPException(401, "no account with this phone/email")
    user = _USERS[user_id]
    salt = bytes.fromhex(user["salt"])
    candidate = _hash_password(req.password, salt)
    if not hmac.compare_digest(candidate, user["password_hash"]):
        raise HTTPException(401, "wrong password")

    token = secrets.token_urlsafe(32)
    _TOKENS[token] = {"user_id": user_id, "role": user["role"], "linked_id": user["linked_id"]}
    return AuthResponse(token=token, role=user["role"], linked_id=user["linked_id"])


def get_current_user(token: str) -> Optional[dict]:
    return _TOKENS.get(token)


@router.get("/me")
def me(token: str):
    session = get_current_user(token)
    if session is None:
        raise HTTPException(401, "invalid or expired token")
    user = _USERS[session["user_id"]]
    return {"role": user["role"], "linked_id": user["linked_id"], "name": user["name"]}
