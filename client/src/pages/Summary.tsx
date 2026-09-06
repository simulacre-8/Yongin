import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Download, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import type { ComplianceStatus } from "@/lib/demo-data";
import {
  loadManagedTargets,
  LOCAL_MANAGED_TARGETS,
  type ManagedTargetRow,
} from "@/lib/facility-api";
import {
  CURRENT_PERIOD,
  loadFacilityWorkflow,
  toKoreanStatus,
  type FacilityWorkflowItem,
} from "@/lib/facility-workflow-api";
import { useDemo } from "@/contexts/DemoContext";

const statusSymbol: Record<ComplianceStatus, string> = {
  이행완료: "O",
  보완필요: "△",
  미이행: "X",
  해당없음: "-",
};
const statusCellStyles: Record<ComplianceStatus, CSSProperties> = {
  이행완료: { backgroundColor: "#dff6f1", color: "#087a69" },
  보완필요: { backgroundColor: "#fff1ba", color: "#75560a" },
  미이행: { backgroundColor: "#ffe0cc", color: "#873b18" },
  해당없음: { backgroundColor: "#fff", color: "#59636a" },
};
const headerCellStyle: CSSProperties = {
  padding: "11px 8px",
  border: "1px solid #bdc3c8",
  backgroundColor: "#f1f3f6",
  color: "#20272c",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.45,
  textAlign: "center",
  verticalAlign: "middle",
};
const bodyCellStyle: CSSProperties = {
  padding: "11px 10px",
  border: "1px solid #c6cbd0",
  color: "#20272c",
  fontSize: 13,
  lineHeight: 1.4,
  textAlign: "center",
  verticalAlign: "middle",
};

function resultStatus(item: FacilityWorkflowItem): ComplianceStatus {
  return toKoreanStatus(item.inspectionStatus || item.complianceStatus || "NA");
}

