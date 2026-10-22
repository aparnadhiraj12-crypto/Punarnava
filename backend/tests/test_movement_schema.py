import pytest
from pydantic import ValidationError
from movement.schema import MovementProfile, MovementCheckin, DeliveryMode, Today


def test_valid_pregnant_profile():
    p = MovementProfile(stage="pregnant", trimester=2, conditions=["hypertension"])
    assert p.doctor_said_rest is False
    assert p.delivery_mode is None


def test_postpartum_defaults_delivery_mode_to_not_sure():
    p = MovementProfile(stage="postpartum", postpartum_day=10)
    assert p.delivery_mode == DeliveryMode.not_sure


def test_postpartum_keeps_declared_delivery_mode():
    p = MovementProfile(stage="postpartum", postpartum_day=10, delivery_mode="csection")
    assert p.delivery_mode == DeliveryMode.csection


def test_pregnant_requires_trimester():
    with pytest.raises(ValidationError):
        MovementProfile(stage="pregnant")


def test_postpartum_requires_day():
    with pytest.raises(ValidationError):
        MovementProfile(stage="postpartum")


def test_unknown_condition_rejected():
    with pytest.raises(ValidationError):
        MovementProfile(stage="pregnant", trimester=1, conditions=["cancer"])


def test_unknown_delivery_mode_rejected():
    with pytest.raises(ValidationError):
        MovementProfile(stage="postpartum", postpartum_day=3, delivery_mode="forceps")


def test_doctor_said_rest_can_be_set():
    p = MovementProfile(stage="pregnant", trimester=3, doctor_said_rest=True)
    assert p.doctor_said_rest is True


def test_checkin_accepts_comfort_chips():
    c = MovementCheckin(today=["tired", "back_ache"])
    assert Today.tired in c.today


@pytest.mark.parametrize("danger", ["bleeding", "headache", "swelling", "reduced_movement", "fever"])
def test_danger_symptoms_are_not_accepted_as_chips(danger):
    with pytest.raises(ValidationError):
        MovementCheckin(today=[danger])