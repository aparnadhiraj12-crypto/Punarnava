# Diet personalisation

## Implemented boundary

The mother-facing Diet page uses `/api/wellness/food-suggestions/{woman_id}`.
The response has two deliberately separate parts:

- `suggestions`: illustrative recipes matched to saved vegetarian/vegan choices,
  dislikes, declared allergens, budget category, available ingredients and latest
  feedback. A recipe is **not** certified appropriate for GDM or symptom treatment.
- `guidance`: fixed source excerpts selected by the existing `diet.engine.build_plan`
  and `backend/rulesets/diet_rules.yaml`, not another clinical recommendation engine.
  Includes `cards`, `ruleset_version`, `disclaimer`, and `context_notes`.

Only self-reports are used. Nothing reads clinical events, makes a diagnosis,
sets a weight-based prescription, or adjusts drug/supplement doses. The saved
weight field does not change food amounts, nutrition targets or guidance.

### Source verification, 6 November 2026

The patient-facing engine calls use `verified_only=True`. Each enabled rule
requires `source_verified`, `source_url`, `verified_on`, a non-`VERIFY` citation,
and a limitations note. The text in `advice` is a short, unchanged source excerpt.
Source checking is **not clinician sign-off** or approval for use with patients.
Local clinical review remains required before real-world use.

