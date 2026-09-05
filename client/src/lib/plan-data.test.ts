import { describe, expect, it } from "vitest";
import { calculateProgress, initialPlanItems } from "./plan-data";

describe("Tuesday delivery plan data", () => {
  it("contains every scheduled row with stable unique IDs", () => {
    expect(initialPlanItems).toHaveLength(49);
    expect(new Set(initialPlanItems.map(item => item.id)).size).toBe(49);
    expect(new Set(initialPlanItems.map(item => item.dayId))).toEqual(
      new Set(["sat", "sun", "mon", "tue"])
    );
  });

  it("keeps progress and status values internally consistent", () => {
    for (const item of initialPlanItems) {
      expect(item.progress).toBeGreaterThanOrEqual(0);
      expect(item.progress).toBeLessThanOrEqual(100);
      if (item.status === "done") expect(item.progress).toBe(100);
      if (item.kind === "buffer") expect(item.progress).toBe(0);
    }
  });

  it("calculates a bounded duration-weighted completion rate", () => {
    const summary = calculateProgress(initialPlanItems);
    expect(summary.percent).toBeGreaterThan(0);
    expect(summary.percent).toBeLessThan(100);
    expect(summary.total).toBe(
      initialPlanItems.filter(item => item.kind === "task").length
    );
  });
});
