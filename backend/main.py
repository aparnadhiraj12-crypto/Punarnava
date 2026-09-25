"""
PUNARNAVA v0 backend — single FastAPI app, four internal modules.

Per the PRD: do not build microservices in a five-week part-time sprint.
Module boundaries are kept honest (separate routers, separate files) so the
split into real services remains available later. The one boundary that
must never blur is scheduler <-> everything else: the scheduler stays
deterministic and model-free (see scheduler/engine.py and
scripts/compliance_audit.py).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from datetime import date, timedelta

from ingestion.router import router as ingestion_router
from record.router import router as record_router, create_woman, WomanRecord, ClinicalEvent
from scheduler.router import router as scheduler_router
from outreach.router import router as outreach_router

app = FastAPI(
    title="PUNARNAVA API",
    description="Postpartum follow-up continuity — v0 prototype backend.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion_router, prefix="/api/ingestion", tags=["ingestion"])
app.include_router(record_router, prefix="/api/record", tags=["record"])
app.include_router(scheduler_router, prefix="/api/scheduler", tags=["scheduler"])
app.include_router(outreach_router, prefix="/api/outreach", tags=["outreach"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "punarnava-v0"}


@app.on_event("startup")
def seed_demo_data():
    """Demo-only seed, matching the PRD's own persona (Lakshmi: GDM on
    metformin, significant blood loss, discharged ~44 days ago). Fixed ID
    so the frontend can hit /api/record/women/demo-lakshmi directly
    without an enrolment/auth flow. Never do this in the real v1 build."""
    create_woman(
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
    create_woman(
        WomanRecord(
            name="Radha", language="te",
            delivery_date=date.today() - timedelta(days=30),
            mode_of_delivery="normal",
            clinical_events=[ClinicalEvent(type="hypertensive_in_pregnancy")],
        ),
        fixed_id="demo-radha",
    )
    create_woman(
        WomanRecord(
            name="Saroja", language="te",
            delivery_date=date.today() - timedelta(days=8),
            mode_of_delivery="normal",
            clinical_events=[],
        ),
        fixed_id="demo-saroja",
    )
