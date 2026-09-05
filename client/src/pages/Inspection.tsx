import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, Search } from "lucide-react";
import { obligations, targets, type ComplianceStatus } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

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
  letterSpacing: "-0.055em",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "#68756d",
  fontSize: 14,
};

const roundButtonStyle = (selected: boolean): CSSProperties => ({
  width: 20,
  height: 20,
  flex: "0 0 20px",
  display: "inline-grid",
  placeItems: "center",
  border: `1px solid ${selected ? "#84256f" : "#c4cdd3"}`,
  borderRadius: "50%",
  background: selected ? "#a93193" : "#fff",
  color: "#fff",
  cursor: "pointer",
  padding: 0,
});

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
      className="adoms-selection-button"
      style={roundButtonStyle(selected)}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {selected && (
        <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1 }}>
          ✓
        </span>
      )}
    </button>
  );
}

export default function Inspection() {
  const {
    statuses,
    updateStatus,
    evidence,
    inspectionNotes,
    saveInspectionNote,
  } = useDemo();
  const [stage, setStage] = useState<InspectionStage>("scope");
  const [facilityType, setFacilityType] = useState("전체");
  const [query, setQuery] = useState("");
  const [targetIds, setTargetIds] = useState<string[]>(() =>
    targets.map(target => target.id)
  );
  const [obligationIds, setObligationIds] = useState<string[]>(() =>
    obligations.map(obligation => obligation.id)
  );
  const [openId, setOpenId] = useState("OBL-01");

  const visibleTargets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return targets.filter(target => {
      const matchesType =
        facilityType === "전체" || target.type.includes(facilityType);
      const matchesQuery =
        !normalizedQuery ||
        target.name.toLowerCase().includes(normalizedQuery) ||
        target.department.toLowerCase().includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [facilityType, query]);

  const selectedTargets = targets.filter(target =>
    targetIds.includes(target.id)
  );
  const selectedObligations = obligations.filter(obligation =>
    obligationIds.includes(obligation.id)
  );

  const toggleTarget = (targetId: string) => {
    setTargetIds(current =>
      current.includes(targetId)
        ? current.filter(id => id !== targetId)
        : [...current, targetId]
    );
  };

  const toggleObligation = (obligationId: string) => {
    setObligationIds(current =>
      current.includes(obligationId)
        ? current.filter(id => id !== obligationId)
        : [...current, obligationId]
    );
  };

  const toggleAllTargets = () => {
    const visibleIds = visibleTargets.map(target => target.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every(id => targetIds.includes(id));
    setTargetIds(current =>
      allVisibleSelected
        ? current.filter(id => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const toggleAllObligations = () => {
    setObligationIds(current =>
      current.length === obligations.length
        ? []
        : obligations.map(obligation => obligation.id)
    );
  };

  const renderScope = () => {
    const allVisibleTargetsSelected =
      visibleTargets.length > 0 &&
      visibleTargets.every(target => targetIds.includes(target.id));
    const allObligationsSelected = obligationIds.length === obligations.length;

    return (
      <>
        <header className="adoms-scope-heading" style={{ marginBottom: 25 }}>
          <h1 style={headingStyle}>이행점검(사업장)</h1>
          <p style={subtitleStyle}>취합 대상 설정</p>
        </header>

        <section
          className="adoms-scope-search"
          aria-label="사업장 검색"
          style={{
            display: "flex",
            alignItems: "end",
            gap: 10,
            padding: 17,
            marginBottom: 17,
            border: "1px solid #d8dfe3",
            background: "#f5f7f8",
          }}
        >
          <label
            className="adoms-search-field"
            style={{ display: "grid", gap: 6, minWidth: 118 }}
          >
            <span style={{ fontSize: 12, fontWeight: 700 }}>사업장</span>
            <select
              className="adoms-type-select"
              value={facilityType}
              onChange={event => setFacilityType(event.target.value)}
              style={{
                height: 38,
                border: "1px solid #c7d0d6",
                background: "#fff",
                padding: "0 10px",
              }}
            >
              <option>전체</option>
              <option>공중이용시설</option>
              <option>교통수단</option>
            </select>
          </label>
          <label
            className="adoms-search-field"
            style={{
              display: "grid",
              gap: 6,
              flex: "1 1 330px",
              maxWidth: 510,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700 }}>사업장명</span>
            <input
              className="adoms-name-input"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="사업장명을 입력하세요"
              style={{
                height: 36,
                border: "1px solid #c7d0d6",
                background: "#fff",
                padding: "0 10px",
              }}
            />
          </label>
          <button
            type="button"
            className="adoms-search-button"
            onClick={() => setQuery(current => current.trim())}
            style={{
              height: 38,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: "1px solid #b23d99",
              background: "#fff",
              color: "#84256f",
              padding: "0 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Search size={15} /> 검색
          </button>
        </section>

        <section
          className="adoms-scope-lists"
          aria-label="취합 대상 및 점검 항목 선택"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
          }}
        >
          <div
            className="adoms-selection-panel"
            style={{ border: "1px solid #cfd7dc", background: "#fff" }}
          >
            <div
              className="adoms-selection-panel-header"
              style={{
                minHeight: 51,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                borderBottom: "1px solid #cfd7dc",
                background: "#eef2f5",
              }}
            >
              <strong style={{ fontSize: 13 }}>사업장명</strong>
              <span
                className="adoms-select-all"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                }}
              >
                <SelectionButton
                  selected={allVisibleTargetsSelected}
                  onClick={toggleAllTargets}
                  label="표시된 사업장 전체 선택 또는 해제"
                />
                전체 선택
              </span>
            </div>
            <div className="adoms-selection-list" style={{ minHeight: 414 }}>
              {visibleTargets.length ? (
                visibleTargets.map(target => {
                  const selected = targetIds.includes(target.id);
                  return (
                    <div
                      className="adoms-selection-row"
                      key={target.id}
                      style={{
                        minHeight: 62,
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "0 16px",
                        borderBottom: "1px solid #e1e6e9",
                        background: selected ? "#fbf0f8" : "#fff",
                      }}
                    >
                      <SelectionButton
                        selected={selected}
                        onClick={() => toggleTarget(target.id)}
                        label={`${target.name} 선택 또는 해제`}
                      />
                      <div
                        className="adoms-target-copy"
                        style={{ display: "grid", gap: 3 }}
                      >
                        <strong style={{ fontSize: 13 }}>{target.name}</strong>
                        <span style={{ color: "#718078", fontSize: 11 }}>
                          {target.department}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p
                  className="adoms-empty-results"
                  style={{
                    margin: 0,
                    padding: 24,
                    color: "#707b82",
                    fontSize: 12,
                  }}
                >
                  검색 조건에 맞는 사업장이 없습니다.
                </p>
              )}
            </div>
          </div>

          <div
            className="adoms-selection-panel"
            style={{ border: "1px solid #cfd7dc", background: "#fff" }}
          >
            <div
              className="adoms-selection-panel-header"
              style={{
                minHeight: 51,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                borderBottom: "1px solid #cfd7dc",
                background: "#eef2f5",
              }}
            >
              <strong style={{ fontSize: 13 }}>항목</strong>
              <span
                className="adoms-select-all"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                }}
              >
                <SelectionButton
                  selected={allObligationsSelected}
                  onClick={toggleAllObligations}
                  label="점검 항목 전체 선택 또는 해제"
                />
                전체 선택
              </span>
            </div>
            <div className="adoms-selection-list">
              {obligations.map((obligation, index) => {
                const selected = obligationIds.includes(obligation.id);
                return (
                  <div
                    className="adoms-selection-row"
                    key={obligation.id}
                    style={{
                      minHeight: 41,
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "0 16px",
                      borderBottom: "1px solid #e1e6e9",
                      background: selected ? "#fbf0f8" : "#fff",
                    }}
                  >
                    <SelectionButton
                      selected={selected}
                      onClick={() => toggleObligation(obligation.id)}
                      label={`${obligation.title} 선택 또는 해제`}
                    />
                    <span style={{ fontSize: 12 }}>
                      <b
                        style={{
                          display: "inline-block",
                          minWidth: 25,
                          color: "#a93193",
                        }}
                      >
                        {index + 1}.
                      </b>
                      {obligation.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div
          className="adoms-scope-actions"
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}
        >
          <button
            type="button"
            className="adoms-start-button"
            disabled={!selectedTargets.length || !selectedObligations.length}
            onClick={() => {
              setOpenId(selectedObligations[0]?.id || "OBL-01");
              setStage("review");
            }}
            style={{
              minWidth: 118,
              minHeight: 42,
              border: "1px solid #b23d99",
              background: "#fff",
              color: "#84256f",
              fontSize: 13,
              fontWeight: 750,
              cursor:
                !selectedTargets.length || !selectedObligations.length
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !selectedTargets.length || !selectedObligations.length
                  ? 0.45
                  : 1,
            }}
          >
            취합 시작
          </button>
        </div>
      </>
    );
  };

  const renderReview = () => (
    <>
      <header className="adoms-review-heading" style={{ marginBottom: 25 }}>
        <h1 style={headingStyle}>이행점검(사업장)</h1>
        <p style={subtitleStyle}>의무이행(사업장) 점검</p>
      </header>

      <section
        className="adoms-review-list"
        aria-label="의무이행 점검 항목"
        style={{ borderTop: "1px solid #cbd4da" }}
      >
        {selectedObligations.map((obligation, index) => {
          const isOpen = openId === obligation.id;
          return (
            <article
              className={`adoms-review-accordion ${isOpen ? "adoms-open" : "adoms-closed"}`}
              key={obligation.id}
              style={{
                border: "1px solid #cbd4da",
                borderTop: 0,
                background: "#fff",
              }}
            >
              <button
                type="button"
                className="adoms-review-accordion-trigger"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenId(current =>
                    current === obligation.id ? "" : obligation.id
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
                  background: "#f1f3f4",
                  color: "#28373f",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <b style={{ color: "#a93193", fontSize: 13 }}>{index + 1}.</b>
                <span style={{ fontSize: 13, fontWeight: 750 }}>
                  {obligation.title}
                </span>
                <span
                  className="adoms-accordion-circle"
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: "#a93193",
                    color: "#fff",
                  }}
                >
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 160ms ease",
                    }}
                  />
                </span>
              </button>

              {isOpen && (
                <div
                  className="adoms-review-table-wrap"
                  style={{
                    overflowX: "auto",
                    padding: 12,
                    background: "#f8faf9",
                  }}
                >
                  <div
                    className="adoms-review-table"
                    role="table"
                    aria-label={`${obligation.title} 점검표`}
                    style={{ minWidth: 1250, border: "1px solid #d3dbe0" }}
                  >
                    <div
                      className="adoms-review-table-header"
                      role="row"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "120px minmax(220px,1.7fr) minmax(115px,.9fr) 115px 140px minmax(190px,1.15fr) minmax(160px,1fr)",
                        minHeight: 40,
                        background: "#eeeeF1",
                        fontSize: 11,
                        fontWeight: 750,
                        textAlign: "center",
                      }}
                    >
                      {[
                        "상태",
                        "점검내용",
                        "사업장",
                        "부서",
                        "의무이행 일자",
                        "증빙자료",
                        "비고",
                      ].map(label => (
                        <span
                          className="adoms-review-header-cell"
                          role="columnheader"
                          key={label}
                          style={{
                            display: "grid",
                            placeItems: "center",
                            padding: "6px 8px",
                            borderRight: "1px solid #d3dbe0",
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    {selectedTargets.map(target => {
                      const key = `${target.id}:${obligation.id}`;
                      const record = evidence[obligation.id];
                      const value =
                        statuses[target.id]?.[obligation.id] ?? "해당없음";
                      const readonlyCellStyle: CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRight: "1px solid #dce3e6",
                        background: "#f2f4f4",
                        color: "#59675f",
                        fontSize: 11,
                        overflow: "hidden",
                      };
                      return (
                        <div
                          className="adoms-review-table-row"
                          role="row"
                          key={target.id}
                          style={{
                            minHeight: 78,
                            display: "grid",
                            gridTemplateColumns:
                              "120px minmax(220px,1.7fr) minmax(115px,.9fr) 115px 140px minmax(190px,1.15fr) minmax(160px,1fr)",
                            background: "#fff",
                            borderTop: "1px solid #dce3e6",
                          }}
                        >
                          <span
                            className="adoms-status-cell"
                            role="cell"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: 8,
                              borderRight: "1px solid #dce3e6",
                            }}
                          >
                            <select
                              className="adoms-status-select"
                              aria-label={`${target.name} ${obligation.title} 상태`}
                              value={value}
                              onChange={event =>
                                updateStatus(
                                  target.id,
                                  obligation.id,
                                  event.target.value as ComplianceStatus
                                )
                              }
                              style={{
                                width: "100%",
                                height: 33,
                                border: "1px solid #bfcbd1",
                                background: "#fff",
                                padding: "0 7px",
                                fontSize: 11,
                              }}
                            >
                              {statusOptions.map(option => (
                                <option key={option}>{option}</option>
                              ))}
                            </select>
                          </span>
                          <span
                            className="adoms-note-cell"
                            role="cell"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: 8,
                              borderRight: "1px solid #dce3e6",
                            }}
                          >
                            <textarea
                              className="adoms-note-input"
                              aria-label={`${target.name} ${obligation.title} 점검내용`}
                              value={inspectionNotes[key] ?? ""}
                              onChange={event =>
                                saveInspectionNote(key, event.target.value)
                              }
                              placeholder="점검 결과 또는 보완 지시를 입력하세요"
                              style={{
                                width: "100%",
                                minHeight: 54,
                                resize: "vertical",
                                border: "1px solid #bfcbd1",
                                padding: 7,
                                fontSize: 11,
                                lineHeight: 1.45,
                              }}
                            />
                          </span>
                          <span
                            className="adoms-readonly-cell"
                            role="cell"
                            style={readonlyCellStyle}
                          >
                            {target.name}
                          </span>
                          <span
                            className="adoms-readonly-cell"
                            role="cell"
                            style={readonlyCellStyle}
                          >
                            {target.department}
                          </span>
                          <span
                            className="adoms-readonly-cell"
                            role="cell"
                            style={readonlyCellStyle}
                          >
                            {record?.actionDate || "-"}
                          </span>
                          <span
                            className="adoms-readonly-cell"
                            role="cell"
                            style={readonlyCellStyle}
                            title={record?.fileName || "등록 파일 없음"}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {record?.fileName || "등록 파일 없음"}
                            </span>
                          </span>
                          <span
                            className="adoms-readonly-cell"
                            role="cell"
                            style={{ ...readonlyCellStyle, borderRight: 0 }}
                          >
                            {record?.note || "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <p
        className="adoms-review-guidance"
        style={{ margin: "13px 0 0", color: "#69736b", fontSize: 11 }}
      >
        상태와 점검내용만 수정할 수 있으며, 사업장·부서·의무이행
        일자·증빙자료·비고는 담당자가 등록한 값을 읽기 전용으로 표시합니다.
      </p>
    </>
  );

  return (
    <div className="adoms-inspection-page" style={pageStyle}>
      {stage === "scope" ? renderScope() : renderReview()}
    </div>
  );
}
