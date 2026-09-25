#!/usr/bin/env python3
"""
Compliance audit — TRD "Validation strategy, part 3."

Fails the build (exit code 1) if any of the three build rules are broken:
  Rule 1 — No scoring, ever. No sort/field named priority, severity, score,
           tier, or rank anywhere in backend/ or the milestone schema.
  Rule 2 — No symptom triage. (Manually reviewed — flagged here as a
           reminder, not mechanically checkable from code alone.)
  Rule 3 — No generated clinical text. The scheduler and outreach modules
           must not import a model/LLM client.

This is intentionally a blunt grep-based check, on purpose: the PRD's own
language is "a reviewer can read it in one sitting," and a check that is
itself hard to read defeats the point.
"""
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).parent.parent / "backend"
FORBIDDEN_FIELDS = {"priority", "severity", "score", "tier", "rank", "risk_level", "acuity"}
FORBIDDEN_IMPORTS = {"openai", "anthropic", "transformers", "torch", "sklearn"}

# scheduler.engine and outreach must never import a model client. Ingestion
# is explicitly allowed to (it's the one service permitted to call a VLM).
NO_MODEL_ZONES = ["scheduler", "outreach", "record"]

failures: list[str] = []


def check_forbidden_fields():
    for py_file in BACKEND.rglob("*.py"):
        text = py_file.read_text()
        for field in FORBIDDEN_FIELDS:
            # crude but deliberate: catches field defs, dict keys, kwargs
            if re.search(rf"['\"]?\b{field}\b['\"]?\s*[:=]", text):
                failures.append(f"[Rule 1] Forbidden field '{field}' found in {py_file.relative_to(BACKEND.parent)}")


def check_no_model_imports_in_scheduler():
    for zone in NO_MODEL_ZONES:
        zone_dir = BACKEND / zone
        if not zone_dir.exists():
            continue
        for py_file in zone_dir.rglob("*.py"):
            text = py_file.read_text()
            for lib in FORBIDDEN_IMPORTS:
                if re.search(rf"^\s*(import|from)\s+{lib}\b", text, re.MULTILINE):
                    failures.append(f"[Rule 3] Model import '{lib}' found in {py_file.relative_to(BACKEND.parent)} (must stay model-free)")


def check_ruleset_has_no_forbidden_keys():
    ruleset = BACKEND / "rulesets" / "ruleset.yaml"
    if ruleset.exists():
        text = ruleset.read_text()
        for field in FORBIDDEN_FIELDS:
            if re.search(rf"^\s*{field}\s*:", text, re.MULTILINE):
                failures.append(f"[Rule 1] Forbidden key '{field}' found in ruleset.yaml")


def main():
    check_forbidden_fields()
    check_no_model_imports_in_scheduler()
    check_ruleset_has_no_forbidden_keys()

    print("--- Rule 2 (no symptom triage) is not mechanically checkable ---")
    print("Manually confirm: any symptom-report path shows verbatim danger-sign")
    print("guidance and routes to a human, and never assesses the symptom.\n")

    if failures:
        print(f"COMPLIANCE AUDIT FAILED ({len(failures)} issue(s)):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("Compliance audit passed: no forbidden scoring fields, no model imports in protected zones.")
        sys.exit(0)


if __name__ == "__main__":
    main()
