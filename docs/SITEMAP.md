# Sitemap

One PWA, three role views (plus a public shell and a no-account shareable link).

| Area   | Route                        | Status              | Journey |
|--------|-------------------------------|----------------------|---------|
| Public | `/`                            | built (shell)        | — |
| Public | `/how-it-works`                | stub                 | — |
| Public | `/principles`                  | stub                 | — |
| Public | `/privacy`                     | stub                 | — |
| Mother | `/m/enrol`                     | stub                 | J1 |
| Mother | `/m` (timeline)                 | **built**             | J2 |
| Mother | `/m/item/:id`                  | stub                 | J2 |
| Mother | `/m/family`                    | stub                 | — |
| Mother | `/m/consent`                   | stub                 | — |
| ASHA   | `/a` (queue)                    | **built**             | J3 |
| ASHA   | `/a/mother/:id`                 | stub                 | J3 |
| ASHA   | `/a/mother/:id/visit`           | stub (logic lives in `/a` two-tap handler for now) | J3 |
| Clinic | `/c/handoff/:id`                | stub                 | J4 (v1) |
| Clinic | `/c/recall`                     | stub                 | J5 (v1) |
| Shared | `/s/:token`                     | stub                 | handoff, no account needed |

## What "built" means here

- Real UI, wired to `frontend/src/lib/api.js`, which calls the backend
  when reachable and falls back to `offlineStore.js` cache when not.
- Uses the actual milestone shape from `scheduler/engine.py` (citation,
  rule_id, days_overdue as the only sort key) rather than placeholder
  fields.
- Not yet: final visual design pass (PRD explicitly calls this out for the
  mother's timeline — "give it real design time"), voice/WhatsApp delivery
  wired to Sarvam AI, IndexedDB (currently localStorage stand-in).

## Next screens, in priority order

1. `/m/enrol` — J1, the manual-entry fallback form (backend shape already
   exists at `POST /api/ingestion/manual`).
2. `/a/mother/:id` — one-tap handoff summary access from the queue.
3. `/m/consent` — the spoken-consent flow the PRD flags as needing real
   design care ("the weakest consent moment in the whole product").
