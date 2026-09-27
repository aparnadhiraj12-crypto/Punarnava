"""Proves the fix to outreach/router.py: a could-not-go reason must survive
past the request that sent it, not just be accepted and dropped."""
import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parents[1]))

from fastapi.testclient import TestClient
from main import app
from record.router import create_woman, WomanRecord

client = TestClient(app)


def _fresh_woman(name="Interaction Test Mother"):
    rec = WomanRecord(name=name, delivery_date=date(2026, 1, 1))
    return create_woman(rec)["id"]


def test_could_not_go_reason_is_persisted():
    woman_id = _fresh_woman()
    r = client.post("/api/outreach/respond", json={
        "woman_id": woman_id,
        "rule_id": "PP-ALL-02",
        "outcome": "could_not_go",
        "reason": "no_transport",
    })
    assert r.status_code == 200

    interactions = client.get(f"/api/record/women/{woman_id}/interactions").json()
    assert len(interactions) == 1
    assert interactions[0]["outcome"] == "could_not_go"
    assert interactions[0]["reason"] == "no_transport"


def test_done_still_updates_milestone_state_on_next_read():
    woman_id = _fresh_woman()
    before = client.get(f"/api/record/women/{woman_id}").json()
    rule_id = before["milestones"][0]["rule_id"]

    client.post("/api/outreach/respond", json={
        "woman_id": woman_id, "rule_id": rule_id, "outcome": "done",
    })

    after = client.get(f"/api/record/women/{woman_id}").json()
    updated = next(m for m in after["milestones"] if m["rule_id"] == rule_id)
    assert updated["state"] == "done"


def test_reason_distribution_counts_across_women():
    a, b = _fresh_woman("A"), _fresh_woman("B")
    for woman_id in (a, b):
        client.post("/api/outreach/respond", json={
            "woman_id": woman_id, "rule_id": "PP-ALL-02",
            "outcome": "could_not_go", "reason": "no_money",
        })
    counts = client.get("/api/record/interactions/reasons").json()
    assert counts["no_money"] >= 2
