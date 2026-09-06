import { describe, expect, it } from "vitest";
import {
  CITIZEN_FACILITY_OBLIGATION_IDS,
  CITIZEN_PRODUCT_OBLIGATION_IDS,
  classifyHomeCategory,
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
});
