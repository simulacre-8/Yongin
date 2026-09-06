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

`pnpm build`는 두 Supabase 변수가 없으면 즉시 실패합니다. 따라서 DB 설정이 빠진 정적 번들이 성공 배포되는 일을 막습니다. 성공한 배포에서는 `/build-info.json`으로 커밋 SHA·배포 컨텍스트·Supabase 프로젝트 ref를 비밀값 없이 확인하고, `/manifest.json`으로 실제 JS/CSS 해시를 확인할 수 있습니다.

## 화면

| Route                     | Function                                                    |
| ------------------------- | ----------------------------------------------------------- |
| `/`, `/home/*`            | 카테고리·재해유형별 의무 목록, 하위 점검사항, 상태 집계·CSV |
| `/settings/applicability` | 설정 사실값 기반 적용범위 판정과 근거 경로                  |
| `/dashboard`              | 역할·조직별 내 업무 배정·수락·위임·완료·완료 확인           |
| `/targets`                | 관리대상 검색·선택·CSV·법령 조문 원문·개정/시행일 팝업      |
| `/laws`                   | 핵심 법령 축소본 검색·근거                                  |
| `/obligations`            | 시설명·주소·소속 통합검색, 대상별 의무·이행시기·CSV         |
| `/evidence`               | 조치일자·상태·증빙·CSV·시정조치/다운로드 로그               |
| `/inspection`             | 점검 상태·점검내용                                          |
| `/summary`                | O/△/X/- 총괄표와 이행률                                     |

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
9. `supabase/migrations/010_yongin_org_catalog.sql`
10. `supabase/migrations/011_yongin_org_tree_view.sql`
11. `supabase/migrations/012_demo_my_work.sql`
12. `supabase/migrations/013_fix_demo_my_work_reset.sql`
13. `supabase/migrations/014_demo_my_work_confirmation.sql`
14. `supabase/migrations/015_harden_demo_my_work_transitions.sql`
15. `supabase/migrations/016_index_demo_my_work_foreign_keys.sql`
16. `supabase/migrations/017_harden_demo_work_delegation.sql`
17. `supabase/migrations/018_guard_demo_work_status_transitions.sql`
18. `supabase/migrations/019_compliance_export_log.sql`
19. `supabase/seed.sql`
20. `supabase/seed_adoms.sql`
21. `supabase/seed_facility_catalog.sql`
22. `supabase/seed_yongin_obligation_pool.sql`
23. `supabase/seed_facility_workflow.sql`
24. `supabase/seed_legal_source_popup.sql`
25. `supabase/seed_yongin_org.sql`
26. `supabase/seed_my_work_runtime.sql`

`seed_adoms.sql`은 스키마 변경 없이 ADOMS 그래프 식별자를 보존한 법령 104건·조문 304건·의무 216건·규칙 128건·연결 128건을 추가합니다. 실제 SQL에서 `demo_approved=true`인 ADOMS 규칙·연결은 31건이며, 첫 화면에서는 용인시청 시연과 직접 관련된 승인 규칙 4개를 실행합니다.

`seed_yongin_obligation_pool.sql`은 클라이언트 CSV의 전체 의무 3,688건을 적재한다. 파일의 5,056개 데이터 물리 줄은 인용문 내부 줄바꿈을 포함하며, 표준 CSV 파서 기준 논리 레코드는 3,688건이다. `law_id`·`doc_id`·`unit_path`·`obl_id`를 보존한다.

`seed_facility_catalog.sql`은 FMS 시설 150건과 의무 조인 2,906건을 적재하고, 공중교통수단 1건·도급 2건과 해당 의무 23건을 `DEMO_VIRTUAL`로 분리해 총 153개 대상·2,929개 매핑을 구성합니다. `seed_facility_workflow.sql`은 제외 대상을 빼고 151개 대상·2,891개 의무를 실제 업무 테이블에 idempotent 투영합니다.

`seed_legal_source_popup.sql`은 관리대상 화면에서 사용하는 ADOMS 정식 조문 원문 100행과 법령 문서 13건을 적재합니다. 용인시청 로컬 의무 `OBL-01`~`OBL-10`은 별칭 브리지로 정식 `unit_id`에 연결되며 `OBL-10`은 제6조·제11조 두 원문을 함께 보여준다. 법령 최근 개정일·현행법령 시행일은 2026-09-06 국가법령정보센터 조회 스냅숏이고, 조문 효력일과 원문은 ADOMS 사실층 기준이다.

`seed_yongin_org.sql`은 용인특례시 공식 조직도 3개 화면과 공개 부서 상세에서 파싱한 활성 조직 단위 792건을 적재한다. 공식 구조인 시청 2실·13국·66과, 직속기관 4기관·9과, 사업소 5개·14과, 3개 구청·38과·39읍면동을 보존하며, 팀 590건은 공개 직위의 고유한 `…팀장` 명칭에서만 파생한다. 개인 이름은 적재하지 않는다.

