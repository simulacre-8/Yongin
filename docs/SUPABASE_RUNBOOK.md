# Supabase 시연 DB 운영 기록

**적용일:** 2026-09-05  
**프로젝트:** `gxpfnszbwvfyogwshvas` (`ap-northeast-1`, PostgreSQL 17)  
**운영 방식:** 호스팅형 Supabase, Docker 불필요

## 완료 상태

| 항목                  | 결과                                    |
| --------------------- | --------------------------------------- |
| 핵심 법령·업무 스키마 | 원격 적용 완료                          |
| 시연 시드             | 원격 적재 완료                          |
| RLS                   | 공개 업무 테이블 활성화                 |
| Storage               | `evidence-private`, 비공개, 파일당 10MB |
| 증빙 경로             | `demo/` 접두 경로만 허용                |
| 서비스 역할 키 노출   | 없음, 자동 테스트 통과                  |
| Target CRUD           | 생성·조회·수정·삭제 통과                |
| Storage 왕복          | 업로드·다운로드·내용검증·삭제 통과      |
| 감사로그              | insert·update·delete 자동 기록 확인     |
| 내부 추진현황         | UI·테이블·이력·Realtime 등록 제거 완료  |
| 시설·의무 참조 DB     | FMS 150건·시연 3건·매핑 2,929건 적재    |

## 마이그레이션 순서

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/migrations/002_security_and_index_hardening.sql`
3. `supabase/migrations/004_remove_project_plan_progress.sql`
4. `supabase/migrations/005_yongin_cityhall_only.sql`
5. `supabase/migrations/006_facility_catalog.sql`
6. `supabase/seed.sql`
7. `supabase/seed_adoms.sql`
8. `supabase/seed_facility_catalog.sql`

세 번째 파일은 과거 배포에 존재할 수 있는 내부 추진현황 테이블을 안전하게 제거한다. 네 번째 파일은 클라이언트 범위에 없던 임시 시설을 제거하고 용인시청 단일 대상으로 정리한다.

## 적재된 시연 데이터

| 리소스                          |                                    건수 |
| ------------------------------- | --------------------------------------: |
| `ref_law`                       |                                     115 |
| `ref_unit`                      |                                     393 |
| `ref_rule`                      |  132 = 기존 4 + ADOMS 128; 익명 조회 35 |
| `ref_obligation`                |                                     310 |
| `ref_rule_obligation`           | 138 = 기존 10 + ADOMS 128; 익명 조회 41 |
| `demo_scenario`                 |                                       1 |
| `target`                        |                          1 (`용인시청`) |
| `target_applicability`          |                                       4 |
| `target_obligation`             |                                      10 |
| `compliance_record`             |                                      10 |
| `inspection_run`                |                                       1 |
| `inspection_scope`              |                                      10 |
| `inspection_result`             |                                      10 |
| `ref_managed_target`            |           153 = FMS 시설 150 + 시연값 3 |
| `ref_managed_target_obligation` |    2,929 = CSV 매핑 2,906 + 시나리오 23 |

`seed_adoms.sql`은 기존 수기 시드와 ID가 겹치지 않는 추가형 시드다. ADOMS 그래프 식별자를 유지한 법령 104건·조문 304건·의무 216건·규칙 128건·연결 128건을 추가하며, 트랜잭션과 `on conflict do update`로 재실행할 수 있다. 전체 규칙을 자동 실행하지 않고 실제 SQL에서 `demo_approved=true`인 ADOMS 규칙·연결 **31건**만 공개하며, 첫 화면은 그중 용인시청 시연용 4개 규칙만 사용한다.

시설 원천은 읽기 전용 참조 계층으로 분리했다. 용인경전철은 FMS 시설물이 아니라 도시철도법 제2조제2호 등에 따른 **공중교통수단**으로 저장되며, 경전철 1건과 도급 2건은 `DEMO_VIRTUAL`·`시연값`으로 표시한다.

## 권한 모델

`target_manager`는 관리대상·적용판정·의무이행·증빙을 기록할 수 있고, `inspector`는 점검 회차·범위·결과를 기록할 수 있다. `executive`는 두 업무 영역을 수행할 수 있다. 법령 `ref_*`는 브라우저 읽기 전용이며 승인된 규칙과 연결만 노출된다.

## 자동 검증

```bash
pnpm check:supabase
pnpm smoke:supabase
pnpm smoke:facility
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
pnpm check
pnpm build
```

`check:supabase`는 필수 테이블 19개와 비공개 버킷을 실제 GET 요청으로 검사한다. `smoke:supabase`는 임시 대상과 파일을 생성해 왕복 검증하고 모두 삭제한다. `smoke:facility`는 공개키로 153개 대상·2,929개 매핑과 경전철의 공중교통수단 분류를 검증한다.

## 시연 종료

```sql
update public.app_setting
set value = 'false'::jsonb, updated_at = now()
where key = 'demo_write_enabled';
```

실사용 전에는 `demo_access_enabled`도 비활성화하고 Auth 사용자와 `profile.auth_user_id`를 연결한다.

## 그래프 DB 판단

신규 그래프 DB 구매와 내부 GraphDB의 외부 공개는 현재 필요하지 않다. 이번 시연은 ADOMS 축소 데이터를 Supabase에 투영해 읽고, 고객별 대상·판정·이행·증빙·점검·감사이력도 Supabase에 유지한다. 원천 그래프 ID를 보존하므로 운영 Graph API가 준비되면 조회 계층만 교체할 수 있다.
