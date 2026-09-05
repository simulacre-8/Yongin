# ADOMS UI 갭·컨펌 등록부

**범위.** 이 등록부는 일반 개선 제안이 아니라 **화면 부재, 라벨 충돌, 대상 충돌, 권한 불확실, 신규 제작 필요**만 기록한다. 우선순위는 용인시청 적용범위 기본값, 시설·공중교통수단·도급 관리대상, Supabase ADOMS 투영, 적용판정 영속 저장 시연의 완주 가능성으로 정했다.

| 우선순위 | 차단 의미 |
|---|---|
| **P0** | 법적 근거·대상·도출을 실제처럼 시연하거나 저장할 수 없는 차단 항목 |
| **P1** | 역할, 쓰기 권한, 업무 상태 전이가 정해지지 않은 차단 항목 |
| **P2** | 원문 충실도, 데이터 정규화, 세부 동작을 흔드는 항목 |

## P0 — 대상·적용판정·도출 근거

| ID | 분류 | 근거 SCR / 시나리오 | 확인 질문 문구 | 승인 전 처리 |
|---|---|---|---|---|
| GAP-P0-01 | 해결됨 / 대상 분류 | SCR-034~035, 057~074; ACT1-03~04 | **확정:** 용인경전철은 FMS 시설물이 아니라 도시철도법 제2조제2호 등에 따른 독립 `공중교통수단`으로 저장한다. | 관리대상 별도 탭에 시연값으로 노출하고 실제 자산·계약 원장 수신 시 교체한다. |
| GAP-P0-02 | 화면 부재 / 신규 제작 | ACT1-05; SCR-024/025는 법령 **관리 목록** | “L1 적용법령 결과의 profile 입력, 조문 anchor·인용문, 규칙 ID, `applicable/not_applicable/unknown` 결과 및 ‘근거 확인 필요’ 처리 방식을 확정해 주십시오.” | 근거 snapshot이 없는 법령은 적용 결과에 표시하지 않는다. |
| GAP-P0-03 | 화면 부재 / 신규 제작 | ACT1-06~07; SCR-035는 이행시기 편집 | “L2 대상 해당·L3 규모/조건 필터의 입력값, 우선순위, 보류 조건, 재실행/중복 인스턴스 및 ‘조건 없음=전량 적용’ 정책을 승인해 주십시오.” | 도출 실행은 숨기고 검수된 duty instance만 시드한다. |
| GAP-P0-04 | 화면 부재 / 신규 제작 | ACT1-08, ACT4-32 | “의무 근거 패널에서 `unit_path`, 원문 인용, 시행일, 상·하위 위임관계, rule ID, L1/L2/L3 로그 중 필수 표시값과 법령 정본의 출처·버전·공개 범위를 확정해 주십시오.” | P5-1(근거 비어 있는 의무 0건)을 통과한 요약근거 외에는 노출하지 않는다. |
| GAP-P0-05 | 신규 제작 / 데이터 보존 | ACT1-05~08 | “`applicability_decision`과 `duty_instance`에 target/law/duty/rule version/입력 snapshot/결과/실행자·시각/superseded 관계 중 무엇을 필수 보존합니까?” | 임시 표시문만 저장하지 않고 read-only fixture로 제한한다. |
| GAP-P0-06 | 신규 제작 | ACT1-09; SCR-021/022는 사용자·대상 매핑 | “의무 담당자 배정은 대상 배정과 별도입니까? 다중 의무, 주/부담당, 유효기간, 재배정, 해제, 알림, 감사열람 권한을 확정해 주십시오.” | SCR-021/022를 의무배정으로 오용하지 않고 페르소나 시드만 사용한다. |
| GAP-P0-07 | 신규 제작 / 상태정의 | ACT2-11~13 | “내 업무와 6단계 프로세스의 상태 정의, 전이 역할, 필수 필드, due_date 산식·기준일, 원본 ‘이행 시기’와의 관계를 확정해 주십시오.” | 기존 대시보드의 마감 요약만 보이고 단계 링크는 숨긴다. |
| GAP-P0-08 | 신규 제작 / 증빙 보존 | ACT2-15; SCR-033, 036~087 | “SHA-256, 원본 보존, 5년 만료일, soft delete, 버전, 요구증빙 대조를 시연 필수로 확정합니까? 형식·개당/총 용량·미리보기·열람/삭제 권한을 정해 주십시오.” | UI의 10MB 표기 외 정책은 실제 서버 저장이 구현될 때까지 주장하지 않는다. |
| GAP-P0-09 | 화면 부재 / 신규 제작 | ACT3-20~23; SCR-033, 088 | “도급 의무 도출, 적격수급인 평가, 작업 전 정보제공/수령확인, 합동점검의 체크리스트·점수·참여자·사진·수범주체를 확정해 주십시오.” | 계약 기본정보와 기존 준수상태만 보이고 신규 CTA는 숨긴다. |
| GAP-P0-10 | 신규 제작 / 권한 불확실 | ACT3-24~26 | “수급인 조치 결과의 입력 방식(외부 포털/내부 대리입력), 기한, 지시→조치중→완료→승인/반려→에스컬레이션, 수신자·재통지·해제 규칙을 승인해 주십시오.” | 외부 통보/에스컬레이션은 발생시키지 않는다. |
| GAP-P0-11 | 화면 부재 / 신규 제작 | ACT4-32; SCR-024/025, 102 | “법령 원문 조회의 조문 ID, 전문/인용 범위, unit path, 시행일, 위임관계, 정본 버전과 공개권한을 확정해 주십시오.” | 법령명 목록만 보이고 ‘원문 전체’/그래프는 숨긴다. |

