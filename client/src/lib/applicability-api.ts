import {
  ACTIVE_RULE_IDS,
  BASELINE_FACTS,
  FALLBACK_DATASET,
  type ApplicabilityDataset,
  type ApplicabilityFacts,
  type DemoObligation,
  type DemoRule,
  type RuleEvaluation,
  type RuleMetric,
  type RuleOperator,
} from "@/lib/applicability";
import { supabase } from "@/lib/supabase";

const FACTS_STORAGE_KEY = "yongin-applicability-facts-v1";

const metricMap: Record<string, RuleMetric | undefined> = {
  worker_count: "workerCount",
  gross_area: "grossArea",
};

const operatorSet = new Set<RuleOperator>([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
]);

export function loadStoredFacts(): ApplicabilityFacts {
  try {
    const raw = localStorage.getItem(FACTS_STORAGE_KEY);
    if (!raw) return { ...BASELINE_FACTS };
    const parsed = JSON.parse(raw) as Partial<ApplicabilityFacts>;
    return {
      ...BASELINE_FACTS,
      ...parsed,
      workerCount: Math.max(0, Number(parsed.workerCount) || 0),
      grossArea: Math.max(0, Number(parsed.grossArea) || 0),
    };
  } catch {
    return { ...BASELINE_FACTS };
  }
}

export function storeFacts(facts: ApplicabilityFacts) {
  localStorage.setItem(FACTS_STORAGE_KEY, JSON.stringify(facts));
}

export function resetStoredFacts() {
  localStorage.removeItem(FACTS_STORAGE_KEY);
}

export async function loadApplicabilityDataset(): Promise<ApplicabilityDataset> {
  if (!supabase) return FALLBACK_DATASET;

  const [rulesResult, linksResult, approvedCountResult] = await Promise.all([
    supabase
      .from("ref_rule")
      .select(
        "rul_id,source_unit_id,condition_item,metric_key,operator,threshold_value,threshold_text,threshold_unit,source_quote,review_status,source_version"
      )
      .in("rul_id", [...ACTIVE_RULE_IDS]),
    supabase
      .from("ref_rule_obligation")
      .select("rul_id,obl_id")
      .in("rul_id", [...ACTIVE_RULE_IDS]),
    supabase
      .from("ref_rule")
      .select("rul_id", { count: "exact", head: true })
      .eq("demo_approved", true)
      .eq("source_version", "adoms-judg-20260829"),
  ]);

  if (rulesResult.error || linksResult.error)
    throw rulesResult.error ?? linksResult.error;
  if (!rulesResult.data?.length || !linksResult.data?.length)
    throw new Error("승인된 ADOMS 규칙 또는 의무 연결을 조회하지 못했습니다.");

  const obligationIds = Array.from(
    new Set(linksResult.data.map(row => row.obl_id))
  );
  const sourceUnitIds = Array.from(
    new Set(rulesResult.data.map(row => row.source_unit_id).filter(Boolean))
  ) as string[];

  const obligationsResult = await supabase
    .from("ref_obligation")
    .select(
      "obl_id,anchor_unit_id,title_ko,detail_ko,obligation_group,review_status,source_version,metadata"
    )
    .in("obl_id", obligationIds);
  if (obligationsResult.error || !obligationsResult.data?.length)
    throw (
      obligationsResult.error ?? new Error("ADOMS 의무를 조회하지 못했습니다.")
    );

  const anchorUnitIds = obligationsResult.data
    .map(row => row.anchor_unit_id)
    .filter(Boolean) as string[];
  const unitIds = Array.from(new Set([...sourceUnitIds, ...anchorUnitIds]));
  const unitsResult = await supabase
    .from("ref_unit")
    .select("unit_id,law_id,unit_label,display_text")
    .in("unit_id", unitIds);
  if (unitsResult.error || !unitsResult.data?.length)
    throw (
      unitsResult.error ?? new Error("ADOMS 근거 조문을 조회하지 못했습니다.")
    );

  const lawIds = Array.from(new Set(unitsResult.data.map(row => row.law_id)));
  const lawsResult = await supabase
    .from("ref_law")
    .select("law_id,title_ko")
    .in("law_id", lawIds);
  if (lawsResult.error) throw lawsResult.error;

  const unitById = new Map(unitsResult.data.map(row => [row.unit_id, row]));
  const lawById = new Map(
    (lawsResult.data ?? []).map(row => [row.law_id, row.title_ko])
  );
  const obligationById = new Map(
    obligationsResult.data.map(row => [row.obl_id, row])
  );
  const linksByRule = new Map<string, string[]>();
  for (const link of linksResult.data) {
    const ids = linksByRule.get(link.rul_id) ?? [];
    ids.push(link.obl_id);
    linksByRule.set(link.rul_id, ids);
  }

  const rules: DemoRule[] = rulesResult.data
    .flatMap(row => {
      const metric = metricMap[row.metric_key];
      const operator = operatorSet.has(row.operator as RuleOperator)
        ? (row.operator as RuleOperator)
        : undefined;
      const unit = row.source_unit_id
        ? unitById.get(row.source_unit_id)
        : undefined;
      const linkedObligation = (linksByRule.get(row.rul_id) ?? [])
        .map(id => obligationById.get(id))
        .find(Boolean);
      const metadata = (linkedObligation?.metadata ?? {}) as Record<
        string,
        unknown
      >;
      if (!metric || !operator || row.threshold_value === null || !unit)
        return [];
      const expected = Number(row.threshold_value);
      const thresholdUnit = row.threshold_unit ?? "";
      const symbol: Record<RuleOperator, string> = {
        eq: "=",
        neq: "≠",
        gt: ">",
        gte: "≥",
        lt: "<",
        lte: "≤",
      };
      return [
        {
          id: row.rul_id,
          lawId: unit.law_id,
          lawName:
            (metadata.doc as string | undefined) ??
            lawById.get(unit.law_id) ??
            "관계 법령",
          unitId: unit.unit_id,
          article:
            (metadata.unitLabel as string | undefined) ??
            unit.unit_label ??
            "관련 조문",
          metric,
          operator,
          expected,
          inputLabel:
            metric === "workerCount" ? "상시근로자 수" : "시설 연면적",
          conditionLabel: `${metric === "workerCount" ? "상시근로자 수" : "시설 연면적"} ${symbol[operator]} ${expected.toLocaleString()}${thresholdUnit}`,
          sourceQuote: unit.display_text || row.source_quote,
          obligationIds: linksByRule.get(row.rul_id) ?? [],
          reviewStatus: row.review_status,
          sourceVersion: row.source_version,
        } satisfies DemoRule,
      ];
    })
    .sort(
      (a, b) =>
        ACTIVE_RULE_IDS.indexOf(a.id as (typeof ACTIVE_RULE_IDS)[number]) -
        ACTIVE_RULE_IDS.indexOf(b.id as (typeof ACTIVE_RULE_IDS)[number])
    );

  if (rules.length !== ACTIVE_RULE_IDS.length)
    throw new Error(
      `화면 실행 규칙 ${ACTIVE_RULE_IDS.length}개 중 ${rules.length}개만 조회됐습니다.`
    );

  const obligations = obligationsResult.data.map(row => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const unit = row.anchor_unit_id
      ? unitById.get(row.anchor_unit_id)
      : undefined;
    return {
      id: row.obl_id,
      title: row.title_ko,
      detail: row.detail_ko ?? unit?.display_text ?? "상세 근거 확인 필요",
      group: row.obligation_group,
      lawName:
        (metadata.doc as string | undefined) ??
        (unit ? lawById.get(unit.law_id) : undefined) ??
        "관계 법령",
      article:
        (metadata.unitLabel as string | undefined) ??
        unit?.unit_label ??
        "관련 조문",
      reviewStatus: row.review_status,
      effectiveFrom:
        typeof metadata.effectiveFrom === "string"
          ? metadata.effectiveFrom
          : null,
      securingLabel:
        typeof metadata.securingLabel === "string"
          ? metadata.securingLabel
          : null,
    } satisfies DemoObligation;
  });

  return {
    rules,
    obligations,
    groupLogic: {
      "OBL-0000296": "all",
      "OBL-0000575": "any",
    },
    source: "supabase",
    sourceLabel: "Supabase · ADOMS 지식그래프 투영",
    sourceVersion: rules[0]?.sourceVersion ?? "adoms-judg-20260829",
    approvedRuleTotal: approvedCountResult.count ?? 0,
  };
}

