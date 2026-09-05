import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/contexts/DemoContext";
import type { ComplianceStatus } from "@/lib/demo-data";
import {
  loadManagedTargets,
  LOCAL_MANAGED_TARGETS,
  type ManagedTargetRow,
} from "@/lib/facility-api";
import {
  loadEvidenceMetadata,
  loadFacilityWorkflow,
  saveInspectionResult,
  toKoreanStatus,
  type EvidenceMetadata,
  type FacilityWorkflowItem,
} from "@/lib/facility-workflow-api";

type InspectionStage = "scope" | "review";

const statusOptions: ComplianceStatus[] = [
  "이행완료",
  "보완필요",
  "미이행",
  "해당없음",
];

const pageStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto",
  color: "#30383d",
};
const headingStyle: CSSProperties = {
  margin: "0 0 5px",
  fontSize: 28,
  fontWeight: 750,
  letterSpacing: "-0.04em",
};
const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "#687078",
  fontSize: 14,
};

function SelectionButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 20,
        height: 20,
        flex: "0 0 20px",
        display: "grid",
        placeItems: "center",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "#84256f" : "#c4c8ce",
        borderRadius: "50%",
        background: selected ? "#a93193" : "#fff",
        color: "#fff",
        padding: 0,
      }}
    >
      {selected ? "✓" : ""}
    </button>
  );
}

