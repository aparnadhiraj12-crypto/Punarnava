import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
FORBIDDEN = {"priority", "severity", "score", "tier", "rank", "risk_level", "acuity"}


def _auth():
    r = client.post("/api/auth/signup", json={
        "role": "asha", "phone_or_email": f"asha-{uuid.uuid4().hex[:10]}@x.in",
        "password": "password123", "name": "A"}).json()
    return {"Authorization": "Bearer " + r["token"]}


def _keys(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield k
            yield from _keys(v)
    elif isinstance(o, list):
        for i in o:
            yield from _keys(i)


def test_plan_with_feelings():
    r = client.post("/api/mind/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 2},
        "checkin": {"feelings": ["anxious"]},
    })
    assert r.status_code == 200
    body = r.json()
    assert [c["rule_id"] for c in body["cards"]] == [
        "MIND-SAFE-01", "MIND-SAFE-02", "MIND-STG-T2-01", "MIND-TODAY-ANXIOUS-01"]
    assert body["ruleset_version"] and body["disclaimer"]


def test_checkin_is_optional():
    r = client.post("/api/mind/plan", headers=_auth(), json={
        "profile": {"stage": "postpartum", "postpartum_day": 12}})
    assert r.status_code == 200
    assert [c["rule_id"] for c in r.json()["cards"]] == ["MIND-SAFE-01", "MIND-STG-PP-EARLY-01"]


def test_invalid_profile_rejected():
    r = client.post("/api/mind/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant"}})
    assert r.status_code == 422


def test_harm_word_not_accepted_as_feeling():
    r = client.post("/api/mind/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 2},
        "checkin": {"feelings": ["self_harm"]}})
    assert r.status_code == 422


def test_bad_token_rejected():
    r = client.post("/api/mind/plan?token=not-a-real-token", json={
        "profile": {"stage": "pregnant", "trimester": 1}})
    assert r.status_code == 401


def test_crisis_contacts_always_in_response():
    r = client.post("/api/mind/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 1}})
    contacts = [c for card in r.json()["cards"] for c in card["contacts"]]
    assert any(c["phone"] == "14416" for c in contacts)


def test_response_has_no_forbidden_keys():
    r = client.post("/api/mind/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 1},
        "checkin": {"feelings": ["sad", "lonely"]}})
    assert not (set(_keys(r.json())) & FORBIDDEN)