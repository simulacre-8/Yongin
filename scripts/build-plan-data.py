#!/usr/bin/env python3
"""Convert the approved Tuesday schedule Markdown into typed frontend seed data."""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PLAN_UNTIL_TUESDAY.md"
OUTPUT = ROOT / "client" / "src" / "lib" / "plan-data.ts"
SQL_OUTPUT = ROOT / "supabase" / "seed_plan.sql"

DAY_META = {
    "9월 5일 토요일": ("sat", "2026-09-05", "토요일", "기반 구축"),
    "9월 6일 일요일": ("sun", "2026-09-06", "일요일", "법령 DB·판정"),
    "9월 7일 월요일": ("mon", "2026-09-07", "월요일", "증빙·점검·동결"),
    "9월 8일 화요일": ("tue", "2026-09-08", "화요일", "리허설·최종 동결"),
}

# Initial values are evidence-based as of 2026-09-05 22:20 KST. Users can edit all values in the board.
PROGRESS = {
    "시연 범위 동결": ("done", 100, "대표 7개 라우트와 역할 3개 확정"),
    "시연 대본 역산": ("done", 100, "대시보드→판정→증빙→점검→집계 폐쇄 루프 확정"),
    "프로젝트·환경 정리": ("done", 100, "Git, Netlify, 공개 환경변수, Windows 경로 정리"),
    "DB 스키마 1차 작성": ("done", 100, "핵심 테이블·인덱스 원격 적용"),
    "Storage·권한 기반 설정": ("done", 100, "비공개 버킷·RLS·10MB 제한 적용"),
    "연결 스모크 테스트": ("done", 100, "Target CRUD·Storage·감사로그 통과"),
    "전일 상태 재검증": ("done", 100, "원격 readiness·빌드 재검증 완료"),
    "핵심 법령 선정 기준 적용": ("in_progress", 75, "80건 축소 투영 검증, 최종 승인 목록 보완 필요"),
    "축소 ETL 작성": ("done", 100, "RDB·그래프 호환 투영 스크립트 검증"),
    "축소 데이터 검증": ("done", 100, "80개 법령 투영과 참조 구조 검증"),
    "규칙 허용목록 검수": ("in_progress", 50, "원격 4개 승인 규칙, 목표 8~12개"),
    "시나리오 시드 작성": ("done", 100, "역할 3개·대상 3개·의무·점검 시드 적용"),
    "판정 함수 구현": ("in_progress", 60, "규칙 스냅숏 12건 저장, 입력 UI 연계 필요"),
    "공통 UI 셸 구현": ("done", 100, "용인시 브랜드 셸과 역할 전환 구현"),
    "법령 목록·검색 화면": ("done", 100, "Supabase ref_law 원격 조회 확인"),
    "관리대상 선택 화면": ("in_progress", 70, "화면 구현 완료, 원격 target 연계 필요"),
    "적용조건 입력 화면": ("in_progress", 20, "대상 속성 UI·재판정 연결 필요"),
    "적용 법령·의무 결과 화면": ("in_progress", 40, "화면 구조 구현, 원격 판정 연결 필요"),
    "법 의무사항·이행시기 화면": ("in_progress", 70, "화면·로컬 저장 완료, Supabase 쓰기 연결 필요"),
    "새로고침 영속성 테스트": ("in_progress", 40, "로컬 영속화 통과, 업무 DB 영속화 필요"),
    "초기화 경로 구현": ("in_progress", 50, "클라이언트 초기화 구현, DB 시드 초기화 필요"),
    "일요일 결과 스모크 테스트": ("in_progress", 30, "DB 기반 테스트 통과, 전체 시연 루프 미완료"),
    "의무이행 기록 화면": ("in_progress", 60, "UI·상태 모델 완료, 원격 CRUD 필요"),
    "증빙 업로드 백엔드": ("in_progress", 50, "Storage 왕복 검증, 화면 메타데이터 연결 필요"),
    "증빙 다운로드·삭제": ("in_progress", 50, "API 왕복 검증, 화면 연결 필요"),
    "의무이행 UI 완성": ("in_progress", 60, "읽기·편집 UI 구현, 원격 저장 필요"),
    "점검 회차·범위 생성": ("in_progress", 60, "원격 회차 1개·범위 30건 시드"),
    "점검 화면 구현": ("in_progress", 60, "UI 구현 완료, 원격 수정 필요"),
    "보완 요구 생성": ("in_progress", 30, "상태 흐름 UI 존재, 원격 알림·감사 연계 필요"),
    "담당자 보완 제출": ("in_progress", 30, "UI 흐름 존재, 증빙 버전 저장 필요"),
    "재점검 완료": ("in_progress", 30, "UI 흐름 존재, 변경이력 영속화 필요"),
    "총괄표·이행률 계산": ("in_progress", 60, "UI 계산 완료, 원격 점검 결과 기반 전환 필요"),
    "대시보드 최소 위젯": ("in_progress", 60, "위젯 구현 완료, 원격 집계 전환 필요"),
    "역할 전환·접근범위 검증": ("in_progress", 70, "역할 UI·RLS 구현, 실제 Auth 바인딩 제외"),
    "시연 외 UI 차단": ("in_progress", 80, "대부분 비활성화, 최종 클릭 점검 필요"),
    "용인시 표기·시각 정리": ("done", 100, "공식 로고·마젠타·퍼플·청록 팔레트 적용"),
    "전체 E2E 1차": ("pending", 0, ""),
    "Release Candidate 생성": ("in_progress", 30, "현재 체크포인트 존재, 기능 동결 전"),
}

