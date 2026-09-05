# 용인특례시 안전보건체계 통합관리 시연

화면명세 ZIP의 공공기관 UI를 React로 유사 재구성한 **법령 적용 가능성 판정·의무이행·점검 폐쇄 루프 영업 시연**입니다. 최우선 첫 화면은 Supabase에 투영한 ADOMS 지식그래프 데이터에서 승인 규칙·의무·조문을 조회하고, 상시근로자 수·시설 연면적 변화에 따라 **L1 법령 후보 → L2 대상 후보 → L3 의무 후보**와 근거 경로를 다시 계산합니다.

첫 적용범위 판정은 용인시청 가정값으로 시작합니다. 기준 데이터는 클라이언트가 제공한 **시설 150건, 용인시 전체 의무풀 3,688건, 시설–의무 매핑 2,906건**이다. 시나리오 보완 대상 3건과 매핑 23건을 `DEMO_VIRTUAL`로 분리해 원격 참조 계층은 대상 153건·매핑 2,929건이 된다. `l2_result <> '제외'`인 대상 151건과 의무 2,891건은 업무 계층으로 투영되며, 이행시기 → 실적·증빙 → 점검 → 총괄표가 `target_ref + obl_id + 2026-H2`로 이어진다. FMS 시설물이 아닌 용인경전철은 도시철도법상 **공중교통수단**으로 별도 분류했다.

> 전체 의무풀은 클라이언트 제공 원천을 보존하지만, 화면의 자동 적용범위 결과는 검수된 시연 규칙에 의한 후보이다. 최종 법률 판단으로 사용해서는 안 된다.

## 실행

```bash
pnpm install
pnpm dev
```

로컬 실행에는 `client/.env.local`에 공개 환경변수를 설정합니다.

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

**서비스 역할 키, 데이터베이스 비밀번호, GitHub 토큰, 비공개 Graph API 키는 저장소나 브라우저 번들에 넣지 마십시오.**

### Windows 로컬 작업 경로

소스·원천데이터·ETL 결과·로그를 포함한 Windows 작업 루트는 `C:\Yongin_test`로 고정합니다.

```powershell
git clone https://github.com/simulacre-8/Yongin.git C:\Yongin_test
powershell -ExecutionPolicy Bypass -File C:\Yongin_test\scripts\setup-windows.ps1
cd C:\Yongin_test
pnpm dev
```

세부 폴더 규칙은 `docs/WINDOWS_LOCAL_PATH.md`를 참고하십시오.

## Netlify 배포

