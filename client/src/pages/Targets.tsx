import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  loadManagedTargets,
  LOCAL_MANAGED_TARGETS,
  type ManagedTargetRow,
} from "@/lib/facility-api";
import {
  loadTargetObligations,
  type LegalSource,
  type MappedObligation,
} from "@/lib/facility-obligation-api";
import { useDemo } from "@/contexts/DemoContext";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { csvDateStamp, downloadCsv, serializeCsv } from "@/lib/csv";

type Screen = "target-list" | "target-form" | "contract-list" | "contract-form";
type TargetKind =
  | "사업장"
  | "공중이용시설"
  | "공중교통수단"
  | "원료·제조물"
  | "도급·용역·위탁";
type TargetStatusFilter = "전체" | "미입력" | "입력";
type DutyStatus = "이행완료" | "보완필요" | "미이행";

function matchesTargetKind(item: ManagedTargetRow, kind: TargetKind): boolean {
  if (kind === "공중이용시설") return item.category === "시설물";
  if (kind === "원료·제조물") return false;
  return item.category === kind;
}

function displayTargetCategory(item: ManagedTargetRow): string {
  return item.category === "시설물" ? "공중이용시설" : item.category;
}

type Person = {
  id: string;
  name: string;
  department: string;
  phone: string;
  position?: string;
  period?: string;
};

type ContractDraft = {
  id?: string;
  contractName: string;
  orderingDepartment: string;
  manager: string;
  managerPhone: string;
  company: string;
  startDate: string;
  endDate: string;
  contractType: string;
  amount: string;
  work: string;
  facility: string;
  contractorManager: string;
  contractorPhone: string;
  businessNumber: string;
  businessType: string;
  employees: string;
  participants: string;
  workplace: string;
};

function formatLegalDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "원천 미표기";
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}.`;
}

function legalSourceVersionLabel(source: LegalSource): string {
  if (source.sourceVersion.includes("official-law-20260906")) {
    return "ADOMS 사실층 + 국가법령정보센터 현행법령 (2026-09-06 확인)";
  }
  return source.sourceVersion || "용인시청 기본 시연 의무";
}

function buildLegalBasisCopyText(obligation: MappedObligation): string {
  const sources = obligation.legalSources;
  const header = [
    `[적용 의무] ${obligation.title}`,
    `[표시 근거] ${obligation.lawName} ${obligation.article}`,
  ];
  if (sources.length === 0) {
    return [...header, "", "연결된 조문 원문이 없습니다."].join("\n");
  }

  const bodies = sources.map((source, index) =>
    [
      sources.length > 1 ? `[근거 ${index + 1}]` : "[근거]",
      `${source.documentTitle} ${source.article}`,
      source.articleTitle ? `조문명: ${source.articleTitle}` : "",
      `법령 최근 개정일: ${formatLegalDate(source.lastAmendedAt)}`,
      `현행법령 시행일: ${formatLegalDate(source.effectiveFrom)}`,
      source.provisionEffectiveFrom &&
      source.provisionEffectiveFrom !== source.effectiveFrom
        ? `해당 조문 효력일: ${formatLegalDate(source.provisionEffectiveFrom)}`
        : "",
      source.provisionLastAmendedAt
        ? `조문 내 최종 개정 표기: ${formatLegalDate(source.provisionLastAmendedAt)}`
        : "",
      `데이터 기준: ${legalSourceVersionLabel(source)}`,
      "",
      source.sourceText,
    ]
      .filter(Boolean)
      .join("\n")
  );
  return [...header, "", ...bodies].join("\n\n");
}

const employmentTypes = [
  "공무원",
  "공무직",
  "촉탁직",
  "기간제",
  "공공안전관",
  "공공근로",
  "뉴딜일자리",
  "기타",
] as const;

const hazardPlaces = [
  "사다리·비계 등 고소작업",
  "굴착·토사 붕괴 우려 장소",
  "중장비·차량 운행 구간",
  "전기설비 및 충전부 주변",
  "밀폐공간 작업 장소",
  "화재·폭발 위험 장소",
  "중량물 운반·인양 작업",
  "절단·용접 등 화기작업",
  "추락·낙하 위험 장소",
  "화학물질 취급 장소",
  "소음·진동 발생 장소",
  "고온·저온 환경 작업",
  "수변·배수시설 인접 장소",
  "지하·맨홀 내부 작업",
  "교통 통제 필요 장소",
  "시설물 보수·보강 구간",
  "보호구 착용 필수 작업",
  "기타 유해·위험 작업 장소",
] as const;

const contractDuties = [
  {
    id: "duty-1",
    group: "1. 안전보건협의체 구성",
    item: "도급·용역·위탁 전 안전보건협의체 운영",
  },
  {
    id: "duty-2",
    group: "2. 작업장 순회점검",
    item: "합동 안전점검 및 개선조치 확인",
  },
  {
    id: "duty-3",
    group: "3. 안전보건수준 평가",
    item: "수급업체 안전보건관리 수준 평가",
  },
  {
    id: "duty-4",
    group: "3. 안전보건수준 평가",
    item: "평가 결과에 따른 보완조치 이행",
  },
] as const;

const statusStyle: Record<DutyStatus, CSSProperties> = {
  이행완료: { color: "#087c6b", background: "#dff7f2", borderColor: "#8ed9ca" },
  보완필요: { color: "#865f00", background: "#fff0c7", borderColor: "#e7bd57" },
  미이행: { color: "#b33d46", background: "#fff0f1", borderColor: "#e5a1a8" },
};

const sectionStyle: CSSProperties = {
  border: "1px solid #dfe4de",
  borderRadius: 8,
  background: "rgba(255,255,255,.96)",
  boxShadow: "0 10px 25px rgba(23,43,77,.055)",
  overflow: "hidden",
};

const tableCellStyle: CSSProperties = {
  padding: "11px 12px",
  borderRight: "1px solid #e1e5e1",
  borderBottom: "1px solid #e7eae7",
  fontSize: 11,
  minWidth: 0,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 10px",
  border: "1px solid #cfd6cf",
  borderRadius: 4,
  background: "#fff",
  color: "#29322d",
  fontSize: 12,
  outline: "none",
};

const readonlyStyle: CSSProperties = {
  ...fieldStyle,
  background: "#f1f3f2",
  color: "#69736b",
};

const smallButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  minHeight: 31,
  padding: "0 10px",
  border: "1px solid #bfc8bf",
  borderRadius: 4,
  color: "#445047",
  background: "#fff",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
};

function emptyContract(): ContractDraft {
  return {
    contractName: "",
    orderingDepartment: "시민안전관",
    manager: "김안전",
    managerPhone: "031-324-0000",
    company: "",
    startDate: "",
    endDate: "",
    contractType: "도급",
    amount: "",
    work: "",
    facility: "용인시청",
    contractorManager: "",
    contractorPhone: "",
    businessNumber: "",
    businessType: "",
    employees: "",
    participants: "",
    workplace: "",
  };
}

function FileRows({
  files,
  onChange,
  onAdd,
  onRemove,
  prefix,
}: {
  files: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  prefix: string;
}) {
  return (
    <div className="adoms-file-rows" style={{ display: "grid", gap: 6 }}>
      {files.map((file, index) => {
        const inputId = `${prefix}-${index}`;
        return (
          <div
            className="adoms-file-row"
            key={inputId}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto auto",
              gap: 6,
              alignItems: "center",
            }}
          >
            <label
              htmlFor={inputId}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) auto",
                alignItems: "center",
                minHeight: 32,
                border: "1px solid #cfd5cf",
                borderRadius: 3,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  padding: "7px 8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: file ? "#36433a" : "#7c847f",
                  background: "#f5f6f5",
                  fontSize: 10,
                }}
              >
                {file || "선택된 파일 없음"}
              </span>
              <b
                style={{ padding: "7px 9px", background: "#fff", fontSize: 10 }}
              >
                파일선택
              </b>
              <input
                id={inputId}
                type="file"
                style={{ display: "none" }}
                onChange={event =>
                  onChange(index, event.target.files?.[0]?.name || "")
                }
              />
            </label>
            <button
              type="button"
              className="adoms-file-add"
              style={smallButtonStyle}
              onClick={onAdd}
              aria-label="첨부파일 행 추가"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              className="adoms-file-remove"
              style={smallButtonStyle}
              onClick={() => onRemove(index)}
              aria-label="첨부파일 행 삭제"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
      {files.length === 0 && (
        <button
          type="button"
          className="adoms-file-empty-add"
          style={{ ...smallButtonStyle, width: "fit-content" }}
          onClick={onAdd}
        >
          <Plus size={13} /> 첨부파일 추가
        </button>
      )}
    </div>
  );
}

export default function Targets() {
  const { selectedTargetId, setSelectedTargetId } = useDemo();
  const [screen, setScreen] = useState<Screen>("target-list");
  const [targetKind, setTargetKind] = useState<TargetKind>("공중이용시설");
  const [statusFilter, setStatusFilter] = useState<TargetStatusFilter>("전체");
  const [searchCondition, setSearchCondition] = useState("관리대상명");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [targetSaved, setTargetSaved] = useState(true);
  const [toast, setToast] = useState("");
  const [basicOpen, setBasicOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(true);
  const [contractBasicOpen, setContractBasicOpen] = useState(true);
  const [contractRiskOpen, setContractRiskOpen] = useState(true);
  const [contractDutyOpen, setContractDutyOpen] = useState(true);
  const [headcounts, setHeadcounts] = useState<
    Record<string, { current: number; field: number }>
  >(
    Object.fromEntries(
      employmentTypes.map((type, index) => [
        type,
        { current: index === 0 ? 120 : 0, field: index === 0 ? 104 : 0 },
      ])
    )
  );
  const [targetDraft, setTargetDraft] = useState({
    date: "2026-09-01",
    address: "경기도 용인시 처인구 중부대로 1199",
    industry: "지방행정 집행기관",
    industryCode: "84111",
  });
  const [workers, setWorkers] = useState<Person[]>([
    {
      id: "worker-1",
      name: "김안전",
      department: "시민안전관",
      phone: "031-324-0000",
    },
  ]);
  const [supervisors, setSupervisors] = useState<Person[]>([
    {
      id: "supervisor-1",
      name: "이관리",
      department: "시민안전관",
      phone: "031-324-0001",
      position: "주무관",
      period: "2026-01-01 ~ 2026-12-31",
    },
  ]);
  const [targetFiles, setTargetFiles] = useState<string[]>([""]);
  const [contracts, setContracts] = useState<ContractDraft[]>([]);
  const [contractQuery, setContractQuery] = useState("");
  const [searchedContractQuery, setSearchedContractQuery] = useState("");
  const [contractDraft, setContractDraft] =
    useState<ContractDraft>(emptyContract);
  const [contractFiles, setContractFiles] = useState<string[]>([""]);
  const [hazards, setHazards] = useState<number[]>([1, 3, 14]);
  const [dutyStatuses, setDutyStatuses] = useState<Record<string, DutyStatus>>({
    "duty-1": "이행완료",
    "duty-2": "보완필요",
    "duty-3": "미이행",
    "duty-4": "보완필요",
  });
  const [dutyFiles, setDutyFiles] = useState<Record<string, string[]>>(
    Object.fromEntries(contractDuties.map(duty => [duty.id, [""]]))
  );
  const [managedTargets, setManagedTargets] = useState<ManagedTargetRow[]>(
    LOCAL_MANAGED_TARGETS
  );
  const [facilitySource, setFacilitySource] = useState<
    "loading" | "supabase" | "fallback"
  >("loading");
  const [targetObligations, setTargetObligations] = useState<
    MappedObligation[]
  >([]);
  const [obligationSource, setObligationSource] = useState<
    "loading" | "supabase" | "fallback"
  >("loading");
  const [obligationReason, setObligationReason] = useState("");
  const [selectedLegalBasis, setSelectedLegalBasis] =
    useState<MappedObligation | null>(null);

  useEffect(() => {
    let active = true;
    loadManagedTargets().then(result => {
      if (!active) return;
      setManagedTargets(result.rows);
      setFacilitySource(result.source);
    });
    return () => {
      active = false;
    };
  }, []);

  const selected =
    managedTargets.find(item => item.id === selectedTargetId) ||
    managedTargets[0] ||
    LOCAL_MANAGED_TARGETS[0];

  useEffect(() => {
    let active = true;
    setSelectedLegalBasis(null);
    setObligationSource("loading");
    setObligationReason("");
    loadTargetObligations(selected.id).then(result => {
      if (!active) return;
      setTargetObligations(result.items);
      setObligationSource(result.source);
      setObligationReason(result.reason || "");
    });
    return () => {
      active = false;
    };
  }, [selected.id]);

  const normalizedQuery = searchedQuery.trim();
  const filteredTargets = useMemo(() => {
    const base = managedTargets.filter(item => {
      if (!matchesTargetKind(item, targetKind)) return false;
      const searchable =
        searchCondition === "담당자"
          ? item.manager
          : searchCondition === "부서명"
            ? item.department
            : item.name;
      return searchable.includes(normalizedQuery);
    });
    if (statusFilter === "입력") return targetSaved ? base : [];
    if (statusFilter === "미입력") return targetSaved ? [] : base;
    return base;
  }, [
    managedTargets,
    normalizedQuery,
    searchCondition,
    statusFilter,
    targetKind,
    targetSaved,
  ]);
  const filteredContracts = useMemo(
    () =>
      contracts.filter(item =>
        item.contractName.includes(searchedContractQuery.trim())
      ),
    [contracts, searchedContractQuery]
  );
  const totalCurrent = employmentTypes.reduce(
    (sum, type) => sum + (headcounts[type]?.current || 0),
    0
  );
  const totalField = employmentTypes.reduce(
    (sum, type) => sum + (headcounts[type]?.field || 0),
    0
  );
  const searchPlaceholder =
    searchCondition === "담당자"
      ? "담당자명을 입력하세요"
      : searchCondition === "부서명"
        ? "부서명을 입력하세요"
        : targetKind === "도급·용역·위탁"
          ? "계약명을 입력하세요"
          : "관리대상명을 입력하세요";

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast(current => (current === message ? "" : current)),
      2600
    );
  };
  const downloadTargetCsv = () => {
    if (filteredTargets.length === 0) {
      announce("내려받을 관리대상이 없습니다.");
      return;
    }
    const csv = serializeCsv(filteredTargets, [
      { header: "번호", value: (_, index) => index + 1 },
      { header: "관리대상 ID", value: item => item.id },
      {
        header: targetKind === "도급·용역·위탁" ? "계약명" : "관리대상명",
        value: item => item.name,
      },
      { header: "대상구분", value: item => displayTargetCategory(item) },
      { header: "세부분류", value: item => item.detailKind },
      { header: "주소", value: item => item.address },
      { header: "관리부서", value: item => item.department },
      { header: "담당자", value: item => item.manager },
      { header: "적용의무수", value: item => item.obligationCount },
      { header: "적용판정", value: item => item.applicability },
      { header: "데이터원천", value: item => item.sourceKind },
      {
        header: "시연가상값",
        value: item => (item.isDemoVirtual ? "Y" : "N"),
      },
    ]);
    downloadCsv(csv, `용인시_${targetKind}_관리대상_${csvDateStamp()}.csv`);
    announce(
      `${targetKind} 관리대상 ${filteredTargets.length}건을 내려받았습니다.`
    );
  };
  const copyLegalBasis = async () => {
    if (!selectedLegalBasis) return;
    const text = buildLegalBasisCopyText(selectedLegalBasis);
    try {
      await navigator.clipboard.writeText(text);
      announce("법령명·조문·날짜·원문을 복사했습니다.");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      announce(
        copied ? "법령 원문을 복사했습니다." : "원문 복사에 실패했습니다."
      );
    }
  };
  const printLegalBasis = () => {
    if (!selectedLegalBasis) return;
    window.print();
  };
  const addPerson = (kind: "worker" | "supervisor") => {
    const newPerson: Person = {
      id: `${kind}-${Date.now()}`,
      name: "",
      department: "시민안전관",
      phone: "",
      ...(kind === "supervisor" ? { position: "", period: "" } : {}),
    };
    if (kind === "worker") setWorkers(previous => [...previous, newPerson]);
    else setSupervisors(previous => [...previous, newPerson]);
    announce(
      kind === "worker"
        ? "업무 담당자 행을 추가했습니다."
        : "관리감독자 행을 추가했습니다."
    );
  };
  const updatePerson = (
    kind: "worker" | "supervisor",
    id: string,
    field: keyof Person,
    value: string
  ) => {
    const update = (people: Person[]) =>
      people.map(person =>
        person.id === id ? { ...person, [field]: value } : person
      );
    if (kind === "worker") setWorkers(update);
    else setSupervisors(update);
  };
  const removePerson = (kind: "worker" | "supervisor", id: string) => {
    if (kind === "worker")
      setWorkers(previous => previous.filter(person => person.id !== id));
    else
      setSupervisors(previous => previous.filter(person => person.id !== id));
    announce(
      kind === "worker"
        ? "업무 담당자를 삭제했습니다."
        : "관리감독자 행을 삭제했습니다."
    );
  };
  const updateFile = (
    setter: (next: string[]) => void,
    files: string[],
    index: number,
    value: string
  ) => {
    setter(
      files.map((file, fileIndex) => (fileIndex === index ? value : file))
    );
  };
  const removeFile = (
    setter: (next: string[]) => void,
    files: string[],
    index: number
  ) => {
    setter(files.filter((_, fileIndex) => fileIndex !== index));
  };
  const updateContract = (field: keyof ContractDraft, value: string) => {
    setContractDraft(previous => ({ ...previous, [field]: value }));
  };
  const toggleHazard = (number: number) => {
    setHazards(previous =>
      previous.includes(number)
        ? previous.filter(item => item !== number)
        : [...previous, number].sort((a, b) => a - b)
    );
  };
  const updateDutyFiles = (dutyId: string, next: string[]) => {
    setDutyFiles(previous => ({ ...previous, [dutyId]: next }));
  };
  const openTargetForm = (id: string) => {
    const nextTarget = managedTargets.find(item => item.id === id);
    setSelectedTargetId(id);
    if (nextTarget) {
      setTargetDraft(previous => ({
        ...previous,
        address: nextTarget.address === "-" ? "" : nextTarget.address,
        industry: nextTarget.detailKind || nextTarget.category,
        industryCode: nextTarget.sourceKind,
      }));
    }
    setScreen("target-form");
  };
  const openNewContract = () => {
    setContractDraft(emptyContract());
    setContractFiles([""]);
    setHazards([1, 3, 14]);
    setScreen("contract-form");
  };
  const openExistingContract = (contract: ContractDraft) => {
    setContractDraft(contract);
    setScreen("contract-form");
  };
  const saveTarget = () => {
    setTargetSaved(true);
    announce(`${selected.name} 기본정보와 세부정보를 저장했습니다.`);
  };
  const saveContract = () => {
    if (!contractDraft.contractName.trim()) {
      announce("계약명을 입력한 뒤 저장해 주세요.");
      return;
    }
    const next = {
      ...contractDraft,
      id: contractDraft.id || `contract-${Date.now()}`,
    };
    setContracts(previous => {
      const index = previous.findIndex(item => item.id === next.id);
      return index >= 0
        ? previous.map(item => (item.id === next.id ? next : item))
        : [...previous, next];
    });
    setContractDraft(next);
    announce("도급·용역·위탁 계약정보를 저장했습니다.");
  };

  const FormSectionTitle = ({
    number,
    title,
    open,
    onClick,
  }: {
    number: string;
    title: string;
    open: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      className="adoms-form-section-title"
      onClick={onClick}
      aria-expanded={open}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        border: 0,
        borderBottom: open ? "1px solid #dfe4de" : 0,
        color: "#303a34",
        background: "#f4f6f4",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span>
        <b style={{ color: "#1d6fa3", marginRight: 8 }}>{number}</b>
        {title}
      </span>
      <ChevronDown
        size={18}
        style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 160ms",
        }}
      />
    </button>
  );

  const LabeledField = ({
    label,
    required = false,
    children,
    wide = false,
  }: {
    label: string;
    required?: boolean;
    children: ReactNode;
    wide?: boolean;
  }) => (
    <label
      className="adoms-labeled-field"
      style={{
        display: "grid",
        gap: 7,
        gridColumn: wide ? "1 / -1" : undefined,
        minWidth: 0,
      }}
    >
      <span style={{ color: "#4e5a51", fontSize: 11, fontWeight: 800 }}>
        {label}
        {required && <b style={{ marginLeft: 3, color: "#c84455" }}>*</b>}
      </span>
      {children}
    </label>
  );

  const renderTargetObligations = () => (
    <div className="adoms-target-obligations" style={sectionStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 52,
          padding: "0 16px",
          borderBottom: "1px solid #dfe4de",
          background: "#f2f3f5",
        }}
      >
        <div>
          <strong style={{ fontSize: 13 }}>3. 대상별 적용 의무</strong>
          <span style={{ marginLeft: 8, color: "#1d6fa3", fontSize: 12 }}>
            {obligationSource === "loading"
              ? "조회 중"
              : `${targetObligations.length}건`}
          </span>
        </div>
        <span style={{ color: "#70787e", fontSize: 10 }}>
          {obligationSource === "supabase"
            ? `Supabase · ${selected.id}`
            : obligationSource === "loading"
              ? "시설-의무 매핑 조회 중"
              : obligationReason || "로컬 시연 의무"}
        </span>
      </div>

      {obligationSource === "loading" ? (
        <div style={{ padding: 28, color: "#717980", fontSize: 12 }}>
          {selected.name}의 적용 의무를 조회하고 있습니다.
        </div>
      ) : targetObligations.length > 0 ? (
        <div style={{ maxHeight: 440, overflow: "auto" }}>
          <div
            style={{
              minWidth: 1180,
              display: "grid",
              gridTemplateColumns:
                "50px 125px 145px minmax(220px,1.1fr) minmax(220px,1fr) 110px minmax(190px,.9fr)",
              background: "#e9edf1",
              color: "#41484e",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {[
              "번호",
              "의무 ID",
              "법령",
              "의무",
              "근거(법령·조문)",
              "주기",
              "증빙",
            ].map(label => (
              <span
                key={label}
                style={{
                  ...tableCellStyle,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {label}
              </span>
            ))}
          </div>
          {targetObligations.map((obligation, index) => (
            <div
              key={obligation.id}
              style={{
                minWidth: 1180,
                display: "grid",
                gridTemplateColumns:
                  "50px 125px 145px minmax(220px,1.1fr) minmax(220px,1fr) 110px minmax(190px,.9fr)",
                background: index % 2 === 0 ? "#fff" : "#fbfbfc",
              }}
            >
              <span style={{ ...tableCellStyle, textAlign: "center" }}>
                {index + 1}
              </span>
              <span
                style={{
                  ...tableCellStyle,
                  color: "#1d6fa3",
                  fontWeight: 750,
                }}
              >
                {obligation.id}
              </span>
              <span style={tableCellStyle}>{obligation.lawName}</span>
              <span style={{ ...tableCellStyle, fontWeight: 700 }}>
                {obligation.title}
              </span>
              <span style={tableCellStyle}>
                <button
                  type="button"
                  className="adoms-legal-basis-button"
                  aria-label={`${obligation.lawName} ${obligation.article} 원문 보기`}
                  title="조문 원문 보기"
                  onClick={() => setSelectedLegalBasis(obligation)}
                  style={{
                    padding: 0,
                    border: 0,
                    color: "#1d6fa3",
                    background: "transparent",
                    fontFamily: "inherit",
                    fontSize: 11,
                    fontWeight: 750,
                    lineHeight: 1.55,
                    textAlign: "left",
                    textDecoration: "underline",
                    textDecorationColor: "rgba(29,111,163,.4)",
                    textUnderlineOffset: 3,
                    cursor: "pointer",
                  }}
                >
                  {obligation.lawName} {obligation.article}
                </button>
              </span>
              <span style={{ ...tableCellStyle, textAlign: "center" }}>
                {obligation.frequency}
              </span>
              <span style={tableCellStyle}>{obligation.evidence}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 28, color: "#717980", fontSize: 12 }}>
          {selected.name}에 연결된 적용 의무가 없습니다.
          {obligationReason ? ` (${obligationReason})` : ""}
        </div>
      )}
    </div>
  );

  const renderTargetList = () => (
    <>
      <div
        className="adoms-page-heading page-heading compact"
        style={{ alignItems: "flex-end" }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#6d756f",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            기본정보
          </p>
          <h1>관리대상</h1>
          <p>용인시 소관 관리대상과 대상별 적용 의무를 확인합니다.</p>
        </div>
      </div>

      <section
        className="adoms-target-search"
        style={{ ...sectionStyle, marginBottom: 16, background: "#f0f2f5" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "130px minmax(0,1fr)",
            borderBottom: "1px solid #dce1dc",
          }}
        >
          <strong
            style={{
              display: "flex",
              alignItems: "center",
              padding: "15px 18px",
              background: "#e7eaee",
              fontSize: 12,
            }}
          >
            대상구분
          </strong>
          <div
            style={{
              display: "flex",
              gap: 22,
              alignItems: "center",
              padding: "11px 18px",
              background: "#fff",
            }}
          >
            {(
              [
                "사업장",
                "공중이용시설",
                "공중교통수단",
                "원료·제조물",
                "도급·용역·위탁",
              ] as TargetKind[]
            ).map(kind => (
              <button
                key={kind}
                type="button"
                className="adoms-target-kind"
                onClick={() => setTargetKind(kind)}
                aria-pressed={targetKind === kind}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: 0,
                  background: "transparent",
                  color: targetKind === kind ? "#1d6fa3" : "#657066",
                  fontSize: 12,
                  fontWeight: targetKind === kind ? 800 : 600,
                  cursor: "pointer",
                }}
              >
                <i
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 16,
                    height: 16,
                    border: `1px solid ${targetKind === kind ? "#1d6fa3" : "#aeb7b1"}`,
                    borderRadius: "50%",
                    background: targetKind === kind ? "#1d6fa3" : "#fff",
                    color: "#fff",
                  }}
                >
                  {targetKind === kind && <Check size={11} />}
                </i>
                {kind}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "130px 170px minmax(260px,1fr) auto",
            alignItems: "center",
            borderBottom: "1px solid #dce1dc",
          }}
        >
          <strong
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "stretch",
              padding: "15px 18px",
              background: "#e7eaee",
              fontSize: 12,
            }}
          >
            검색조건
          </strong>
          <select
            className="adoms-search-condition"
            value={searchCondition}
            onChange={event => setSearchCondition(event.target.value)}
            style={{
              ...fieldStyle,
              width: "calc(100% - 18px)",
              marginLeft: 18,
            }}
          >
            <option value="관리대상명">
              {targetKind === "도급·용역·위탁" ? "계약명" : "관리대상명"}
            </option>
            <option>부서명</option>
            <option>담당자</option>
          </select>
          <div style={{ position: "relative", margin: "10px 12px 10px 16px" }}>
            <input
              className="adoms-search-input"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  setSearchedQuery(query);
                  announce("검색 조건을 적용했습니다.");
                }
              }}
              placeholder={searchPlaceholder}
              style={fieldStyle}
            />
            <Search
              size={15}
              style={{
                position: "absolute",
                right: 10,
                top: 12,
                color: "#8b9690",
              }}
            />
          </div>
          <button
            type="button"
            className="adoms-search-button outline-btn"
            onClick={() => {
              setSearchedQuery(query);
              announce("검색 조건을 적용했습니다.");
            }}
            style={{ marginRight: 16 }}
          >
            <Search size={14} /> 검색
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "130px minmax(0,1fr)",
          }}
        >
          <strong
            style={{
              display: "flex",
              alignItems: "center",
              padding: "15px 18px",
              background: "#e7eaee",
              fontSize: 12,
            }}
          >
            입력현황
          </strong>
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "center",
              padding: "11px 18px",
              background: "#fff",
            }}
          >
            {(["전체", "미입력", "입력"] as TargetStatusFilter[]).map(
              status => (
                <button
                  type="button"
                  key={status}
                  className="adoms-status-filter"
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={statusFilter === status}
                  style={{
                    border: 0,
                    padding: "5px 0",
                    background: "transparent",
                    color: statusFilter === status ? "#1d6fa3" : "#647068",
                    fontSize: 11,
                    fontWeight: statusFilter === status ? 800 : 600,
                    cursor: "pointer",
                    borderBottom:
                      statusFilter === status
                        ? "2px solid #2f66b0"
                        : "2px solid transparent",
                  }}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      <section
        className="adoms-target-progress"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: 16,
          border: "1px solid #dfe4de",
          borderRadius: 8,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          className="adoms-progress-card"
          onClick={() => setStatusFilter("미입력")}
          style={{
            padding: "18px 24px",
            border: 0,
            borderRight: "1px solid #dfe4de",
            background: statusFilter === "미입력" ? "#fff7e6" : "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span style={{ color: "#6d756f", fontSize: 12, fontWeight: 700 }}>
            미입력
          </span>
          <strong style={{ display: "block", marginTop: 4, fontSize: 28 }}>
            {targetSaved ? 0 : filteredTargets.length}
            <small style={{ marginLeft: 4, color: "#68736b", fontSize: 12 }}>
              건
            </small>
          </strong>
        </button>
        <button
          type="button"
          className="adoms-progress-card"
          onClick={() => setStatusFilter("입력")}
          style={{
            padding: "18px 24px",
            border: 0,
            background: statusFilter === "입력" ? "#f3f3f5" : "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span style={{ color: "#6d756f", fontSize: 12, fontWeight: 700 }}>
            입력
          </span>
          <strong style={{ display: "block", marginTop: 4, fontSize: 28 }}>
            {targetSaved ? filteredTargets.length : 0}
            <small style={{ marginLeft: 4, color: "#68736b", fontSize: 12 }}>
              건
            </small>
          </strong>
        </button>
      </section>

      <section className="adoms-target-table" style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 49,
            padding: "0 16px",
            borderBottom: "1px solid #dfe4de",
          }}
        >
          <strong style={{ fontSize: 12 }}>
            총{" "}
            <b style={{ color: "#1d6fa3", fontSize: 17 }}>
              {filteredTargets.length}
            </b>
            개소
          </strong>
          <div className="adoms-list-actions">
            <span style={{ color: "#7a837d", fontSize: 10 }}>
              {facilitySource === "supabase"
                ? "Supabase 시설·의무 매핑 DB 조회"
                : facilitySource === "loading"
                  ? "시설 DB 조회 중"
                  : "로컬 시연 데이터"}
            </span>
            <button
              type="button"
              className="adoms-csv-button"
              onClick={downloadTargetCsv}
              disabled={filteredTargets.length === 0}
            >
              <Download size={14} aria-hidden="true" /> CSV 내려받기
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr .8fr 1.45fr .5fr .55fr",
            background: "#edf1f5",
            fontSize: 11,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          {[
            targetKind === "도급·용역·위탁" ? "계약명" : "관리대상명",
            "분류",
            "주소",
            "적용의무",
            "데이터",
          ].map(label => (
            <span
              className="adoms-table-head"
              key={label}
              style={{
                ...tableCellStyle,
                borderBottom: "1px solid #cfd5cf",
                display: "grid",
                placeItems: "center",
              }}
            >
              {label}
            </span>
          ))}
        </div>
        {filteredTargets.length > 0 ? (
          filteredTargets.map(item => (
            <button
              type="button"
              key={item.id}
              className="adoms-target-row"
              onClick={() => openTargetForm(item.id)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "1.15fr .8fr 1.45fr .5fr .55fr",
                border: 0,
                background: item.id === selected.id ? "#f3f7fa" : "#fff",
                color: "#354139",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{ ...tableCellStyle, color: "#312a32", fontWeight: 800 }}
              >
                {item.name}
              </span>
              <span style={tableCellStyle}>{displayTargetCategory(item)}</span>
              <span style={tableCellStyle}>{item.address}</span>
              <span style={{ ...tableCellStyle, textAlign: "center" }}>
                {item.obligationCount}건
              </span>
              <span
                style={{
                  ...tableCellStyle,
                  color: item.isDemoVirtual ? "#1d6fa3" : "#4d5650",
                  textAlign: "center",
                  fontWeight: item.isDemoVirtual ? 800 : 600,
                }}
              >
                {item.isDemoVirtual ? "시연값" : item.sourceKind}
              </span>
            </button>
          ))
        ) : (
          <div
            className="adoms-empty-state"
            style={{
              padding: "46px 20px",
              color: "#7d857f",
              textAlign: "center",
              fontSize: 12,
            }}
          >
            조회된 관리대상이 없습니다. 입력현황 또는 검색조건을 변경해 주세요.
          </div>
        )}
      </section>
    </>
  );

  const renderTargetForm = () => (
    <>
      <div className="adoms-page-heading page-heading compact">
        <div>
          <p
            style={{
              margin: 0,
              color: "#6d756f",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            기본정보 / {displayTargetCategory(selected)}
          </p>
          <h1>
            {selected.category === "사업장"
              ? `${selected.name} 기본정보 등록·관리`
              : `${selected.name} 기준정보·적용의무`}
          </h1>
          <p>
            {selected.category === "사업장"
              ? "기준일자별 근무인원과 담당자 정보를 하나의 양식에서 저장합니다."
              : "선택 관리대상의 기준정보와 대상별 법령 의무 매핑을 확인합니다."}
          </p>
        </div>
      </div>

      <section
        className="adoms-target-form"
        style={{ display: "grid", gap: 14 }}
      >
        <div className="adoms-basic-section" style={sectionStyle}>
          <FormSectionTitle
            number="1."
            title="기본정보"
            open={basicOpen}
            onClick={() => setBasicOpen(open => !open)}
          />
          {basicOpen && (
            <div style={{ padding: 18 }}>
              <div
                className="adoms-reference-date"
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px minmax(0,1fr)",
                  alignItems: "center",
                  padding: "10px 13px",
                  marginBottom: 18,
                  background: "#eef2f6",
                  borderRadius: 5,
                }}
              >
                <strong style={{ fontSize: 11 }}>기준일자</strong>
                <input
                  type="date"
                  value={targetDraft.date}
                  onChange={event =>
                    setTargetDraft(previous => ({
                      ...previous,
                      date: event.target.value,
                    }))
                  }
                  style={{ ...fieldStyle, width: 170 }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px 18px",
                }}
              >
                <LabeledField label="관리대상명">
                  <input value={selected.name} readOnly style={readonlyStyle} />
                </LabeledField>
                <LabeledField label="부서명">
                  <input
                    value={selected.department}
                    readOnly
                    style={readonlyStyle}
                  />
                </LabeledField>
                <LabeledField label="주소" required wide>
                  <input
                    value={targetDraft.address}
                    readOnly={selected.category !== "사업장"}
                    onChange={event =>
                      setTargetDraft(previous => ({
                        ...previous,
                        address: event.target.value,
                      }))
                    }
                    style={
                      selected.category === "사업장"
                        ? fieldStyle
                        : readonlyStyle
                    }
                  />
                </LabeledField>
                <LabeledField
                  label={
                    selected.category === "사업장"
                      ? "업종분류(안) (한국표준산업분류)"
                      : "관리대상 세부분류"
                  }
                  required
                >
                  <input
                    value={targetDraft.industry}
                    readOnly={selected.category !== "사업장"}
                    onChange={event =>
                      setTargetDraft(previous => ({
                        ...previous,
                        industry: event.target.value,
                      }))
                    }
                    style={
                      selected.category === "사업장"
                        ? fieldStyle
                        : readonlyStyle
                    }
                  />
                </LabeledField>
                <LabeledField
                  label={
                    selected.category === "사업장"
                      ? "업종분류 코드"
                      : "기준정보 출처"
                  }
                >
                  <input
                    value={targetDraft.industryCode}
                    readOnly={selected.category !== "사업장"}
                    onChange={event =>
                      setTargetDraft(previous => ({
                        ...previous,
                        industryCode: event.target.value,
                      }))
                    }
                    style={
                      selected.category === "사업장"
                        ? fieldStyle
                        : readonlyStyle
                    }
                  />
                </LabeledField>
              </div>
              <div
                style={{
                  display: selected.category === "사업장" ? undefined : "none",
                  marginTop: 24,
                  overflowX: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 9,
                  }}
                >
                  <strong style={{ fontSize: 12 }}>근무인원</strong>
                  <span style={{ color: "#77817a", fontSize: 10 }}>
                    기준일자 현재 인원 및 현업업무 종사자
                  </span>
                </div>
                <div
                  className="adoms-headcount-table"
                  style={{
                    minWidth: 860,
                    display: "grid",
                    gridTemplateColumns: "120px repeat(8, minmax(85px,1fr))",
                    borderTop: "1px solid #cfd6cf",
                    borderLeft: "1px solid #cfd6cf",
                  }}
                >
                  <span
                    style={{
                      ...tableCellStyle,
                      display: "grid",
                      placeItems: "center",
                      background: "#edf1f5",
                      fontWeight: 800,
                    }}
                  >
                    구분
                  </span>
                  {employmentTypes.map(type => (
                    <span
                      key={type}
                      style={{
                        ...tableCellStyle,
                        display: "grid",
                        placeItems: "center",
                        background: "#edf1f5",
                        fontWeight: 800,
                      }}
                    >
                      {type}
                    </span>
                  ))}
                  <span
                    style={{
                      ...tableCellStyle,
                      background: "#f8faf8",
                      fontWeight: 800,
                    }}
                  >
                    현원
                  </span>
                  {employmentTypes.map(type => (
                    <input
                      key={`current-${type}`}
                      type="number"
                      min="0"
                      value={headcounts[type]?.current ?? 0}
                      onChange={event =>
                        setHeadcounts(previous => ({
                          ...previous,
                          [type]: {
                            ...previous[type],
                            current: Math.max(0, Number(event.target.value)),
                          },
                        }))
                      }
                      style={{
                        ...fieldStyle,
                        height: "100%",
                        border: 0,
                        borderRadius: 0,
                        borderRight: "1px solid #e1e5e1",
                        borderBottom: "1px solid #e1e5e1",
                        textAlign: "right",
                      }}
                    />
                  ))}
                  <span
                    style={{
                      ...tableCellStyle,
                      background: "#f8faf8",
                      fontWeight: 800,
                    }}
                  >
                    현업업무종사자
                  </span>
                  {employmentTypes.map(type => (
                    <input
                      key={`field-${type}`}
                      type="number"
                      min="0"
                      value={headcounts[type]?.field ?? 0}
                      onChange={event =>
                        setHeadcounts(previous => ({
                          ...previous,
                          [type]: {
                            ...previous[type],
                            field: Math.max(0, Number(event.target.value)),
                          },
                        }))
                      }
                      style={{
                        ...fieldStyle,
                        height: "100%",
                        border: 0,
                        borderRadius: 0,
                        borderRight: "1px solid #e1e5e1",
                        borderBottom: "1px solid #e1e5e1",
                        textAlign: "right",
                      }}
                    />
                  ))}
                  <span
                    style={{
                      ...tableCellStyle,
                      background: "#eef2f1",
                      fontWeight: 800,
                    }}
                  >
                    합계
                  </span>
                  {employmentTypes.map(type => (
                    <span
                      key={`total-${type}`}
                      style={{
                        ...tableCellStyle,
                        display: "flex",
                        justifyContent: "flex-end",
                        background: "#eef2f1",
                        fontWeight: 800,
                      }}
                    >
                      {headcounts[type]?.current || 0}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 18,
                    marginTop: 9,
                    color: "#465249",
                    fontSize: 11,
                  }}
                >
                  <span>
                    총 현원{" "}
                    <b style={{ color: "#1d6fa3", fontSize: 14 }}>
                      {totalCurrent}
                    </b>
                    명
                  </span>
                  <span>
                    총 현업업무 종사자{" "}
                    <b style={{ color: "#1d6fa3", fontSize: 14 }}>
                      {totalField}
                    </b>
                    명
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="adoms-detail-section"
          style={{
            ...sectionStyle,
            display: selected.category === "사업장" ? undefined : "none",
          }}
        >
          <FormSectionTitle
            number="2."
            title="세부정보"
            open={detailOpen}
            onClick={() => setDetailOpen(open => !open)}
          />
          {detailOpen && (
            <div style={{ padding: 18, display: "grid", gap: 24 }}>
              <div className="adoms-person-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 9,
                  }}
                >
                  <strong style={{ fontSize: 12 }}>업무 담당자</strong>
                  <button
                    type="button"
                    className="adoms-add-person"
                    style={smallButtonStyle}
                    onClick={() => addPerson("worker")}
                  >
                    <Plus size={13} /> 추가
                  </button>
                </div>
                <div style={{ display: "grid", gap: 7 }}>
                  {workers.length === 0 && (
                    <p
                      style={{
                        margin: 0,
                        padding: 12,
                        color: "#7b857e",
                        background: "#f6f7f6",
                        fontSize: 11,
                      }}
                    >
                      등록된 업무 담당자가 없습니다. 추가 버튼으로 담당자를
                      등록하세요.
                    </p>
                  )}
                  {workers.map(person => (
                    <div
                      className="adoms-person-row"
                      key={person.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.2fr 1fr auto",
                        gap: 7,
                      }}
                    >
                      <input
                        aria-label="업무 담당자 이름"
                        value={person.name}
                        onChange={event =>
                          updatePerson(
                            "worker",
                            person.id,
                            "name",
                            event.target.value
                          )
                        }
                        placeholder="이름"
                        style={fieldStyle}
                      />
                      <input
                        aria-label="업무 담당자 소속"
                        value={person.department}
                        onChange={event =>
                          updatePerson(
                            "worker",
                            person.id,
                            "department",
                            event.target.value
                          )
                        }
                        placeholder="소속"
                        style={fieldStyle}
                      />
                      <input
                        aria-label="업무 담당자 연락처"
                        value={person.phone}
                        onChange={event =>
                          updatePerson(
                            "worker",
                            person.id,
                            "phone",
                            event.target.value
                          )
                        }
                        placeholder="연락처"
                        style={fieldStyle}
                      />
                      <button
                        type="button"
                        className="adoms-remove-person"
                        style={smallButtonStyle}
                        onClick={() => removePerson("worker", person.id)}
                      >
                        <Trash2 size={13} /> 삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="adoms-person-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 9,
                  }}
                >
                  <strong style={{ fontSize: 12 }}>
                    관리감독자 <b style={{ color: "#c84455" }}>*</b>
                  </strong>
                  <button
                    type="button"
                    className="adoms-add-supervisor"
                    style={smallButtonStyle}
                    onClick={() => addPerson("supervisor")}
                  >
                    <Plus size={13} /> 추가
                  </button>
                </div>
                <div style={{ display: "grid", gap: 7 }}>
                  {supervisors.length === 0 && (
                    <p
                      style={{
                        margin: 0,
                        padding: 12,
                        color: "#7b857e",
                        background: "#f6f7f6",
                        fontSize: 11,
                      }}
                    >
                      등록된 관리감독자가 없습니다. 추가 버튼으로 관리감독자를
                      등록하세요.
                    </p>
                  )}
                  {supervisors.map(person => (
                    <div
                      className="adoms-supervisor-row"
                      key={person.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: ".82fr 1fr .94fr .9fr 1.3fr auto",
                        gap: 7,
                      }}
                    >
                      <input
                        aria-label="관리감독자 이름"
                        value={person.name}
                        onChange={event =>
                          updatePerson(
                            "supervisor",
                            person.id,
                            "name",
                            event.target.value
                          )
                        }
                        placeholder="이름"
                        style={fieldStyle}
                      />
                      <input
                        aria-label="관리감독자 소속"
                        value={person.department}
                        onChange={event =>
                          updatePerson(
                            "supervisor",
                            person.id,
                            "department",
                            event.target.value
                          )
                        }
                        placeholder="소속"
                        style={fieldStyle}
                      />
                      <input
                        aria-label="관리감독자 연락처"
                        value={person.phone}
                        onChange={event =>
                          updatePerson(
                            "supervisor",
                            person.id,
                            "phone",
                            event.target.value
                          )
                        }
                        placeholder="연락처"
                        style={fieldStyle}
                      />
                      <input
                        aria-label="관리감독자 직위"
                        value={person.position || ""}
                        onChange={event =>
                          updatePerson(
                            "supervisor",
                            person.id,
                            "position",
                            event.target.value
                          )
                        }
                        placeholder="직위"
                        style={fieldStyle}
                      />
                      <input
                        aria-label="관리감독자 선임기간"
                        value={person.period || ""}
                        onChange={event =>
                          updatePerson(
                            "supervisor",
                            person.id,
                            "period",
                            event.target.value
                          )
                        }
                        placeholder="선임기간"
                        style={fieldStyle}
                      />
                      <button
                        type="button"
                        className="adoms-remove-supervisor"
                        style={smallButtonStyle}
                        onClick={() => removePerson("supervisor", person.id)}
                      >
                        <Trash2 size={13} /> 삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="adoms-target-attachments"
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px minmax(0,1fr)",
                  gap: 12,
                  alignItems: "start",
                  padding: 14,
                  background: "#f6f7f6",
                }}
              >
                <strong style={{ fontSize: 12 }}>첨부파일</strong>
                <FileRows
                  files={targetFiles}
                  prefix="target-file"
                  onChange={(index, value) =>
                    updateFile(setTargetFiles, targetFiles, index, value)
                  }
                  onAdd={() => setTargetFiles(previous => [...previous, ""])}
                  onRemove={index =>
                    removeFile(setTargetFiles, targetFiles, index)
                  }
                />
              </div>
            </div>
          )}
        </div>
        {renderTargetObligations()}
      </section>
      <div
        className="adoms-form-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 16,
        }}
      >
        <button
          type="button"
          className="adoms-back-to-list secondary-btn"
          onClick={() => setScreen("target-list")}
        >
          〈 목록으로
        </button>
        {selected.category === "사업장" && (
          <button
            type="button"
            className="adoms-save-target primary-btn"
            onClick={saveTarget}
          >
            저장
          </button>
        )}
      </div>
    </>
  );

  const renderContractList = () => (
    <>
      <div className="adoms-page-heading page-heading compact">
        <div>
          <p
            style={{
              margin: 0,
              color: "#6d756f",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            사업
          </p>
          <h1>도급·용역·위탁 현황</h1>
          <p>용인시청 소관 계약의 위험요인과 관리의무 이행정보를 등록합니다.</p>
        </div>
        <button
          type="button"
          className="adoms-basic-tab secondary-btn"
          onClick={() => setScreen("target-list")}
        >
          기본정보 · 사업장
        </button>
      </div>
      <section
        className="adoms-contract-search"
        style={{
          ...sectionStyle,
          display: "grid",
          gridTemplateColumns: "130px minmax(280px,1fr) auto auto",
          gap: 12,
          alignItems: "center",
          padding: 16,
          marginBottom: 16,
          background: "#f0f2f5",
        }}
      >
        <strong style={{ fontSize: 12 }}>계약명</strong>
        <div style={{ position: "relative" }}>
          <input
            className="adoms-contract-query"
            value={contractQuery}
            onChange={event => setContractQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                setSearchedContractQuery(contractQuery);
                announce("계약명 검색을 적용했습니다.");
              }
            }}
            placeholder="계약명을 입력하세요"
            style={fieldStyle}
          />
          <Search
            size={15}
            style={{
              position: "absolute",
              top: 12,
              right: 10,
              color: "#8b9690",
            }}
          />
        </div>
        <button
          type="button"
          className="adoms-contract-search-button outline-btn"
          onClick={() => {
            setSearchedContractQuery(contractQuery);
            announce("계약명 검색을 적용했습니다.");
          }}
        >
          <Search size={14} /> 검색
        </button>
        <button
          type="button"
          className="adoms-register-contract secondary-btn"
          onClick={openNewContract}
        >
          <Plus size={14} /> 도급·용역·위탁 등록하기
        </button>
      </section>
      <section className="adoms-contract-table" style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minHeight: 49,
            padding: "0 16px",
            borderBottom: "1px solid #dfe4de",
          }}
        >
          <strong style={{ fontSize: 12 }}>
            총{" "}
            <b style={{ color: "#1d6fa3", fontSize: 17 }}>
              {filteredContracts.length}
            </b>
            건
          </strong>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ".9fr .9fr 1.05fr 1.45fr .62fr",
            background: "#edf1f5",
            fontSize: 11,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          {["실·국·본부", "부서명", "시설물명", "계약명", "담당자"].map(
            label => (
              <span
                className="adoms-table-head"
                key={label}
                style={{
                  ...tableCellStyle,
                  borderBottom: "1px solid #cfd5cf",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {label}
              </span>
            )
          )}
        </div>
        {filteredContracts.length === 0 ? (
          <div
            className="adoms-empty-contracts"
            style={{
              padding: "52px 20px",
              color: "#7c857f",
              textAlign: "center",
              fontSize: 12,
            }}
          >
            등록된 도급·용역·위탁 정보가 없습니다.
          </div>
        ) : (
          filteredContracts.map(contract => (
            <button
              type="button"
              key={contract.id}
              className="adoms-contract-row"
              onClick={() => openExistingContract(contract)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: ".9fr .9fr 1.05fr 1.45fr .62fr",
                border: 0,
                background: "#fff",
                color: "#354139",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={tableCellStyle}>용인시</span>
              <span style={tableCellStyle}>{contract.orderingDepartment}</span>
              <span style={tableCellStyle}>{contract.facility}</span>
              <span
                style={{ ...tableCellStyle, color: "#29322d", fontWeight: 800 }}
              >
                {contract.contractName}
              </span>
              <span style={tableCellStyle}>{contract.manager}</span>
            </button>
          ))
        )}
      </section>
    </>
  );

  const renderContractForm = () => (
    <>
      <div className="adoms-page-heading page-heading compact">
        <div>
          <p
            style={{
              margin: 0,
              color: "#6d756f",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            사업 / 도급·용역·위탁 현황
          </p>
          <h1>도급·용역·위탁 정보 등록·관리</h1>
          <p>
            계약 기본정보, 유해·위험요인, 관리의무 이행정보를 한 번에
            저장합니다.
          </p>
        </div>
        <button
          type="button"
          className="adoms-basic-tab secondary-btn"
          onClick={() => setScreen("target-list")}
        >
          기본정보 · 사업장
        </button>
      </div>
      <section
        className="adoms-contract-form"
        style={{ display: "grid", gap: 14 }}
      >
        <div className="adoms-contract-basic" style={sectionStyle}>
          <FormSectionTitle
            number="1."
            title="계약 기본정보"
            open={contractBasicOpen}
            onClick={() => setContractBasicOpen(open => !open)}
          />
          {contractBasicOpen && (
            <div style={{ padding: 18 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px 18px",
                }}
              >
                <LabeledField label="계약명" required wide>
                  <input
                    value={contractDraft.contractName}
                    onChange={event =>
                      updateContract("contractName", event.target.value)
                    }
                    placeholder="계약명을 입력하세요"
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="발주부서(소관부서)" required>
                  <input
                    value={contractDraft.orderingDepartment}
                    onChange={event =>
                      updateContract("orderingDepartment", event.target.value)
                    }
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="담당자 / 연락처">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.3fr",
                      gap: 7,
                    }}
                  >
                    <input
                      value={contractDraft.manager}
                      onChange={event =>
                        updateContract("manager", event.target.value)
                      }
                      placeholder="담당자"
                      style={fieldStyle}
                    />
                    <input
                      value={contractDraft.managerPhone}
                      onChange={event =>
                        updateContract("managerPhone", event.target.value)
                      }
                      placeholder="연락처"
                      style={fieldStyle}
                    />
                  </div>
                </LabeledField>
                <LabeledField label="계약대상자(업체명)" required>
                  <input
                    value={contractDraft.company}
                    onChange={event =>
                      updateContract("company", event.target.value)
                    }
                    placeholder="업체명"
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="계약기간" required>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      gap: 7,
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="date"
                      value={contractDraft.startDate}
                      onChange={event =>
                        updateContract("startDate", event.target.value)
                      }
                      style={fieldStyle}
                    />
                    <span style={{ color: "#78827b" }}>~</span>
                    <input
                      type="date"
                      value={contractDraft.endDate}
                      onChange={event =>
                        updateContract("endDate", event.target.value)
                      }
                      style={fieldStyle}
                    />
                  </div>
                </LabeledField>
                <LabeledField label="계약유형">
                  <select
                    value={contractDraft.contractType}
                    onChange={event =>
                      updateContract("contractType", event.target.value)
                    }
                    style={fieldStyle}
                  >
                    <option>도급</option>
                    <option>용역</option>
                    <option>위탁</option>
                  </select>
                </LabeledField>
                <LabeledField label="계약금액(원)">
                  <input
                    type="number"
                    min="0"
                    value={contractDraft.amount}
                    onChange={event =>
                      updateContract("amount", event.target.value)
                    }
                    placeholder="0"
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="주요수행업무" required wide>
                  <input
                    value={contractDraft.work}
                    onChange={event =>
                      updateContract("work", event.target.value)
                    }
                    placeholder="주요 수행업무를 입력하세요"
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="시설물명" required>
                  <input
                    value={contractDraft.facility}
                    onChange={event =>
                      updateContract("facility", event.target.value)
                    }
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="수탁담당자 / 연락처">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.3fr",
                      gap: 7,
                    }}
                  >
                    <input
                      value={contractDraft.contractorManager}
                      onChange={event =>
                        updateContract("contractorManager", event.target.value)
                      }
                      placeholder="수탁담당자"
                      style={fieldStyle}
                    />
                    <input
                      value={contractDraft.contractorPhone}
                      onChange={event =>
                        updateContract("contractorPhone", event.target.value)
                      }
                      placeholder="연락처"
                      style={fieldStyle}
                    />
                  </div>
                </LabeledField>
                <LabeledField label="사업자등록번호">
                  <input
                    value={contractDraft.businessNumber}
                    onChange={event =>
                      updateContract("businessNumber", event.target.value)
                    }
                    placeholder="000-00-00000"
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="업종">
                  <input
                    value={contractDraft.businessType}
                    onChange={event =>
                      updateContract("businessType", event.target.value)
                    }
                    placeholder="업종을 입력하세요"
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="상시 근로자 수">
                  <input
                    type="number"
                    min="0"
                    value={contractDraft.employees}
                    onChange={event =>
                      updateContract("employees", event.target.value)
                    }
                    placeholder="0"
                    style={fieldStyle}
                  />
                </LabeledField>
                <LabeledField label="사업참여 인력 수">
                  <input
                    type="number"
                    min="0"
                    value={contractDraft.participants}
                    onChange={event =>
                      updateContract("participants", event.target.value)
                    }
                    placeholder="0"
                    style={fieldStyle}
                  />
                </LabeledField>
              </div>
              <div
                className="adoms-contract-attachments"
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px minmax(0,1fr)",
                  gap: 12,
                  alignItems: "start",
                  padding: 14,
                  marginTop: 20,
                  background: "#f6f7f6",
                }}
              >
                <strong style={{ fontSize: 12 }}>첨부파일</strong>
                <FileRows
                  files={contractFiles}
                  prefix="contract-file"
                  onChange={(index, value) =>
                    updateFile(setContractFiles, contractFiles, index, value)
                  }
                  onAdd={() => setContractFiles(previous => [...previous, ""])}
                  onRemove={index =>
                    removeFile(setContractFiles, contractFiles, index)
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="adoms-contract-hazards" style={sectionStyle}>
          <FormSectionTitle
            number="2."
            title="유해·위험요인 정보"
            open={contractRiskOpen}
            onClick={() => setContractRiskOpen(open => !open)}
          />
          {contractRiskOpen && (
            <div style={{ padding: 18 }}>
              <LabeledField label="업무수행장소" required>
                <input
                  value={contractDraft.workplace}
                  onChange={event =>
                    updateContract("workplace", event.target.value)
                  }
                  placeholder="실제 업무수행장소를 입력하세요"
                  style={fieldStyle}
                />
              </LabeledField>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 22,
                  marginBottom: 10,
                }}
              >
                <strong style={{ fontSize: 12 }}>유해·위험 작업 장소</strong>
                <button
                  type="button"
                  className="adoms-clear-hazards"
                  onClick={() => {
                    setHazards([]);
                    announce("선택한 위험장소를 모두 해제했습니다.");
                  }}
                  style={smallButtonStyle}
                >
                  전체해제
                </button>
              </div>
              <div
                className="adoms-hazard-chips"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  minHeight: 32,
                  padding: 8,
                  marginBottom: 12,
                  background: "#f6f7f6",
                  border: "1px solid #e0e4e0",
                }}
              >
                {hazards.length === 0 ? (
                  <span
                    style={{
                      padding: "4px 3px",
                      color: "#7d857e",
                      fontSize: 10,
                    }}
                  >
                    선택된 위험장소가 없습니다.
                  </span>
                ) : (
                  hazards.map(number => (
                    <button
                      type="button"
                      key={number}
                      className="adoms-hazard-chip"
                      onClick={() => toggleHazard(number)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 7px",
                        border: "1px solid #cfd6cf",
                        borderRadius: 3,
                        color: "#465249",
                        background: "#fff",
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      {number}. {hazardPlaces[number - 1]} <X size={12} />
                    </button>
                  ))
                )}
              </div>
              <div
                className="adoms-hazard-list"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  borderTop: "1px solid #dfe4de",
                  borderLeft: "1px solid #dfe4de",
                }}
              >
                {hazardPlaces.map((place, index) => {
                  const number = index + 1;
                  const active = hazards.includes(number);
                  return (
                    <button
                      type="button"
                      key={place}
                      className="adoms-hazard-option"
                      onClick={() => toggleHazard(number)}
                      aria-pressed={active}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        minHeight: 47,
                        padding: "9px 12px",
                        border: 0,
                        borderRight: "1px solid #dfe4de",
                        borderBottom: "1px solid #dfe4de",
                        background: active ? "#e7f1f8" : "#fff",
                        color: "#435047",
                        textAlign: "left",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      <i
                        style={{
                          display: "grid",
                          placeItems: "center",
                          flex: "0 0 auto",
                          width: 17,
                          height: 17,
                          border: `1px solid ${active ? "#1d6fa3" : "#b3bcb5"}`,
                          borderRadius: "50%",
                          color: "#fff",
                          background: active ? "#1d6fa3" : "#fff",
                        }}
                      >
                        {active && <Check size={11} />}
                      </i>
                      <span>
                        <b style={{ color: "#526158", marginRight: 4 }}>
                          {number}.
                        </b>
                        {place}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="adoms-contract-duty" style={sectionStyle}>
          <FormSectionTitle
            number="3."
            title="관리의무 이행정보"
            open={contractDutyOpen}
            onClick={() => setContractDutyOpen(open => !open)}
          />
          {contractDutyOpen && (
            <div style={{ padding: 18 }}>
              <p style={{ margin: "0 0 12px", color: "#6e7771", fontSize: 10 }}>
                관리의무별 준수여부와 증빙파일을 입력하세요. 첨부파일은 개당
                10MB 이하로 등록합니다.
              </p>
              <div
                className="adoms-duty-table"
                style={{
                  borderTop: "1px solid #cfd6cf",
                  borderLeft: "1px solid #cfd6cf",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1.15fr 1.35fr 1.2fr minmax(210px,1.2fr)",
                    background: "#edf1f5",
                    fontSize: 10,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  {["관리의무", "세부 항목", "준수여부", "증빙파일"].map(
                    label => (
                      <span
                        key={label}
                        style={{
                          ...tableCellStyle,
                          display: "grid",
                          placeItems: "center",
                          borderBottom: "1px solid #cfd6cf",
                        }}
                      >
                        {label}
                      </span>
                    )
                  )}
                </div>
                {contractDuties.map((duty, index) => {
                  const dutyStatus = dutyStatuses[duty.id];
                  return (
                    <div
                      className="adoms-duty-row"
                      key={duty.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1.15fr 1.35fr 1.2fr minmax(210px,1.2fr)",
                        background:
                          dutyStatus === "미이행" ? "#fff5f5" : "#fff",
                      }}
                    >
                      <span style={{ ...tableCellStyle, fontWeight: 700 }}>
                        {duty.group}
                      </span>
                      <span style={tableCellStyle}>{duty.item}</span>
                      <span
                        style={{
                          ...tableCellStyle,
                          display: "flex",
                          flexWrap: "wrap",
                          alignContent: "center",
                          gap: 5,
                        }}
                      >
                        {(
                          ["이행완료", "보완필요", "미이행"] as DutyStatus[]
                        ).map(status => {
                          const selectedStatus = dutyStatus === status;
                          return (
                            <button
                              type="button"
                              key={status}
                              className="adoms-duty-status"
                              onClick={() =>
                                setDutyStatuses(previous => ({
                                  ...previous,
                                  [duty.id]: status,
                                }))
                              }
                              aria-pressed={selectedStatus}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                padding: "4px 5px",
                                border: `1px solid ${selectedStatus ? statusStyle[status].borderColor : "#d6dcd6"}`,
                                borderRadius: 3,
                                color: selectedStatus
                                  ? statusStyle[status].color
                                  : "#7b857e",
                                background: selectedStatus
                                  ? statusStyle[status].background
                                  : "#fff",
                                fontSize: 9,
                                fontWeight: selectedStatus ? 800 : 600,
                                cursor: "pointer",
                              }}
                            >
                              {selectedStatus && <Check size={10} />}
                              {status}
                            </button>
                          );
                        })}
                      </span>
                      <span style={{ ...tableCellStyle, padding: 7 }}>
                        <FileRows
                          files={dutyFiles[duty.id] || []}
                          prefix={`duty-file-${index}`}
                          onChange={(fileIndex, value) =>
                            updateDutyFiles(
                              duty.id,
                              (dutyFiles[duty.id] || []).map(
                                (file, currentIndex) =>
                                  currentIndex === fileIndex ? value : file
                              )
                            )
                          }
                          onAdd={() =>
                            updateDutyFiles(duty.id, [
                              ...(dutyFiles[duty.id] || []),
                              "",
                            ])
                          }
                          onRemove={fileIndex =>
                            updateDutyFiles(
                              duty.id,
                              (dutyFiles[duty.id] || []).filter(
                                (_, currentIndex) => currentIndex !== fileIndex
                              )
                            )
                          }
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
      <div
        className="adoms-form-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 16,
        }}
      >
        <button
          type="button"
          className="adoms-back-contract-list secondary-btn"
          onClick={() => setScreen("contract-list")}
        >
          〈 목록으로
        </button>
        <button
          type="button"
          className="adoms-save-contract primary-btn"
          onClick={saveContract}
        >
          저장
        </button>
      </div>
    </>
  );

  return (
    <div className="page adoms-targets-page">
      {screen === "target-list" && renderTargetList()}
      {screen === "target-form" && renderTargetForm()}
      <Dialog
        open={Boolean(selectedLegalBasis)}
        onOpenChange={open => {
          if (!open) setSelectedLegalBasis(null);
        }}
      >
        <DialogContent
          aria-describedby="legal-basis-description"
          className="legal-source-dialog max-h-[88vh] overflow-hidden border-[#dce3ea] bg-[#f8fafc] p-0 sm:max-w-[820px]"
        >
          {selectedLegalBasis && (
            <>
              <DialogHeader className="legal-source-print-header gap-3 border-b border-[#e4e0e5] bg-white px-7 py-6 text-left">
                <span
                  style={{
                    width: "fit-content",
                    padding: "4px 9px",
                    border: "1px solid #b9d3e6",
                    borderRadius: 999,
                    color: "#1d6fa3",
                    background: "#eef4f8",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: ".05em",
                  }}
                >
                  법령 조문 원문
                </span>
                <DialogTitle className="pr-8 text-[20px] leading-[1.45] text-[#202624]">
                  {selectedLegalBasis.title}
                </DialogTitle>
                <DialogDescription
                  id="legal-basis-description"
                  className="text-[12px] leading-5 text-[#68716b]"
                >
                  {selectedLegalBasis.lawName} {selectedLegalBasis.article} ·
                  정식 원문 {selectedLegalBasis.legalSources.length}건
                </DialogDescription>
              </DialogHeader>

              <div
                className="legal-source-print-body"
                style={{
                  display: "grid",
                  gap: 16,
                  maxHeight: "calc(88vh - 220px)",
                  padding: "22px 28px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px minmax(0,1fr)",
                    gap: "9px 14px",
                    padding: 16,
                    border: "1px solid #e1e4e2",
                    borderRadius: 8,
                    background: "#f4f6f5",
                    fontSize: 11,
                    lineHeight: 1.55,
                  }}
                >
                  <strong style={{ color: "#68716b" }}>적용 의무</strong>
                  <span style={{ color: "#29322d", fontWeight: 750 }}>
                    {selectedLegalBasis.title}
                  </span>
                  <strong style={{ color: "#68716b" }}>근거</strong>
                  <span style={{ color: "#29322d", fontWeight: 750 }}>
                    {selectedLegalBasis.lawName} {selectedLegalBasis.article}
                  </span>
                  <strong style={{ color: "#68716b" }}>원문 연결</strong>
                  <span style={{ color: "#505a54" }}>
                    ADOMS 정식 조문 {selectedLegalBasis.legalSources.length}건 ·
                    Supabase 조회
                  </span>
                </div>

                {selectedLegalBasis.legalSources.length > 0 ? (
                  selectedLegalBasis.legalSources.map((source, index) => (
                    <article
                      key={`${source.sourceUnitId}-${source.sourceOrder}`}
                      className="legal-source-print-card"
                      style={{
                        overflow: "hidden",
                        border: "1px solid #dedfe0",
                        borderRadius: 8,
                        background: "#fff",
                      }}
                    >
                      <header
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 16,
                          padding: "14px 18px",
                          borderBottom: "1px solid #e7e8e8",
                          background: "#f7f9fb",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              display: "block",
                              color: "#1d6fa3",
                              fontSize: 10,
                              marginBottom: 5,
                            }}
                          >
                            {selectedLegalBasis.legalSources.length > 1
                              ? `근거 ${index + 1}`
                              : "법령 근거"}
                          </strong>
                          <h3
                            style={{
                              margin: 0,
                              color: "#252b28",
                              fontSize: 14,
                              lineHeight: 1.5,
                            }}
                          >
                            {source.documentTitle} {source.article}
                          </h3>
                          {source.articleTitle && (
                            <p
                              style={{
                                margin: "4px 0 0",
                                color: "#68716b",
                                fontSize: 11,
                              }}
                            >
                              {source.articleTitle}
                            </p>
                          )}
                        </div>
                        {source.officialDetailUrl && (
                          <a
                            href={source.officialDetailUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              flex: "0 0 auto",
                              color: "#155985",
                              fontSize: 10,
                              fontWeight: 750,
                              textDecoration: "underline",
                              textUnderlineOffset: 3,
                            }}
                          >
                            국가법령정보센터
                          </a>
                        )}
                      </header>

                      <div className="legal-source-date-grid">
                        <div>
                          <span>법령 최근 개정일</span>
                          <strong>
                            {formatLegalDate(source.lastAmendedAt)}
                          </strong>
                        </div>
                        <div>
                          <span>현행법령 시행일</span>
                          <strong>
                            {formatLegalDate(source.effectiveFrom)}
                          </strong>
                        </div>
                        <div>
                          <span>개정 구분</span>
                          <strong>
                            {source.amendmentKind || "원천 미표기"}
                          </strong>
                        </div>
                        <div>
                          <span>기준 확인일</span>
                          <strong>
                            {formatLegalDate(source.officialCheckedAt)}
                          </strong>
                        </div>
                      </div>

                      <section
                        aria-label={`${source.documentTitle} ${source.article} 원문`}
                        style={{ padding: "16px 18px 18px" }}
                      >
                        <h4
                          style={{
                            margin: "0 0 9px",
                            color: "#48514c",
                            fontSize: 11,
                          }}
                        >
                          조문 원문
                        </h4>
                        <div
                          style={{
                            minHeight: 110,
                            padding: "16px 18px",
                            borderLeft: "3px solid #1d6fa3",
                            borderRadius: "0 8px 8px 0",
                            color: "#303834",
                            background: "#f8f9f8",
                            boxShadow: "inset 0 0 0 1px #e4e7e5",
                            fontSize: 13,
                            lineHeight: 1.85,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {source.sourceText}
                        </div>
                        {source.provisionLastAmendedAt && (
                          <p
                            style={{
                              margin: "9px 0 0",
                              color: "#796f76",
                              fontSize: 10,
                            }}
                          >
                            조문 원문 내 최종 개정 표기:{" "}
                            {formatLegalDate(source.provisionLastAmendedAt)}
                          </p>
                        )}
                        {source.provisionEffectiveFrom &&
                          source.provisionEffectiveFrom !==
                            source.effectiveFrom && (
                            <p
                              style={{
                                margin: "9px 0 0",
                                color: "#796f76",
                                fontSize: 10,
                              }}
                            >
                              해당 조문 효력일:{" "}
                              {formatLegalDate(source.provisionEffectiveFrom)}
                            </p>
                          )}
                      </section>
                    </article>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 24,
                      border: "1px dashed #d6cdd6",
                      borderRadius: 8,
                      color: "#707972",
                      background: "#fff",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    연결된 조문 원문이 없습니다. 정식 원문 식별자를 확인해
                    주세요.
                  </div>
                )}

                <p
                  style={{
                    margin: 0,
                    color: "#7a827d",
                    fontSize: 10,
                    lineHeight: 1.6,
                  }}
                >
                  원문과 조문 효력일은 ADOMS 사실층, 법령 최근 개정일과 현행법령
                  시행일은 국가법령정보센터 조회 결과입니다. 2026-09-06 기준
                  스냅숏이며 실제 업무 적용 전 최신 개정 여부를 다시 확인해야
                  합니다.
                </p>
              </div>

              <DialogFooter className="legal-source-print-actions border-t border-[#e4e0e5] bg-white px-7 py-4 sm:justify-between">
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={copyLegalBasis}
                    disabled={selectedLegalBasis.legalSources.length === 0}
                  >
                    <Copy size={14} /> 원문 복사
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={printLegalBasis}
                    disabled={selectedLegalBasis.legalSources.length === 0}
                  >
                    <Printer size={14} /> 인쇄
                  </button>
                </div>
                <DialogClose asChild>
                  <button type="button" className="primary-btn">
                    닫기
                  </button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {toast && (
        <div
          role="status"
          className="adoms-save-toast"
          style={{
            position: "fixed",
            right: 28,
            bottom: 28,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "11px 14px",
            border: "1px solid #b9ddd4",
            borderRadius: 5,
            color: "#0b6f61",
            background: "#edfaf6",
            boxShadow: "0 9px 26px rgba(30,33,36,.16)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
