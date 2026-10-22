import pytest
from pydantic import ValidationError
from mind.schema import MindProfile, MindCheckin, Feeling


def test_valid_pregnant_profile():
    assert MindProfile(stage="pregnant", trimester=2).trimester == 2


def test_valid_postpartum_profile():
    assert MindProfile(stage="postpartum", postpartum_day=10).postpartum_day == 10


def test_pregnant_requires_trimester():
    with pytest.raises(ValidationError):
        MindProfile(stage="pregnant")


def test_postpartum_requires_day():
    with pytest.raises(ValidationError):
        MindProfile(stage="postpartum")


def test_postpartum_day_out_of_range_rejected():
    with pytest.raises(ValidationError):
        MindProfile(stage="postpartum", postpartum_day=900)


def test_unknown_feeling_rejected():
    with pytest.raises(ValidationError):
        MindCheckin(feelings=["happy_dance"])


@pytest.mark.parametrize("bad", ["self_harm", "suicidal", "harm_baby", "depressed", "hopeless"])
def test_harm_and_diagnosis_words_are_not_accepted_as_feelings(bad):
    with pytest.raises(ValidationError):
        MindCheckin(feelings=[bad])


def test_checkin_accepts_fixed_feelings():
    c = MindCheckin(feelings=["anxious", "not_sleeping"])
    assert Feeling.anxious in c.feelings