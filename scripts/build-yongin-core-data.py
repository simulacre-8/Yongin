#!/usr/bin/env python3
"""Validate Yongin's three client CSVs and build the full obligation-pool seed.

The facility and facility-obligation mapping seeds are generated separately by
build-facility-seed.py. This script makes the third source file—the complete
Yongin obligation pool—first-class in Supabase while retaining the ADOMS IDs
that allow a later graph projection.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
from collections import Counter
from pathlib import Path

SOURCE_VERSION = "yongin-obligation-pool-20260906"
DEFAULT_SOURCE_DIR = (
    Path(r"C:\Yongin_test\data\source")
    if os.name == "nt"
    else Path(os.environ.get("YONGIN_DATA_DIR", "/home/ubuntu/projects/project-5908de38"))
)


def sql(value: object) -> str:
    if value is None or value == "":
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def json_sql(value: object) -> str:
    return sql(json.dumps(value, ensure_ascii=False, separators=(",", ":"))) + "::jsonb"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "t", "yes", "y"}


def parse_int(value: str) -> int | None:
    value = value.strip()
    if not value:
        return None
    return int(float(value))


def obligation_values(rows: list[dict[str, str]]) -> list[str]:
    values = []
    for order, row in enumerate(rows, start=1):
        metadata = {
            "source_file": "의무풀_용인시관련법령_20260906.csv",
            "client_provided": True,
            "law_id": row["law_id"],
            "law_name": row["law_name"],
            "doc_id": row["doc_id"],
            "unit_path": row["unit_path"],
            "article_no": row["article_no"],
            "article_title": row["article_title"],
            "evidence_required_raw": row["evidence_required"],
            "nature": row["nature"],
            "is_umbrella": parse_bool(row["is_umbrella"]),
            "item_count": parse_int(row["item_cnt"]),
            "anchor_text": row["anchor_text"],
        }
        columns = [
            row["obl_id"],
            row["title_ko"],
            row["anchor_text"] or None,
            row["obligation_group"] or "미분류",
            row["cycle"] or None,
            bool(row["evidence_required"].strip()),
            "client_provided",
            SOURCE_VERSION,
            order,
            row["law_id"] or None,
            row["law_name"] or None,
            row["doc_id"] or None,
            row["unit_path"] or None,
            row["article_no"] or None,
            row["article_title"] or None,
            row["nature"] or None,
            parse_bool(row["is_umbrella"]),
            parse_int(row["item_cnt"]),
            row["anchor_text"] or None,
        ]
        rendered = [sql(value) for value in columns]
        rendered.append(json_sql(metadata))
        values.append("  (" + ",".join(rendered) + ")")
    return values


def render_statement(value_rows: list[str]) -> str:
    return """insert into public.ref_obligation(
  obl_id,title_ko,detail_ko,obligation_group,cycle,evidence_required,
  review_status,source_version,display_order,law_id,law_name,doc_id,unit_path,
  article_no,article_title,nature,is_umbrella,item_count,anchor_text,metadata
) values
%s
on conflict (obl_id) do update set
  title_ko = excluded.title_ko,
  detail_ko = excluded.detail_ko,
  obligation_group = excluded.obligation_group,
  cycle = excluded.cycle,
  evidence_required = excluded.evidence_required,
  review_status = case
    when public.ref_obligation.review_status = 'approved' then 'approved'
    else excluded.review_status
  end,
  source_version = excluded.source_version,
  display_order = excluded.display_order,
  law_id = excluded.law_id,
  law_name = excluded.law_name,
  doc_id = excluded.doc_id,
  unit_path = excluded.unit_path,
  article_no = excluded.article_no,
  article_title = excluded.article_title,
  nature = excluded.nature,
  is_umbrella = excluded.is_umbrella,
  item_count = excluded.item_count,
  anchor_text = excluded.anchor_text,
  metadata = public.ref_obligation.metadata || excluded.metadata;
