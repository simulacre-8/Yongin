# ADOMS 시드 적용 안내 — `simulacre-8/Yongin`

**대상 레포** https://github.com/simulacre-8/Yongin
**만든 파일** `seed_adoms.sql` (0.4 MB)
**전제** `supabase/migrations/001_demo_schema.sql` 이 이미 적용돼 있을 것

---

## 0. 무엇이 달라지나

지금 `seed.sql` 은 손으로 만든 **의무 10건 · 법령 7건**입니다.
이 시드는 그 자리에 **ADOMS 지식그래프에서 뽑은 실제 데이터**를 넣습니다.

| 테이블 | 지금 | 이 시드 |
|---|---:|---:|
| `ref_law` | 7 | **104** |
| `ref_unit` | 5 | **304** |
| `ref_obligation` | 10 | **216** |
| `ref_rule` | 4 | **128** |
| `ref_rule_obligation` | 10 | **128** |

**스키마는 하나도 안 바꿉니다.** `001_demo_schema.sql` 의 제약(CHECK·NOT NULL·FK)을 그대로 지킵니다.

> **2026-09-06 적용 검증:** 위 숫자는 시드가 추가하는 행 수입니다. 기존 데모 행과 함께 원격 누적 건수는 법령 111·조문 309·의무 226·규칙 132·연결 138건입니다. 문서 초안에는 승인 규칙 35건으로 적혀 있었으나, 실제 SQL의 `demo_approved=true` 행은 **31건**이므로 화면과 운영 기준은 31건을 사용합니다.

```bash
# Supabase Dashboard > SQL Editor 에 붙여넣거나
psql "$SUPABASE_DB_URL" -f supabase/seed_adoms.sql
```

`on conflict do update` 로 되어 있어 **여러 번 돌려도 안전**합니다.
기존 `seed.sql` 의 `*-DEMO-*` 행과 ID 가 겹치지 않아 **함께 두어도 됩니다.**

---

## 1. ID 를 그대로 씁니다

`001_demo_schema.sql` 에 이렇게 적혀 있습니다.

> `-- Read-only legal projection. Preserve source ontology IDs for later graph migration.`

그 의도대로 **ADOMS 그래프 ID 를 그대로** 넣었습니다.

```
OBL-0000037   의무      → 그래프 duty:Obligation
UNIT-0004747  조문      → 그래프 norm:LawUnit
RUL-000840    적용규칙   → 그래프 appl:ApplicabilityRule
```

나중에 그래프로 돌아갈 때 **조인이 그냥 됩니다.**

```sparql
PREFIX id:<https://adoms.kr/id/>
PREFIX norm:<https://adoms.kr/ont/norm#>
SELECT ?원문 WHERE { id:UNIT-0004747 norm:unitText ?원문 }
```

`LAW-0001` 만 새로 발번했습니다 — 그래프의 법령 ID 가 내부 시리얼이라 그대로 쓰면
읽기 어렵고, `metadata.title` 에 원래 이름을 넣어 두었습니다.

---

## 2. ★ `ref_rule` 에 넣지 않은 것이 있습니다

이게 가장 중요합니다.

우리 데이터의 「적용조건」 후보 893건에는 **두 가지가 섞여 있었습니다.**

```
상시근로자 20명 이상인 사업장        ← 이 의무가 걸리는 조건  ✅ 넣음
높이 3미터 이상 장소에서 물체를 투하   ← 이행하는 방법        ❌ 뺌
내민 길이는 벽면으로부터 2미터 이상    ← 기술 시방            ❌ 뺌
```

**뒤의 것을 `ref_rule` 에 넣으면 매칭이 엉뚱해집니다.** 「높이 3미터」가
적용 조건으로 읽혀 시설을 잘못 걸러냅니다. 그래서 **원문 표현으로 등급을 매겨**
적용 조건인 것만 넣었습니다.

| 등급 | 건수 | `link_confidence` | `demo_approved` |
|---|---:|---|---|
| 적용조건 | 31 | `high` | `true` |
| 적용조건후보 | 93 | `medium` | `false` |
| **이행기준** | 10 | **넣지 않음** | — |
| **불명** | 43 | **넣지 않음** | — |

