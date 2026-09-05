export type ApplicabilityFacts = {
  profile: "청사·사무시설" | "상하수도" | "도로·교량";
  targetTrack: "public_facility";
  workerCount: number;
  grossArea: number;
  facilitySafetyAct: boolean;
  factsEffectiveAt: string;
};

export type RuleOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
export type RuleMetric =
  | "targetTrack"
  | "workerCount"
  | "grossArea"
  | "facilitySafetyAct";

export type DemoRule = {
  id: string;
  lawId: string;
  lawName: string;
  unitId: string;
  article: string;
  metric: RuleMetric;
  operator: RuleOperator;
  expected: string | number | boolean;
  inputLabel: string;
  conditionLabel: string;
  sourceQuote: string;
  obligationIds: string[];
  reviewStatus: string;
  sourceVersion: string;
};

export type DemoObligation = {
  id: string;
  title: string;
  detail: string;
  group: string;
  lawName: string;
  article: string;
  reviewStatus: string;
  effectiveFrom: string | null;
  securingLabel: string | null;
};

export type RuleGroupLogic = "all" | "any";

export type ApplicabilityDataset = {
  rules: DemoRule[];
  obligations: DemoObligation[];
  groupLogic: Record<string, RuleGroupLogic>;
  source: "supabase" | "fallback";
  sourceLabel: string;
  sourceVersion: string;
  approvedRuleTotal: number;
};

export type RuleEvaluation = DemoRule & {
  matched: boolean;
  actual: string;
  explanation: string;
};

export const ACTIVE_RULE_IDS = [
  "RUL-000840",
  "RUL-000841",
  "RUL-000900",
  "RUL-000901",
] as const;

export const DEMO_SNAPSHOT = {
  fact: "fact-v2.1",
  decision: "adoms-judg-20260829",
  asOf: "2026-09-05",
  reviewedRules: ACTIVE_RULE_IDS.length,
} as const;

export const BASELINE_FACTS: ApplicabilityFacts = {
  profile: "청사·사무시설",
  targetTrack: "public_facility",
  workerCount: 120,
  grossArea: 39872,
  facilitySafetyAct: true,
  factsEffectiveAt: "2026-09-05",
};

const FALLBACK_OBLIGATIONS: DemoObligation[] = [
  {
    id: "OBL-0000296",
    title: "안전보건관리담당자의 선임 등",
    detail:
      "상시근로자 20명 이상 50명 미만인 사업장의 안전보건관리담당자 선임 여부를 검토합니다.",
    group: "건강관리",
    lawName: "산업안전보건법 시행령",
    article: "제24조제1항",
    reviewStatus: "pending",
    effectiveFrom: "2024-07-01",
    securingLabel: "안전보건관리체계의 구축 및 이행",
  },
  {
    id: "OBL-0000575",
    title: "경보용 설비 등",
    detail:
      "연면적 400㎡ 이상이거나 상시근로자 50명 이상인 옥내작업장의 경보용 설비 설치 여부를 검토합니다.",
    group: "비상대응",
    lawName: "산업안전보건기준에 관한 규칙",
    article: "제19조",
    reviewStatus: "pending",
    effectiveFrom: "2025-09-01",
    securingLabel: "안전·보건 관계 법령상 의무이행에 필요한 관리상 조치",
  },
];

