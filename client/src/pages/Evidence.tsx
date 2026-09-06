import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
} from "react";
import { Clock3, Download, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ComplianceStatus } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";
import {
  loadManagedTargets,
  LOCAL_MANAGED_TARGETS,
  type ManagedTargetRow,
} from "@/lib/facility-api";
import {
  downloadEvidenceFile,
  loadComplianceActionLog,
  loadComplianceExportEvents,
  loadEvidenceMetadata,
  loadEvidenceMetadataByComplianceIds,
  loadFacilityWorkflow,
  logComplianceCsvExport,
  resolveEvidenceSaveStatus,
  saveEvidenceRecord,
  toKoreanStatus,
  type ComplianceActionLogEntry,
  type ComplianceExportEvent,
  type EvidenceMetadata,
  type FacilityWorkflowItem,
} from "@/lib/facility-workflow-api";
import { csvDateStamp, downloadCsv, serializeCsv } from "@/lib/csv";
import {
  MY_WORK_FILE_ACCEPT,
  MY_WORK_FILE_GUIDE,
  validateMyWorkFile,
} from "@/lib/my-work-files";

type StepId = string;
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
  metadata?: EvidenceMetadata;
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

  return [
    {
      ...common,
      category: "법률",
      lawName: "관계 법령",
      article: "근거 조항",
      content: "이행·조치 내용을 입력하세요",
      detail: "",
    },
  ];
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

function formatLogDateTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
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
      style={{ display: "grid", gap: 5, minWidth: 178, justifyItems: "end" }}
    >
      <input
        id={inputId}
        type="file"
        accept={MY_WORK_FILE_ACCEPT}
        style={{ display: "none" }}
        onChange={onSelect}
      />
      {row.attachments.map(attachment => (
        <div
          className="adoms-file-line"
          key={attachment.id}
          style={{
            display: "grid",
            gridTemplateColumns: attachment.file
              ? "minmax(0, 1fr) 26px 26px"
              : "minmax(0, 1fr) 26px",
            gap: 3,
            alignItems: "center",
            width: "100%",
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
          {attachment.file && (
            <button
              className="adoms-file-action"
              type="button"
              aria-label={`${attachment.name} 선택 취소`}
              title="선택 취소"
              onClick={() => onDelete(attachment.id)}
              style={{ ...iconButtonStyle, width: 26, height: 28 }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      <div
        className="adoms-file-actions"
        style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
      >
        <label
          htmlFor={inputId}
          className="adoms-file-select"
          aria-label="파일 첨부"
          title={`파일 첨부 · ${MY_WORK_FILE_GUIDE}`}
          style={{
            ...smallButtonStyle,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            minHeight: 30,
            padding: 0,
          }}
        >
          <Paperclip size={14} aria-hidden="true" />
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
  borderRadius: 8,
  background: "#fff",
  color: "#38463d",
  padding: 0,
};

const smallButtonStyle: CSSProperties = {
  minHeight: 27,
  border: "1px solid #cfd8e1",
  borderRadius: 8,
  background: "#fff",
  color: "#1d6fa3",
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 600,
};

export default function Evidence() {
  const {
    role,
    selectedTargetId,
    setSelectedTargetId,
    evidence,
    saveEvidence,
  } = useDemo();
  const [managedTargets, setManagedTargets] = useState<ManagedTargetRow[]>(
    LOCAL_MANAGED_TARGETS
  );
  const [workflowItems, setWorkflowItems] = useState<FacilityWorkflowItem[]>(
    []
  );
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionLog, setActionLog] = useState<ComplianceActionLogEntry[]>([]);
  const [exportLog, setExportLog] = useState<ComplianceExportEvent[]>([]);
  const [statusByObligation, setStatusByObligation] = useState<
    Record<string, ComplianceStatus>
  >({});
  const [activeId, setActiveId] = useState<StepId>("OBL-01");
  const [rowSets, setRowSets] = useState<Record<string, EvidenceRow[]>>({});
  const [educationRows, setEducationRows] =
    useState<EvidenceRow[]>(getEducationSeed);
  const activeWorkflow = useMemo(
    () => workflowItems.find(item => item.obligationId === activeId),
    [activeId, workflowItems]
  );
  const target =
    managedTargets.find(item => item.id === selectedTargetId) ||
    managedTargets.find(item => item.name === "고기상수도") ||
    managedTargets.find(item => item.obligationCount > 0) ||
    LOCAL_MANAGED_TARGETS[0];
  const activeDuty: DutyStep = activeWorkflow
    ? {
        id: activeWorkflow.obligationId,
        step: "",
        title: activeWorkflow.title,
        law: `${activeWorkflow.lawName} ${activeWorkflow.article}`,
        tableTitle: activeWorkflow.title,
        kind: "law",
        inputGuide:
          "선택 시설에 적용된 의무의 조치일자·조치내용·상태·비고와 증빙파일을 저장합니다.",
        addLabel: "이행 내역 추가",
        evidenceExamples: [activeWorkflow.evidenceRequirement],
        requiredItems: ["조치일자", "조치내용", "상태", "증빙자료"],
      }
    : dutyMap[activeId] || dutyMap["OBL-10"];

  useEffect(() => {
    let active = true;
    loadManagedTargets().then(async result => {
      if (!active) return;
      setManagedTargets(result.rows);
      let targetRef = selectedTargetId;
      let workflow = await loadFacilityWorkflow(targetRef);
      if (!workflow.items.length) {
        const preferred =
          result.rows.find(item => item.name === "고기상수도") ||
          result.rows.find(item => item.obligationCount > 0);
        if (preferred) {
          targetRef = preferred.id;
          setSelectedTargetId(preferred.id);
          workflow = await loadFacilityWorkflow(targetRef);
        }
      }
      if (!active) return;
      setWorkflowItems(workflow.items);
      setStatusByObligation(
        Object.fromEntries(
          workflow.items.map(item => [
            item.obligationId,
            toKoreanStatus(item.complianceStatus || "NONE"),
          ])
        )
      );
      if (workflow.items[0]) setActiveId(workflow.items[0].obligationId);
      setWorkflowLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedTargetId, setSelectedTargetId]);

  useEffect(() => {
    if (!activeWorkflow) return;
    let active = true;
    Promise.all([
      loadEvidenceMetadata(activeWorkflow.complianceId),
      loadComplianceActionLog(activeWorkflow.targetObligationId),
    ])
      .then(([metadata, log]) => {
        if (!active) return;
        setActionLog(log);
        const seed = getSeedRows(activeWorkflow.obligationId)[0];
        setRowSets(current => ({
          ...current,
          [activeWorkflow.obligationId]: [
            {
              ...seed,
              date: activeWorkflow.actionDate || DEFAULT_DATE,
              category: activeWorkflow.documentType,
              lawName: activeWorkflow.lawName,
              article: activeWorkflow.article,
              content: activeWorkflow.actionDetail || "",
              detail: activeWorkflow.detail,
              note: activeWorkflow.note || "",
              attachments: metadata.map(file => ({
                id: file.evidenceId,
                name: file.originalName,
                metadata: file,
              })),
            },
          ],
        }));
      })
      .catch(error => {
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "저장된 증빙 목록을 불러오지 못했습니다."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [activeWorkflow]);

  useEffect(() => {
    let active = true;
    loadComplianceExportEvents(target.id)
      .then(events => {
        if (active) setExportLog(events);
      })
      .catch(() => {
        if (active) setExportLog([]);
      });
    return () => {
      active = false;
    };
  }, [target.id]);

  const getRows = (id: StepId) => rowSets[id] || getSeedRows(id, evidence[id]);
  const activeRows = getRows(activeId);
  const statusSummary = useMemo(
    () =>
      workflowItems.reduce(
        (summary, item) => {
          const status = item.complianceStatus || "NONE";
          if (status === "DONE") summary.done += 1;
          else if (status === "SUPP") summary.supplement += 1;
          else if (status === "NONE") summary.incomplete += 1;
          else summary.notApplicable += 1;
          return summary;
        },
        { done: 0, supplement: 0, incomplete: 0, notApplicable: 0 }
      ),
    [workflowItems]
  );
  const activeEvidenceMetadata = useMemo(
    () =>
      activeRows.flatMap(row =>
        row.attachments.flatMap(attachment =>
          attachment.metadata ? [attachment.metadata] : []
        )
      ),
    [activeRows]
  );

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
    const duty = dutyMap[id] || activeDuty;
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
    try {
      validateMyWorkFile(file);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "증빙자료를 확인해 주세요."
      );
      return;
    }
    setRows(id, rows =>
      rows.map(row =>
        row.id === rowId
          ? {
              ...row,
              attachments: [
                ...row.attachments.filter(attachment => !attachment.file),
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

  const downloadAttachment = async (attachment: Attachment) => {
    if (attachment.file) {
      downloadBlob(attachment.file, attachment.name);
      return;
    }
    if (attachment.metadata) {
      try {
        const blob = await downloadEvidenceFile(attachment.metadata);
        downloadBlob(blob, attachment.name);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "증빙 다운로드 실패"
        );
      }
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

  const saveCurrent = async (
    rows = activeRows,
    label = activeDuty.tableTitle
  ) => {
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
    if (!activeWorkflow) {
      toast.info(`${label} 실적을 현재 브라우저에 저장했습니다.`);
      return;
    }

    setSaving(true);
    try {
      const files = rows.flatMap(row =>
        row.attachments
          .filter(attachment => Boolean(attachment.file))
          .map(attachment => attachment.file as File)
      );
      const selectedStatus =
        statusByObligation[activeWorkflow.obligationId] || "미이행";
      const effectiveStatus = resolveEvidenceSaveStatus(
        selectedStatus,
        files.length
      );
      const payload = {
        actionDate: firstRow.date,
        actionDetail: [firstRow.content, firstRow.detail]
          .filter(Boolean)
          .join(" · "),
        note: firstRow.note,
        status: effectiveStatus,
      };
      let saveItem: FacilityWorkflowItem = activeWorkflow;
      const persist = async (file?: File) => {
        const result = await saveEvidenceRecord(saveItem, {
          ...payload,
          file,
        });
        saveItem = {
          ...saveItem,
          complianceId: result.compliance.compliance_id,
          complianceStatus: result.compliance.status,
          actionDate: result.compliance.action_date || undefined,
          actionDetail: result.compliance.action_detail || undefined,
          note: result.compliance.note || undefined,
          submittedAt: result.compliance.submitted_at || undefined,
          updatedAt: result.compliance.updated_at || undefined,
        };
      };
      if (files.length === 0) {
        await persist();
      } else {
        for (const file of files) await persist(file);
      }
      const refreshed = await loadFacilityWorkflow(activeWorkflow.targetRef);
      setWorkflowItems(refreshed.items);
      setStatusByObligation(current => ({
        ...current,
        [activeWorkflow.obligationId]: effectiveStatus,
      }));
      const refreshedActive = refreshed.items.find(
        item => item.obligationId === activeWorkflow.obligationId
      );
      const refreshedMetadata = await loadEvidenceMetadata(
        refreshedActive?.complianceId
      );
      setRows(activeWorkflow.obligationId, current =>
        current.map((row, index) =>
          index === 0
            ? {
                ...row,
                attachments: refreshedMetadata.map(file => ({
                  id: file.evidenceId,
                  name: file.originalName,
                  metadata: file,
                })),
              }
            : row
        )
      );
      setActionLog(
        await loadComplianceActionLog(refreshedActive?.targetObligationId)
      );
      toast.success(
        files.length > 0 && selectedStatus === "미이행"
          ? `${label} 증빙자료를 저장하고 이행상태를 이행완료로 변경했습니다.`
          : `${label} 실적과 증빙자료가 Supabase에 저장되었습니다.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "실적·증빙 저장 실패"
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadWorkflowCsv = async () => {
    if (workflowItems.length === 0 || exporting) return;
    setExporting(true);
    try {
      const complianceIds = workflowItems.flatMap(item =>
        item.complianceId ? [item.complianceId] : []
      );
      const evidenceByCompliance =
        await loadEvidenceMetadataByComplianceIds(complianceIds);
      const safeTargetName = target.name.replace(/[\\/:*?"<>|]/g, "_");
      const fileName = `용인시_${safeTargetName}_의무이행_${csvDateStamp()}.csv`;
      const csv = serializeCsv(workflowItems, [
        { header: "번호", value: (_, index) => index + 1 },
        { header: "관리대상 ID", value: item => item.targetRef },
        { header: "관리대상명", value: item => item.targetName },
        { header: "대상구분", value: item => item.targetCategory },
        { header: "관리부서", value: item => item.department },
        { header: "의무 ID", value: item => item.obligationId },
        { header: "의무명", value: item => item.title },
        { header: "구분", value: item => item.documentType },
        { header: "법률명", value: item => item.lawName },
        { header: "조항·호·목", value: item => item.article },
        { header: "주기", value: item => item.cycle },
        { header: "증빙요건", value: item => item.evidenceRequirement },
        {
          header: "이행상태",
          value: item => toKoreanStatus(item.complianceStatus || "NONE"),
        },
        { header: "조치일자", value: item => item.actionDate },
        { header: "조치내용", value: item => item.actionDetail },
        { header: "비고", value: item => item.note },
        { header: "제출시각", value: item => item.submittedAt },
        { header: "최종기록시각", value: item => item.updatedAt },
        {
          header: "점검상태",
          value: item =>
            item.inspectionStatus
              ? toKoreanStatus(item.inspectionStatus)
              : "미점검",
        },
        { header: "점검메모", value: item => item.inspectionNote },
        { header: "점검시각", value: item => item.inspectedAt },
        {
          header: "첨부파일수",
          value: item =>
            item.complianceId
              ? (evidenceByCompliance.get(item.complianceId) || []).length
              : 0,
        },
        {
          header: "첨부파일명",
          value: item =>
            item.complianceId
              ? (evidenceByCompliance.get(item.complianceId) || [])
                  .map(file => file.originalName)
                  .join(" | ")
              : "",
        },
        {
          header: "첨부업로드시각",
          value: item =>
            item.complianceId
              ? (evidenceByCompliance.get(item.complianceId) || [])
                  .map(file => file.uploadedAt)
                  .join(" | ")
              : "",
        },
      ]);
      await logComplianceCsvExport({
        targetRef: target.id,
        rowCount: workflowItems.length,
        fileName,
        actorRole: role,
      });
      downloadCsv(csv, fileName);
      setExportLog(await loadComplianceExportEvents(target.id));
      toast.success(
        `${target.name} 의무이행 ${workflowItems.length}건을 내려받고 로그를 저장했습니다.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "CSV 내려받기에 실패했습니다."
      );
    } finally {
      setExporting(false);
    }
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
    try {
      validateMyWorkFile(file);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "증빙자료를 확인해 주세요."
      );
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
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
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
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
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
          <th style={tableHeaderStyle}>집행액</th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
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
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
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
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
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
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
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
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
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
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
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
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
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
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
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
          <th style={tableHeaderStyle}>법률명</th>
          <th style={tableHeaderStyle}>조항·호·목</th>
          <th style={tableHeaderStyle}>조치내용</th>
          <th style={tableHeaderStyle}>조치 일자</th>
          <th style={tableHeaderStyle}>비고</th>
          <th style={tableHeaderStyle}>
            증빙자료
            <br />
            <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
          </th>
          <th style={tableHeaderStyle} aria-label="삭제" />
        </tr>
      </thead>
      <tbody>
        {activeRows.map(row => (
          <tr key={row.id}>
            <td style={tableCellStyle}>
              <input
                className="adoms-legal-reference-input"
                style={inputStyle}
                value={row.category}
                aria-label="법령 구분"
                readOnly
              />
            </td>
            <td style={tableCellStyle}>
              <input
                className="adoms-legal-reference-input"
                style={inputStyle}
                value={row.lawName || ""}
                aria-label="법률명"
                readOnly
              />
            </td>
            <td style={tableCellStyle}>
              <input
                className="adoms-legal-reference-input"
                style={inputStyle}
                value={row.article || ""}
                aria-label="조항·호·목"
                readOnly
              />
            </td>
            <td style={tableCellStyle}>
              <input
                style={inputStyle}
                value={row.content}
                aria-label="조치내용"
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
            <td style={tableCellStyle}>{renderAttachment(row)}</td>
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
              <th style={tableHeaderStyle}>법률명</th>
              <th style={tableHeaderStyle}>조항·호·목</th>
              <th style={tableHeaderStyle}>교육대상</th>
              <th style={tableHeaderStyle}>교육기관</th>
              <th style={tableHeaderStyle}>교육 일자</th>
              <th style={tableHeaderStyle}>비고</th>
              <th style={tableHeaderStyle}>
                증빙자료
                <br />
                <small style={{ fontWeight: 500 }}>※개당 10MB 이하</small>
              </th>
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
                    aria-label="법률명"
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
                    aria-label="조항·호·목"
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
                  <input
                    style={inputStyle}
                    value={row.note}
                    aria-label="비고"
                    onChange={event =>
                      updateEducationRow(row.id, { note: event.target.value })
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
                        aria-label="교육명부 첨부"
                        title="교육명부 첨부"
                        style={{
                          ...smallButtonStyle,
                          cursor: "pointer",
                          display: "inline-flex",
                          width: 30,
                          minHeight: 30,
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Paperclip size={14} aria-hidden="true" />
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
            borderColor: "#4e87b2",
            color: "#1d6fa3",
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
          저장
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
          style={{ border: "1px solid #dce3ea", background: "#fff" }}
        >
          <div
            className="adoms-duty-sidebar-title"
            style={{
              padding: "14px 15px",
              background: "#172b4d",
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
              color: "#6c7789",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ● {target.category}
          </div>
          <div
            className="adoms-group-label"
            style={{
              margin: "5px 10px 4px",
              padding: "9px 10px",
              border: "1px solid #dce3ea",
              borderRadius: 7,
              background: "#f7f9fb",
              color: "#435064",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            시설별 적용 의무 · {workflowItems.length}건
          </div>
          <div
            className="adoms-step-list"
            style={{ padding: "2px 10px 14px", display: "grid", gap: 3 }}
          >
            {workflowLoading ? (
              <span style={{ padding: 10, color: "#777", fontSize: 12 }}>
                의무를 불러오고 있습니다.
              </span>
            ) : (
              workflowItems.map(duty => (
                <button
                  key={duty.obligationId}
                  className={`adoms-step-button${activeId === duty.obligationId ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveId(duty.obligationId)}
                  style={stepButtonStyle}
                >
                  {duty.title}
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="adoms-duty-content" style={{ minWidth: 0 }}>
          <header
            className="adoms-duty-header"
            style={{
              borderBottom: "2px solid #1d6fa3",
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
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <select
                  style={{
                    minWidth: 230,
                    border: "1px solid #bec9c0",
                    background: "#fff",
                    color: "#2f3f34",
                    padding: "0 10px",
                    fontSize: 12,
                  }}
                  value={target.id}
                  onChange={event => setSelectedTargetId(event.target.value)}
                >
                  {managedTargets
                    .filter(item => item.obligationCount > 0)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.obligationCount})
                      </option>
                    ))}
                </select>
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
            </div>
            <p style={{ margin: "9px 0 0", color: "#6e7971", fontSize: 12 }}>
              {target.name} · {target.department} · 해당년도: 2026년
            </p>
          </header>

          <section
            className="adoms-compliance-summary"
            aria-label={`${target.name} 의무 이행 상태 요약`}
          >
            <div className="adoms-compliance-counts">
              <article className="done">
                <span>이행완료</span>
                <strong>{statusSummary.done}</strong>
              </article>
              <article className="supplement">
                <span>보완필요</span>
                <strong>{statusSummary.supplement}</strong>
              </article>
              <article className="incomplete">
                <span>미이행</span>
                <strong>{statusSummary.incomplete}</strong>
              </article>
            </div>
            <div className="adoms-compliance-summary-actions">
              {statusSummary.notApplicable > 0 && (
                <span>해당없음 {statusSummary.notApplicable}건</span>
              )}
              <button
                type="button"
                className="adoms-csv-button"
                onClick={() => void downloadWorkflowCsv()}
                disabled={
                  workflowLoading || exporting || workflowItems.length === 0
                }
              >
                <Download size={14} aria-hidden="true" />
                {exporting ? "로그 저장 중" : "CSV 내려받기"}
              </button>
            </div>
          </section>

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
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <label htmlFor="evidence-status" style={{ fontSize: 12 }}>
                이행상태
              </label>
              <select
                id="evidence-status"
                value={statusByObligation[activeId] || "미이행"}
                onChange={event =>
                  setStatusByObligation(current => ({
                    ...current,
                    [activeId]: event.target.value as ComplianceStatus,
                  }))
                }
                style={{ ...inputStyle, width: 126 }}
              >
                {(["이행완료", "보완필요", "미이행", "해당없음"] as const).map(
                  status => (
                    <option key={status}>{status}</option>
                  )
                )}
              </select>
            </div>
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
                justifyContent: activeWorkflow ? "flex-end" : "space-between",
                gap: 12,
                marginTop: 10,
              }}
            >
              {!activeWorkflow && (
                <button
                  className="adoms-add-button"
                  type="button"
                  onClick={() => addRow(activeId)}
                  style={{
                    ...smallButtonStyle,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    borderColor: "#4e87b2",
                    color: "#1d6fa3",
                  }}
                >
                  <Plus size={14} /> {activeDuty.addLabel}
                </button>
              )}
              <button
                className="adoms-save-button"
                type="button"
                disabled={saving || !activeWorkflow}
                onClick={() => void saveCurrent()}
                style={saveButtonStyle}
              >
                저장
              </button>
            </div>
          </section>

          {activeId === "OBL-10" && renderEducationTable()}

          <section className="adoms-correction-log">
            <div className="adoms-correction-log-heading">
              <div>
                <Clock3 size={16} aria-hidden="true" />
                <h2>시정조치 로그</h2>
              </div>
              <span>
                {activeDuty.title} · 저장 {actionLog.length}건 · 첨부{" "}
                {activeEvidenceMetadata.length}건
              </span>
            </div>

            {actionLog.length === 0 && activeEvidenceMetadata.length === 0 ? (
              <div className="adoms-log-empty">
                아직 저장된 시정조치 또는 증빙 이력이 없습니다.
              </div>
            ) : (
              <div className="adoms-log-list">
                {actionLog.map(event => (
                  <article key={`action-${event.auditEventId}`}>
                    <strong>
                      {event.action === "insert"
                        ? "시정조치 최초 등록"
                        : "시정조치 변경"}
                    </strong>
                    <p>
                      상태{" "}
                      {event.beforeStatus
                        ? `${toKoreanStatus(event.beforeStatus)} → `
                        : ""}
                      {event.afterStatus
                        ? toKoreanStatus(event.afterStatus)
                        : "상태 미표기"}
                      {event.actionDetail ? ` · ${event.actionDetail}` : ""}
                      {event.note ? ` · ${event.note}` : ""}
                    </p>
                    <small>
                      조치일 {event.actionDate || "-"} · 제출 발생시각{" "}
                      {formatLogDateTime(event.submittedAt)} · DB 기록시각{" "}
                      {formatLogDateTime(event.occurredAt)}
                    </small>
                  </article>
                ))}
                {activeEvidenceMetadata.map(file => (
                  <article key={`file-${file.evidenceId}`}>
                    <strong>증빙자료 등록 · {file.originalName}</strong>
                    <p>
                      {Math.max(
                        1,
                        Math.ceil(file.sizeBytes / 1024)
                      ).toLocaleString("ko-KR")}
                      KB · 버전 {file.versionNo} ·{" "}
                      {file.isCurrent ? "현재 파일" : "이전 파일"}
                    </p>
                    <small>
                      DB 기록시각 {formatLogDateTime(file.uploadedAt)}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <div className="adoms-export-log">
              <h3>CSV 다운로드 로그</h3>
              {exportLog.length === 0 ? (
                <p>이 관리대상에서 내려받은 CSV가 없습니다.</p>
              ) : (
                <ul>
                  {exportLog.slice(0, 5).map(event => (
                    <li key={event.exportEventId}>
                      <strong>{event.fileName}</strong>
                      <span>
                        {event.rowCount}건 ·{" "}
                        {event.actorRole || "시연 역할 미표기"}
                      </span>
                      <small>
                        발생 {formatLogDateTime(event.occurredAt)} · DB 기록{" "}
                        {formatLogDateTime(event.createdAt)}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
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

const saveButtonStyle: CSSProperties = {
  minHeight: 31,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  border: "1px solid #1d6fa3",
  borderRadius: 8,
  background: "#1d6fa3",
  color: "#fff",
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 700,
};
