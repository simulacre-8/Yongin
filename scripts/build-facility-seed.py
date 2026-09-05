#!/usr/bin/env python3
"""Build an idempotent Supabase seed from the Yongin FMS facility exports.

Real source rows keep source_kind=FMS. Missing rail/contract scenario rows are
created only as DEMO_VIRTUAL and remain visibly distinguishable in the UI.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

SOURCE_VERSION = "yongin-fms-20260906"
SCENARIO_VERSION = "client-scenario-v1-20260906"
DEFAULT_SOURCE_DIR = (
    Path(r"C:\Yongin_test\data\source")
    if os.name == "nt"
    else Path(os.environ.get("YONGIN_DATA_DIR", "/home/ubuntu/upload"))
)

LAW_MAP = {
    "시설물안전법": ("LAW-0047", "시설물의 안전 및 유지관리에 관한 특별법"),
    "중대재해처벌법": ("LAW-0075", "중대재해 처벌 등에 관한 법률"),
    "도로법": ("LAW-YGFMS-ROAD", "도로법"),
    "저수지·댐 안전관리법": ("LAW-YGFMS-DAM", "저수지·댐의 안전관리 및 재해예방에 관한 법률"),
    "급경사지 재해예방법": ("LAW-YGFMS-SLOPE", "급경사지 재해예방에 관한 법률"),
    "하수도법": ("LAW-0085", "하수도법"),
    "하천법": ("LAW-YGFMS-RIVER", "하천법"),
    "수도법": ("LAW-0042", "수도법"),
    "철도안전법": ("LAW-0079", "철도안전법"),
    "도시철도법": ("LAW-0022", "도시철도법"),
    "산업안전보건법": ("LAW-0028", "산업안전보건법"),
}

VIRTUAL_TARGETS = [
    {
        "target_ref": "SCENARIO:RAIL-EVERLINE",
        "source_id": "RAIL-EVERLINE",
        "target_name": "용인경전철(에버라인)",
        "target_category": "공중교통수단",
        "facility_group": "도시철도",
        "facility_kind": "도시철도차량",
        "facility_class": "시연대상",
        "safety_grade": "관리중",
        "address": "경기도 용인시 기흥구 중동",
        "subject_tier": "용인시",
        "managing_body": "경전철 관리부서",
        "subject_name": "경전철 관리부서",
        "l2_result": "해당",
        "l2_rule": "DEMO-L2-RAIL",
        "l2_basis_path": "도시철도법 제2조제2호 · 중대재해처벌법 제2조제5호 · 시행령 별표 2·3",
        "l2_basis_quote": "철도·모노레일·노면전차·선형유도전동기·자기부상열차 등 궤도에 의한 교통시설 및 교통수단",
        "attributes": {"route_length_km": 18.1, "train_sets": 30, "operation_subject": "운영주체 확인 필요"},
        "source_note": "FMS 시설물이 아닌 도시철도법상 공중교통수단. 운영주체·관리부서 정본 연계 전 가상값.",
    },
    {
        "target_ref": "SCENARIO:CONTRACT-ROAD-001",
        "source_id": "CONTRACT-ROAD-001",
        "target_name": "OO로 확·포장 공사",
        "target_category": "도급·용역·위탁",
        "facility_group": "건설공사",
        "facility_kind": "도로 확·포장",
        "facility_class": "시연계약",
        "safety_grade": "점검필요",
        "address": "경기도 용인시 관내",
        "subject_tier": "용인시",
        "managing_body": "건설도급 관리부서",
        "subject_name": "△△건설(가상)",
        "l2_result": "해당",
        "l2_rule": "DEMO-L2-CONTRACT",
        "l2_basis_path": "클라이언트 시연 시나리오 ACT 3",
        "l2_basis_quote": "도급계약 → 도급인 의무 도출 → 합동점검 → 시정조치",
        "attributes": {"contract_type": "도급", "contractor": "△△건설(가상)", "workers": 24, "risk_work": True},
        "source_note": "클라이언트 시연 시나리오의 필수 도급 대상. 실제 계약원장 연계 전 가상값.",
    },
    {
        "target_ref": "SCENARIO:CONTRACT-RAIL-001",
        "source_id": "CONTRACT-RAIL-001",
        "target_name": "용인경전철 차량기지 시설관리 용역",
        "target_category": "도급·용역·위탁",
        "facility_group": "철도시설 용역",
        "facility_kind": "시설 유지관리",
        "facility_class": "시연계약",
        "safety_grade": "시정중",
        "address": "경기도 용인시 기흥구 중동",
        "subject_tier": "용인시",
        "managing_body": "경전철 관리부서",
        "subject_name": "운영수탁사(가상)",
        "l2_result": "해당",
        "l2_rule": "DEMO-L2-RAIL-CONTRACT",
        "l2_basis_path": "클라이언트 요청 2026-09-06",
        "l2_basis_quote": "관리대상에 경전철 및 도급을 포함",
        "attributes": {"contract_type": "용역", "contractor": "운영수탁사(가상)", "workers": 18, "risk_work": True},
        "source_note": "경전철 도급 시연 플로우 보완용 가상 계약. 실제 계약원장 수신 시 교체.",
    },
]

VIRTUAL_OBLIGATIONS = [
    ("OBL-0003946", "철도종사자에 대한 안전 및 직무교육", "철도안전법", "정기", "철도안전교육 일지"),
    ("OBL-0003107", "안전관리체계의 유지 등", "철도안전법", "상시", "안전관리체계 점검기록"),
    ("OBL-0004543", "철도차량의 이력관리", "철도안전법", "상시", "차량 이력관리대장"),
    ("OBL-0003065", "철도안전투자의 공시", "철도안전법", "매년", "철도안전 투자 공시자료"),
    ("OBL-0003900", "운전업무종사자 등의 관리", "철도안전법", "정기", "운전업무종사자 관리대장"),
    ("OBL-0000017", "도급·용역·위탁 조치", "중대재해처벌법", "반기 1회", "도급 안전보건 조치 기록"),
    ("OBL-0000003", "도급인 안전보건 확보", "중대재해처벌법", "상시", "안전보건 확보조치 기록"),
    ("OBL-0000118", "적격 수급인 선정 의무", "산업안전보건법", "계약 전", "수급인 안전보건수준 평가표"),
    ("OBL-0000120", "도급인의 안전조치 및 보건조치", "산업안전보건법", "상시", "안전·보건조치 점검표"),
    ("OBL-0000131", "안전보건 정보 제공", "산업안전보건법", "작업 시작 전", "정보 제공 및 수령 확인서"),
    ("OBL-0000408", "도급사업의 합동 안전·보건점검", "산업안전보건법", "정기", "합동 안전·보건점검표"),
    ("OBL-0000133", "관계수급인에 대한 시정조치", "산업안전보건법", "발생 시", "시정조치 지시·완료 기록"),
    ("OBL-0000335", "통합 산업재해 자료 제출", "산업안전보건법", "30일 이내", "산업재해 자료 제출 기록"),
]


def sql(value):
    if value is None or value == "":
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def json_sql(value):
    return sql(json.dumps(value, ensure_ascii=False, separators=(",", ":"))) + "::jsonb"


def parse_date(value: str):
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y%m%d").date().isoformat()


def number(value: str):
    value = (value or "").strip().replace(",", "")
    if not value:
        return None
    return float(value)


def values_statement(table: str, columns: list[str], rows: list[list], conflict: str, chunk_size: int = 250):
    chunks = []
    for start in range(0, len(rows), chunk_size):
        chunk = rows[start:start + chunk_size]
        rendered = ",\n".join("  (" + ",".join(sql(v) if not isinstance(v, dict) else json_sql(v) for v in row) + ")" for row in chunk)
        chunks.append(f"insert into {table}({','.join(columns)}) values\n{rendered}\n{conflict};")
    return "\n\n".join(chunks)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--facility",
        type=Path,
        default=DEFAULT_SOURCE_DIR / "데모대상_용인시소관_20260906.csv",
    )
    parser.add_argument(
        "--mapping",
        type=Path,
        default=DEFAULT_SOURCE_DIR / "의무매핑_시설_용인시_20260906.csv",
    )
    parser.add_argument("--output", type=Path, default=Path("supabase/seed_facility_catalog.sql"))
    args = parser.parse_args()

    with args.facility.open(encoding="utf-8-sig", newline="") as handle:
        facilities = list(csv.DictReader(handle))
    with args.mapping.open(encoding="utf-8-sig", newline="") as handle:
        mappings = list(csv.DictReader(handle))

    assert len(facilities) == 150
    assert len({row["facilNo"] for row in facilities}) == 150
    assert len(mappings) == 2906
    assert len({(row["facilNo"], row["obl_id"]) for row in mappings}) == 2906
    assert {row["facilNo"] for row in facilities} == {row["facilNo"] for row in mappings}

    laws = OrderedDict()
    obligations = OrderedDict()
    for row in mappings:
        law_key = row["law_name"]
        law_id, law_title = LAW_MAP[law_key]
        laws[law_key] = (law_id, law_title)
        existing = obligations.get(row["obl_id"])
        current = (row["obl_title"], law_key, row["unit_path"], row["cycle"], row["evidence"], row["layer"], row["map_reason"])
        if existing and existing != current:
            raise ValueError(f"Conflicting obligation {row['obl_id']}")
        obligations[row["obl_id"]] = current

    for _, _, law_key, _, _ in VIRTUAL_OBLIGATIONS:
        laws[law_key] = LAW_MAP[law_key]

    law_rows = [
        [law_id, law_title, "act", "관계법령", SOURCE_VERSION if law_key not in ("철도안전법", "도시철도법", "산업안전보건법") else SCENARIO_VERSION,
         {"facility_import": True, "source_label": law_key}]
        for law_key, (law_id, law_title) in laws.items()
    ]

    unit_rows = []
    obligation_rows = []
    for obl_id, (title, law_key, unit_path, cycle, evidence, layer, reason) in obligations.items():
        law_id, _ = LAW_MAP[law_key]
        unit_id = f"UNIT-YGFMS-{obl_id.split('-')[-1]}"
        unit_rows.append([unit_id, law_id, unit_path, unit_path, "article", unit_path.split('/')[0] if unit_path else None, reason or title, SOURCE_VERSION,
                          {"facility_import": True, "law_label": law_key, "unit_path": unit_path}])
        obligation_rows.append([obl_id, unit_id, title, reason, layer, cycle or None, bool(evidence), "client_mapped", SOURCE_VERSION, 0,
                                {"facility_import": True, "evidence_name": evidence, "law_label": law_key, "unit_path": unit_path}])

    for order, (obl_id, title, law_key, cycle, evidence) in enumerate(VIRTUAL_OBLIGATIONS, start=1):
        if obl_id in obligations:
            continue
        law_id, _ = LAW_MAP[law_key]
        unit_id = f"UNIT-DEMO-{obl_id.split('-')[-1]}"
        unit_rows.append([unit_id, law_id, "시나리오 명시", "시나리오 명시", "demo_anchor", None,
                          "클라이언트 시연 시나리오에 지정된 의무. 정본 조문 앵커 수신 시 교체 필요.", SCENARIO_VERSION,
                          {"demo_virtual": True, "scenario_step": "ACT1/ACT3"}])
        obligation_rows.append([obl_id, unit_id, title,
                                "클라이언트 시연 시나리오용 의무. 정본 DB 연결 전에는 가상 데이터로 표시한다.",
                                "시연 필수 의무", cycle, True, "demo_virtual", SCENARIO_VERSION, 900 + order,
                                {"demo_virtual": True, "evidence_name": evidence, "law_label": law_key}])

    target_rows = []
    for row in facilities:
        target_rows.append([
            f"FMS:{row['facilNo']}", row["facilNo"], row["facilNm"], "공중이용시설",
            row["facilGbn"], row["facilKind"], row["facilClass"], row["sfGrade"],
            parse_date(row["cplYmd"]), number(row["age_yr"]), row["addr"], number(row["bldGrsarea"]),
            row["subject_tier"], row["mngMbyNm"], row["subject_name"], row["subject_source"],
            row["subject_confidence"], row["l2_result"], row["l2_rule"], row["l2_basis_path"],
            row["l2_basis_quote"], row["l2_confidence"], row["l2_need_data"], "FMS", SOURCE_VERSION,
            row["subject_note"] or row["l2_note"], row["api_status"], False,
            {"l2_note": row["l2_note"], "source_file": args.facility.name},
        ])
    for row in VIRTUAL_TARGETS:
        target_rows.append([
            row["target_ref"], row["source_id"], row["target_name"], row["target_category"],
            row["facility_group"], row["facility_kind"], row["facility_class"], row["safety_grade"],
            None, None, row["address"], None, row["subject_tier"], row["managing_body"], row["subject_name"],
            "scenario", "demo", row["l2_result"], row["l2_rule"], row["l2_basis_path"], row["l2_basis_quote"],
            "demo", "실제 자산·계약 원장", "DEMO_VIRTUAL", SCENARIO_VERSION, row["source_note"], "DEMO_ONLY", True,
            row["attributes"],
        ])

    map_rows = []
    for row in mappings:
        map_rows.append([
            f"FMS:{row['facilNo']}", row["obl_id"], row["law_name"], row["unit_path"], row["layer"],
            row["cycle"] or None, row["evidence"] or None, row["map_basis"], row["map_reason"],
            row["map_confidence"], row["l2_result"], row["l2_rule"], "CLIENT_CSV", False,
            SOURCE_VERSION, {"source_file": args.mapping.name},
        ])

    rail_ids = [item[0] for item in VIRTUAL_OBLIGATIONS[:5]]
    contract_ids = ["OBL-0000027"] + [item[0] for item in VIRTUAL_OBLIGATIONS[5:]]
    virtual_meta = {item[0]: item for item in VIRTUAL_OBLIGATIONS}
    for target_ref, ids, layer in [
        ("SCENARIO:RAIL-EVERLINE", rail_ids, "공중교통수단"),
        ("SCENARIO:CONTRACT-ROAD-001", contract_ids, "도급·용역·위탁"),
        ("SCENARIO:CONTRACT-RAIL-001", contract_ids, "도급·용역·위탁"),
    ]:
        for obl_id in ids:
            if obl_id == "OBL-0000027":
                title, law_key, unit_path, cycle, evidence, _, reason = obligations[obl_id]
            else:
                _, title, law_key, cycle, evidence = virtual_meta[obl_id]
                unit_path = "시나리오 명시"
                reason = "클라이언트 시연 시나리오에 지정된 의무"
            map_rows.append([
                target_ref, obl_id, law_key, unit_path, layer, cycle or None, evidence or None,
                "클라이언트 시연 시나리오 v1", reason, "demo", "해당", "DEMO-SCENARIO",
                "CLIENT_SCENARIO", True, SCENARIO_VERSION,
                {"demo_virtual": True, "replace_when_source_arrives": True},
            ])

    statements = [
        "-- Generated by scripts/build-facility-seed.py; do not hand-edit.\n-- Real FMS records and client-mapped obligations are preserved; scenario gaps are DEMO_VIRTUAL.\nbegin;",
        values_statement(
            "public.ref_law",
            ["law_id", "title_ko", "law_kind", "relation_type", "source_version", "metadata"],
            law_rows,
            "on conflict (law_id) do update set title_ko=excluded.title_ko, metadata=public.ref_law.metadata || excluded.metadata",
        ),
        values_statement(
            "public.ref_unit",
            ["unit_id", "law_id", "unit_path", "unit_label", "unit_type", "article_no", "display_text", "source_version", "metadata"],
            unit_rows,
            "on conflict (unit_id) do update set law_id=excluded.law_id, unit_path=excluded.unit_path, display_text=excluded.display_text, source_version=excluded.source_version, metadata=excluded.metadata",
        ),
        values_statement(
            "public.ref_obligation",
            ["obl_id", "anchor_unit_id", "title_ko", "detail_ko", "obligation_group", "cycle", "evidence_required", "review_status", "source_version", "display_order", "metadata"],
            obligation_rows,
            "on conflict (obl_id) do update set anchor_unit_id=excluded.anchor_unit_id, title_ko=excluded.title_ko, detail_ko=excluded.detail_ko, obligation_group=excluded.obligation_group, cycle=excluded.cycle, evidence_required=excluded.evidence_required, review_status=excluded.review_status, source_version=excluded.source_version, display_order=excluded.display_order, metadata=excluded.metadata where public.ref_obligation.review_status not in ('approved','client_provided')",
        ),
        f"delete from public.ref_managed_target where source_version in ({sql(SOURCE_VERSION)},{sql(SCENARIO_VERSION)});",
        values_statement(
            "public.ref_managed_target",
            ["target_ref", "source_id", "target_name", "target_category", "facility_group", "facility_kind", "facility_class", "safety_grade", "completion_date", "age_years", "address", "gross_area", "subject_tier", "managing_body", "subject_name", "subject_source", "subject_confidence", "l2_result", "l2_rule", "l2_basis_path", "l2_basis_quote", "l2_confidence", "l2_need_data", "source_kind", "source_version", "source_note", "source_status", "is_demo_virtual", "attributes"],
            target_rows,
            "on conflict (target_ref) do update set target_name=excluded.target_name, target_category=excluded.target_category, facility_group=excluded.facility_group, facility_kind=excluded.facility_kind, facility_class=excluded.facility_class, safety_grade=excluded.safety_grade, completion_date=excluded.completion_date, age_years=excluded.age_years, address=excluded.address, gross_area=excluded.gross_area, subject_tier=excluded.subject_tier, managing_body=excluded.managing_body, subject_name=excluded.subject_name, subject_source=excluded.subject_source, subject_confidence=excluded.subject_confidence, l2_result=excluded.l2_result, l2_rule=excluded.l2_rule, l2_basis_path=excluded.l2_basis_path, l2_basis_quote=excluded.l2_basis_quote, l2_confidence=excluded.l2_confidence, l2_need_data=excluded.l2_need_data, source_kind=excluded.source_kind, source_version=excluded.source_version, source_note=excluded.source_note, source_status=excluded.source_status, is_demo_virtual=excluded.is_demo_virtual, attributes=excluded.attributes, imported_at=now()",
        ),
        values_statement(
            "public.ref_managed_target_obligation",
            ["target_ref", "obl_id", "law_name", "unit_path", "layer", "cycle", "evidence", "map_basis", "map_reason", "map_confidence", "l2_result", "l2_rule", "mapping_source", "is_demo_virtual", "source_version", "metadata"],
            map_rows,
            "on conflict (target_ref,obl_id) do update set law_name=excluded.law_name, unit_path=excluded.unit_path, layer=excluded.layer, cycle=excluded.cycle, evidence=excluded.evidence, map_basis=excluded.map_basis, map_reason=excluded.map_reason, map_confidence=excluded.map_confidence, l2_result=excluded.l2_result, l2_rule=excluded.l2_rule, mapping_source=excluded.mapping_source, is_demo_virtual=excluded.is_demo_virtual, source_version=excluded.source_version, metadata=excluded.metadata",
        ),
        "commit;",
        "-- Expected: 153 targets (150 FMS + 3 DEMO_VIRTUAL), 2,929 mappings (2,906 CSV + 23 scenario).",
    ]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n\n".join(statements) + "\n", encoding="utf-8")
    print(json.dumps({
        "facility_rows": len(facilities),
        "mapping_rows": len(mappings),
        "unique_obligations": len(obligations),
        "virtual_targets": len(VIRTUAL_TARGETS),
        "virtual_obligations_added": len([x for x in VIRTUAL_OBLIGATIONS if x[0] not in obligations]),
        "seed_targets": len(target_rows),
        "seed_mappings": len(map_rows),
        "output": str(args.output),
        "bytes": args.output.stat().st_size,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
