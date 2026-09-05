#!/usr/bin/env python3
"""Build a deterministic catalog from an extracted ADOMS UI specification pack."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from PIL import Image


def clean(value: str | None) -> str:
    return (value or "").strip().lstrip("\ufeff")


def normalize_group(title: str) -> str:
    value = re.sub(r"^\d{3}_", "", title)
    value = re.sub(r"\s*\(계속\)\s*$", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def screen_number(screen_id: str) -> int:
    match = re.search(r"(\d+)$", screen_id)
    if not match:
        raise ValueError(f"Invalid screen id: {screen_id}")
    return int(match.group(1))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def find_image(root: Path, row: dict[str, str], number: int) -> Path:
    images = root / "images"
    candidates = []
    for key in ("newName", "new_raw", "imageName"):
        value = clean(row.get(key))
        if value:
            candidates.append(images / (value if value.lower().endswith(".png") else f"{value}.png"))
    candidates.extend(sorted(images.glob(f"{number:03d}_*.png")))
    candidates.append(images / f"img{number:03d}.png")
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"No image for {row.get('screen_id')}: {candidates}")


def infer_state_relation(row: dict[str, str], group_size: int) -> str:
    title = clean(row.get("newName"))
    caption = clean(row.get("caption"))
    part = clean(row.get("part"))
    if "계속" in title or "계속" in caption or (part.isdigit() and int(part) > 1):
        return "same_screen_continuation_or_state"
    if group_size > 1:
        return "same_feature_variant_or_state"
    return "standalone_screen_cut"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    index_path = root / "SCREENS.csv"
    with index_path.open(encoding="utf-8-sig", newline="") as stream:
        rows = [{clean(k): clean(v) for k, v in row.items()} for row in csv.DictReader(stream)]

    if len(rows) != 102:
        raise SystemExit(f"Expected 102 screens, found {len(rows)}")

    group_counts = Counter(normalize_group(row.get("newName", "")) for row in rows)
    catalog: list[dict[str, Any]] = []
    ids: list[str] = []
    files_seen: set[str] = set()

    for row in rows:
        screen_id = row["screen_id"]
        number = screen_number(screen_id)
        image_path = find_image(root, row, number)
        with Image.open(image_path) as image:
            width, height = image.size
        group_key = normalize_group(row.get("newName", ""))
        item = {
            "sequence": number,
            "screen_id": screen_id,
            "section_no": int(row["section_no"]) if row.get("section_no", "").isdigit() else row.get("section_no", ""),
            "section": row.get("section", ""),
            "title": re.sub(r"^\d{3}_", "", row.get("newName", "")),
            "caption": row.get("caption", ""),
            "part": row.get("part", ""),
            "spec_file": row.get("spec_file", ""),
            "image_file": image_path.name,
            "image_relative_path": image_path.relative_to(root).as_posix(),
            "width": width,
            "height": height,
            "aspect_ratio": round(width / height, 4),
            "sha256": sha256(image_path),
            "group_key": group_key,
            "state_relation": infer_state_relation(row, group_counts[group_key]),
            "previous_screen_id": f"SCR-{number - 1:03d}" if number > 1 else None,
            "next_screen_id": f"SCR-{number + 1:03d}" if number < 102 else None,
        }
        catalog.append(item)
        ids.append(screen_id)
        files_seen.add(image_path.name)

    expected_ids = [f"SCR-{number:03d}" for number in range(1, 103)]
    if ids != expected_ids:
        raise SystemExit("Screen IDs are not a continuous SCR-001..SCR-102 sequence")
    if len(files_seen) != 102:
        raise SystemExit(f"Expected 102 distinct image files, found {len(files_seen)}")

    sections: dict[str, list[str]] = defaultdict(list)
    for item in catalog:
        sections[item["section"]].append(item["screen_id"])

    summary = {
        "schema_version": "1.0",
        "source_zip": "ADOMS_데모작업 명세.zip",
        "screen_count": len(catalog),
        "first_screen": catalog[0]["screen_id"],
        "last_screen": catalog[-1]["screen_id"],
        "section_counts": dict(Counter(item["section"] for item in catalog)),
        "spec_file_counts": dict(Counter(item["spec_file"] for item in catalog)),
        "state_relation_counts": dict(Counter(item["state_relation"] for item in catalog)),
        "sections": dict(sections),
        "screens": catalog,
    }

    json_path = out / "ADOMS_SCREEN_CATALOG.json"
    json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    csv_path = out / "ADOMS_SCREEN_CATALOG.csv"
    fields = [
        "sequence", "screen_id", "section_no", "section", "title", "caption", "part",
        "spec_file", "image_file", "image_relative_path", "width", "height", "aspect_ratio",
        "sha256", "group_key", "state_relation", "previous_screen_id", "next_screen_id",
    ]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(catalog)

    print(json.dumps({
        "screen_count": len(catalog),
        "distinct_images": len(files_seen),
        "json": str(json_path),
        "csv": str(csv_path),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