""" % ",\n".join(value_rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--facilities",
        type=Path,
        default=DEFAULT_SOURCE_DIR / "데모대상_용인시소관_20260906.csv",
    )
    parser.add_argument(
        "--obligations",
        type=Path,
        default=DEFAULT_SOURCE_DIR / "의무풀_용인시관련법령_20260906.csv",
    )
    parser.add_argument(
        "--mappings",
        type=Path,
        default=DEFAULT_SOURCE_DIR / "의무매핑_시설_용인시_20260906.csv",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("supabase/seed_yongin_obligation_pool.sql"),
    )
    parser.add_argument("--chunk-dir", type=Path)
    parser.add_argument("--chunk-size", type=int, default=400)
    args = parser.parse_args()

    facilities = read_csv(args.facilities)
    obligations = read_csv(args.obligations)
    mappings = read_csv(args.mappings)

    facility_ids = [row["facilNo"] for row in facilities]
    obligation_ids = [row["obl_id"] for row in obligations]
    mapping_keys = [(row["facilNo"], row["obl_id"]) for row in mappings]
    mapped_facilities = {row["facilNo"] for row in mappings}
    mapped_obligations = {row["obl_id"] for row in mappings}
    obligation_by_id = {row["obl_id"]: row for row in obligations}

    assert len(facilities) == 150, f"Expected 150 facilities, got {len(facilities)}"
    assert len(set(facility_ids)) == len(facility_ids), "Duplicate facility IDs"
    # The file has 5,056 physical lines because quoted anchor_text fields contain
    # embedded newlines. Python's CSV parser correctly yields 3,688 logical rows.
    assert len(obligations) == 3688, f"Expected 3,688 obligations, got {len(obligations)}"
    assert len(set(obligation_ids)) == len(obligation_ids), "Duplicate obligation IDs"
    assert len(mappings) == 2906, f"Expected 2,906 mappings, got {len(mappings)}"
    assert len(set(mapping_keys)) == len(mapping_keys), "Duplicate facility-obligation keys"
    assert mapped_facilities == set(facility_ids), "Facility coverage mismatch"
    assert mapped_obligations <= set(obligation_ids), "Mapped obligation missing from pool"

    title_conflicts = [
        row["obl_id"]
        for row in mappings
        if row["obl_title"] != obligation_by_id[row["obl_id"]]["title_ko"]
    ]
    law_conflicts = [
        row["obl_id"]
        for row in mappings
        if row["law_name"] != obligation_by_id[row["obl_id"]]["law_name"]
    ]
    path_conflicts = [
        row["obl_id"]
        for row in mappings
        if row["unit_path"] != obligation_by_id[row["obl_id"]]["unit_path"]
    ]
    assert not title_conflicts, f"Title conflicts: {title_conflicts[:5]}"
    assert not law_conflicts, f"Law conflicts: {law_conflicts[:5]}"
    assert not path_conflicts, f"Unit-path conflicts: {path_conflicts[:5]}"

    values = obligation_values(obligations)
    statements = [
        render_statement(values[start : start + args.chunk_size])
        for start in range(0, len(values), args.chunk_size)
    ]
    header = (
        "-- Generated from 의무풀_용인시관련법령_20260906.csv. Do not hand-edit.\n"
        "-- Full Yongin obligation pool; idempotent and graph-ID preserving.\n\n"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        header + "begin;\n\n" + "\n".join(statements) + "\ncommit;\n",
        encoding="utf-8",
    )

    if args.chunk_dir:
        args.chunk_dir.mkdir(parents=True, exist_ok=True)
        for old_file in args.chunk_dir.glob("*.sql"):
            old_file.unlink()
        for index, statement in enumerate(statements, start=1):
            (args.chunk_dir / f"{index:03d}.sql").write_text(
                header + "begin;\n\n" + statement + "\ncommit;\n",
                encoding="utf-8",
            )

    report = {
        "facilities": len(facilities),
        "facility_unique_ids": len(set(facility_ids)),
        "obligation_pool": len(obligations),
        "obligation_unique_ids": len(set(obligation_ids)),
        "mapped_obligations": len(mapped_obligations),
        "facility_obligation_mappings": len(mappings),
        "mapped_facilities": len(mapped_facilities),
        "law_count": len({row["law_id"] for row in obligations}),
        "document_count": len({row["doc_id"] for row in obligations}),
        "obligation_groups": dict(Counter(row["obligation_group"] for row in obligations)),
        "source_version": SOURCE_VERSION,
        "sql_chunks": len(statements),
        "output": str(args.output),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
