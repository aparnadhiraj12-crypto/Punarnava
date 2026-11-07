from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import router as auth
from clinical import router as clinical
from record import router as records


@pytest.fixture
def bookings(monkeypatch):
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
    tomorrow = today + timedelta(days=1)

    def booking(day, clinic_id):
        return {"next_doctor_appointment": {
            "appointment_date": day.isoformat(),
            "clinic_id": clinic_id,
        }}

    women = {
        "reporter": booking(today, "clinic-a"),
        "same-clinic": booking(today, "clinic-a"),
        "other-clinic": booking(today, "clinic-b"),
        "other-day": booking(tomorrow, "clinic-a"),
        "old-booking": booking(today, None),
        "no-booking": {"next_doctor_appointment": None},
    }
    monkeypatch.setattr(records, "_WOMEN", women)
    monkeypatch.setattr(clinical, "_CLINIC_CLOSURE_REPORTS", {})

    # These tests isolate booking and report behavior. Authentication is mocked.
    monkeypatch.setattr(clinical, "require_role", lambda token, roles: None)
    monkeypatch.setattr(auth, "require_self", lambda token, woman_id: None)
    return women


def test_report_reaches_only_same_clinic_and_day(bookings):
    import copy

    original = copy.deepcopy(bookings)
    assert clinical.get_clinic_status("same-clinic", "test")["report"] is None

    report = clinical.report_clinic_closed("reporter", "test")["report"]
    assert report["status"] == "reported_closed"
    assert set(report) == {"status", "reported_at", "message"}
    assert clinical.get_clinic_status("same-clinic", "test")["report"] == report

    for woman_id in ("other-clinic", "other-day", "old-booking", "no-booking"):
        assert clinical.get_clinic_status(woman_id, "test")["report"] is None

    assert clinical.report_clinic_closed("same-clinic", "test")["report"] == report
    assert bookings == original


@pytest.mark.parametrize("woman_id", ["other-day", "old-booking", "no-booking"])
def test_reporting_requires_a_clinic_booking_today(bookings, woman_id):
    assert clinical.get_clinic_status(woman_id, "test")["can_report"] is False
    with pytest.raises(HTTPException) as exc:
        clinical.report_clinic_closed(woman_id, "test")
    assert exc.value.status_code == 409
    assert clinical._CLINIC_CLOSURE_REPORTS == {}
