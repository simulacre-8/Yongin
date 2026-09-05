# 법령 원문 팝업 데이터 기준

**기준일:** 2026-09-06

관리대상 상세의 법령 원문은 클라이언트가 제공한 `_데모_용인시_20260905.zip`의 ADOMS 사실층 `unit_20260901_v2.1.csv`를 정본으로 사용한다. `unit_id`, `doc_id`, `law_id`, `unit_path`, `display_text`, `effective_from`을 보존하며, 용인시청 로컬 의무 `OBL-01`~`OBL-10`은 `ref_obligation_legal_source`에서 정식 ADOMS 의무 또는 조문 단위에 별칭으로 연결한다.

ADOMS `doc_20260901_v2.1.csv`는 `last_amended_at`이 모두 비어 있으므로, 문서 수준의 최근 개정일은 법제처 국가법령정보센터 **현행법령(시행일) 목록 조회 API** 결과 중 정확한 법령명 일치 행의 `공포일자`를 사용한다. 시행일은 조문 단위 ADOMS `effective_from`을 우선하며, 문서 수준 보조값은 API `시행일자`를 사용한다.

> 이 화면의 날짜는 2026-09-06에 생성한 기준일 스냅숏이다. 런타임에서 법제처 API를 호출하지 않으며, 법적 확정 또는 최신성 보증을 의미하지 않는다. 기준일 이후 개정은 시드를 다시 생성해 반영한다.

공식 API 가이드:

- [국가법령정보 공동활용 OPEN API 활용방법](https://open.law.go.kr/LSO/openApi/openApiManual.do)
- [현행법령(시행일) 목록 조회 API](https://open.law.go.kr/LSO/openApi/guideResult.do?htmlName=lsEfYdListGuide)

시드 재생성:

```bash
python3 scripts/build-legal-source-popup-seed.py
```

검증 보고서는 `docs/LEGAL_SOURCE_POPUP_DATA_REPORT.json`에 생성된다. 현재 결과는 정식 의무 89건, 용인시청 로컬 의무 별칭 10건(원문 연결 11행), 문서 13건, 법제처 정확 일치 13건이다.
