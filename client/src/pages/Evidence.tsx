import {
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
} from "react";
import {
  Download,
  FilePlus2,
  FileUp,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { targets } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

type StepId = "OBL-01" | "OBL-02" | "OBL-03" | "OBL-05" | "OBL-06" | "OBL-10";
type TableKind =
  | "personnel"
  | "budget"
  | "inspection"
  | "plan"
  | "procedure"
  | "law";

type Attachment = {
  id: string;
  name: string;
  file?: File;
};

type EvidenceRow = {
  id: string;
  category: string;
  date: string;
  secondaryDate?: string;
  content: string;
  detail: string;
  note: string;
  amount?: string;
  executionAmount?: string;
  lawName?: string;
  article?: string;
  attachments: Attachment[];
  roster?: Attachment;
};

type DutyStep = {
  id: StepId;
  step: string;
  title: string;
  law: string;
  tableTitle: string;
  kind: TableKind;
  inputGuide: string;
  addLabel: string;
  evidenceExamples: string[];
  requiredItems: string[];
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_DATE = "2026-09-05";

const DUTY_STEPS: DutyStep[] = [
  {
    id: "OBL-01",
    step: "1)",
    title: "안전인력 확보",
    law: "중대재해 처벌 등에 관한 법률 시행령 제10조 제1호",
    tableTitle: "안전인력 확보",
    kind: "personnel",
    inputGuide:
      "안전관리 업무를 수행하는 담당자의 직급, 배치일자, 성명 및 소속을 입력하고 선임 근거를 첨부합니다.",
    addLabel: "항목 추가",
    evidenceExamples: [
      "안전보건관리책임자 등 선임서",
      "안전인력 배치 현황 및 조직도",
    ],
    requiredItems: [
      "직급 및 배치일자",
      "담당자 성명·소속(부서)",
      "선임 또는 배치 근거 증빙",
    ],
  },
  {
    id: "OBL-02",
    step: "2)",
    title: "안전예산 편성·집행",
    law: "중대재해 처벌 등에 관한 법률 시행령 제4조 제2호",
    tableTitle: "중대시민재해 예방 예산 편성·집행",
    kind: "budget",
    inputGuide:
      "예산 항목별 편성액과 실제 집행일자·내역·집행액을 천원 단위로 기록합니다.",
    addLabel: "집행 내역 추가",
    evidenceExamples: [
      "예산편성서 및 세부 산출근거",
      "지출결의서, 계약서, 세금계산서 등 집행 증빙",
    ],
    requiredItems: [
      "예산 항목별 편성액(천원)",
      "집행일자 및 집행내역",
      "집행액 및 증빙자료",
    ],
  },
  {
    id: "OBL-03",
    step: "3)",
    title: "안전점검 계획 수립·수행",
    law: "중대재해 처벌 등에 관한 법률 시행령 제4조 제2호·제5호·제6호",
    tableTitle: "그 외 안전·보건 관계 법령에 따른 안전점검",
    kind: "inspection",
    inputGuide:
      "점검 항목별 점검일자, 점검결과와 후속 조치내역을 등록합니다. 점검 판정은 이행점검 화면에서 수행합니다.",
    addLabel: "점검 항목 추가",
    evidenceExamples: [
      "정기안전점검 결과서",
      "안전점검 체크리스트 및 조치 완료 사진",
    ],
    requiredItems: [
      "점검 항목 및 점검일자",
      "점검결과·후속 조치내역",
      "점검 결과를 확인할 수 있는 증빙",
    ],
  },
  {
    id: "OBL-05",
    step: "4)",
    title: "안전계획 수립·이행",
    law: "중대재해 처벌 등에 관한 법률 시행령 제4조 제5호",
    tableTitle: "안전계획 수립·이행 수행",
    kind: "plan",
    inputGuide:
      "안전계획 항목별 이행일자와 이행내역을 등록하고, 계획서 또는 결과자료를 첨부합니다.",
    addLabel: "계획 항목 추가",
    evidenceExamples: [
      "연간 안전계획서",
      "계획 이행 결과보고서 및 내부 결재문서",
    ],
    requiredItems: [
      "안전계획 항목",
      "이행일자 및 이행내역",
      "계획 수립·이행을 입증하는 자료",
    ],
  },
  {
    id: "OBL-06",
    step: "5)",
    title: "재해예방 업무처리절차 마련·이행",
    law: "중대재해 처벌 등에 관한 법률 시행령 제10조 제7호",
    tableTitle: "유해·위험요인 확인·점검",
    kind: "procedure",
    inputGuide:
      "유해·위험요인 확인부터 조치 완료까지의 일자와 조치사항을 동일 행에 기록합니다.",
    addLabel: "점검 항목 추가",
    evidenceExamples: [
      "유해·위험요인 점검표",
      "개선조치 계획서·결과서 및 현장 사진",
    ],
    requiredItems: [
      "유해·위험요인 및 확인사항",
      "확인일자·조치일자",
      "조치사항과 증빙자료",
    ],
  },
  {
    id: "OBL-10",
    step: "④",
    title: "관계 법령상 의무 이행",
    law: "중대재해 처벌 등에 관한 법률 시행령 제11조 제2항 제1호·제3호",
    tableTitle: "관계 법령상 의무이행",
    kind: "law",
    inputGuide:
      "적용 관계법령의 조치일자와 증빙을 등록합니다. 법정교육은 아래 별도 표에서 교육명부와 함께 관리합니다.",
    addLabel: "관계 법령 이행사항 추가",
    evidenceExamples: [
      "관계 법령별 점검·조치 결과서",
      "법정교육 수료증, 교육 결과보고서 및 참석 명부",
    ],
    requiredItems: [
      "적용 법령 및 조항",
      "조치일자와 조치 근거",
      "법정교육은 교육명부와 일반 증빙을 함께 첨부",
    ],
  },
];

const dutyMap = Object.fromEntries(
  DUTY_STEPS.map(duty => [duty.id, duty])
) as Record<StepId, DutyStep>;

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 31,
  boxSizing: "border-box",
  border: "1px solid #c8ced0",
  borderRadius: 0,
  padding: "5px 7px",
  background: "#fff",
  color: "#26322c",
  fontSize: 12,
};

const tableHeaderStyle: CSSProperties = {
  border: "1px solid #c8ced0",
  padding: "8px 6px",
  background: "#eef0f1",
  color: "#303838",
  fontSize: 12,
  fontWeight: 700,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tableCellStyle: CSSProperties = {
  border: "1px solid #d0d5d3",
  padding: 6,
  verticalAlign: "middle",
  background: "#fff",
  fontSize: 12,
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function savedAttachment(fileName?: string): Attachment[] {
  if (!fileName || fileName === "선택된 파일 없음") return [];
  return fileName
    .split(" | ")
    .filter(Boolean)
    .map((name, index) => ({ id: `saved-${index}-${name}`, name }));
}

function getSeedRows(
  id: StepId,
  saved?: { actionDate: string; note: string; fileName: string }
): EvidenceRow[] {
  const common = {
    id: createId(id),
    date: saved?.actionDate || DEFAULT_DATE,
    note: saved?.note || "",
    attachments: savedAttachment(saved?.fileName),
  };

  switch (id) {
    case "OBL-01":
      return [
        {
          ...common,
          category: "안전보건관리책임자",
          content: "김안전",
          detail: "시민안전관",
        },
      ];
    case "OBL-02":
      return [
        "안전점검비",
        "보수보강비",
        "안전조치비",
        "교육·훈련비",
        "기타",
      ].map((category, index) => ({
        ...common,
        id: createId(`budget-${index}`),
        category,
        amount: "0",
        executionAmount: "0",
        content: "",
        detail: "",
        attachments: index === 0 ? common.attachments : [],
      }));
    case "OBL-03":
      return [
        { ...common, category: "시설물 정기안전점검", content: "", detail: "" },
      ];
    case "OBL-05":
      return [
        { ...common, category: "연간 안전계획 수립", content: "", detail: "" },
      ];
    case "OBL-06":
      return [
        {
          ...common,
          category: "유해·위험요인",
          content: "확인사항을 입력하세요",
          detail: "조치사항을 입력하세요",
          secondaryDate: DEFAULT_DATE,
        },
      ];
    case "OBL-10":
      return [
        {
          ...common,
          category: "법률",
          lawName: "시설물의 안전 및 유지관리에 관한 특별법",
          article: "제11조",
          content: "시설물 정기점검 및 유지관리 조치",
          detail: "",
        },
      ];
  }
}

function getEducationSeed(): EvidenceRow[] {
  return [
    {
      id: createId("education"),
      category: "시설물 안전관리 교육",
      lawName: "시설물의 안전 및 유지관리에 관한 특별법",
      article: "제11조",
      date: DEFAULT_DATE,
      content: "시설관리 담당자",
      detail: "용인시 안전교육센터",
      note: "",
      attachments: [],
    },
  ];
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AttachmentCell({
  row,
  inputId,
  onSelect,
  onDelete,
  onDownload,
}: {
  row: EvidenceRow;
  inputId: string;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (attachmentId: string) => void;
  onDownload: (attachment: Attachment) => void;
}) {
  return (
    <div
      className="adoms-attachment-cell"
      style={{ display: "grid", gap: 5, minWidth: 178 }}
    >
      <input
        id={inputId}
        type="file"
        style={{ display: "none" }}
        onChange={onSelect}
      />
      {row.attachments.length === 0 ? (
        <div
          className="adoms-empty-file"
          style={{
            minHeight: 28,
            display: "flex",
            alignItems: "center",
            padding: "0 7px",
            border: "1px solid #d1d6d3",
            background: "#f6f7f6",
            color: "#707a73",
            fontSize: 11,
          }}
        >
          선택 파일 없음
        </div>
      ) : (
        row.attachments.map(attachment => (
          <div
            className="adoms-file-line"
            key={attachment.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 26px 26px",
              gap: 3,
              alignItems: "center",
            }}
          >
            <span
              title={attachment.name}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minHeight: 28,
                display: "flex",
                alignItems: "center",
                padding: "0 7px",
                border: "1px solid #d1d6d3",
                background: "#f6f7f6",
                color: "#4c5850",
                fontSize: 11,
              }}
            >
              {attachment.name}
            </span>
            <button
              className="adoms-file-action"
              type="button"
              aria-label={`${attachment.name} 다운로드`}
              title="다운로드"
              onClick={() => onDownload(attachment)}
              style={{ ...iconButtonStyle, width: 26, height: 28 }}
            >
              <Download size={14} />
            </button>
            <button
              className="adoms-file-action"
              type="button"
              aria-label={`${attachment.name} 삭제`}
              title="삭제"
              onClick={() => onDelete(attachment.id)}
              style={{ ...iconButtonStyle, width: 26, height: 28 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}
      <div
        className="adoms-file-actions"
        style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}
      >
        <label
          htmlFor={inputId}
          className="adoms-file-select"
          style={{
            ...smallButtonStyle,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <FileUp size={13} /> 파일선택
        </label>
        <label
          htmlFor={inputId}
          className="adoms-file-add"
          aria-label="증빙자료 추가"
          title="증빙자료 추가"
          style={{
            ...iconButtonStyle,
            cursor: "pointer",
            width: 29,
            height: 27,
          }}
        >
          <Plus size={15} />
        </label>
      </div>
    </div>
  );
}

const iconButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #aeb8b2",
  borderRadius: 1,
  background: "#fff",
  color: "#38463d",
  padding: 0,
};

const smallButtonStyle: CSSProperties = {
  minHeight: 27,
  border: "1px solid #78877d",
  borderRadius: 1,
  background: "#fff",
  color: "#2f4135",
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 600,
};

export default function Evidence() {
  const { selectedTargetId, evidence, saveEvidence } = useDemo();
  const target =
    targets.find(item => item.id === selectedTargetId) || targets[0];
  const [activeId, setActiveId] = useState<StepId>("OBL-01");
  const [rowSets, setRowSets] = useState<Record<string, EvidenceRow[]>>({});
  const [educationRows, setEducationRows] =
    useState<EvidenceRow[]>(getEducationSeed);
  const activeDuty = dutyMap[activeId];

  const getRows = (id: StepId) => rowSets[id] || getSeedRows(id, evidence[id]);
  const activeRows = getRows(activeId);

  const setRows = (
    id: StepId,
    updater: (current: EvidenceRow[]) => EvidenceRow[]
  ) => {
    setRowSets(current => ({
      ...current,
      [id]: updater(current[id] || getSeedRows(id, evidence[id])),
    }));
  };

  const updateRow = (
    id: StepId,
    rowId: string,
    patch: Partial<EvidenceRow>
  ) => {
    setRows(id, rows =>
      rows.map(row => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const addRow = (id: StepId) => {
    const duty = dutyMap[id];
    const template = getSeedRows(id)[0];
    const categoryByKind: Record<TableKind, string> = {
      personnel: "안전관리자",
      budget: "기타",
      inspection: "안전점검 항목",
      plan: "안전계획 항목",
      procedure: "유해·위험요인",
      law: "법률",
    };
    setRows(id, rows => [
      ...rows,
      {
        ...template,
        id: createId(id),
        category: categoryByKind[duty.kind],
        date: DEFAULT_DATE,
        secondaryDate: duty.kind === "procedure" ? DEFAULT_DATE : undefined,
        content: "",
        detail: "",
        note: "",
        amount: duty.kind === "budget" ? "0" : undefined,
        executionAmount: duty.kind === "budget" ? "0" : undefined,
        attachments: [],
      },
    ]);
  };

  const deleteRow = (id: StepId, rowId: string) => {
    setRows(id, rows =>
      rows.length === 1 ? rows : rows.filter(row => row.id !== rowId)
    );
  };

  const addAttachment = (
    id: StepId,
    rowId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("증빙자료는 파일 1개당 10MB 이하만 등록할 수 있습니다.");
      return;
    }
    setRows(id, rows =>
      rows.map(row =>
        row.id === rowId
          ? {
              ...row,
              attachments: [
                ...row.attachments,
                { id: createId("file"), name: file.name, file },
              ],
            }
          : row
      )
    );
  };

  const deleteAttachment = (
    id: StepId,
    rowId: string,
    attachmentId: string
  ) => {
    setRows(id, rows =>
      rows.map(row =>
        row.id === rowId
          ? {
              ...row,
              attachments: row.attachments.filter(
                attachment => attachment.id !== attachmentId
              ),
            }
          : row
      )
    );
  };

  const downloadAttachment = (attachment: Attachment) => {
    if (attachment.file) {
      downloadBlob(attachment.file, attachment.name);
      return;
    }
    downloadBlob(
      new Blob(
        [
          `등록 파일명: ${attachment.name}\n실제 파일은 현재 브라우저 세션에서 선택한 파일만 내려받을 수 있습니다.`,
        ],
        { type: "text/plain;charset=utf-8" }
      ),
      `${attachment.name}.txt`
    );
    toast.info("저장된 파일명 정보로 안내 파일을 내려받았습니다.");
  };

  const saveCurrent = (rows = activeRows, label = activeDuty.tableTitle) => {
    const firstRow = rows[0];
    if (!firstRow) return;
    const names = rows.flatMap(row =>
      row.attachments.map(attachment => attachment.name)
    );
    saveEvidence(activeDuty.id, {
      actionDate: firstRow.date,
      note: `${firstRow.content}${firstRow.note ? ` · ${firstRow.note}` : ""}`.trim(),
      fileName: names.length ? names.join(" | ") : "선택된 파일 없음",
      uploadedAt: new Date().toISOString(),
    });
    toast.success(`${label} 실적과 증빙자료를 저장했습니다.`);
  };

  const updateEducationRow = (rowId: string, patch: Partial<EvidenceRow>) => {
    setEducationRows(rows =>
      rows.map(row => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const addEducationAttachment = (
    rowId: string,
    event: ChangeEvent<HTMLInputElement>,
    roster = false
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("증빙자료는 파일 1개당 10MB 이하만 등록할 수 있습니다.");
      return;
    }
    const attachment = {
      id: createId(roster ? "roster" : "education-file"),
      name: file.name,
      file,
    };
    setEducationRows(rows =>
      rows.map(row =>
        row.id === rowId
          ? {
              ...row,
              roster: roster ? attachment : row.roster,
              attachments: roster
                ? row.attachments
                : [...row.attachments, attachment],
            }
          : row
      )
    );
  };

  const renderAttachment = (
    row: EvidenceRow,
    scope: "main" | "education" = "main"
  ) => (
    <AttachmentCell
      row={row}
      inputId={`${scope}-${activeDuty.id}-${row.id}`}
      onSelect={event =>
        scope === "main"
          ? addAttachment(activeDuty.id, row.id, event)
          : addEducationAttachment(row.id, event)
      }
      onDelete={attachmentId =>
        scope === "main"
          ? deleteAttachment(activeDuty.id, row.id, attachmentId)
          : setEducationRows(rows =>
              rows.map(educationRow =>
                educationRow.id === row.id
                  ? {
                      ...educationRow,
                      attachments: educationRow.attachments.filter(
                        attachment => attachment.id !== attachmentId
                      ),
                    }
                  : educationRow
              )
            )
      }
      onDownload={downloadAttachment}
    />
  );

  const removeEducationRow = (rowId: string) => {
    setEducationRows(rows =>
      rows.length === 1 ? rows : rows.filter(row => row.id !== rowId)
    );
  };

  const addEducationRow = () => {
    setEducationRows(rows => [
      ...rows,
      { ...getEducationSeed()[0], id: createId("education") },
    ]);
  };

  const downloadRosterSample = () => {
    downloadBlob(
      new Blob(["성명,소속(부서),교육일자,서명\n"], {
        type: "text/csv;charset=utf-8",
      }),
      "법정교육_교육명부_양식.csv"
    );
    toast.success("법정교육 교육명부 양식을 내려받았습니다.");
  };

  const addRoster = (rowId: string, event: ChangeEvent<HTMLInputElement>) =>
    addEducationAttachment(rowId, event, true);

  const renderPersonnelTable = () => (
    <table className="adoms-grid-table" style={tableStyle}>
      <thead>
        <tr>
          <th style={tableHeaderStyle}>직급</th>
          <th style={tableHeaderStyle}>배치 일자</th>
          <th colSpan={2} style={tableHeaderStyle}>
            인적사항
          </th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle} aria-label="삭제" />
        </tr>
        <tr>
          <th style={{ ...tableHeaderStyle, background: "#f5f6f6" }} />
          <th style={{ ...tableHeaderStyle, background: "#f5f6f6" }} />
          <th style={{ ...tableHeaderStyle, background: "#f5f6f6" }}>이름</th>
          <th style={{ ...tableHeaderStyle, background: "#f5f6f6" }}>
            소속(부서)
          </th>
          <th style={{ ...tableHeaderStyle, background: "#f5f6f6" }} />
          <th style={{ ...tableHeaderStyle, background: "#f5f6f6" }} />
          <th style={{ ...tableHeaderStyle, background: "#f5f6f6" }} />
        </tr>
      </thead>
      <tbody>
        {activeRows.map(row => (
          <tr key={row.id}>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.category}
                aria-label="직급"
                onChange={event =>
                  updateRow(activeId, row.id, { category: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                type="date"
                value={row.date}
                aria-label="배치 일자"
                onChange={event =>
                  updateRow(activeId, row.id, { date: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.content}
                aria-label="이름"
                onChange={event =>
                  updateRow(activeId, row.id, { content: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.detail}
                aria-label="소속 부서"
                onChange={event =>
                  updateRow(activeId, row.id, { detail: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.note}
                aria-label="비고"
                onChange={event =>
                  updateRow(activeId, row.id, { note: event.target.value })
                }
              />
            </td>
            <td style={{ ...tableCellStyle, textAlign: "center" }}>
              <button
                className="adoms-row-delete"
                type="button"
                aria-label="행 삭제"
                title="행 삭제"
                onClick={() => deleteRow(activeId, row.id)}
                style={{ ...iconButtonStyle, width: 29, height: 30 }}
              >
                <Trash2 size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderBudgetTable = () => (
    <table className="adoms-grid-table" style={tableStyle}>
      <thead>
        <tr>
          <th style={tableHeaderStyle}>예산 항목</th>
          <th style={tableHeaderStyle}>
            편성액
            <br />
            (천원)
          </th>
          <th style={tableHeaderStyle}>집행 일자</th>
          <th style={tableHeaderStyle}>집행 내역</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
          <th style={tableHeaderStyle}>집행액</th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle} aria-label="삭제" />
        </tr>
      </thead>
      <tbody>
        {activeRows.map(row => (
          <tr key={row.id}>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.category}
                aria-label="예산 항목"
                onChange={event =>
                  updateRow(activeId, row.id, { category: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={{ ...inputStyle, textAlign: "right" }}
                type="number"
                min="0"
                value={row.amount || "0"}
                aria-label="편성액"
                onChange={event =>
                  updateRow(activeId, row.id, { amount: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                type="date"
                value={row.date}
                aria-label="집행 일자"
                onChange={event =>
                  updateRow(activeId, row.id, { date: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.content}
                aria-label="집행 내역"
                onChange={event =>
                  updateRow(activeId, row.id, { content: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
            <td style={tableCellStyle}>
              <input
                style={{ ...inputStyle, textAlign: "right" }}
                type="number"
                min="0"
                value={row.executionAmount || "0"}
                aria-label="집행액"
                onChange={event =>
                  updateRow(activeId, row.id, {
                    executionAmount: event.target.value,
                  })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.note}
                aria-label="비고"
                onChange={event =>
                  updateRow(activeId, row.id, { note: event.target.value })
                }
              />
            </td>
            <td style={{ ...tableCellStyle, textAlign: "center" }}>
              <button
                className="adoms-row-delete"
                type="button"
                aria-label="행 삭제"
                title="행 삭제"
                onClick={() => deleteRow(activeId, row.id)}
                style={{ ...iconButtonStyle, width: 29, height: 30 }}
              >
                <Trash2 size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderInspectionTable = () => (
    <table className="adoms-grid-table" style={tableStyle}>
      <thead>
        <tr>
          <th style={tableHeaderStyle}>점검 항목</th>
          <th style={tableHeaderStyle}>점검 일자</th>
          <th style={tableHeaderStyle}>점검결과 및 조치내역</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle} aria-label="삭제" />
        </tr>
      </thead>
      <tbody>
        {activeRows.map(row => (
          <tr key={row.id}>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.category}
                aria-label="점검 항목"
                onChange={event =>
                  updateRow(activeId, row.id, { category: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                type="date"
                value={row.date}
                aria-label="점검 일자"
                onChange={event =>
                  updateRow(activeId, row.id, { date: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.content}
                aria-label="점검결과 및 조치내역"
                onChange={event =>
                  updateRow(activeId, row.id, { content: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.note}
                aria-label="비고"
                onChange={event =>
                  updateRow(activeId, row.id, { note: event.target.value })
                }
              />
            </td>
            <td style={{ ...tableCellStyle, textAlign: "center" }}>
              <button
                className="adoms-row-delete"
                type="button"
                aria-label="행 삭제"
                title="행 삭제"
                onClick={() => deleteRow(activeId, row.id)}
                style={{ ...iconButtonStyle, width: 29, height: 30 }}
              >
                <Trash2 size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderPlanTable = () => (
    <table className="adoms-grid-table" style={tableStyle}>
      <thead>
        <tr>
          <th style={tableHeaderStyle}>안전계획 항목</th>
          <th style={tableHeaderStyle}>이행 일자</th>
          <th style={tableHeaderStyle}>이행 내역</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle} aria-label="삭제" />
        </tr>
      </thead>
      <tbody>
        {activeRows.map(row => (
          <tr key={row.id}>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.category}
                aria-label="안전계획 항목"
                onChange={event =>
                  updateRow(activeId, row.id, { category: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                type="date"
                value={row.date}
                aria-label="이행 일자"
                onChange={event =>
                  updateRow(activeId, row.id, { date: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.content}
                aria-label="이행 내역"
                onChange={event =>
                  updateRow(activeId, row.id, { content: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.note}
                aria-label="비고"
                onChange={event =>
                  updateRow(activeId, row.id, { note: event.target.value })
                }
              />
            </td>
            <td style={{ ...tableCellStyle, textAlign: "center" }}>
              <button
                className="adoms-row-delete"
                type="button"
                aria-label="행 삭제"
                title="행 삭제"
                onClick={() => deleteRow(activeId, row.id)}
                style={{ ...iconButtonStyle, width: 29, height: 30 }}
              >
                <Trash2 size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderProcedureTable = () => (
    <table className="adoms-grid-table" style={tableStyle}>
      <thead>
        <tr>
          <th style={tableHeaderStyle}>유해·위험 요인</th>
          <th style={tableHeaderStyle}>확인사항</th>
          <th style={tableHeaderStyle}>확인 일자</th>
          <th style={tableHeaderStyle}>조치사항</th>
          <th style={tableHeaderStyle}>조치일자</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle} aria-label="삭제" />
        </tr>
      </thead>
      <tbody>
        {activeRows.map(row => (
          <tr key={row.id}>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.category}
                aria-label="유해 위험 요인"
                onChange={event =>
                  updateRow(activeId, row.id, { category: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.content}
                aria-label="확인사항"
                onChange={event =>
                  updateRow(activeId, row.id, { content: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                type="date"
                value={row.date}
                aria-label="확인 일자"
                onChange={event =>
                  updateRow(activeId, row.id, { date: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.detail}
                aria-label="조치사항"
                onChange={event =>
                  updateRow(activeId, row.id, { detail: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                type="date"
                value={row.secondaryDate || ""}
                aria-label="조치 일자"
                onChange={event =>
                  updateRow(activeId, row.id, {
                    secondaryDate: event.target.value,
                  })
                }
              />
            </td>
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.note}
                aria-label="비고"
                onChange={event =>
                  updateRow(activeId, row.id, { note: event.target.value })
                }
              />
            </td>
            <td style={{ ...tableCellStyle, textAlign: "center" }}>
              <button
                className="adoms-row-delete"
                type="button"
                aria-label="행 삭제"
                title="행 삭제"
                onClick={() => deleteRow(activeId, row.id)}
                style={{ ...iconButtonStyle, width: 29, height: 30 }}
              >
                <Trash2 size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderLawTable = () => (
    <table className="adoms-grid-table" style={tableStyle}>
      <thead>
        <tr>
          <th style={tableHeaderStyle}>구분</th>
          <th style={tableHeaderStyle}>법령명</th>
          <th style={tableHeaderStyle}>법령내용</th>
          <th style={tableHeaderStyle}>조치 일자</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle} aria-label="삭제" />
        </tr>
      </thead>
      <tbody>
        {activeRows.map(row => (
          <tr key={row.id}>
            <td style={tableCellStyle}>
              <div style={{ display: "grid", gap: 4 }}>
                <input
                  style={{ ...inputStyle, background: "#f1f3f2" }}
                  value={row.category}
                  aria-label="법령 구분"
                  onChange={event =>
                    updateRow(activeId, row.id, {
                      category: event.target.value,
                    })
                  }
                />
                <input
                  style={{ ...inputStyle, background: "#f1f3f2" }}
                  value={row.article || ""}
                  aria-label="조항"
                  onChange={event =>
                    updateRow(activeId, row.id, { article: event.target.value })
                  }
                />
              </div>
            </td>
            <td style={tableCellStyle}>
              <input
                style={{ ...inputStyle, background: "#f1f3f2" }}
                value={row.lawName || ""}
                aria-label="법령명"
                onChange={event =>
                  updateRow(activeId, row.id, { lawName: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.content}
                aria-label="법령내용"
                onChange={event =>
                  updateRow(activeId, row.id, { content: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                type="date"
                value={row.date}
                aria-label="조치 일자"
                onChange={event =>
                  updateRow(activeId, row.id, { date: event.target.value })
                }
              />
            </td>
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.note}
                aria-label="비고"
                onChange={event =>
                  updateRow(activeId, row.id, { note: event.target.value })
                }
              />
            </td>
            <td style={{ ...tableCellStyle, textAlign: "center" }}>
              <button
                className="adoms-row-delete"
                type="button"
                aria-label="행 삭제"
                title="행 삭제"
                onClick={() => deleteRow(activeId, row.id)}
                style={{ ...iconButtonStyle, width: 29, height: 30 }}
              >
                <Trash2 size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderEducationTable = () => (
    <section className="adoms-education-section" style={{ marginTop: 24 }}>
      <h3 style={{ margin: "0 0 9px", fontSize: 15, color: "#26362d" }}>
        관계 법령상 법정교육 이수
      </h3>
      <div style={{ overflowX: "auto", border: "1px solid #c8ced0" }}>
        <table className="adoms-grid-table" style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>법정교육명</th>
              <th style={tableHeaderStyle}>법령명</th>
              <th style={tableHeaderStyle}>조항</th>
              <th style={tableHeaderStyle}>교육대상</th>
              <th style={tableHeaderStyle}>교육기관</th>
              <th style={tableHeaderStyle}>교육 일자</th>
              <th style={tableHeaderStyle}>
                증빙자료
                <br />
                <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
              </th>
              <th style={tableHeaderStyle}>비고</th>
              <th style={tableHeaderStyle} aria-label="삭제" />
            </tr>
          </thead>
          <tbody>
            {educationRows.map(row => (
              <tr key={row.id}>
                <td style={tableCellStyle}>
                  <input
                    style={inputStyle}
                    value={row.category}
                    aria-label="법정교육명"
                    onChange={event =>
                      updateEducationRow(row.id, {
                        category: event.target.value,
                      })
                    }
                  />
                </td>
                <td style={tableCellStyle}>
                  <input
                    style={{ ...inputStyle, background: "#f1f3f2" }}
                    value={row.lawName || ""}
                    aria-label="법령명"
                    onChange={event =>
                      updateEducationRow(row.id, {
                        lawName: event.target.value,
                      })
                    }
                  />
                </td>
                <td style={tableCellStyle}>
                  <input
                    style={{ ...inputStyle, background: "#f1f3f2" }}
                    value={row.article || ""}
                    aria-label="조항"
                    onChange={event =>
                      updateEducationRow(row.id, {
                        article: event.target.value,
                      })
                    }
                  />
                </td>
                <td style={tableCellStyle}>
                  <input
                    style={inputStyle}
                    value={row.content}
                    aria-label="교육대상"
                    onChange={event =>
                      updateEducationRow(row.id, {
                        content: event.target.value,
                      })
                    }
                  />
                </td>
                <td style={tableCellStyle}>
                  <input
                    style={inputStyle}
                    value={row.detail}
                    aria-label="교육기관"
                    onChange={event =>
                      updateEducationRow(row.id, { detail: event.target.value })
                    }
                  />
                </td>
                <td style={tableCellStyle}>
                  <input
                    style={inputStyle}
                    type="date"
                    value={row.date}
                    aria-label="교육 일자"
                    onChange={event =>
                      updateEducationRow(row.id, { date: event.target.value })
                    }
                  />
                </td>
                <td style={tableCellStyle}>
                  <div
                    className="adoms-roster-control"
                    style={{ display: "grid", gap: 5, minWidth: 190 }}
                  >
                    <input
                      id={`roster-${row.id}`}
                      type="file"
                      style={{ display: "none" }}
                      onChange={event => addRoster(row.id, event)}
                    />
                    <div
                      style={{ display: "flex", gap: 4, alignItems: "center" }}
                    >
                      <span
                        title={row.roster?.name}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minHeight: 27,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 6px",
                          border: "1px solid #d1d6d3",
                          background: "#f6f7f6",
                          color: "#68746b",
                          fontSize: 11,
                        }}
                      >
                        {row.roster?.name || "선택 파일 없음"}
                      </span>
                      <label
                        htmlFor={`roster-${row.id}`}
                        className="adoms-roster-select"
                        style={{
                          ...smallButtonStyle,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        명부선택
                      </label>
                      <button
                        className="adoms-roster-sample"
                        type="button"
                        onClick={downloadRosterSample}
                        style={{ ...smallButtonStyle, whiteSpace: "nowrap" }}
                      >
                        샘플다운
                      </button>
                    </div>
                    {renderAttachment(row, "education")}
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <input
                    style={inputStyle}
                    value={row.note}
                    aria-label="비고"
                    onChange={event =>
                      updateEducationRow(row.id, { note: event.target.value })
                    }
                  />
                </td>
                <td style={{ ...tableCellStyle, textAlign: "center" }}>
                  <button
                    className="adoms-row-delete"
                    type="button"
                    aria-label="행 삭제"
                    title="행 삭제"
                    onClick={() => removeEducationRow(row.id)}
                    style={{ ...iconButtonStyle, width: 29, height: 30 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="adoms-table-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 9,
        }}
      >
        <button
          className="adoms-add-button"
          type="button"
          onClick={addEducationRow}
          style={{
            ...smallButtonStyle,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            borderColor: "#b23d99",
            color: "#8b256f",
          }}
        >
          <Plus size={14} /> 관계 법령 이행사항 추가
        </button>
        <button
          className="adoms-save-button"
          type="button"
          onClick={() =>
            saveCurrent(educationRows, "관계 법령상 법정교육 이수")
          }
          style={{ ...saveButtonStyle }}
        >
          <Save size={14} /> 저장
        </button>
      </div>
    </section>
  );

  const tableByKind: Record<TableKind, () => ReactElement> = {
    personnel: renderPersonnelTable,
    budget: renderBudgetTable,
    inspection: renderInspectionTable,
    plan: renderPlanTable,
    procedure: renderProcedureTable,
    law: renderLawTable,
  };

  return (
    <div
      className="adoms-evidence-page"
      style={{ maxWidth: 1540, margin: "0 auto", color: "#28342d" }}
    >
      <div
        className="adoms-evidence-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "220px minmax(0, 1fr)",
          gap: 22,
          alignItems: "start",
        }}
      >
        <aside
          className="adoms-duty-sidebar"
          aria-label="의무이행 단계"
          style={{ border: "1px solid #d6d6dc", background: "#f2f2f4" }}
        >
          <div
            className="adoms-duty-sidebar-title"
            style={{
              padding: "14px 15px",
              background: "#a93193",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            의무사항(실적증빙)
          </div>
          <div
            className="adoms-track-label"
            style={{
              padding: "13px 15px 9px",
              color: "#a93193",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ● 공중이용시설·교통수단
          </div>
          <div
            className="adoms-group-label"
            style={{
              margin: "5px 10px 4px",
              padding: "9px 10px",
              border: "1px solid #d9b4d1",
              background: "#f2f2f4",
              color: "#4f4f55",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            ① 안전보건관리체계 구축 및 이행
          </div>
          <div
            className="adoms-step-list"
            style={{ padding: "2px 10px 14px", display: "grid", gap: 3 }}
          >
            {DUTY_STEPS.filter(duty => duty.id !== "OBL-10").map(duty => (
              <button
                key={duty.id}
                className="adoms-step-button"
                type="button"
                onClick={() => setActiveId(duty.id)}
                style={{
                  ...stepButtonStyle,
                  ...(activeId === duty.id ? activeStepButtonStyle : {}),
                }}
              >
                <b>{duty.step}</b> {duty.title}
              </button>
            ))}
          </div>
          <div
            className="adoms-inactive-group"
            style={{
              margin: "0 10px 7px",
              padding: "8px 10px",
              borderTop: "1px solid #d7e0d5",
              color: "#839087",
              fontSize: 11,
            }}
          >
            ② 재해발생시 재발방지 대책 수립 및 이행
          </div>
          <div
            className="adoms-inactive-group"
            style={{
              margin: "0 10px 7px",
              padding: "8px 10px",
              borderTop: "1px solid #d7e0d5",
              color: "#839087",
              fontSize: 11,
            }}
          >
            ③ 개선·시정 등을 명한 사항 이행
          </div>
          <div
            className="adoms-law-step"
            style={{
              padding: "10px 10px 16px",
              borderTop: "1px solid #d7e0d5",
            }}
          >
            <button
              className="adoms-step-button"
              type="button"
              onClick={() => setActiveId("OBL-10")}
              style={{
                ...stepButtonStyle,
                ...(activeId === "OBL-10" ? activeStepButtonStyle : {}),
              }}
            >
              <b>④</b> 관계 법령상 의무 이행
            </button>
          </div>
        </aside>

        <main className="adoms-duty-content" style={{ minWidth: 0 }}>
          <header
            className="adoms-duty-header"
            style={{
              borderBottom: "2px solid #a93193",
              paddingBottom: 15,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                margin: "0 0 5px",
                color: "#58665d",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              법 의무이행 조치
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 18,
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    color: "#273a2d",
                    fontSize: 23,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {activeDuty.title}
                </h1>
                <p
                  className="adoms-law-basis"
                  style={{ margin: "7px 0 0", color: "#526158", fontSize: 12 }}
                >
                  근거: {activeDuty.law}
                </p>
              </div>
              <div
                className="adoms-target-display"
                style={{
                  minWidth: 190,
                  border: "1px solid #bec9c0",
                  background: "#f7f8f7",
                  display: "grid",
                  gridTemplateColumns: "52px 1fr",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 5px",
                    color: "#fff",
                    background: "#55565c",
                    fontWeight: 700,
                  }}
                >
                  대상
                </span>
                <strong
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 10px",
                    color: "#2f3f34",
                  }}
                >
                  {target.name}
                </strong>
              </div>
            </div>
            <p style={{ margin: "9px 0 0", color: "#6e7971", fontSize: 12 }}>
              {target.name} · {target.department} · 해당년도: 2026년
            </p>
          </header>

          <section
            className="adoms-duty-table-section"
            aria-labelledby="adoms-table-title"
          >
            <div
              className="adoms-table-heading"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <h2
                id="adoms-table-title"
                style={{ margin: 0, color: "#2a3b2f", fontSize: 16 }}
              >
                {activeDuty.tableTitle}
              </h2>
              <span style={{ color: "#727d75", fontSize: 11 }}>
                증빙자료는 파일 1개당 10MB 이하
              </span>
            </div>
            <p
              className="adoms-input-guide"
              style={{
                margin: "0 0 10px",
                color: "#5f6c63",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {activeDuty.inputGuide}
            </p>
            <div
              className="adoms-grid-wrap"
              style={{ overflowX: "auto", border: "1px solid #c8ced0" }}
            >
              {tableByKind[activeDuty.kind]()}
            </div>
            <div
              className="adoms-table-actions"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 10,
              }}
            >
              <button
                className="adoms-add-button"
                type="button"
                onClick={() => addRow(activeId)}
                style={{
                  ...smallButtonStyle,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  borderColor: "#b23d99",
                  color: "#8b256f",
                }}
              >
                <Plus size={14} /> {activeDuty.addLabel}
              </button>
              <button
                className="adoms-save-button"
                type="button"
                onClick={() => saveCurrent()}
                style={saveButtonStyle}
              >
                <Save size={14} /> 저장
              </button>
            </div>
          </section>

          {activeId === "OBL-10" && renderEducationTable()}

          <section
            className="adoms-evidence-viewer"
            style={{
              marginTop: 25,
              border: "1px solid #d2d7d3",
              background: "#f4f5f5",
              minHeight: 142,
              padding: "14px 16px",
            }}
          >
            <h2 style={{ margin: 0, color: "#35463b", fontSize: 14 }}>
              이미지 뷰어
            </h2>
            <div
              style={{
                minHeight: 98,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#9aa39c",
              }}
            >
              <ImageIcon size={29} strokeWidth={1.3} />
              <span style={{ marginTop: 6, fontSize: 11 }}>
                선택한 증빙자료를 확인할 수 있습니다.
              </span>
            </div>
          </section>

          <section
            className="adoms-evidence-guide"
            style={{
              marginTop: 14,
              border: "1px solid #cbd2cd",
              background: "#fff",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "#334b39",
              }}
            >
              <FilePlus2 size={16} />
              <h2 style={{ margin: 0, fontSize: 14 }}>증빙자료 예시</h2>
            </div>
            <ul
              style={{
                margin: "9px 0 14px",
                paddingLeft: 18,
                color: "#536158",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              {activeDuty.evidenceExamples.map(example => (
                <li key={example}>{example}</li>
              ))}
            </ul>
            <div
              className="adoms-required-items"
              style={{ borderTop: "1px solid #e0e4e1", paddingTop: 10 }}
            >
              <strong style={{ color: "#36483b", fontSize: 12 }}>
                필수내역
              </strong>
              <ol
                style={{
                  margin: "7px 0 0",
                  paddingLeft: 20,
                  color: "#536158",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                {activeDuty.requiredItems.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: 880,
  borderCollapse: "collapse",
  tableLayout: "auto",
};

const stepButtonStyle: CSSProperties = {
  width: "100%",
  border: "1px solid transparent",
  borderRadius: 0,
  background: "transparent",
  color: "#425248",
  padding: "8px 8px",
  textAlign: "left",
  fontSize: 12,
  lineHeight: 1.35,
  cursor: "pointer",
};

const activeStepButtonStyle: CSSProperties = {
  borderColor: "#d890ca",
  background: "#f7e7f3",
  color: "#8b256f",
  fontWeight: 700,
};

const saveButtonStyle: CSSProperties = {
  minHeight: 31,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  border: "1px solid #8b256f",
  borderRadius: 1,
  background: "#a93193",
  color: "#fff",
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 700,
};
