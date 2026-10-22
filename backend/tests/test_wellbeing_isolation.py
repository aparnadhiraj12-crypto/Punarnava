import ast
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[1]
BANNED = {"journal", "record", "selfreport", "clinical"}


@pytest.mark.parametrize("module", ["diet", "movement", "mind"])
def test_module_never_imports_her_records_or_journal(module):
    for path in (ROOT / module).glob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            names = []
            if isinstance(node, ast.Import):
                names = [a.name.split(".")[0] for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module.split(".")[0]]
            assert not (set(names) & BANNED), f"{path.name} imports {names}"