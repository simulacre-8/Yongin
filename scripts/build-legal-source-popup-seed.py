#!/usr/bin/env python3
"""Build legal-source popup seed data from the client ADOMS fact layer.

The script keeps ADOMS law/document/unit/obligation IDs, links the ten local
Yongin City Hall demo obligations to canonical sources, and enriches only the
used source documents with a dated National Law Information Center snapshot.
It is a one-off deterministic seed builder, not a runtime API integration.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import urllib.parse
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

SOURCE_VERSION = "adoms-fact-20260901+official-law-20260906"
OFFICIAL_CHECKED_AT = "2026-09-06"
UNIT_MEMBER = "_데모_용인시_20260905/01_사실층/unit_20260901_v2.1.csv"
DOC_MEMBER = "_데모_용인시_20260905/01_사실층/doc_20260901_v2.1.csv"

VIRTUAL_OBLIGATION_IDS = {
    "OBL-0003946", "OBL-0003107", "OBL-0004543", "OBL-0003065",
    "OBL-0003900", "OBL-0000017", "OBL-0000003", "OBL-0000118",
    "OBL-0000120", "OBL-0000131", "OBL-0000408", "OBL-0000133",
    "OBL-0000335",
}

CITYHALL_ALIAS_SOURCES: dict[str, list[str]] = {
    "OBL-01": ["OBL-0000010"],
    "OBL-02": ["OBL-0000012"],
    "OBL-03": ["OBL-0002584"],
    "OBL-04": ["OBL-0002586"],
    "OBL-05": ["OBL-0002576"],
    "OBL-06": ["OBL-0000077"],
    "OBL-07": ["UNIT:UNIT-0011597"],
    "OBL-08": ["OBL-0000001"],
    "OBL-09": ["OBL-0000002"],
    "OBL-10": ["OBL-0002576", "OBL-0002584"],
}

DATE_RE = re.compile(r"(?<!\d)(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})(?:\.|\b)")
CHANGE_TAG_RE = re.compile(r"<(?:(?:전문)?개정)[^>]*>")
TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def read_csv_from_zip(archive: zipfile.ZipFile, member: str) -> list[dict[str, str]]:
    with archive.open(member) as raw:
        text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
        return list(csv.DictReader(text))


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def compact(value: str | None) -> str:
    return SPACE_RE.sub(" ", TAG_RE.sub("", value or "")).strip()


def iso_date(value: str | None) -> str | None:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) != 8:
        return None
    return f"{digits[:4]}-{digits[4:6]}-{digits[6:]}"


def latest_provision_amendment(text: str) -> str | None:
    dates: list[str] = []
    for tag in CHANGE_TAG_RE.findall(text or ""):
        for year, month, day in DATE_RE.findall(tag):
            dates.append(f"{int(year):04d}-{int(month):02d}-{int(day):02d}")
    return max(dates) if dates else None


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


def query_official(document_title: str, oc: str) -> dict[str, str]:
    params = urllib.parse.urlencode({
        "OC": oc,
        "target": "eflaw",
        "type": "JSON",
        "query": document_title,
        "nw": "3",
        "display": "100",
    })
    request = urllib.request.Request(
        "https://www.law.go.kr/DRF/lawSearch.do?" + params,
        headers={"User-Agent": "YonginSafetyDemo/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    rows = payload.get("LawSearch", {}).get("law", [])
    if isinstance(rows, dict):
        rows = [rows]
    expected = compact(document_title)
    exact = [row for row in rows if compact(row.get("법령명한글")) == expected]
    if not exact:
        return {}
    current = sorted(
        exact,
        key=lambda row: (row.get("공포일자", ""), row.get("시행일자", "")),
        reverse=True,
    )[0]
    detail = current.get("법령상세링크", "")
    return {
        "last_amended_at": iso_date(current.get("공포일자")) or "",
        "effective_from": iso_date(current.get("시행일자")) or "",
        "amendment_kind": current.get("제개정구분명", ""),
        "promulgated_no": current.get("공포번호", ""),
        "official_law_id": current.get("법령ID", ""),
        "official_serial_no": current.get("법령일련번호", ""),
        "official_detail_url": "https://www.law.go.kr" + detail if detail else "",
    }


def render_values(table: str, columns: list[str], rows: list[list[object]], conflict: str) -> str:
    values = ",\n".join("  (" + ",".join(sql(value) for value in row) + ")" for row in rows)
    return f"insert into {table}({','.join(columns)}) values\n{values}\n{conflict};"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=Path("/home/ubuntu/projects/project-5908de38"),
    )
    parser.add_argument("--zip", type=Path)
    parser.add_argument("--official-api-oc", default="test")
    parser.add_argument("--skip-official-api", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("supabase/seed_legal_source_popup.sql"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("docs/LEGAL_SOURCE_POPUP_DATA_REPORT.json"),
    )
    args = parser.parse_args()

    source_zip = args.zip or args.source_dir / "_데모_용인시_20260905.zip"
    obligation_path = args.source_dir / "의무풀_용인시관련법령_20260906.csv"
    mapping_path = args.source_dir / "의무매핑_시설_용인시_20260906.csv"

    obligations = read_csv(obligation_path)
    mappings = read_csv(mapping_path)
    obligation_by_id = {row["obl_id"]: row for row in obligations}
    selected_obligation_ids = {row["obl_id"] for row in mappings} | VIRTUAL_OBLIGATION_IDS
    selected_obligation_ids |= {
        source for sources in CITYHALL_ALIAS_SOURCES.values() for source in sources
        if not source.startswith("UNIT:")
    }
    missing_obligations = sorted(selected_obligation_ids - obligation_by_id.keys())
    assert not missing_obligations, f"Missing obligation IDs: {missing_obligations}"

    with zipfile.ZipFile(source_zip) as archive:
        documents = read_csv_from_zip(archive, DOC_MEMBER)
        document_by_id = {row["doc_id"]: row for row in documents}
        wanted_pairs = {
            (obligation_by_id[obl_id]["doc_id"], obligation_by_id[obl_id]["unit_path"])
            for obl_id in selected_obligation_ids
        }
        wanted_unit_ids = {
            source.removeprefix("UNIT:")
            for sources in CITYHALL_ALIAS_SOURCES.values()
            for source in sources
            if source.startswith("UNIT:")
        }
        units_by_pair: dict[tuple[str, str], dict[str, str]] = {}
        units_by_id: dict[str, dict[str, str]] = {}
        with archive.open(UNIT_MEMBER) as raw:
            text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
            for unit in csv.DictReader(text):
                key = (unit["doc_id"], unit["unit_path"])
                if key in wanted_pairs:
                    units_by_pair[key] = unit
                if unit["unit_id"] in wanted_unit_ids:
                    units_by_id[unit["unit_id"]] = unit

    missing_pairs = sorted(wanted_pairs - units_by_pair.keys())
    missing_units = sorted(wanted_unit_ids - units_by_id.keys())
    assert not missing_pairs, f"Missing ADOMS unit pairs: {missing_pairs[:10]}"
    assert not missing_units, f"Missing direct ADOMS units: {missing_units}"

    sources: list[dict[str, object]] = []
    for obl_id in sorted(selected_obligation_ids):
        obligation = obligation_by_id[obl_id]
        unit = units_by_pair[(obligation["doc_id"], obligation["unit_path"])]
        sources.append({
            "obligation_key": obl_id,
            "source_order": 1,
            "source_obl_id": obl_id,
            "unit": unit,
            "obligation": obligation,
            "source_kind": "CLIENT_ADOMS",
        })

    for alias, source_keys in CITYHALL_ALIAS_SOURCES.items():
        for source_order, source_key in enumerate(source_keys, start=1):
            if source_key.startswith("UNIT:"):
                unit = units_by_id[source_key.removeprefix("UNIT:")]
                obligation = {
                    "obl_id": "",
                    "law_id": unit["law_id"],
                    "law_name": "재난 및 안전관리 기본법",
                    "doc_id": unit["doc_id"],
                    "unit_path": unit["unit_path"],
                    "article_no": unit["article_no"],
                    "article_title": unit["article_title"],
                    "anchor_text": unit["display_text"],
                }
                source_obl_id = None
            else:
                obligation = obligation_by_id[source_key]
                unit = units_by_pair[(obligation["doc_id"], obligation["unit_path"])]
                source_obl_id = source_key
            sources.append({
                "obligation_key": alias,
                "source_order": source_order,
                "source_obl_id": source_obl_id,
                "unit": unit,
                "obligation": obligation,
                "source_kind": "DEMO_ALIAS",
            })

    used_doc_ids = sorted({str(source["unit"]["doc_id"]) for source in sources})
    missing_docs = sorted(set(used_doc_ids) - document_by_id.keys())
    assert not missing_docs, f"Missing document IDs: {missing_docs}"

    official_by_doc: dict[str, dict[str, str]] = {}
    official_errors: dict[str, str] = {}
    for doc_id in used_doc_ids:
        document = document_by_id[doc_id]
        if args.skip_official_api:
            official_by_doc[doc_id] = {}
            continue
        try:
            official_by_doc[doc_id] = query_official(document["title_ko"], args.official_api_oc)
            if not official_by_doc[doc_id]:
                official_errors[doc_id] = "No exact current-law match"
        except Exception as exc:  # report and retain ADOMS dates rather than hiding failure
            official_by_doc[doc_id] = {}
            official_errors[doc_id] = f"{type(exc).__name__}: {exc}"

    document_rows: list[list[object]] = []
    for doc_id in used_doc_ids:
        document = document_by_id[doc_id]
        official = official_by_doc[doc_id]
        document_rows.append([
            doc_id,
            document["law_id"],
            document["title_ko"].replace(" 시행령", "").replace(" 시행규칙", "")
            if document["norm_form"] in {"presidential_decree", "ministerial_ordinance"}
            else document["title_ko"],
            document["title_ko"],
            document["norm_form"] or None,
            official.get("promulgated_no") or document.get("promulgated_no") or None,
            official.get("last_amended_at") or iso_date(document.get("last_amended_at")) or None,
            official.get("effective_from") or iso_date(document.get("effective_from")) or None,
            official.get("amendment_kind") or None,
            official.get("official_law_id") or None,
            official.get("official_serial_no") or None,
            official.get("official_detail_url") or None,
            SOURCE_VERSION,
            OFFICIAL_CHECKED_AT if official else None,
            json.dumps({
                "adoms_currency_source": document.get("currency_src", ""),
                "adoms_is_registered_nlic": document.get("is_registered_nlic", ""),
                "official_api_target": "eflaw" if official else None,
            }, ensure_ascii=False, separators=(",", ":")),
        ])

    source_rows: list[list[object]] = []
    for source in sources:
        unit = source["unit"]
        obligation = source["obligation"]
        source_text = obligation.get("anchor_text") or unit["display_text"]
        document = document_by_id[unit["doc_id"]]
        source_rows.append([
            source["obligation_key"],
            source["source_order"],
            source["source_obl_id"],
            unit["unit_id"],
            unit["doc_id"],
            unit["law_id"],
            obligation.get("law_name") or document["title_ko"],
            document["title_ko"],
            unit["unit_path"],
            unit["article_no"] or obligation.get("article_no") or None,
            unit["article_title"] or obligation.get("article_title") or None,
            source_text,
            latest_provision_amendment(source_text),
            iso_date(unit.get("effective_from")) or official_by_doc[unit["doc_id"]].get("effective_from") or None,
            SOURCE_VERSION,
            source["source_kind"],
            json.dumps({
                "client_source": "_데모_용인시_20260905.zip",
                "display_source": unit.get("display_src", ""),
            }, ensure_ascii=False, separators=(",", ":")),
        ])

    document_sql_rows = [row[:-1] + [json.loads(str(row[-1]))] for row in document_rows]
    source_sql_rows = [row[:-1] + [json.loads(str(row[-1]))] for row in source_rows]
    # Render JSONB columns separately to avoid treating JSON strings as opaque text.
    doc_values = ",\n".join(
        "  (" + ",".join([*(sql(value) for value in row[:-1]), json_sql(row[-1])]) + ")"
        for row in document_sql_rows
    )
    source_values = ",\n".join(
        "  (" + ",".join([*(sql(value) for value in row[:-1]), json_sql(row[-1])]) + ")"
        for row in source_sql_rows
    )
    output = f"""-- Generated by scripts/build-legal-source-popup-seed.py. Do not hand-edit.
