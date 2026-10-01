"""Covers auth, wellness and journal. The most important tests here are
the compliance ones: no wellness or journal response may ever carry a
score, severity, risk or priority field, and wellness must not vary by a
woman's clinical history."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

FORBIDDEN = {"score", "severity", "risk", "risk_level", "priority", "tier", "flag", "acuity"}


def _keys(obj):
    """Every dict key anywhere inside a JSON-like structure."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _keys(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _keys(item)


_counter = [0]


def _signup(role="mother", **extra):
    """Real signup -> (token, linked_id). Unique contact per call."""
    _counter[0] += 1
    body = {"role": role, "phone_or_email": f"auth-{role}-{_counter[0]}@test.com",
            "password": "pw1234", "name": f"{role} {_counter[0]}",
            "delivery_date": "2026-08-01", **extra}
    r = client.post("/api/auth/signup", json=body)
    assert r.status_code == 200
    return r.json()["token"], r.json()["linked_id"]


def _mother():
    return _signup("mother")


def _clinic_token():
    return _signup("clinic")[0]


# ---- auth ----

def test_signup_then_login_round_trip():
    body = {"role": "mother", "phone_or_email": "roundtrip@test.com",
            "password": "pw1234", "name": "Round Trip"}
    s = client.post("/api/auth/signup", json=body)
    assert s.status_code == 200
    l = client.post("/api/auth/login", json={"phone_or_email": "roundtrip@test.com", "password": "pw1234"})
    assert l.status_code == 200
    assert l.json()["linked_id"] == s.json()["linked_id"]


def test_wrong_password_is_rejected():
    client.post("/api/auth/signup", json={"role": "asha", "phone_or_email": "wrongpw@test.com",
                                          "password": "pw1234", "name": "Asha"})
    r = client.post("/api/auth/login", json={"phone_or_email": "wrongpw@test.com", "password": "nope"})
    assert r.status_code == 401


def test_duplicate_signup_and_bad_role_are_rejected():
    body = {"role": "clinic", "phone_or_email": "dup@test.com", "password": "pw1234", "name": "Clinic"}
    assert client.post("/api/auth/signup", json=body).status_code == 200
    assert client.post("/api/auth/signup", json=body).status_code == 409
    bad = dict(body, phone_or_email="badrole@test.com", role="admin")
    assert client.post("/api/auth/signup", json=bad).status_code == 400


def test_me_returns_the_logged_in_user():
    s = client.post("/api/auth/signup", json={"role": "mother", "phone_or_email": "me@test.com",
                                              "password": "pw1234", "name": "Me Test"})
    r = client.get("/api/auth/me", params={"token": s.json()["token"]})
    assert r.status_code == 200 and r.json()["name"] == "Me Test"
    assert client.get("/api/auth/me", params={"token": "bogus"}).status_code == 401


# ---- wellness ----

def test_wellness_filters_by_region_and_includes_general():
    items = client.get("/api/wellness/content", params={"region": "kerala"}).json()["content"]
    regions = {c["region"] for c in items}
    assert "kerala" in regions and "general" in regions and "punjab" not in regions


def test_every_wellness_item_has_a_source_citation():
    for c in client.get("/api/wellness/content").json()["content"]:
        assert c["source_citation"].strip()


def test_wellness_ignores_clinical_history():
    """Compliance: a woman_id / clinical_events parameter must change nothing."""
    plain = client.get("/api/wellness/content", params={"region": "kerala"}).json()
    with_woman = client.get("/api/wellness/content",
                            params={"region": "kerala", "woman_id": "demo-lakshmi",
                                    "clinical_events": "gestational_diabetes"}).json()
    assert plain == with_woman


def test_provider_filters():
    r = client.get("/api/wellness/providers", params={"type": "psychiatrist"}).json()["providers"]
    assert r and all(p["type"] == "psychiatrist" for p in r)


def test_wellness_responses_carry_no_scoring_fields():
    for url in ("/api/wellness/content", "/api/wellness/providers"):
        assert not (set(_keys(client.get(url).json())) & FORBIDDEN)


# ---- journal ----

SMILE = "\U0001F642"
CRY = "\U0001F622"


