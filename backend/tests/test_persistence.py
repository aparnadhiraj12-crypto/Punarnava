"""Proves data survives a restart. Each step runs the app in a separate Python
process against one DB file, which is what a real restart is."""
import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

BACKEND = Path(__file__).parents[1]
sys.path.insert(0, str(BACKEND))

import persistence


def _run(code: str, db: Path, **extra_env) -> str:
    env = {**os.environ, "PUNARNAVA_DB_PATH": str(db), "PUNARNAVA_OPEN_ACCESS": "", **extra_env}
    out = subprocess.run(
        [sys.executable, "-c", textwrap.dedent(code)],
        cwd=BACKEND, env=env, capture_output=True, text=True, timeout=60,
    )
    assert out.returncode == 0, out.stderr
    return out.stdout.strip().splitlines()[-1]


def test_account_journal_and_login_survive_restart(tmp_path):
    db = tmp_path / "p.db"
    first = _run("""
        import json
        from fastapi.testclient import TestClient
        from main import app
        from journal.router import ALLOWED_MOODS
        MOOD = sorted(ALLOWED_MOODS)[0]
        with TestClient(app) as c:
            r = c.post("/api/auth/signup", json={"role": "mother", "phone_or_email": "m@x.in",
                       "password": "secret123", "name": "Asha M", "delivery_date": "2026-08-01"})
            assert r.status_code == 200, r.text
            tok, wid = r.json()["token"], r.json()["linked_id"]
            j = c.post("/api/journal/entry", json={"woman_id": wid, "mood_emoji": MOOD, "note": "day one"},
                       headers={"Authorization": "Bearer " + tok})
            print(json.dumps({"token": tok, "wid": wid, "journal_status": j.status_code}))
    """, db)
    saved = json.loads(first)
    assert saved["journal_status"] == 200
    assert db.exists()

    second = _run(f"""
        import json
        from fastapi.testclient import TestClient
        from main import app
        h = {{"Authorization": "Bearer {saved['token']}"}}
        with TestClient(app) as c:
            me = c.get("/api/auth/me", headers=h)
            login = c.post("/api/auth/login", json={{"phone_or_email": "m@x.in", "password": "secret123"}})
            rec = c.get("/api/record/women/{saved['wid']}", headers=h)
            jr = c.get("/api/journal/{saved['wid']}", headers=h)
            notes = [e["note"] for e in jr.json()["entries"]] if jr.status_code == 200 else None
            print(json.dumps({{"notes": notes, "me": me.status_code, "login": login.status_code,
                              "same_linked": login.json().get("linked_id") == "{saved['wid']}",
                              "record": rec.status_code}}))
    """, db)
    assert json.loads(second) == {"notes": ["day one"], "me": 200, "login": 200,
                                  "same_linked": True, "record": 200}


def test_demo_seed_does_not_overwrite_saved_state(tmp_path):
    db = tmp_path / "p.db"
    seed = {"PUNARNAVA_SEED_DEMO": "1"}
    _run("""
        from fastapi.testclient import TestClient
        from main import app
        from record.router import _WOMEN
        with TestClient(app) as c:
            _WOMEN["demo-radha"]["assigned_asha"] = "asha-keepme"
            c.post("/api/auth/signup", json={"role": "asha", "phone_or_email": "a@x.in",
                   "password": "secret123", "name": "A"})   # a write request triggers the save
            print("ok")
    """, db, **seed)
    out = _run("""
        from fastapi.testclient import TestClient
        from main import app
        from record.router import _WOMEN
        with TestClient(app):
            print(_WOMEN["demo-radha"]["assigned_asha"], len(_WOMEN))
    """, db, **seed)
    assert out == "asha-keepme 3"


def test_unserialisable_value_fails_loudly(tmp_path, monkeypatch):
    monkeypatch.setenv("PUNARNAVA_DB_PATH", str(tmp_path / "x.db"))
    from datetime import date
    persistence.register("test.bad", {"k": {"when": date.today()}})
    try:
        with pytest.raises(TypeError):
            persistence.save_changed()
    finally:
        persistence._STORES.pop("test.bad", None)


def test_disabled_when_path_empty(monkeypatch):
    monkeypatch.setenv("PUNARNAVA_DB_PATH", "")
    assert persistence.db_path() is None
    assert persistence.save_changed() == 0
    assert persistence.load_all() == 0