## P1 — 권한·승인·조치 전이

| ID | 분류 | 근거 SCR / 시나리오 | 확인 질문 문구 | 승인 전 처리 |
|---|---|---|---|---|
| GAP-P1-01 | 권한 불확실 | SCR-003/004, 006~009 | “경영책임자와 4개 화면 사용자 유형을 `role_level` 1000~4000 및 `disaster_type`에 어떻게 정확히 매핑합니까? 경영책임자는 별도 persona/capability입니까?” | role code/persona/capability를 분리하고 서버는 deny 기본으로 둔다. |
| GAP-P1-02 | 화면 부재 / 권한 불확실 | SCR-003 vs SCR-009; GNB 관리자 | “사업장·부서 사용자의 `관리자` GNB 노출·접근을 허용합니까? GNB `관리자`와 SCR-021~026 담당부서 관리자 기능은 같은 권한입니까?” | 메뉴와 서버 route를 숨김/deny한다. |
| GAP-P1-03 | 화면 부재 | SCR-003, SCR-026, IA | “`기관장 예방활동`의 입력·조회·승인 화면, 역할, 데이터와 감사정책을 별도 명세해 주십시오. SCR-026 활동기록 관리를 대체 화면으로 승인합니까?” | SCR-026은 감사조회로만 두며 기관장 예방활동을 대체하지 않는다. |
| GAP-P1-04 | 화면 부재 / 대상 충돌 | SCR-002, SCR-097~101 | “IA의 일반 `게시판`과 ‘중대재해 사고사례’의 관계, 공지/공시 범위, CRUD 권한과 진입 경로를 별도 명세해 주십시오.” | 사고사례를 일반 게시판·공지로 이름 붙이거나 연결하지 않는다. |
| GAP-P1-05 | 신규 제작 / 권한 불확실 | ACT2-16, ACT4-27; SCR-090 | “의무이행 제출·총괄 승인·반려·재제출을 점검 회차 결재와 분리해 정의해 주십시오. 상태 변경자·의견·알림·감사로그는 무엇입니까?” | submitted/approved CTA를 노출하지 않는다. |
| GAP-P1-06 | 권한 불확실 | SCR-088~090 | “점검 회차의 생성자·점검자·피점검자·결재자, SCR-090 캡션과 로그인 주체의 충돌을 어떻게 해소합니까?” | 단일 총괄 persona의 시드 회차로 제한하고 결재는 disabled로 둔다. |
| GAP-P1-07 | 상태 불확실 | SCR-013/017, ACT3-24 | “조치 지시의 수신자 선택, 선택완료/발신/닫기/취소, 발신 후 목적지, 알림·이력·완료확인 규칙을 확정해 주십시오.” | 실제 `action_order` 영속 구현 전 발신 버튼을 숨긴다. |
| GAP-P1-08 | 상태 불확실 | SCR-050/051, 053/054, 066~069, 082~085 | “무재해/해당없음 ON 때 사고·개선행·첨부를 보존/숨김/삭제 중 무엇으로 처리하고, 해제·이행률 분모를 어떻게 처리합니까?” | 플래그와 기존 payload를 분리 보존한다. |
| GAP-P1-09 | 상태 불확실 | SCR-006~009, 011~017, 090 | “이행률 산식, 해당없음 분모, 0분모, 반올림/절사 및 우수/보통/미흡 임계값·경계값을 확정해 주십시오.” | 수식·임계값을 설정값으로 두고 80/70 추정치를 고정하지 않는다. |
| GAP-P1-10 | 대상 충돌 / 상태 불확실 | SCR-010~017, 089~090 | “취합 시작은 조회 필터입니까 영속 회차 생성입니까? 재진입·선택변경·동시작업 시 대상/항목 snapshot·가변열·이력을 어떻게 관리합니까?” | 시연은 inspection 회차 1건과 선택집합 snapshot을 저장한다. |
| GAP-P1-11 | 권한 불확실 / 신규 제작 | ACT2-17, ACT3-26; SCR-006~009 | “알림 +, 행 클릭, 읽음, 의무/조치 딥링크, 메일·문자 목업 이력과 에스컬레이션 수신자 정책을 확정해 주십시오.” | read-only 인앱 알림과 구현된 링크만 노출한다. |

