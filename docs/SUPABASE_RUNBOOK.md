# Supabase 시연 DB 운영 기록

**적용일:** 2026-09-06
**프로젝트:** `gxpfnszbwvfyogwshvas` (`ap-northeast-1`, PostgreSQL 17)  
**운영 방식:** 호스팅형 Supabase, Docker 불필요

## 완료 상태

| 영역                   | 결과                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| 클라이언트 핵심 데이터 | 시설 150건·전체 의무 3,688건·시설 매핑 2,906건 적재              |
| 시연 보완 데이터       | 공중교통수단 1건·도급/용역 2건·매핑 23건을 `DEMO_VIRTUAL`로 분리 |
| 시설 업무 투영         | 151개 대상·2,891개 대상별 의무                                   |
| 이행시기               | `target_obligation.due_value` 원격 저장                          |
| 실적·증빙              | `compliance_record` 및 비공개 `evidence-private` Storage 연결    |
| 점검·총괄              | `inspection_scope/result`와 `v_facility_workflow` 연결           |
| 법령 원문              | ADOMS 정식 원문·법령 최근 개정일·현행법령 시행일 팝업 연결       |
| 감사                   | 대상·의무·이행·증빙·점검 변경 이벤트 기록                        |
| RLS                    | 익명 시연 역할별 읽기·쓰기 정책 적용                             |
| 비밀정보               | 서비스 역할 키·PAT·DB 비밀번호를 프런트와 Git에 포함하지 않음    |