> **등급은 휴리스틱입니다.** 정본 DB 의 `condition_kind` 가 전부 미분류라
> 원문 표현으로 가늠했습니다. `ref_rule.metadata.grade` 에 근거를 남겼습니다.
> 확정 판정이 아니므로 화면에 등급을 노출하는 편이 안전합니다.

---

## 3. `link_basis = 'same_unit'`

기존 `seed.sql` 이 이미 `same_unit` 과 `manual_review` 를 구분하고 계셨습니다.
그 뜻 그대로 씁니다.

```
manual_review   사람이 확인해 이었다  (기존 10건)
same_unit       규칙과 의무가 같은 앵커 조문을 공유한다  (이 시드 128건)
```

**정본 DB 에 의무↔규칙 직접 연결이 아직 없어** 조문을 경유해 이었습니다.
`manual_review` 보다 약한 근거이며, `link_evidence` 에 어느 조문을 공유했는지 적어 두었습니다.

정본에 직접 연결이 들어오면 `link_basis='direct'` 로 다시 뽑아 드리겠습니다.

---

## 4. `metric_key` 대응

기존 시드의 어휘(`worker_count` · `gross_area` · `target_track`)를 잇습니다.

| 단위 | `metric_key` |
|---|---|
| 명·인 + 원문에 「상시근로자」 | `worker_count` |
| 명·인 (그 외) | `person_count` |
| 제곱미터·㎡ | `gross_area` |
| 톤 | `substance_tonnage` |
| 개·개소 | `unit_count` |
| 년·개월·일·시간 | `period` |
| 그 밖 | `other` |

`operator` 는 CHECK 제약에 맞춰 한국어를 변환했습니다 —
이상 `gte` · 초과 `gt` · 미만 `lt` · 이하 `lte`.

---

## 5. `metadata` 에 담긴 것

`ref_obligation.metadata` 에 화면에서 쓸 만한 것을 넣어 두었습니다.

```json
{
  "securing": "제4호",
  "securingLabel": "안전·보건 관계 법령에 따른 의무이행에 필요한 관리상의 조치",
  "sector": "부문 무관",
  "law": "산업안전보건법",
  "doc": "산업안전보건법 시행령",
  "form": "대통령령",
  "effectiveFrom": "2026-01-01",
  "unitLabel": "시행령 제24조제1항"
}
```

**`securing` 이 중처법 제4조제1항 어느 호를 채우는가입니다** — ADOMS 의 세로줄이고
의무 전건에 붙어 있습니다. 「이 점검을 왜 하는가」에 답할 때 씁니다.

---

## 6. 화면에서 조심할 것

| | |
|---|---|
| **`review_status`** | `approved` 는 사람이 확인한 것입니다. 그 외는 **기계 판정**입니다 |
| **검수율 6.7%** | 「법적 확정」으로 표시하지 마십시오. 「참고용 초안」이 맞습니다 |
| **`metadata.effectiveFrom`** | 미래 날짜면 **아직 효력이 없습니다.** 미이행으로 지적하면 안 됩니다 |
| **`demo_approved=false`** | 보여주되 **자동 판정 근거로 쓰지 마십시오** |
| **수범주체 필터** | `metadata.sector` 로 「지방자치단체」만 거르면 안 됩니다 — 용인시 의무는 「부문 무관」에 있습니다 |

마지막 항목이 특히 중요합니다. 중처법 제2조제9호나목이 **지자체장을 경영책임자에 포함**하며,
그 의무는 조문에 「지방자치단체는」이 아니라 **「사업주는」·「관리주체는」**으로 쓰여 있습니다.

---

## 7. 검증한 것

- **조문 원문 304건을 원본과 글자 단위 대조 — 불일치 0**
  (개행이 든 원문은 `E'...'` 문자열로 이스케이프해 한 글자도 바뀌지 않았습니다)
- `operator` · `link_confidence` CHECK 제약 통과
- FK 참조 무결성 — 시드 안에서 자기완결적
- 트랜잭션으로 감싸 부분 적용 없음

---

## 8. 다시 뽑기

정본이나 그래프가 갱신되면 다시 만들면 됩니다.

```bash
cd "C:\1.업무\7.ADOMS 구현\온톨로지\ADOMS_Ontology_v1\script"
python export_supabase_seed.py          # 데모 관련분 216건 (권장)
python export_supabase_seed.py --all    # 의무 전건 16,910
```

`--all` 은 파일이 훨씬 커집니다. 데모에는 필요 없습니다.