`012`~`018`은 법령·시설·조직 기준정보와 분리된 **내 업무 시연 런타임 계층**을 구성한다. `seed_my_work_runtime.sql`은 공식 조직도와 시설 workflow 시드가 끝난 뒤 시연 내부 소관규칙과 기준 업무를 생성한다. 초기 2,891건 중 2,235건을 자동배정하고 656건을 수동 선택 대기로 둔다. 배정·수락·위임·재배정·완료·완료 확인은 각각 사건 시각과 DB 기록 시각을 분리해 저장한다. 최초 `assigned_at`은 재배정 때 덮어쓰지 않고 `reassigned_at`을 별도로 기록한다. 완료 업무는 재배정·위임하거나 실행 상태로 되돌릴 수 없다. 물리 테이블은 PostgREST 호환을 위해 `public.demo_work_*`를 사용하며 논리 도메인은 `demo_runtime`이다.

`019_compliance_export_log.sql`은 의무이행 전체 목록 CSV 다운로드를 `demo_compliance_export_event`에 기록한다. 관리대상·의무 체크리스트·홈 의무 목록은 현재 필터 결과를 CSV로 내보내며, 의무이행 CSV는 시설의 전체 적용 의무와 상태·조치·증빙·점검 필드를 포함한다. 증빙을 저장할 때 기존 상태가 미이행이면 이행완료로 자동 전환하고, 보완필요·해당없음처럼 사용자가 명시한 상태는 유지한다.

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
pnpm smoke:home
pnpm smoke:facility
pnpm smoke:legal-source
pnpm smoke:org
pnpm smoke:my-work
pnpm smoke:my-work-storage
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
- `docs/YONGIN_ORG_IMPORT.md`: 용인시 공식 조직도 파싱·수량·Supabase 계층·재현 절차
- `docs/MY_WORK_OPERATING_MODEL.md`: 시연 런타임 계층·사건별 시각·자동배정·초기화·보안 경계
- `docs/IA_IMPLEMENTATION_NOTES_20260906.md`: 기능 IA 메뉴·색상·조직 데이터 공백 반영 기준
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

현재 검수용 GNB는 `홈`, `관리대상`, `의무 체크리스트`, `의무이행`, `내 업무`, `설정` 순서입니다. `/dashboard`의 기존 대시보드는 공식 조직도와 실제 대상별 의무 2,891건을 연결한 `내 업무`로 교체했습니다. 역할·조직 범위 조회, 자동·수동 배정, 수락, 상태 변경, 위임요청과 필수 근거파일, 완료, 완료 확인, 첨부 다운로드, 이력, 선택 CSV를 실제 Supabase에 기록합니다. 완료와 완료 확인은 `completed_at`과 `confirmed_at`·`confirmed_by`로 분리합니다. `이행점검`은 GNB에서 숨기되 기존 라우트와 데이터 흐름은 후속 프로세스 검수용으로 유지합니다.

`설정`은 적용범위 판정에 사용하는 대상 프로필·상시근로자 수·연면적·효력 기준일·시설물안전법 대상 여부를 관리합니다. 저장하면 브라우저 설정과 Supabase `target_applicability` 판정기록이 함께 갱신됩니다. `적용범위 판정`은 설정값을 읽는 결과·근거 전용 화면으로 축소했으며, 프리셋과 용인시청 기본값 입력 영역은 제거했습니다.

`ADOMS_데모작업 명세.zip`의 SCR 화면과 32단계 시연 교차표를 기준으로, 적용범위 판정 이후의 주요 업무 화면을 원본 시스템의 검색 패널·고밀도 격자표·상태 전환 흐름으로 재구성했습니다. 대상 범위는 이행현황, 관리대상 현황, 관계 법령, 법 의무사항, 의무이행 실적증빙, 이행점검, 점검 총괄표입니다. 관리대상·법 의무사항·이행점검은 한 URL 안에서 목록→상세 또는 취합 설정→점검 화면으로 전환됩니다. 법 의무사항 상세는 정적 10건이 아니라 선택한 시설의 Supabase 의무 매핑을 조회합니다.

시각 기준은 기능 IA의 공공 앱 토큰을 반영한 **남색 GNB, 밝은 회색 배경, 흰 카드, 블루 포인트**입니다. 페이지마다 반복되던 전역 고정 LNB를 제거해 본문 폭을 넓혔고, 홈의 의무 분류와 증빙의 의무 단계처럼 실제 업무 탐색에 필요한 로컬 내비게이션만 남겼습니다. 증빙 첨부는 주변 입력 컨트롤과 같은 8px radius의 아이콘 전용 버튼으로 단순화하고 불필요한 하단 이미지 뷰어를 제거했습니다. 영문·숫자는 Inter, 한글은 Noto Sans KR fallback을 사용합니다.

검증 내역은 `docs/ORIGINAL_UI_REBUILD_VERIFICATION.md`를 참조하십시오.
