"""Antenatal milestones. Placeholder shape like the other golden tests: the
intervals are DRAFT until a clinician signs them off (see ruleset.yaml)."""
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))

from fastapi.testclient import TestClient
from main import app
from record.router import create_woman, WomanRecord
from scheduler.engine import generate_milestones

client = TestClient(app)
LMP = date(2026, 1, 1)
ANC = ["antenatal_visit_1", "antenatal_visit_2", "antenatal_visit_3", "antenatal_visit_4"]


def _anc(**kw):
    return [m for m in generate_milestones(None, kw.pop("events", []), pregnancy_start_date=LMP, **kw)]


def test_pregnant_mother_gets_four_antenatal_visits_in_order():
    ms = _anc()
    assert [m.type for m in ms] == ANC
    assert [m.rule_id for m in ms] == ["ANC-01", "ANC-02", "ANC-03", "ANC-04"]
    assert [m.due_date for m in ms] == [LMP + timedelta(weeks=w) for w in (8, 20, 31, 38)]


def test_every_antenatal_rule_is_marked_for_clinical_verification():
    for m in _anc():
        assert m.citation.startswith("VERIFY")


def test_antenatal_windows_do_not_overlap():
    ms = _anc()
    for a, b in zip(ms, ms[1:]):
        assert a.window_closes < b.window_opens


def test_states_follow_the_window_dates():
    ms = {m.rule_id: m for m in _anc(today=LMP + timedelta(weeks=21))}
    assert ms["ANC-01"].state == "missed"   # window closed at week 12
    assert ms["ANC-02"].state == "due"      # weeks 14-26
    assert ms["ANC-03"].state == "pending"
    assert ms["ANC-04"].state == "pending"


def test_no_start_date_and_no_delivery_gives_no_milestones():
    assert generate_milestones(None, []) == []


def test_delivered_mother_gets_no_antenatal_visits_even_with_a_start_date():
    ms = generate_milestones(date(2026, 10, 1), [], pregnancy_start_date=LMP)
    types = {m.type for m in ms}
    assert not (types & set(ANC))
    assert "postnatal_visit" in types


def test_postpartum_schedule_is_unchanged_without_a_start_date():
    ms = generate_milestones(date(2026, 1, 1), ["gestational_diabetes"])
    types = {m.type for m in ms}
    assert not (types & set(ANC))
    assert {"postnatal_visit", "six_week_review", "postpartum_glucose_test"} <= types


def test_clinical_events_do_not_change_the_antenatal_set():
    assert [m.type for m in _anc(events=["gestational_diabetes"])] == ANC


def test_due_date_alone_is_never_turned_into_a_start_date():
    """Nothing is inferred: EDD-only mothers get no antenatal timeline until
    the start date is entered."""
    wid = create_woman(WomanRecord(
        name="EDD only", estimated_due_date=date.today() + timedelta(days=100)))["id"]
    assert client.get(f"/api/record/women/{wid}").json()["milestones"] == []


def test_record_endpoint_shows_antenatal_timeline_from_start_date():
    wid = create_woman(WomanRecord(
        name="ANC mother", pregnancy_start_date=date.today() - timedelta(days=150)))["id"]
    rec = client.get(f"/api/record/women/{wid}").json()
    assert [m["type"] for m in rec["milestones"] if m["type"] in ANC]
    assert len(rec["milestones"]) == 4


def test_marking_an_antenatal_visit_done_sticks():
    wid = create_woman(WomanRecord(
        name="ANC done", pregnancy_start_date=date.today() - timedelta(days=150)))["id"]
    r = client.post("/api/outreach/respond", json={"woman_id": wid, "rule_id": "ANC-01", "outcome": "done"})
    assert r.status_code == 200
    ms = client.get(f"/api/record/women/{wid}").json()["milestones"]
    assert next(m for m in ms if m["rule_id"] == "ANC-01")["state"] == "done"


def test_scheduler_api_accepts_a_start_date_and_rejects_neither():
    ok = client.post("/api/scheduler/generate", json={"pregnancy_start_date": "2026-01-01"})
    assert ok.status_code == 200 and len(ok.json()) == 4
    assert client.post("/api/scheduler/generate", json={}).status_code == 422