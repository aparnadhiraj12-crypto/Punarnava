# PUNARNAVA

> A health record that never closes.

Postpartum follow-up continuity for Indian mothers. v0 prototype built
against the Master PRD/TRD (the binding spec — see `docs/`).

## What's real vs stubbed, honestly

**Real and tested:**
- `backend/scheduler/` — deterministic, model-free scheduling engine.
  5/5 golden tests pass (`backend/tests/golden/`). Compliance audit passes
  (`scripts/compliance_audit.py`).
- `frontend/src/routes/mother/Timeline.jsx` — the mother's continuous
  timeline (pregnancy → postpartum → long-horizon), wired to the real
  milestone shape (citation, rule_id, days_overdue).
- `frontend/src/routes/asha/Queue.jsx` — ASHA queue, sorted only by
  `days_overdue`, two-tap visit recording, offline-queue-aware.

**Stubbed (shape defined, logic not implemented):**
- Ingestion (photo/PDF extraction) — manual-entry endpoint shape only.
- Record persistence — in-memory, not Postgres.
- Outreach delivery — no Sarvam AI / WhatsApp wiring yet.
- Every other route in `docs/SITEMAP.md`.

**Needs your sign-off before it touches a real mother:**
- Every interval and citation in `backend/rulesets/ruleset.yaml` is marked
  `VERIFY` — draft values written for the prototype, not yet checked
  against FOGSI/ICMR/WHO source guidance by a clinician.
- `danger_signs.yaml` doesn't exist yet — needs the government text pasted
  in verbatim for Rule 2 (no symptom triage) to have something to show.

## Running it

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
python -m pytest tests/golden/ -v       # golden scheduler tests
python ../scripts/compliance_audit.py   # the three build rules
```

Demo mothers are not created by default. Set `PUNARNAVA_SEED_DEMO=1` before
starting the backend to seed Lakshmi, Radha and Saroja for a demo. Auth tokens
are sent in the `Authorization: Bearer …` header; set
`PUNARNAVA_ALLOW_QUERY_TOKENS=1` only temporarily for legacy clients.

**Backend container:**
```bash
docker build -f backend/Dockerfile -t punarnava-api .
docker run --rm -p 8000:8000 -v punarnava-data:/data punarnava-api
```

The container stores SQLite data in `/data`; mount a persistent volume there.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Visit `/m` for the mother's timeline, `/a` for the ASHA queue.

**Clinician portal:**
```bash
cd clinician-portal
npm install
npm run dev
```
Visit `http://localhost:5174`. Clinicians sign in with an existing clinic or
doctor account, then look up a patient using her unique `PN-XXXXXX` code.
Set `VITE_API_BASE` for a deployed API and configure
`PUNARNAVA_CORS_ORIGINS` on the backend to include the portal's origin.

## Docs

- `docs/SITEMAP.md` — full route table, what's built vs stub
- `docs/compliance.md` — the three build rules and why they're enforced
  in code, not policy
- `docs/roadmap.md` — the three horizons and release phases

## Publishing to GitHub

```bash
cd punarnava
git init
git add .
git commit -m "v0 scaffold: scheduler + mother timeline + ASHA queue"
git remote add origin <your-repo-url>
git push -u origin main
```
