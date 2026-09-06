# 검증 기록

**검증일:** 2026-09-06

## 핵심 결과

| 검증                      | 결과                                                      |
| ------------------------- | --------------------------------------------------------- |
| 클라이언트 시설 CSV       | 150건, 고유 ID 150, 중복 0                                |
| 클라이언트 전체 의무풀    | 논리 레코드 3,688건, 고유 `obl_id` 3,688, 중복 0          |
| 클라이언트 시설–의무 매핑 | 2,906건, 고유 복합키 2,906, 중복 0                        |
| 매핑 조인 완전성          | 시설 150/150, 고유 의무 71/71, 제목·법령·조문 경로 충돌 0 |
| 원격 전체 의무풀          | `source_version=yongin-obligation-pool-20260906` 3,688건  |
| 원격 참조 대상            | 153건 = FMS 150 + `DEMO_VIRTUAL` 3                        |
| 원격 참조 매핑            | 2,929건 = CSV 2,906 + 시나리오 23                         |
| 운영 workflow             | 대상 151건, 대상별 의무 2,891건                           |
| 고아 매핑                 | 대상 0, 의무 0                                            |
| TypeScript                | `pnpm check` 통과                                         |
| Production build          | `pnpm build` 통과                                         |
| 단위 테스트               | 전체 Vitest 통과                                          |
| Supabase CRUD·Storage     | 생성·조회·수정·삭제와 비공개 파일 왕복 통과               |
| 시설 업무 스모크          | 이행시기·실적·증빙·점검·총괄 뷰 왕복 및 정리 통과         |
| 법령 원문 스모크          | 용인시청 10개 별칭·11개 원문·13개 법령 날짜 검증 통과     |
| 용인 조직 DB              | 공식 구조 202건 + 공개 팀 590건 = 활성 792건              |
| 용인 조직 스모크          | 구조 수량·핵심 안전 조직·공식 코드·RLS 조회 통과          |
| 원문 팝업 브라우저        | 다중 조문·복사 payload·인쇄 호출·콘솔 무오류 확인         |
| 홈 의무 상세 브라우저     | 행 선택·하위 점검사항·실제 상태 집계·조직 미배정 확인     |
| 셸·증빙 UI                | 전역 LNB 제거·블루톤·아이콘 첨부·이미지 뷰어 제거 확인    |
| Storage 잔존 검사         | `evidence-private/demo/smoke/` 0건                        |
| 민감정보 검사             | PAT, JWT, service-role, 비공개 Graph API 키 추적 파일 0건 |

## 원천 파일 판독

의무풀 파일은 물리적으로 헤더 포함 5,057줄이다. `anchor_text`의 따옴표 안에 줄바꿈이 포함되어 있어 물리 줄 수는 의무 수가 아니다. 표준 CSV 파서로 읽은 논리 레코드는 3,688건이며 이 값을 원격 적재 기준으로 사용했다.

세 CSV의 SHA-256, 논리 행 수, 키 검증 결과는 `docs/YONGIN_CORE_DATA_VERIFICATION.md`에 기록했다. 재현 스크립트 `scripts/build-yongin-core-data.py`는 수량, 중복, 매핑 완전성, 제목·법령·조문 경로 충돌을 모두 검사한 뒤 전체 의무풀 시드를 생성한다.

## 업무 폐쇄루프

`007_facility_workflow_bridge.sql`은 읽기 전용 시설 참조와 쓰기 업무 계층을 연결한다. `target.target_ref`와 `target_obligation.obl_id`가 원천 ID를 유지한다. `v_facility_workflow`는 `target_ref + obl_id + period_key`를 기준으로 기한, 이행, 증빙 연결점, 점검 결과를 제공한다.

대표 브라우저 검증은 `고기상수도(FMS:WS2013-0000051)`와 `긴급안전점검의 실시(OBL-0002590)`로 수행했다. 실적 저장 성공 토스트를 확인한 후 원격 뷰에서 같은 `target_obligation_id`, `period_key=2026-H2`, `compliance_status=NONE`, `action_date=2026-09-05`를 재조회했다. 이 레코드는 시연에서 결과가 실제로 남는 것을 보여주기 위해 유지한다.

`facility-workflow-smoke.ts`는 테스트 전의 이행시기 값을 기억한다. 이후 이행시기 업데이트, `compliance_record` upsert, 비공개 Storage 업로드, `evidence` 메타데이터 저장, `inspection_scope`, `inspection_result`, 총괄 뷰 재조회를 수행한다. 마지막에는 테스트 레코드와 파일을 삭제하고 이행시기를 원복한다.

