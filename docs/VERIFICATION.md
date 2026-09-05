# 검증 기록

**검증일:** 2026-09-05

| 검증                          | 결과                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| TypeScript `pnpm check`       | 통과                                                                                           |
| Production build `pnpm build` | 통과                                                                                           |
| 적용판정 단위 테스트          | 5개 통과: 20~49명 AND, 400㎡ 또는 50명 OR, 50명 경계, 중복 병합                                |
| ADOMS 원격 데이터             | 법령 104·조문 304·의무 216·규칙 128·연결 128건 추가 적재                                       |
| ADOMS 승인 범위               | 실제 `demo_approved=true` 규칙·연결 31건; 첫 화면 선택 실행 4건                                |
| ADOMS 화면 스모크             | 승인 규칙 4·연결 4·의무 2·원문 조문 2 조회, 판정 스냅숏 4건 저장 후 원복 통과                  |
| Supabase 공개키 보안 테스트   | 3개 통과: Auth API, 서비스키 비노출, private RPC 비노출                                        |
| Supabase 필수 리소스          | 핵심 테이블 19개와 비공개 버킷, 총 20개 리소스 준비 완료                                       |
| Supabase CRUD·Storage         | Target CRUD, Storage 왕복, 감사로그 3건 및 임시 데이터 정리 통과                               |
| 내부 추진현황 제거            | UI 라우트·메뉴·소스 삭제, 원격 3개 테이블과 Realtime 등록 제거                                 |
| 첫 화면                       | `/`와 `/applicability`에서 Supabase ADOMS 출처, 인원·면적 변경에 따른 L1/L2/L3 후보·근거 표시  |
| 기존 시연 흐름                | `/dashboard`, `/targets`, `/laws`, `/obligations`, `/evidence`, `/inspection`, `/summary` 유지 |
| 화면 단순화                   | PPT형 경영목표·경영방침 상단 줄 제거                                                           |
| 좌측 메뉴                     | 자동 접기 제거, `#090909` 외곽과 밝은 내부 컨테이너로 고정                                     |
| 이행현황                      | 카드 간격 24px, 일반 보더 1px, 기한초과 보더·수치 주조색, 동일 숫자 위계 적용                  |
| 관리대상                      | Supabase FMS 시설 150건·공중교통수단 1건·도급 2건을 분류 탭으로 표시                           |
| 시설 의무 매핑                | CSV 2,906건과 명시적 시연값 23건, 총 2,929건 원격 적재                                         |
| 법 의무사항 원격 조회         | 공중이용시설·공중교통수단 151개와 대상별 의무 건수 표시, 고기상수도 31개 상세 조인 확인        |
| 시설 의무 브라우저 검증       | 목록 행 선택 후 의무분류·관계법령·근거·의무사항·이행시기 표 전환 확인                          |
| 단일 대상 종속 데이터         | 적용판정 4건, 대상의무·이행·점검범위·점검결과 각 10건                                          |
| 민감정보 검사                 | GitHub PAT, JWT anon key, 실제 publishable/비공개 Graph API 키를 추적 파일에 포함하지 않음     |
| Supabase Security Advisor     | 경고 0건                                                                                       |
| Supabase Performance Advisor  | 신규 DB의 미사용 인덱스 INFO만 존재                                                            |

## 적용범위 판정 안전장치

첫 화면은 ‘규칙상 조건 충족 후보’, ‘프로필 연관·조건 확인 필요’, ‘원천 검수 필요’를 동시에 표시한다. 검수된 축소 시연 규칙만 실행하며, 조건 불충족은 법적 비적용 확정이 아니라 검토 보류로 표시한다. 각 상세에는 규칙 ID, 조건, 입력값, 근거 단위 ID, 인용문과 판정 설명을 제공한다.

첫 화면은 Supabase에 투영한 ADOMS `ref_rule`·`ref_rule_obligation`·`ref_obligation`·`ref_unit`을 실제 조회한다. 원격 조회 실패 시에만 동일한 `rul_id`·`unit_id`·`obl_id`를 가진 내장 폴백 4개를 사용한다. 판정 저장 시 `facts_effective_at`과 시스템 `recorded_at`을 분리해 `target_applicability.input_snapshot`에 함께 기록한다.

1600×1000 전체 화면 캡처에서 `/`와 `/applicability`가 동일한 판정 첫 화면을 표시했고, 용인시 브랜드 셸 안에서 입력·L1/L2/L3 요약·3구간 후보·근거 패널이 한 화면에 렌더링됐다. 기존 `/dashboard`, `/laws`, `/obligations` 화면도 정상 유지됐다.

## 원격 DB 상태

Supabase 프로젝트 `gxpfnszbwvfyogwshvas`에는 법령·대상·적용판정·의무·이행·증빙·점검·감사 핵심 스키마가 유지된다. 웹 추진현황용 `project_plan`, `project_plan_item`, `project_plan_event`는 사용자 요청에 따라 제거했다.

시설 참조 계층은 `ref_managed_target`, `ref_managed_target_obligation`으로 분리했다. 원격 검증 기준 대상 153건 중 150건은 FMS 원천이고 3건은 시연값이다. 용인경전철은 FMS 시설물이 아닌 `공중교통수단`으로 분류했으며 경전철 도급 2건은 실제 계약원장 연계 전 `DEMO_VIRTUAL`로 보존한다.

법 의무사항 화면은 두 참조 테이블과 `ref_obligation`을 결합한다. 1600×900 목록에서 `Supabase 시설 151건`과 각 대상의 적용 의무 건수를 확인했고, 고기상수도 선택 시 시설물안전법·중대재해처벌법·수도법 그룹의 원격 의무 31건이 표시됐다. 이행시기 입력은 현재 대상별 localStorage이며 원격 업무기록 승격은 별도 과제다.
