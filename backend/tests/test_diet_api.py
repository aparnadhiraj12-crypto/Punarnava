import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _auth():
    r = client.post("/api/auth/signup", json={
        "role": "asha", "phone_or_email": f"asha-{uuid.uuid4().hex[:10]}@x.in",
        "password": "password123", "name": "A"}).json()
    return {"Authorization": "Bearer " + r["token"]}


def test_plan_t1_nausea_anaemia():
    r = client.post("/api/diet/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 1, "conditions": ["anaemia"]},
        "checkin": {"symptoms": ["nausea"]},
    })
    assert r.status_code == 200
    body = r.json()
    assert [c["rule_id"] for c in body["cards"]] == [
        "DIET-SAFE-01", "DIET-SAFE-02", "DIET-STG-T1-01",
        "DIET-COND-ANAEMIA-01", "DIET-SYM-NAUSEA-01",
    ]
    assert body["ruleset_version"]
    assert "not a treatment plan" in body["disclaimer"]


def test_checkin_is_optional():
    r = client.post("/api/diet/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 1}})
    assert r.status_code == 200
    assert [c["rule_id"] for c in r.json()["cards"]] == ["DIET-STG-T1-01"]


def test_t2_has_stage_card_and_disclaimer():
    r = client.post("/api/diet/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 2}})
    assert r.status_code == 200
    assert [c["rule_id"] for c in r.json()["cards"]] == ["DIET-STG-T2-01"]
    assert r.json()["disclaimer"]


def test_invalid_profile_rejected():
    r = client.post("/api/diet/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant"}})  # trimester missing
    assert r.status_code == 422


def test_unknown_condition_rejected():
    r = client.post("/api/diet/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 1, "conditions": ["cancer"]}})
    assert r.status_code == 422


def test_bad_token_rejected():
    r = client.post("/api/diet/plan?token=not-a-real-token", json={
        "profile": {"stage": "pregnant", "trimester": 1}})
    assert r.status_code == 401


def test_each_card_carries_citation():
    r = client.post("/api/diet/plan", headers=_auth(), json={
        "profile": {"stage": "postpartum", "postpartum_day": 12, "lactating": True,
                    "conditions": ["gdm"]}})
    for c in r.json()["cards"]:
        assert c["rule_id"] and c["citation"]