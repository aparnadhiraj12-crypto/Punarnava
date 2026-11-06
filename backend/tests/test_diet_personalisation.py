"""Source-gated guidance wired to persistent, self-reported wellness inputs."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
import uuid
import subprocess

import pytest
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).parents[1]))
import persistence_sqlite as db
from main import app
from diet.engine import build_plan
from diet.schema import DietProfile


@pytest.fixture
def ctx(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "diet.db")
    db.init_db()
    client = TestClient(app)
    account = client.post("/api/auth/signup", json={
        "role": "mother", "phone_or_email": f"diet-{uuid.uuid4().hex}@example.test",
        "password": "password123", "name": "Diet tests", "delivery_date": "2026-08-01",
    }).json()
    return client, account["linked_id"], {"Authorization": "Bearer " + account["token"]}


def suggestions(ctx, stage="pregnancy_t1"):
    client, woman_id, headers = ctx
    response = client.get(f"/api/wellness/food-suggestions/{woman_id}", headers=headers,
                          params={"stage": stage})
    assert response.status_code == 200, response.text
    return response.json()


def test_current_checkin_and_gdm_use_existing_verified_engine(ctx):
    client, woman_id, headers = ctx
    client.put(f"/api/wellness/diet-profile/{woman_id}", headers=headers,
               json={"woman_id": woman_id, "has_gdm": True, "weight_kg": 40})
    response = client.post(f"/api/wellness/daily-checkin/{woman_id}", headers=headers,
                           json={"woman_id": woman_id, "nausea": "severe", "appetite": "low",
                                 "food_tolerance": "poor"})
    assert response.status_code == 200
    result = suggestions(ctx)
    cards = result["guidance"]["cards"]
    assert {card["rule_id"] for card in cards} == {"DIET-SAFE-01", "DIET-COND-GDM-01", "DIET-SYM-NAUSEA-01"}
    assert all(not card["citation"].startswith("VERIFY") and card["limit_notes"] for card in cards)
    assert all("weight" not in card["rule_id"].lower() for card in cards)
    assert result["guidance"]["context_notes"]
    assert all("nausea" not in food["match_explanation"].lower() for food in result["suggestions"])
    assert all(food.get("is_demo") for food in result["suggestions"])
    # Re-open the SQLite connection rather than rely on a request-local cache.
    db.init_db()
    assert db.get_diet_profile(woman_id)["has_gdm"] is True
    assert db.get_daily_checkins(woman_id)[-1]["food_tolerance"] == "poor"
    assert suggestions(ctx)["guidance"] == result["guidance"]


def test_stale_future_and_old_profile_symptoms_do_not_describe_today(ctx):
    client, woman_id, headers = ctx
    client.put(f"/api/wellness/diet-profile/{woman_id}", headers=headers,
               json={"woman_id": woman_id, "nausea_level": "severe"})
    for delta in [-2, 1]:
        date = datetime.now(timezone.utc) + timedelta(days=delta)
        client.post(f"/api/wellness/daily-checkin/{woman_id}", headers=headers,
                    json={"woman_id": woman_id, "date": date.isoformat(), "nausea": "severe"})
    assert suggestions(ctx)["guidance"]["cards"] == []
    assert suggestions(ctx)["guidance"]["context_notes"]


def test_latest_submitted_current_checkin_clears_nausea(ctx):
    client, woman_id, headers = ctx
    for nausea in ["mild", "none"]:
        client.post(f"/api/wellness/daily-checkin/{woman_id}", headers=headers,
                    json={"woman_id": woman_id, "nausea": nausea})
        ids = {card["rule_id"] for card in suggestions(ctx)["guidance"]["cards"]}
        assert ("DIET-SYM-NAUSEA-01" in ids) == (nausea == "mild")


def test_verified_only_engine_excludes_draft_rules():
    profile = DietProfile(stage="pregnant", trimester=2, conditions=["gdm", "anaemia"])
    result = build_plan(profile, verified_only=True).to_dict()
    assert [card["rule_id"] for card in result["cards"]] == ["DIET-COND-GDM-01"]


def test_postpartum_does_not_reuse_pregnancy_symptom_or_gdm_advice(ctx):
    client, woman_id, headers = ctx
    client.put(f"/api/wellness/diet-profile/{woman_id}", headers=headers,
               json={"woman_id": woman_id, "has_gdm": True})
    client.post(f"/api/wellness/daily-checkin/{woman_id}", headers=headers,
                json={"woman_id": woman_id, "nausea": "severe"})
    result = suggestions(ctx, "postpartum_early")
    assert result["guidance"]["cards"] == []
    assert "pregnancy" in " ".join(result["guidance"]["context_notes"]).lower()


def test_legacy_personalized_content_uses_same_guidance_and_no_weight_claim(ctx):
    client, woman_id, headers = ctx
    client.put(f"/api/wellness/diet-profile/{woman_id}", headers=headers,
               json={"woman_id": woman_id, "has_gdm": True, "weight_kg": 35})
    response = client.get(f"/api/wellness/diet-content/{woman_id}", headers=headers,
                          params={"stage": "pregnancy_t1"})
    assert response.status_code == 200
    result = response.json()
    assert "low_weight" not in result["active_conditions"]
    assert all(not item["source_citation"].startswith("VERIFY") for item in result["for_you"])
    assert all("limit_notes" in item for item in result["content"] + result["for_you"])
    assert {item["id"] for item in result["content"]} == {item["id"] for item in suggestions(ctx)["suggestions"]}


def test_public_draft_diet_content_is_withheld_without_breaking_item_contract(ctx):
    client, _, _ = ctx
    items = client.get("/api/wellness/content").json()["content"]
    assert items
    for item in items:
        assert "limit_notes" in item
        if item["type"] == "diet" and item["source_citation"].startswith("VERIFY"):
            assert item["content_status"] == "unverified_withheld"
            assert item["nutrients"] is None
            assert "withheld" in item["body"].lower()


def test_combined_saved_filters_persist_and_explanations_describe_real_matching(ctx):
    client, woman_id, headers = ctx
    def put(endpoint, **data):
        response = client.put(f"/api/wellness/{endpoint}/{woman_id}", headers=headers,
                              json={"woman_id": woman_id, **data})
        assert response.status_code == 200, response.text
    put("diet-profile", is_vegan=True, food_dislikes=["banana"])
    put("allergy-profile", allergens=[" DAIRY ", "Groundnuts"])
    put("budget-profile", budget="low", available_ingredients=["rice"])
    db.init_db()
    result = suggestions(ctx)
    assert {item["id"] for item in result["suggestions"]} == {
        "food-rice-moong-pregnancy_t1", "food-vegetable-poha-pregnancy_t1",
    }
    for item in result["suggestions"]:
        assert "tagged vegan" in item["match_explanation"]
        assert "includes ingredients you listed: rice" in item["match_explanation"]
        assert "allergy safe" not in str(item).lower()
        assert item["filter_notes"]
        assert "limit_notes" in item
    assert client.get(f"/api/wellness/diet-profile/{woman_id}", headers=headers).json()["profile"]["is_vegan"]
    assert client.get(f"/api/wellness/allergy-profile/{woman_id}", headers=headers).json()["allergens"] == [" DAIRY ", "Groundnuts"]
    assert client.get(f"/api/wellness/budget-profile/{woman_id}", headers=headers).json()["available_ingredients"] == ["rice"]
    put("budget-profile", budget="low", available_ingredients=["not-an-ingredient"])
    result = suggestions(ctx)
    assert result["suggestions"] == []
    assert result["message"] and result["guidance"]["context_notes"]


@pytest.mark.parametrize("endpoint", ["food-suggestions", "diet-content", "diet-profile", "daily-checkin", "allergy-profile", "budget-profile", "food-feedback"])
def test_private_diet_reads_reject_invalid_and_other_mother_tokens(ctx, endpoint):
    client, woman_id, _ = ctx
    account = client.post("/api/auth/signup", json={
        "role": "mother", "phone_or_email": f"other-{uuid.uuid4().hex}@example.test",
        "password": "password123", "name": "Other", "delivery_date": "2026-08-01",
    }).json()
    url = f"/api/wellness/{endpoint}/{woman_id}"
    assert client.get(url, headers={"Authorization": "Bearer invalid-token"}).status_code == 401
    assert client.get(url, headers={"Authorization": "Bearer " + account["token"]}).status_code == 403


def test_weight_neutrality_and_unknown_stage(ctx):
    client, woman_id, headers = ctx
    outputs = []
    for weight in [35, 100]:
        client.put(f"/api/wellness/diet-profile/{woman_id}", headers=headers,
                   json={"woman_id": woman_id, "has_gdm": True, "weight_kg": weight})
        outputs.append(suggestions(ctx))
    assert outputs[0] == outputs[1]
    assert client.get(f"/api/wellness/food-suggestions/{woman_id}", headers=headers,
                      params={"stage": "unknown"}).status_code == 422


def test_diet_database_path_can_be_isolated_without_touching_default(tmp_path, monkeypatch):
    path = tmp_path / "isolated.db"
    monkeypatch.setenv("PUNARNAVA_DIET_DB_PATH", str(path))
    output = subprocess.check_output([
        sys.executable, "-c",
        "import persistence_sqlite as db; db.init_db(); print(db.DB_PATH)",
    ], text=True).strip()
    assert output == str(path)
    assert path.exists()
