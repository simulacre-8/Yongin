# 내 업무 시연 런타임 운영모델

**작성일:** 2026-09-06  
**작성자:** Manus AI

## 결론

`내 업무`는 법령·시설·조직도와 분리된 **초기화 가능한 시연 런타임 계층**이다. 법령·시설·조직도는 기준정보로 유지하고, 배정·수락·상태변경·위임·완료·완료 확인·첨부·이력만 초기화 대상으로 관리한다. Supabase PostgREST에서 브라우저가 직접 접근할 수 있도록 물리 테이블은 `public.demo_work_*`에 두었지만, 설계상 이 테이블 집합을 `demo_runtime` 논리 도메인으로 정의한다.[1]

> `demo_runtime`은 물리 PostgreSQL 스키마명이 아니라 초기화 범위와 보안 경계를 나타내는 논리 계층이다. 운영 전환 시에는 Supabase Auth와 조직 범위 권한을 먼저 적용한 뒤 물리 스키마 분리를 검토한다.

## 데이터 경계

| 계층           | 주요 데이터                                                                 | 초기화 여부 |
| -------------- | --------------------------------------------------------------------------- | ----------- |
| 기준정보       | `ref_obligation`, `ref_managed_target`, `ref_yongin_org_unit`               | 유지        |
| 기존 시설 업무 | `target`, `target_obligation`, `compliance_record`, `evidence`, 점검 데이터 | 유지        |
| 시연 런타임    | `demo_work_item`, 배정이력, 위임요청, 내 업무 첨부 메타데이터               | 초기화      |
| 전용 파일 경로 | `evidence-private/demo/my-work/**`                                          | 초기화      |
| 감사 증거      | `demo_work_reset_log`                                                       | 유지        |

초기화는 먼저 `demo/my-work/**` Storage 객체를 삭제하고 다음으로 DB 초기화 RPC를 실행한다. 두 단계는 하나의 트랜잭션이 아니므로 화면은 순차 실행임을 명시한다. 기존 실적증빙과 `demo/my-work` 바깥의 Storage 객체는 삭제하지 않는다.

## 사건별 시간 모델

업무 상태와 사건 시각을 하나의 `updated_at`으로 해석하지 않는다. 실제 업무 사건 시각과 DB 기록 시각을 별도로 보존한다.

| 사건           | 업무 현재값                                                    | 이력 사건                          | 의미                                             |
| -------------- | -------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------ |
| 최초·수동 배정 | `assigned_at`, `assigned_by_profile_id`                        | `AUTO_ASSIGNED`, `MANUAL_ASSIGNED` | 담당 조직이 정해진 시각과 배정자                 |
| 재배정         | `reassigned_at`                                                | `REASSIGNED`                       | 기존 담당에서 새 담당으로 바뀐 시각              |
| 배정 수락      | `accepted_at`, `accepted_by_profile_id`                        | `ACCEPTED`                         | 담당이 배정을 수락한 시각                        |
| 상태 변경      | `status_changed_at`                                            | `STATUS_CHANGED`                   | 진행 중·보완 필요·해당 없음 등으로 바뀐 시각     |
| 위임 요청      | `delegation_requested_at`                                      | `DELEGATION_REQUESTED`             | 근거파일과 함께 위임을 요청한 시각               |
| 완료           | `completed_at`, `completion_note`                              | `COMPLETED`                        | 담당자가 업무를 완료 처리한 시각                 |
| 완료 확인      | `confirmed_at`, `confirmed_by_profile_id`, `confirmation_note` | `CONFIRMED`                        | 점검자 또는 경영책임자가 완료 결과를 확인한 시각 |
| 모든 이력      | 해당 사건의 `occurred_at`                                      | `created_at`                       | 업무 발생시각과 DB 기록시각의 분리               |

`assigned_at`은 최초 배정 사건을 보존하며 재배정 때 덮어쓰지 않는다. 재배정은 `reassigned_at`과 `REASSIGNED` 이력으로 기록한다. 배정 수락 전에는 실행 상태로 변경할 수 없다. 위임은 수락·진행·보완 필요 상태에서만 요청할 수 있으며 현재 조직과 다른 조직을 선택해야 한다. 완료된 업무는 재배정·위임하거나 실행 상태로 되돌릴 수 없다. RPC 검증과 테이블 trigger가 같은 상태 전이를 이중으로 확인한다.[5] [6]

`completed_at`과 `confirmed_at`은 서로 다른 사건이다. 완료 확인 RPC는 이미 완료된 업무에만 허용하며, 시연 역할 중 `inspector`와 `executive`만 호출할 수 있다. 현재 브라우저 역할은 실제 인증 주체가 아닌 공유 시연 프로필이므로 이 제한은 시연 흐름 검증용이다.

