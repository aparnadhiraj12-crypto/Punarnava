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
    wid = "journal-test-1"
    client.post("/api/journal/entry", json={"woman_id": wid, "mood_emoji": SMILE, "note": "first"})
    client.post("/api/journal/entry", json={"woman_id": wid, "mood_emoji": CRY})
    entries = client.get(f"/api/journal/{wid}").json()["entries"]
    assert [e["mood_emoji"] for e in entries] == [CRY, SMILE]


def test_journal_rejects_unknown_emoji_and_scopes_by_woman():
    assert client.post("/api/journal/entry", json={"woman_id": "j2", "mood_emoji": "X"}).status_code == 400
    client.post("/api/journal/entry", json={"woman_id": "j3", "mood_emoji": SMILE})
    assert client.get("/api/journal/j4").json()["entries"] == []


def test_journal_responses_carry_no_scoring_or_analysis_fields():
    wid = "journal-compliance"
    r = client.post("/api/journal/entry", json={"woman_id": wid, "mood_emoji": CRY, "note": "bad day"})
    assert not (set(_keys(r.json())) & FORBIDDEN)
    assert not (set(_keys(client.get(f"/api/journal/{wid}").json())) & FORBIDDEN)


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
