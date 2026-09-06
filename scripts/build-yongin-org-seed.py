#!/usr/bin/env python3
"""Build a traceable Yongin organization reference snapshot from official pages.

The public organization chart exposes hierarchy and official department codes. Team
names are derived from public `...팀장` position labels on department detail pages.
Personal names and person-level duties are intentionally not collected.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable

import requests
from bs4 import BeautifulSoup, Tag

BASE_URL = "https://www.yongin.go.kr"
CHART_URLS = {
    "시청": f"{BASE_URL}/home/yiIf/yiIfHall/organizeGuide/organizeGuide01.jsp",
    "의회사무국·직속기관·사업소": f"{BASE_URL}/home/yiIf/yiIfHall/organizeGuide/organizeGuide02.jsp",
    "3개구청": f"{BASE_URL}/home/yiIf/yiIfHall/organizeGuide/organizeGuide03.jsp",
}
DETAIL_URL = f"{BASE_URL}/common/orgcht/BD_selectOrgList.do"
MOVE_RE = re.compile(
    r"moveDeptGuide\('([^']*)','([^']*)','([^']*)'(?:,'([^']*)')?\)"
)
TEAM_LEADER_RE = re.compile(r"^(.+팀장)$")
SPACE_RE = re.compile(r"\s+")
EXPECTED = {
    "city_departments": 66,
    "city_teams": 276,
    "council_departments": 2,
    "council_teams": 9,
    "direct_agencies": 4,
    "direct_departments": 9,
    "direct_teams": 39,
    "service_offices": 5,
    "service_departments": 14,
    "service_teams": 66,
    "districts": 3,
    "district_departments": 38,
    "district_teams": 166,
    "local_offices": 39,
}


@dataclass
class QueryRef:
    dept_code: str
    query_name: str
    position_code: str = ""
    location: str = ""


@dataclass
class OrgUnit:
    org_key: str
    parent_org_key: str | None
    source_code: str | None
    name: str
    org_type: str
    hierarchy_level: int
    hierarchy_path: str
    source_section: str
    location: str | None
    representative_phone: str | None
    source_url: str
    snapshot_date: str
    fetched_at: str
    is_active: bool = True
    attributes: dict[str, object] = field(default_factory=dict)
    sort_order: int = 0


class OrgBuilder:
    def __init__(self, snapshot_date: str, fetched_at: str) -> None:
        self.snapshot_date = snapshot_date
        self.fetched_at = fetched_at
        self.units: list[OrgUnit] = []
        self.by_key: dict[str, OrgUnit] = {}
        self.query_refs: list[tuple[str, QueryRef]] = []
        self._sort_order = 0
        self.root = self.add_unit(
            parent=None,
            name="용인특례시",
            org_type="CITY",
            source_section="용인시",
            source_url=CHART_URLS["시청"],
            source_code="4050000000000000000",
            attributes={"official_summary": "시청 2실 13국 66과 276팀"},
            fixed_key="YONGIN:CITY",
        )

    def add_unit(
        self,
        *,
        parent: OrgUnit | None,
        name: str,
        org_type: str,
        source_section: str,
        source_url: str,
        source_code: str | None = None,
        location: str | None = None,
        representative_phone: str | None = None,
        attributes: dict[str, object] | None = None,
        fixed_key: str | None = None,
    ) -> OrgUnit:
        name = normalize(name)
        path = f"{parent.hierarchy_path} / {name}" if parent else name
        raw_key = f"{parent.org_key if parent else ''}|{org_type}|{source_code or ''}|{name}"
        org_key = fixed_key or f"YONGIN:{org_type}:{hashlib.sha1(raw_key.encode()).hexdigest()[:20]}"
        if org_key in self.by_key:
            return self.by_key[org_key]
        self._sort_order += 1
        unit = OrgUnit(
            org_key=org_key,
            parent_org_key=parent.org_key if parent else None,
            source_code=source_code or None,
            name=name,
            org_type=org_type,
            hierarchy_level=0 if parent is None else parent.hierarchy_level + 1,
            hierarchy_path=path,
            source_section=source_section,
            location=normalize(location) or None,
            representative_phone=normalize(representative_phone) or None,
            source_url=source_url,
            snapshot_date=self.snapshot_date,
            fetched_at=self.fetched_at,
            attributes=attributes or {},
            sort_order=self._sort_order,
        )
        self.units.append(unit)
        self.by_key[org_key] = unit
        return unit


def normalize(value: str | None) -> str:
    return SPACE_RE.sub(" ", value or "").strip()


def parse_move(anchor: Tag) -> QueryRef | None:
    match = MOVE_RE.search(anchor.get("onclick", ""))
    if not match:
        return None
    dept_code, query_name, position_code, location = match.groups()
    return QueryRef(
        dept_code=normalize(dept_code),
        query_name=normalize(query_name),
        position_code=normalize(position_code),
        location=normalize(location),
    )


def fetch(url: str, *, method: str = "GET", data: dict[str, str] | None = None) -> str:
    headers = {
        "User-Agent": "YonginSafetyDemo/1.0 (+official organization snapshot)",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = requests.request(
                method, url, data=data, headers=headers, timeout=45
            )
            response.raise_for_status()
            response.encoding = response.apparent_encoding or "utf-8"
            return response.text
        except Exception as exc:  # pragma: no cover - live source guard
            last_error = exc
            time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def direct_child(parent: Tag, name: str, class_name: str) -> Tag | None:
    for child in parent.children:
        if isinstance(child, Tag) and child.name == name and class_name in child.get(
            "class", []
        ):
            return child
    return None


def parse_city(builder: OrgBuilder, html: str) -> None:
    soup = BeautifulSoup(html, "html.parser")
    chart = soup.select_one(".cont_box.chart01 .organization")
    if not chart:
        raise ValueError("City organization chart was not found")

    executive_names = {"시장", "제1부시장", "제2부시장"}
    executives: dict[str, OrgUnit] = {}
    for anchor in chart.select("a[onclick*='moveDeptGuide']"):
        ref = parse_move(anchor)
        if ref and ref.query_name in executive_names:
            executives[ref.query_name] = builder.add_unit(
                parent=builder.root,
                name=ref.query_name,
                org_type="EXECUTIVE",
                source_section="시청",
                source_url=CHART_URLS["시청"],
                source_code=ref.dept_code,
                location=ref.location,
            )

    direct_parent = {
        "시민소통관": "시장",
        "감사관": "제1부시장",
        "공보관": "제1부시장",
        "미디어담당관": "제1부시장",
        "안전정책관": "제2부시장",
        "재난대응담당관": "제2부시장",
        "도시기획단": "제2부시장",
    }
    for anchor in chart.select(".depth2_list a[onclick*='moveDeptGuide']"):
        ref = parse_move(anchor)
        if not ref or ref.query_name not in direct_parent:
            continue
        unit = builder.add_unit(
            parent=executives[direct_parent[ref.query_name]],
            name=normalize(anchor.get_text(" ", strip=True)),
            org_type="DEPARTMENT",
            source_section="시청",
            source_url=CHART_URLS["시청"],
            source_code=ref.dept_code,
            location=ref.location,
            attributes={"query_name": ref.query_name},
        )
        builder.query_refs.append((unit.org_key, ref))

    for group_li in chart.select(".depth_z_bg > ul.depth_z > li"):
        listbox = direct_child(group_li, "div", "listbox")
        if not listbox:
            continue
        group_name = normalize(listbox.get_text(" ", strip=True))
        branch_name = ""
        ancestor = group_li.parent
        while isinstance(ancestor, Tag):
            if ancestor.name == "li":
                title = direct_child(ancestor, "div", "titbox")
                anchor = title.find("a") if title else None
                ref = parse_move(anchor) if anchor else None
                if ref and ref.query_name in {"제1부시장", "제2부시장"}:
                    branch_name = ref.query_name
                    break
            ancestor = ancestor.parent
        if not branch_name:
            raise ValueError(f"No executive parent found for {group_name}")
        group = builder.add_unit(
            parent=executives[branch_name],
            name=group_name,
            org_type="OFFICE" if group_name.endswith("실") else "BUREAU",
            source_section="시청",
            source_url=CHART_URLS["시청"],
        )
        detail = direct_child(group_li, "div", "depth_z_list")
        for anchor in detail.select("a[onclick*='moveDeptGuide']") if detail else []:
            ref = parse_move(anchor)
            if not ref:
                continue
            unit = builder.add_unit(
                parent=group,
                name=normalize(anchor.get_text(" ", strip=True)),
                org_type="DEPARTMENT",
                source_section="시청",
                source_url=CHART_URLS["시청"],
                source_code=ref.dept_code,
                location=ref.location,
                attributes={"query_name": ref.query_name},
            )
            builder.query_refs.append((unit.org_key, ref))


def parse_agencies(builder: OrgBuilder, html: str) -> None:
    soup = BeautifulSoup(html, "html.parser")
    chart = soup.select_one(".cont_box.chart02")
    if not chart:
        raise ValueError("Agency organization chart was not found")

    for heading in chart.select("h4.tit_h4"):
        section = normalize(heading.get_text(" ", strip=True)).split("(", 1)[0].strip()
        organization = heading.find_next_sibling("div", class_="organization")
        if not organization:
            continue
        category = None
        if section in {"직속기관", "사업소"}:
            category = builder.add_unit(
                parent=builder.root,
                name=section,
                org_type="GROUP",
                source_section=section,
                source_url=CHART_URLS["의회사무국·직속기관·사업소"],
            )
        for group_li in organization.select(".depth_z_bg > ul.depth_z > li"):
            listbox = direct_child(group_li, "div", "listbox")
            parent_anchor = listbox.find("a") if listbox else None
            parent_ref = parse_move(parent_anchor) if parent_anchor else None
            if not parent_anchor or not parent_ref:
                continue
            institution_name = normalize(parent_anchor.get_text(" ", strip=True))
            institution = builder.add_unit(
                parent=category or builder.root,
                name=institution_name,
                org_type=(
                    "COUNCIL_OFFICE"
                    if section == "의회사무국"
                    else "DIRECT_AGENCY"
                    if section == "직속기관"
                    else "SERVICE_OFFICE"
                ),
                source_section=section,
                source_url=CHART_URLS["의회사무국·직속기관·사업소"],
                source_code=parent_ref.dept_code,
                location=parent_ref.location,
                attributes={
                    "query_name": parent_ref.query_name,
                    "position_code": parent_ref.position_code,
                },
            )
            detail = direct_child(group_li, "div", "depth_z_list")
            children = detail.select("a[onclick*='moveDeptGuide']") if detail else []
            for anchor in children:
                ref = parse_move(anchor)
                if not ref:
                    continue
                child_name = normalize(anchor.get_text(" ", strip=True))
                if child_name == institution.name and ref.dept_code == institution.source_code:
                    institution.attributes["query_name"] = ref.query_name
                    builder.query_refs.append((institution.org_key, ref))
                    continue
                child = builder.add_unit(
                    parent=institution,
                    name=child_name,
                    org_type="DEPARTMENT",
                    source_section=section,
                    source_url=CHART_URLS["의회사무국·직속기관·사업소"],
                    source_code=ref.dept_code,
                    location=ref.location,
                    attributes={"query_name": ref.query_name},
                )
                builder.query_refs.append((child.org_key, ref))


def parse_districts(builder: OrgBuilder, html: str) -> None:
    soup = BeautifulSoup(html, "html.parser")
    organization = soup.select_one(".cont_box.chart03 .organization")
    if not organization:
        raise ValueError("District organization chart was not found")

    for depth1 in organization.select("ul.depth1"):
        title = depth1.select_one(".depth2 > li > .titbox > a")
        if not title:
            continue
        district = builder.add_unit(
            parent=builder.root,
            name=normalize(title.get_text(" ", strip=True)),
            org_type="DISTRICT",
            source_section="3개구청",
            source_url=CHART_URLS["3개구청"],
        )
        for group_li in depth1.select(".depth_z_bg > ul.depth_z > li"):
            listbox = direct_child(group_li, "div", "listbox")
            group_name = normalize(listbox.get_text(" ", strip=True)) if listbox else ""
            detail = direct_child(group_li, "div", "depth_z_list")
            for anchor in detail.select("a[onclick*='moveDeptGuide']") if detail else []:
                ref = parse_move(anchor)
                if not ref:
                    continue
                unit = builder.add_unit(
                    parent=district,
                    name=normalize(anchor.get_text(" ", strip=True)),
                    org_type="DEPARTMENT" if "과" in group_name else "LOCAL_OFFICE",
                    source_section="3개구청",
                    source_url=CHART_URLS["3개구청"],
                    source_code=ref.dept_code,
                    location=ref.location,
                    attributes={"query_name": ref.query_name, "district_group": group_name},
                )
                builder.query_refs.append((unit.org_key, ref))


def load_teams(unit_key: str, ref: QueryRef) -> tuple[str, list[dict[str, str]]]:
    html = fetch(
        DETAIL_URL,
        method="POST",
        data={
            "q_deptCode": ref.dept_code,
            "q_deptNm": ref.query_name,
            "q_floorInfo": ref.location,
            "q_ofcpsCode": ref.position_code,
            "q_domainCode": "1",
            "q_searchKey": "",
            "q_searchVal": "",
        },
    )
    soup = BeautifulSoup(html, "html.parser")
    teams: dict[str, dict[str, str]] = {}
    for row in soup.select("div.tbl_st1 table tbody tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 3:
            continue
        position = normalize(cells[0].get_text(" ", strip=True))
        position = re.sub(r"\s*\([^)]*\)\s*$", "", position).strip()
        if position == "부팀장":
            continue
        match = TEAM_LEADER_RE.match(position)
        if not match:
            continue
        team_name = normalize(match.group(1)[: -len("팀장")] + "팀")
        phone = normalize(cells[1].get_text(" ", strip=True))
        duty = normalize(cells[2].get_text(" ", strip=True))
        teams.setdefault(
            team_name,
            {"name": team_name, "phone": phone, "leader_duty": duty},
        )
    return unit_key, list(teams.values())


def add_teams(builder: OrgBuilder, workers: int) -> dict[str, int]:
    failures: list[str] = []
    per_section: dict[str, int] = {}
    unique_queries: dict[str, QueryRef] = {}
    for unit_key, ref in builder.query_refs:
        unique_queries[unit_key] = ref
    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {
            pool.submit(load_teams, unit_key, ref): (unit_key, ref)
            for unit_key, ref in unique_queries.items()
        }
        for index, future in enumerate(as_completed(future_map), start=1):
            unit_key, ref = future_map[future]
            try:
                result_key, teams = future.result()
            except Exception as exc:  # pragma: no cover - live source guard
                failures.append(f"{ref.dept_code}/{ref.query_name}: {exc}")
                continue
            parent = builder.by_key[result_key]
            for team in teams:
                builder.add_unit(
                    parent=parent,
                    name=team["name"],
                    org_type="TEAM",
                    source_section=parent.source_section,
                    source_url=DETAIL_URL,
                    representative_phone=team["phone"],
                    attributes={
                        "derived_from": "public_position_label_ending_with_team_leader",
                        "leader_duty": team["leader_duty"],
                        "parent_source_code": parent.source_code,
                    },
                )
                per_section[parent.source_section] = per_section.get(parent.source_section, 0) + 1
            if index % 25 == 0:
                print(f"Fetched team details: {index}/{len(future_map)}", file=sys.stderr)
    if failures:
        raise RuntimeError("Team detail fetch failures:\n" + "\n".join(failures))
    return per_section


def summarize(builder: OrgBuilder, team_sections: dict[str, int]) -> dict[str, object]:
    counts: dict[str, int] = {}
    team_counts_by_parent_type: dict[str, int] = {}
    for unit in builder.units:
        counts[unit.org_type] = counts.get(unit.org_type, 0) + 1
        if unit.org_type == "TEAM" and unit.parent_org_key:
            parent = builder.by_key[unit.parent_org_key]
            key = f"{unit.source_section}/{parent.org_type}"
            team_counts_by_parent_type[key] = team_counts_by_parent_type.get(key, 0) + 1
    return {
        "snapshot_date": builder.snapshot_date,
        "fetched_at": builder.fetched_at,
        "source_urls": list(CHART_URLS.values()) + [DETAIL_URL],
        "total_units": len(builder.units),
        "counts_by_type": dict(sorted(counts.items())),
        "team_counts_by_section": dict(sorted(team_sections.items())),
        "team_counts_by_parent_type": dict(sorted(team_counts_by_parent_type.items())),
        "detail_requests": len({unit_key for unit_key, _ in builder.query_refs}),
        "expected_official_counts": EXPECTED,
        "team_count_note": "Official page totals count chart teams. Derived TEAM rows include only currently published unique positions ending in 팀장; 읍·면·동 teams are reported separately and official summary totals can differ from live staff listings.",
        "privacy_scope": "No personal names; organization units, public codes, locations and team representative phones only.",
    }


def validate(builder: OrgBuilder, team_sections: dict[str, int], strict: bool) -> None:
    units = builder.units
    paths = [unit.hierarchy_path for unit in units]
    keys = [unit.org_key for unit in units]
    assert len(paths) == len(set(paths)), "Duplicate hierarchy paths"
    assert len(keys) == len(set(keys)), "Duplicate org keys"
    assert all(
        unit.parent_org_key is None or unit.parent_org_key in builder.by_key for unit in units
    ), "Missing parent key"

    count = lambda org_type, section=None: sum(  # noqa: E731
        1
        for unit in units
        if unit.org_type == org_type
        and (section is None or unit.source_section == section)
    )
    structural_actual = {
        "city_departments": count("DEPARTMENT", "시청"),
        "council_departments": count("DEPARTMENT", "의회사무국"),
        "direct_agencies": count("DIRECT_AGENCY"),
        "direct_departments": count("DEPARTMENT", "직속기관"),
        "service_offices": count("SERVICE_OFFICE"),
        "service_departments": count("DEPARTMENT", "사업소"),
        "districts": count("DISTRICT"),
        "district_departments": count("DEPARTMENT", "3개구청"),
        "local_offices": count("LOCAL_OFFICE"),
    }
    structural_mismatches = {
        key: {"expected": EXPECTED[key], "actual": value}
        for key, value in structural_actual.items()
        if EXPECTED[key] != value
    }
    if structural_mismatches:
        message = "Official structural-count mismatches: " + json.dumps(
            structural_mismatches, ensure_ascii=False
        )
        if strict:
            raise AssertionError(message)
        print(f"WARNING: {message}", file=sys.stderr)

    derived_team_actual = {
        "city_teams": team_sections.get("시청", 0),
        "council_teams": team_sections.get("의회사무국", 0),
        "direct_teams": team_sections.get("직속기관", 0),
        "service_teams": team_sections.get("사업소", 0),
        "district_teams": sum(
            1
            for unit in units
            if unit.org_type == "TEAM"
            and unit.parent_org_key
            and builder.by_key[unit.parent_org_key].org_type == "DEPARTMENT"
            and unit.source_section == "3개구청"
        ),
    }
    team_mismatches = {
        key: {"official_chart": EXPECTED[key], "published_team_leaders": value}
        for key, value in derived_team_actual.items()
        if EXPECTED[key] != value
    }
    if team_mismatches:
        print(
            "NOTICE: team totals differ by source scope: "
            + json.dumps(team_mismatches, ensure_ascii=False),
            file=sys.stderr,
        )


def sql_literal(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        return "'" + text.replace("'", "''") + "'::jsonb"
    return "'" + str(value).replace("'", "''") + "'"


def write_csv(path: Path, units: Iterable[OrgUnit]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "org_key",
        "parent_org_key",
        "source_code",
        "name",
        "org_type",
        "hierarchy_level",
        "hierarchy_path",
        "source_section",
        "location",
        "representative_phone",
        "source_url",
        "snapshot_date",
        "fetched_at",
        "is_active",
        "attributes",
        "sort_order",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for unit in units:
            row = asdict(unit)
            row["attributes"] = json.dumps(
                row["attributes"], ensure_ascii=False, separators=(",", ":")
            )
            writer.writerow(row)


def write_sql(path: Path, units: list[OrgUnit], report: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    columns = [
        "org_key",
        "parent_org_key",
        "source_code",
        "name",
        "org_type",
        "hierarchy_level",
        "hierarchy_path",
        "source_section",
        "location",
        "representative_phone",
        "source_url",
        "snapshot_date",
        "fetched_at",
        "is_active",
        "attributes",
        "sort_order",
    ]
    lines = [
        "-- Generated from the official Yongin organization chart.",
        f"-- Snapshot: {report['snapshot_date']}; units: {report['total_units']}.",
        "begin;",
        "create temporary table staging_yongin_org_unit (like public.ref_yongin_org_unit including defaults) on commit drop;",
        "",
    ]
    for start in range(0, len(units), 250):
        chunk = units[start : start + 250]
        lines.append(
            "insert into staging_yongin_org_unit (" + ",".join(columns) + ") values"
        )
        value_lines = []
        for unit in chunk:
            row = asdict(unit)
            value_lines.append(
                "(" + ",".join(sql_literal(row[column]) for column in columns) + ")"
            )
        lines.append(",\n".join(value_lines) + ";")
        lines.append("")
    lines.extend(
        [
            "insert into public.ref_yongin_org_unit (" + ",".join(columns) + ")",
            "select " + ",".join(columns) + " from staging_yongin_org_unit",
            "on conflict (org_key) do update set",
            "  parent_org_key=excluded.parent_org_key, source_code=excluded.source_code, name=excluded.name,",
            "  org_type=excluded.org_type, hierarchy_level=excluded.hierarchy_level, hierarchy_path=excluded.hierarchy_path,",
            "  source_section=excluded.source_section, location=excluded.location, representative_phone=excluded.representative_phone,",
            "  source_url=excluded.source_url, snapshot_date=excluded.snapshot_date, fetched_at=excluded.fetched_at,",
            "  is_active=excluded.is_active, attributes=excluded.attributes, sort_order=excluded.sort_order;",
            "",
            "update public.ref_yongin_org_unit target",
            "set is_active=false, fetched_at=(select max(fetched_at) from staging_yongin_org_unit)",
            "where target.is_active and not exists (select 1 from staging_yongin_org_unit source where source.org_key=target.org_key);",
            "",
            "insert into public.ref_yongin_org_snapshot(snapshot_date,fetched_at,source_urls,summary)",
            "values ("
            + ",".join(
                [
                    sql_literal(report["snapshot_date"]),
                    sql_literal(report["fetched_at"]),
                    sql_literal(report["source_urls"]),
                    sql_literal(report),
                ]
            )
            + ")",
            "on conflict (snapshot_date) do update set fetched_at=excluded.fetched_at, source_urls=excluded.source_urls, summary=excluded.summary;",
            "commit;",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot-date", default="2026-09-06")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument(
        "--csv", default="data/yongin_org_units_20260906.csv", type=Path
    )
    parser.add_argument(
        "--sql", default="supabase/seed_yongin_org.sql", type=Path
    )
    parser.add_argument(
        "--report", default="docs/YONGIN_ORG_IMPORT_REPORT.json", type=Path
    )
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    fetched_at = datetime.now(UTC).replace(microsecond=0).isoformat()
    html = {section: fetch(url) for section, url in CHART_URLS.items()}
    builder = OrgBuilder(args.snapshot_date, fetched_at)
    parse_city(builder, html["시청"])
    parse_agencies(builder, html["의회사무국·직속기관·사업소"])
    parse_districts(builder, html["3개구청"])
    team_sections = add_teams(builder, max(1, min(args.workers, 12)))
    validate(builder, team_sections, args.strict)
    report = summarize(builder, team_sections)

    write_csv(args.csv, builder.units)
    write_sql(args.sql, builder.units, report)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