## 화면 연결 상태

| 화면          | 원격 연결                          | 저장                                             |
| ------------- | ---------------------------------- | ------------------------------------------------ |
| 설정          | ADOMS 법령·조문·규칙·의무          | 사실값 + `target_applicability`                  |
| 적용범위 판정 | 설정 사실값 + 승인규칙 4개         | 결과·근거 조회 전용                              |
| 관리대상 현황 | `v_managed_target_summary`         | 참조 읽기 전용                                   |
| 의무사항      | 시설 매핑 + 전체 의무풀 + workflow | `target_obligation.due_value`                    |
| 의무이행      | 시설별 실제 `obl_id`               | `compliance_record`, private Storage, `evidence` |
| 이행점검      | 같은 대상·의무·기간                | `inspection_scope`, `inspection_result`          |
| 점검 총괄표   | `v_facility_workflow`              | 점검 우선, 이행상태 보조 집계                    |
| 이행현황      | 레거시 시연 집계                   | 아직 localStorage 중심                           |

페이지마다 반복되던 공통 고정 LNB는 제거했다. 홈은 본문 내부 220px 로컬 의무 분류 패널을 사용하고, 증빙처럼 의무 단계 선택이 필요한 화면만 페이지 전용 로컬 탐색을 유지한다. 관리대상·의무 체크리스트·실적증빙·점검·총괄표는 `selectedTargetId`를 공유한다.

## 홈 의무 상세와 기능 IA

현재 검수용 GNB는 `홈 → 관리대상 → 의무 체크리스트 → 의무이행 → 내 업무 → 설정` 순서다. `내 업무`는 현재 기존 이행현황 대시보드로 연결하며, `이행점검`은 GNB에서 숨기고 기존 라우트는 후속 업무 흐름 검수용으로 유지한다. 상단의 중복 DB 상태 배지는 제거하고 역할 전환·초기화만 유지했다. DB 상태는 홈·의무 체크리스트·설정의 데이터 원천 영역에서 행정 블루 톤으로 표시한다. 메뉴명과 중처법 프로시저는 다음 검수 단계에서 다시 확정한다.

설정 화면으로 대상 프로필 사실값을 이동했다. 브라우저에서 120명·39,872㎡·기준일 2026-09-05를 저장한 뒤, 원격 `target_applicability`의 `RUL-000840`, `RUL-000841`, `RUL-000900`, `RUL-000901` 네 행에서 같은 입력 스냅숏과 기록시각을 재조회했다. 기본 `/`는 홈이며 적용범위 판정의 정식 경로는 `/settings/applicability`다. 적용범위 화면에서는 L1/L2/L3 시각화와 사실값 입력 영역을 제거하고 `조건 충족`, `추가 확인`, `원천 검수 필요`를 같은 규격의 가로 카드로 표시하며 선택 의무의 근거·판정 경로는 하단 전체 폭에서 확인한다.

홈의 중대산업재해 선택 시 14개 항목을 LNB 아래로 다시 펼치지 않는다. 대신 오른쪽 목록의 각 의무 아래에 `article_title`과 `detail_ko`를 원문 그대로 분리한 최대 3개 세부 점검사항을 번호·들여쓰기로 표시한다. 의무 행을 선택하면 `v_facility_workflow`에서 같은 `obl_id`의 점검 상태 우선, 이행 상태 보조 정책으로 O/△/X/- 건수와 이행률을 집계한다.

현재 원격 DB에는 용인시 공식 조직 계층이 구축되어 `기획조정실`, `안전정책관 / 중대재해예방팀`, `재난대응담당관 / 재난대응팀`, `교통정책국 / 도시철도과 / 경전철관리팀`, `상수도사업소 / 수도시설과 / 수도시설팀`을 실제 경로로 조회할 수 있다. 다만 대상·의무의 담당 조직 배정 데이터는 아직 없다. 상세 화면은 숫자를 임의 생성하지 않고 조직 셀을 `미배정`으로 표시한다. 대표 브라우저 검증 `OBL-0000003`은 연결 관리대상 2개, 상태 `NA` 2건, 이행률 0.0%로 조회됐으며 콘솔 오류는 없었다.

## 용인시 공식 조직도