def test_journal_entry_round_trip_newest_first():
    tok, wid = _mother()
    client.post("/api/journal/entry", params={"token": tok}, json={"woman_id": wid, "mood_emoji": SMILE, "note": "first"})
    client.post("/api/journal/entry", params={"token": tok}, json={"woman_id": wid, "mood_emoji": CRY})
    entries = client.get(f"/api/journal/{wid}", params={"token": tok}).json()["entries"]
    assert [e["mood_emoji"] for e in entries] == [CRY, SMILE]


def test_journal_rejects_unknown_emoji_and_scopes_by_woman():
    tok_a, wid_a = _mother()
    tok_b, wid_b = _mother()
    assert client.post("/api/journal/entry", params={"token": tok_a}, json={"woman_id": wid_a, "mood_emoji": "X"}).status_code == 400
    client.post("/api/journal/entry", params={"token": tok_a}, json={"woman_id": wid_a, "mood_emoji": SMILE})
    assert client.get(f"/api/journal/{wid_b}", params={"token": tok_b}).json()["entries"] == []


def test_journal_requires_her_own_token():
    tok_a, wid_a = _mother()
    tok_b, wid_b = _mother()
    body = {"woman_id": wid_a, "mood_emoji": SMILE, "note": "private"}
    assert client.post("/api/journal/entry", params={"token": "bogus"}, json=body).status_code == 401
    assert client.post("/api/journal/entry", params={"token": tok_b}, json=body).status_code == 403
    assert client.get(f"/api/journal/{wid_a}", params={"token": tok_b}).status_code == 403
    assert client.get(f"/api/journal/{wid_a}", params={"token": "bogus"}).status_code == 401
    assert client.get(f"/api/journal/{wid_a}").status_code == 422
    asha_tok = _signup("asha")[0]
    assert client.get(f"/api/journal/{wid_a}", params={"token": asha_tok}).status_code == 403
    assert client.post("/api/journal/entry", params={"token": tok_a}, json=body).status_code == 200


def test_journal_responses_carry_no_scoring_or_analysis_fields():
    tok, wid = _mother()
    r = client.post("/api/journal/entry", params={"token": tok}, json={"woman_id": wid, "mood_emoji": CRY, "note": "bad day"})
    assert not (set(_keys(r.json())) & FORBIDDEN)
    assert not (set(_keys(client.get(f"/api/journal/{wid}", params={"token": tok}).json())) & FORBIDDEN)


# ---- signup creates a real record for mothers ----