## 자동배정 기준

클린 설치에서는 모든 마이그레이션과 공식 조직·시설 workflow 시드를 먼저 적용한 뒤 `seed_my_work_runtime.sql`을 마지막에 실행한다. 초기화 후 2,891개 대상별 의무를 다시 구성한다. 이 중 2,235건은 승인된 시연 방침에 따른 **시연 내부 소관규칙**으로 자동배정하고, 656건은 조직도에서 수동 선택하도록 남긴다.[7]

| 시연 내부 규칙  | 배정 건수 |
| --------------- | --------: |
| 기흥구 도로     |     1,387 |
| 처인구 도로     |       399 |
| 수지구 건설도로 |       266 |
| 중처법 핵심의무 |       126 |
| 재산관리        |        33 |
| 고기상수도      |        19 |
| 경전철          |         5 |
| **합계**        | **2,235** |

이 규칙은 법적 소관 판정이 아니다. 실제 운영 전환 시 클라이언트 승인 조직–법령–대상 매핑표로 교체해야 한다.

## 화면 흐름

`/dashboard`는 기존 대시보드를 대신해 내 업무 화면을 제공한다. 경영책임자는 전체 조직을 조회할 수 있다. 실·국 점검자는 기본적으로 교통정책국 범위에서 경전철 5건을 조회하며 다른 실·국을 선택할 수 있다. 담당자는 중대재해예방팀 등 핵심 배정부서를 선택해 자신의 범위를 조회한다.

목록에서는 자동·수동 배정, 수락, 업무 시작, 상태 변경, 완료, 완료 확인, 위임요청, 첨부, 이력, 선택 CSV를 처리한다. 미배정 업무는 먼저 공식 조직도에서 담당 조직을 선택해야 상태를 변경할 수 있다. 위임요청은 대상 조직, 근거 메모, 10MB 이하 근거파일을 필수로 요구한다. 일반 첨부도 파일 선택 후 파일명·크기를 보여주는 확인 모달을 거쳐야 Storage와 메타데이터에 저장된다.

CSV는 법률명·한글 조항호목·주기뿐 아니라 배정·수락·위임·재배정·완료·확인·레코드 생성·수정 시각과 첨부파일명을 분리해 출력한다. 셀 값이 `=`, `+`, `-`, `@`로 시작하면 스프레드시트 수식 실행을 방지하도록 작은따옴표를 앞에 붙인다.[2]

## 공유 시연 보안 경계

현재 앱은 로그인 없는 영업 시연을 위해 익명 publishable key와 공유 프로필을 사용한다. 역할 선택은 화면 범위와 시나리오를 전환할 뿐 실제 사용자 인증이나 권한 증명이 아니다. 기존 Storage 정책이 `demo/**` 읽기를 허용하므로 `demo/my-work/**`만 별도의 사용자 권한으로 격리했다고 설명해서는 안 된다.

운영 전환에는 Supabase Auth 사용자–프로필 연결, 조직 범위 RLS, 서버 생성 업로드 의도, 서버 신뢰 사건시각, 파일 세대 경로, 비동기 Storage 정리, 위임 승인·반려 권한이 필요하다. 시연 종료 직후에는 `demo_write_enabled`를 비활성화한다.[3]

## 검증

`pnpm smoke:my-work`는 공개 publishable key로 수동배정, 수락, 진행, 첨부 업로드·다운로드, 완료, 완료 확인자·확인시각, 위임요청, 이력의 `occurred_at`·`created_at` 분리를 검증한다. 검증 종료 시 내 업무 DB와 `demo/my-work/**` 파일을 초기화하고 2,891건 기준상태, 자동 2,235건, 수동 656건, 첨부 0건, 위임 0건을 확인한다. 초기화 중 기존 `evidence` 행 수와 `demo/my-work` 바깥 Storage 목록이 바뀌지 않는 것도 함께 확인한다.[4]

## References

[1]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/012_demo_my_work.sql "My Work demo runtime schema"
[2]: https://github.com/simulacre-8/Yongin/blob/main/client/src/lib/my-work-api.ts "My Work browser API and CSV serializer"
[3]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/014_demo_my_work_confirmation.sql "My Work completion confirmation migration"
[4]: https://github.com/simulacre-8/Yongin/blob/main/scripts/my-work-smoke.ts "My Work end-to-end smoke test"
[5]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/015_harden_demo_my_work_transitions.sql "My Work transition hardening migration"
[6]: https://github.com/simulacre-8/Yongin/blob/main/supabase/migrations/018_guard_demo_work_status_transitions.sql "My Work table-level lifecycle guard"
[7]: https://github.com/simulacre-8/Yongin/blob/main/supabase/seed_my_work_runtime.sql "My Work post-reference runtime seed"
