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
| 추진현황 `/plan` | 원격 일정 49개, 시간 가중 진행률 59%, Supabase 클라우드 저장 표시 확인 |
| Manus WebDev 첫 화면 `/` | 추진현황이 즉시 표시되고 상단·사이드 메뉴가 활성 상태로 렌더링됨 |
| 기존 시연 대시보드 `/dashboard` | 기존 집계 위젯과 시연 시작 화면 유지 |
| 계획 데이터 단위 테스트 | Markdown 파생 49개 행, ID·날짜·상태·진행률 일관성 3개 테스트 통과 |
| 계획 원격 `pnpm smoke:plan` | 공개키 조회·수정·감사 이벤트·원복 통과 |
| 축소 ETL 실제 CSV 테스트 | 법령 80, 규칙 8, 의무 6, 연결 8 및 RDB·그래프 CSV 생성 성공 |
| 전용 Manus skill validation | 통과 |
| 민감정보 Git 추적 검사 | GitHub PAT, JWT anon key, 실제 publishable key를 추적 파일에 포함하지 않음 |

## 시각 확인

일곱 화면에서 연녹색 경영목표 배너, 검정 GNB, 연녹색 LNB, 회색 검색 패널, 법령·증빙 고밀도 표, O/△/X/- 총괄표가 동일하게 렌더링됐다. 역할 전환, 현재 대상 선택, 의무 이행시기, 증빙 메타데이터, 점검 상태와 점검내용은 화면 간에 공유된다.

Manus WebDev 기본 주소 `/`에서는 추진현황이 바로 열리며, 기존 영업 시연 대시보드는 `/dashboard`에서 유지된다. Netlify에서는 루트 요청만 `/dashboard`로 이동하고 `/plan` 직접 접근은 그대로 유지하도록 배포 설정을 분리했다.

## 원격 DB 적용 결과

Supabase 프로젝트 `gxpfnszbwvfyogwshvas`에 핵심 스키마, 보안·인덱스 강화, 추진현황 마이그레이션과 시연 시드를 적용했다. 브라우저 헤더에서 `Supabase DB 준비됨`을 확인했으며, 비공개 버킷은 `public=false`, 파일 제한 10MB, `demo/` 접두 경로 정책으로 동작한다. 추진현황은 `project_plan_item` 49건을 원격 조회하고 상태·진행률·메모 변경을 `project_plan_event`에 남긴다. 스모크 테스트 후 업무 임시 대상과 임시 파일은 0건이고 계획 항목은 원래 값으로 복원됐다.