def test_mother_signup_creates_a_real_record():
    s = client.post("/api/auth/signup", json={
        "role": "mother", "phone_or_email": "realrec@test.com", "password": "pw1234",
        "name": "Real Record", "delivery_date": "2026-08-01", "mode_of_delivery": "LSCS"})
    assert s.status_code == 200
    r = client.get(f"/api/record/women/{s.json()['linked_id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Real Record" and body["mode_of_delivery"] == "LSCS"
    assert body["incomplete"] is False and len(body["milestones"]) > 0


def test_mother_signup_without_delivery_date_is_flagged_incomplete():
    s = client.post("/api/auth/signup", json={
        "role": "mother", "phone_or_email": "nodate@test.com", "password": "pw1234", "name": "No Date"})
    r = client.get(f"/api/record/women/{s.json()['linked_id']}")
    assert r.status_code == 200 and r.json()["incomplete"] is True


def test_asha_signup_does_not_create_a_woman_record():
    s = client.post("/api/auth/signup", json={
        "role": "asha", "phone_or_email": "norecord@test.com", "password": "pw1234", "name": "Sunita"})
    assert client.get(f"/api/record/women/{s.json()['linked_id']}").status_code == 404


# ---- signup creates a real record for mothers ----

def test_mother_signup_creates_a_real_record():
    s = client.post("/api/auth/signup", json={
        "role": "mother", "phone_or_email": "realrec@test.com", "password": "pw1234",
        "name": "Real Record", "delivery_date": "2026-08-01", "mode_of_delivery": "LSCS"})
    assert s.status_code == 200
    r = client.get(f"/api/record/women/{s.json()['linked_id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Real Record" and body["mode_of_delivery"] == "LSCS"
    assert body["incomplete"] is False and len(body["milestones"]) > 0


def test_mother_signup_without_delivery_date_is_flagged_incomplete():
    s = client.post("/api/auth/signup", json={
        "role": "mother", "phone_or_email": "nodate@test.com", "password": "pw1234", "name": "No Date"})
    r = client.get(f"/api/record/women/{s.json()['linked_id']}")
    assert r.status_code == 200 and r.json()["incomplete"] is True


def test_asha_signup_does_not_create_a_woman_record():
    s = client.post("/api/auth/signup", json={
        "role": "asha", "phone_or_email": "norecord@test.com", "password": "pw1234", "name": "Sunita"})
    assert client.get(f"/api/record/women/{s.json()['linked_id']}").status_code == 404


# ---- safety: danger-sign guidance ----

def test_danger_signs_are_fixed_content_with_citations():
    r = client.get("/api/safety/danger-signs")
    assert r.status_code == 200
    body = r.json()
    assert len(body["guidance"]) > 0
    for item in body["guidance"]:
        assert item["text"].strip() and item["source_citation"].strip()
    assert body["action"]["type"] == "contact_human"


def test_danger_signs_ignore_symptoms_and_woman_id():
    """Compliance (Rule 2): the endpoint must not react to a reported
    symptom or a woman's record. Output is identical whatever is sent."""
    plain = client.get("/api/safety/danger-signs").json()
    with_input = client.get("/api/safety/danger-signs", params={
        "symptom": "headache", "woman_id": "demo-lakshmi", "clinical_events": "hypertensive_in_pregnancy"}).json()
    assert plain == with_input


def test_danger_signs_unsupported_language_falls_back_and_says_so():
    body = client.get("/api/safety/danger-signs", params={"language": "te"}).json()
    assert body["language_served"] == "en" and body["fallback"] is True
    assert len(body["guidance"]) > 0


def test_danger_signs_carry_no_scoring_fields():
    assert not (set(_keys(client.get("/api/safety/danger-signs").json())) & FORBIDDEN)


# ---- self-report: her own log, separate from the clinical record ----

def test_self_report_round_trip_newest_first_with_safety_note():
    tok, wid = _mother()
    r1 = client.post("/api/record/self-report", params={"token": tok}, json={
        "woman_id": wid, "type": "note", "text": "feeling okay today"})
    assert r1.status_code == 200
    assert r1.json()["safety_note"]
    client.post("/api/record/self-report", params={"token": tok}, json={
        "woman_id": wid, "type": "doctor_visit", "text": "check-up",
        "visit_date": "2026-09-01", "provider_name": "Dr. Rao"})
    entries = client.get(f"/api/record/self-report/{wid}", params={"token": tok}).json()["entries"]
    assert [e["type"] for e in entries] == ["doctor_visit", "note"]
    assert entries[0]["provider_name"] == "Dr. Rao"


def test_self_report_rejects_bad_type_and_empty_text():
    tok, wid = _mother()
    base = {"woman_id": wid}
    assert client.post("/api/record/self-report", params={"token": tok}, json={**base, "type": "diagnosis", "text": "x"}).status_code == 400
    assert client.post("/api/record/self-report", params={"token": tok}, json={**base, "type": "note", "text": "   "}).status_code == 400


def test_self_report_requires_her_own_token():
    tok_a, wid_a = _mother()
    tok_b, wid_b = _mother()
    body = {"woman_id": wid_a, "type": "note", "text": "mine"}
    assert client.post("/api/record/self-report", params={"token": "bogus"}, json=body).status_code == 401
    assert client.post("/api/record/self-report", params={"token": tok_b}, json=body).status_code == 403
    assert client.get(f"/api/record/self-report/{wid_a}", params={"token": tok_b}).status_code == 403
    assert client.get(f"/api/record/self-report/{wid_a}", params={"token": "bogus"}).status_code == 401
    assert client.post("/api/record/self-report", params={"token": tok_a}, json=body).status_code == 200


def test_self_report_never_touches_the_clinical_record():
    """Compliance: logging an issue must not change her clinical_events or
    her milestones. The scheduler's defence depends on this staying true."""
    tok, wid = _mother()
    before = client.get(f"/api/record/women/{wid}").json()
    client.post("/api/record/self-report", params={"token": tok}, json={
        "woman_id": wid, "type": "issue", "text": "I think my blood pressure is high"})
    after = client.get(f"/api/record/women/{wid}").json()
    assert before["clinical_events"] == after["clinical_events"]
    assert before["milestones"] == after["milestones"]


def test_self_report_responses_carry_no_scoring_fields():
    tok, wid = _mother()
    r = client.post("/api/record/self-report", params={"token": tok}, json={"woman_id": wid, "type": "issue", "text": "some issue"})
    assert not (set(_keys(r.json())) & FORBIDDEN)
    assert not (set(_keys(client.get(f"/api/record/self-report/{wid}", params={"token": tok}).json())) & FORBIDDEN)


# ---- wellness extensions: nutrients, taste, saved plan, gym ----

def test_diet_content_has_nutrients_and_avoid_notes():
    items = [c for c in client.get("/api/wellness/content", params={"stage": "pregnancy_t3"}).json()["content"]
             if c["type"] == "diet"]
    assert items and items[0]["nutrients"]["iron_mg"] is not None


def test_exercise_content_has_subtype():
    items = client.get("/api/wellness/content", params={"stage": "postpartum_six_week"}).json()["content"]
    subtypes = {c["subtype"] for c in items if c["type"] == "exercise"}
    assert {"pelvic_floor", "cardio", "pilates"} <= subtypes


def test_gym_is_a_provider_type():
    r = client.get("/api/wellness/providers", params={"type": "gym"}).json()["providers"]
    assert r and all(p["type"] == "gym" for p in r)


def test_taste_preference_round_trip():
    wid = "taste-1"
    client.post("/api/wellness/taste-preference", json={"woman_id": wid, "tags": ["vegetarian", "spicy"]})
    r = client.get(f"/api/wellness/taste-preference/{wid}").json()
    assert r["tags"] == ["vegetarian", "spicy"]


def test_saved_plan_round_trip_includes_full_content():
    wid = "saved-1"
    content_id = client.get("/api/wellness/content").json()["content"][0]["id"]
    client.post(f"/api/wellness/saved-plan/{wid}/{content_id}")
    items = client.get(f"/api/wellness/saved-plan/{wid}").json()["items"]
    assert items and items[0]["id"] == content_id and "title" in items[0]
    client.delete(f"/api/wellness/saved-plan/{wid}/{content_id}")
    assert client.get(f"/api/wellness/saved-plan/{wid}").json()["items"] == []


# ---- meditation: sourced, stage-filtered, never journal-triggered ----

def test_meditation_techniques_have_citations():
    for t in client.get("/api/meditation/techniques").json()["techniques"]:
        assert t["source_citation"].strip()


def test_meditation_filters_by_stage_only():
    items = client.get("/api/meditation/techniques", params={"stage": "postpartum_early"}).json()["techniques"]
    assert items and all(t["stage"] == "postpartum_early" for t in items)


# ---- clinical: doctor-confirmed medication, separate from her own log ----

def test_clinic_can_add_prescribed_medication_non_clinic_cannot():
    _, wid = _mother()
    clinic = _clinic_token()
    mother_tok = _mother()[0]
    ok = client.post("/api/clinical/medication", params={"token": clinic}, json={
        "woman_id": wid, "medication_name": "Iron tablets", "dosage": "1/day",
        "prescribed_by": "Dr. Rao"})
    assert ok.status_code == 200
    body = {"woman_id": wid, "medication_name": "x", "prescribed_by": "someone"}
    assert client.post("/api/clinical/medication", params={"token": mother_tok}, json=body).status_code == 403
    assert client.post("/api/clinical/medication", params={"token": "bogus"}, json=body).status_code == 401
    entries = client.get(f"/api/clinical/medication/{wid}").json()["entries"]
    assert entries[0]["medication_name"] == "Iron tablets"


def test_her_own_medication_log_is_separate_from_prescribed():
    tok, wid = _mother()
    clinic = _clinic_token()
    client.post("/api/record/self-report", params={"token": tok}, json={
        "woman_id": wid, "type": "medication", "text": "took my iron tablet",
        "medication_name": "Iron tablets"})
    client.post("/api/clinical/medication", params={"token": clinic}, json={
        "woman_id": wid, "medication_name": "Iron tablets", "prescribed_by": "Dr. Rao"})
    her_log = client.get(f"/api/record/self-report/{wid}", params={"token": tok}).json()["entries"]
    prescribed = client.get(f"/api/clinical/medication/{wid}").json()["entries"]
    assert len(her_log) == 1 and len(prescribed) == 1
    assert "prescribed_by" not in her_log[0]
    assert "type" not in prescribed[0]


# ---- family: scoped view, journal and issues never reachable ----

def test_family_shared_view_excludes_journal_and_issues():
    tok, wid = _mother()
    clinic = _clinic_token()

    client.post("/api/journal/entry", params={"token": tok}, json={"woman_id": wid, "mood_emoji": "\U0001F622", "note": "hard day, in-laws again"})
    client.post("/api/record/self-report", params={"token": tok}, json={"woman_id": wid, "type": "issue", "text": "private issue, not for sharing"})
    client.post("/api/record/self-report", params={"token": tok}, json={"woman_id": wid, "type": "doctor_visit", "text": "routine check"})
    client.post("/api/clinical/medication", params={"token": clinic}, json={"woman_id": wid, "medication_name": "Iron", "prescribed_by": "Dr. Rao"})

    grant = client.post("/api/family/grant", params={"token": tok}, json={"woman_id": wid, "grantee_name": "husband"}).json()
    view = client.get(f"/api/family/shared-view/{grant['id']}").json()

    dumped = str(view)
    assert "in-laws" not in dumped and "hard day" not in dumped
    assert "private issue" not in dumped
    assert "doctor_visit" in dumped
    assert view["prescribed_medication"][0]["medication_name"] == "Iron"
    assert "journal" not in dumped.lower()


def test_family_grant_revocation_blocks_access():
    tok, wid = _mother()
    grant = client.post("/api/family/grant", params={"token": tok}, json={"woman_id": wid, "grantee_name": "husband"}).json()
    assert client.get(f"/api/family/shared-view/{grant['id']}").status_code == 200
    client.post(f"/api/family/grant/{grant['id']}/revoke")
    assert client.get(f"/api/family/shared-view/{grant['id']}").status_code == 403


def test_she_can_see_her_own_grant_list():
    tok, wid = _mother()
    client.post("/api/family/grant", params={"token": tok}, json={"woman_id": wid, "grantee_name": "husband"})
    grants = client.get(f"/api/family/grants/{wid}").json()["grants"]
    assert len(grants) == 1 and grants[0]["grantee_name"] == "husband"


def test_family_grant_requires_her_own_token():
    tok_a, wid_a = _mother()
    tok_b, wid_b = _mother()
    body = {"woman_id": wid_a, "grantee_name": "husband"}
    assert client.post("/api/family/grant", params={"token": "bogus"}, json=body).status_code == 401
    assert client.post("/api/family/grant", params={"token": tok_b}, json=body).status_code == 403
    assert client.get(f"/api/family/grants/{wid_a}").json()["grants"] == []
    assert client.post("/api/family/grant", params={"token": tok_a}, json=body).status_code == 200


# ---- report: compilation only, no scoring, journal presence-only ----

def test_report_is_present_but_never_scores():
    tok, wid = _mother()
    client.post("/api/journal/entry", params={"token": tok}, json={"woman_id": wid, "mood_emoji": "\U0001F622"})
    client.post("/api/journal/entry", params={"token": tok}, json={"woman_id": wid, "mood_emoji": "\U0001F642"})
    client.post("/api/record/self-report", params={"token": tok}, json={"woman_id": wid, "type": "issue", "text": "felt unwell"})

    r = client.get(f"/api/report/{wid}")
    assert r.status_code == 200
    body = r.json()
    assert body["journal_activity"] == {"has_entries": True, "entry_count": 2}
    assert "note" not in str(body["journal_activity"])
    assert body["milestone_counts"]["missed"] + body["milestone_counts"]["due"] >= 0
    assert not (set(_keys(body)) & FORBIDDEN)


def test_report_404_for_unknown_woman():
    assert client.get("/api/report/does-not-exist").status_code == 404
