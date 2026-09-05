import { describe, expect, it } from "vitest";
import {
  assessApplicability,
  BASELINE_FACTS,
  FALLBACK_DATASET,
} from "./applicability";

describe("ADOMS applicability rules", () => {
  it("uses the 400㎡ OR 50-worker rule for the city-hall baseline", () => {
    const result = assessApplicability(BASELINE_FACTS, FALLBACK_DATASET);
    expect(result.matchedObligationIds).toEqual(["OBL-0000575"]);
    expect(result.heldObligationIds).toEqual(["OBL-0000296"]);
    expect(result.lawCandidates).toEqual(["산업안전보건기준에 관한 규칙"]);
  });

  it("requires both 20 or more and fewer than 50 workers", () => {
    const result = assessApplicability(
      { ...BASELINE_FACTS, workerCount: 30, grossArea: 399 },
      FALLBACK_DATASET
    );
    expect(result.matchedObligationIds).toEqual(["OBL-0000296"]);
    expect(result.heldObligationIds).toEqual(["OBL-0000575"]);
  });

  it("moves the appointment obligation to review at the 50-worker boundary", () => {
    const result = assessApplicability(
      { ...BASELINE_FACTS, workerCount: 50, grossArea: 399 },
      FALLBACK_DATASET
    );
    expect(result.heldObligationIds).toContain("OBL-0000296");
    expect(result.matchedObligationIds).toContain("OBL-0000575");
  });

  it("matches the alarm obligation when either area or workers reach a boundary", () => {
    const byArea = assessApplicability(
      { ...BASELINE_FACTS, workerCount: 0, grossArea: 400 },
      FALLBACK_DATASET
    );
    const byWorkers = assessApplicability(
      { ...BASELINE_FACTS, workerCount: 50, grossArea: 0 },
      FALLBACK_DATASET
    );
    expect(byArea.matchedObligationIds).toContain("OBL-0000575");
    expect(byWorkers.matchedObligationIds).toContain("OBL-0000575");
  });

  it("does not duplicate an obligation reached by multiple rules", () => {
    const result = assessApplicability(BASELINE_FACTS, FALLBACK_DATASET);
    expect(
      result.matchedObligationIds.filter(id => id === "OBL-0000575")
    ).toHaveLength(1);
  });
});
