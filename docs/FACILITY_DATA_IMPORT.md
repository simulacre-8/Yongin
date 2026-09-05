# 용인시 시설·의무 매핑 데이터 반영

**원천일:** 2026-09-06  
**원천 파일:**

- `데모대상_시설_용인시소관_20260906.csv`: FMS 중 용인시 관할 시설 마스터
- `의무매핑_시설_용인시_20260906.csv`: 시설별 적용 의무 매핑 결과
- 기존 Supabase `ref_obligation`: 앞서 적재한 ADOMS 의무 마스터

## 분석 결과

| 항목                               |      결과 |
| ---------------------------------- | --------: |
| FMS 시설                           |     150건 |
| 시설 ID 중복                       |       0건 |
| 시설별 의무 매핑                   |   2,906건 |
| 시설-의무 복합키 중복              |       0건 |
| 매핑된 시설                        | 150/150건 |
| 매핑 고유 의무 ID                  |      71건 |
| 동일 의무 ID의 제목·법령·경로 충돌 |       0건 |
| 법령 종류                          |       8개 |
| `l2_result=해당` 시설              |      10건 |
| `검토필요` 시설                    |     138건 |
| `제외` 시설                        |       2건 |

시설 종류는 건축물 7, 교량 84, 댐 4, 기타 1, 옹벽 16, 절토사면 3, 상하수도 16, 터널 15, 하천 4건이다. 의무 매핑은 시설당 11·19·23·31건이며 전체 2,906건이 시설 마스터와 조인된다.

## 데이터 품질 판단

시설·의무 조인은 완전하지만 법적 적용 확정 데이터는 아니다. 150개 시설 중 138개가 `검토필요`이며 연면적은 144건에서 비어 있다. 따라서 화면에서 CSV의 `l2_result`, `l2_confidence`, `l2_need_data`를 그대로 보여주며 `검토필요`를 `해당`으로 승격하지 않는다.

CSV의 71개 의무 ID는 기존 `seed_adoms.sql`의 축소 의무 마스터와 겹치지 않는다. 그러나 매핑 파일 자체에 `obl_id`, `law_name`, `unit_path`, `obl_title`, `cycle`, `evidence`, 근거와 신뢰도가 포함되어 있고 동일 ID의 값 충돌이 없으므로, 시연용 의무 마스터를 재구성할 수 있다. 이 데이터의 `review_status`는 `client_mapped`, `source_version`은 `yongin-fms-20260906`으로 기록한다.

## 경전철·도급 공백과 보완 원칙

두 CSV에는 `경전철`, `에버라인`, 실제 계약원장이 없다. 이는 단순 누락으로만 보면 안 된다. **용인경전철은 FMS에서 관리되는 시설물이 아니라 도시철도법 제2조제2호의 궤도에 의한 교통시설·교통수단이며, 중대재해처벌법 제2조제5호와 시행령 별표 2·3에서 연결되는 공중교통수단 트랙으로 관리한다.** 도급 관련 의무는 `OBL-0000027 도급 기준절차`가 실제 시설 10건에 매핑되어 있으나, 실제 계약 레코드는 없다.

시연 시나리오를 완주하기 위해 다음 3개 대상만 보완한다.

| 대상                              | 분류           | 출처           |
| --------------------------------- | -------------- | -------------- |
| 용인경전철(에버라인)              | 공중교통수단   | `DEMO_VIRTUAL` |
| OO로 확·포장 공사                 | 도급·용역·위탁 | `DEMO_VIRTUAL` |
| 용인경전철 차량기지 시설관리 용역 | 도급·용역·위탁 | `DEMO_VIRTUAL` |

가상 레코드는 `source_kind=DEMO_VIRTUAL`, `is_demo_virtual=true`, `source_version=client-scenario-v1-20260906`으로 저장하고 화면에 **가상 데이터** 배지를 표시한다. 실제 자산·계약 원장이 오면 동일 source ID를 교체한다.

경전철 5개와 도급 8개 시나리오 의무는 클라이언트 시나리오에 명시된 ID·제목을 사용하되 정본 조문 앵커가 없으므로 `review_status=demo_virtual`로 저장한다. 법적 확정이나 검수 완료로 표시하지 않는다. CSV에서 직접 제공된 `OBL-0000027`은 `client_mapped`로 유지한다.

## 구현 구조

- `ref_managed_target`: FMS 시설과 시나리오 보완 대상을 함께 조회하는 읽기 전용 참조 테이블
- `ref_managed_target_obligation`: 관리대상과 의무의 읽기 전용 조인 테이블
- `v_managed_target_summary`: 대상별 매핑·해당·검토필요 건수를 제공하는 화면용 뷰
- `ref_obligation`: CSV의 71개 의무와 시나리오 보완 의무를 기존 ADOMS 식별자로 보존
- `target` 이하 업무 테이블: 실제 저장·이행·증빙·점검 기록용으로 계속 분리

## 생성·검증

Windows에서는 두 원천 CSV를 `C:\Yongin_test\data\source\`에 둔다. Linux·샌드박스에서는 `YONGIN_DATA_DIR` 환경변수로 같은 원천 폴더를 지정할 수 있다.

```bash
python3 scripts/analyze-facility-import.py
python3 scripts/build-facility-seed.py
python3 /home/ubuntu/skills/compliance-demo-factory/scripts/validate_sql.py .
```

생성 파일은 `supabase/seed_facility_catalog.sql`이며 손으로 수정하지 않는다.
