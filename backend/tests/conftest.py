"""Older tests call record routes without a token, so they run in open mode.
New access tests switch enforcement on with monkeypatch.setenv(...)."""
import os
import tempfile
import atexit

os.environ.setdefault("PUNARNAVA_OPEN_ACCESS", "1")
os.environ.setdefault("PUNARNAVA_ALLOW_QUERY_TOKENS", "1")

# Existing tests must not write a database file; persistence has its own tests.
os.environ.setdefault("PUNARNAVA_DB_PATH", "")

# The separate diet SQLite store must not write to a developer's user database.
_diet_test_dir = tempfile.TemporaryDirectory(prefix="punarnava-diet-tests-")
atexit.register(_diet_test_dir.cleanup)
os.environ["PUNARNAVA_DIET_DB_PATH"] = os.path.join(_diet_test_dir.name, "diet.db")

# Test runs only: staff signup is open. A real server leaves this unset.
os.environ.setdefault("PUNARNAVA_STAFF_SIGNUP_OPEN", "1")
