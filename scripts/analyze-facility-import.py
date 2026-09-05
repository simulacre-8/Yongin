#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

SOURCE_DIR = (
    Path(r'C:\Yongin_test\data\source')
    if os.name == 'nt'
    else Path(os.environ.get('YONGIN_DATA_DIR', '/home/ubuntu/upload'))
)
FACILITY = SOURCE_DIR / '데모대상_용인시소관_20260906.csv'
MAPPING = SOURCE_DIR / '의무매핑_시설_용인시_20260906.csv'


def raw_rows(path: Path):
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        return list(csv.reader(handle))


def dict_rows(path: Path):
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def summarize(path: Path, expected_columns: int):
    raw = raw_rows(path)
    header, data = raw[0], raw[1:]
    malformed = [
        {'physical_row': index + 2, 'columns': len(row), 'prefix': row[:3]}
        for index, row in enumerate(data)
        if len(row) != expected_columns
    ]
    return {
        'path': str(path),
        'bytes': path.stat().st_size,
        'physical_rows': len(data),
        'header_columns': len(header),
        'expected_columns': expected_columns,
        'malformed_rows': malformed[:50],
        'malformed_count': len(malformed),
    }


facility_raw = raw_rows(FACILITY)
mapping_raw = raw_rows(MAPPING)
facility_rows = dict_rows(FACILITY)
mapping_rows = dict_rows(MAPPING)

# DictReader may silently put excess columns under None. Surface those rows.
facility_excess = sum(1 for row in facility_rows if row.get(None))
mapping_excess = sum(1 for row in mapping_rows if row.get(None))

facility_ids = [row.get('facilNo', '') for row in facility_rows]
mapping_facility_ids = [row.get('facilNo', '') for row in mapping_rows]
map_pairs = [(row.get('facilNo', ''), row.get('obl_id', '')) for row in mapping_rows]

facility_by_id = {row.get('facilNo', ''): row for row in facility_rows if row.get('facilNo')}
mapping_by_facility: dict[str, list[dict]] = defaultdict(list)
mapping_by_obligation: dict[str, list[dict]] = defaultdict(list)
for row in mapping_rows:
    if row.get('facilNo'):
        mapping_by_facility[row['facilNo']].append(row)
    if row.get('obl_id'):
        mapping_by_obligation[row['obl_id']].append(row)

keywords = ('경전철', '에버라인', '도시철도', '철도', '도급', '용역', '위탁')
facility_keyword_rows = [
    {key: row.get(key, '') for key in ('facilNo', 'facilNm', 'facilGbn', 'facilKind', 'subject_name', 'l2_result')}
    for row in facility_rows
    if any(keyword in ' '.join(row.get(k, '') or '' for k in row.keys() if k) for keyword in keywords)
]
mapping_keyword_rows = [
    {key: row.get(key, '') for key in ('facilNo', 'facilNm', 'obl_id', 'law_name', 'obl_title', 'l2_result')}
    for row in mapping_rows
    if any(keyword in ' '.join(row.get(k, '') or '' for k in row.keys() if k) for keyword in keywords)
]

facilities_with_mapping = set(mapping_by_facility)
facility_id_set = {value for value in facility_ids if value}
mapping_id_set = {value for value in mapping_facility_ids if value}

