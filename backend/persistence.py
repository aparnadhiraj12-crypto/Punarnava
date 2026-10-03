"""
Persistence for the in-memory stores: one SQLite file, snapshot-style.

Every router keeps its data in a module-level dict. This module registers those
dicts (see main.py) and:
  * load_all()     -- on startup, fills each registered dict from the DB file
  * save_changed() -- after every write request, saves any store that changed

Config: PUNARNAVA_DB_PATH = path of the SQLite file (default backend/data/punarnava.db).
        Set it to an empty string to disable persistence.

Limits: the file holds health data UNENCRYPTED (keep it on a secured disk);
single server / single uvicorn worker only; only JSON-safe values are allowed.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any

_DEFAULT_PATH = Path(__file__).parent / "data" / "punarnava.db"

_STORES: dict[str, dict] = {}
_LAST_SAVED: dict[str, str] = {}
_LOCK = threading.Lock()


def db_path() -> str | None:
    """None means persistence is disabled."""
    raw = os.environ.get("PUNARNAVA_DB_PATH")
    if raw is None:
        return str(_DEFAULT_PATH)
    return raw or None


def register(name: str, store: dict) -> None:
    """Register a module-level dict under a stable name. The name is the DB
    key, so never rename one casually -- that orphans the saved data."""
    if name in _STORES and _STORES[name] is not store:
        raise ValueError(f"store name already registered: {name}")
    _STORES[name] = store


def _connect(path: str) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    new_file = not Path(path).exists()
    conn = sqlite3.connect(path, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS stores ("
        " name TEXT PRIMARY KEY,"
        " data TEXT NOT NULL,"
        " updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
    )
    if new_file:
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
    return conn


def _dump(store: dict) -> str:
    # No `default=`: an unserialisable value must fail loudly, not be coerced.
    return json.dumps(store, sort_keys=True, separators=(",", ":"))


def load_all() -> int:
    """Fill every registered store from disk. Returns how many were restored."""
    path = db_path()
    if path is None or not Path(path).exists():
        return 0
    restored = 0
    with _LOCK:
        conn = _connect(path)
        try:
            for name, data in conn.execute("SELECT name, data FROM stores"):
                store = _STORES.get(name)
                if store is None:
                    continue
                loaded: Any = json.loads(data)
                store.clear()
                store.update(loaded)
                _LAST_SAVED[name] = _dump(store)
                restored += 1
        finally:
            conn.close()
    return restored


def save_changed() -> int:
    """Write any store that changed since the last save. Returns the count."""
    path = db_path()
    if path is None:
        return 0
    with _LOCK:
        changed: dict[str, str] = {}
        for name, store in _STORES.items():
            snapshot = None
            for _ in range(5):
                try:
                    snapshot = _dump(store)
                    break
                except RuntimeError:  # dict mutated by another thread mid-read
                    continue
            if snapshot is not None and _LAST_SAVED.get(name) != snapshot:
                changed[name] = snapshot
        if not changed:
            return 0
        conn = _connect(path)
        try:
            with conn:  # one transaction: all-or-nothing
                for name, snapshot in changed.items():
                    conn.execute(
                        "INSERT INTO stores (name, data, updated_at) "
                        "VALUES (?, ?, CURRENT_TIMESTAMP) "
                        "ON CONFLICT(name) DO UPDATE SET "
                        "data=excluded.data, updated_at=CURRENT_TIMESTAMP",
                        (name, snapshot),
                    )
            _LAST_SAVED.update(changed)
        finally:
            conn.close()
        return len(changed)


def reset_for_tests() -> None:
    _LAST_SAVED.clear()