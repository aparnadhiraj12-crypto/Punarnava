"""Older tests call record routes without a token, so they run in open mode.
New access tests switch enforcement on with monkeypatch.setenv(...)."""
import os

os.environ.setdefault("PUNARNAVA_OPEN_ACCESS", "1")