저장소 루트의 `netlify.toml`이 빌드 명령, `dist/public` 배포 경로, SPA fallback을 제공합니다. Netlify 환경변수에는 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`만 등록합니다. GitHub `main`에 push하면 연결된 Netlify 사이트가 자동 배포됩니다.

## 화면

| Route                 | Function                                               |
| --------------------- | ------------------------------------------------------ |
| `/`, `/applicability` | 프로필·인원·면적 변화에 따른 L1/L2/L3 후보와 근거 경로 |
| `/dashboard`          | 역할별 대시보드와 집계                                 |
| `/targets`            | 관리대상 검색·선택·법령 조문 원문·개정/시행일 팝업     |
| `/laws`               | 핵심 법령 축소본 검색·근거                             |
| `/obligations`        | 검수된 대상별 의무와 이행시기                          |
| `/evidence`           | 조치일자·상태·증빙·비고                                |
| `/inspection`         | 점검 상태·점검내용                                     |
| `/summary`            | O/△/X/- 총괄표와 이행률                                |

프로젝트 추진현황은 웹앱과 Supabase에서 제거했습니다. 클라이언트 공개 일정은 별도 Excel/Google Sheets WBS로 관리합니다.

## Supabase 적용

Docker는 필요하지 않습니다. 호스팅형 Supabase에 아래 파일을 순서대로 적용합니다.

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

`seed_adoms.sql`은 스키마 변경 없이 ADOMS 그래프 식별자를 보존한 법령 104건·조문 304건·의무 216건·규칙 128건·연결 128건을 추가합니다. 실제 SQL에서 `demo_approved=true`인 ADOMS 규칙·연결은 31건이며, 첫 화면에서는 용인시청 시연과 직접 관련된 승인 규칙 4개를 실행합니다.

`seed_yongin_obligation_pool.sql`은 클라이언트 CSV의 전체 의무 3,688건을 적재한다. 파일의 5,056개 데이터 물리 줄은 인용문 내부 줄바꿈을 포함하며, 표준 CSV 파서 기준 논리 레코드는 3,688건이다. `law_id`·`doc_id`·`unit_path`·`obl_id`를 보존한다.

`seed_facility_catalog.sql`은 FMS 시설 150건과 의무 조인 2,906건을 적재하고, 공중교통수단 1건·도급 2건과 해당 의무 23건을 `DEMO_VIRTUAL`로 분리해 총 153개 대상·2,929개 매핑을 구성합니다. `seed_facility_workflow.sql`은 제외 대상을 빼고 151개 대상·2,891개 의무를 실제 업무 테이블에 idempotent 투영합니다.

`seed_legal_source_popup.sql`은 관리대상 화면에서 사용하는 ADOMS 정식 조문 원문 100행과 법령 문서 13건을 적재합니다. 용인시청 로컬 의무 `OBL-01`~`OBL-10`은 별칭 브리지로 정식 `unit_id`에 연결되며 `OBL-10`은 제6조·제11조 두 원문을 함께 보여준다. 법령 최근 개정일·현행법령 시행일은 2026-09-06 국가법령정보센터 조회 스냅숏이고, 조문 효력일과 원문은 ADOMS 사실층 기준이다.

## 검증

```bash
pnpm check
pnpm build
pnpm exec vitest run client/src/lib/applicability.test.ts
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
pnpm check:supabase
pnpm smoke:supabase
pnpm smoke:adoms
pnpm smoke:core
pnpm smoke:facility
pnpm smoke:legal-source
pnpm smoke:workflow
```

## ADOMS 데이터 연동

이번 시연에는 별도 GraphDB 구매, 외부 API 공개, `server.py` 또는 SQLite 실행이 필요하지 않습니다. `seed_adoms.sql`로 필요한 ADOMS 데이터를 Supabase에 투영하고, `law_id`·`unit_id`·`rul_id`·`obl_id`를 그대로 보존해 향후 운영 Graph API가 준비되면 조회 계층만 교체할 수 있게 합니다.

## 문서

- `docs/adoms-ui/ADOMS_102_SCREEN_FLOW_MAP.md`: SCR-001~102 번호순 카탈로그와 실제 업무순 플로우
- `docs/adoms-ui/ADOMS_DEMO_SCENARIO_CROSSWALK.md`: 용인시 32 STEP과 원본 화면의 재사용·상태변형·신규제작 매핑
- `docs/adoms-ui/ADOMS_UI_GAP_CONFIRMATION_REGISTER.md`: 원본에 없는 화면과 클라이언트 컨펌 질문
- `docs/adoms-ui/ADOMS_SCREEN_CATALOG.csv`: 리네이밍된 102개 이미지의 기계 판독용 색인
- `docs/UI_SCREEN_MAP.md`: 적용범위 판정을 첫 장면으로 둔 대표 화면 구성
- `docs/ADOMS_GRAPH_API_REQUEST.md`: 기존 Graph API에 요청할 최소 인증·판정·근거 계약
- `docs/README_ADOMS_SEED.md`: ADOMS 시드 구성·검수 수준·적용 주의사항
- `docs/DB_GRAPH_HANDOFF.md`: 축소 법령 데이터와 RDB/그래프 경계
- `docs/SUPABASE_RUNBOOK.md`: 원격 DB·RLS·Storage·스모크 테스트 운영 기록
- `docs/FACILITY_DATA_IMPORT.md`: FMS 시설·의무 매핑·공중교통수단·도급 시연값 구분
- `docs/YONGIN_CORE_DATA_VERIFICATION.md`: 세 CSV 해시·논리 행·조인 무결성·원격 적재 검증
- `docs/LEGAL_SOURCE_POPUP.md`: ADOMS 원문·국가법령정보센터 날짜·별칭 연결 기준
- `docs/REDESIGN_BRIEF_20260906.md`: 초기 용인시 브랜드 톤 복원과 공통 디자인 토큰
- `docs/FONT_SIZE_SPEC.md`: Inter·Noto Sans KR 기반 통일 폰트 규격
- `docs/CURRENT_DATA_SCREEN_GAP_20260906.md`: 원격 연결 완료 범위와 남은 local-only 화면 구분
- `docs/FACILITY_OBLIGATION_UI_VERIFICATION.md`: 시설 151개·의무 2,929개 화면 연결과 상세 클릭 검증
- `scripts/build_demo_projection.py`: 승인 목록 기준 RDB·그래프 투영 ETL

화면을 수정할 때는 **클라이언트가 지정한 PNG → 해당 SCR 명세 → Flow Map → Scenario Crosswalk → Gap Register** 순서로 확인합니다. 102개 이미지는 102개 라우트가 아니라 스크롤 연속·모달·권한 변형·예외 상태를 포함한 화면 컷입니다. 원본에 없는 장면은 기존 화면이라고 간주하지 않고 컨펌 후 제작합니다.

## 시연 보안

영업 시연 중 익명 접근과 쓰기는 `app_setting`의 `demo_access_enabled`, `demo_write_enabled`로 제어합니다. 시연 종료 직후 익명 쓰기를 비활성화합니다.

```sql
update public.app_setting
set value = 'false'::jsonb
where key = 'demo_write_enabled';
```

실사용 전에는 익명 조회도 비활성화하고 Supabase Auth 사용자를 `profile.auth_user_id`와 연결해야 합니다.

## 2026-09-06 UI 재구성

`ADOMS_데모작업 명세.zip`의 SCR 화면과 32단계 시연 교차표를 기준으로, 적용범위 판정 이후의 주요 업무 화면을 원본 시스템의 검색 패널·고밀도 격자표·상태 전환 흐름으로 재구성했습니다. 대상 범위는 이행현황, 관리대상 현황, 관계 법령, 법 의무사항, 의무이행 실적증빙, 이행점검, 점검 총괄표입니다. 관리대상·법 의무사항·이행점검은 한 URL 안에서 목록→상세 또는 취합 설정→점검 화면으로 전환됩니다. 법 의무사항 상세는 정적 10건이 아니라 선택한 시설의 Supabase 의무 매핑을 조회합니다.

시각 기준은 클라이언트가 선호한 초기 버전 `c51089d`와 용인시 공식 홈페이지의 톤을 결합한 **검정 GNB, 연분홍·아이보리 배경, 흰 카드, 마젠타·퍼플 포인트**입니다. 메뉴 깊이와 입력 필드 위치는 유지하고, 화면별로 달랐던 회색·녹색·사각 보더 스타일은 공통 카드·표·버튼 토큰으로 통일했습니다. 영문·숫자는 Inter, 한글은 Noto Sans KR fallback을 사용하며 규격은 `docs/FONT_SIZE_SPEC.md`에 정리했습니다. Supabase ADOMS 조회·판정 저장, 시설 DB 조회와 시연 초기화 기능은 유지합니다.

검증 내역은 `docs/ORIGINAL_UI_REBUILD_VERIFICATION.md`를 참조하십시오.
