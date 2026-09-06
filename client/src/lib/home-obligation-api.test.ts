import { describe, expect, it } from "vitest";
import {
  buildChecklistSubitems,
  CITIZEN_FACILITY_OBLIGATION_IDS,
  CITIZEN_PRODUCT_OBLIGATION_IDS,
  classifyHomeCategory,
  summarizeWorkflowStatuses,
} from "@/lib/home-obligation-api";

describe("home obligation taxonomy", () => {
  it("keeps the approved citizen-safety split at 13 facility/transport and 9 product duties", () => {
    expect(CITIZEN_FACILITY_OBLIGATION_IDS).toHaveLength(13);
    expect(CITIZEN_PRODUCT_OBLIGATION_IDS).toHaveLength(9);

    const allIds = [
      ...CITIZEN_FACILITY_OBLIGATION_IDS,
      ...CITIZEN_PRODUCT_OBLIGATION_IDS,
    ];
    expect(new Set(allIds).size).toBe(22);
  });

  it("classifies direct SAPA recurrence, corrective order and related-law duties", () => {
    expect(
      classifyHomeCategory({
        law_name: "중대재해처벌법",
        obligation_group: "MG11",
        title_ko: "재발방지대책",
      })
    ).toBe("recurrence");
    expect(
      classifyHomeCategory({
        law_name: "중대재해처벌법",
        obligation_group: "MG05",
        title_ko: "개선·시정 명령 이행",
      })
    ).toBe("corrective-order");
    expect(
      classifyHomeCategory({
        law_name: "중대재해처벌법",
        obligation_group: "MG99",
        title_ko: "관계법령 의무이행",
      })
    ).toBe("related-law");
  });

  it("places other direct SAPA duties in the safety-management-system category", () => {
    expect(
      classifyHomeCategory({
        law_name: "중대재해처벌법",
        obligation_group: "MG01",
        title_ko: "목표·경영방침 설정",
      })
    ).toBe("safety-system");
  });

  it("places every non-SAPA duty in related-law management", () => {
    expect(
      classifyHomeCategory({
        law_name: "산업안전보건법",
        obligation_group: "MG04",
        title_ko: "안전점검",
      })
    ).toBe("related-law");
  });

  it("turns legal detail text into numbered checklist subitems without inventing text", () => {
    expect(
      buildChecklistSubitems({
        title: "유해·위험요인 확인·개선",
        articleTitle: "안전보건관리체계의 구축 및 이행 조치",
        detail:
          "3. 사업장의 유해ㆍ위험요인을 확인할 것 가. 확인 결과를 기록할 것 나. 필요한 조치를 할 것",
      })
    ).toEqual([
      "안전보건관리체계의 구축 및 이행 조치",
      "사업장의 유해ㆍ위험요인을 확인할 것",
      "확인 결과를 기록할 것",
      "필요한 조치를 할 것",
    ]);
  });

  it("computes completion rate from stored statuses and excludes NA", () => {
    expect(
      summarizeWorkflowStatuses([
        {
          target_ref: "A",
          compliance_status: "DONE",
          inspection_status: null,
        },
        {
          target_ref: "B",
          compliance_status: "SUPP",
          inspection_status: "DONE",
        },
        {
          target_ref: "C",
          compliance_status: null,
          inspection_status: "NONE",
        },
        {
          target_ref: "D",
          compliance_status: null,
          inspection_status: null,
        },
      ])
    ).toEqual({
      total: 4,
      done: 2,
      supplement: 0,
      incomplete: 1,
      notApplicable: 1,
      completionRate: (2 / 3) * 100,
    });
  });
});
