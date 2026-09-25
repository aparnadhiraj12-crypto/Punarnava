# Compliance guardrails

Binding on the build (from the Master PRD/TRD, "Out of scope and compliance
guardrails"). A violation is a defect, not a design debate.

## The three build rules

1. **No scoring, ever.** The ASHA queue sorts by `days_overdue` only. No
   `priority`/`severity`/`score`/`tier`/`rank` field exists anywhere in the
   schema or code. Enforced by `scripts/compliance_audit.py` in CI.
2. **No symptom triage.** If a mother reports a symptom, the system shows
   existing government danger-sign guidance verbatim and helps her reach a
   human. It never assesses what she describes. Not mechanically checkable
   — reviewed manually at every symptom-handling PR.
3. **No generated clinical text.** The model may write an appointment
   reminder (template + slots). It may not write anything about her
   health. Patient-facing clinical content comes from an approved content
   table, unchanged, attributed. Enforced structurally: `scheduler/` and
   `outreach/` must never import a model/LLM client
   (`compliance_audit.py` greps for this).

## Where the line is genuinely close

Mapping a recorded condition to a follow-up interval could be argued to be
"interpretation of medical data" (explicitly excluded). The defence:

1. The clinician made the determination and wrote it down. We read a field.
2. The interval is published (FOGSI/ICMR/WHO). We look it up — see
   `backend/rulesets/ruleset.yaml`, never computed from patient
   characteristics.
3. The output is a calendar entry — administrative, not clinical.
4. A human confirms low-confidence inputs before anything is scheduled.

**What would break this defence, and must never be proposed:** adjusting
an interval based on a mother's particular circumstances, or prioritising
one mother over another on clinical grounds. Both will sound like
improvements. Both are out.

## Running the audit

```bash
python3 scripts/compliance_audit.py
```

Also run as part of `pytest` CI alongside the golden scheduler tests in
`backend/tests/golden/`.

## Outstanding before this touches a real mother

- [ ] Every interval/citation in `ruleset.yaml` marked `VERIFY` needs
      clinician sign-off against the published source.
- [ ] `danger_signs.yaml` (not yet created) needs the government
      danger-sign text pasted in verbatim — currently no content table
      exists for Rule 2 to point to.
- [ ] Named clinical reviewer for the W4 gate confirmed.
