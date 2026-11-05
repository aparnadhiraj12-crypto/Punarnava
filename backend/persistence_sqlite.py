# SQLite persistence helpers for diet personalization

import sqlite3
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any

DB_PATH = Path(__file__).with_name("punarnava.db")

def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create tables if they don't exist."""
    conn = _connect()
    cur = conn.cursor()
    # Daily check‑ins
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            woman_id TEXT NOT NULL,
            date TEXT NOT NULL,
            nausea TEXT,
            appetite TEXT,
            food_tolerance TEXT
        )
        """
    )
    # Allergy profiles (one per woman)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS allergy_profiles (
            woman_id TEXT PRIMARY KEY,
            allergens TEXT -- JSON array string
        )
        """
    )
    # Budget profiles (one per woman)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS budget_profiles (
            woman_id TEXT PRIMARY KEY,
            budget TEXT,
            ingredients TEXT -- JSON array string
        )
        """
    )
    # Food feedback (many per woman)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS food_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            woman_id TEXT NOT NULL,
            date TEXT NOT NULL,
            food_id TEXT NOT NULL,
            issue TEXT NOT NULL,
            alternative_id TEXT
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS diet_profiles (
            woman_id TEXT PRIMARY KEY,
            profile_json TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()

# Helper CRUD functions -----------------------------------------------------

def insert_daily_checkin(woman_id: str, data: Dict[str, Any]):
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO daily_checkins (woman_id, date, nausea, appetite, food_tolerance) VALUES (?,?,?,?,?)",
        (
            woman_id,
            data.get("date", datetime.now(timezone.utc).isoformat()),
            data.get("nausea"),
            data.get("appetite"),
            data.get("food_tolerance"),
        ),
    )
    conn.commit()
    conn.close()

def get_daily_checkins(woman_id: str) -> List[Dict[str, Any]]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute("SELECT * FROM daily_checkins WHERE woman_id = ? ORDER BY date", (woman_id,))
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def upsert_allergy_profile(woman_id: str, allergens: List[str]):
    import json
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO allergy_profiles (woman_id, allergens) VALUES (?,?) ON CONFLICT(woman_id) DO UPDATE SET allergens=excluded.allergens",
        (woman_id, json.dumps(allergens)),
    )
    conn.commit()
    conn.close()

def get_allergy_profile(woman_id: str) -> Dict[str, Any]:
    import json
    conn = _connect()
    cur = conn.cursor()
    cur.execute("SELECT allergens FROM allergy_profiles WHERE woman_id = ?", (woman_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return {"allergens": json.loads(row["allergens"])}
    return {"allergens": []}

def upsert_budget_profile(woman_id: str, budget: str, ingredients: List[str]):
    import json
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO budget_profiles (woman_id, budget, ingredients) VALUES (?,?,?) ON CONFLICT(woman_id) DO UPDATE SET budget=excluded.budget, ingredients=excluded.ingredients",
        (woman_id, budget, json.dumps(ingredients)),
    )
    conn.commit()
    conn.close()

def get_budget_profile(woman_id: str) -> Dict[str, Any]:
    import json
    conn = _connect()
    cur = conn.cursor()
    cur.execute("SELECT budget, ingredients FROM budget_profiles WHERE woman_id = ?", (woman_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return {"budget": row["budget"], "available_ingredients": json.loads(row["ingredients"]) }
    return {"budget": "medium", "available_ingredients": []}

def insert_food_feedback(woman_id: str, data: Dict[str, Any]):
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO food_feedback (woman_id, date, food_id, issue, alternative_id) VALUES (?,?,?,?,?)",
        (
            woman_id,
            data.get("date", datetime.now(timezone.utc).isoformat()),
            data["food_id"],
            data["issue"],
            data.get("alternative_id"),
        ),
    )
    conn.commit()
    conn.close()

def get_food_feedback(woman_id: str) -> List[Dict[str, Any]]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute("SELECT * FROM food_feedback WHERE woman_id = ? ORDER BY date", (woman_id,))
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def upsert_diet_profile(woman_id: str, profile: dict):
    """Persist a mother's self-reported diet profile."""
    import json
    payload = dict(profile)
    payload["woman_id"] = woman_id
    encoded = json.dumps(payload)
    conn = _connect()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO diet_profiles (woman_id, profile_json)
                VALUES (?, ?)
                ON CONFLICT(woman_id)
                DO UPDATE SET profile_json = excluded.profile_json
                """,
                (woman_id, encoded),
            )
    finally:
        conn.close()


def get_diet_profile(woman_id: str):
    """Return the saved profile, or None if none exists."""
    import json
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT profile_json FROM diet_profiles WHERE woman_id = ?",
            (woman_id,),
        ).fetchone()
        return json.loads(row["profile_json"]) if row else None
    finally:
        conn.close()