## 적용 순서

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/migrations/002_security_and_index_hardening.sql`
3. `supabase/migrations/004_remove_project_plan_progress.sql`
4. `supabase/migrations/005_yongin_cityhall_only.sql`
5. `supabase/migrations/006_facility_catalog.sql`
6. `supabase/migrations/007_facility_workflow_bridge.sql`
7. `supabase/migrations/008_yongin_obligation_pool.sql`
8. `supabase/migrations/009_legal_source_popup.sql`
9. `supabase/seed.sql`
10. `supabase/seed_adoms.sql`
11. `supabase/seed_facility_catalog.sql`
12. `supabase/seed_yongin_obligation_pool.sql`
13. `supabase/seed_facility_workflow.sql`
14. `supabase/seed_legal_source_popup.sql`

`seed_yongin_obligation_pool.sql`은 클라이언트가 제공한 전체 용인 의무 3,688건을 적재한다. 원천 파일에는 인용문 내부 줄바꿈이 있어 5,057개 물리 줄이 있지만, 헤더를 제외한 CSV 논리 레코드는 3,688건이다. `008_yongin_obligation_pool.sql`은 `law_id`, `doc_id`, `unit_path`, 조문 정보와 원문 인용을 `ref_obligation`의 정식 열로 추가한다.

`seed_facility_catalog.sql`은 클라이언트 시설 150건과 매핑 2,906건을 먼저 적재한다. 시나리오 보완 3개 대상과 매핑 23건을 더해 참조 계층은 대상 153건·매핑 2,929건이다. `seed_facility_workflow.sql`은 `l2_result <> '제외'` 조건으로 151개 대상·2,891개 의무를 실제 업무 테이블에 투영한다.

`009_legal_source_popup.sql`은 법령 문서 스냅숏과 의무-조문 연결 테이블을 추가한다. `seed_legal_source_popup.sql`은 화면에 필요한 ADOMS 정식 원문 89행과 용인시청 별칭 원문 11행을 적재한다. 별칭 10개 중 `OBL-10`은 두 조문을 연결한다. 문서 최근 개정일과 현행법령 시행일은 국가법령정보센터 2026-09-06 조회값이며 원문과 조문 효력일은 ADOMS 사실층을 보존한다.

## 원격 수량

| 리소스                          |  수량 | 비고                                    |
| ------------------------------- | ----: | --------------------------------------- |
| `ref_law`                       |   115 | 기존 ADOMS·시설 관계법령                |
| `ref_unit`                      |   393 | 조문 투영                               |
| `ref_rule`                      |   132 | 판정 규칙                               |
| `ref_obligation`                | 3,877 | 용인 의무풀 3,688 + 기존 고유 의무 보존 |
| `ref_rule_obligation`           |   138 | 판정 규칙–의무 연결                     |
| `ref_managed_target`            |   153 | FMS 150 + 시연값 3                      |
| `ref_managed_target_obligation` | 2,929 | CSV 2,906 + 시나리오 23                 |
| `ref_legal_document`            |    13 | 사용 법령 문서·공식 날짜 스냅숏         |
| `ref_obligation_legal_source`   |   100 | 정식 원문 89 + 용인시청 별칭 원문 11    |
| `target`                        |   152 | 시설 workflow 151 + 기존 용인시청 1     |
| `target_obligation`             | 2,901 | 시설 workflow 2,891 + 기존 10           |
| `v_facility_workflow`           | 2,891 | 시설 폐쇄루프 읽기 행                   |

`compliance_record`, `evidence`, `inspection_scope`, `inspection_result`는 사용자가 저장할 때 증가하는 업무 데이터다. 2026-09-06 브라우저 검증 후 `고기상수도 + OBL-0002590 + 2026-H2`의 이행기록 한 건을 시연 레코드로 남겼다. 자동 스모크 테스트가 생성하는 임시 데이터와 `demo/smoke/` 파일은 종료 시 삭제한다.

## 식별자 폐쇄루프

시설 기준 식별자는 `target_ref`, 의무 기준 식별자는 `obl_id`, 이행·점검 기간은 `period_key`다. 업무 화면은 다음 키를 유지한다.

> `target_ref + obl_id + period_key`

`target`은 `target_ref`를 보존한다. `target_obligation`은 `obl_id`를 보존한다. `compliance_record`와 `inspection_result`는 각 대상별 의무 레코드를 외래키로 연결한다. `v_facility_workflow`는 이행시기, 실적, 증빙 메타데이터 연결점, 점검결과를 한 번에 조회한다.

## 자동 검증

```bash
pnpm check
pnpm build
pnpm exec vitest run --reporter=verbose
pnpm check:supabase
pnpm smoke:adoms
pnpm smoke:core
pnpm smoke:facility
pnpm smoke:legal-source
pnpm smoke:supabase
pnpm smoke:workflow
```

`smoke:core`는 공개키로 전체 의무풀 3,688건, FMS 시설 150건, CSV 매핑 2,906건과 그래프 식별자 보존을 검증한다. `smoke:facility`는 153개 대상·2,929개 매핑, 경전철의 공중교통수단 분류, 고기상수도 31개 의무를 검증한다. `smoke:legal-source`는 용인시청 10개 별칭, 11개 원문 연결, `OBL-07` 직접 조문 연결, `OBL-10` 두 조문, 공식 날짜와 링크를 검증한다. `smoke:workflow`는 한 의무에서 이행시기 → 실적 → Storage 증빙 → 점검 → 총괄 뷰까지 왕복한 뒤 임시 데이터를 정리한다.

## 권한과 종료 절차

`target_manager`는 대상·적용판정·의무이행·증빙을 기록한다. `inspector`는 점검 회차·범위·결과를 기록한다. `executive`는 두 업무 영역을 수행한다. `ref_*`는 브라우저 읽기 전용이다.

시연 종료 직후 익명 쓰기를 비활성화한다.

```sql
update public.app_setting
set value = 'false'::jsonb, updated_at = now()
where key = 'demo_write_enabled';
```

실사용 전에는 `demo_access_enabled`도 비활성화하고 Supabase Auth 사용자를 `profile.auth_user_id`에 연결한다.

## 그래프 DB 판단

신규 그래프 DB 구매와 내부 GraphDB 외부 공개는 현재 필요하지 않다. `law_id`, `doc_id`, `unit_path`, `obl_id`를 Supabase에 그대로 보존했으므로 운영 Graph API가 준비되면 기준정보 조회 계층만 교체할 수 있다.

## References

[1]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/008_yongin_obligation_pool.sql "Yongin obligation pool migration"
[2]: https://github.com/simulacre-8/Yongin/blob/main/supabase/seed_yongin_obligation_pool.sql "Yongin obligation pool seed"
[3]: https://github.com/simulacre-8/Yongin/blob/main/scripts/facility-workflow-smoke.ts "Facility workflow smoke test"
