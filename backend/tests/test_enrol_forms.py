"""Enrolment with exactly the payloads the two frontend forms send."""
import sys
import uuid
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
BASE = dict(woman_name="Meena", age=24, village="V", phone="9", language="te",
            gestational_diabetes=False, on_metformin=False,
            hypertensive_in_pregnancy=False, significant_blood_loss=False,
            medications=[], food_preferences=[], consent=True,
            mode_of_delivery="normal", discharge_hb=None)


def _asha():
    r = client.post("/api/auth/signup", json={
        "role": "asha", "phone_or_email": f"asha-{uuid.uuid4().hex[:10]}@x.in",
        "password": "password123", "name": "A"}).json()
    return {"Authorization": "Bearer " + r["token"]}


def test_asha_form_pregnant_with_empty_delivery_date():
    h = _asha()
    start = (date.today() - timedelta(days=150)).isoformat()
    r = client.post("/api/ingestion/manual", headers=h,
                    json={**BASE, "pregnancy_start_date": start, "delivery_date": ""})
    assert r.status_code == 200, r.text
    types = [m["type"] for m in r.json()["woman"]["milestones"]]
    assert types == [f"antenatal_visit_{i}" for i in (1, 2, 3, 4)]


def test_asha_form_delivered_with_empty_start_date():
    h = _asha()
    d = (date.today() - timedelta(days=44)).isoformat()
    r = client.post("/api/ingestion/manual", headers=h,
                    json={**BASE, "pregnancy_start_date": "", "delivery_date": d})
    assert r.status_code == 200, r.text
    assert any(m["type"] == "postnatal_visit" for m in r.json()["woman"]["milestones"])


def test_mother_form_pregnant_with_null_delivery_date():
    h = _asha()
    start = (date.today() - timedelta(days=100)).isoformat()
    r = client.post("/api/ingestion/manual", headers=h,
                    json={**BASE, "pregnancy_start_date": start, "delivery_date": None})
    assert r.status_code == 200, r.text


def test_enrolling_with_no_dates_at_all_is_still_rejected():
    h = _asha()
    r = client.post("/api/ingestion/manual", headers=h,
                    json={**BASE, "pregnancy_start_date": "", "delivery_date": ""})
    assert r.status_code == 422


def test_garbage_date_is_still_rejected():
    h = _asha()
    r = client.post("/api/ingestion/manual", headers=h,
                    json={**BASE, "delivery_date": "not-a-date"})
    assert r.status_code == 422