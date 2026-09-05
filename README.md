# 용인특례시 안전보건체계 통합관리 시연

화면명세 ZIP의 공공기관 UI를 React로 유사 재구성한 **법령 적용 가능성 판정·의무이행·점검 폐쇄 루프 영업 시연**입니다. 최우선 첫 화면은 Supabase에 투영한 ADOMS 지식그래프 데이터에서 승인 규칙·의무·조문을 조회하고, 상시근로자 수·시설 연면적 변화에 따라 **L1 법령 후보 → L2 대상 후보 → L3 의무 후보**와 근거 경로를 다시 계산합니다.

첫 적용범위 판정은 용인시청 가정값으로 시작합니다. 관리대상 화면은 Supabase에서 **용인시 관할 FMS 시설 150건과 시설별 적용의무 2,906건**을 조회합니다. FMS 시설물이 아닌 용인경전철은 도시철도법상 **공중교통수단**으로 별도 분류했고, 실제 계약원장이 없는 경전철 운영·유지관리 도급 2건은 `시연값`으로 명확히 표시했습니다. 좌측 업무 메뉴는 자동으로 접지 않고 `#090909` 외곽 컨테이너 안에 고정합니다.

> 이 앱의 자동 결과는 축소·검수된 규칙에 의한 적용 가능성 후보이며 최종 법률 판단 또는 용인시 전체 적용 의무 목록이 아닙니다.

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
| `/targets`            | 관리대상 검색·선택                                     |
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
6. `supabase/seed.sql`
7. `supabase/seed_adoms.sql`
8. `supabase/seed_facility_catalog.sql`

`seed_adoms.sql`은 스키마 변경 없이 ADOMS 그래프 식별자를 보존한 법령 104건·조문 304건·의무 216건·규칙 128건·연결 128건을 추가합니다. 실제 SQL에서 `demo_approved=true`인 ADOMS 규칙·연결은 31건이며, 첫 화면에서는 용인시청 시연과 직접 관련된 승인 규칙 4개를 실행합니다.

`seed_facility_catalog.sql`은 클라이언트 CSV의 FMS 시설 150건과 의무 조인 2,906건을 적재하고, 시나리오에 필요한 공중교통수단 1건·도급 2건과 해당 의무 23건을 `DEMO_VIRTUAL`로 분리해 총 153개 대상·2,929개 매핑을 구성합니다.

## 검증

```bash
pnpm check
pnpm build
pnpm exec vitest run client/src/lib/applicability.test.ts
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
pnpm check:supabase
pnpm smoke:supabase
pnpm smoke:adoms
pnpm smoke:facility
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

## 2026-09-06 원본 UI 재구성

`ADOMS_데모작업 명세.zip`의 SCR 화면과 32단계 시연 교차표를 기준으로, 적용범위 판정 이후의 주요 업무 화면을 원본 시스템의 검색 패널·고밀도 격자표·상태 전환 흐름으로 재구성했습니다. 대상 범위는 이행현황, 관리대상 현황, 관계 법령, 법 의무사항, 의무이행 실적증빙, 이행점검, 점검 총괄표입니다. 관리대상·법 의무사항·이행점검은 한 URL 안에서 목록→상세 또는 취합 설정→점검 화면으로 전환됩니다.

시각 기준은 **검정 GNB 유지, 내부 회색 베이스, 용인특례시 핑크 강조**입니다. 본문·표·입력·버튼은 전역 확대를 적용하지 않고 각 원본형 화면의 폰트 크기를 사용합니다. 현재 크기와 사용 예시는 `docs/FONT_SIZE_SPEC.md`에 정리했습니다. LNB는 자동 접기 없이 고정하고, Supabase ADOMS 조회·판정 저장과 시연 초기화 기능은 유지합니다.

검증 내역은 `docs/ORIGINAL_UI_REBUILD_VERIFICATION.md`를 참조하십시오.