## P2 — 원문 라벨·데이터·자산 해석

| ID | 분류 | 근거 SCR | 확인 질문 문구 | 승인 전 처리 |
|---|---|---|---|---|
| GAP-P2-01 | 라벨 충돌 | SCR-001 vs 002/006 | “`공지사항`/`공시사항`, IA의 `게시판`/GNB `관리자`, `시스템 관리자`/`관리자`의 최종 메뉴명과 진입경로를 확정해 주십시오.” | 검수본은 컷별 원문을 유지하며 제품 메뉴를 임의 통일하지 않는다. |
| GAP-P2-02 | 라벨 충돌 | SCR-015/016 | “중대시민재해 점검사항 마스터의 정본은 SCR-015와 016 중 어느 쪽입니까? `안전보건관리체계 구축·이행1` 끝의 1은 의도된 표기입니까?” | 시연에는 승인 스키마만 사용한다. |
| GAP-P2-03 | 라벨/전이 충돌 | SCR-038~049, 052, 066 | “하단 N단계 문구와 좌측 step/실제 route가 충돌할 때, 표시 문자열과 실제 목적지를 각각 어떤 기준으로 확정합니까?” | label과 route ID를 분리한다. |
| GAP-P2-04 | 라벨 충돌 | SCR-055/056, 066/067, 086/087 | “`재발방지계획서`/`재발방지보고서`, 중복 `법령명`, `조항` 데이터 의미의 정정 기준을 검수본과 용인 시연본별로 확정해 주십시오.” | 표시 원문과 의미 기반 내부 필드를 분리한다. |
| GAP-P2-05 | 대상 충돌 | SCR-006/007, 034 | “대시보드 공중이용시설 6개소와 하위합계, SCR-034 936개소의 단위·scope는 무엇입니까?” | 모든 count에 unit과 query scope를 보존한다. |
| GAP-P2-06 | 화면 부재 | SCR-024/025, 030/031, 080, 097 | “신규, 행 상세, 계약 저장 후 복귀, SCR-080 불러오기, 사고사례 새 글의 실제 화면/필수필드/권한을 제공해 주십시오.” | 미제시 CTA는 숨김/disabled한다. |
| GAP-P2-07 | 상태 불확실 | SCR-020, 029, 033, 036~087 | “파일 형식·10MB 예외·다중첨부·PDF/HWP/이미지 미리보기·다운로드·삭제·버전·보관기간을 공통정책으로 확정해 주십시오.” | private storage, 메타데이터, 서버 검증과 미리보기 불가 파일 다운로드만 적용한다. |
| GAP-P2-08 | 상태 불확실 | SCR-021~023, 035 | “권한인계, 체크 즉시저장, 삭제/초기화 확인·복구/soft delete, 날짜 역전·금액·필수 입력 오류 문구를 확정해 주십시오.” | 위험 명령은 confirm+audit, 영구삭제는 금지한다. |
| GAP-P2-09 | 라벨 충돌 / 데이터 불일치 | SCR-025, 048, 056, 076~079, 087 | “총 2건/6행, 예산 `보수보강비`/`보수·보강비`, 공중이용시설 breadcrumb 등 샘플 오류의 정본 정정 여부를 확정해 주십시오.” | 카탈로그에는 원문, 시연 seed에는 검수값을 사용한다. |
| GAP-P2-10 | 화면 부재 / 기능범위 | SCR-091~096, 102 | “발생통계 업로드 템플릿·중복/오류·권한, 차트 export 포맷·범위·파일명, 연령/법령집계 기준을 확정해 주십시오.” | 현 시연 핵심 route에서는 upload/export를 숨긴다. |
| GAP-P2-11 | 권한 불확실 | SCR-097~101 | “사고사례 새 글·수정·삭제 권한, 조회수 중복방지, 5 파일 슬롯, 수정/삭제 후 목적지와 soft/hard delete 정책을 확정해 주십시오.” | 사고사례는 시연에서 숨기고 공통 파일/확인 UI만 재사용한다. |
| GAP-P2-12 | 원본 자산 불확실 | SCR-004~009, 02·04~07 영역 PNG | “원본 PNG의 넓은 검정 면은 실제 배경입니까, 투명 추출/마스킹 산물입니까? HWP/PDF 정본 배경·헤더 시안을 제공해 주십시오.” | 밝은 본문과 확인 가능한 패널만 구현한다. |

## 승인 후 갱신 순서

1. **P0**을 먼저 승인하여 대상 유형, 적용판정, 도출·근거 보존을 고정한다.
2. **P1**로 RBAC, 제출/승인, 점검/조치, 알림의 실제 write 전이를 고정한다.
3. **P2**에서 원본 검수 표기와 용인시 시연 데이터 표기를 분리한다.

> 원본에 없는 **기관장 예방활동**, **일반 게시판**, **GNB 시스템 관리자**는 별도 요구사항이 승인되기 전 기존 SCR로 대체하거나 가짜 기능으로 노출하지 않는다.

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
