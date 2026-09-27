"""
Golden scenario tests -- TRD C2, "clinician writes the case, engineers make
it pass." Each test is: a record's facts in, the milestone set a clinician
says should result, out. These run in CI and a failure blocks merge.

STATUS: written by an engineer as a placeholder shape. NOT yet reviewed by
a clinician. Replace/extend with the ~30 cases from the W4 clinical review
gate before relying on this for anything real.
"""
import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parents[2]))

from scheduler.engine import generate_milestones


def test_gdm_mother_gets_glucose_test():
    """The worked example from the pitch deck: her card says gestational
    diabetes on metformin, so a glucose test is due at six weeks."""
    milestones = generate_milestones(
        delivery_date=date(2026, 1, 1),
        clinical_events=["gestational_diabetes"],
    )
    types = [m.type for m in milestones]
    assert "postpartum_glucose_test" in types

    glucose = next(m for m in milestones if m.type == "postpartum_glucose_test")
    assert glucose.due_date == date(2026, 2, 12)  # +6 weeks
    assert glucose.rule_id == "PP-GDM-01"
    assert glucose.citation  # must always carry a citation


def test_no_gdm_no_glucose_test():
    """A mother with no recorded GDM must not get a glucose-test milestone.
    Nothing may be inferred beyond what was transcribed."""
    milestones = generate_milestones(delivery_date=date(2026, 1, 1), clinical_events=[])
    types = [m.type for m in milestones]
    assert "postpartum_glucose_test" not in types


def test_every_woman_gets_baseline_milestones():
    """PP-ALL-* rules fire regardless of clinical events."""
    milestones = generate_milestones(delivery_date=date(2026, 1, 1), clinical_events=[])
    types = [m.type for m in milestones]
    assert "postnatal_visit" in types
    assert "six_week_review" in types


def test_days_overdue_is_the_only_orderable_field():
    """Compliance check embedded as a test: Milestone objects must not
    expose any field named priority/severity/score/tier/rank."""
    milestones = generate_milestones(delivery_date=date(2020, 1, 1), clinical_events=["gestational_diabetes"])
    forbidden = {"priority", "severity", "score", "tier", "rank"}
    for m in milestones:
        assert forbidden.isdisjoint(vars(m).keys())


def test_state_is_pending_before_window_opens():
    """PP-ALL-02 (six_week_review) window opens 1 week before due. The day
    after delivery, we're nowhere near that window yet."""
    milestones = generate_milestones(
        delivery_date=date(2026, 1, 1),
        clinical_events=[],
        today=date(2026, 1, 2),
    )
    review = next(m for m in milestones if m.type == "six_week_review")
    assert review.state == "pending"


def test_state_is_due_inside_the_window():
    """Due date is delivery + 6 weeks = 2026-02-12. Window opens 1 week
    before that (2026-02-05). On the due date itself, state must be "due"."""
    milestones = generate_milestones(
        delivery_date=date(2026, 1, 1),
        clinical_events=[],
        today=date(2026, 2, 12),
    )
    review = next(m for m in milestones if m.type == "six_week_review")
    assert review.state == "due"


def test_state_is_missed_after_window_closes():
    """Window closes 2 weeks after due (2026-02-26). A month later, it's missed."""
    milestones = generate_milestones(
        delivery_date=date(2026, 1, 1),
        clinical_events=[],
        today=date(2026, 3, 20),
    )
    review = next(m for m in milestones if m.type == "six_week_review")
    assert review.state == "missed"


def test_all_three_conditions_together_each_get_their_own_milestone():
    """A mother with GDM, hypertension and significant blood loss all at
    once must get all three condition-triggered milestones, none dropped."""
    milestones = generate_milestones(
        delivery_date=date(2026, 1, 1),
        clinical_events=["gestational_diabetes", "hypertensive_in_pregnancy", "significant_blood_loss"],
    )
    types = {m.type for m in milestones}
    assert {"postpartum_glucose_test", "blood_pressure_review", "haemoglobin_recheck"} <= types


def test_multiple_conditions_each_produce_their_own_milestone():
    milestones = generate_milestones(
        delivery_date=date(2026, 1, 1),
        clinical_events=["gestational_diabetes", "hypertensive_in_pregnancy"],
    )
    types = {m.type for m in milestones}
    assert "postpartum_glucose_test" in types
    assert "blood_pressure_review" in types
