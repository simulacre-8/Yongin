import { describe, expect, it } from "vitest";
import {
  buildLegalSourceMap,
  cycleToSchedule,
  formatLegalArticlePath,
  formatObligationFrequency,
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

  it("keeps legal frequency separate from workflow due dates", () => {
    expect(formatObligationFrequency("연1회")).toBe("연 1회");
    expect(formatObligationFrequency("반기 1회")).toBe("반기 1회");
    expect(formatObligationFrequency("발생시")).toBe("발생 시");
    expect(formatObligationFrequency("", "정기")).toBe("정기");
    expect(formatObligationFrequency("관계법령주기")).toBe("관계 법령에 따름");
    expect(formatObligationFrequency("대통령령")).toBe("하위법령 기준");
    expect(formatObligationFrequency("매년")).toBe("연 1회");
    expect(formatObligationFrequency("미확정")).toBe("확인 필요");
    expect(formatObligationFrequency(null)).not.toBe("2026-09");
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
        law_id: "LAW-KR-WATER",
        law_name: "수도법",
        doc_id: "DOC-WATER",
        unit_path: "a21/p2",
        article_no: "21",
        article_title: "수도시설의 관리",
        anchor_text: "② 일반수도사업자는 급수설비의 상태를 검사할 수 있다.",
        cycle: null,
        evidence_required: true,
        review_status: "approved",
        display_order: 1,
        source_version: "yongin-obligation-pool-20260906",
      },
    ] as Parameters<typeof joinMappedObligations>[1];

    const [item] = joinMappedObligations(mappings, masters);
    expect(item.title).toBe("수도시설의 관리");
    expect(item.lawName).toBe("수도법");
    expect(item.article).toBe("제21조 제2항");
    expect(item.articleTitle).toBe("수도시설의 관리");
    expect(item.sourceText).toContain("급수설비의 상태");
    expect(item.lawId).toBe("LAW-KR-WATER");
    expect(item.frequency).toBe("확인 필요");
    expect(item.evidence).toBe("급수설비 검사");
    expect(item.detail).toBe("관계 법령에 따른 의무이행 · 증빙: 급수설비 검사");
  });

  it("converts internal provision paths and hides their codes", () => {
    expect(formatLegalArticlePath("a9/p1/n3", "9")).toBe("제9조 제1항 제3호");
    expect(formatLegalArticlePath("a9/p1/n3/mga", "9")).toBe(
      "제9조 제1항 제3호 가목"
    );
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
        cycle: "계약 전",
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
        law_id: "LAW-KR-OCCUPATIONAL-SAFETY",
        law_name: "산업안전보건법",
        doc_id: "DOC-OCCUPATIONAL-SAFETY",
        unit_path: "a61",
        article_no: "61",
        article_title: "적격 수급인 선정 의무",
        anchor_text: "사업주는 적격 수급인을 선정하여야 한다.",
        cycle: null,
        evidence_required: true,
        review_status: "approved",
        display_order: 1,
        source_version: "yongin-obligation-pool-20260906",
      },
    ] as Parameters<typeof joinMappedObligations>[1];

    const [item] = joinMappedObligations(mappings, masters);
    expect(item.lawName).toBe("산업안전보건법");
    expect(item.article).toBe("제61조");
    expect(item.frequency).toBe("계약 전");
    expect(item.evidence).toBe("증빙 종류 확인 필요");
  });

  it("joins official amendment and effective dates to ordered ADOMS provisions", () => {
    const rows = [
      {
        obligation_key: "OBL-10",
        source_order: 2,
        source_obl_id: "OBL-0002584",
        source_unit_id: "UNIT-SAFETY-11",
        doc_id: "DOC-SAFETY",
        law_id: "LAW-SAFETY",
        law_name: "시설물안전법",
        document_title: "시설물의 안전 및 유지관리에 관한 특별법",
        unit_path: "a11/p1",
        article_no: "11",
        article_title: "안전점검의 실시",
        source_text: "① 관리주체는 정기적으로 안전점검을 실시하여야 한다.",
        provision_last_amended_at: null,
        effective_from: "2025-12-04",
        source_version: "adoms-fact-20260901+official-law-20260906",
        source_kind: "DEMO_ALIAS",
      },
      {
        obligation_key: "OBL-10",
        source_order: 1,
        source_obl_id: "OBL-0002576",
        source_unit_id: "UNIT-SAFETY-06",
        doc_id: "DOC-SAFETY",
        law_id: "LAW-SAFETY",
        law_name: "시설물안전법",
        document_title: "시설물의 안전 및 유지관리에 관한 특별법",
        unit_path: "a6/p1",
        article_no: "6",
        article_title: "시설물관리계획",
        source_text: "① 관리주체는 시설물관리계획을 수립하여야 한다.",
        provision_last_amended_at: "2024-12-03",
        effective_from: "2025-12-04",
        source_version: "adoms-fact-20260901+official-law-20260906",
        source_kind: "DEMO_ALIAS",
      },
    ] as Parameters<typeof buildLegalSourceMap>[0];
    const documents = [
      {
        doc_id: "DOC-SAFETY",
        document_title: "시설물의 안전 및 유지관리에 관한 특별법",
        promulgated_no: "20810",
        last_amended_at: "2025-03-11",
        effective_from: "2026-08-28",
        amendment_kind: "일부개정",
        official_law_id: "001712",
        official_serial_no: "281234",
        official_detail_url: "https://www.law.go.kr/example",
        source_version: "adoms-fact-20260901+official-law-20260906",
        official_checked_at: "2026-09-06",
      },
    ] as Parameters<typeof buildLegalSourceMap>[1];

    const sources = buildLegalSourceMap(rows, documents).get("OBL-10") || [];
    expect(sources).toHaveLength(2);
    expect(sources.map(source => source.article)).toEqual([
      "제6조 제1항",
      "제11조 제1항",
    ]);
    expect(sources[0].provisionLastAmendedAt).toBe("2024-12-03");
    expect(sources[0].provisionEffectiveFrom).toBe("2025-12-04");
    expect(sources[0].lastAmendedAt).toBe("2025-03-11");
    expect(sources[0].effectiveFrom).toBe("2026-08-28");
    expect(sources[0].officialCheckedAt).toBe("2026-09-06");
  });
});
