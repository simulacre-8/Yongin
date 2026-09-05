import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, RotateCcw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import {
  loadManagedTargets,
  LOCAL_MANAGED_TARGETS,
  type ManagedTargetRow,
} from "@/lib/facility-api";
import {
  loadTargetObligations,
  type MappedObligation,
} from "@/lib/facility-obligation-api";
import { useDemo } from "@/contexts/DemoContext";

const facilityTypes = [
  "전체",
  "건축물",
  "상하수도",
  "옹벽",
  "하천",
  "터널",
  "교량",
  "절토사면",
  "기타",
] as const;

type Screen = "list" | "detail";

type FacilityRow = {
  target: ManagedTargetRow;
  facilityType: string;
  progress: "미입력" | "입력중";
};

type LawGroup = {
  name: string;
  items: MappedObligation[];
};

const styles: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: 1500,
    margin: "0 auto",
    color: "#252a27",
  },
  heading: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 22,
  },
  headingLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: 27,
    fontWeight: 800,
    letterSpacing: "-0.055em",
    color: "#202622",
  },
  target: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 185,
    padding: "9px 13px",
    border: "1px solid #cbd6ca",
    borderRadius: 4,
    background: "#fff",
  },
  targetLabel: {
    color: "#657267",
    fontSize: 11,
    fontWeight: 700,
  },
  targetName: {
    marginTop: 2,
    color: "#263d2b",
    fontSize: 14,
    fontWeight: 800,
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    minHeight: 31,
    padding: "0 8px",
    border: "1px solid #c7d0c7",
    borderRadius: 3,
    color: "#48564b",
    background: "#fff",
    fontSize: 11,
    cursor: "pointer",
  },
  filterPanel: {
    padding: "14px 18px 16px",
    marginBottom: 28,
    border: "1px solid #dee4e0",
    borderRadius: 14,
    background: "#f1f3f5",
  },
  filterRow: {
    display: "grid",
    gridTemplateColumns: "150px minmax(0, 1fr)",
    alignItems: "center",
    minHeight: 75,
    borderBottom: "1px solid #e1e5e3",
  },
  filterLastRow: {
    display: "grid",
    gridTemplateColumns: "150px minmax(0, 1fr)",
    alignItems: "center",
    minHeight: 91,
  },
  filterLabel: {
    paddingLeft: 22,
    color: "#202722",
    fontSize: 15,
    fontWeight: 800,
  },
  radioBox: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px 25px",
    minHeight: 54,
    padding: "12px 18px",
    border: "1px solid #e0e3e1",
    borderRadius: 7,
    background: "#fff",
  },
  radioLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: "#424a44",
    fontSize: 12,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  radio: {
    width: 19,
    height: 19,
    margin: 0,
    accentColor: "#a93193",
    cursor: "pointer",
  },
  searchBox: {
    display: "grid",
    gridTemplateColumns: "136px minmax(200px, 1fr) 129px",
    gap: 0,
    minHeight: 43,
    border: "1px solid #d1d7d3",
    borderRadius: 4,
    overflow: "hidden",
    background: "#fff",
  },
  searchSelect: {
    minWidth: 0,
    padding: "0 11px",
    border: 0,
    borderRight: "1px solid #d1d7d3",
    color: "#a93193",
    background: "#fff",
    fontSize: 12,
    outline: "none",
  },
  searchInput: {
    minWidth: 0,
    padding: "0 13px",
    border: 0,
    color: "#29342e",
    background: "#fff",
    fontSize: 12,
    outline: "none",
  },
  searchButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "1px solid #a93193",
    borderRadius: 3,
    color: "#8b256f",
    background: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  progressCard: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    minHeight: 64,
    border: "1px solid #e1e4e2",
    borderRadius: 7,
    overflow: "hidden",
    background: "#fff",
  },
  progressItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },
  progressDivider: {
    borderLeft: "1px solid #e3e5e3",
  },
  progressName: {
    color: "#555e57",
    fontSize: 13,
  },
  progressNumber: {
    color: "#1e2520",
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  progressUnit: {
    marginLeft: 3,
    color: "#4c574e",
    fontSize: 13,
    fontWeight: 500,
  },
  total: {
    margin: "0 0 8px",
    color: "#555e59",
    fontSize: 14,
  },
  totalNumber: {
    color: "#a93193",
    fontSize: 17,
    fontWeight: 800,
  },
  tableWrap: {
    overflow: "hidden",
    borderTop: "1px solid #9ca8a0",
    borderBottom: "1px solid #cfd5d1",
    background: "#fff",
  },
  listTable: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  listHeadCell: {
    height: 43,
    padding: "9px 12px",
    borderRight: "1px solid #dfe4e0",
    color: "#39433c",
    background: "#f1f3f4",
    fontSize: 12,
    fontWeight: 800,
    textAlign: "center",
  },
  listCell: {
    height: 58,
    padding: "11px 13px",
    borderTop: "1px solid #e4e8e5",
    borderRight: "1px solid #e4e8e5",
    color: "#424b44",
    fontSize: 12,
    textAlign: "center",
    verticalAlign: "middle",
  },
  facilityButton: {
    width: "100%",
    padding: 0,
    border: 0,
    color: "#263c2c",
    background: "transparent",
    fontSize: 12,
    fontWeight: 700,
    textAlign: "left",
    cursor: "pointer",
  },
  emptyCell: {
    height: 95,
    color: "#707a72",
    fontSize: 12,
    textAlign: "center",
  },
  detailTable: {
    width: "100%",
    minWidth: 950,
    borderCollapse: "collapse",
    tableLayout: "fixed",
    background: "#fff",
  },
  detailHead: {
    height: 43,
    padding: "9px 10px",
    border: "1px solid #bfc7c1",
    color: "#242a25",
    background: "#eef0f2",
    fontSize: 13,
    fontWeight: 800,
    textAlign: "center",
  },
  lawCell: {
    padding: "10px 13px",
    border: "1px solid #d0d6d1",
    color: "#29362c",
    background: "#fbfcfb",
    fontSize: 12,
    fontWeight: 750,
    lineHeight: 1.45,
    verticalAlign: "middle",
  },
  ordinanceCell: {
    padding: "9px 11px",
    border: "1px solid #d0d6d1",
    color: "#354037",
    background: "#fff",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.42,
    verticalAlign: "middle",
  },
  obligationCell: {
    padding: "9px 12px",
    border: "1px solid #d0d6d1",
    color: "#2c352e",
    background: "#fff",
    fontSize: 12,
    verticalAlign: "middle",
  },
  obligationTitle: {
    display: "block",
    fontWeight: 750,
    lineHeight: 1.35,
  },
  obligationDetail: {
    display: "block",
    marginTop: 3,
    color: "#6e786f",
    fontSize: 10,
    lineHeight: 1.35,
  },
  dueCell: {
    padding: "8px 11px",
    border: "1px solid #d0d6d1",
    background: "#fff",
    textAlign: "center",
    verticalAlign: "middle",
  },
  monthInput: {
    width: "100%",
    minWidth: 129,
    height: 31,
    padding: "0 7px",
    border: "1px solid #c4ccc5",
    borderRadius: 3,
    color: "#3c493f",
    background: "#fff",
    fontSize: 12,
  },
  halfYear: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },
  halfYearLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#38423a",
    fontSize: 11,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  halfYearRadio: {
    width: 17,
    height: 17,
    margin: 0,
    accentColor: "#202020",
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 13,
  },
  resetButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    padding: "0 14px",
    border: "1px solid #aab3ac",
    borderRadius: 3,
    color: "#3f4a42",
    background: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  saveButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 92,
    minHeight: 36,
    padding: "0 17px",
    border: "1px solid #5b6260",
    borderRadius: 3,
    color: "#fff",
    background: "#5b6260",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
};

