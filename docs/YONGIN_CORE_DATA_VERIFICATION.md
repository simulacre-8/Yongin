# 용인시 핵심 의무×시설 DB 검증 보고서

**작성일:** 2026-09-06  
**작성자:** Manus AI  
**검증 대상:** 호스팅형 Supabase `gxpfnszbwvfyogwshvas`

## 검증 결론

클라이언트가 제공한 세 CSV를 용인시 서비스의 기본 **의무×시설 데이터베이스**로 구축했다. 시설 원천과 시설별 매핑은 기존 적재와 일치했다. 반면 전체 의무풀은 원격에 310건만 존재했으므로, 이번 검증에서 클라이언트 원천의 논리 레코드 3,688건을 전부 적재했다.

최종 원격 검증 결과 전체 의무풀 3,688건은 모두 고유한 `obl_id`를 가진다. 시설 150건과 시설–의무 매핑 2,906건도 원천 수량과 일치한다. 시설 또는 의무를 찾지 못하는 고아 매핑은 0건이다.

## 원천 파일 식별

| 원천 파일                            | SHA-256                                                            | 물리 줄 | 논리 레코드 |
| ------------------------------------ | ------------------------------------------------------------------ | ------: | ----------: |
| `데모대상_용인시소관_20260906.csv`   | `bf6b4cfc5882905cf43e044c09893e23f823a59859d45d03eb297ed1e52cd353` |     151 |         150 |
| `의무풀_용인시관련법령_20260906.csv` | `f608ee4713e8bb6d681e5f9e40824d770a8b2a3b5e9a143414a01a05d5d9ef25` |   5,057 |       3,688 |
| `의무매핑_시설_용인시_20260906.csv`  | `c75205f3f72379450e010b46d71337bb439fb94020b8d2a05bfe5f9de345675f` |   2,907 |       2,906 |

의무풀의 물리 줄 수와 논리 레코드 수가 다른 이유는 `anchor_text`의 따옴표 안에 줄바꿈이 들어 있기 때문이다. 단순 줄 수가 아니라 표준 CSV 파서의 논리 행을 적재 기준으로 사용했다.

## 원천 무결성

| 검증 항목                       |    결과 |
| ------------------------------- | ------: |
| 시설 레코드                     |     150 |
| 시설 고유 ID                    |     150 |
| 전체 의무 레코드                |   3,688 |
| 전체 의무 고유 ID               |   3,688 |
| 전체 의무의 법령                |      10 |
| 전체 의무의 문서                |     114 |
| 시설–의무 매핑                  |   2,906 |
| 시설–의무 고유 복합키           |   2,906 |
| 매핑된 시설                     | 150/150 |
| 매핑 고유 의무                  |      71 |
| 시설 ID 중복                    |       0 |
| 의무 ID 중복                    |       0 |
| 매핑 복합키 중복                |       0 |
| 매핑 제목·법령명·조문 경로 충돌 |       0 |

## 원격 Supabase 검증

| 리소스                | 최종 결과 | 설명                                             |
| --------------------- | --------: | ------------------------------------------------ |
| 용인 전체 의무풀      |     3,688 | `source_version=yongin-obligation-pool-20260906` |
| `ref_obligation` 전체 |     3,877 | 용인 풀과 기존 승인·시연 데이터를 함께 보존      |
| 클라이언트 FMS 시설   |       150 | `source_kind=FMS`                                |
| 클라이언트 시설 매핑  |     2,906 | `mapping_source=CLIENT_CSV`                      |
| 시연 보완 대상        |         3 | 공중교통수단 1, 도급·용역 2                      |
| 시연 보완 매핑        |        23 | `CLIENT_SCENARIO`                                |
| 참조 대상 합계        |       153 | 150 + 3                                          |
| 참조 매핑 합계        |     2,929 | 2,906 + 23                                       |
| 운영 workflow 대상    |       151 | `l2_result <> 제외`                              |
| `v_facility_workflow` |     2,891 | 같은 대상·의무 키의 폐쇄루프 조회 행             |
| 고아 대상 매핑        |         0 | 모든 `target_ref` 존재                           |
| 고아 의무 매핑        |         0 | 모든 `obl_id` 존재                               |

## 업무 폐쇄루프 확인

대표 대상 `고기상수도`는 `target_ref=FMS:WS2013-0000051`로 저장됐다. 첫 의무 `OBL-0002590 긴급안전점검의 실시`는 `target_obligation_id=9892e985-8d46-490c-a817-e92d8d498ec9`로 연결된다. 브라우저에서 실적을 저장한 후 `compliance_record`와 `v_facility_workflow`에서 같은 식별자, 기간 `2026-H2`, 상태 `NONE`, 조치일 `2026-09-05`를 재조회했다.

자동 스모크 테스트는 이행시기 변경, 이행기록 저장, 비공개 Storage 업로드, 증빙 메타데이터 저장, 점검범위·점검결과 저장, 총괄 뷰 재조회까지 수행한다. 테스트 종료 시 생성한 임시 레코드와 `demo/smoke/` 파일을 삭제한다. 원격 Storage 조회 결과 `demo/smoke/` 잔존 파일은 0건이었다.

## 재현성과 운영 경계

`008_yongin_obligation_pool.sql`은 `law_id`, `doc_id`, `unit_path`, 조문 번호·제목, 의무 성격, 원문 인용을 1급 열로 승격한다. `seed_yongin_obligation_pool.sql`은 전체 3,688건을 idempotent upsert한다. 시설 매핑 시드와 업무 투영 시드를 재실행해도 사용자가 저장한 이행시기·실적·증빙·점검은 덮어쓰지 않는다.

경전철 및 두 도급·용역 대상은 실제 원천이 아니므로 `DEMO_VIRTUAL` 표시를 유지한다. 실제 운영주체와 계약원장을 받으면 해당 세 레코드만 교체해야 한다.

## References

[1]: https://github.com/simulacre-8/Yongin/blob/main/scripts/build-yongin-core-data.py "Yongin core data validation and seed generator"
[2]: https://github.com/simulacre-8/Yongin/blob/main/supabase/seed_yongin_obligation_pool.sql "Generated Yongin obligation pool seed"
[3]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/008_yongin_obligation_pool.sql "Yongin obligation pool schema migration"
[4]: https://github.com/simulacre-8/Yongin/blob/main/scripts/facility-workflow-smoke.ts "Facility workflow remote smoke test"
