# DB·그래프 데이터 인수인계 가이드

## 1. 결론

화요일 시연의 고객별 업무 기록은 **호스팅형 Supabase PostgreSQL만으로 충분**하며 Docker는 필요 없다. 적용근거 그래프는 새 DB를 구매하기보다 이미 구축된 ADOMS Graph API의 읽기 전용 시연 스펙과 키를 받아 연결하는 것을 우선한다. 원천의 `law_id`, `unit_id`, `rul_id`, `obl_id`를 공통 식별자로 유지하면 두 저장소를 재가공 없이 연결할 수 있다.

현재 제공된 publishable/anon 키는 브라우저에서 RLS가 허용한 데이터를 읽고 쓰기 위한 공개키다. 스키마 생성 권한은 없으므로 담당자가 Supabase Dashboard의 SQL Editor에서 다음 파일을 순서대로 한 번 실행한다.

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/seed.sql`

실제 서비스 키와 데이터베이스 비밀번호는 브라우저, Git, 메신저에 두지 않는다.

## 2. 구현 선택지

| Approach | Tradeoffs | Cost | Setup Complexity |
|---|---|---|---|
| 호스팅형 Supabase PostgreSQL 단독 | 화요일까지 가장 단순하며 CRUD·Storage·RLS·집계에 적합하다. 다단계 경로 탐색은 재귀 SQL이나 관계 테이블로 처리한다. | 기존 Supabase 프로젝트 범위 | 낮음: SQL 2개 실행과 공개 환경변수 등록 |
| Supabase PostgreSQL + 별도 그래프 저장소 | `왜 이 의무가 적용되는가`, 법령 간 인용 경로, 다단계 영향 분석을 자연스럽게 표현한다. 동기화와 운영 대상이 하나 더 생긴다. | 별도 그래프 서비스 비용 가능 | 중간~높음: 그래프 CSV 적재, ID 매핑, 동기화 작업 필요 |

**판단 게이트:** 시연 요구가 대상→법령→조문→규칙→의무의 근거 경로를 한두 단계 보여주는 수준이면 첫 번째 접근으로 충분하다. 여러 법령의 참조망을 탐색하거나 개정 영향 범위를 질의해야 할 때 두 번째 접근을 검토한다.

기존 ADOMS Graph API에 요청할 인증·판정·근거 필드는 `docs/ADOMS_GRAPH_API_REQUEST.md`에 별도로 정리했다.

## 3. 원천 72만 행에서 전달할 범위

원본 패키지는 195개 법령·약 72만 행·압축 해제 약 343MB다. 이를 그대로 주지 말고 다음 투영 데이터만 전달한다.

| 데이터 | 시연 권장량 | 선정 기준 | UI 사용처 |
|---|---:|---|---|
| 법령 `ref_law` | 50~150개, 권장 80~100개 | 핵심 3개 법령, 직접 참조 법령, 대상 유형 관련 법령, 검색 시연용 보조 법령 | 관계 법령 목록·검색 |
| 현행 문서/버전 | 법령당 1~2개 | 현행본 우선, 개정 이력은 화면에 필요한 경우만 | 버전·시행일 표시 |
| 조문 `ref_unit` | 200~1,000개 | 승인 규칙·의무의 근거 조문과 해당 조문의 상위 경로만 | 조문 근거와 상세 인용 |
| 적용 규칙 `ref_rule` | 승인 8~12개, 후보 최대 20개 | 사람이 원문과 조건 항목·값·단위를 대조 | 대상 조건 판정 |
| 의무 `ref_obligation` | 8~30개, 시연 활성 10개 | 승인 규칙으로 실제 도출되고 UI 단계에 연결되는 항목 | 의무·증빙·점검 |
| 규칙↔의무 | 8~40개 | `confidence=high`이면서 수동 검수 완료 | 판정 결과 생성 |
| 대상 유형 | 4~8개 | 사업장, 공중이용시설, 교통수단, 원료·제조물 및 선택 세부분류 | 대상 입력폼 |
| 증빙 유형 | 10~30개 | 시연 의무별 필수 증빙 1~3개 | 파일 안내·검증 |
| 인용/관계 엣지 | 100~1,500개 | 포함된 노드 사이의 직접 인용·포함 관계만 | 근거 경로·그래프 확장 |
| 용인시 업무 시드 | 조직 4~10, 사용자 3, 대상 3~10 | 역할별 시연과 총괄표가 성립하는 최소량 | 전체 업무 플로우 |

다음 대용량 원천은 통째로 전달하지 않는다.

- `unit_*.csv` 180MB 전체
- `schedule_*.csv` 67MB 전체
- `unit_role_*.csv` 33MB 전체
- `edge_*.csv` 53MB 전체
- 검수되지 않은 `appl_rule_obl_link` 전건

## 4. 수동 검수 없이 자동 승인하면 안 되는 항목

원천 연결표의 `confidence=high`는 법률 검토 완료를 의미하지 않는다. 전건의 `review_status`가 `pending`이므로 다음 필드를 사람이 대조해 승인해야 한다.

| 검수 항목 | 확인 내용 |
|---|---|
| 조건 항목 | 근로자수, 연면적, 수용인원, 시설등급 등 실제 비교 대상이 올바른가 |
| 연산자 | `gte`, `gt`, `lte`, `lt`, `eq`, `in`이 인용문 의미와 일치하는가 |
| 값과 단위 | 숫자와 명·㎡·억원·톤 등의 단위가 섞이지 않았는가 |
| 조문 경로 | `src_unit_id`와 `unit_path`가 실제 인용문 위치를 가리키는가 |
| 의무 연결 | 조건 충족 시 도출되는 `obl_id`가 해당 대상과 업무 화면에 적합한가 |
| 시행 버전 | 판정 기준일에 유효한 법령 버전인가 |
| 표시 문구 | 법률 자문이 아닌 시연 데이터라는 점이 명확한가 |

승인 결과는 원본을 덮어쓰지 말고 `demo_approved=true`, `reviewed_by`, `reviewed_at`, `review_note`로 별도 기록한다.

## 5. 그래프 DB에 전달할 최소 계약

그래프 DB가 필요해지면 업무 기록 전체를 복제하지 않는다. **정적 법령·판정 지식만 그래프로 보내고, 이행·증빙·점검·감사이력은 Supabase에 유지**한다.

### 노드 파일

| 파일 | 키 | 필수 속성 |
|---|---|---|
| `nodes_law.csv` | `law_id` | 제목, 법령구분, 소관부처, 시행일, 원천버전 |
| `nodes_unit.csv` | `unit_id` | `law_id`, 조문경로, 조문라벨, 표시문, 시행일 |
| `nodes_rule.csv` | `rul_id` | 조건항목, 연산자, 값, 단위, 인용문, 검수상태 |
| `nodes_obligation.csv` | `obl_id` | 제목, 의무그룹, 주기, 증빙필수 여부 |
| `nodes_target_type.csv` | `target_type_id` | 대상유형, 세부분류, 속성 스키마 |
| `nodes_evidence_type.csv` | `evidence_type_id` | 증빙명, 허용 형식, 최대 크기 |

### 엣지 파일

| 파일 | 시작→종료 | 의미 |
|---|---|---|
| `edges_contains.csv` | Law/Unit → Unit | 법령·조문 계층 포함 |
| `edges_cites.csv` | Unit → Law/Unit | 직접 인용 또는 준용 |
| `edges_applies_to.csv` | Rule/Law → TargetType | 대상 적용 조건 |
| `edges_based_on.csv` | Rule → Unit | 판정 규칙의 근거 조문 |
| `edges_triggers.csv` | Rule → Obligation | 조건 충족 시 의무 도출 |
| `edges_requires_evidence.csv` | Obligation → EvidenceType | 의무별 증빙 요구 |

모든 엣지는 `source_version`, `effective_from`, `effective_to`, `confidence`, `review_status`, `provenance`를 가진다. 그래프가 답을 내놓을 때 `TargetType → Rule → Unit → Law → Obligation` 경로를 그대로 UI에 설명할 수 있어야 한다.

## 6. Supabase의 업무 데이터

그래프로 보내지 않고 Supabase에 유지할 데이터는 다음과 같다.

- 조직, 역할, 사용자와 관리대상
- 대상 속성 JSONB와 판정 당시 입력 스냅숏
- 대상별 의무와 이행시기
- 조치일자, 상태, 비고와 제출 시각
- 실제 증빙파일의 Storage 경로와 버전
- 점검 회차, 점검 상태, 점검내용과 재점검 연결
- 변경 전후 값을 가진 감사 이벤트
- O/△/X/- 총괄표와 이행률 뷰

이 분리는 법령 그래프를 여러 업종에서 재사용하면서도 고객별 업무 기록을 섞지 않게 한다.

## 7. 타 업종 복제 단위

프런트엔드 저장소를 복사하지 말고 `demo_scenario` 한 행과 연결 데이터를 복제한다.

| 고정 자산 | 시나리오별 교체 자산 |
|---|---|
| 공통 셸, 표, 증빙, 점검, 총괄 컴포넌트 | 업종명과 대상 속성 스키마 |
| `ref_*` 식별자와 판정 연산자 | 허용 법령·승인 규칙·의무 목록 |
| 이행상태와 집계식 | 조직·사용자·대상 시드 |
| Storage와 감사이력 구조 | 증빙 예시, 메뉴 문구, 초기 상태 |

## 8. 담당자 실행 체크리스트

1. Supabase SQL Editor에서 마이그레이션과 시드를 순서대로 실행한다.
2. Table Editor에서 `ref_law` 7개 이상, `target` 3개, `compliance_record` 30개가 생성됐는지 확인한다.
3. Storage에서 `evidence-private` 비공개 버킷을 확인한다.
4. WebDev 또는 로컬에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 등록한다.
5. `/laws` 상단 출처가 `Supabase ref_law`로 바뀌는지 확인한다.
6. 시연 종료 직후 `update public.app_setting set value = 'false' where key = 'demo_write_enabled';`를 실행해 익명 쓰기를 중지한다.
7. 실사용 전에는 Supabase Auth와 조직·역할 기반 RLS로 데모 정책을 교체한다.

## References

[1]: https://supabase.com/docs/guides/database/overview "Supabase Database"
[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[3]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage Access Control"
