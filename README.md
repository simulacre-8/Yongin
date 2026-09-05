# 용인특례시 안전보건체계 통합관리 시연

화면명세 ZIP의 공공기관 UI를 React로 유사 재구성한 **법령 DB·의무이행·점검 폐쇄 루프 영업 시연**입니다. 102개 화면을 모두 복제하지 않고 일곱 개 대표 화면과 역할·상태 변형으로 구성합니다.

## 실행

```bash
pnpm install
pnpm dev
```

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

Docker는 필요하지 않습니다. 호스팅형 Supabase Dashboard의 SQL Editor에서 아래 파일을 순서대로 실행합니다.

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/seed.sql`

현재 UI는 스키마가 적용되기 전에도 로컬 시연 데이터로 동작합니다. `ref_law`가 생성되면 관계 법령 화면은 Supabase 데이터를 우선 조회합니다. 업무 CRUD를 완전히 Supabase로 전환하려면 `DemoContext`의 로컬 저장 구현을 동일 테이블 호출로 교체합니다.

## 검증

```bash
pnpm check
pnpm build
pnpm exec vitest run client/src/lib/supabase.secrets.test.ts
```

## 문서

- `docs/UI_SCREEN_MAP.md`: UI ZIP 102개 화면의 대표 라우트 축약표
- `docs/DB_GRAPH_HANDOFF.md`: 법령 데이터 축소량, Supabase 구성, 그래프 DB 전환 계약
- `scripts/build_demo_projection.py`: 수동 승인 목록을 기준으로 RDB·그래프 CSV를 만드는 ETL

## 시연 보안

마이그레이션은 시연 편의를 위해 제한된 업무 테이블에 익명 쓰기 정책을 제공하며 `app_setting.demo_write_enabled`로 제어합니다. 시연 종료 직후 다음을 실행합니다.

```sql
update public.app_setting
set value = 'false'::jsonb
where key = 'demo_write_enabled';
```

실사용 전에는 반드시 Supabase Auth와 조직·역할 기반 RLS로 교체하십시오.
