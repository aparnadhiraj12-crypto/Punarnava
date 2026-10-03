"""
PUNARNAVA v0 backend — single FastAPI app, four internal modules.

Per the PRD: do not build microservices in a five-week part-time sprint.
Module boundaries are kept honest (separate routers, separate files) so the
split into real services remains available later. The one boundary that
must never blur is scheduler <-> everything else: the scheduler stays
deterministic and model-free (see scheduler/engine.py and
scripts/compliance_audit.py).
"""
from contextlib import asynccontextmanager
from urllib.parse import parse_qsl, urlencode

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from datetime import date, timedelta

from ingestion.router import router as ingestion_router
from record.router import router as record_router, create_woman, WomanRecord, ClinicalEvent
from scheduler.router import router as scheduler_router
from outreach.router import router as outreach_router
from auth.router import router as auth_router
from wellness.router import router as wellness_router
from journal.router import router as journal_router
from safety.router import router as safety_router
from selfreport.router import router as selfreport_router
from clinical.router import router as clinical_router
from meditation.router import router as meditation_router
from family.router import router as family_router
from report.router import router as report_router

import persistence
from auth.router import _USERS, _TOKENS, _BY_CONTACT, cleanup_expired_tokens
from journal.router import _ENTRIES as _JOURNAL_ENTRIES, _SHARED_WITH_DOCTOR
from selfreport.router import _ENTRIES as _SELFREPORT_ENTRIES
from record.router import _WOMEN, _COMPLETIONS, _INTERACTIONS, _VISITS
from clinical.router import _PRESCRIBED
from wellness.router import _TASTE_PREFS, _SAVED_PLANS
from family.router import _GRANTS
from report.router import _HANDOFF
from ingestion.router import _BY_CLIENT_ID

# Every store that must survive a restart. The name is the DB key: don't rename.
persistence.register("auth.users", _USERS)
persistence.register("auth.tokens", _TOKENS)
persistence.register("auth.by_contact", _BY_CONTACT)
persistence.register("journal.entries", _JOURNAL_ENTRIES)
persistence.register("journal.shared_with_doctor", _SHARED_WITH_DOCTOR)
persistence.register("selfreport.entries", _SELFREPORT_ENTRIES)
persistence.register("record.women", _WOMEN)
persistence.register("record.completions", _COMPLETIONS)
persistence.register("record.interactions", _INTERACTIONS)
persistence.register("record.visits", _VISITS)
persistence.register("clinical.prescribed", _PRESCRIBED)
persistence.register("wellness.taste_prefs", _TASTE_PREFS)
persistence.register("wellness.saved_plans", _SAVED_PLANS)
persistence.register("family.grants", _GRANTS)
persistence.register("report.handoff", _HANDOFF)
persistence.register("ingestion.by_client_id", _BY_CLIENT_ID)

@asynccontextmanager
async def lifespan(app):
    """Restore persisted stores before pruning tokens and optional demo data."""
    persistence.load_all()
    if cleanup_expired_tokens():
        persistence.save_changed()
    if os.environ.get("PUNARNAVA_SEED_DEMO") == "1":
        seed_demo_data()
    yield


app = FastAPI(
    title="PUNARNAVA API",
    description="Postpartum follow-up continuity — v0 prototype backend.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "PUNARNAVA_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
    ).split(","),  # set PUNARNAVA_CORS_ORIGINS for a deployed site
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def save_after_write(request, call_next):
    """Persist after any request that may have changed data."""
    response = await call_next(request)
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and response.status_code < 500:
        persistence.save_changed()
    return response


@app.middleware("http")
async def bearer_token_only(request: Request, call_next):
    """Bridge Bearer auth to existing router parameters; allow query migration only by opt-in."""
    query = parse_qsl(request.scope["query_string"].decode(), keep_blank_values=True)
    if any(key == "token" for key, _ in query) and os.environ.get("PUNARNAVA_ALLOW_QUERY_TOKENS") != "1":
        return JSONResponse({"detail": "pass tokens in the Authorization header"}, status_code=400)
    authorization = request.headers.get("authorization")
    if authorization:
        scheme, separator, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not separator or not token.strip():
            return JSONResponse({"detail": "invalid Authorization header"}, status_code=401)
        query = [(key, value) for key, value in query if key != "token"]
        query.append(("token", token.strip()))
        request.scope["query_string"] = urlencode(query).encode()
    return await call_next(request)


app.include_router(ingestion_router, prefix="/api/ingestion", tags=["ingestion"])
app.include_router(record_router, prefix="/api/record", tags=["record"])
app.include_router(scheduler_router, prefix="/api/scheduler", tags=["scheduler"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(wellness_router, prefix="/api/wellness", tags=["wellness"])
app.include_router(outreach_router, prefix="/api/outreach", tags=["outreach"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(journal_router, prefix="/api/journal", tags=["journal"])
app.include_router(safety_router, prefix="/api/safety", tags=["safety"])
app.include_router(selfreport_router, prefix="/api/record", tags=["self-report"])
app.include_router(clinical_router, prefix="/api/clinical", tags=["clinical"])
app.include_router(meditation_router, prefix="/api/meditation", tags=["meditation"])
app.include_router(family_router, prefix="/api/family", tags=["family"])
app.include_router(report_router, prefix="/api/report", tags=["report"])

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "punarnava-v0"}


def _seed(record, fixed_id):
    """Create a demo mother only if she isn't already there."""
    if fixed_id not in _WOMEN:
        create_woman(record, fixed_id=fixed_id)


def seed_demo_data():
    """Opt-in demo seed, matching the PRD's own persona (Lakshmi: GDM on
    metformin, significant blood loss, discharged ~44 days ago). Fixed ID
    so the frontend can hit /api/record/women/demo-lakshmi directly
    without an enrolment/auth flow. Enable only with PUNARNAVA_SEED_DEMO=1."""
    _seed(
        WomanRecord(
            name="Lakshmi",
            language="te",
            delivery_date=date.today() - timedelta(days=44),
            mode_of_delivery="LSCS",
            clinical_events=[
                ClinicalEvent(type="gestational_diabetes", source="manual"),
                ClinicalEvent(type="significant_blood_loss", source="manual"),
            ],
            discharge_hb=8.2,
        ),
        fixed_id="demo-lakshmi",
    )
    # a couple more so the ASHA queue isn't a queue of one
    _seed(
        WomanRecord(
            name="Radha", language="te",
            delivery_date=date.today() - timedelta(days=30),
            mode_of_delivery="normal",
            clinical_events=[ClinicalEvent(type="hypertensive_in_pregnancy")],
        ),
        fixed_id="demo-radha",
    )
    _seed(
        WomanRecord(
            name="Saroja", language="te",
            delivery_date=date.today() - timedelta(days=8),
            mode_of_delivery="normal",
            clinical_events=[],
        ),
        fixed_id="demo-saroja",
    )
    persistence.save_changed()
