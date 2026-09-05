# ADOMS 용인시 시연 시나리오 교차표

**대상 시나리오:** [ADOMS_용인시데모_시나리오_v1.html](file:///home/ubuntu/upload/ADOMS_용인시데모_시나리오_v1.html) — 32 STEP / 4 ACT / 15분.

## 1. 적용 전제와 판정 방법

이 교차표는 기존 원본 화면을 억지로 새 시나리오의 화면이라고 부르지 않는다. 분류는 다음 셋만 사용한다.

| 판정 | 의미 |
|---|---|
| **기존 화면 재사용** | 시연 행동·데이터 경계가 원본 SCR에 존재하며, 브랜딩/시드값 외 별도 interaction 설계가 필요 없다. |
| **상태변형** | 동일한 원본 패턴/route에 용인시 단일대상·역할·선택 상태·표 스키마 또는 시드 데이터를 주입한다. 원본 화면 자체가 아닌 상태로 구현한다. |
| **신규 제작 필요 — 컨펌** | 원본에 대응 UI·행동·권한·데이터 계약이 없다. 아래의 ‘원본 베이스’는 시각/컴포넌트 참고일 뿐 신규 화면을 임의 설계하라는 뜻이 아니다. 구현 전 질문에 대한 승인과 최소 필드·권한·전이 확정이 필요하다. |

**고정 제약.** 현 시연은 **용인시청 단일 대상**을 대상으로 한 Supabase ADOMS 투영이다. 법령/의무 기준정보는 읽기 전용으로 통제하고, `applicability_decision`(L1/L2/L3 적용판정), 그 근거 snapshot, 이행/증빙/점검/조치 상태는 영속 저장한다. 따라서 ‘도출 결과’·‘근거 패널’은 단순 목업이나 화면 텍스트만으로 대체할 수 없다.

## 2. 시연 라우트 압축 원칙

| 시연 route | 원본 재사용 근거 | 시연의 역할 |
|---|---|---|
| `/login` | SCR-005 | 페르소나 전환을 포함한 인증 시작 |
| `/` | SCR-006~009 | 스코프별 대시보드·지연/임박·요약 |
| `/targets` | SCR-027~033, SCR-034 | 관리대상/계약 선택·등록·속성 |
| `/laws` | SCR-024~025, SCR-035, SCR-102 | 읽기전용 법령 탐색 및 적용근거 |
| `/obligations` | SCR-035, 011/012, 015/016 | 도출된 의무 목록, 기한, 근거/담당 배정 |
| `/evidence` | SCR-033, SCR-036~087 | 계획·실행·증빙·제출 상태 |
| `/inspection` | SCR-088~090, SCR-013/017 | 점검·보완지시·조치 폐루프 |
| `/summary` | SCR-006, SCR-011/015, SCR-090 | 경영 요약·결재/드릴다운 |

시연 라우트는 원본 IA를 축소 투영한 것이다. 원본 통계/사례 전용 route는 현 시연의 기본 동선에 추가하지 않는다. 구현되지 않은 원본 버튼, 다운로드, 빈 모달은 숨김/disabled 처리한다.

## 3. ACT 1 — 대상을 넣으니 의무가 나온다

| ACT·STEP | 기존 시나리오 행동 | 원본 SCR 및 대표 PNG | 판정 | 구현 연결·컨펌 경계 |
|---|---|---|---|---|
| 1-01 | 김총괄 계정 로그인 | SCR-005 · `005_로그인.png` | **기존 화면 재사용** | `/login`; 용인시 CI/계정 fixture만 교체. |
| 1-02 | 총괄 대시보드에서 미배정 의무 경고 | SCR-006 · `006_메인(대시보드) - (경영책임자, 총괄) 로그인 시.png` | **상태변형** | `/`; 전체 이행률·기한초과 위젯은 재사용. `미배정 의무` KPI는 원본에 없으므로 위젯 추가 여부 컨펌. |
| 1-03 | 공중교통수단 탭의 빈 목록에서 대상 등록 | SCR-027 · `027_관리대상 현황 – (사업장, 부서) 관리대상 선택.png`; SCR-034 · `034_법 의무사항 - (사업장, 부서) 중대시민재해 : 관계 법령 관리.png` | **신규 제작 필요 — 컨펌** | 원본은 `공중이용시설·교통수단`을 묶고 독립 공중교통수단 탭/등록 진입을 제시하지 않는다. 목록/필터 패턴만 참조한다. |
| 1-04 | 용인경전철(도시철도차량) 등록 및 적용법령 도출 활성화 | SCR-028/029 · 대상 기본정보 PNG | **신규 제작 필요 — 컨펌** | 원본 기본정보 폼에는 노선연장·차량편성·운영주체·도시철도차량 유형이 없다. 공중교통수단 신규 타입/필드·도출 trigger를 확정한다. |
| 1-05 | L1 적용법령 결과와 근거조문/인용문 표시 | SCR-024/025 · 관계법령 목록 PNG | **신규 제작 필요 — 컨펌** | 원본은 법령 **관리 목록**이지 프로필 기반 적용법령 판단 결과가 아니다. `applicability_decision` L1의 규칙·근거 anchor·unknown 표기를 승인한다. |
| 1-06 | L2/L3 의무 도출 실행·제외/보류 건수 | SCR-035 · `035_법 의무사항 ... 관계 법령 관리.png` | **신규 제작 필요 — 컨펌** | SCR-035는 이행시기 편집이며 도출 실행/로그가 없다. L1→L2→L3 처리, 규칙 버전, 재실행/중복 정책을 확정한다. |
| 1-07 | 도출 의무 목록·근거 배지·미배정 담당부서 | SCR-035, SCR-011/012 · 의무 트리/집계 PNG | **상태변형** | `/obligations`; 트리/표 패턴을 사용하되 도출 인스턴스, 근거 배지, 담당배정 필드는 원본에 없으므로 필드·권한을 컨펌한다. |
| 1-08 | 의무 상세 근거 패널과 판정 로그 | 직접 대응 SCR 없음; 법령 베이스: SCR-024/025 | **신규 제작 필요 — 컨펌** | 법령 원문, `unit_path`, 인용문, rule ID, L1/L2/L3 판정 로그의 표시 설계가 없다. P5-1 근거 게이트 UI/빈값 차단을 정의한다. |
| 1-09 | 의무 다중선택 후 박경전에게 배정 | SCR-021 · 담당자 지정 PNG; SCR-022 · 대상 지정 PNG | **신규 제작 필요 — 컨펌** | 원본은 **사용자 역할/관리대상** 배정이지 `duty_instance` 담당 배정이 아니다. TransferList 시각 패턴은 재사용하되 assignment 모델/감사/재배정 권한을 승인한다. |

## 4. ACT 2 — 담당자의 이행과 증빙

| ACT·STEP | 기존 시나리오 행동 | 원본 SCR 및 대표 PNG | 판정 | 구현 연결·컨펌 경계 |
|---|---|---|---|---|
| 2-10 | 박경전 계정 전환·내 업무 범위 확인 | SCR-009 · `009_메인(대시보드) - (사업장, 부서) 로그인 시.png` | **상태변형** | `/`의 지정대상 스코프를 이용한다. 의무별 배정 스코프는 ACT1-09 승인 후 서버에서 강제한다. |
| 2-11 | 내 업무 목록의 지연·임박·정렬 | SCR-006~009 · 대시보드 PNG | **신규 제작 필요 — 컨펌** | 원본에는 기한 요약은 있으나 ‘배정 의무 목록/잔여일 정렬’ 화면이 없다. `/obligations` 목록의 열·정렬·due_date 산식·기준일을 확정한다. |
| 2-12 | 의무 상세의 6단계 프로세스 바·근거 패널 | 직접 대응 SCR 없음; 실적 베이스 SCR-036~087 | **신규 제작 필요 — 컨펌** | 6단계 state machine/근거 패널은 원본 의무이행 LNB와 다르다. 단계 정의·역행/재제출·감사 이벤트를 컨펌한다. |
| 2-13 | 교육 계획 수립, `not_started → planned` | SCR-035 · 이행시기; SCR-061/062 · 계획 입력/불러오기 | **신규 제작 필요 — 컨펌** | 원본은 일정 또는 특정 실적표이지 교육 계획 필드/상태 이력이 없다. `/evidence` 계획 schema와 계획-의무 연결을 승인한다. |
| 2-14 | 실제 이행 등록 | SCR-036~087 · 의무이행 입력 PNG | **상태변형** | `/evidence`; `duty_record`·항목별 schema·실시일/실제인원 등 교육용 필드를 선택 의무에 주입한다. |
| 2-15 | 전자 증빙 업로드, SHA-256·보관기한·요건대조 | SCR-033, SCR-036~087 · 첨부 행 PNG | **상태변형** | 첨부 UI/10MB 규칙을 재사용. SHA-256, immutable 원본, 5년 만료일, soft delete, 요구증빙 대조는 원본 화면 미제시이므로 저장 정책 컨펌. |
| 2-16 | 제출 후 승인 대기 | 직접 대응 없음; 결재 베이스 SCR-090 | **신규 제작 필요 — 컨펌** | SCR-090의 `결재하기`는 점검 회차 결재이지 의무 증빙 승인 아니다. 제출/승인 상태, 승인자, 반려/재제출 UI와 알림을 정의한다. |
| 2-17 | 지연·임박 알림함에서 의무 이동 | SCR-006~009 · `NotificationPanel` PNG | **상태변형** | `/`의 알림 패널을 재사용하고 알림→의무 딥링크를 저장한다. 메일·문자 발송은 시나리오대로 목업 이력만 표시한다. |

## 5. ACT 3 — 하도급 산재를 도급인이 관리

| ACT·STEP | 기존 시나리오 행동 | 원본 SCR 및 대표 PNG | 판정 | 구현 연결·컨펌 경계 |
|---|---|---|---|---|
| 3-18 | 도급·용역·위탁 계약 목록 | SCR-030 · `030_관리대상 현황 ... 조회 및 등록·관리.png` | **기존 화면 재사용** | `/targets`의 계약 관계 패널; 계약명·수급인·기간·금액·현장이라는 시드값을 실제 `contract`에서 조회. |
| 3-19 | 계약 상세와 도급 의무 도출 시작 | SCR-031/032/033 · 계약 긴 폼 PNG; SCR-020 · 읽기 상세 PNG | **상태변형** | 계약/위험요인/증빙 표시를 재사용. `도급 안전보건 의무 도출` trigger는 원본에 없으므로 기능 접근권한을 컨펌한다. |
| 3-20 | 도급인 의무 도출 결과 | SCR-033 · 계약 관리의무 표 PNG | **신규 제작 필요 — 컨펌** | SCR-033은 이행상태 입력이지 L1/L2/L3 결과/근거 UI가 아니다. 선정 10건, 조건 필터·판정보류·근거 저장 모델을 승인한다. |
| 3-21 | 적격 수급인 선정 평가표 | SCR-033 · 계약 준수 체크리스트 PNG | **신규 제작 필요 — 컨펌** | 점수·선정 결과·평가 항목의 원본 화면이 없다. 평가표/첨부·산식·결재 및 수정권한을 확정한다. |
| 3-22 | 작업 시작 전 안전보건 정보 제공·수령 확인 | SCR-033 · 계약 증빙 행 PNG | **신규 제작 필요 — 컨펌** | 첨부 패턴만 존재하고 제공문서/수령확인 및 착공일 due_date는 없다. 수령 주체/전자확인 방식/기한 산식을 확정한다. |
| 3-23 | 합동 안전·보건점검 체크리스트·사진 | SCR-088 · 점검 아코디언 PNG | **신규 제작 필요 — 컨펌** | 원본 점검은 내부 사업장 이행 판정이다. 도급인·수급인 참여자, 적합/부적합, 사진의 계약 점검 schema를 승인한다. |
| 3-24 | 부적합 항목의 시정조치 지시·기한·통보 | SCR-013/017 · 조치지시 모달 PNG | **상태변형** | 수신자 선택·메시지 모달을 시각 재사용한다. 수급인 대상/기한/지시→조치중→완료를 `action_order`로 저장하는 전이는 컨펌한다. |
| 3-25 | 수급인 조치결과·전후사진, 도급인 승인/반려 | 직접 대응 SCR 없음; 첨부 베이스 SCR-033 | **신규 제작 필요 — 컨펌** | 외부 수급인 포털/대리입력 여부, 승인·반려·사진 증빙 및 접근권한이 원본에 없다. |
| 3-26 | 미조치 지연·경영책임자 에스컬레이션 | SCR-006/009 · 기한초과/알림 PNG | **신규 제작 필요 — 컨펌** | 위험 카드/알림 시각은 참고 가능하나 escalation 규칙·수신자·중복 방지·해제 정책은 원본 부재다. |

## 6. ACT 4 — 경영책임자의 한 화면

| ACT·STEP | 기존 시나리오 행동 | 원본 SCR 및 대표 PNG | 판정 | 구현 연결·컨펌 경계 |
|---|---|---|---|---|
| 4-27 | 총괄이 제출 건 증빙 확인 후 승인 | 직접 대응 없음; SCR-090 결재 버튼 PNG | **신규 제작 필요 — 컨펌** | 증빙 승인과 점검 회차 결재는 다른 업무다. 승인/반려/의견/감사로그를 별도 확정한다. |
| 4-28 | 이행점검·조치 현황 | SCR-089 → SCR-088 → SCR-090 · 점검 PNG | **상태변형** | `/inspection`; 취합-판정-총괄 구조를 재사용. 단일 용인 대상의 대상/항목 수와 권한은 축소 설정한다. |
| 4-29 | 경영책임자 대시보드·지연 드릴다운 | SCR-006 · 대시보드 PNG | **상태변형** | `/`; 전체 이행률/지연 요약 재사용. 공중교통수단·사업·도급 안전관리 Top N은 원본 위젯 외 데이터이므로 표시항목 컨펌. |
| 4-30 | 법령·의무군·부서·월별 통계 | SCR-095/096, SCR-102 · 통계 PNG | **상태변형** | `/summary`의 시드 기반 보조 패널로만 사용. 원본 통계 별도 route/내보내기는 핵심동선에 증식하지 않으며 차원·산식은 컨펌. |
| 4-31 | 시스템 관리: 역할·관리대상 배정 | SCR-021/022 · 관리자 매핑 PNG | **상태변형** | 설정 패턴은 재사용. 그러나 GNB `관리자` 독립 화면은 원본에 없으므로 단일 시연 route의 노출/권한은 컨펌. |
| 4-32 | 선택 의무의 법령 원문·조항경로·위임관계 | 직접 대응 SCR 없음; 목록 베이스 SCR-024/025 | **신규 제작 필요 — 컨펌** | 원문 전체, unit_path, 시행일, 상·하위 위임 그래프를 표시하는 화면은 없다. 정본 출처·버전·링크/인용 범위·공개권한을 확정한다. |

## 7. 시연 데이터와 저장 연결표

| 시연 결과 | 반드시 저장할 키/이력 | 원본 참고 SCR | 주의 |
|---|---|---|---|
| 대상 등록 | `target`, `target_type`, 속성 JSON/정규 필드, 소관 `org_id` | 027~029, 034 | 공중교통수단은 현 원본 트랙에 묶여 있으며 유형 확정이 선행한다. |
| 적용법령/적용판정 | `applicability_decision(target_id, law_id, rule_id, layer, result, reason, source_snapshot, decided_at)` | 024/025/035 | 신규지만 핵심 시연의 ‘기계적 도출’ 근거다. `unknown`을 숨기거나 적용으로 둔갑시키지 않는다. |
| 도출 의무 | `duty_instance`, `duty_assignment`, 기준 `duty_item` 및 근거 snapshot | 035, 011/012, 021/022 | 기준 마스터와 대상별 인스턴스를 분리하고, 재도출 시 이력을 보존한다. |
| 이행·계획·증빙 | `duty_record`, 항목 detail, `duty_evidence`, 상태 이력 | 033, 036~087 | 파일 해시/보관기한/soft delete는 시연 요구사항으로 저장해야 한다. |
| 점검·시정 | `inspection`, `inspection_item`, `action_order`, recipient, transition log | 013/017, 088~090 | 원 실적은 점검 화면에서 수정하지 않는다. |
| 승인·에스컬레이션 | `approval`, `notification`, audit event | 006~009, 090 | 원본 화면 부재 기능은 승인된 state machine 후 활성화한다. |

## 8. 시연 운영 가드레일

1. P5-1: **근거 조항 anchor, 인용문, 도출규칙 ID 중 하나라도 비어 있는 시연 의무 인스턴스는 0건**이어야 한다.
2. `철도안전법·도시철도법·중처법` 등의 정본 데이터가 연결되지 않은 결과는 ‘적용’으로 표현하지 않고 `근거 확인 필요`로 저장·표시한다.
3. 시나리오 신규 화면은 이 문서의 상태변형/베이스를 근거로 임의 설계하지 않는다. [갭·컨펌 등록부](file:///home/ubuntu/projects/project-5908de38/_adoms_ui_analysis/ADOMS_UI_GAP_CONFIRMATION_REGISTER.md)의 질문 승인이 선행되어야 한다.
4. 가짜 다운로드, 빈 모달, 저장되지 않는 상태 전환은 노출하지 않는다. 단일 시연 대상에서도 모든 클릭은 저장된 Supabase 상태를 다시 읽어 다음 화면에 반영한다.

## 부록 A. 원본 PNG 자산 색인 — 전 SCR 공통

이 색인은 이 문서에서 언급한 모든 `SCR-0NN`을 **논리 이미지명과 실제 리네이밍 PNG 파일명**으로 역추적하기 위한 공통 locator다. 자산 루트는 `/home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/`이며, 파일명은 `SCREENS.csv`를 원천으로 한다. 화면의 상세 route/상태 판단은 [102-Screen Flow Map](file:///home/ubuntu/projects/project-5908de38/_adoms_ui_analysis/ADOMS_102_SCREEN_FLOW_MAP.md)을 따른다.

| SCR | CSV 논리명 | 실제 리네이밍 PNG 파일 |
|---|---|---|
| SCR-001 | `images/img001.png` | [`001_메뉴구조도.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/001_메뉴구조도.png) |
| SCR-002 | `images/img002.png` | [`002_메뉴구조도.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/002_메뉴구조도.png) |
| SCR-003 | `images/img003.png` | [`003_사용자 권한 구분.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/003_사용자 권한 구분.png) |
| SCR-004 | `images/img004.png` | [`004_사용자 권한 구분.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/004_사용자 권한 구분.png) |
| SCR-005 | `images/img005.png` | [`005_로그인.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/005_로그인.png) |
| SCR-006 | `images/img006.png` | [`006_메인(대시보드) - (경영책임자, 총괄) 로그인 시.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/006_메인(대시보드) - (경영책임자, 총괄) 로그인 시.png) |
| SCR-007 | `images/img007.png` | [`007_메인(대시보드) - (중대재해 담당부서) 로그인 시.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/007_메인(대시보드) - (중대재해 담당부서) 로그인 시.png) |
| SCR-008 | `images/img008.png` | [`008_메인(대시보드) - (사업소, 실/국) 로그인 시.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/008_메인(대시보드) - (사업소, 실/국) 로그인 시.png) |
| SCR-009 | `images/img009.png` | [`009_메인(대시보드) - (사업장, 부서) 로그인 시.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/009_메인(대시보드) - (사업장, 부서) 로그인 시.png) |
| SCR-010 | `images/img010.png` | [`010_이행현황 – (총괄, 담당부서) 중대산업재해 : 대상 및 취합정보 항목 선택.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/010_이행현황 – (총괄, 담당부서) 중대산업재해 : 대상 및 취합정보 항목 선택.png) |
| SCR-011 | `images/img011.png` | [`011_이행현황 – (총괄, 담당부서) 중대산업재해 : 선택항목에 대한 해당년도 이행 현황표.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/011_이행현황 – (총괄, 담당부서) 중대산업재해 : 선택항목에 대한 해당년도 이행 현황표.png) |
| SCR-012 | `images/img012.png` | [`012_이행현황 – (총괄, 담당부서) 중대산업재해 : 선택항목에 대한 대상별 이행 현황표.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/012_이행현황 – (총괄, 담당부서) 중대산업재해 : 선택항목에 대한 대상별 이행 현황표.png) |
| SCR-013 | `images/img013.png` | [`013_이행현황 – (총괄, 담당부서) 중대산업재해 : 이행현황 확인에 따른 조치 지시.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/013_이행현황 – (총괄, 담당부서) 중대산업재해 : 이행현황 확인에 따른 조치 지시.png) |
| SCR-014 | `images/img014.png` | [`014_이행현황 – (총괄, 담당부서) 중대시민재해 : 대상 및 취합정보 항목 선택.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/014_이행현황 – (총괄, 담당부서) 중대시민재해 : 대상 및 취합정보 항목 선택.png) |
| SCR-015 | `images/img015.png` | [`015_이행현황 – (총괄, 담당부서) 중대시민재해 : 선택항목에 대한 해당년도 이행 현황표.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/015_이행현황 – (총괄, 담당부서) 중대시민재해 : 선택항목에 대한 해당년도 이행 현황표.png) |
| SCR-016 | `images/img016.png` | [`016_이행현황 – (총괄, 담당부서) 중대시민재해 : 선택항목에 대한 대상별 이행 현황표.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/016_이행현황 – (총괄, 담당부서) 중대시민재해 : 선택항목에 대한 대상별 이행 현황표.png) |
| SCR-017 | `images/img017.png` | [`017_이행현황 – (총괄, 담당부서) 중대시민재해 : 이행현황 확인에 따른 조치 지시.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/017_이행현황 – (총괄, 담당부서) 중대시민재해 : 이행현황 확인에 따른 조치 지시.png) |
| SCR-018 | `images/img018.png` | [`018_이행현황 – (총괄, 담당부서) 도급·용역·위탁 : 대상 항목 선택.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/018_이행현황 – (총괄, 담당부서) 도급·용역·위탁 : 대상 항목 선택.png) |
| SCR-019 | `images/img019.png` | [`019_이행현황 – (총괄, 담당부서) 도급·용역·위탁 : 선택항목에 대한 이행 현황표.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/019_이행현황 – (총괄, 담당부서) 도급·용역·위탁 : 선택항목에 대한 이행 현황표.png) |
| SCR-020 | `images/img020.png` | [`020_이행현황 – (총괄, 담당부서) 도급·용역·위탁 : 선택항목에 대한 상세 정보.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/020_이행현황 – (총괄, 담당부서) 도급·용역·위탁 : 선택항목에 대한 상세 정보.png) |
| SCR-021 | `images/img021.png` | [`021_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 담당자 지정.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/021_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 담당자 지정.png) |
| SCR-022 | `images/img022.png` | [`022_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 관리대상 지정.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/022_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 관리대상 지정.png) |
| SCR-023 | `images/img023.png` | [`023_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 사업장 기본정보 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/023_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 사업장 기본정보 등록/관리.png) |
| SCR-024 | `images/img024.png` | [`024_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 관련법령 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/024_관리대상 현황 – (중대재해 담당부서(관리자)) 중대산업재해 관련법령 등록/관리.png) |
| SCR-025 | `images/img025.png` | [`025_관리대상 현황 – (중대재해 담당부서(관리자)) 중대시민재해 관련법령 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/025_관리대상 현황 – (중대재해 담당부서(관리자)) 중대시민재해 관련법령 등록/관리.png) |
| SCR-026 | `images/img026.png` | [`026_관리대상 현황 – (중대재해 담당부서(관리자)) 경영책임자 점검/조치 활동기록 관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/026_관리대상 현황 – (중대재해 담당부서(관리자)) 경영책임자 점검/조치 활동기록 관리.png) |
| SCR-027 | `images/img027.png` | [`027_관리대상 현황 – (사업장, 부서) 관리대상 선택.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/027_관리대상 현황 – (사업장, 부서) 관리대상 선택.png) |
| SCR-028 | `images/img028.png` | [`028_관리대상 현황 – (사업장, 부서) 관리대상에 대한 기본정보 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/028_관리대상 현황 – (사업장, 부서) 관리대상에 대한 기본정보 등록/관리.png) |
| SCR-029 | `images/img029.png` | [`029_관리대상 현황 – (사업장, 부서) 관리대상에 대한 세부정보 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/029_관리대상 현황 – (사업장, 부서) 관리대상에 대한 세부정보 등록/관리.png) |
| SCR-030 | `images/img030.png` | [`030_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 정보 조회 및 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/030_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 정보 조회 및 등록/관리.png) |
| SCR-031 | `images/img031.png` | [`031_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 정보 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/031_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 정보 등록/관리.png) |
| SCR-032 | `images/img032.png` | [`032_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 유해·위험요인 정보 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/032_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 유해·위험요인 정보 등록/관리.png) |
| SCR-033 | `images/img033.png` | [`033_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 관리의무 이행정보 등록/관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/033_관리대상 현황 – (사업장, 부서) 도급·용역·위탁 현황 관리의무 이행정보 등록/관리.png) |
| SCR-034 | `images/img034.png` | [`034_법 의무사항 - (사업장, 부서) 중대시민재해 : 관계 법령 관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/034_법 의무사항 - (사업장, 부서) 중대시민재해 : 관계 법령 관리.png) |
| SCR-035 | `images/img035.png` | [`035_법 의무사항 - (사업장, 부서) 중대시민재해 : 관계 법령 관리.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/035_법 의무사항 - (사업장, 부서) 중대시민재해 : 관계 법령 관리.png) |
| SCR-036 | `images/img036.png` | [`036_의무이행(실적증빙) – (사업장, 부서) 안전·보건 목표 및 경영방침 설정.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/036_의무이행(실적증빙) – (사업장, 부서) 안전·보건 목표 및 경영방침 설정.png) |
| SCR-037 | `images/img037.png` | [`037_의무이행(실적증빙) – (사업장, 부서) 안전·보건 총괄관리 전담조직 설치.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/037_의무이행(실적증빙) – (사업장, 부서) 안전·보건 총괄관리 전담조직 설치.png) |
| SCR-038 | `images/img038.png` | [`038_의무이행(실적증빙) – (사업장, 부서) 안전·보건관계자 배치.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/038_의무이행(실적증빙) – (사업장, 부서) 안전·보건관계자 배치.png) |
| SCR-039 | `images/img039.png` | [`039_의무이행(실적증빙) – (사업장, 부서) 안전·보건관계자 배치.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/039_의무이행(실적증빙) – (사업장, 부서) 안전·보건관계자 배치.png) |
| SCR-040 | `images/img040.png` | [`040_의무이행(실적증빙) – (사업장, 부서) 유해·위험요인 확인 및 개선절차 마련(위험성 평가).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/040_의무이행(실적증빙) – (사업장, 부서) 유해·위험요인 확인 및 개선절차 마련(위험성 평가).png) |
| SCR-041 | `images/img041.png` | [`041_의무이행(실적증빙) – (사업장, 부서) 유해·위험요인 확인 및 개선절차 마련(위험성 평가).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/041_의무이행(실적증빙) – (사업장, 부서) 유해·위험요인 확인 및 개선절차 마련(위험성 평가).png) |
| SCR-042 | `images/img042.png` | [`042_의무이행(실적증빙) – (사업장, 부서) 안전예산 편성·집행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/042_의무이행(실적증빙) – (사업장, 부서) 안전예산 편성·집행.png) |
| SCR-043 | `images/img043.png` | [`043_의무이행(실적증빙) – (사업장, 부서) 안전예산 편성·집행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/043_의무이행(실적증빙) – (사업장, 부서) 안전예산 편성·집행.png) |
| SCR-044 | `images/img044.png` | [`044_의무이행(실적증빙) – (사업장, 부서) 안전보건관계자 업무수행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/044_의무이행(실적증빙) – (사업장, 부서) 안전보건관계자 업무수행.png) |
| SCR-045 | `images/img045.png` | [`045_의무이행(실적증빙) – (사업장, 부서) 안전보건관계자 업무수행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/045_의무이행(실적증빙) – (사업장, 부서) 안전보건관계자 업무수행.png) |
| SCR-046 | `images/img046.png` | [`046_의무이행(실적증빙) – (사업장, 부서) 종사자 의견 청취 및 개선.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/046_의무이행(실적증빙) – (사업장, 부서) 종사자 의견 청취 및 개선.png) |
| SCR-047 | `images/img047.png` | [`047_의무이행(실적증빙) – (사업장, 부서) 종사자 의견 청취 및 개선.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/047_의무이행(실적증빙) – (사업장, 부서) 종사자 의견 청취 및 개선.png) |
| SCR-048 | `images/img048.png` | [`048_의무이행(실적증빙) – (사업장, 부서) 비상조치계획 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/048_의무이행(실적증빙) – (사업장, 부서) 비상조치계획 수립 및 이행.png) |
| SCR-049 | `images/img049.png` | [`049_의무이행(실적증빙) – (사업장, 부서) 비상조치계획 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/049_의무이행(실적증빙) – (사업장, 부서) 비상조치계획 수립 및 이행.png) |
| SCR-050 | `images/img050.png` | [`050_의무이행(실적증빙) – (사업장, 부서) 재해발생시 재발방지대책 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/050_의무이행(실적증빙) – (사업장, 부서) 재해발생시 재발방지대책 수립 및 이행.png) |
| SCR-051 | `images/img051.png` | [`051_의무이행(실적증빙) – (사업장, 부서) 재해발생시 재발방지대책 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/051_의무이행(실적증빙) – (사업장, 부서) 재해발생시 재발방지대책 수립 및 이행.png) |
| SCR-052 | `images/img052.png` | [`052_의무이행(실적증빙) – (사업장, 부서) 재해발생시 재발방지대책 수립 및 이행 (계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/052_의무이행(실적증빙) – (사업장, 부서) 재해발생시 재발방지대책 수립 및 이행 (계속).png) |
| SCR-053 | `images/img053.png` | [`053_의무이행(실적증빙) – (사업장, 부서) 중앙행정기관, 지자체 개선·시정 사항 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/053_의무이행(실적증빙) – (사업장, 부서) 중앙행정기관, 지자체 개선·시정 사항 이행.png) |
| SCR-054 | `images/img054.png` | [`054_의무이행(실적증빙) – (사업장, 부서) 중앙행정기관, 지자체 개선·시정 사항 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/054_의무이행(실적증빙) – (사업장, 부서) 중앙행정기관, 지자체 개선·시정 사항 이행.png) |
| SCR-055 | `images/img055.png` | [`055_의무이행(실적증빙) – (사업장, 부서) 관련 법령상 의무이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/055_의무이행(실적증빙) – (사업장, 부서) 관련 법령상 의무이행.png) |
| SCR-056 | `images/img056.png` | [`056_의무이행(실적증빙) – (사업장, 부서) 관련 법령상 의무이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/056_의무이행(실적증빙) – (사업장, 부서) 관련 법령상 의무이행.png) |
| SCR-057 | `images/img057.png` | [`057_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전인력 확보.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/057_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전인력 확보.png) |
| SCR-058 | `images/img058.png` | [`058_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전인력 확보.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/058_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전인력 확보.png) |
| SCR-059 | `images/img059.png` | [`059_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전예산 편성·집행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/059_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전예산 편성·집행.png) |
| SCR-060 | `images/img060.png` | [`060_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전점검 계획 수립·수행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/060_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전점검 계획 수립·수행.png) |
| SCR-061 | `images/img061.png` | [`061_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전계획 수립·수행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/061_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전계획 수립·수행.png) |
| SCR-062 | `images/img062.png` | [`062_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전계획 수립·수행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/062_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 안전계획 수립·수행.png) |
| SCR-063 | `images/img063.png` | [`063_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해예방 업무처리절차.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/063_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해예방 업무처리절차.png) |
| SCR-064 | `images/img064.png` | [`064_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해예방 업무처리절차.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/064_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해예방 업무처리절차.png) |
| SCR-065 | `images/img065.png` | [`065_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해예방 업무처리절차 (계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/065_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해예방 업무처리절차 (계속).png) |
| SCR-066 | `images/img066.png` | [`066_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해발생시 재발방지대책 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/066_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해발생시 재발방지대책 수립 및 이행.png) |
| SCR-067 | `images/img067.png` | [`067_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해발생시 재발방지대책 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/067_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 재해발생시 재발방지대책 수립 및 이행.png) |
| SCR-068 | `images/img068.png` | [`068_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 중앙행정기관, 지자체 개선·시정사항 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/068_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 중앙행정기관, 지자체 개선·시정사항 이행.png) |
| SCR-069 | `images/img069.png` | [`069_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 중앙행정기관, 지자체 개선·시정사항 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/069_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 중앙행정기관, 지자체 개선·시정사항 이행.png) |
| SCR-070 | `images/img070.png` | [`070_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/070_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치.png) |
| SCR-071 | `images/img071.png` | [`071_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/071_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치.png) |
| SCR-072 | `images/img072.png` | [`072_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치 (계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/072_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치 (계속).png) |
| SCR-073 | `images/img073.png` | [`073_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치 (계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/073_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치 (계속).png) |
| SCR-074 | `images/img074.png` | [`074_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치 (계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/074_의무이행(실적증빙) – (사업장, 부서) 공중이용시설·교통수단 – 관계법령상 의무 이행 조치 (계속).png) |
| SCR-075 | `images/img075.png` | [`075_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 안전인력 확보.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/075_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 안전인력 확보.png) |
| SCR-076 | `images/img076.png` | [`076_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 안전인력 확보.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/076_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 안전인력 확보.png) |
| SCR-077 | `images/img077.png` | [`077_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중대시민재해 예방 예산 편성·집행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/077_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중대시민재해 예방 예산 편성·집행.png) |
| SCR-078 | `images/img078.png` | [`078_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중대시민재해 예방 예산 편성·집행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/078_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중대시민재해 예방 예산 편성·집행.png) |
| SCR-079 | `images/img079.png` | [`079_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중대시민재해 예방 예산 편성·집행 (계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/079_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중대시민재해 예방 예산 편성·집행 (계속).png) |
| SCR-080 | `images/img080.png` | [`080_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해예방 업무처리 절차 마련·이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/080_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해예방 업무처리 절차 마련·이행.png) |
| SCR-081 | `images/img081.png` | [`081_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해예방 업무처리 절차 마련·이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/081_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해예방 업무처리 절차 마련·이행.png) |
| SCR-082 | `images/img082.png` | [`082_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해발생시 재발방지대책 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/082_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해발생시 재발방지대책 수립 및 이행.png) |
| SCR-083 | `images/img083.png` | [`083_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해발생시 재발방지대책 수립 및 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/083_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 재해발생시 재발방지대책 수립 및 이행.png) |
| SCR-084 | `images/img084.png` | [`084_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중앙행정기관, 지자체 개선·시정 사항 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/084_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중앙행정기관, 지자체 개선·시정 사항 이행.png) |
| SCR-085 | `images/img085.png` | [`085_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중앙행정기관, 지자체 개선·시정 사항 이행.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/085_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 중앙행정기관, 지자체 개선·시정 사항 이행.png) |
| SCR-086 | `images/img086.png` | [`086_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 관계 법령 의무이행 조치.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/086_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 관계 법령 의무이행 조치.png) |
| SCR-087 | `images/img087.png` | [`087_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 관계 법령 의무이행 조치.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/087_의무이행(실적증빙) – (사업장, 부서) 원료·제조물 – 관계 법령 의무이행 조치.png) |
| SCR-088 | `images/img088.png` | [`088_이행점검 및 조치 – (사업소, 실/국) 사업장 이행점검.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/088_이행점검 및 조치 – (사업소, 실/국) 사업장 이행점검.png) |
| SCR-089 | `images/img089.png` | [`089_이행점검 및 조치 – (사업소, 실/국) 사업장 이행점검.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/089_이행점검 및 조치 – (사업소, 실/국) 사업장 이행점검.png) |
| SCR-090 | `images/img090.png` | [`090_이행점검 및 조치 – (사업장, 부서) 사업장 이행점검.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/090_이행점검 및 조치 – (사업장, 부서) 사업장 이행점검.png) |
| SCR-091 | `images/img091.png` | [`091_통계 및 사례 – (중대재해 통계) 중대재해 발생통계.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/091_통계 및 사례 – (중대재해 통계) 중대재해 발생통계.png) |
| SCR-092 | `images/img092.png` | [`092_통계 및 사례 – (중대재해 통계) 중대재해 발생통계.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/092_통계 및 사례 – (중대재해 통계) 중대재해 발생통계.png) |
| SCR-093 | `images/img093.png` | [`093_통계 및 사례 – (중대재해 통계) 중대재해 발생통계(계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/093_통계 및 사례 – (중대재해 통계) 중대재해 발생통계(계속).png) |
| SCR-094 | `images/img094.png` | [`094_통계 및 사례 – (중대재해 통계) 중대재해 발생통계(계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/094_통계 및 사례 – (중대재해 통계) 중대재해 발생통계(계속).png) |
| SCR-095 | `images/img095.png` | [`095_통계 및 사례 – (중대재해 통계) 중대재해 대상통계.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/095_통계 및 사례 – (중대재해 통계) 중대재해 대상통계.png) |
| SCR-096 | `images/img096.png` | [`096_통계 및 사례 – (중대재해 통계) 중대재해 대상통계.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/096_통계 및 사례 – (중대재해 통계) 중대재해 대상통계.png) |
| SCR-097 | `images/img097.png` | [`097_통계 및 사례 – (사례) 중대재해 사고사례.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/097_통계 및 사례 – (사례) 중대재해 사고사례.png) |
| SCR-098 | `images/img098.png` | [`098_통계 및 사례 – (사례) 중대재해 사고사례.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/098_통계 및 사례 – (사례) 중대재해 사고사례.png) |
| SCR-099 | `images/img099.png` | [`099_통계 및 사례 – (사례) 중대재해 사고사례(계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/099_통계 및 사례 – (사례) 중대재해 사고사례(계속).png) |
| SCR-100 | `images/img100.png` | [`100_통계 및 사례 – (사례) 중대재해 사고사례(계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/100_통계 및 사례 – (사례) 중대재해 사고사례(계속).png) |
| SCR-101 | `images/img101.png` | [`101_통계 및 사례 – (사례) 중대재해 사고사례(계속).png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/101_통계 및 사례 – (사례) 중대재해 사고사례(계속).png) |
| SCR-102 | `images/img102.png` | [`102_통계 및 사례 – (안전·보건 관계 법령) 중대산업재해·중대시민재해.png`](file:///home/ubuntu/projects/project-5908de38/_adoms_demo_spec/images/102_통계 및 사례 – (안전·보건 관계 법령) 중대산업재해·중대시민재해.png) |
