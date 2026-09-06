import { describe, expect, it } from "vitest";
import {
  getMyWorkPriorityLabel,
  getMyWorkStatusLabel,
  serializeMyWorkCsv,
  type MyWorkItem,
} from "./my-work-api";

const sample: MyWorkItem = {
  workItemId: "00000000-0000-0000-0000-000000000001",
  targetObligationId: "10000000-0000-0000-0000-000000000001",
  targetId: "20000000-0000-0000-0000-000000000001",
  targetRef: "FMS:B001",
  targetName: "=SUM(1,2)",
  targetCategory: "공중이용시설",
  obligationId: "OBL-0000001",
  obligationTitle: '점검, 기록 "보존"',
  lawName: "시설물안전법",
  articlePath: "제6조 제1항",
  cycle: "반기",
  evidenceRequirement: "점검보고서",
  dueAt: "2026-12-31",
  priorityCode: "HIGH",
  statusCode: "COMPLETED",
  assignmentMode: "MANUAL",
  assignmentRuleName: "",
  assignedOrgKey: "YONGIN:DEPARTMENT:sample",
  assignedOrgName: "수도시설과",
  assignedOrgPath: "용인특례시 / 상수도사업소 / 수도시설과",
  assigneeDisplayName: "김담당",
  assignedByName: "경영책임자",
  assignedAt: "2026-09-06T14:00:00.000Z",
  acceptedByName: "담당자",
  acceptedAt: "2026-09-06T14:05:00.000Z",
  statusChangedAt: "2026-09-06T14:10:00.000Z",
  delegationRequestedAt: "2026-09-06T14:07:00.000Z",
  reassignedAt: "2026-09-06T14:08:00.000Z",
  completedAt: "2026-09-06T14:10:00.000Z",
  confirmedByName: "실·국 점검자",
  confirmedAt: "2026-09-06T14:12:00.000Z",
  confirmationNote: "완료 증빙 확인",
  createdAt: "2026-09-06T13:50:00.000Z",
  updatedAt: "2026-09-06T14:10:01.000Z",
  attachmentCount: 2,
  attachmentNames: "점검.pdf, 사진.jpg",
};

describe("my work labels", () => {
  it("keeps the independent work status vocabulary stable", () => {
    expect(getMyWorkStatusLabel("UNASSIGNED")).toBe("미배정");
    expect(getMyWorkStatusLabel("ACCEPTED")).toBe("배정 수락");
    expect(getMyWorkStatusLabel("SUPPLEMENT_REQUIRED")).toBe("보완 필요");
    expect(getMyWorkStatusLabel("DELEGATION_REQUESTED")).toBe("위임 요청");
    expect(getMyWorkStatusLabel("COMPLETED")).toBe("완료");
    expect(getMyWorkPriorityLabel("HIGH")).toBe("우선");
  });
});

describe("my work CSV", () => {
  it("emits Excel-compatible BOM, complete audit columns and RFC-style quoting", () => {
    const csv = serializeMyWorkCsv([sample]);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain('"배정발생시각"');
    expect(csv).toContain('"배정수락시각"');
    expect(csv).toContain('"위임신청시각"');
    expect(csv).toContain('"재배정발생시각"');
    expect(csv).toContain('"완료시각"');
    expect(csv).toContain('"확인자"');
    expect(csv).toContain('"확인시각"');
    expect(csv).toContain('"확인메모"');
    expect(csv).toContain('"레코드생성시각"');
    expect(csv).toContain('"레코드수정시각"');
    expect(csv).toContain('"첨부파일명"');
    expect(csv).toContain('"점검, 기록 ""보존"""');
    expect(csv).toContain('"점검.pdf, 사진.jpg"');
    expect(csv).toContain("\r\n");
  });

  it("neutralizes spreadsheet formulas without dropping the source text", () => {
    const csv = serializeMyWorkCsv([
      sample,
      { ...sample, workItemId: "2", targetName: " \t=1+1" },
      { ...sample, workItemId: "3", targetName: "\u0001@SUM(1,2)" },
    ]);
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"\' \t=1+1"');
    expect(csv).toContain('"\'\u0001@SUM(1,2)"');
    expect(csv).not.toContain('\r\n"=SUM(1,2)"');
  });
});
