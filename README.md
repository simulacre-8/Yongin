# 용인특례시 안전보건체계 통합관리 시연

화면명세 ZIP의 공공기관 UI를 React로 유사 재구성한 **법령 적용 가능성 판정·의무이행·점검 폐쇄 루프 영업 시연**입니다. 최우선 첫 화면은 대상 프로필과 상시근로자 수·시설 연면적 등 사실값 변화에 따라 **L1 법령 후보 → L2 대상 후보 → L3 의무 후보**와 근거 경로를 다시 계산합니다.

현재 관리대상은 클라이언트 확인에 따라 **용인시청 1개소**만 유지합니다. 첫 화면은 용인시청 가정값으로 시작하며, 실제 사업장 마스터 API가 제공되면 인원·면적·시설 속성을 조회해 자동 변경하도록 연결할 예정입니다. 좌측 업무 메뉴는 상단 메뉴 선택 후 자동으로 접히고 원형 토글 버튼으로 다시 열 수 있습니다.

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

| Route | Function |
|---|---|
| `/`, `/applicability` | 프로필·인원·면적 변화에 따른 L1/L2/L3 후보와 근거 경로 |
| `/dashboard` | 역할별 대시보드와 집계 |
| `/targets` | 관리대상 검색·선택 |
| `/laws` | 핵심 법령 축소본 검색·근거 |
| `/obligations` | 검수된 대상별 의무와 이행시기 |
| `/evidence` | 조치일자·상태·증빙·비고 |
| `/inspection` | 점검 상태·점검내용 |
| `/summary` | O/△/X/- 총괄표와 이행률 |

프로젝트 추진현황은 웹앱과 Supabase에서 제거했습니다. 클라이언트 공개 일정은 별도 Excel/Google Sheets WBS로 관리합니다.

## Supabase 적용

Docker는 필요하지 않습니다. 호스팅형 Supabase에 아래 파일을 순서대로 적용합니다.

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/migrations/002_security_and_index_hardening.sql`
3. `supabase/migrations/004_remove_project_plan_progress.sql`
4. `supabase/migrations/005_yongin_cityhall_only.sql`
5. `supabase/seed.sql`

2026-09-05 기준 원격 프로젝트에는 핵심 스키마와 시드가 적용되어 있습니다. Target CRUD·비공개 Storage·감사로그 왕복 테스트가 통과했고, 내부 추진현황 테이블은 제거했습니다.

## 검증

```bash
pnpm check
pnpm build
pnpm exec vitest run client/src/lib/applicability.test.ts
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
pnpm check:supabase
pnpm smoke:supabase
```

## ADOMS Graph API

별도 그래프 DB 구매는 현재 필요하지 않습니다. 기존 ADOMS 그래프 DB가 있다면 `docs/ADOMS_GRAPH_API_REQUEST.md`에 정리한 base URL, OpenAPI/GraphQL 스키마, 읽기 전용 시연 키, CORS와 snapshot 정보를 받아 첫 화면에 연결합니다. 비공개 키는 Netlify Function 또는 별도 proxy에서 보관합니다.

## 문서

- `docs/UI_SCREEN_MAP.md`: 적용범위 판정을 첫 장면으로 둔 대표 화면 구성
- `docs/ADOMS_GRAPH_API_REQUEST.md`: 기존 Graph API에 요청할 최소 인증·판정·근거 계약
- `docs/DB_GRAPH_HANDOFF.md`: 축소 법령 데이터와 RDB/그래프 경계
- `docs/SUPABASE_RUNBOOK.md`: 원격 DB·RLS·Storage·스모크 테스트 운영 기록
- `scripts/build_demo_projection.py`: 승인 목록 기준 RDB·그래프 투영 ETL

## 시연 보안

영업 시연 중 익명 접근과 쓰기는 `app_setting`의 `demo_access_enabled`, `demo_write_enabled`로 제어합니다. 시연 종료 직후 익명 쓰기를 비활성화합니다.

```sql
update public.app_setting
set value = 'false'::jsonb
where key = 'demo_write_enabled';
```

실사용 전에는 익명 조회도 비활성화하고 Supabase Auth 사용자를 `profile.auth_user_id`와 연결해야 합니다.