function facilityTypeOf(target: ManagedTargetRow) {
  const parts = target.detailKind.split(" / ").filter(Boolean);
  const raw = parts[0] || target.detailKind || target.category;
  return facilityTypes.includes(raw as (typeof facilityTypes)[number])
    ? raw
    : "기타";
}

function buildLawGroups(items: MappedObligation[]): LawGroup[] {
  return items.reduce<LawGroup[]>((groups, item) => {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup?.name === item.group) {
      currentGroup.items.push(item);
    } else {
      groups.push({ name: item.group, items: [item] });
    }
    return groups;
  }, []);
}

function ordinanceSpan(items: MappedObligation[], index: number) {
  const ordinanceName = items[index].lawName;
  if (index > 0 && items[index - 1].lawName === ordinanceName) return 0;

  let span = 1;
  for (let next = index + 1; next < items.length; next += 1) {
    if (items[next].lawName !== ordinanceName) break;
    span += 1;
  }
  return span;
}

export default function Obligations() {
  const { selectedTargetId, setSelectedTargetId, dueDates, updateDueDate } =
    useDemo();
  const [screen, setScreen] = useState<Screen>("list");
  const [facilityType, setFacilityType] =
    useState<(typeof facilityTypes)[number]>("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedTerm, setAppliedTerm] = useState("");
  const [managedTargets, setManagedTargets] = useState<ManagedTargetRow[]>(
    LOCAL_MANAGED_TARGETS
  );
  const [facilitySource, setFacilitySource] = useState<
    "loading" | "supabase" | "fallback"
  >("loading");
  const [mappedObligations, setMappedObligations] = useState<
    MappedObligation[]
  >([]);
  const [obligationSource, setObligationSource] = useState<
    "idle" | "loading" | "supabase" | "fallback"
  >("idle");
  const [loadReason, setLoadReason] = useState("");

  useEffect(() => {
    let active = true;
    loadManagedTargets().then(result => {
      if (!active) return;
      setManagedTargets(result.rows);
      setFacilitySource(result.source);
      setLoadReason(result.reason || "");
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedTarget =
    managedTargets.find(target => target.id === selectedTargetId) ||
    managedTargets[0] ||
    LOCAL_MANAGED_TARGETS[0];

  const facilities = useMemo<FacilityRow[]>(
    () =>
      managedTargets
        .filter(
          target =>
            target.category === "시설물" || target.category === "공중교통수단"
        )
        .map(target => ({
          target,
          facilityType: facilityTypeOf(target),
          progress: Object.keys(dueDates).some(key =>
            key.startsWith(`${target.id}:`)
          )
            ? "입력중"
            : "미입력",
        })),
    [dueDates, managedTargets]
  );

  const filteredFacilities = useMemo(
    () =>
      facilities.filter(facility => {
        const matchesType =
          facilityType === "전체" || facility.facilityType === facilityType;
        const query = appliedTerm.trim();
        const matchesQuery =
          !query ||
          `${facility.target.name} ${facility.target.address}`.includes(query);
        return matchesType && matchesQuery;
      }),
    [appliedTerm, facilities, facilityType]
  );

  const noInputCount = facilities.filter(
    facility => facility.progress === "미입력"
  ).length;
  const inProgressCount = facilities.length - noInputCount;
  const lawGroups = useMemo(
    () => buildLawGroups(mappedObligations),
    [mappedObligations]
  );

  useEffect(() => {
    if (screen !== "detail") return;
    let active = true;
    setObligationSource("loading");
    setLoadReason("");
    loadTargetObligations(selectedTargetId).then(result => {
      if (!active) return;
      setMappedObligations(result.items);
      setObligationSource(result.source);
      setLoadReason(result.reason || "");
    });
    return () => {
      active = false;
    };
  }, [screen, selectedTargetId]);

  const openDetail = (targetId: string) => {
    setSelectedTargetId(targetId);
    setScreen("detail");
  };

  const resetDueDates = () => {
    mappedObligations.forEach(item =>
      updateDueDate(`${selectedTarget.id}:${item.id}`, item.defaultDue)
    );
    toast.success("법 의무사항의 이행 시기를 초기화했습니다.");
  };

  if (screen === "detail") {
    return (
      <main className="adoms-obligations-page" style={styles.page}>
        <div className="adoms-obligations-heading" style={styles.heading}>
          <div
            className="adoms-obligations-heading-left"
            style={styles.headingLeft}
          >
            <button
              type="button"
              className="adoms-obligations-back-button"
              style={styles.backButton}
              onClick={() => setScreen("list")}
            >
              <ChevronLeft size={15} aria-hidden="true" /> 목록으로
            </button>
            <h1 className="adoms-obligations-title" style={styles.title}>
              법 의무사항 {selectedTarget.category}
            </h1>
          </div>
          <div className="adoms-obligations-target" style={styles.target}>
            <span
              className="adoms-obligations-target-label"
              style={styles.targetLabel}
            >
              대상
            </span>
            <strong
              className="adoms-obligations-target-name"
              style={styles.targetName}
            >
              {selectedTarget.name}
            </strong>
          </div>
        </div>

        <div
          className="adoms-obligations-detail-table-wrap"
          style={styles.tableWrap}
        >
          <table
            className="adoms-obligations-detail-table"
            style={styles.detailTable}
          >
            <colgroup>
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" style={styles.detailHead}>
                  의무분류
                </th>
                <th scope="col" style={styles.detailHead}>
                  관계법령·근거
                </th>
                <th scope="col" style={styles.detailHead}>
                  의무사항
                </th>
                <th scope="col" style={styles.detailHead}>
                  이행 시기
                </th>
              </tr>
            </thead>
            <tbody>
              {obligationSource === "loading" ? (
                <tr>
                  <td colSpan={4} style={styles.emptyCell}>
                    시설별 적용 의무를 불러오고 있습니다.
                  </td>
                </tr>
              ) : lawGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.emptyCell}>
                    이 대상에 연결된 적용 의무가 없습니다.
                    {loadReason ? ` (${loadReason})` : ""}
                  </td>
                </tr>
              ) : (
                lawGroups.map(lawGroup =>
                  lawGroup.items.map((item, itemIndex) => {
                    const span = ordinanceSpan(lawGroup.items, itemIndex);
                    return (
                      <tr
                        key={item.id}
                        className="adoms-obligations-detail-row"
                      >
                        {itemIndex === 0 && (
                          <td
                            className="adoms-obligations-law-cell"
                            rowSpan={lawGroup.items.length}
                            style={styles.lawCell}
                          >
                            {lawGroup.name}
                          </td>
                        )}
                        {span > 0 && (
                          <td
                            className="adoms-obligations-ordinance-cell"
                            rowSpan={span}
                            style={styles.ordinanceCell}
                          >
                            <strong>{item.lawName}</strong>
                            <span
                              style={{
                                display: "block",
                                marginTop: 4,
                                color: "#766c78",
                                fontSize: 10,
                              }}
                            >
                              {item.article}
                            </span>
                          </td>
                        )}
                        <td
                          className="adoms-obligations-item-cell"
                          style={styles.obligationCell}
                        >
                          <strong
                            className="adoms-obligations-item-title"
                            style={styles.obligationTitle}
                          >
                            {item.title}
                          </strong>
                          <span
                            className="adoms-obligations-item-detail"
                            style={styles.obligationDetail}
                          >
                            {item.detail}
                          </span>
                        </td>
                        <td
                          className="adoms-obligations-due-cell"
                          style={styles.dueCell}
                        >
                          {item.scheduleType === "month" ? (
                            <input
                              className="adoms-obligations-month-input"
                              style={styles.monthInput}
                              type="month"
                              aria-label={`${item.title} 이행 시기`}
                              value={
                                dueDates[`${selectedTarget.id}:${item.id}`] ||
                                ""
                              }
                              onChange={event =>
                                updateDueDate(
                                  `${selectedTarget.id}:${item.id}`,
                                  event.target.value
                                )
                              }
                            />
                          ) : (
                            <div
                              className="adoms-obligations-half-year"
                              style={styles.halfYear}
                            >
                              {(["상반기", "하반기"] as const).map(half => (
                                <label
                                  key={half}
                                  className="adoms-obligations-half-year-label"
                                  style={styles.halfYearLabel}
                                >
                                  <input
                                    className="adoms-obligations-half-year-radio"
                                    style={styles.halfYearRadio}
                                    type="radio"
                                    name={`due-date-${item.id}`}
                                    value={half}
                                    checked={
                                      dueDates[
                                        `${selectedTarget.id}:${item.id}`
                                      ] === half
                                    }
                                    onChange={event =>
                                      updateDueDate(
                                        `${selectedTarget.id}:${item.id}`,
                                        event.target.value
                                      )
                                    }
                                  />
                                  {half}
                                </label>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="adoms-obligations-actions" style={styles.actions}>
          <button
            type="button"
            className="adoms-obligations-reset-button"
            style={styles.resetButton}
            onClick={resetDueDates}
          >
            <RotateCcw size={15} aria-hidden="true" /> 항목 초기화
          </button>
          <button
            type="button"
            className="adoms-obligations-save-button"
            style={styles.saveButton}
            onClick={() =>
              toast.success("법 의무사항의 이행 시기가 저장되었습니다.")
            }
          >
            <Save size={15} aria-hidden="true" /> 저장
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="adoms-obligations-page" style={styles.page}>
      <div className="adoms-obligations-heading" style={styles.heading}>
        <h1 className="adoms-obligations-title" style={styles.title}>
          법 의무사항 공중이용시설·교통수단
        </h1>
        <div className="adoms-obligations-target" style={styles.target}>
          <span style={styles.targetLabel}>데이터 원천</span>
          <strong style={styles.targetName}>
            {facilitySource === "supabase"
              ? `Supabase 시설 ${facilities.length}건`
              : facilitySource === "loading"
                ? "시설 DB 조회 중"
                : "로컬 시연값"}
          </strong>
        </div>
      </div>

      <form
        className="adoms-obligations-filter-panel"
        style={styles.filterPanel}
        onSubmit={event => {
          event.preventDefault();
          setAppliedTerm(searchTerm);
        }}
      >
        <div className="adoms-obligations-filter-row" style={styles.filterRow}>
          <span
            className="adoms-obligations-filter-label"
            style={styles.filterLabel}
          >
            시설구분
          </span>
          <div className="adoms-obligations-radio-box" style={styles.radioBox}>
            {facilityTypes.map(type => (
              <label
                key={type}
                className="adoms-obligations-radio-label"
                style={styles.radioLabel}
              >
                <input
                  className="adoms-obligations-radio"
                  style={styles.radio}
                  type="radio"
                  name="facility-type"
                  value={type}
                  checked={facilityType === type}
                  onChange={() => setFacilityType(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div className="adoms-obligations-filter-row" style={styles.filterRow}>
          <label
            className="adoms-obligations-filter-label"
            style={styles.filterLabel}
            htmlFor="adoms-obligations-search-condition"
          >
            검색조건
          </label>
          <div
            className="adoms-obligations-search-box"
            style={styles.searchBox}
          >
            <select
              id="adoms-obligations-search-condition"
              className="adoms-obligations-search-select"
              style={styles.searchSelect}
              aria-label="검색조건"
              value="시설물명"
              onChange={() => undefined}
            >
              <option>시설물명</option>
            </select>
            <input
              className="adoms-obligations-search-input"
              style={styles.searchInput}
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="시설물명을 입력하세요"
              aria-label="시설물명 검색어"
            />
            <button
              type="submit"
              className="adoms-obligations-search-button"
              style={styles.searchButton}
            >
              <Search size={17} aria-hidden="true" /> 검색
            </button>
          </div>
        </div>

        <div
          className="adoms-obligations-filter-row-last"
          style={styles.filterLastRow}
        >
          <span
            className="adoms-obligations-filter-label"
            style={styles.filterLabel}
          >
            진행현황
          </span>
          <div
            className="adoms-obligations-progress-card"
            style={styles.progressCard}
          >
            <div
              className="adoms-obligations-progress-item"
              style={styles.progressItem}
            >
              <span
                className="adoms-obligations-progress-name"
                style={styles.progressName}
              >
                미입력
              </span>
              <strong
                className="adoms-obligations-progress-number"
                style={styles.progressNumber}
              >
                {noInputCount}
                <span
                  className="adoms-obligations-progress-unit"
                  style={styles.progressUnit}
                >
                  개소
                </span>
              </strong>
            </div>
            <div
              className="adoms-obligations-progress-item"
              style={{ ...styles.progressItem, ...styles.progressDivider }}
            >
              <span
                className="adoms-obligations-progress-name"
                style={styles.progressName}
              >
                입력중
              </span>
              <strong
                className="adoms-obligations-progress-number"
                style={styles.progressNumber}
              >
                {inProgressCount}
                <span
                  className="adoms-obligations-progress-unit"
                  style={styles.progressUnit}
                >
                  개소
                </span>
              </strong>
            </div>
          </div>
        </div>
      </form>

      <p className="adoms-obligations-total" style={styles.total}>
        총{" "}
        <strong style={styles.totalNumber}>{filteredFacilities.length}</strong>
        개소
      </p>
      <div
        className="adoms-obligations-list-table-wrap"
        style={styles.tableWrap}
      >
        <table
          className="adoms-obligations-list-table"
          style={styles.listTable}
        >
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "34%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr>
              {["관리대상명", "주소", "시설구분", "적용 의무", "소속"].map(
                heading => (
                  <th
                    key={heading}
                    scope="col"
                    className="adoms-obligations-list-head-cell"
                    style={styles.listHeadCell}
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filteredFacilities.length > 0 ? (
              filteredFacilities.map(facility => (
                <tr
                  key={facility.target.id}
                  className="adoms-obligations-list-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => openDetail(facility.target.id)}
                >
                  <td
                    className="adoms-obligations-list-cell"
                    style={{ ...styles.listCell, textAlign: "left" }}
                  >
                    <button
                      type="button"
                      className="adoms-obligations-facility-button"
                      style={styles.facilityButton}
                      onClick={() => openDetail(facility.target.id)}
                    >
                      {facility.target.name}
                    </button>
                  </td>
                  <td
                    className="adoms-obligations-list-cell"
                    style={{ ...styles.listCell, textAlign: "left" }}
                  >
                    {facility.target.address}
                  </td>
                  <td
                    className="adoms-obligations-list-cell"
                    style={styles.listCell}
                  >
                    {facility.facilityType}
                  </td>
                  <td
                    className="adoms-obligations-list-cell"
                    style={styles.listCell}
                  >
                    <strong style={{ color: "#a93193" }}>
                      {facility.target.obligationCount}건
                    </strong>
                  </td>
                  <td
                    className="adoms-obligations-list-cell"
                    style={styles.listCell}
                  >
                    {facility.target.department}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="adoms-obligations-empty-row">
                <td
                  className="adoms-obligations-empty-cell"
                  colSpan={5}
                  style={styles.emptyCell}
                >
                  조회된 시설물이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