| Rule | Official source | Scope / section |
| --- | --- | --- |
| DIET-COND-GDM-01 | NIH NIDDK, [Managing & Treating Gestational Diabetes](https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/gestational/management-treatment) | Follow a healthy eating plan; the treating team makes the individual plan. |
| DIET-SYM-NAUSEA-01 | NHS, [Vomiting and morning sickness](https://www.nhs.uk/pregnancy/common-symptoms/vomiting-and-morning-sickness/) | Things you can try yourself; page last reviewed 17 April 2024. Food examples are source information, not allergen-filtered recipes. |
| DIET-SAFE-01 | RCOG, [Pregnancy sickness, 2024 patient information](https://www.rcog.org.uk/media/ajmm3gma/pi_pregnancy-sickness_2024-lp-v13.pdf) | Page 4; fixed contact-a-doctor advice, not an assessment or classification of an answer. GP means a doctor. |

NHS and NIDDK excerpts were checked against the official pages. The RCOG public
HTML page returned HTTP 403; the official 2024 PDF was retrieved from the `www`
host and its page-four excerpt verified after normalizing PDF layout whitespace.
No draft ICMR/FOGSI citation was promoted without verification.

Rules still marked `VERIFY` remain available in the ruleset for development,
but are excluded from both patient-facing diet APIs. The stateless diet engine
API now withholds draft stage/condition cards, so a valid request may return no
cards. Draft diet paragraphs in the public wellness library and saved plans keep
their IDs and fields but have their claims and unverified nutrient figures withheld.
The compatibility `/diet-content` endpoint uses the same recipe filters and
source-gated guidance; it no longer infers low weight from a fixed threshold.

### Check-in applicability

A current check-in means a saved timestamp on the current **UTC calendar day**,
not in the future. For multiple current-day submissions, the highest database ID
wins, rather than trusting a caller-supplied timestamp to decide submission order.
Naive legacy timestamps are interpreted as UTC. Older/future answers remain in
history but do not describe today. Profile-level historical symptom fields do not
silently override today's answers.

Nausea selects the same fixed source information for mild or severe answers;
there is no symptom assessment. Low/high appetite and poor food tolerance are
saved and explained, but currently have no verified food-advice rule. Poor
food tolerance is **not** translated into vomiting. Pregnancy sources are not
applied to postpartum stages. Missing/applicability-limited guidance has an
explicit empty state instead of falling back to unverified content.

## Recipe and affordability metadata

`backend/wellness/food_options.py` is the maintained illustrative recipe table.
Stable IDs are `food-{recipe-key}-{stage}`. Every option includes `ingredients`,
`allergens`, `allergen_list_complete`, `meal_types`, `affordability`,
`affordability_estimate`, `is_demo`, `source_citation`, and `limit_notes`.

Completeness covers the **explicit listed recipe only**. It does not certify
packaged products, substitutions, manufacturing or kitchen cross-contact.
Declared-allergen filtering normalizes common names (for example dairy → milk,
groundnuts → peanut). It excludes conflicting ingredients and options with
incomplete metadata when an allergy is selected. Always check actual labels and
preparation. No “allergy-safe” guarantee is made.

Available ingredients use an **at least one ingredient** match, not an assertion
that everything needed is at home. All active filters are combined; an empty
result never silently relaxes a filter. Feedback uses the latest submitted event
per food, not the latest caller-supplied date. Explanations describe actual filters,
not claimed GDM suitability or symptom relief.

Affordability is not a surveyed or live price service. The existing low/medium/high
budget categories remain illustrative labels. Each `affordability_estimate`
contains invented, clearly labelled INR/kg assumption ranges, raw/dry or specified
ready-to-use ingredient masses, one illustrative serving and ingredient-only min/max
costs. Each boundary is computed as `sum(quantity_g / 1000 * unit_price)` and rounded
to two INR decimals (half up). Full assumptions accompany every result. Fuel,
labour, delivery, packaging and preparation losses are excluded. These quantities
are calculation examples, **not medical portion recommendations**. Real local
prices and reviewed recipe data remain future work.

## Feedback, swaps and API compatibility

- Diet profile, allergies, budget, check-ins and feedback use SQLite persistence.
- All private endpoints enforce mother-only `require_self`; path and body IDs
  must match. Invalid choices return 422 without writing.
- `POST /food-feedback/{woman_id}` supports existing issues plus `worked` and
  `swapped`. A swap must include `alternative_id`; optional `stage` and `region`
  specify the viewed context.
- Both original and replacement must still pass **current server filters**, have
  different IDs, the same stage and a shared nonempty meal category. A stale,
  same-item, unknown, filtered-out or incompatible replacement is rejected before
  persistence. Shared category does not imply nutritional equivalence.
- `GET /food-feedback/{woman_id}` returns private feedback history.
- `DELETE /food-feedback/{woman_id}/{food_id}` explicitly undoes that mother's
  active feedback for the selected item by appending a neutral `undone` event.
  History is retained; repeated undo is a no-op. It does not delete user data or
  fabricate a positive `worked` rating.
- Every content item retains `limit_notes`, including illustrative food options,
  compatibility responses and source guidance cards.

Check-in saves refresh guidance/suggestions without reloading unrelated form state.
Unsaved profile, preference and check-in answers must survive background refresh,
feedback actions and refresh failures. A failed refresh is reported separately
from a successful save so users are not told their saved check-in was lost.

## Verification

From `backend`: `python -m pytest tests/ -q`.
From `frontend`: `npm test -- --run` and `npm run build`.
From the repository root: `python scripts/compliance_audit.py`.
Permanent tests cover source gating, current/stale check-ins, weight neutrality,
recipe metadata/cost arithmetic, combined filters, persistence, feedback undo,
stale/incompatible swaps, explanations, auth boundaries and frontend refresh state.

Verified on 6 November 2026 with Python 3.12.3 and Node 24.22.2:

- `python -m pytest tests/ -q -rs`: **320 passed, 2 skipped**, one dependency-level
  Starlette/httpx deprecation warning. The skipped tests are the pre-existing mind
  and movement release gates, enabled by `PUNARNAVA_RELEASE=1`.
- `npm ci` followed by `npm test`: **3 test files, 16 tests passed** (Vitest 4.1.12).
- `npm run build`: **passed**, 92 modules transformed (Vite 7.3.7), PWA generated.
- Compliance audit and `git diff --check`: **passed**.
- Production npm audit: **zero vulnerabilities**. Development-inclusive install
  audit still reports **12 findings (3 low, 9 moderate)**; unrelated tooling
  major-version migrations were not applied. The added test runner and existing
  Vite patch were updated to avoid high/critical findings in this change.
