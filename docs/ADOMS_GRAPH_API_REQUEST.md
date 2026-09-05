# ADOMS Graph API 연동 요청서

## 요청 목적

용인시 영업 시연의 첫 화면에서 대상 프로필과 상시근로자 수·시설 연면적 등 사실값을 바꾸면 **L1 적용 법령 후보 → L2 대상 후보 → L3 의무 후보**가 다시 계산되고, 각 결과의 원문 근거와 판정 경로를 표시하려고 한다. 결과는 최종 법률 판단이 아니라 검수 가능한 적용 가능성 후보로 표현한다.

## 우선 요청할 자료

1. 개발 또는 시연용 API base URL
2. OpenAPI/Swagger 문서 또는 GraphQL schema
3. 인증 방식과 **읽기 전용·단기 시연용 키**
4. CORS 허용 origin 목록과 요청 한도
5. 데이터 snapshot/version, 기준일, 법령 원문 출처

브라우저에 넣어도 되는 publishable demo key가 아니라면 키를 프런트엔드 환경변수에 두지 않는다. Netlify Function 또는 별도 API proxy가 키를 보관하고 프런트엔드는 proxy만 호출한다.

## 최소 판정 API

`POST /scope/assess`

요청에는 `as_of`, `scenario_id`, `law_snapshot_id`, `rule_set_version`, `selected_profile_ids[]`, `profile_facts[]`를 포함한다. 각 사실값은 `key`, typed `value`, `unit`, `measured_subject`, `source_type`, `source_url`, `captured_at`, `verified_at`, `assumption_note`를 가진다.

응답에는 다음이 필요하다.

- `run_id`, 실행시각, 입력 snapshot, law/rule snapshot
- L1/L2/L3별 `rule_id`, 조건식 AST, 사용한 사실값, 판정 결과와 설명
- 판정값: `applicable_candidate`, `not_applicable_candidate`, `unknown`, `not_evaluated`, `not_eligible_for_matching`
- 전후 비교: `added`, `removed`, `unchanged`, `held`
- 화면 구간: `rule_matched_candidate`, `profile_related_needs_facts`, `review_required_or_unknown`
- 총 모수, 필터 후 모수, 미판정·제외 수와 사유

## 근거 bundle 필수 필드

| 필드 | 목적 |
|---|---|
| `law_id`, `law_name` | 법령 식별 |
| `provision_anchor` 또는 `unit_path` | 조문 위치 |
| `source_quote` | 정확한 원문 인용 |
| `quote_locator` 또는 공식 URL | 원문 재현 |
| `source_ref`, `snapshot_hash`, `effective_date` | 판본·시행일 추적 |
| `rule_id`, `rule_version`, `layer` | L1/L2/L3 판정 규칙 |
| `obl_id`, `unit_id` | 의무·근거 연결 |
| `evidence_status`, `human_review_status` | 검수 상태 |

근거 bundle이 불완전한 결과는 ‘검토 필요’ 큐에만 표시하고 이행·증빙 인스턴스로 전환하지 않는다.

## 규칙 의미론

복합 조건은 행별 OR가 아니라 AND/OR/NOT, 범위와 예외를 가진 하나의 조건식으로 반환해야 한다. 측정대상을 분리하여 상시근로자 수를 작업자 수, 연구활동종사자 수, 선임 인원 등에 대입하지 않는다. `reference`와 `implementation` 등급은 판정식에서 제외한다.

## 검수 API

`POST /reviews`는 `reviewer`, `include|exclude|hold`, 사유, 검수시각, 근거 참조를 append-only 이력으로 저장해야 한다. `GET /meta`는 전체 후보, 검수대상, 검수완료, 보류, unknown과 데이터 snapshot을 반환해야 한다.
