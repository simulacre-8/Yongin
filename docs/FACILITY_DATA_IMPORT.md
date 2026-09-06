# 용인시 의무×시설 핵심 데이터 구축

**원천일:** 2026-09-06  
**대상:** 호스팅형 Supabase 프로젝트 `gxpfnszbwvfyogwshvas`

## 결론

용인시 서비스의 기준 데이터는 클라이언트가 제공한 세 CSV를 하나의 집합으로 관리한다. **시설 150건**, **전체 의무풀 3,688건**, **시설–의무 매핑 2,906건**이 정본이다. 의무풀 파일은 인용문 안에 줄바꿈이 있어 물리적으로 5,056개 데이터 줄이지만, 표준 CSV 방식으로 파싱하면 헤더를 제외한 논리 레코드는 3,688건이다.

시연 시나리오에 필요한 용인경전철 1건과 도급·용역 2건은 원천 CSV에 없는 별도 레코드다. 이 세 대상과 매핑 23건은 `DEMO_VIRTUAL`로 명확히 구분한다. 따라서 원격 참조 계층의 최종 수량은 대상 153건과 매핑 2,929건이다.

## 원천 파일과 역할

| 파일                                 | 논리 행 | 기본키             | 역할                                                      |
| ------------------------------------ | ------: | ------------------ | --------------------------------------------------------- |
| `데모대상_용인시소관_20260906.csv`   |     150 | `facilNo`          | 용인시가 실질적으로 보유·운영·관리하는 FMS 시설 마스터    |
| `의무풀_용인시관련법령_20260906.csv` |   3,688 | `obl_id`           | 용인시에 적용 가능한 중대재해처벌법 및 관계법령 의무 전체 |
| `의무매핑_시설_용인시_20260906.csv`  |   2,906 | `facilNo + obl_id` | 시설마다 적용되는 의무의 다대다 연결                      |

세 파일의 검증 결과 시설 ID, 의무 ID, 시설–의무 복합키 중복은 모두 0건이다. 매핑에 등장하는 시설 150개는 시설 마스터와 완전히 일치한다. 매핑이 참조하는 고유 의무 71개는 전체 의무풀에 모두 존재하며 제목, 법령명, 조문 경로도 일치한다.

## Supabase 투영

| 원천 개념          | Supabase 리소스                 | 저장 원칙                                                     |
| ------------------ | ------------------------------- | ------------------------------------------------------------- |
| 전체 의무풀        | `ref_obligation`                | `obl_id`, `law_id`, `doc_id`, `unit_path`, 조문·인용문을 보존 |
| 시설 마스터        | `ref_managed_target`            | `FMS:{facilNo}`를 `target_ref`로 사용                         |
| 시설–의무 매핑     | `ref_managed_target_obligation` | `target_ref + obl_id`를 복합키로 사용                         |
| 업무 대상          | `target`                        | 참조 대상 중 `l2_result <> '제외'`인 151건을 운영 투영        |
| 대상별 업무 의무   | `target_obligation`             | 같은 `obl_id`로 이행시기·실적·점검을 연결                     |
| 폐쇄루프 읽기 모델 | `v_facility_workflow`           | `target_ref + obl_id + period_key`로 화면을 통합              |

전체 의무풀의 법령·문서·조문 식별자는 향후 그래프 DB 투영에 그대로 사용할 수 있다. 현재 시연에서는 별도 GraphDB 또는 외부 Graph API가 필요하지 않다.

## 경전철과 도급 데이터

용인경전철은 FMS 시설물이 아니다. 도시철도법상 궤도에 의한 **공중교통수단**으로 분류한다. 현재 원천 CSV에는 경전철 및 실제 계약원장이 없으므로 다음 레코드는 시연 전용이다.

| 대상                              | 분류           | 출처           | 교체 조건                   |
| --------------------------------- | -------------- | -------------- | --------------------------- |
| 용인경전철(에버라인)              | 공중교통수단   | `DEMO_VIRTUAL` | 운영주체·관리부서 정본 수신 |
| OO로 확·포장 공사                 | 도급·용역·위탁 | `DEMO_VIRTUAL` | 실제 계약원장 수신          |
| 용인경전철 차량기지 시설관리 용역 | 도급·용역·위탁 | `DEMO_VIRTUAL` | 실제 계약원장 수신          |

## 재현 절차

Windows 원천 경로는 `C:\Yongin_test\data\source\`로 고정한다. 세 CSV를 이 폴더에 둔 후 다음 명령으로 SQL을 다시 생성한다.

```bash
python3 scripts/build-yongin-core-data.py
python3 scripts/build-facility-seed.py
python3 /home/ubuntu/skills/compliance-demo-factory/scripts/validate_sql.py .
```

호스팅형 Supabase에는 다음 순서로 적용한다.

1. `supabase/migrations/001_demo_schema.sql`
2. `supabase/migrations/002_security_and_index_hardening.sql`
3. `supabase/migrations/004_remove_project_plan_progress.sql`
4. `supabase/migrations/005_yongin_cityhall_only.sql`
5. `supabase/migrations/006_facility_catalog.sql`
6. `supabase/migrations/007_facility_workflow_bridge.sql`
7. `supabase/migrations/008_yongin_obligation_pool.sql`
8. `supabase/migrations/009_legal_source_popup.sql`
9. `supabase/migrations/010_yongin_org_catalog.sql`
10. `supabase/migrations/011_yongin_org_tree_view.sql`
11. `supabase/migrations/012_demo_my_work.sql`
12. `supabase/migrations/013_fix_demo_my_work_reset.sql`
13. `supabase/migrations/014_demo_my_work_confirmation.sql`
14. `supabase/migrations/015_harden_demo_my_work_transitions.sql`
15. `supabase/migrations/016_index_demo_my_work_foreign_keys.sql`
16. `supabase/migrations/017_harden_demo_work_delegation.sql`
17. `supabase/migrations/018_guard_demo_work_status_transitions.sql`
18. `supabase/migrations/019_compliance_export_log.sql`
19. `supabase/migrations/020_compliance_action_events.sql`
20. `supabase/migrations/021_harden_compliance_action_logging.sql`
21. `supabase/seed.sql`
22. `supabase/seed_adoms.sql`
23. `supabase/seed_facility_catalog.sql`
24. `supabase/seed_yongin_obligation_pool.sql`
25. `supabase/seed_facility_workflow.sql`
26. `supabase/seed_legal_source_popup.sql`
27. `supabase/seed_yongin_org.sql`
28. `supabase/seed_my_work_runtime.sql`
29. `supabase/seed_compliance_action_runtime.sql`

모든 시드는 `on conflict` 기반으로 재실행할 수 있다. 시설 업무 시드는 사용자가 바꾼 이행시기·실적·증빙·점검 결과를 덮어쓰지 않는다. 시설 시드도 `client_provided` 전체 의무풀을 축소 매핑 데이터로 되돌리지 않는다.

## References

[1]: https://github.com/simulacre-8/Yongin/blob/main/scripts/build-yongin-core-data.py "Yongin core data validation and seed generator"
[2]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/008_yongin_obligation_pool.sql "Yongin obligation pool schema migration"
[3]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/007_facility_workflow_bridge.sql "Facility workflow bridge migration"
