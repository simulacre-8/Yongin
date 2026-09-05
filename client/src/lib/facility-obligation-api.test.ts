import { describe, expect, it } from "vitest";
import {
  cycleToSchedule,
  formatLegalArticlePath,
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
        law_name: "수도법",
        unit_path: "a21/p2",
        article_no: "21",
        cycle: null,
        evidence_required: true,
        review_status: "approved",
        display_order: 1,
      },
    ] as Parameters<typeof joinMappedObligations>[1];

    const [item] = joinMappedObligations(mappings, masters);
    expect(item.title).toBe("수도시설의 관리");
    expect(item.lawName).toBe("수도법");
    expect(item.article).toBe("제21조 제2항");
    expect(item.detail).toBe("관계 법령에 따른 의무이행 · 증빙: 급수설비 검사");
  });

  it("converts internal provision paths and hides their codes", () => {
    expect(formatLegalArticlePath("a9/p1/n3", "9")).toBe("제9조 제1항 제3호");
    expect(formatLegalArticlePath("a6g2/p1", "6")).toBe("제6조의2 제1항");
    expect(formatLegalArticlePath("시나리오 명시", "61")).toBe("제61조");
  });

  it("uses the obligation master provision for scenario mappings", () => {
    const mappings = [
      {
        obl_id: "OBL-SCENARIO-001",
        law_name: "산업안전보건법",
        unit_path: "시나리오 명시",
        layer: "도급·용역·위탁",
        cycle: null,
        evidence: null,
        map_basis: "클라이언트 시연 시나리오 v1",
        map_reason: "시연 흐름",
        map_confidence: "demo",
        l2_result: "해당",
        mapping_source: "CLIENT_SCENARIO",
        is_demo_virtual: true,
      },
    ] as Parameters<typeof joinMappedObligations>[0];
    const masters = [
      {
        obl_id: "OBL-SCENARIO-001",
        title_ko: "적격 수급인 선정 의무",
        detail_ko: null,
        obligation_group: "도급·용역·위탁",
        law_name: "산업안전보건법",
        unit_path: "a61",
        article_no: "61",
        cycle: null,
        evidence_required: true,
        review_status: "approved",
        display_order: 1,
      },
    ] as Parameters<typeof joinMappedObligations>[1];

    const [item] = joinMappedObligations(mappings, masters);
    expect(item.lawName).toBe("산업안전보건법");
    expect(item.article).toBe("제61조");
  });
});