export default function Inspection() {
  const {
    selectedTargetId: selectedTargetRef,
    setSelectedTargetId: setSelectedTargetRef,
  } = useDemo();
  const [stage, setStage] = useState<InspectionStage>("scope");
  const [targets, setTargets] = useState<ManagedTargetRow[]>(
    LOCAL_MANAGED_TARGETS
  );
  const [workflowItems, setWorkflowItems] = useState<FacilityWorkflowItem[]>(
    []
  );
  const [selectedObligationIds, setSelectedObligationIds] = useState<string[]>(
    []
  );
  const [openId, setOpenId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, ComplianceStatus>
  >({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [evidenceByCompliance, setEvidenceByCompliance] = useState<
    Record<string, EvidenceMetadata[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let active = true;
    loadManagedTargets().then(result => {
      if (!active) return;
      const available = result.rows.filter(item => item.obligationCount > 0);
      setTargets(available);
      const preferred =
        available.find(
          item =>
            item.id === selectedTargetRef && item.sourceKind !== "LOCAL_DEMO"
        ) ||
        available.find(item => item.name === "고기상수도") ||
        available[0];
      if (preferred) setSelectedTargetRef(preferred.id);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTargetRef) return;
    let active = true;
    setLoading(true);
    loadFacilityWorkflow(selectedTargetRef).then(result => {
      if (!active) return;
      setWorkflowItems(result.items);
      setSelectedObligationIds(result.items.map(item => item.obligationId));
      setOpenId(result.items[0]?.obligationId || "");
      setStatusDrafts(
        Object.fromEntries(
          result.items.map(item => [
            item.obligationId,
            toKoreanStatus(
              item.inspectionStatus || item.complianceStatus || "NA"
            ),
          ])
        )
      );
      setNoteDrafts(
        Object.fromEntries(
          result.items.map(item => [
            item.obligationId,
            item.inspectionNote || "",
          ])
        )
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedTargetRef]);

  useEffect(() => {
    const complianceIds = workflowItems
      .map(item => item.complianceId)
      .filter((id): id is string => Boolean(id));
    if (!complianceIds.length) {
      setEvidenceByCompliance({});
      return;
    }
    let active = true;
    Promise.all(
      complianceIds.map(
        async id => [id, await loadEvidenceMetadata(id)] as const
      )
    ).then(entries => {
      if (active) setEvidenceByCompliance(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [workflowItems]);

  const selectedTarget =
    targets.find(item => item.id === selectedTargetRef) || targets[0];
  const visibleTargets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return targets.filter(item => {
      const categoryMatch = category === "전체" || item.category === category;
      const queryMatch =
        !normalized ||
        `${item.name} ${item.department} ${item.address}`
          .toLowerCase()
          .includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, query, targets]);
  const selectedItems = workflowItems.filter(item =>
    selectedObligationIds.includes(item.obligationId)
  );

  const toggleObligation = (obligationId: string) => {
    setSelectedObligationIds(current =>
      current.includes(obligationId)
        ? current.filter(id => id !== obligationId)
        : [...current, obligationId]
    );
  };

  const saveInspection = async (item: FacilityWorkflowItem) => {
    setSavingId(item.obligationId);
    try {
      const result = await saveInspectionResult(
        item,
        statusDrafts[item.obligationId] || "해당없음",
        noteDrafts[item.obligationId] || ""
      );
      setWorkflowItems(current =>
        current.map(currentItem =>
          currentItem.obligationId === item.obligationId
            ? {
                ...currentItem,
                inspectionResultId: result.inspection_result_id,
                inspectionStatus: result.status,
                inspectionNote: result.inspection_note || "",
                inspectedAt: result.inspected_at,
              }
            : currentItem
        )
      );
      toast.success(`${item.title} 점검 결과가 저장되었습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "점검 저장 실패");
    } finally {
      setSavingId("");
    }
  };

  const renderScope = () => (
    <>
      <header style={{ marginBottom: 25 }}>
        <h1 style={headingStyle}>이행점검(관리대상)</h1>
        <p style={subtitleStyle}>취합 대상 설정</p>
      </header>

      <section
        aria-label="관리대상 검색"
        style={{
          display: "flex",
          alignItems: "end",
          gap: 10,
          padding: 17,
          marginBottom: 17,
          border: "1px solid #d8dfe3",
          borderRadius: 10,
          background: "#f5f6f8",
        }}
      >
        <label style={{ display: "grid", gap: 6, minWidth: 170 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>관리대상 분류</span>
          <select
            value={category}
            onChange={event => setCategory(event.target.value)}
            style={{
              height: 38,
              border: "1px solid #c7d0d6",
              padding: "0 10px",
            }}
          >
            {["전체", "시설물", "공중교통수단", "도급·용역·위탁"].map(value => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, flex: "1 1 330px" }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>대상명</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="시설·교통수단·도급 대상을 검색하세요"
            style={{
              height: 36,
              border: "1px solid #c7d0d6",
              padding: "0 10px",
            }}
          />
        </label>
        <button type="button" className="secondary-btn">
          <Search size={15} /> 검색
        </button>
      </section>

      <section
        aria-label="취합 대상 및 점검 항목"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, .9fr) minmax(0, 1.1fr)",
          gap: 18,
        }}
      >
        <div
          style={{
            border: "1px solid #cfd4da",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              minHeight: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              background: "#eceef2",
            }}
          >
            <strong style={{ fontSize: 14 }}>관리대상</strong>
            <span style={{ fontSize: 12 }}>{visibleTargets.length}건</span>
          </div>
          <div
            style={{ maxHeight: 450, overflowY: "auto", background: "#fff" }}
          >
            {visibleTargets.map(item => {
              const selected = item.id === selectedTargetRef;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTargetRef(item.id)}
                  style={{
                    width: "100%",
                    minHeight: 60,
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "8px 16px",
                    border: 0,
                    borderBottom: "1px solid #e1e4e8",
                    background: selected ? "#fbf0f8" : "#fff",
                    textAlign: "left",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      flex: "0 0 20px",
                      display: "grid",
                      placeItems: "center",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: selected ? "#84256f" : "#c4c8ce",
                      borderRadius: "50%",
                      background: selected ? "#a93193" : "#fff",
                      color: "#fff",
                    }}
                  >
                    {selected ? "✓" : ""}
                  </span>
                  <span style={{ display: "grid", gap: 3 }}>
                    <strong style={{ fontSize: 13 }}>{item.name}</strong>
                    <span style={{ color: "#6f767d", fontSize: 11 }}>
                      {item.category} · 의무 {item.obligationCount}건
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #cfd4da",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              minHeight: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              background: "#eceef2",
            }}
          >
            <strong style={{ fontSize: 14 }}>점검 항목</strong>
            <button
              type="button"
              onClick={() =>
                setSelectedObligationIds(
                  selectedObligationIds.length === workflowItems.length
                    ? []
                    : workflowItems.map(item => item.obligationId)
                )
              }
              style={{ border: 0, background: "transparent", color: "#84256f" }}
            >
              전체 선택
            </button>
          </div>
          <div
            style={{ maxHeight: 450, overflowY: "auto", background: "#fff" }}
          >
            {loading ? (
              <p style={{ padding: 18, fontSize: 12 }}>
                의무를 불러오고 있습니다.
              </p>
            ) : (
              workflowItems.map((item, index) => {
                const selected = selectedObligationIds.includes(
                  item.obligationId
                );
                return (
                  <div
                    key={item.obligationId}
                    style={{
                      minHeight: 48,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 14px",
                      borderBottom: "1px solid #e1e4e8",
                      background: selected ? "#fbf0f8" : "#fff",
                    }}
                  >
                    <SelectionButton
                      selected={selected}
                      onClick={() => toggleObligation(item.obligationId)}
                      label={`${item.title} 선택 또는 해제`}
                    />
                    <span style={{ fontSize: 12 }}>
                      <b style={{ color: "#a93193", marginRight: 7 }}>
                        {index + 1}.
                      </b>
                      {item.title}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}
      >
        <button
          type="button"
          className="primary-btn"
          disabled={!selectedTarget || !selectedItems.length}
          onClick={() => {
            setOpenId(selectedItems[0]?.obligationId || "");
            setStage("review");
          }}
        >
          취합 시작
        </button>
      </div>
    </>
  );

  const renderReview = () => (
    <>
      <header style={{ marginBottom: 25 }}>
        <h1 style={headingStyle}>이행점검(관리대상)</h1>
        <p style={subtitleStyle}>
          {selectedTarget?.name} · 대상별 의무이행 점검
        </p>
      </header>

      <section
        aria-label="의무이행 점검 항목"
        style={{ borderTop: "1px solid #cbd4da" }}
      >
        {selectedItems.map((item, index) => {
          const isOpen = openId === item.obligationId;
          const files = item.complianceId
            ? evidenceByCompliance[item.complianceId] || []
            : [];
          return (
            <article
              key={item.obligationId}
              style={{
                border: "1px solid #cbd4da",
                borderTop: 0,
                background: "#fff",
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenId(current =>
                    current === item.obligationId ? "" : item.obligationId
                  )
                }
                style={{
                  width: "100%",
                  minHeight: 51,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  border: 0,
                  padding: "0 16px",
                  background: "#f1f2f4",
                  textAlign: "left",
                }}
              >
                <b style={{ color: "#a93193", fontSize: 13 }}>{index + 1}.</b>
                <span style={{ fontSize: 13, fontWeight: 750 }}>
                  {item.title}
                </span>
                <ChevronDown
                  size={18}
                  style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                />
              </button>

              {isOpen && (
                <div
                  style={{
                    overflowX: "auto",
                    padding: 12,
                    background: "#f8f8fa",
                  }}
                >
                  <div style={{ minWidth: 1220, border: "1px solid #d3d8de" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "125px minmax(220px,1.5fr) 150px 150px 125px minmax(180px,1fr) minmax(170px,1fr) 120px",
                        minHeight: 40,
                        background: "#eceef1",
                        fontSize: 11,
                        fontWeight: 750,
                        textAlign: "center",
                      }}
                    >
                      {[
                        "상태",
                        "점검내용",
                        "관리대상",
                        "소관",
                        "이행일자",
                        "증빙자료",
                        "비고",
                        "저장",
                      ].map(label => (
                        <span
                          key={label}
                          style={{
                            padding: 10,
                            borderRight: "1px solid #d3d8de",
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "125px minmax(220px,1.5fr) 150px 150px 125px minmax(180px,1fr) minmax(170px,1fr) 120px",
                        minHeight: 82,
                        background: "#fff",
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{ padding: 8, borderRight: "1px solid #dce1e6" }}
                      >
                        <select
                          value={statusDrafts[item.obligationId] || "해당없음"}
                          onChange={event =>
                            setStatusDrafts(current => ({
                              ...current,
                              [item.obligationId]: event.target
                                .value as ComplianceStatus,
                            }))
                          }
                          style={{
                            width: "100%",
                            height: 34,
                            border: "1px solid #bfc6cd",
                          }}
                        >
                          {statusOptions.map(status => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </span>
                      <span
                        style={{ padding: 8, borderRight: "1px solid #dce1e6" }}
                      >
                        <textarea
                          value={noteDrafts[item.obligationId] || ""}
                          onChange={event =>
                            setNoteDrafts(current => ({
                              ...current,
                              [item.obligationId]: event.target.value,
                            }))
                          }
                          placeholder="점검 결과 또는 보완 지시"
                          style={{
                            width: "100%",
                            minHeight: 58,
                            border: "1px solid #bfc6cd",
                            padding: 7,
                          }}
                        />
                      </span>
                      {[
                        selectedTarget?.name || "-",
                        item.department,
                        item.actionDate || "-",
                      ].map((value, cellIndex) => (
                        <span
                          key={`${value}-${cellIndex}`}
                          style={{
                            padding: 10,
                            borderRight: "1px solid #dce1e6",
                            background: "#f4f4f6",
                          }}
                        >
                          {value}
                        </span>
                      ))}
                      <span
                        style={{
                          padding: 10,
                          borderRight: "1px solid #dce1e6",
                          background: "#f4f4f6",
                        }}
                      >
                        {files.length
                          ? files.map(file => file.originalName).join(" · ")
                          : "등록 파일 없음"}
                      </span>
                      <span
                        style={{
                          padding: 10,
                          borderRight: "1px solid #dce1e6",
                          background: "#f4f4f6",
                        }}
                      >
                        {item.note || item.actionDetail || "-"}
                      </span>
                      <span
                        style={{
                          display: "grid",
                          placeItems: "center",
                          padding: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={savingId === item.obligationId}
                          onClick={() => void saveInspection(item)}
                        >
                          <Save size={14} />
                          {savingId === item.obligationId ? "저장 중" : "저장"}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <p style={{ margin: "13px 0 0", color: "#697078", fontSize: 11 }}>
        상태와 점검내용만 수정합니다. 관리대상·소관·이행일자·증빙·비고는
        담당자가 같은 의무 ID로 등록한 값을 읽기 전용으로 표시합니다.
      </p>
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setStage("scope")}
        >
          대상 다시 선택
        </button>
      </div>
    </>
  );

  return (
    <div className="adoms-inspection-page" style={pageStyle}>
      {stage === "scope" ? renderScope() : renderReview()}
    </div>
  );
}
