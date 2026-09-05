import { describe, expect, it } from "vitest";
import {
  assessApplicability,
  BASELINE_FACTS,
  DEMO_RULES,
  evaluateRule,
} from "./applicability";

describe("applicability demo rules", () => {
  it("matches all ten demo obligations for the city-hall baseline", () => {
    const result = assessApplicability(BASELINE_FACTS);
    expect(result.matchedObligationIds).toHaveLength(10);
    expect(result.heldObligationIds).toHaveLength(0);
    expect(result.lawCandidates).toHaveLength(3);
  });

  it("changes the result at reviewed worker and area boundaries", () => {
    const workerRule = DEMO_RULES.find(rule => rule.id === "RUL-DEMO-03")!;
    const areaRule = DEMO_RULES.find(rule => rule.id === "RUL-DEMO-04")!;
    expect(
      evaluateRule(workerRule, { ...BASELINE_FACTS, workerCount: 4 }).matched
    ).toBe(false);
    expect(
      evaluateRule(workerRule, { ...BASELINE_FACTS, workerCount: 5 }).matched
    ).toBe(true);
    expect(
      evaluateRule(areaRule, { ...BASELINE_FACTS, grossArea: 4999 }).matched
    ).toBe(false);
    expect(
      evaluateRule(areaRule, { ...BASELINE_FACTS, grossArea: 5000 }).matched
    ).toBe(true);
  });

  it("does not duplicate an obligation reached by two reviewed rules", () => {
    const result = assessApplicability(BASELINE_FACTS);
    expect(
      result.matchedObligationIds.filter(id => id === "OBL-05")
    ).toHaveLength(1);
  });
});
