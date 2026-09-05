# 검증 기록

**검증일:** 2026-09-05

| 검증 | 결과 |
|---|---|
| TypeScript `pnpm check` | 통과 |
| Production build `pnpm build` | 통과 |
| Supabase `/auth/v1/settings` credential test | HTTP 200, Vitest 통과 |
| Supabase 필수 리소스 `pnpm check:supabase` | 테이블 17개와 비공개 버킷 준비 완료 |
| Supabase `pnpm smoke:supabase` | Target CRUD, Storage 왕복, 감사로그 3건 확인 및 임시 데이터 삭제 통과 |
| Supabase Security Advisor | 경고 0건 |
| UI `/`, `/targets`, `/laws`, `/obligations`, `/evidence`, `/inspection`, `/summary` | 1600×1000 브라우저 렌더링 7/7 성공 |
| 축소 ETL 실제 CSV 테스트 | 법령 80, 규칙 8, 의무 6, 연결 8 및 RDB·그래프 CSV 생성 성공 |
| 전용 Manus skill validation | 통과 |
| 민감정보 Git 추적 검사 | GitHub PAT, JWT anon key, 실제 publishable key를 추적 파일에 포함하지 않음 |

## 시각 확인

일곱 화면에서 연녹색 경영목표 배너, 검정 GNB, 연녹색 LNB, 회색 검색 패널, 법령·증빙 고밀도 표, O/△/X/- 총괄표가 동일하게 렌더링됐다. 역할 전환, 현재 대상 선택, 의무 이행시기, 증빙 메타데이터, 점검 상태와 점검내용은 화면 간에 공유된다.

## 원격 DB 적용 결과

Supabase 프로젝트 `gxpfnszbwvfyogwshvas`에 핵심 스키마, 보안·인덱스 강화 마이그레이션, 시연 시드를 적용했다. 브라우저 헤더에서 `Supabase DB 준비됨`을 확인했으며, 비공개 버킷은 `public=false`, 파일 제한 10MB, `demo/` 접두 경로 정책으로 동작한다. 스모크 테스트 후 임시 대상과 임시 파일은 0건이다.
