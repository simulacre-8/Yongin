import { Download, FileCheck2 } from "lucide-react";
import type { CSSProperties } from "react";
import {
  obligations,
  statusSymbol,
  targets,
  type ComplianceStatus,
} from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

const originalInspectionItems = [
  "안전·보건 목표 및 경영방침 설정",
  "안전·보건·총괄·관리 전담 조직 설치",
  "안전보건관계자 배치",
  "유해·위험요인 확인 및 개선 절차 마련(위험성평가)",
  "안전예산 편성·집행",
  "안전보건관계자 업무수행",
  "종사자 의견 청취 및 개선",
  "비상조치계획 수립 및 이행",
  "관계 법령상 의무이행",
  "법정교육 이수",
];

const statusCellStyles: Record<ComplianceStatus, CSSProperties> = {
  이행완료: { backgroundColor: "#f3d8ea", color: "#84256f" },
  보완필요: { backgroundColor: "#ffedaa", color: "#75560a" },
  미이행: { backgroundColor: "#ffd1b4", color: "#873b18" },
  해당없음: { backgroundColor: "#ffffff", color: "#59636a" },
};

const headerCellStyle: CSSProperties = {
  padding: "11px 8px",
  border: "1px solid #bdc3c8",
  backgroundColor: "#f1f3f6",
  color: "#20272c",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.45,
  textAlign: "center",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const bodyCellStyle: CSSProperties = {
  padding: "11px 10px",
  border: "1px solid #c6cbd0",
  color: "#20272c",
  fontSize: "14px",
  lineHeight: 1.4,
  textAlign: "center",
  verticalAlign: "middle",
};

function statusFor(
  statuses: Record<string, Record<string, ComplianceStatus>>,
  targetId: string,
  obligationId: string
): ComplianceStatus {
  return statuses[targetId]?.[obligationId] ?? "해당없음";
}

function rateFor(values: ComplianceStatus[]) {
  const applicableStatuses = values.filter(value => value !== "해당없음");
  const completeCount = applicableStatuses.filter(
    value => value === "이행완료"
  ).length;
  return applicableStatuses.length
    ? (completeCount / applicableStatuses.length) * 100
    : 0;
}

export default function Summary() {
  const { statuses } = useDemo();
  const inspectionTargets = targets.slice(0, 1);

  return (
    <main
      className="adoms-summary-page"
      aria-labelledby="adoms-summary-title"
      style={{ maxWidth: 1500, margin: "0 auto", minWidth: 1100 }}
    >
      <header
        className="adoms-summary-heading"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div className="adoms-summary-heading-copy">
          <h1
            id="adoms-summary-title"
            style={{
              margin: 0,
              color: "#1e2124",
              fontSize: 27,
              letterSpacing: "-0.045em",
            }}
          >
            이행점검(사업장)
          </h1>
          <p
            className="adoms-summary-subtitle"
            style={{
              margin: "7px 0 0",
              color: "#59636a",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            의무이행(사업장) 점검 총괄표
          </p>
        </div>
        <div
          className="adoms-summary-actions"
          style={{ display: "flex", gap: 7 }}
        >
          <button
            className="adoms-summary-action"
            type="button"
            disabled
            aria-disabled="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 36,
              padding: "0 14px",
              border: "1px solid #889198",
              borderRadius: 3,
              background: "#fff",
              color: "#2e363c",
              fontSize: 13,
            }}
          >
            <FileCheck2 size={15} aria-hidden="true" />
            결재하기
          </button>
          <button
            className="adoms-summary-action"
            type="button"
            disabled
            aria-disabled="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 36,
              padding: "0 14px",
              border: "1px solid #889198",
              borderRadius: 3,
              background: "#fff",
              color: "#2e363c",
              fontSize: 13,
            }}
          >
            <Download size={15} aria-hidden="true" />
            엑셀 다운로드
          </button>
        </div>
      </header>

      <section
        className="adoms-summary-table-wrap"
        aria-label="의무이행 사업장 점검 총괄표"
        style={{
          overflowX: "auto",
          border: "1px solid #bfc6c8",
          background: "#fff",
        }}
      >
        <table
          className="adoms-summary-table"
          style={{
            width: "100%",
            minWidth: 1120,
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <caption
            className="adoms-summary-caption"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clipPath: "inset(50%)",
            }}
          >
            의무이행 사업장 점검 총괄표
          </caption>
          <colgroup>
            <col style={{ width: "35%" }} />
            {inspectionTargets.map(target => (
              <col key={target.id} style={{ width: "13%" }} />
            ))}
            <col style={{ width: "10%" }} />
            <col style={{ width: "10.5%" }} />
            <col style={{ width: "10.5%" }} />
            <col style={{ width: "10.5%" }} />
            <col style={{ width: "10.5%" }} />
          </colgroup>
          <thead className="adoms-summary-table-head">
            <tr className="adoms-summary-header-row">
              <th rowSpan={2} scope="col" style={headerCellStyle}>
                점검사항
              </th>
              <th
                colSpan={inspectionTargets.length}
                scope="colgroup"
                style={headerCellStyle}
              >
                사업장
              </th>
              <th rowSpan={2} scope="col" style={headerCellStyle}>
                전체항목
              </th>
              <th rowSpan={2} scope="col" style={headerCellStyle}>
                이행완료
                <br />
                (O)
              </th>
              <th rowSpan={2} scope="col" style={headerCellStyle}>
                보완필요
                <br />
                (△)
              </th>
              <th rowSpan={2} scope="col" style={headerCellStyle}>
                미이행
                <br />
                (X)
              </th>
              <th rowSpan={2} scope="col" style={headerCellStyle}>
                해당없음
                <br />
                (-)
              </th>
            </tr>
            <tr className="adoms-summary-header-row">
              {inspectionTargets.map(target => (
                <th key={target.id} scope="col" style={headerCellStyle}>
                  {target.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="adoms-summary-table-body">
            {obligations.map((item, index) => {
              const rowStatuses = inspectionTargets.map(target =>
                statusFor(statuses, target.id, item.id)
              );
              const count = (status: ComplianceStatus) =>
                rowStatuses.filter(value => value === status).length;

              return (
                <tr className="adoms-summary-data-row" key={item.id}>
                  <th
                    scope="row"
                    style={{
                      ...bodyCellStyle,
                      paddingLeft: 18,
                      fontWeight: 500,
                      textAlign: "left",
                      whiteSpace: "normal",
                    }}
                  >
                    {index + 1}. {originalInspectionItems[index] ?? item.title}
                  </th>
                  {rowStatuses.map((status, targetIndex) => (
                    <td
                      className={`adoms-summary-status adoms-summary-status-${statusSymbol[status]}`}
                      key={inspectionTargets[targetIndex].id}
                      aria-label={`${inspectionTargets[targetIndex].name} ${status}`}
                      title={status}
                      style={{
                        ...bodyCellStyle,
                        ...statusCellStyles[status],
                        fontSize: 17,
                        fontWeight: 500,
                      }}
                    >
                      {statusSymbol[status]}
                    </td>
                  ))}
                  <td style={bodyCellStyle}>{inspectionTargets.length}</td>
                  <td style={bodyCellStyle}>{count("이행완료") || "-"}</td>
                  <td style={bodyCellStyle}>{count("보완필요") || "-"}</td>
                  <td style={bodyCellStyle}>{count("미이행") || "-"}</td>
                  <td style={bodyCellStyle}>{count("해당없음") || "-"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="adoms-summary-table-foot">
            <tr
              className="adoms-summary-rate-row"
              style={{ backgroundColor: "#f3d8ea" }}
            >
              <th
                scope="row"
                style={{
                  ...bodyCellStyle,
                  color: "#64204f",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                이 행 률
              </th>
              {inspectionTargets.map(target => {
                const targetStatuses = obligations.map(item =>
                  statusFor(statuses, target.id, item.id)
                );
                return (
                  <td
                    className="adoms-summary-rate-value"
                    key={target.id}
                    style={{
                      ...bodyCellStyle,
                      color: "#84256f",
                      fontSize: 16,
                      fontWeight: 800,
                    }}
                  >
                    {rateFor(targetStatuses).toFixed(1)}%
                  </td>
                );
              })}
              {["total", "done", "supplement", "missing", "not-applicable"].map(
                key => (
                  <td key={key} aria-hidden="true" style={bodyCellStyle} />
                )
              )}
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}
