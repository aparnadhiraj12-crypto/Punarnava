"""Persistent food choices, validated swaps, and private feedback undo."""
import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))

from fastapi.testclient import TestClient
import persistence_sqlite as db
from main import app


@pytest.fixture
def ctx(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "wellness.db")
    db.init_db()
    client = TestClient(app)

    def mother():
        response = client.post("/api/auth/signup", json={
            "role": "mother", "phone_or_email": f"food-{uuid.uuid4().hex}@example.test",
            "password": "password123", "name": "Food tests",
            "delivery_date": "2026-08-01",
        })
        assert response.status_code == 200, response.text
        account = response.json()
        return account["linked_id"], {"Authorization": "Bearer " + account["token"]}

    woman_id, headers = mother()
    return client, woman_id, headers, mother


def food(key="rice-moong", stage="pregnancy_t1"):
    return f"food-{key}-{stage}"


def submit(ctx, **changes):
    client, woman_id, headers, _ = ctx
    payload = {"woman_id": woman_id, "food_id": food(), "issue": "disliked", **changes}
    return client.post(f"/api/wellness/food-feedback/{woman_id}", json=payload, headers=headers)


@pytest.mark.parametrize("changes", [
    {"alternative_id": food()},
    {"food_id": "unknown-food", "alternative_id": food("curd-rice")},
    {"alternative_id": "unknown-food"},
    {"alternative_id": food("curd-rice", "pregnancy_t2")},
    {"alternative_id": food("vegetable-poha")},
    {"alternative_id": None},
    {"alternative_id": food("curd-rice"), "stage": "pregnancy_t2"},
])
def test_invalid_swaps_do_not_write_feedback(ctx, changes):
    assert submit(ctx, issue="swapped", **changes).status_code == 422
    assert db.get_food_feedback(ctx[1]) == []


@pytest.mark.parametrize("method,endpoint,payload", [
    ("post", "daily-checkin", {}),
    ("put", "allergy-profile", {"allergens": ["milk"]}),
    ("put", "budget-profile", {"budget": "low"}),
    ("post", "food-feedback", {"food_id": food(), "issue": "worked"}),
])
def test_payload_identity_must_match_authorized_path(ctx, method, endpoint, payload):
    client, woman_id, headers, _ = ctx
    response = getattr(client, method)(f"/api/wellness/{endpoint}/{woman_id}", headers=headers,
                                       json={"woman_id": "another-mother", **payload})
    assert response.status_code == 422
    assert db.get_daily_checkins(woman_id) == []
    assert db.get_allergy_profile(woman_id) == {"allergens": []}
    assert db.get_budget_profile(woman_id)["budget"] == "medium"
    assert db.get_food_feedback(woman_id) == []


@pytest.mark.parametrize("method,endpoint,payload", [
    ("post", "daily-checkin", {"nausea": "extreme"}),
    ("post", "daily-checkin", {"appetite": "never"}),
    ("post", "daily-checkin", {"food_tolerance": "unknown"}),
    ("put", "budget-profile", {"budget": "unlimited"}),
    ("post", "food-feedback", {"food_id": food(), "issue": "anything"}),
    ("post", "food-feedback", {"food_id": food(), "issue": "worked", "alternative_id": food("curd-rice")}),
    ("post", "food-feedback", {"food_id": "unknown-food", "issue": "worked"}),
])
def test_invalid_choices_are_rejected_without_writes(ctx, method, endpoint, payload):
    client, woman_id, headers, _ = ctx
    response = getattr(client, method)(f"/api/wellness/{endpoint}/{woman_id}", headers=headers,
                                       json={"woman_id": woman_id, **payload})
    assert response.status_code == 422, response.text
    assert db.get_daily_checkins(woman_id) == []
    assert db.get_food_feedback(woman_id) == []
    assert db.get_budget_profile(woman_id)["budget"] == "medium"


def test_valid_swap_persists_and_undo_restores_original(ctx):
    client, woman_id, headers, _ = ctx
    response = submit(ctx, issue="swapped", alternative_id=food("curd-rice"),
                      stage="pregnancy_t1", region="general")
    assert response.status_code == 200, response.text
    saved = client.get(f"/api/wellness/food-feedback/{woman_id}", headers=headers).json()["feedback"]
    assert [(row["food_id"], row["issue"], row["alternative_id"]) for row in saved] == [
        (food(), "swapped", food("curd-rice"))]
    suggestions = client.get(f"/api/wellness/food-suggestions/{woman_id}", headers=headers).json()
    ids = {item["id"] for item in suggestions["suggestions"]}
    assert food() not in ids
    assert food("curd-rice") in ids
    assert client.delete(f"/api/wellness/food-feedback/{woman_id}/{food()}", headers=headers).status_code == 200
    assert [row["issue"] for row in db.get_food_feedback(woman_id)] == ["swapped", "undone"]


