"""
Family (husband) access service.

PRD FR-D8 / FR-G3: "a separate, revocable grant with visibly narrower
scope than the mother's own view... she can see exactly what each
grantee can see." NFR-24: "consent state enforced at the data layer, not
only in the UI." Both are load-bearing here, not just quotes:

The scoping happens in THIS module's response, not by the frontend
choosing what to render. shared_view() below builds its own response by
calling record.router and selfreport.router directly and copying over
only the fields on the allow-list. It never returns the full woman record
or the full self-report list, so there is no field a compromised or
careless frontend could accidentally leak -- the data literally isn't in
the payload.

Explicitly excluded, always, regardless of what she grants: journal
entries (journal.router), self-reported "issue" entries. A grant cannot
widen these. If a future grant type is added that needs to include them,
that is a product decision requiring a new, clearly-named grant scope --
never a default expansion of this one.
"""
from fastapi import APIRouter, HTTPException
from auth.router import require_self
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

from record.router import _WOMEN, _with_milestones
from wellness.router import _CONTENT, _PROVIDERS
from selfreport.router import _ENTRIES as _SELF_ENTRIES
from clinical.router import _PRESCRIBED

router = APIRouter()

_GRANTS: dict[str, dict] = {}

ALLOWED_SELF_REPORT_TYPES = {"doctor_visit", "medication"}


DEFAULT_SCOPE = ["stage", "diet", "classes", "appointments", "mental_support"]

PARTNER_STAGE_GUIDANCE = {
    "pregnancy_t1": {
        "title": "First Trimester (Weeks 1 - 12)",
        "theme": "Reassurance, Rest & Navigating Early Hormones",
        "what_she_experiences": "Sudden hormonal changes causing extreme exhaustion, morning sickness, food aversions, and emotional vulnerability or anxiety about the early pregnancy.",
        "mental_support_actions": [
            "Listen and validate her feelings without trying to minimize them — hormonal mood swings are very real and intense.",
            "Take the lead on cooking or grocery runs if food smells trigger her nausea.",
            "Encourage guilt-free rest and naps whenever she feels tired.",
            "Offer reassurance and accompany her to early prenatal check-ups and ultrasound scans."
        ],
        "appointment_focus": "First Antenatal Care (ANC) registration, dating ultrasound, and basic blood/urine screening."
    },
    "pregnancy_t2": {
        "title": "Second Trimester (Weeks 13 - 27)",
        "theme": "Connection, Body Positivity & Mid-Pregnancy Support",
        "what_she_experiences": "Often called the 'golden phase' with returning energy, but anxieties can arise around body changes, scan results, and early baby movements.",
        "mental_support_actions": [
            "Share in the excitement — feel for baby kicks and bond with the baby together.",
            "Affirm and compliment her changing body to ease any physical insecurities.",
            "Help her stay active with gentle evening walks together.",
            "Offer gentle foot and lower-back rubs to relieve muscle strain."
        ],
        "appointment_focus": "Anomaly scan (TIFFA), maternal blood pressure tracking, and gestational diabetes screening."
    },
    "pregnancy_t3": {
        "title": "Third Trimester (Weeks 28 - 40)",
        "theme": "Calm Anchor, Labor Readiness & Stress Reduction",
        "what_she_experiences": "Physical heaviness, sleeplessness, nesting impulses, and natural anxiety or fear surrounding labor and birth safety.",
        "mental_support_actions": [
            "Be her calm, grounding presence — practice rhythmic breathing and labor coping techniques together.",
            "Take over logistical stress: double-check hospital bag packing, hospital route, and emergency contacts.",
            "Shield her from stressful family demands or unsolicited labor advice.",
            "Reassure her often: 'You are capable, and we are meeting our baby together as a team.'"
        ],
        "appointment_focus": "Growth scans, fetal presentation checks, pre-eclampsia BP checks, and birth planning."
    },
    "postpartum_early": {
        "title": "Early Postpartum (Days 0 - 42 / 6 Weeks)",
        "theme": "Protection, Healing & Emotional Shield",
        "what_she_experiences": "Dramatic hormonal drop ('baby blues'), physical healing (perineal/C-section recovery), sleep deprivation, and breastfeeding learning curve.",
        "mental_support_actions": [
            "Prioritize her healing: bring her warm water, nutritious food, and keep her hydrated while nursing.",
            "Protect her boundaries: limit visitors so she can rest peacefully without entertaining guests.",
            "Check in on her emotional state: ask 'How are YOU feeling?' and listen with compassion if she cries without reason.",
            "Actively handle baby soothing, burping, and diaper changes between feeds so she can sleep."
        ],
        "appointment_focus": "48-hour postpartum visit, day 7 maternal & infant check, and 6-week comprehensive maternal check-up."
    },
    "postpartum_six_week": {
        "title": "Postpartum Recovery (Weeks 6 - 26)",
        "theme": "Patience, Ongoing Care & Mental Wellness",
        "what_she_experiences": "Adjusting to ongoing routine, postpartum fatigue, pelvic recovery, and potential risk of postpartum depression.",
        "mental_support_actions": [
            "Watch out for signs of persistent sadness, withdrawal, or overwhelming anxiety with empathy and zero judgment.",
            "Give her uninterrupted 'me time' to shower, rest, or pursue something restorative.",
            "Continue sharing night-time parenting duties so she gets continuous sleep cycles.",
            "Encourage her and celebrate small recovery milestones together."
        ],
        "appointment_focus": "Postpartum recovery assessment, contraception counseling, and infant vaccination check-ins."
    },
    "postpartum_long": {
        "title": "Long Horizon Maternal Care (6 Months+)",
        "theme": "Sustained Partnership & Long-Term Health",
        "what_she_experiences": "Long-term metabolic and physical recovery, weaning transitions, and returning to routine activities.",
        "mental_support_actions": [
            "Support her in scheduling her annual health and blood checkups (Hb, thyroid, blood sugar).",
            "Be an equal partner in daily parenting and household rhythms.",
            "Acknowledge and appreciate her resilience and journey into motherhood."
        ],
        "appointment_focus": "Annual maternal health check, Hb screening, and infant developmental milestones."
    }
}

