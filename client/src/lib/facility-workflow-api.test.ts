import { describe, expect, it } from "vitest";
import {
  dueInputToValue,
  dueValueToInput,
  formatLegalDocumentType,
  toDbStatus,
  toKoreanStatus,
} from "./facility-workflow-api";

describe("facility workflow conversions", () => {
  it("keeps the four status codes stable", () => {
    expect(toDbStatus("이행완료")).toBe("DONE");
    expect(toDbStatus("보완필요")).toBe("SUPP");
    expect(toDbStatus("미이행")).toBe("NONE");
    expect(toDbStatus("해당없음")).toBe("NA");
    expect(toKoreanStatus("DONE")).toBe("이행완료");
    expect(toKoreanStatus("SUPP")).toBe("보완필요");
    expect(toKoreanStatus("NONE")).toBe("미이행");
    expect(toKoreanStatus("NA")).toBe("해당없음");
  });

  it("converts half-year display values without losing the year", () => {
    expect(dueValueToInput("half", "2026-H1")).toBe("상반기");
    expect(dueValueToInput("half", "2026-H2")).toBe("하반기");
    expect(dueInputToValue("half", "상반기")).toBe("2026-H1");
    expect(dueInputToValue("half", "하반기")).toBe("2026-H2");
  });

  it("preserves month values and normalizes event schedules", () => {
    expect(dueValueToInput("month", "2026-11")).toBe("2026-11");
    expect(dueInputToValue("month", "2026-10")).toBe("2026-10");
    expect(dueValueToInput("event", "EVENT")).toBe("발생 시");
    expect(dueInputToValue("event", "발생 시")).toBe("EVENT");
  });

  it("labels legal instruments without exposing internal document codes", () => {
    expect(formatLegalDocumentType("act", "시설물안전법")).toBe("법률");
    expect(formatLegalDocumentType("decree", "시설물안전법 시행령")).toBe(
      "시행령"
    );
    expect(formatLegalDocumentType("rule", "시설물안전법 시행규칙")).toBe(
      "시행규칙"
    );
  });
});
