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


def test_plan_t2_with_chips():
    r = client.post("/api/movement/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 2},
        "checkin": {"today": ["tired"]},
    })
    assert r.status_code == 200
    body = r.json()
    assert [c["rule_id"] for c in body["cards"]] == [
        "MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-03", "MOVE-STG-T2-01", "MOVE-TODAY-TIRED-01"]
    assert body["rest_gate"] is False
    assert body["ruleset_version"] and body["disclaimer"]


def test_rest_gate_via_api():
    r = client.post("/api/movement/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 3, "doctor_said_rest": True},
        "checkin": {"today": ["tired", "back_ache"]},
    })
    body = r.json()
    assert r.status_code == 200
    assert body["rest_gate"] is True
    assert body["media"] == []
    assert [c["rule_id"] for c in body["cards"]] == [
        "MOVE-GATE-01", "MOVE-SAFE-01", "MOVE-SAFE-02", "MOVE-SAFE-03"]


def test_checkin_is_optional():
    r = client.post("/api/movement/plan", headers=_auth(), json={
        "profile": {"stage": "postpartum", "postpartum_day": 12, "delivery_mode": "normal"}})
    assert r.status_code == 200
    assert "MOVE-STG-PP-NORMAL-01" in [c["rule_id"] for c in r.json()["cards"]]


def test_invalid_profile_rejected():
    r = client.post("/api/movement/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant"}})
    assert r.status_code == 422


def test_danger_symptom_chip_rejected():
    r = client.post("/api/movement/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 2},
        "checkin": {"today": ["bleeding"]}})
    assert r.status_code == 422


def test_bad_token_rejected():
    r = client.post("/api/movement/plan?token=not-a-real-token", json={
        "profile": {"stage": "pregnant", "trimester": 1}})
    assert r.status_code == 401


def test_response_has_no_forbidden_keys():
    r = client.post("/api/movement/plan", headers=_auth(), json={
        "profile": {"stage": "pregnant", "trimester": 1}})
    assert not (set(_keys(r.json())) & FORBIDDEN)