import { describe, expect, it } from "vitest";
import { csvDateStamp, serializeCsv } from "@/lib/csv";

describe("shared CSV export", () => {
  it("emits an Excel-compatible Korean CSV with RFC-style quoting", () => {
    const csv = serializeCsv(
      [{ name: '용인,"경전철"', count: 5 }],
      [
        { header: "관리대상", value: row => row.name },
        { header: "의무수", value: row => row.count },
      ]
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"용인,""경전철""","5"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("neutralizes spreadsheet formulas after spaces and control characters", () => {
    const csv = serializeCsv(
      [{ value: '\t =HYPERLINK("https://example.invalid")' }],
      [{ header: "값", value: row => row.value }]
    );

    expect(csv).toContain("'\t =HYPERLINK");
  });

  it("formats deterministic local date stamps", () => {
    expect(csvDateStamp(new Date(2026, 8, 7))).toBe("20260907");
  });
});
