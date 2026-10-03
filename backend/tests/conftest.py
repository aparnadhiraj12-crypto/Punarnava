"""Older tests call record routes without a token, so they run in open mode.
New access tests switch enforcement on with monkeypatch.setenv(...)."""
import os

os.environ.setdefault("PUNARNAVA_OPEN_ACCESS", "1")
os.environ.setdefault("PUNARNAVA_ALLOW_QUERY_TOKENS", "1")

# Existing tests must not write a database file; persistence has its own tests.
os.environ.setdefault("PUNARNAVA_DB_PATH", "")
