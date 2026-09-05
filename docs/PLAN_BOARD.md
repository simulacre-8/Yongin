# 화요일 구현 추진현황 보드

## 접근

Yongin 앱의 상단 메뉴에서 **추진현황**을 선택하거나 `/plan` 경로로 진입한다. Manus에서는 이 프로젝트의 최신 WebDev 체크포인트를 열면 기본 주소 `/`에서 추진현황이 바로 표시된다. GitHub `main`과 연결된 Netlify 배포는 영업 시연을 위해 루트 요청을 `/dashboard`로 보내며, 추진현황은 `/plan`에서 연다.

## 원본과 데이터 생성

원본 일정은 `docs/PLAN_UNTIL_TUESDAY.md`이다. 다음 명령은 Markdown의 시간대별 표 49행을 프런트엔드 초기 데이터와 Supabase 시드 SQL로 동시에 변환한다.

```bash
python3 scripts/build-plan-data.py
```

생성 파일은 다음과 같다.

| 파일 | 용도 |
|---|---|
| `client/src/lib/plan-data.ts` | 타입, 49개 초기 작업, 마일스톤, 시간 가중 진행률 계산 |
| `supabase/seed_plan.sql` | `project_plan` 1건과 `project_plan_item` 49건의 재현 가능한 시드 |

## 진행률 계산

전체 및 일자별 진행률은 단순 행 개수가 아니라 각 작업의 예정시간으로 가중한다. 점심·저녁·버퍼 4개 행은 일정에는 표시하지만 진행률 분모에서 제외한다.

```text
전체 진행률 = Σ(작업 예정분 × 항목 진행률) ÷ Σ(작업 예정분)
```

초기값은 2026-09-05 22:20 KST 시점에 실제 검증된 결과를 근거로 넣었다. 화면에서 상태, 진행률, 메모를 변경하면 즉시 다시 계산된다.

## 클라우드 저장

| 테이블 | 역할 |
|---|---|
| `project_plan` | 계획 제목, 마감, 원본 경로, 버전 |
| `project_plan_item` | 49개 시간대 작업의 상태·진행률·메모 |
| `project_plan_event` | 상태·진행률·메모 변경 전후 이력 |

화면은 Supabase에서 항목을 읽고, 상태나 퍼센트 변경을 즉시 저장한다. 메모는 입력란에서 포커스를 벗어날 때 저장된다. 여러 창에서 변경된 내용은 Supabase Realtime 구독으로 다시 불러온다. 원격 DB를 사용할 수 없으면 브라우저 로컬 저장소로 폴백하며 화면 오른쪽 위에 **로컬 폴백**이 표시된다.

## 검증

```bash
pnpm check:supabase
pnpm smoke:plan
pnpm exec vitest run client/src/lib/plan-data.test.ts
pnpm check
pnpm build
```

`smoke:plan`은 공개 브라우저 키로 계획 항목을 조회하고, 메모를 임시 변경하고, `project_plan_event` 생성 여부를 확인한 뒤 원래 값으로 복원한다.

## 접근 범위

Manus WebDev 체크포인트는 현재 Manus 프로젝트 계정에서 관리된다. 다만 현재 정적 시연 앱 자체는 Manus OAuth 로그인을 사용하지 않으며, Netlify URL을 아는 사용자는 시연 기간 동안 보드를 열 수 있다. 계정 단위 비공개 접근이 필요해지면 정식 인증을 붙이고 익명 시연 플래그를 비활성화한다.