function downloadCsv(target: ManagedTargetRow, items: FacilityWorkflowItem[]) {
  const rows = [
    [
      "관리대상",
      "의무ID",
      "의무명",
      "관계법령",
      "상태",
      "점검내용",
      "점검시각",
    ],
    ...items.map(item => [
      target.name,
      item.obligationId,
      item.title,
      item.lawName,
      resultStatus(item),
      item.inspectionNote || "",
      item.inspectedAt || "",
    ]),
  ];
  const csv = rows
    .map(row =>
      row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `용인시_${target.name}_${CURRENT_PERIOD}_점검총괄.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Summary() {
  const { selectedTargetId, setSelectedTargetId } = useDemo();
  const [targets, setTargets] = useState<ManagedTargetRow[]>(
    LOCAL_MANAGED_TARGETS
  );
  const [items, setItems] = useState<FacilityWorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadManagedTargets().then(async result => {
      if (!active) return;
      const available = result.rows.filter(item => item.obligationCount > 0);
      setTargets(available);
      let targetRef = selectedTargetId;
      let workflow = await loadFacilityWorkflow(targetRef);
      if (!workflow.items.length) {
        const preferred =
          available.find(item => item.name === "고기상수도") || available[0];
        if (preferred) {
          targetRef = preferred.id;
          setSelectedTargetId(preferred.id);
          workflow = await loadFacilityWorkflow(targetRef);
        }
      }
      if (!active) return;
      setItems(workflow.items);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedTargetId, setSelectedTargetId]);

  const target =
    targets.find(item => item.id === selectedTargetId) || targets[0];
  const statuses = useMemo(() => items.map(resultStatus), [items]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        (["이행완료", "보완필요", "미이행", "해당없음"] as const).map(
          status => [status, statuses.filter(value => value === status).length]
        )
      ) as Record<ComplianceStatus, number>,
    [statuses]
  );
  const applicable = statuses.filter(status => status !== "해당없음").length;
  const completionRate = applicable ? (counts.이행완료 / applicable) * 100 : 0;

  return (
    <main
      className="adoms-summary-page"
      aria-labelledby="adoms-summary-title"
      style={{ maxWidth: 1500, margin: "0 auto", minWidth: 1100 }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            id="adoms-summary-title"
            style={{
              margin: 0,
              color: "#1e2124",
              fontSize: 27,
              letterSpacing: "-0.04em",
            }}
          >
            이행점검(관리대상)
          </h1>
          <p
            style={{
              margin: "7px 0 0",
              color: "#59636a",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            의무이행 점검 총괄표 · {CURRENT_PERIOD}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={target?.id || ""}
            onChange={event => setSelectedTargetId(event.target.value)}
            style={{
              minWidth: 270,
              height: 36,
              border: "1px solid #bfc5cb",
              padding: "0 10px",
            }}
          >
            {targets.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.obligationCount})
              </option>
            ))}
          </select>
          <button type="button" className="secondary-btn" disabled>
            <FileCheck2 size={15} /> 결재하기
          </button>
          <button
            type="button"
            className="secondary-btn"
            disabled={!target || !items.length}
            onClick={() => target && downloadCsv(target, items)}
          >
            <Download size={15} /> 엑셀 다운로드
          </button>
        </div>
      </header>

      <section
        aria-label="의무이행 점검 총괄표"
        style={{
          overflowX: "auto",
          border: "1px solid #bfc6c8",
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: 1120,
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "38%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "8.8%" }} />
            <col style={{ width: "8.8%" }} />
            <col style={{ width: "8.8%" }} />
            <col style={{ width: "8.8%" }} />
            <col style={{ width: "8.8%" }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} style={headerCellStyle}>
                점검사항
              </th>
              <th style={headerCellStyle}>관리대상</th>
              <th rowSpan={2} style={headerCellStyle}>
                전체항목
              </th>
              <th rowSpan={2} style={headerCellStyle}>
                이행완료
                <br />
                (O)
              </th>
              <th rowSpan={2} style={headerCellStyle}>
                보완필요
                <br />
                (△)
              </th>
              <th rowSpan={2} style={headerCellStyle}>
                미이행
                <br />
                (X)
              </th>
              <th rowSpan={2} style={headerCellStyle}>
                해당없음
                <br />
                (-)
              </th>
            </tr>
            <tr>
              <th style={headerCellStyle}>{target?.name || "관리대상"}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={bodyCellStyle}>
                  총괄 데이터를 불러오고 있습니다.
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={bodyCellStyle}>
                  연결된 의무가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const status = resultStatus(item);
                return (
                  <tr key={item.obligationId}>
                    <th
                      scope="row"
                      title={`${item.obligationId} · ${item.lawName} ${item.article}`}
                      style={{
                        ...bodyCellStyle,
                        paddingLeft: 18,
                        fontWeight: 500,
                        textAlign: "left",
                      }}
                    >
                      {index + 1}. {item.title}
                    </th>
                    <td
                      aria-label={`${target?.name} ${status}`}
                      title={`${item.obligationId} · ${status}`}
                      style={{
                        ...bodyCellStyle,
                        ...statusCellStyles[status],
                        fontSize: 17,
                        fontWeight: 600,
                      }}
                    >
                      {statusSymbol[status]}
                    </td>
                    <td style={bodyCellStyle}>1</td>
                    <td style={bodyCellStyle}>
                      {status === "이행완료" ? 1 : "-"}
                    </td>
                    <td style={bodyCellStyle}>
                      {status === "보완필요" ? 1 : "-"}
                    </td>
                    <td style={bodyCellStyle}>
                      {status === "미이행" ? 1 : "-"}
                    </td>
                    <td style={bodyCellStyle}>
                      {status === "해당없음" ? 1 : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: "#e7f1f8" }}>
              <th
                style={{
                  ...bodyCellStyle,
                  color: "#174d73",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                이 행 률
              </th>
              <td
                style={{
                  ...bodyCellStyle,
                  color: "#174d73",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                {completionRate.toFixed(1)}%
              </td>
              <td style={bodyCellStyle}>{items.length}</td>
              <td style={bodyCellStyle}>{counts.이행완료}</td>
              <td style={bodyCellStyle}>{counts.보완필요}</td>
              <td style={bodyCellStyle}>{counts.미이행}</td>
              <td style={bodyCellStyle}>{counts.해당없음}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}