@pytest.mark.parametrize("excluded_id", [food(), food("curd-rice")])
@pytest.mark.parametrize("exclusion", ["feedback", "allergy", "ingredients", "vegan", "dislike", "budget", "region", "meal_types"])
def test_swaps_recheck_both_options_against_live_filters(ctx, monkeypatch, excluded_id, exclusion):
    from wellness import router as wellness

    client, woman_id, headers, _ = ctx
    # Add only the metadata needed to exercise each boundary on a real option.
    items = [dict(item) for item in wellness._CONTENT]
    target = next(item for item in items if item["id"] == excluded_id)
    if exclusion == "feedback":
        assert submit(ctx, food_id=excluded_id).status_code == 200
    elif exclusion == "allergy":
        db.upsert_allergy_profile(woman_id, ["peanut"])
        for item in items:
            item["allergen_list_complete"] = True
        target["allergens"] = ["peanut"]
    elif exclusion == "ingredients":
        db.upsert_budget_profile(woman_id, "high", ["rice"])
        target["ingredients"] = ["potato"]
    elif exclusion == "vegan":
        db.upsert_diet_profile(woman_id, {"is_vegan": True})
        for item in items:
            item["taste_tags"] = ["vegan"]
        target["taste_tags"] = ["non-veg"]
    elif exclusion == "dislike":
        db.upsert_diet_profile(woman_id, {"food_dislikes": ["potato"]})
        target["ingredients"] = ["potato"]
    elif exclusion == "budget":
        db.upsert_budget_profile(woman_id, "low", [])
        target["affordability"] = "high"
    elif exclusion == "region":
        target["region"] = "kerala"
    elif exclusion == "meal_types":
        target["meal_types"] = []
    monkeypatch.setattr(wellness, "_CONTENT", items)
    before = db.get_food_feedback(woman_id)
    response = submit(ctx, issue="swapped", alternative_id=food("curd-rice"),
                      stage="pregnancy_t1", region="punjab")
    assert response.status_code == 422, response.text
    assert db.get_food_feedback(woman_id) == before


@pytest.mark.parametrize("method,suffix", [("get", ""), ("post", ""), ("delete", "/" + food())])
def test_feedback_endpoints_require_own_mother_token(ctx, method, suffix):
    client, woman_id, headers, mother = ctx
    other_id, other_headers = mother()
    assert submit(ctx).status_code == 200
    url = f"/api/wellness/food-feedback/{woman_id}{suffix}"
    kwargs = {"json": {"woman_id": woman_id, "food_id": food(), "issue": "worked"}} if method == "post" else {}
    assert getattr(client, method)(url, headers=other_headers, **kwargs).status_code == 403
    assert getattr(client, method)(url, headers={"Authorization": "Bearer invalid"}, **kwargs).status_code == 401
    assert len(db.get_food_feedback(woman_id)) == 1
    assert db.get_food_feedback(other_id) == []


@pytest.mark.parametrize("issue", ["worked", "disliked", "nauseous", "expensive", "unavailable"])
def test_supported_feedback_choices_round_trip(ctx, issue):
    client, woman_id, headers, _ = ctx
    assert submit(ctx, issue=issue).status_code == 200
    db.init_db()  # reopening persistence must preserve her saved feedback
    saved = client.get(f"/api/wellness/food-feedback/{woman_id}", headers=headers).json()["feedback"]
    assert len(saved) == 1
    assert saved[0]["issue"] == issue
    assert "T" in saved[0]["date"]


@pytest.mark.parametrize("budget", ["low", "medium", "high"])
def test_supported_budget_choices_round_trip(ctx, budget):
    client, woman_id, headers, _ = ctx
    response = client.put(f"/api/wellness/budget-profile/{woman_id}", headers=headers,
                          json={"woman_id": woman_id, "budget": budget, "available_ingredients": ["rice"]})
    assert response.status_code == 200
    assert db.get_budget_profile(woman_id) == {"budget": budget, "available_ingredients": ["rice"]}


def test_daily_checkin_choices_round_trip_as_json_dates(ctx):
    client, woman_id, headers, _ = ctx
    response = client.post(f"/api/wellness/daily-checkin/{woman_id}", headers=headers,
                           json={"woman_id": woman_id, "nausea": "severe", "appetite": "low", "food_tolerance": "poor"})
    assert response.status_code == 200
    checkin = client.get(f"/api/wellness/daily-checkin/{woman_id}", headers=headers).json()["checkins"][0]
    assert (checkin["nausea"], checkin["appetite"], checkin["food_tolerance"]) == ("severe", "low", "poor")
    assert "T" in checkin["date"]


def test_feedback_read_returns_persisted_history_in_submission_order(ctx):
    client, woman_id, headers, _ = ctx
    assert submit(ctx, issue="disliked", date="2030-01-01T00:00:00Z").status_code == 200
    assert submit(ctx, issue="worked", date="2020-01-01T00:00:00Z").status_code == 200
    response = client.get(f"/api/wellness/food-feedback/{woman_id}", headers=headers)
    assert response.status_code == 200, response.text
    assert [row["issue"] for row in response.json()["feedback"]] == ["disliked", "worked"]
    assert all(isinstance(row["date"], str) for row in response.json()["feedback"])


def test_undo_preserves_history_without_rating_and_restores_suggestion(ctx):
    client, woman_id, headers, mother = ctx
    other_id, other_headers = mother()
    assert submit(ctx).status_code == 200
    assert submit(ctx, issue="nauseous").status_code == 200
    assert submit(ctx, food_id=food("curd-rice")).status_code == 200
    response = client.post(f"/api/wellness/food-feedback/{other_id}", headers=other_headers,
                           json={"woman_id": other_id, "food_id": food(), "issue": "disliked"})
    assert response.status_code == 200
    response = client.delete(f"/api/wellness/food-feedback/{woman_id}/{food()}", headers=headers)
    assert response.status_code == 200, response.text
    history = db.get_food_feedback(woman_id)
    assert [(row["food_id"], row["issue"]) for row in history] == [
        (food(), "disliked"), (food(), "nauseous"), (food("curd-rice"), "disliked"),
        (food(), "undone"),
    ]
    assert len(db.get_food_feedback(other_id)) == 1
    suggestions = client.get(f"/api/wellness/food-suggestions/{woman_id}", headers=headers).json()
    assert food() in {item["id"] for item in suggestions["suggestions"]}
    assert client.delete(f"/api/wellness/food-feedback/{woman_id}/{food()}", headers=headers).status_code == 200
    assert db.get_food_feedback(woman_id) == history  # repeated undo is idempotent