result = {
    'files': {
        'facility': summarize(FACILITY, len(facility_raw[0])),
        'mapping': summarize(MAPPING, len(mapping_raw[0])),
        'dictreader_excess_rows': {'facility': facility_excess, 'mapping': mapping_excess},
    },
    'facility': {
        'parsed_rows': len(facility_rows),
        'unique_ids': len(facility_id_set),
        'duplicate_ids': [key for key, count in Counter(facility_ids).items() if key and count > 1],
        'gbn': Counter(row.get('facilGbn', '') for row in facility_rows),
        'kind_top20': Counter(row.get('facilKind', '') for row in facility_rows).most_common(20),
        'class': Counter(row.get('facilClass', '') for row in facility_rows),
        'grade': Counter(row.get('sfGrade', '') for row in facility_rows),
        'subject_tier_top20': Counter(row.get('subject_tier', '') for row in facility_rows).most_common(20),
        'subject_source': Counter(row.get('subject_source', '') for row in facility_rows),
        'l2_result': Counter(row.get('l2_result', '') for row in facility_rows),
        'api_status': Counter(row.get('api_status', '') for row in facility_rows),
        'missing_address': sum(not (row.get('addr') or '').strip() for row in facility_rows),
        'missing_area': sum(not (row.get('bldGrsarea') or '').strip() for row in facility_rows),
    },
    'mapping': {
        'parsed_rows': len(mapping_rows),
        'unique_pairs': len(set(map_pairs)),
        'duplicate_pairs': sum(count - 1 for count in Counter(map_pairs).values() if count > 1),
        'unique_facility_ids': len(mapping_id_set),
        'unique_obligation_ids': len({row.get('obl_id', '') for row in mapping_rows if row.get('obl_id')}),
        'laws': Counter(row.get('law_name', '') for row in mapping_rows),
        'layers': Counter(row.get('layer', '') for row in mapping_rows),
        'confidence': Counter(row.get('map_confidence', '') for row in mapping_rows),
        'l2_result': Counter(row.get('l2_result', '') for row in mapping_rows),
        'cycle_missing': sum(not (row.get('cycle') or '').strip() for row in mapping_rows),
        'evidence_missing': sum(not (row.get('evidence') or '').strip() for row in mapping_rows),
        'mapping_count_min': min((len(rows) for rows in mapping_by_facility.values()), default=0),
        'mapping_count_max': max((len(rows) for rows in mapping_by_facility.values()), default=0),
        'mapping_count_distribution': Counter(len(rows) for rows in mapping_by_facility.values()),
        'obligation_conflicts': {
            obl_id: {
                field: sorted({row.get(field, '') for row in rows})
                for field in ('obl_title', 'law_name', 'unit_path', 'cycle', 'evidence')
                if len({row.get(field, '') for row in rows}) > 1
            }
            for obl_id, rows in mapping_by_obligation.items()
            if any(
                len({row.get(field, '') for row in rows}) > 1
                for field in ('obl_title', 'law_name', 'unit_path', 'cycle', 'evidence')
            )
        },
    },
    'join': {
        'facilities_with_mapping': len(facilities_with_mapping & facility_id_set),
        'facilities_without_mapping': sorted(facility_id_set - facilities_with_mapping)[:100],
        'mapping_ids_without_facility': sorted(mapping_id_set - facility_id_set)[:100],
    },
    'scenario_keywords': {
        'facility_rows': facility_keyword_rows[:100],
        'mapping_rows': mapping_keyword_rows[:100],
        'facility_matches': len(facility_keyword_rows),
        'mapping_matches': len(mapping_keyword_rows),
    },
    'scenario_candidates': {
        'applicable_facilities': [
            {
                key: row.get(key, '')
                for key in (
                    'facilNo', 'facilNm', 'facilGbn', 'facilKind', 'facilClass',
                    'sfGrade', 'addr', 'bldGrsarea', 'subject_name', 'l2_result',
                    'l2_rule', 'l2_confidence'
                )
            }
            for row in facility_rows
            if row.get('l2_result') == '해당'
        ],
        'contract_obligation_ids': sorted({
            row.get('obl_id', '')
            for row in mapping_rows
            if any(term in (row.get('obl_title') or '') for term in ('도급', '수급인', '위탁'))
        }),
        'rail_obligation_ids_from_scenario': [
            'OBL-0003946', 'OBL-0003107', 'OBL-0004543',
            'OBL-0003065', 'OBL-0003900'
        ],
    },
}

print(json.dumps(result, ensure_ascii=False, indent=2, default=lambda value: dict(value)))
