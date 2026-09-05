import { describe, expect, it } from "vitest";
import {
  cycleToSchedule,
  joinMappedObligations,
} from "./facility-obligation-api";

describe("facility obligation adapter", () => {
  it("maps half-year cycles to the original schedule control", () => {
    expect(cycleToSchedule("반기 1회")).toEqual({
      scheduleType: "half",
      defaultDue: "하반기",
    });
    expect(cycleToSchedule("매년")).toEqual({
      scheduleType: "month",
      defaultDue: "2026-09",
    });
  });

  it("joins the facility mapping with the obligation master without repeated detail", () => {
    const mappings = [
      {
        obl_id: "OBL-TEST-001",
        law_name: "수도법",
        unit_path: "a21/p2",
        layer: "③개별관계법령",
        cycle: null,
        evidence: "급수설비 검사",
        map_basis: null,
        map_reason: "관계 법령에 따른 의무이행",
        map_confidence: "high",
        l2_result: "해당",
        mapping_source: "CLIENT_CSV",
        is_demo_virtual: false,
      },
    ] as Parameters<typeof joinMappedObligations>[0];
    const masters = [
      {
        obl_id: "OBL-TEST-001",
        title_ko: "수도시설의 관리",
        detail_ko: " 관계  법령에 따른 의무이행 ",
        obligation_group: "③개별관계법령",
        cycle: null,
        evidence_required: true,
        review_status: "approved",
        display_order: 1,
      },
    ] as Parameters<typeof joinMappedObligations>[1];

    const [item] = joinMappedObligations(mappings, masters);
    expect(item.title).toBe("수도시설의 관리");
    expect(item.lawName).toBe("수도법");
    expect(item.article).toBe("a21/p2");
    expect(item.detail).toBe("관계 법령에 따른 의무이행 · 증빙: 급수설비 검사");
  });
});