-- Sources: client ADOMS fact layer + dated official current-law snapshot.
begin;

delete from public.ref_obligation_legal_source
where source_version = {sql(SOURCE_VERSION)};

insert into public.ref_legal_document(
  doc_id,law_id,law_name,document_title,norm_form,promulgated_no,
  last_amended_at,effective_from,amendment_kind,official_law_id,
  official_serial_no,official_detail_url,source_version,official_checked_at,metadata
) values
{doc_values}
on conflict (doc_id) do update set
  law_id=excluded.law_id, law_name=excluded.law_name,
  document_title=excluded.document_title, norm_form=excluded.norm_form,
  promulgated_no=excluded.promulgated_no,
  last_amended_at=excluded.last_amended_at,
  effective_from=excluded.effective_from,
  amendment_kind=excluded.amendment_kind,
  official_law_id=excluded.official_law_id,
  official_serial_no=excluded.official_serial_no,
  official_detail_url=excluded.official_detail_url,
  source_version=excluded.source_version,
  official_checked_at=excluded.official_checked_at,
  metadata=excluded.metadata;

insert into public.ref_obligation_legal_source(
  obligation_key,source_order,source_obl_id,source_unit_id,doc_id,law_id,
  law_name,document_title,unit_path,article_no,article_title,source_text,
  provision_last_amended_at,effective_from,source_version,source_kind,metadata
) values
{source_values}
on conflict (obligation_key,source_order) do update set
  source_obl_id=excluded.source_obl_id, source_unit_id=excluded.source_unit_id,
  doc_id=excluded.doc_id, law_id=excluded.law_id, law_name=excluded.law_name,
  document_title=excluded.document_title, unit_path=excluded.unit_path,
  article_no=excluded.article_no, article_title=excluded.article_title,
  source_text=excluded.source_text,
  provision_last_amended_at=excluded.provision_last_amended_at,
  effective_from=excluded.effective_from, source_version=excluded.source_version,
  source_kind=excluded.source_kind, metadata=excluded.metadata;

commit;
"""
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")

    report = {
        "source_version": SOURCE_VERSION,
        "official_checked_at": OFFICIAL_CHECKED_AT,
        "canonical_obligations": len(selected_obligation_ids),
        "cityhall_aliases": len(CITYHALL_ALIAS_SOURCES),
        "source_rows": len(source_rows),
        "documents": len(document_rows),
        "official_matches": sum(bool(value) for value in official_by_doc.values()),
        "official_errors": official_errors,
        "source_kinds": dict(Counter(str(source["source_kind"]) for source in sources)),
        "output": str(args.output),
        "output_bytes": args.output.stat().st_size,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