export const FALLBACK_DATASET: ApplicabilityDataset = {
  rules: [
    {
      id: "RUL-000840",
      lawId: "LAW-0028",
      lawName: "산업안전보건법 시행령",
      unitId: "UNIT-0032906",
      article: "제24조제1항",
      metric: "workerCount",
      operator: "gte",
      expected: 20,
      inputLabel: "상시근로자 수",
      conditionLabel: "상시근로자 수 ≥ 20명",
      sourceQuote:
        "상시근로자 20명 이상 50명 미만인 사업장에 안전보건관리담당자를 1명 이상 선임해야 한다.",
      obligationIds: ["OBL-0000296"],
      reviewStatus: "approved",
      sourceVersion: "adoms-judg-20260829",
    },
    {
      id: "RUL-000841",
      lawId: "LAW-0028",
      lawName: "산업안전보건법 시행령",
      unitId: "UNIT-0032906",
      article: "제24조제1항",
      metric: "workerCount",
      operator: "lt",
      expected: 50,
      inputLabel: "상시근로자 수",
      conditionLabel: "상시근로자 수 < 50명",
      sourceQuote:
        "상시근로자 20명 이상 50명 미만인 사업장에 안전보건관리담당자를 1명 이상 선임해야 한다.",
      obligationIds: ["OBL-0000296"],
      reviewStatus: "approved",
      sourceVersion: "adoms-judg-20260829",
    },
    {
      id: "RUL-000900",
      lawId: "LAW-0028",
      lawName: "산업안전보건기준에 관한 규칙",
      unitId: "UNIT-0035409",
      article: "제19조",
      metric: "grossArea",
      operator: "gte",
      expected: 400,
      inputLabel: "시설 연면적",
      conditionLabel: "시설 연면적 ≥ 400㎡",
      sourceQuote:
        "연면적이 400제곱미터 이상이거나 상시 50명 이상의 근로자가 작업하는 옥내작업장에는 경보용 설비 또는 기구를 설치하여야 한다.",
      obligationIds: ["OBL-0000575"],
      reviewStatus: "approved",
      sourceVersion: "adoms-judg-20260829",
    },
    {
      id: "RUL-000901",
      lawId: "LAW-0028",
      lawName: "산업안전보건기준에 관한 규칙",
      unitId: "UNIT-0035409",
      article: "제19조",
      metric: "workerCount",
      operator: "gte",
      expected: 50,
      inputLabel: "상시근로자 수",
      conditionLabel: "상시근로자 수 ≥ 50명",
      sourceQuote:
        "연면적이 400제곱미터 이상이거나 상시 50명 이상의 근로자가 작업하는 옥내작업장에는 경보용 설비 또는 기구를 설치하여야 한다.",
      obligationIds: ["OBL-0000575"],
      reviewStatus: "approved",
      sourceVersion: "adoms-judg-20260829",
    },
  ],
  obligations: FALLBACK_OBLIGATIONS,
  groupLogic: {
    "OBL-0000296": "all",
    "OBL-0000575": "any",
  },
  source: "fallback",
  sourceLabel: "내장 ADOMS 승인규칙 폴백",
  sourceVersion: "adoms-judg-20260829",
  approvedRuleTotal: 31,
};

function actualValue(rule: DemoRule, facts: ApplicabilityFacts) {
  const value = facts[rule.metric];
  if (rule.metric === "workerCount")
    return `${Number(value).toLocaleString()}명`;
  if (rule.metric === "grossArea") return `${Number(value).toLocaleString()}㎡`;
  if (rule.metric === "facilitySafetyAct") return value ? "예" : "아니오";
  return "공중이용시설";
}

function compare(
  current: string | number | boolean,
  operator: RuleOperator,
  expected: string | number | boolean
) {
  if (operator === "eq") return current === expected;
  if (operator === "neq") return current !== expected;
  const currentNumber = Number(current);
  const expectedNumber = Number(expected);
  if (operator === "gt") return currentNumber > expectedNumber;
  if (operator === "gte") return currentNumber >= expectedNumber;
  if (operator === "lt") return currentNumber < expectedNumber;
  return currentNumber <= expectedNumber;
}

export function evaluateRule(
  rule: DemoRule,
  facts: ApplicabilityFacts
): RuleEvaluation {
  const current = facts[rule.metric];
  const matched = compare(current, rule.operator, rule.expected);
  const actual = actualValue(rule, facts);
  return {
    ...rule,
    matched,
    actual,
    explanation: matched
      ? `${rule.inputLabel} ${actual}이(가) 검수된 ADOMS 조건을 충족합니다.`
      : `${rule.inputLabel} ${actual}이(가) 조건 ${rule.conditionLabel}을 충족하지 않습니다. 법적 비적용 확정이 아니라 검토 보류입니다.`,
  };
}

export function assessApplicability(
  facts: ApplicabilityFacts,
  dataset: ApplicabilityDataset = FALLBACK_DATASET
) {
  const ruleResults = dataset.rules.map(rule => evaluateRule(rule, facts));
  const obligationResults = dataset.obligations.map(obligation => {
    const linkedRules = ruleResults.filter(rule =>
      rule.obligationIds.includes(obligation.id)
    );
    const logic = dataset.groupLogic[obligation.id] ?? "any";
    const matched =
      linkedRules.length > 0 &&
      (logic === "all"
        ? linkedRules.every(rule => rule.matched)
        : linkedRules.some(rule => rule.matched));
    return { ...obligation, logic, matched };
  });
  const matchedObligationIds = obligationResults
    .filter(item => item.matched)
    .map(item => item.id);
  const heldObligationIds = obligationResults
    .filter(item => !item.matched)
    .map(item => item.id);
  const lawCandidates = Array.from(
    new Set(
      obligationResults.filter(item => item.matched).map(item => item.lawName)
    )
  );
  return {
    ruleResults,
    obligationResults,
    matchedObligationIds,
    heldObligationIds,
    lawCandidates,
  };
}