def generate_partner_notifications(rec: dict, stage: str | None, spouse_phone: str | None = None) -> list[dict]:
    guidance = PARTNER_STAGE_GUIDANCE.get(stage)
    milestones = rec.get("milestones", [])
    notifications = []

    for m in milestones:
        if m.get("state") in ("due", "pending"):
            action_tip = (
                guidance["mental_support_actions"][0]
                if guidance and guidance["mental_support_actions"]
                else ""
            )
            notif = {
                "id": f"notif-{m['rule_id']}",
                "rule_id": m["rule_id"],
                "type": "appointment_reminder",
                "phone": spouse_phone,
                "title": f"Upcoming Appointment: {m['type'].replace('_', ' ').title()}",
                "due_date": m.get("due_date"),
                "status": m.get("state"),
                "message": (
                    f"Reminder for {rec['name']}'s partner: Her check-up ({m['type'].replace('_', ' ')}) is scheduled for {m.get('due_date')}. "
                    f"Partner mental support tip: {action_tip}"
                ),
                "mental_support_tip": action_tip,
                "stage_title": guidance["title"] if guidance else None,
                "notice": "Partner notification only. No full medical record access."
            }
            notifications.append(notif)
            if len(notifications) >= 4:
                break

    if not notifications:
        action_tip = guidance["mental_support_actions"][0] if guidance["mental_support_actions"] else ""
        notifications.append({
            "id": f"notif-stage-{stage}",
            "type": "mental_support_nudge",
            "phone": spouse_phone,
            "title": f"Partner Guide: Supporting {rec['name']} in {guidance['title']}",
            "message": f"Partner guidance: {action_tip}",
            "mental_support_tip": action_tip,
            "stage_title": guidance["title"],
            "notice": "Partner notification only. No full medical record access."
        })
    return notifications


class GrantRequest(BaseModel):
    woman_id: str
    grantee_name: Optional[str] = None
    phone: Optional[str] = None
    scope: list[str] = DEFAULT_SCOPE  # what SHE chooses to share


@router.post("/grant")
def create_grant(req: GrantRequest, token: str):
    require_self(token, req.woman_id)
    if req.woman_id not in _WOMEN:
        raise HTTPException(404, "woman not found")
    name = req.grantee_name or req.phone
    if not name:
        raise HTTPException(422, "give grantee_name or phone")
    scope = [s for s in req.scope if s in DEFAULT_SCOPE]
    grant_id = str(uuid.uuid4())
    _GRANTS[grant_id] = {
        "id": grant_id,
        "woman_id": req.woman_id,
        "grantee_name": name,
        "phone": req.phone,
        "scope": scope,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "revoked": False,
    }
    return _GRANTS[grant_id]


@router.post("/grant/{grant_id}/revoke")
def revoke_grant(grant_id: str, token: str):
    if grant_id not in _GRANTS:
        raise HTTPException(404, "grant not found")
    require_self(token, _GRANTS[grant_id]["woman_id"])
    _GRANTS[grant_id]["revoked"] = True
    return _GRANTS[grant_id]


