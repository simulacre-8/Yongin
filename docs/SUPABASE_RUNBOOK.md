# Supabase 시연 DB 운영 기록

**적용일:** 2026-09-05  
**프로젝트:** `gxpfnszbwvfyogwshvas` (`ap-northeast-1`, PostgreSQL 17)  
**운영 방식:** 호스팅형 Supabase, Docker 불필요

## 완료 상태

| 항목 | 결과 |
|---|---|
| 핵심 스키마 | 원격 적용 완료 |
| 시연 시드 | 원격 적재 완료 |
| RLS | 전체 공개 업무 테이블 활성화 |
| Storage | `evidence-private`, 비공개, 파일당 10MB |
| 증빙 경로 | `demo/` 접두 경로만 허용 |
| 공개 브라우저 키 | Publishable key만 사용 |
| 서비스 역할 키 노출 | 없음, 자동 테스트 통과 |
| Target CRUD | 생성·조회·수정·삭제 통과 |
| Storage 왕복 | 업로드·다운로드·내용검증·삭제 통과 |
| 감사로그 | CRUD당 `insert`, `update`, `delete` 자동 기록 확인 |
| 브라우저 연결 | 헤더에서 `Supabase DB 준비됨` 확인 |
| Security Advisor | 경고 0건 |
| Performance Advisor | 외래키 인덱스 누락 0건; 신규 DB의 미사용 인덱스 INFO만 존재 |

브라우저 1600×1000 검증에서 대시보드 헤더는 `Supabase DB 준비됨`을 표시했고, `/laws`는 로컬 폴백 10건이 아니라 원격 `Supabase ref_law` 출처와 7건의 시드 법령을 표시했다.

## 마이그레이션 순서

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/migrations/002_security_and_index_hardening.sql`
3. `supabase/seed.sql`

첫 번째 마이그레이션은 법령 투영, 대상, 적용판정, 의무, 이행, 증빙, 점검, 감사로그와 비공개 Storage 버킷을 생성한다. 두 번째 마이그레이션은 RLS 보조 함수와 감사 트리거를 API에 노출되지 않는 `private` 스키마로 이동하고 외래키 인덱스를 보강한다.

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

이번 시드는 DB 폐쇄 루프 검증을 위한 최소본이다. 최종 법령 축소본 50–150건은 `scripts/build_demo_projection.py` 결과를 검수한 뒤 `ref_*`에 교체 적재한다.

## 권한 모델

`target_manager`는 관리대상·적용판정·의무이행·증빙을 기록할 수 있고, `inspector`는 점검 회차·범위·결과를 기록할 수 있다. `executive`는 두 업무 영역을 모두 수행할 수 있다. 법령 `ref_*`는 브라우저에서 읽기 전용이며 승인된 규칙과 연결만 노출된다.

영업 시연에서는 로그인 없이 동작해야 하므로 `demo_access_enabled=true`일 때 익명 요청이 시연 역할을 통과한다. 이 우회는 `demo_write_enabled`와 독립적으로 차단할 수 있다. 실제 운영 전에는 Auth 사용자와 `profile.auth_user_id`를 연결하고 두 시연 플래그를 모두 비활성화한다.

## Storage

`evidence-private` 버킷은 `public=false`이며 파일 크기를 10MB로 제한한다. 브라우저 정책은 `demo/` 아래의 객체만 허용한다. 담당자·경영책임자는 업로드·수정·삭제할 수 있고 점검자는 조회만 가능하다.

## 자동 검증

```bash
pnpm check:supabase
pnpm smoke:supabase
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
pnpm check
pnpm build
```

`check:supabase`는 필수 테이블 17개와 버킷을 실제 GET 요청으로 검사한다. `smoke:supabase`는 임시 대상과 임시 파일을 생성해 왕복 검증한 후 모두 삭제한다. 최종 확인에서 임시 대상과 파일은 각각 0건이었다.

## 시연 종료

관리자 SQL에서 다음을 실행해 익명 쓰기를 먼저 중단한다.

```sql
update public.app_setting
set value = 'false'::jsonb, updated_at = now()
where key = 'demo_write_enabled';
```

익명 조회도 중단할 때는 다음을 추가한다.

```sql
update public.app_setting
set value = 'false'::jsonb, updated_at = now()
where key = 'demo_access_enabled';
```

두 설정은 클라이언트에서 직접 읽거나 수정할 수 없으며 관리자 SQL로만 변경한다.

## 그래프 DB 판단

화요일 영업 시연에는 별도 그래프 DB가 필요하지 않다. `ref_law → ref_unit → ref_rule → ref_rule_obligation → ref_obligation → target_obligation` 관계가 외래키와 연결 테이블로 유지되어 적용 근거와 의무 추적을 재현할 수 있다. 복수 법령 간 영향도, 변경 전파, 가변 깊이 경로 탐색이 실제 제품 요구가 될 때 그래프 DB를 추가한다.
