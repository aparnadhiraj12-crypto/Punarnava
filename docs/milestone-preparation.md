# Milestone preparation

`/m/item/:id` takes a scheduler `rule_id` (for example `ANC-02`), not a
mother ID. It is mother-role guarded. Journey links open the sheet; the existing
outcome buttons remain separate controls using `/api/outreach/respond`.

The sheet reads the signed-in mother's live milestone, including its due date
and completion override. It does not create a booking or alter the schedule.
Unknown IDs and rules not in her current journey return 404 with a way back.

## Private persistence

- GET/PUT `/api/preparation/women/{woman_id}/milestones/{rule_id}` require
  `require_self`: only that mother, not another mother or staff. This check also
  applies when open demo access is enabled elsewhere.
- Requests use the existing Bearer transport. The backend checks both ownership
  and that the milestone actually belongs to the current derived journey.
- PUT requires `expected_due_date` (an ISO date, `YYYY-MM-DD`) copied from the
  loaded sheet's `milestone.due_date`, alongside `questions` (up to 5,000
  characters) and `checklist` (up to 30 entries, nonblank labels up to 200
  characters, with checked flags). Extra fields are rejected; missing or invalid
  expected dates return 422. Notes are plain text, never interpreted.
- After checking ownership and resolving the live milestone, PUT compares its
  current due date to `expected_due_date`. A mismatch returns 409 without
  modifying preparation, so a corrected pregnancy date cannot silently attach
  an old form to the newly dated visit. Only questions/checklist are stored and
  returned as `preparation`; `expected_due_date` is a request-only precondition.
- The registered `preparation.visits` store is keyed by mother, rule and due
  date, so another visit/mother cannot inherit the questions. A corrected due
  date starts a separate preparation sheet; previous entries are retained.
- The existing SQLite snapshot persistence saves after writes and restores at
  startup. The same deployment limitations apply: one worker, secured disk,
  unencrypted SQLite. Disabling `PUNARNAVA_DB_PATH` disables durable storage.
- Save errors retain the current form so the mother can retry. No offline
  success is claimed; successful saves survive refresh and server restart.
- On 409 the form remains editable and explicitly explains that Journey changed
  and nothing was saved. The mother can copy her edits before using Back to
  Journey and reopening the milestone; edits are not silently moved to a new date.

## Source boundaries

Only Antenatal visit 2 currently has allowlisted expectations. The content table
in `backend/preparation/content.py` contains three short, unchanged topic
excerpts from the official ICMR workflow's second-trimester second-visit
section.[2] The PDF was downloaded and read for source checking on November 6,
2026. The source link, section, date, applicability and limitations are exposed
in the API and displayed on the sheet.

Source verification is not local clinical approval. These excerpts do not
prescribe medicines, infer conditions, or validate the draft Journey schedule.
All other milestones show their actual appointment record and personal packing
list, with an explicit notice that verified milestone guidance is unavailable
here. The default packing list is administrative, not clinical advice.

## Verification

Backend tests cover the selected record, visit isolation, source/fallback,
unauthenticated, cross-mother and authenticated ASHA/doctor/clinic denial,
stale due-date conflicts with unchanged stored notes, validation, unknown/inapplicable IDs,
independent outcome recording, and real subprocess restart persistence.
Frontend tests exercise the actual route table with API test doubles: Journey
link → visit 2 → save → unmount/remount → retained question/checklist → Journey
→ visit 1 empty. They also cover direct links, unknown IDs, login protection,
failed-save retry, conflict messaging/edit retention, and independent outcome buttons.

A real headless Chromium run against isolated API/SQLite data additionally
verified the requested refresh flow, custom checklist item, second-mother
isolation and 403s for cross-owner reads/writes, anonymous redirect, source link,
and outcome controls, with no browser JavaScript errors. Browser tooling and
its isolated data were kept outside the repository.

Run from `backend`: `python -m pytest tests/ -q`.
Run from `frontend`: `npm test && npm run build`.
Run from root: `python scripts/compliance_audit.py`.

## Sources

[2] ICMR antenatal care workflow (December 2025): https://www.icmr.gov.in/icmrobject/uploads/STWs/1771568619_ante-natalmanagementofnormalpregnancy-7.pdf