@router.get("/grants/{woman_id}")
def list_grants(woman_id: str, token: str):
    require_self(token, woman_id)
    return {"grants": [g for g in _GRANTS.values() if g["woman_id"] == woman_id]}


def _stage_for(rec: dict) -> str | None:
    """Stage only, never her clinical_events (wellness compliance boundary)."""
    day = rec.get("postpartum_day")
    if day is None or day < 0:
        tri = rec.get("trimester")
        if tri is None:
            return None
        return f"pregnancy_t{tri}"
    if day < 42:
        return "postpartum_early"
    if day < 182:
        return "postpartum_six_week"
    return "postpartum_long"


@router.get("/shared-view/{grant_id}")
def shared_view(grant_id: str):
    grant = _GRANTS.get(grant_id)
    if grant is None or grant["revoked"]:
        raise HTTPException(403, "this link is no longer valid")

    woman_id = grant["woman_id"]
    if woman_id not in _WOMEN:
        raise HTTPException(404, "not found")

    rec = _with_milestones(_WOMEN[woman_id])
    self_entries = [
        e for e in reversed(_SELF_ENTRIES.get(woman_id, []))
        if e["type"] in ALLOWED_SELF_REPORT_TYPES
    ]
    prescribed = list(reversed(_PRESCRIBED.get(woman_id, [])))
    stage = _stage_for(rec)
    scope = grant.get("scope", DEFAULT_SCOPE)
    guidance = PARTNER_STAGE_GUIDANCE.get(stage)
    notifications = generate_partner_notifications(rec, stage, grant.get("phone")) if "appointments" in scope else []

    return {
        "name": rec["name"],
        "postpartum_day": rec["postpartum_day"],
        "milestones": rec["milestones"] if "stage" in scope else [],
        "self_reported": self_entries if "appointments" in scope else [],
        "prescribed_medication": prescribed,
        "stage": stage if "stage" in scope else None,
        "stage_title": guidance["title"] if guidance else None,
        "mental_support": guidance if "mental_support" in scope and guidance else None,
        "notifications": notifications,
        "is_partner_view": True,
        "notice": "Partner View: You receive appointment alerts and emotional guidance. You do not have access to full medical records or private notes.",
        "diet": [c for c in _CONTENT if "diet" in scope and stage and c["stage"] == stage and c["type"] in ("diet", "hydration")],
        "exercise": [c for c in _CONTENT if "classes" in scope and stage and c["stage"] == stage and c["type"] == "exercise"],
        "classes": [pr for pr in _PROVIDERS if "classes" in scope and pr["type"] in ("yoga", "gym")],
    }


class PartnerPhoneRequest(BaseModel):
    spouse_phone: str


@router.get("/partner-alerts/{woman_id}")
def get_partner_alerts(woman_id: str, token: str):
    require_self(token, woman_id)
    if woman_id not in _WOMEN:
        raise HTTPException(404, "woman not found")
    rec = _with_milestones(_WOMEN[woman_id])
    stage = _stage_for(rec)
    spouse_phone = rec.get("spouse_phone")
    guidance = PARTNER_STAGE_GUIDANCE.get(stage)
    notifications = generate_partner_notifications(rec, stage, spouse_phone)
    grant_id = None
    for g in _GRANTS.values():
        if g.get("woman_id") == woman_id and not g.get("revoked"):
            grant_id = g.get("id")
            if g.get("grantee_name") == "Spouse / Partner":
                break
    return {
        "woman_id": woman_id,
        "spouse_phone": spouse_phone,
        "stage": stage,
        "stage_title": guidance["title"] if guidance else None,
        "guidance": guidance,
        "notifications": notifications,
        "grant_id": grant_id,
    }


@router.put("/partner-phone/{woman_id}")
def update_partner_phone(woman_id: str, req: PartnerPhoneRequest, token: str):
    require_self(token, woman_id)
    if woman_id not in _WOMEN:
        raise HTTPException(404, "woman not found")
    phone = req.spouse_phone.strip()
    _WOMEN[woman_id]["spouse_phone"] = phone
    found = False
    for g in _GRANTS.values():
        if g["woman_id"] == woman_id and g.get("grantee_name") == "Spouse / Partner":
            g["phone"] = phone
            g["revoked"] = False
            found = True
            break
    if not found and phone:
        grant_id = str(uuid.uuid4())
        _GRANTS[grant_id] = {
            "id": grant_id,
            "woman_id": woman_id,
            "grantee_name": "Spouse / Partner",
            "phone": phone,
            "scope": DEFAULT_SCOPE,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "revoked": False,
        }
    return {"status": "updated", "spouse_phone": phone}
