#!/usr/bin/env python3
"""Validate ADOMS UI catalog and synthesized flow references."""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REQUIRED = [
    "README.md",
    "ADOMS_SCREEN_CATALOG.csv",
    "ADOMS_SCREEN_CATALOG.json",
    "ADOMS_102_SCREEN_FLOW_MAP.md",
    "ADOMS_DEMO_SCENARIO_CROSSWALK.md",
    "ADOMS_UI_GAP_CONFIRMATION_REGISTER.md",
]


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    raise SystemExit(1)


def main() -> None:
    missing = [name for name in REQUIRED if not (ROOT / name).is_file()]
    if missing:
        fail("missing required files: " + ", ".join(missing))

    with (ROOT / "ADOMS_SCREEN_CATALOG.csv").open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    data = json.loads((ROOT / "ADOMS_SCREEN_CATALOG.json").read_text(encoding="utf-8"))
    expected = {f"SCR-{number:03d}" for number in range(1, 103)}
    csv_ids = {row["screen_id"] for row in rows}
    json_ids = {row["screen_id"] for row in data["screens"]}
    if len(rows) != 102 or data.get("screen_count") != 102:
        fail("catalog does not contain exactly 102 screens")
    if csv_ids != expected or json_ids != expected:
        fail("catalog screen IDs do not equal SCR-001..SCR-102")

    flow_text = (ROOT / "ADOMS_102_SCREEN_FLOW_MAP.md").read_text(encoding="utf-8")
    flow_ids = set(re.findall(r"SCR-\d{3}", flow_text))
    missing_flow = sorted(expected - flow_ids)
    if missing_flow:
        fail("flow map omits: " + ", ".join(missing_flow))

    scenario_text = (ROOT / "ADOMS_DEMO_SCENARIO_CROSSWALK.md").read_text(encoding="utf-8")
    gap_text = (ROOT / "ADOMS_UI_GAP_CONFIRMATION_REGISTER.md").read_text(encoding="utf-8")
    scenario_markers = ["기존 화면 재사용", "상태변형", "신규", "SCR-"]
    missing_markers = [marker for marker in scenario_markers if marker not in scenario_text]
    if missing_markers:
        fail("scenario crosswalk lacks markers: " + ", ".join(missing_markers))
    scenario_steps = set(re.findall(r"\|\s*([1-4]-\d{2})\s*\|", scenario_text))
    expected_steps = {
        *(f"1-{number:02d}" for number in range(1, 10)),
        *(f"2-{number:02d}" for number in range(10, 18)),
        *(f"3-{number:02d}" for number in range(18, 27)),
        *(f"4-{number:02d}" for number in range(27, 33)),
    }
    if scenario_steps != expected_steps:
        fail(
            "scenario crosswalk step mismatch: missing="
            + ",".join(sorted(expected_steps - scenario_steps))
            + " extra="
            + ",".join(sorted(scenario_steps - expected_steps))
        )
    for marker in ("기관장 예방활동", "게시판", "관리자", "컨펌"):
        if marker not in gap_text:
            fail(f"gap register lacks marker: {marker}")

    area_files = sorted(ROOT.glob("AREA_*.md"))
    if len(area_files) != 8:
        fail(f"expected 8 area reports, found {len(area_files)}")

    print("[PASS] ADOMS UI flow assets validated")
    print(f"  screens: {len(expected)}")
    print(f"  area_reports: {len(area_files)}")
    print(f"  flow_mentions: {len(flow_ids & expected)}")
    print(f"  scenario_steps: {len(scenario_steps)}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, KeyError, json.JSONDecodeError) as error:
        print(f"[FAIL] {error}")
        sys.exit(1)