export async function saveApplicabilitySnapshot(
  facts: ApplicabilityFacts,
  rules: RuleEvaluation[]
) {
  storeFacts(facts);
  if (!supabase) return { remote: false, recordedAt: new Date().toISOString() };

  const targetResult = await supabase
    .from("target")
    .select("target_id")
    .eq("is_demo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (targetResult.error || !targetResult.data)
    throw (
      targetResult.error ?? new Error("용인시청 시연 대상을 찾지 못했습니다.")
    );

  const recordedAt = new Date().toISOString();
  const targetId = targetResult.data.target_id;
  const rows = rules.map(rule => ({
    target_id: targetId,
    rul_id: rule.id,
    is_applicable: rule.matched,
    input_snapshot: {
      profile: facts.profile,
      target_track: facts.targetTrack,
      worker_count: facts.workerCount,
      gross_area: facts.grossArea,
      facility_safety_act: facts.facilitySafetyAct,
      facts_effective_at: facts.factsEffectiveAt,
      recorded_at: recordedAt,
    },
    rule_snapshot: {
      operator: rule.operator,
      expected: rule.expected,
      condition_label: rule.conditionLabel,
      source_unit_id: rule.unitId,
      source_quote: rule.sourceQuote,
      review_status: rule.reviewStatus,
    },
    source_version: rule.sourceVersion,
    evaluated_at: recordedAt,
  }));

  const result = await supabase
    .from("target_applicability")
    .upsert(rows, { onConflict: "target_id,rul_id" });
  if (result.error) throw result.error;
  return { remote: true, recordedAt };
}
