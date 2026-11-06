"""Adapt saved self-reports to the existing diet engine; never read clinical records."""
from datetime import datetime, timezone

from diet.engine import build_plan
from diet.schema import DietProfile, DietCheckin
from wellness.food_options import STAGES

DISCLAIMER = (
    "Source-checked general information, not a treatment plan or individual diet. "
    "Follow your doctor or dietitian's advice. Local clinical sign-off is still required."
)


def current_checkin(rows, now=None):
    """Most recently submitted current UTC-day answer; ignore stale/future dates."""
    now = now or datetime.now(timezone.utc)
    current = []
    for row in rows:
        try:
            date = datetime.fromisoformat(str(row["date"]).replace("Z", "+00:00"))
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            if date.astimezone(timezone.utc).date() == now.date() and date <= now:
                current.append(row)
        except (KeyError, ValueError, TypeError):
            continue
    return max(current, key=lambda row: row.get("id", 0), default={})


def build_saved_guidance(profile, rows, stage):
    checkin = current_checkin(rows)
    notes = []
    symptoms = ["nausea"] if checkin.get("nausea") in ("mild", "severe") else []
    if not checkin:
        notes.append("No current UTC-day check-in. Older check-ins and profile symptoms are not treated as today's answers.")
    if checkin.get("appetite") in ("low", "high") or checkin.get("food_tolerance") == "poor":
        notes.append("Appetite and food tolerance are saved, but are not mapped to medical food advice: no verified rule for these answers is available. Poor tolerance is not assumed to mean vomiting.")
    notes.append("Weight does not set food amounts or nutrition targets. Meals below are illustrative recipes, not approved for GDM or symptom treatment.")
    if stage not in STAGES:
        return {"cards": [], "ruleset_version": None, "disclaimer": DISCLAIMER,
                "context_notes": ["Choose a stage to view applicable source information.", *notes]}
    pregnant = stage.startswith("pregnancy_")
    engine_profile = DietProfile(
        stage="pregnant" if pregnant else "postpartum",
        trimester=int(stage[-1]) if pregnant else None,
        # These selected library stages do not provide a real postpartum day;
        # zero is a schema adapter only and no day-based rules are enabled.
        postpartum_day=None if pregnant else 0,
        conditions=["gdm"] if profile.get("has_gdm") else [],
        diet_type="veg" if profile.get("is_vegetarian") or profile.get("is_vegan") else "nonveg",
    )
    plan = build_plan(engine_profile, DietCheckin(symptoms=symptoms), verified_only=True).to_dict()
    if not pregnant:
        notes.append("Pregnancy GDM and nausea sources are not applied to postpartum stages. Discuss current dietary needs with your care team.")
    if not plan["cards"]:
        notes.append("No source-checked guidance matches these saved answers and the selected stage; unverified draft advice is excluded.")
    return {**plan, "disclaimer": DISCLAIMER, "context_notes": notes}
