# Supabase 시연 DB 운영 기록

**적용일:** 2026-09-05  
**프로젝트:** `gxpfnszbwvfyogwshvas` (`ap-northeast-1`, PostgreSQL 17)  
**운영 방식:** 호스팅형 Supabase, Docker 불필요

## 완료 상태

| 항목 | 결과 |
|---|---|
| 핵심 법령·업무 스키마 | 원격 적용 완료 |
| 시연 시드 | 원격 적재 완료 |
| RLS | 공개 업무 테이블 활성화 |
| Storage | `evidence-private`, 비공개, 파일당 10MB |
| 증빙 경로 | `demo/` 접두 경로만 허용 |
| 서비스 역할 키 노출 | 없음, 자동 테스트 통과 |
| Target CRUD | 생성·조회·수정·삭제 통과 |
| Storage 왕복 | 업로드·다운로드·내용검증·삭제 통과 |
| 감사로그 | insert·update·delete 자동 기록 확인 |
| 내부 추진현황 | UI·테이블·이력·Realtime 등록 제거 완료 |

## 마이그레이션 순서

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/migrations/002_security_and_index_hardening.sql`
3. `supabase/migrations/004_remove_project_plan_progress.sql`
4. `supabase/seed.sql`

세 번째 파일은 과거 배포에 존재할 수 있는 내부 추진현황 테이블을 안전하게 제거한다. 신규 환경에서 테이블이 없어도 오류 없이 통과한다.

## 적재된 시연 데이터

| 리소스 | 건수 |
|---|---:|
| `ref_law` | 7 |
| `ref_unit` | 5 |
| `ref_rule` | 4 |
| `ref_obligation` | 10 |
| `ref_rule_obligation` | 10 |
| `demo_scenario` | 1 |
| `target` | 3 |
| `target_applicability` | 12 |
| `target_obligation` | 30 |
| `compliance_record` | 30 |
| `inspection_run` | 1 |
| `inspection_scope` | 30 |
| `inspection_result` | 30 |

최종 법령 축소본 50–150건은 `scripts/build_demo_projection.py` 결과를 검수한 뒤 `ref_*`에 교체 적재한다. 자동 판정에는 원문 대조가 끝난 규칙 8–12개만 사용한다.

## 권한 모델

`target_manager`는 관리대상·적용판정·의무이행·증빙을 기록할 수 있고, `inspector`는 점검 회차·범위·결과를 기록할 수 있다. `executive`는 두 업무 영역을 수행할 수 있다. 법령 `ref_*`는 브라우저 읽기 전용이며 승인된 규칙과 연결만 노출된다.

## 자동 검증

```bash
pnpm check:supabase
pnpm smoke:supabase
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
pnpm check
pnpm build
```

`check:supabase`는 필수 테이블 17개와 비공개 버킷을 실제 GET 요청으로 검사한다. `smoke:supabase`는 임시 대상과 파일을 생성해 왕복 검증하고 모두 삭제한다.

## 시연 종료

```sql
update public.app_setting
set value = 'false'::jsonb, updated_at = now()
where key = 'demo_write_enabled';
```

실사용 전에는 `demo_access_enabled`도 비활성화하고 Auth 사용자와 `profile.auth_user_id`를 연결한다.

## 그래프 DB 판단

신규 그래프 DB 구매는 현재 필요하지 않다. 기존 ADOMS Graph API가 있다면 첫 화면의 L1/L2/L3 판정과 근거 bundle을 읽기 전용으로 연결하고, 고객별 대상·이행·증빙·점검·감사이력은 Supabase에 유지한다. 요청 필드는 `docs/ADOMS_GRAPH_API_REQUEST.md`에 정의했다.
