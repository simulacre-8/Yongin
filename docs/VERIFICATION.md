# 검증 기록

**검증일:** 2026-09-05

| 검증 | 결과 |
|---|---|
| TypeScript `pnpm check` | 통과 |
| Production build `pnpm build` | 통과 |
| Supabase `/auth/v1/settings` credential test | HTTP 200, Vitest 통과 |
| UI `/`, `/targets`, `/laws`, `/obligations`, `/evidence`, `/inspection`, `/summary` | 1600×1000 브라우저 렌더링 7/7 성공 |
| 축소 ETL 실제 CSV 테스트 | 법령 80, 규칙 8, 의무 6, 연결 8 및 RDB·그래프 CSV 생성 성공 |
| 전용 Manus skill validation | 통과 |
| 민감정보 Git 추적 검사 | GitHub PAT, JWT anon key, 실제 publishable key를 추적 파일에 포함하지 않음 |

## 시각 확인

일곱 화면에서 연녹색 경영목표 배너, 검정 GNB, 연녹색 LNB, 회색 검색 패널, 법령·증빙 고밀도 표, O/△/X/- 총괄표가 동일하게 렌더링됐다. 역할 전환, 현재 대상 선택, 의무 이행시기, 증빙 메타데이터, 점검 상태와 점검내용은 화면 간에 공유된다.

## 남은 외부 작업

공개 Supabase 키로는 데이터베이스 DDL을 실행할 수 없다. Supabase 프로젝트 관리자 권한이 있는 담당자가 SQL Editor에서 `supabase/migrations/001_demo_schema.sql`과 `supabase/seed.sql`을 순서대로 실행해야 한다. 실행 후 `/laws` 화면의 출처가 `Supabase ref_law`로 변경되는 것을 확인한다.