MILESTONES = {
    "sat": "Supabase 연결, 스키마 생성, 테스트 행 저장",
    "sun": "조건 입력 → 법령·의무 도출 → 새로고침 후 유지",
    "mon": "점검·보완·총괄 집계와 Release Candidate",
    "tue": "동일 대본 2회 연속 성공 및 최종 동결",
}


def minutes(time_range: str) -> int:
    start, end = time_range.split("~")
    sh, sm = map(int, start.split(":"))
    eh, em = map(int, end.split(":"))
    if eh == 24:
        eh = 0
        end_day = 1
    else:
        end_day = 0
    return int((datetime(2000, 1, 1 + end_day, eh, em) - datetime(2000, 1, 1, sh, sm)).total_seconds() // 60)


def clean(value: str) -> str:
    return value.replace("**", "").replace("`", "").strip()


def parse() -> list[dict]:
    day = None
    result: list[dict] = []
    counters: dict[str, int] = {}
    for raw in SOURCE.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^## \d+\. (9월 \d+일 [^—]+)", raw)
        if heading:
            key = next((name for name in DAY_META if name in heading.group(1)), None)
            day = DAY_META.get(key) if key else None
            continue
        if not day or not re.match(r"^\| \d{2}:\d{2}~(?:\d{2}:\d{2}|24:00) \|", raw):
            continue
        columns = [clean(part) for part in raw.strip().strip("|").split("|")]
        if len(columns) != 3:
            continue
        time_range, title, criteria = columns
        day_id, date, day_label, phase = day
        counters[day_id] = counters.get(day_id, 0) + 1
        kind = "buffer" if "버퍼" in title or "점심" in title or "저녁" in title else "task"
        status, progress, note = PROGRESS.get(title, ("pending", 0, ""))
        if kind == "buffer":
            status, progress, note = "pending", 0, "일정 완충 구간이며 전체 진행률 계산에서 제외"
        result.append({
            "id": f"{day_id}-{counters[day_id]:02d}",
            "dayId": day_id,
            "date": date,
            "dayLabel": day_label,
            "phase": phase,
            "time": time_range,
            "durationMinutes": minutes(time_range),
            "title": title,
            "criteria": criteria,
            "kind": kind,
            "status": status,
            "progress": progress,
            "note": note,
        })
    return result


def main() -> None:
    items = parse()
    if len(items) < 35:
        raise SystemExit(f"Expected at least 35 schedule rows, got {len(items)}")
    content = """export type PlanStatus = \"pending\" | \"in_progress\" | \"done\" | \"blocked\";\nexport type PlanKind = \"task\" | \"buffer\";\n\nexport interface PlanItem {\n  id: string;\n  dayId: \"sat\" | \"sun\" | \"mon\" | \"tue\";\n  date: string;\n  dayLabel: string;\n  phase: string;\n  time: string;\n  durationMinutes: number;\n  title: string;\n  criteria: string;\n  kind: PlanKind;\n  status: PlanStatus;\n  progress: number;\n  note: string;\n}\n\nexport const PLAN_VERSION = \"2026-09-05-v1\";\nexport const PLAN_SOURCE = \"docs/PLAN_UNTIL_TUESDAY.md\";\nexport const PLAN_DEADLINE = \"2026-09-08T12:00:00+09:00\";\n\nexport const dayMilestones = """ + json.dumps(MILESTONES, ensure_ascii=False, indent=2) + " as const;\n\nexport const initialPlanItems: PlanItem[] = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n\nexport function calculateProgress(items: PlanItem[]) {\n  const work = items.filter((item) => item.kind === \"task\");\n  const weightedTotal = work.reduce((sum, item) => sum + item.durationMinutes, 0);\n  const weightedDone = work.reduce((sum, item) => sum + item.durationMinutes * item.progress / 100, 0);\n  return {\n    percent: weightedTotal ? Math.round(weightedDone / weightedTotal * 100) : 0,\n    completed: work.filter((item) => item.status === \"done\").length,\n    inProgress: work.filter((item) => item.status === \"in_progress\").length,\n    blocked: work.filter((item) => item.status === \"blocked\").length,\n    pending: work.filter((item) => item.status === \"pending\").length,\n    total: work.length,\n  };\n}\n"
    OUTPUT.write_text(content, encoding="utf-8")
    plan_id = "yongin-tuesday-20260908"
    sql_rows = []
    for order, item in enumerate(items, start=1):
        values = {
            "item_id": item["id"],
            "day_id": item["dayId"],
            "plan_date": item["date"],
            "day_label": item["dayLabel"],
            "phase": item["phase"],
            "time_range": item["time"],
            "title": item["title"],
            "criteria": item["criteria"],
            "kind": item["kind"],
            "status": item["status"],
            "note": item["note"],
        }

        def quote(key: str) -> str:
            return "'" + values[key].replace("'", "''") + "'"

        sql_rows.append(
            "(" + ", ".join([
                f"'{plan_id}'",
                quote("item_id"),
                str(order),
                quote("day_id"),
                quote("plan_date") + "::date",
                quote("day_label"),
                quote("phase"),
                quote("time_range"),
                str(item["durationMinutes"]),
                quote("title"),
                quote("criteria"),
                quote("kind"),
                quote("status"),
                str(item["progress"]),
                quote("note"),
            ]) + ")"
        )

    sql = """-- Generated from docs/PLAN_UNTIL_TUESDAY.md by scripts/build-plan-data.py.
insert into public.project_plan(plan_id, title, subtitle, deadline_at, source_path, version)
values (
  'yongin-tuesday-20260908',
  '화요일까지 법령 DB 시연 구현',
  '월요일 23:00 기능 동결 · 화요일 12:00 최종 시연 준비',
  '2026-09-08 12:00:00+09'::timestamptz,
  'docs/PLAN_UNTIL_TUESDAY.md',
  '2026-09-05-v1'
)
on conflict (plan_id) do update set
  title=excluded.title,
  subtitle=excluded.subtitle,
  deadline_at=excluded.deadline_at,
  source_path=excluded.source_path,
  version=excluded.version,
  updated_at=now();

insert into public.project_plan_item(
  plan_id, item_id, sort_order, day_id, plan_date, day_label, phase, time_range,
  duration_minutes, title, criteria, kind, status, progress, note
)
values
    """ + ",\n".join(sql_rows) + "\non conflict (plan_id, item_id) do update set\n  sort_order=excluded.sort_order,\n  day_id=excluded.day_id,\n  plan_date=excluded.plan_date,\n  day_label=excluded.day_label,\n  phase=excluded.phase,\n  time_range=excluded.time_range,\n  duration_minutes=excluded.duration_minutes,\n  title=excluded.title,\n  criteria=excluded.criteria,\n  kind=excluded.kind,\n  updated_at=now();\n"
    SQL_OUTPUT.write_text(sql, encoding="utf-8")
    print(json.dumps({"source": str(SOURCE), "output": str(OUTPUT), "sql": str(SQL_OUTPUT), "items": len(items)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
