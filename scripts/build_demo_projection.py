#!/usr/bin/env python3
"""Build a small, graph-compatible legal projection from the Yongin source package.

The script never auto-approves rules. Supply a manually reviewed CSV containing at
least rul_id, obl_id and demo_approved=true.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

CORE_TITLES = [
    "중대재해 처벌 등에 관한 법률",
    "산업안전보건법",
    "시설물의 안전 및 유지관리에 관한 특별법",
]
KEYWORDS = ("중대", "안전", "시설", "건축", "도로", "교량", "하수", "재난", "소방", "화학")


def rows(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def write_csv(path: Path, records: list[dict], fields: list[str] | None = None):
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = fields or (list(records[0]) if records else [])
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)


def find_one(root: Path, pattern: str) -> Path:
    matches = list(root.rglob(pattern))
    if len(matches) != 1:
        raise SystemExit(f"Expected exactly one {pattern}, found {len(matches)}")
    return matches[0]


def approved_links(path: Path) -> list[dict]:
    selected = []
    for row in rows(path):
        value = str(row.get("demo_approved", "")).strip().lower()
        if value in {"true", "1", "yes", "y", "approved"}:
            selected.append(row)
    if not 8 <= len(selected) <= 40:
        raise SystemExit("Approved link file must contain 8-40 approved rows")
    return selected


def law_score(row: dict, required_titles: set[str]) -> tuple[int, str]:
    title = row.get("title_ko", "")
    score = 0
    if title in CORE_TITLES:
        score += 1000
    if title in required_titles:
        score += 900
    if row.get("status") == "active":
        score += 50
    if row.get("is_related_law", "").lower() == "true":
        score += 40
    score += sum(8 for keyword in KEYWORDS if keyword in title)
    return (-score, title)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True, help="Extracted package root")
    parser.add_argument("--approved-links", type=Path, required=True, help="Human-reviewed link CSV")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--law-limit", type=int, default=100, choices=range(50, 151), metavar="50..150")
    args = parser.parse_args()

    link_rows = approved_links(args.approved_links)
    approved_rule_ids = {row["rul_id"] for row in link_rows}
    approved_obl_ids = {row["obl_id"] for row in link_rows}
    required_titles = {row.get("cond_law", "") for row in link_rows if row.get("cond_law")}

    law_path = find_one(args.source_root, "law_*_v2.1.csv")
    unit_path = find_one(args.source_root, "unit_*_v2.1.csv")
    rule_path = find_one(args.source_root, "appl_rule_*_v2.0.csv")
    obligation_path = find_one(args.source_root, "obl_master_*_v2.0.csv")

    all_laws = list(rows(law_path))
    selected_laws = sorted(all_laws, key=lambda row: law_score(row, required_titles))[: args.law_limit]
    selected_law_ids = {row["law_id"] for row in selected_laws}

    selected_rules = [row for row in rows(rule_path) if row.get("rul_id") in approved_rule_ids]
    selected_obligations = [row for row in rows(obligation_path) if row.get("obl_id") in approved_obl_ids]
    wanted_units = {row.get("src_unit_id") for row in selected_rules} | {row.get("anchor_unit_id") for row in selected_obligations}
    wanted_units.discard("")
    wanted_units.discard(None)
    selected_units = [row for row in rows(unit_path) if row.get("unit_id") in wanted_units]

    # Include every law that owns an approved source/anchor unit.
    approved_unit_laws = {row.get("law_id") for row in selected_units if row.get("law_id")}
    selected_law_ids |= approved_unit_laws
    selected_laws = [row for row in all_laws if row.get("law_id") in selected_law_ids]

    ref_law = [{
        "law_id": row["law_id"], "title_ko": row["title_ko"], "law_kind": row.get("law_kind"),
        "relation_type": row.get("relation_type"), "ministry": row.get("ministry"),
        "effective_from": row.get("effective_from"), "source_version": "fact-v2.1",
    } for row in selected_laws]
    ref_unit = [{
        "unit_id": row["unit_id"], "law_id": row.get("law_id"), "unit_path": row.get("unit_path"),
        "unit_label": row.get("unit_label"), "unit_type": row.get("unit_type"),
        "article_no": row.get("article_no"), "display_text": row.get("display_text"),
        "effective_from": row.get("effective_from"), "source_version": "fact-v2.1",
    } for row in selected_units]
    ref_rule = [{
        "rul_id": row["rul_id"], "source_unit_id": row.get("src_unit_id"),
        "condition_kind": row.get("condition_kind"), "condition_item": row.get("condition_item"),
        "operator": row.get("operator"), "threshold_value": row.get("threshold_value"),
        "threshold_unit": row.get("threshold_unit"), "source_quote": row.get("source_quote"),
        "review_status": "approved", "demo_approved": "true", "source_version": "decision-v2.0",
    } for row in selected_rules]
    ref_obligation = [{
        "obl_id": row["obl_id"], "anchor_unit_id": row.get("anchor_unit_id"),
        "parent_obl_id": row.get("parent_obl_id"), "title_ko": row.get("title_ko"),
        "obligation_group": row.get("obligation_group"), "cycle": row.get("cycle"),
        "evidence_required": row.get("evidence_required"), "review_status": "approved",
        "source_version": "decision-v2.0",
    } for row in selected_obligations]
    ref_links = [{
        "rul_id": row["rul_id"], "obl_id": row["obl_id"], "link_basis": row.get("link_basis"),
        "link_confidence": row.get("confidence"), "link_evidence": row.get("link_evidence"),
        "review_status": "approved", "demo_approved": "true",
    } for row in link_rows]

    out = args.out
    write_csv(out / "rdb" / "ref_law.csv", ref_law)
    write_csv(out / "rdb" / "ref_unit.csv", ref_unit)
    write_csv(out / "rdb" / "ref_rule.csv", ref_rule)
    write_csv(out / "rdb" / "ref_obligation.csv", ref_obligation)
    write_csv(out / "rdb" / "ref_rule_obligation.csv", ref_links)

    graph = out / "graph"
    write_csv(graph / "nodes_law.csv", ref_law)
    write_csv(graph / "nodes_unit.csv", ref_unit)
    write_csv(graph / "nodes_rule.csv", ref_rule)
    write_csv(graph / "nodes_obligation.csv", ref_obligation)
    write_csv(graph / "edges_contains.csv", [
        {"from_id": row["law_id"], "to_id": row["unit_id"], "type": "CONTAINS", "source_version": "fact-v2.1"}
        for row in ref_unit
    ])
    write_csv(graph / "edges_based_on.csv", [
        {"from_id": row["rul_id"], "to_id": row["source_unit_id"], "type": "BASED_ON", "review_status": "approved"}
        for row in ref_rule if row.get("source_unit_id")
    ])
    write_csv(graph / "edges_triggers.csv", [
        {"from_id": row["rul_id"], "to_id": row["obl_id"], "type": "TRIGGERS", "confidence": row["link_confidence"], "review_status": "approved"}
        for row in ref_links
    ])

    manifest = {
        "law_count": len(ref_law), "unit_count": len(ref_unit), "rule_count": len(ref_rule),
        "obligation_count": len(ref_obligation), "rule_obligation_count": len(ref_links),
        "source_versions": {"fact": "v2.1", "decision": "v2.0"},
        "warning": "Only human-approved links were exported.",
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
