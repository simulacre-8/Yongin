import { describe, expect, it } from "vitest";
import {
  buildMyWorkStoragePath,
  formatMyWorkFileSelection,
  isAsciiStoragePath,
  MY_WORK_FILE_ACCEPT,
  validateMyWorkFile,
} from "./my-work-files";

const file = (name: string, size = 1024) => ({ name, size });

describe("My Work attachment policy", () => {
  it("keeps Korean names out of the Storage key while preserving the extension", () => {
    const originalName = "인하대_과학영재센터_과제b_3A이민후_20260214.pdf";
    const path = buildMyWorkStoragePath(
      "e98e2668-5a3b-4f87-ade3-63bcdcd60b9a",
      file(originalName),
      "c32ebeb9-957f-479c-9300-ac24dd3f6d9a"
    );

    expect(path).toBe(
      "demo/my-work/e98e2668-5a3b-4f87-ade3-63bcdcd60b9a/c32ebeb9-957f-479c-9300-ac24dd3f6d9a.pdf"
    );
    expect(path).not.toContain("이민후");
    expect(isAsciiStoragePath(path)).toBe(true);
    expect(formatMyWorkFileSelection(file(originalName))).toContain(
      originalName
    );
  });

  it("accepts only the documented demo formats case-insensitively", () => {
    for (const name of [
      "문서.HWP",
      "기록.txt",
      "사진.png",
      "사진.JPEG",
      "보고서.doc",
      "보고서.docx",
      "결과.pdf",
    ]) {
      expect(() => validateMyWorkFile(file(name))).not.toThrow();
    }

    expect(MY_WORK_FILE_ACCEPT).toBe(
      ".hwp,.txt,.png,.jpg,.jpeg,.doc,.docx,.pdf"
    );
    expect(() => validateMyWorkFile(file("실행.exe"))).toThrow("허용 파일형식");
    expect(() => validateMyWorkFile(file("압축.zip"))).toThrow("허용 파일형식");
  });

  it("rejects empty and over-10MB files", () => {
    expect(() => validateMyWorkFile(file("빈파일.txt", 0))).toThrow(
      "10MB 이하"
    );
    expect(() =>
      validateMyWorkFile(file("대용량.pdf", 10 * 1024 * 1024 + 1))
    ).toThrow("10MB 이하");
  });
});
