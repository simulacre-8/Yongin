# ADOMS UI 분석 자산

이 디렉터리는 `ADOMS_데모작업 명세.zip`의 102개 화면을 용인시 영업 시연과 후속 업종 데모에서 반복 활용하기 위한 **파생 참조자료**를 보관한다. 원본 이미지와 명세는 `_adoms_demo_spec/`을 기준으로 하며, 파생 문서가 이미지와 충돌하면 이미지를 우선 확인한다.

## 사용 순서

1. `ADOMS_SCREEN_CATALOG.csv`에서 필요한 `SCR-###`와 리네이밍된 이미지 파일명을 찾는다.
2. `ADOMS_102_SCREEN_FLOW_MAP.md`에서 업무 전후 관계, 역할, 같은 화면의 상태 관계와 재사용 패턴을 확인한다.
3. 용인시 시연을 구성할 때 `ADOMS_DEMO_SCENARIO_CROSSWALK.md`로 시나리오 장면과 원본 화면을 연결한다.
4. `ADOMS_UI_GAP_CONFIRMATION_REGISTER.md`에서 **신규 제작 또는 발주처 확인이 필요한 항목을 먼저 컨펌**받는다.
5. 해당 SCR의 PNG와 연결된 명세 파일을 직접 확인한 뒤 구현한다.

## 파일의 역할

| 파일 | 역할 |
|---|---|
| `ADOMS_SCREEN_CATALOG.csv` | 사람이 필터링하기 쉬운 102개 화면 인덱스 |
| `ADOMS_SCREEN_CATALOG.json` | 자동화·코드 생성용 화면 메타데이터와 SHA-256 |
| `ADOMS_102_SCREEN_FLOW_MAP.md` | 번호순 카탈로그와 실제 업무순 플로우 |
| `ADOMS_DEMO_SCENARIO_CROSSWALK.md` | 용인시 시연 장면 ↔ 원본 화면 매핑 |
| `ADOMS_UI_GAP_CONFIRMATION_REGISTER.md` | 화면 부재·충돌·신규 제작 컨펌 목록 |
| `AREA_01.md`~`AREA_08.md` | 기능군별 상세 판독 기록 |
| `VISUAL_SPOT_CHECK.md` | SCR-027·089 원본 이미지 육안 표본 검증 |
| `build_screen_catalog.py` | 리네이밍 또는 ZIP 갱신 시 카탈로그 재생성 도구 |
| `validate_flow_assets.py` | 102개 SCR·8개 영역·32개 시연 STEP 커버리지 검증 |

## 재생성

```bash
python3 _adoms_ui_analysis/build_screen_catalog.py \
  --root _adoms_demo_spec \
  --out _adoms_ui_analysis

python3 _adoms_ui_analysis/validate_flow_assets.py
```

생성기는 다음을 실패 조건으로 검사한다.

- `SCR-001`부터 `SCR-102`까지 연속된 정확히 102개 화면
- 화면별 서로 다른 PNG 102개
- 이미지 크기·비율·SHA-256 기록
- 번호 기준 이전·다음 화면 연결
- `(계속)` 및 같은 기능의 다중 컷을 독립 페이지가 아닌 상태/연속 화면 후보로 분류

## 구현 원칙

- 파일 번호는 **화면 노출 순서의 근거**이지만, 모든 번호를 별도 라우트로 만들지는 않는다.
- 같은 기능의 스크롤 연속, 모달, 상세, 편집 상태는 한 라우트의 상태로 우선 재사용한다.
- 서울시 원본의 화면명·라벨·표 컬럼·버튼 위치·정보 밀도를 먼저 복제하고 용인시 브랜드는 토큰 수준에서만 적용한다.
- Supabase·ADOMS 판정·저장 기능은 원본 업무 화면 안에 연결하며 독립 제품처럼 최상위에 노출하지 않는다.
- 원본 화면이 없는 기능은 임의로 제작하지 않는다. 가능한 기존 패턴과 신규 제작 범위를 구분해 발주처 컨펌을 먼저 받는다.
- 적용범위 판정의 기본값은 **용인시청**이다. 관리대상 메뉴에는 승인된 FMS 시설 150건을 노출하며, 경전철은 시설물이 아닌 공중교통수단으로, 실제 계약원장 미수신 도급 2건은 시연값으로 구분한다.