용인시 공식 조직도 3개 화면과 공개 부서 상세를 파싱해 `ref_yongin_org_snapshot`, `ref_yongin_org_unit`, `v_yongin_org_tree`에 적재했다. 활성 조직은 총 792건이며 구조 단위 202건과 공개 `…팀장` 직위에서 파생한 팀 590건으로 구성된다. 시청 2실·13국·66과, 직속기관 4기관·9과, 사업소 5개·14과, 3개 구청·38과·39읍면동 구조 수량은 공식 표기와 일치한다.

팀 합계는 공식 조직도 헤더와 공개 담당자 목록의 스냅숏 범위가 달라 분리 보존한다. 개인 이름은 적재하지 않았고 `부팀장`을 `부팀`으로 오인하던 파싱 규칙을 제거한 후 원격 `부팀` 활성 행 0건을 확인했다. 상세 기준과 재현 절차는 `docs/YONGIN_ORG_IMPORT.md`에 기록했다.

## 법령 원문 팝업

의무이행 표의 법령 참조 필드는 `ref_obligation.doc_id/unit_path/article_no`와 `ref_legal_document.document_title/norm_form`에서 조회한다. 화면에는 내부 경로 `a13/p1` 대신 `제13조 제1항`을, 구분에는 `법률/시행령/시행규칙`을 표시한다. 고기상수도 31개 의무는 문서 ID·조문 경로·조문 번호가 모두 31/31건 존재한다.

Netlify 빌드는 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`가 없으면 실패하도록 보호했다. 성공한 산출물은 `/build-info.json`과 `/manifest.json`을 생성한다. F12 Network에 Supabase 요청 자체가 없으면 RLS 거부가 아니라 배포 번들 환경변수 누락으로 판정하며, RLS 거부는 Supabase 요청의 401/403 응답으로 구분한다.

`009_legal_source_popup.sql`은 `ref_legal_document`와 `ref_obligation_legal_source`를 추가한다. 용인시청 로컬 의무 `OBL-01`~`OBL-10` 모두 ADOMS 정식 `unit_id`에 연결했다. 의무 마스터가 없던 비상대피훈련 `OBL-07`은 `UNIT-0011597`(재난 및 안전관리 기본법 제35조 제1항)에 직접 연결했고, 관계 법령상 의무이행 `OBL-10`은 시설물안전법 제6조 제1항과 제11조 제1항 두 원문을 순서대로 연결했다.

팝업은 법령명·한글 조문·원문을 표시하고 내부 코드 경로는 숨긴다. 날짜는 **법령 최근 개정일**, **현행법령 시행일**, **해당 조문 효력일**을 분리 표시한다. 앞의 두 값은 2026-09-06 국가법령정보센터 현행법령 조회 스냅숏이며, 원문과 조문 효력일은 ADOMS 사실층 기준이다.

브라우저에서 비상대피훈련 복사 payload 474자를 검사해 의무명, 최근 개정일, 시행일, 본문을 모두 확인했다. 인쇄 버튼은 제어된 `window.print` 스텁에서 1회 호출됐으며, 인쇄 CSS는 앱 외곽과 액션 버튼을 숨기고 팝업 본문만 A4로 출력하도록 구성했다. 다중 조문·복사·인쇄 전환 후 브라우저 콘솔 오류는 없었다.

## 상태 집계 정책

총괄표는 점검결과가 있으면 `inspection_result.status`를 우선한다. 점검결과가 없고 이행기록이 있으면 `compliance_record.status`를 사용한다. 두 값이 모두 없으면 `해당없음(-)`으로 표시한다. 이행률 분모에서는 `해당없음`을 제외한다.

## 남은 범위

전체 의무풀, 시설별 매핑, 공식 조직 계층은 원격 DB에 구축됐다. 남은 주요 갭은 대시보드의 업무 DB 집계, 대상·의무별 담당 조직 매핑, 직원 인사 마스터, 도급 계약원장 상세, 결재·반려·잠금, 메시지·조치지시 이력이다. 경전철과 도급 2건은 실제 원천을 받을 때까지 `DEMO_VIRTUAL` 표시를 유지한다.

## References

[1]: https://github.com/simulacre-8/Yongin/blob/main/docs/YONGIN_CORE_DATA_VERIFICATION.md "Yongin core data verification report"
[2]: https://github.com/simulacre-8/Yongin/blob/main/scripts/facility-workflow-smoke.ts "Facility workflow smoke test"
[3]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/007_facility_workflow_bridge.sql "Facility workflow bridge migration"
[4]: https://github.com/simulacre-8/Yongin/blob/main/docs/LEGAL_SOURCE_POPUP.md "Legal source popup data basis"
