# 용인특례시 안전보건체계 통합관리 시연

화면명세 ZIP의 공공기관 UI를 React로 유사 재구성한 **법령 DB·의무이행·점검 폐쇄 루프 영업 시연**입니다. 102개 화면을 모두 복제하지 않고 일곱 개 대표 화면과 역할·상태 변형으로 구성합니다.

## 실행

```bash
pnpm install
pnpm dev
```

### Windows 로컬 작업 경로

소스·원천데이터·ETL 결과·로그를 포함한 Windows 작업 루트는 `C:\Yongin_test`로 고정합니다.

```powershell
git clone https://github.com/simulacre-8/Yongin.git C:\Yongin_test
powershell -ExecutionPolicy Bypass -File C:\Yongin_test\scripts\setup-windows.ps1
cd C:\Yongin_test
pnpm dev
```

세부 폴더 규칙과 ETL 명령은 `docs/WINDOWS_LOCAL_PATH.md`를 참고하십시오.

로컬 실행에는 `client/.env.local`에 다음 공개 환경변수를 설정합니다.

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

**서비스 역할 키, 데이터베이스 비밀번호, GitHub 토큰은 저장소에 넣지 마십시오.**

## Netlify 배포

저장소 루트의 `netlify.toml`에 빌드 명령, `dist/public` 배포 경로, SPA 라우팅 리다이렉트를 설정했습니다. Netlify에서 GitHub 저장소를 연결한 뒤 **Site configuration → Environment variables**에 다음 값만 등록합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Build command와 Publish directory는 `netlify.toml`에서 자동으로 읽으므로 Netlify 화면에서 다시 입력할 필요가 없습니다.

## 화면

| Route | Function |
|---|---|
| `/` | 역할별 대시보드와 집계 |
| `/targets` | 관리대상 검색·선택 |
| `/laws` | 핵심 법령 축소본 검색·근거 |
| `/obligations` | 대상별 의무와 이행시기 |
| `/evidence` | 조치일자·상태·증빙·비고 |
| `/inspection` | 점검 상태·점검내용 |
| `/summary` | O/△/X/- 총괄표와 이행률 |

## Supabase 적용

Docker는 필요하지 않습니다. 호스팅형 Supabase에 아래 파일을 순서대로 적용합니다.

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/migrations/002_security_and_index_hardening.sql`
3. `supabase/seed.sql`

2026-09-05 기준 원격 프로젝트에 스키마와 최소 시드가 적용됐고, 관계 법령 화면과 헤더 연결 상태는 Supabase를 조회합니다. Target CRUD·비공개 Storage·감사로그 왕복 테스트가 통과했습니다. 나머지 UI 업무 상태는 시연 안정성을 위해 로컬 폴백을 유지하며 다음 단계에서 동일 테이블 호출로 전환합니다.

## 검증

```bash
pnpm check
pnpm build
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
pnpm check:supabase
pnpm smoke:supabase
```

## 문서

- `docs/UI_SCREEN_MAP.md`: UI ZIP 102개 화면의 대표 라우트 축약표
- `docs/DB_GRAPH_HANDOFF.md`: 법령 데이터 축소량, Supabase 구성, 그래프 DB 전환 계약
- `docs/SUPABASE_RUNBOOK.md`: 원격 DB 적용·RLS·Storage·스모크 테스트·시연 종료 절차
- `scripts/build_demo_projection.py`: 수동 승인 목록을 기준으로 RDB·그래프 CSV를 만드는 ETL

## 시연 보안

마이그레이션은 역할 기반 RLS를 사용하며, 영업 시연 중의 익명 접근과 쓰기는 `app_setting`의 `demo_access_enabled`, `demo_write_enabled`로 제어합니다. 시연 종료 직후 다음을 실행합니다.

```sql
update public.app_setting
set value = 'false'::jsonb
where key = 'demo_write_enabled';
```

실사용 전에는 `demo_access_enabled`도 비활성화하고 Supabase Auth 사용자를 `profile.auth_user_id`와 연결하십시오.
