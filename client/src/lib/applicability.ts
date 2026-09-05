export type ApplicabilityFacts = {
  profile: "청사·사무시설" | "상하수도" | "도로·교량";
  targetTrack: "public_facility";
  workerCount: number;
  grossArea: number;
  facilitySafetyAct: boolean;
};

export type DemoRule = {
  id: string;
  lawId: string;
  lawName: string;
  unitId: string;
  article: string;
  metric: "targetTrack" | "workerCount" | "grossArea" | "facilitySafetyAct";
  operator: "eq" | "gte";
  expected: string | number | boolean;
  inputLabel: string;
  conditionLabel: string;
  sourceQuote: string;
  obligationIds: string[];
};

export type RuleEvaluation = DemoRule & {
  matched: boolean;
  actual: string;
  explanation: string;
};

export const DEMO_SNAPSHOT = {
  fact: "fact-v2.1",
  decision: "decision-v2.0",
  asOf: "2026-09-05",
  reviewedRules: 4,
} as const;

export const DEMO_RULES: DemoRule[] = [
  {
    id: "RUL-DEMO-01",
    lawId: "LAW-KR-SAPA",
    lawName: "중대재해 처벌 등에 관한 법률",
    unitId: "UNIT-DEMO-SAPA-04",
    article: "제4조",
    metric: "targetTrack",
    operator: "eq",
    expected: "public_facility",
    inputLabel: "관리대상 트랙",
    conditionLabel: "공중이용시설 여부 = 해당",
    sourceQuote:
      "공중이용시설을 운영·관리하는 경우 안전 및 보건 확보의무 적용 후보로 분류합니다.",
    obligationIds: ["OBL-01", "OBL-02", "OBL-07", "OBL-08", "OBL-09"],
  },
  {
    id: "RUL-DEMO-02",
    lawId: "LAW-KR-FMSA",
    lawName: "시설물의 안전 및 유지관리에 관한 특별법",
    unitId: "UNIT-DEMO-FMSA-11",
    article: "제6조·제11조",
    metric: "facilitySafetyAct",
    operator: "eq",
    expected: true,
    inputLabel: "시설물안전법 대상 여부",
    conditionLabel: "시설물안전법 대상 = 예",
    sourceQuote:
      "시설물안전법에 따른 대상 시설은 유지관리계획과 정기 안전점검 의무 후보로 분류합니다.",
    obligationIds: ["OBL-03", "OBL-04", "OBL-05", "OBL-10"],
  },
  {
    id: "RUL-DEMO-03",
    lawId: "LAW-KR-OSHA",
    lawName: "산업안전보건법",
    unitId: "UNIT-DEMO-OSHA-36",
    article: "제36조",
    metric: "workerCount",
    operator: "gte",
    expected: 5,
    inputLabel: "상시근로자 수",
    conditionLabel: "상시근로자 수 ≥ 5명",
    sourceQuote:
      "상시근로자를 사용하는 사업장은 위험성평가를 실시하고 필요한 조치를 이행합니다.",
    obligationIds: ["OBL-06"],
  },
  {
    id: "RUL-DEMO-04",
    lawId: "LAW-KR-FMSA",
    lawName: "시설물의 안전 및 유지관리에 관한 특별법",
    unitId: "UNIT-DEMO-FMSA-06",
    article: "제6조",
    metric: "grossArea",
    operator: "gte",
    expected: 5000,
    inputLabel: "시설 연면적",
    conditionLabel: "시설 연면적 ≥ 5,000㎡",
    sourceQuote:
      "일정 규모 이상의 시설은 안전 및 유지관리계획 수립 후보로 분류합니다.",
    obligationIds: ["OBL-05"],
  },
];

export const BASELINE_FACTS: ApplicabilityFacts = {
  profile: "청사·사무시설",
  targetTrack: "public_facility",
  workerCount: 120,
  grossArea: 39872,
  facilitySafetyAct: true,
};

function actualValue(rule: DemoRule, facts: ApplicabilityFacts) {
  const value = facts[rule.metric];
  if (rule.metric === "workerCount")
    return `${Number(value).toLocaleString()}명`;
  if (rule.metric === "grossArea") return `${Number(value).toLocaleString()}㎡`;
  if (rule.metric === "facilitySafetyAct") return value ? "예" : "아니오";
  return "공중이용시설";
}

export function evaluateRule(
  rule: DemoRule,
  facts: ApplicabilityFacts
): RuleEvaluation {
  const current = facts[rule.metric];
  const matched =
    rule.operator === "eq"
      ? current === rule.expected
      : Number(current) >= Number(rule.expected);
  const actual = actualValue(rule, facts);
  return {
    ...rule,
    matched,
    actual,
    explanation: matched
      ? `${rule.inputLabel} ${actual}이(가) 검수된 시연 조건을 충족합니다.`
      : `${rule.inputLabel} ${actual}이(가) 시연 조건 ${rule.conditionLabel}을 충족하지 않습니다. 법적 비적용 확정이 아니라 검토 보류입니다.`,
  };
}

export function assessApplicability(facts: ApplicabilityFacts) {
  const ruleResults = DEMO_RULES.map(rule => evaluateRule(rule, facts));
  const matchedRuleIds = new Set(
    ruleResults.filter(rule => rule.matched).map(rule => rule.id)
  );
  const allObligationIds = Array.from(
    new Set(DEMO_RULES.flatMap(rule => rule.obligationIds))
  );
  const matchedObligationIds = allObligationIds.filter(obligationId =>
    DEMO_RULES.some(
      rule =>
        rule.obligationIds.includes(obligationId) && matchedRuleIds.has(rule.id)
    )
  );
  const heldObligationIds = allObligationIds.filter(
    obligationId => !matchedObligationIds.includes(obligationId)
  );
  const lawCandidates = Array.from(
    new Set(ruleResults.filter(rule => rule.matched).map(rule => rule.lawName))
  );
  return {
    ruleResults,
    matchedObligationIds,
    heldObligationIds,
    lawCandidates,
  };
}
