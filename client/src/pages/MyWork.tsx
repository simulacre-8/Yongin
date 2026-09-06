import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  FilePlus2,
  History,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDemo } from "@/contexts/DemoContext";
import {
  acceptMyWork,
  addMyWorkAttachment,
  assignMyWork,
  changeMyWorkStatus,
  confirmMyWorkCompletion,
  downloadMyWorkAttachment,
  downloadMyWorkCsv,
  formatDateTime,
  getMyWorkPriorityLabel,
  getMyWorkStatusLabel,
  loadMyWork,
  loadMyWorkAttachments,
  loadMyWorkEvents,
  loadMyWorkSummary,
  loadYonginOrgUnits,
  MY_WORK_PAGE_SIZE,
  requestMyWorkDelegation,
  type MyWorkAttachment,
  type MyWorkEvent,
  type MyWorkItem,
  type MyWorkStatus,
  type OrgUnit,
} from "@/lib/my-work-api";

const statusOptions: Array<{ value: MyWorkStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "전체 상태" },
  { value: "UNASSIGNED", label: "미배정" },
  { value: "ASSIGNED", label: "배정" },
  { value: "ACCEPTED", label: "배정 수락" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "SUPPLEMENT_REQUIRED", label: "보완 필요" },
  { value: "DELEGATION_REQUESTED", label: "위임 요청" },
  { value: "COMPLETED", label: "완료" },
  { value: "NOT_APPLICABLE", label: "해당 없음" },
];

const eventLabels: Record<string, string> = {
  CREATED: "업무 생성",
  AUTO_ASSIGNED: "자동 담당부서 배정",
  MANUAL_ASSIGNED: "수동 배정",
  REASSIGNED: "수동 재배정",
  ACCEPTED: "배정 수락",
  STATUS_CHANGED: "상태 변경",
  DELEGATION_REQUESTED: "위임 신청",
  DELEGATION_APPROVED: "위임 승인",
  DELEGATION_REJECTED: "위임 반려",
  COMPLETED: "업무 완료",
  CONFIRMED: "완료 확인",
  ATTACHMENT_ADDED: "첨부파일 등록",
  ATTACHMENT_REMOVED: "첨부파일 삭제",
};

function eventLabel(value: string) {
  return eventLabels[value] || value;
}

function topLevelOrganizations(orgs: OrgUnit[]) {
  return orgs.filter(org =>
    [
      "OFFICE",
      "BUREAU",
      "DIRECT_AGENCY",
      "SERVICE_OFFICE",
      "DISTRICT",
    ].includes(org.orgType)
  );
}

const demoAssigneeOrganizations = new Set([
  "중대재해예방팀",
  "도시철도과",
  "수도시설과",
  "재산관리과",
  "도로과",
  "건설도로과",
]);

function priorityRank(item: MyWorkItem) {
  return { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }[item.priorityCode];
}

function statusTone(status: MyWorkStatus) {
  return `status-${status.toLowerCase().replace(/_/g, "-")}`;
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
};

type AssignDraft = {
  item: MyWorkItem;
  org?: OrgUnit;
  assigneeName: string;
  reason: string;
};

type DelegationDraft = {
  item: MyWorkItem;
  org?: OrgUnit;
  assigneeName: string;
  basisNote: string;
  file?: File;
};

type StatusDraft = {
  item: MyWorkItem;
  status:
    | "IN_PROGRESS"
    | "SUPPLEMENT_REQUIRED"
    | "COMPLETED"
    | "NOT_APPLICABLE";
  note: string;
};

type ConfirmationDraft = {
  item: MyWorkItem;
  note: string;
};

export default function MyWork() {
  const { role } = useDemo();
  const [items, setItems] = useState<MyWorkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<MyWorkStatus | "ALL">("ALL");
  const [assignment, setAssignment] = useState<"ALL" | "AUTO" | "MANUAL">(
    "ALL"
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState<OrgUnit[]>([]);
  const [orgPath, setOrgPath] = useState("");
  const [summary, setSummary] = useState<Record<MyWorkStatus, number> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [events, setEvents] = useState<Record<string, MyWorkEvent[]>>({});
  const [attachments, setAttachments] = useState<
    Record<string, MyWorkAttachment[]>
  >({});
  const [historyLoading, setHistoryLoading] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignDraft, setAssignDraft] = useState<AssignDraft | null>(null);
  const [delegationDraft, setDelegationDraft] =
    useState<DelegationDraft | null>(null);
  const [statusDraft, setStatusDraft] = useState<StatusDraft | null>(null);
  const [confirmationDraft, setConfirmationDraft] =
    useState<ConfirmationDraft | null>(null);
  const [orgSearch, setOrgSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refresh = async () => {
    setLoading(true);
    setError("");
    setSummary(null);
    try {
      const [pageResult, summaryResult] = await Promise.all([
        loadMyWork({ status, assignment, orgPath, search, page }),
        loadMyWorkSummary(orgPath),
      ]);
      setItems(
        pageResult.items.sort((a, b) => priorityRank(a) - priorityRank(b))
      );
      setTotal(pageResult.total);
      setSummary(summaryResult);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "내 업무를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYonginOrgUnits()
      .then(rows => setOrgs(rows))
      .catch(reason =>
        setError(reason instanceof Error ? reason.message : String(reason))
      );
  }, []);

  useEffect(() => {
    if (!orgs.length) return;
    if (role === "실·국 점검자") {
      setOrgPath(
        orgs.find(org => org.name === "교통정책국")?.hierarchyPath || ""
      );
    } else if (role === "담당자") {
      setOrgPath(
        orgs.find(org => org.name === "중대재해예방팀")?.hierarchyPath || ""
      );
    } else {
      setOrgPath("");
    }
    setPage(1);
  }, [orgs, role]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, assignment, orgPath, search, page]);

  const topOrgs = useMemo(() => topLevelOrganizations(orgs), [orgs]);
  const scopeOrgs = useMemo(
    () =>
      role === "담당자"
        ? orgs.filter(org => demoAssigneeOrganizations.has(org.name))
        : topOrgs,
    [orgs, role, topOrgs]
  );
  const orgCandidates = useMemo(() => {
    const keyword = orgSearch.trim().toLowerCase();
    return orgs
      .filter(org =>
        keyword
          ? `${org.name} ${org.hierarchyPath}`.toLowerCase().includes(keyword)
          : org.hierarchyLevel <= 4
      )
      .slice(0, 180);
  }, [orgSearch, orgs]);
  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.workItemId)),
    [items, selectedIds]
  );
  const pageCount = Math.max(1, Math.ceil(total / MY_WORK_PAGE_SIZE));

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleHistory = async (item: MyWorkItem) => {
    if (expandedId === item.workItemId) {
      setExpandedId("");
      return;
    }
    setExpandedId(item.workItemId);
    if (events[item.workItemId] && attachments[item.workItemId]) return;
    setHistoryLoading(item.workItemId);
    try {
      const [eventRows, fileRows] = await Promise.all([
        loadMyWorkEvents(item.workItemId),
        loadMyWorkAttachments(item.workItemId),
      ]);
      setEvents(previous => ({ ...previous, [item.workItemId]: eventRows }));
      setAttachments(previous => ({
        ...previous,
        [item.workItemId]: fileRows,
      }));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "이력을 불러오지 못했습니다."
      );
    } finally {
      setHistoryLoading("");
    }
  };

  const executeConfirmed = async () => {
    if (!confirmAction) return;
    setSubmitting(true);
    try {
      await confirmAction.run();
      setConfirmAction(null);
      await refresh();
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "처리에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAccept = (item: MyWorkItem) => {
    setConfirmAction({
      title: "배정을 수락하시겠습니까?",
      description: `${item.targetName} · ${item.obligationTitle} 배정을 현재 시연 역할(${role})로 수락합니다. 수락 시각과 기록 시각이 DB에 저장됩니다.`,
      confirmLabel: "배정 수락",
      run: async () => {
        await acceptMyWork(item.workItemId, role);
        toast.success("배정 수락 시각이 저장되었습니다.");
      },
    });
  };

  const confirmStatus = (
    item: MyWorkItem,
    nextStatus:
      | "IN_PROGRESS"
      | "SUPPLEMENT_REQUIRED"
      | "COMPLETED"
      | "NOT_APPLICABLE",
    note: string
  ) => {
    setConfirmAction({
      title:
        nextStatus === "COMPLETED"
          ? "업무를 완료 처리하시겠습니까?"
          : "상태를 변경하시겠습니까?",
      description:
        nextStatus === "COMPLETED"
          ? `${item.obligationTitle}의 완료 시각·상태 변경 시각·기록 시각을 DB에 저장합니다.`
          : `${item.obligationTitle} 상태를 ${getMyWorkStatusLabel(nextStatus)}(으)로 변경하고 이력을 남깁니다.`,
      confirmLabel: nextStatus === "COMPLETED" ? "완료 처리" : "상태 변경",
      run: async () => {
        await changeMyWorkStatus({
          workItemId: item.workItemId,
          statusCode: nextStatus,
          note,
          role,
        });
        toast.success(
          nextStatus === "COMPLETED"
            ? "완료 시각이 저장되었습니다."
            : "상태가 저장되었습니다."
        );
      },
    });
  };

  const confirmAssignment = () => {
    if (!assignDraft?.org) {
      toast.error("조직도에서 담당 조직을 선택해 주세요.");
      return;
    }
    const draft = assignDraft;
    const selectedOrg = assignDraft.org;
    setConfirmAction({
      title: draft.item.assignedOrgKey
        ? "담당부서를 재배정하시겠습니까?"
        : "담당부서를 배정하시겠습니까?",
      description: `${draft.item.obligationTitle}을(를) ${selectedOrg.hierarchyPath}${draft.assigneeName ? ` · ${draft.assigneeName}` : ""}에 배정합니다. 이전 배정과 발생 시각은 이력으로 남습니다.`,
      confirmLabel: draft.item.assignedOrgKey ? "재배정" : "배정",
      run: async () => {
        await assignMyWork({
          workItemId: draft.item.workItemId,
          toOrgKey: selectedOrg.orgKey,
          assigneeDisplayName: draft.assigneeName,
          reason: draft.reason || "시연 화면에서 수동 배정",
          role,
        });
        setAssignDraft(null);
        setOrgSearch("");
        toast.success("담당부서 배정과 이력이 저장되었습니다.");
      },
    });
  };

  const confirmDelegation = () => {
    if (
      !delegationDraft?.org ||
      !delegationDraft.file ||
      !delegationDraft.basisNote.trim()
    ) {
      toast.error(
        "위임할 조직, 위임 근거, 근거자료 파일을 모두 입력해 주세요."
      );
      return;
    }
    const draft = delegationDraft;
    const selectedOrg = delegationDraft.org;
    const basisFile = delegationDraft.file;
    setConfirmAction({
      title: "업무 위임을 요청하시겠습니까?",
      description: `${selectedOrg.hierarchyPath}에 위임을 요청하고 상태를 ‘위임 요청’으로 바꿉니다. 근거자료 파일과 신청·기록 시각이 DB에 저장됩니다.`,
      confirmLabel: "위임 요청",
      run: async () => {
        await requestMyWorkDelegation({
          workItemId: draft.item.workItemId,
          toOrgKey: selectedOrg.orgKey,
          assigneeDisplayName: draft.assigneeName,
          basisNote: draft.basisNote,
          basisFile,
          role,
        });
        setDelegationDraft(null);
        setOrgSearch("");
        toast.success("위임 요청과 근거자료가 저장되었습니다.");
      },
    });
  };

  const confirmStatusDraft = () => {
    if (!statusDraft) return;
    const draft = statusDraft;
    setStatusDraft(null);
    confirmStatus(
      draft.item,
      draft.status,
      draft.note.trim() || "시연 화면에서 상태 변경"
    );
  };

  const confirmCompletionDraft = () => {
    if (!confirmationDraft) return;
    const draft = confirmationDraft;
    setConfirmationDraft(null);
    setConfirmAction({
      title: "완료 결과를 최종 확인하시겠습니까?",
      description: `${draft.item.obligationTitle}의 완료 결과를 ${role} 역할로 확인합니다. 완료시각은 유지하고 확인시각·확인자·확인 기록을 별도 저장합니다.`,
      confirmLabel: "완료 확인",
      run: async () => {
        await confirmMyWorkCompletion({
          workItemId: draft.item.workItemId,
          note: draft.note.trim() || "완료 결과 확인",
          role,
        });
        toast.success("확인자와 완료 확인 시각이 별도로 저장되었습니다.");
      },
    });
  };

  const addAttachment = async (item: MyWorkItem, file?: File) => {
    if (!file) return;
    try {
      await addMyWorkAttachment({ workItemId: item.workItemId, file, role });
      const rows = await loadMyWorkAttachments(item.workItemId);
      setAttachments(previous => ({ ...previous, [item.workItemId]: rows }));
      toast.success("첨부파일이 저장되었습니다.");
      await refresh();
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "파일 저장에 실패했습니다."
      );
    }
  };

  const confirmAttachment = (item: MyWorkItem, file?: File) => {
    if (!file) return;
    setConfirmAction({
      title: "첨부파일을 저장하시겠습니까?",
      description: `${item.obligationTitle}에 ${file.name} (${Math.max(1, Math.ceil(file.size / 1024)).toLocaleString()}KB)을 등록합니다. 파일과 메타데이터, 발생시각·기록시각이 시연 런타임 DB에 저장됩니다.`,
      confirmLabel: "첨부",
      run: async () => addAttachment(item, file),
    });
  };

  const startCsv = () => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds(new Set());
      toast.info("내려받을 업무를 체크해 주세요.");
      return;
    }
    if (!selectedItems.length) {
      toast.error("CSV로 내려받을 업무를 한 건 이상 선택해 주세요.");
      return;
    }
    downloadMyWorkCsv(
      selectedItems,
      `용인시_내업무_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success(`${selectedItems.length}건의 CSV를 내려받았습니다.`);
  };

  return (
    <div className="my-work-page">
      <header className="my-work-heading">
        <div>
          <span className="page-eyebrow">B4 · 배정·이행</span>
          <h1>내 업무</h1>
          <p>
            공식 용인시 조직도와 시설별 법 의무를 연결해 배정·수락·위임·완료
            이력을 관리합니다.
          </p>
        </div>
        <div className="my-work-heading-actions">
          <span className="my-work-source">공유 시연 런타임 DB · Supabase</span>
          <button type="button" className="secondary-action" onClick={startCsv}>
            <FileDown size={16} />
            {selectionMode
              ? `선택 CSV 내려받기 (${selectedItems.length})`
              : "CSV 내려받기"}
          </button>
          {selectionMode && (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setSelectionMode(false);
                setSelectedIds(new Set());
              }}
            >
              선택 취소
            </button>
          )}
        </div>
      </header>

      <section className="my-work-summary" aria-label="내 업무 상태 요약">
        <button
          type="button"
          onClick={() => setStatus("ALL")}
          className={status === "ALL" ? "active" : ""}
        >
          <span>전체 업무</span>
          <strong>
            {summary
              ? Object.values(summary)
                  .reduce((sum, value) => sum + value, 0)
                  .toLocaleString()
              : "-"}
          </strong>
        </button>
        <button
          type="button"
          onClick={() => setStatus("UNASSIGNED")}
          className={status === "UNASSIGNED" ? "active" : ""}
        >
          <span>수동 선택 대기</span>
          <strong>{summary?.UNASSIGNED.toLocaleString() || "0"}</strong>
        </button>
        <button
          type="button"
          onClick={() => setStatus("DELEGATION_REQUESTED")}
          className={status === "DELEGATION_REQUESTED" ? "active" : ""}
        >
          <span>위임 요청</span>
          <strong>
            {summary?.DELEGATION_REQUESTED.toLocaleString() || "0"}
          </strong>
        </button>
        <button
          type="button"
          onClick={() => setStatus("COMPLETED")}
          className={status === "COMPLETED" ? "active" : ""}
        >
          <span>완료</span>
          <strong>{summary?.COMPLETED.toLocaleString() || "0"}</strong>
        </button>
      </section>

      <div className="my-work-layout">
        <aside className="my-work-nav" aria-label="내 업무 분류">
          <div className="my-work-nav-title">내 업무 (시연 런타임)</div>
          <div className="my-work-role-card">
            <span>현재 시연 역할</span>
            <strong>{role}</strong>
            {role === "실·국 점검자" && (
              <small>나의 실·국을 선택해 조회합니다.</small>
            )}
          </div>
          <label className="my-work-org-scope">
            <span>{role === "실·국 점검자" ? "나의 실·국" : "조직 범위"}</span>
            <select
              value={orgPath}
              onChange={event => {
                setOrgPath(event.target.value);
                setPage(1);
              }}
            >
              <option value="">전체 조직</option>
              {scopeOrgs.map(org => (
                <option key={org.orgKey} value={org.hierarchyPath}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
          <nav>
            <button
              type="button"
              className="active"
              onClick={() => setStatus("ALL")}
            >
              나의 할 일 <span>우선순위 정렬</span>
            </button>
            <button type="button" onClick={() => setAssignment("AUTO")}>
              자동 담당자 배정 <span>시연 내부 소관규칙</span>
            </button>
            <button type="button" onClick={() => setAssignment("MANUAL")}>
              수동 재배정·이력 <span>선택 및 로그</span>
            </button>
            <button
              type="button"
              onClick={() => setStatus("DELEGATION_REQUESTED")}
            >
              업무 위임 <span>근거자료 필수</span>
            </button>
            <button type="button" onClick={() => setStatus("COMPLETED")}>
              완료 업무 <span>완료 시각</span>
            </button>
          </nav>
          <p className="my-work-demo-note">
            자동배정은 법적 결론이 아니라 <b>시연 내부 소관규칙</b>입니다.
            클라이언트 승인 소관표를 받으면 규칙만 교체합니다.
            <br />
            현재 익명 공유 시연 환경에서 역할 선택은 화면 범위 전환용이며
            사용자별 접근권한 증명이 아닙니다.
          </p>
        </aside>

        <main className="my-work-main">
          <section className="my-work-toolbar">
            <form onSubmit={submitSearch}>
              <Search size={16} aria-hidden="true" />
              <input
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="의무명, 관리대상, 법률명, 담당자를 검색하세요"
                aria-label="내 업무 검색"
              />
              <button type="submit">검색</button>
            </form>
            <select
              value={status}
              onChange={event => {
                setStatus(event.target.value as MyWorkStatus | "ALL");
                setPage(1);
              }}
              aria-label="상태 필터"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={assignment}
              onChange={event => {
                setAssignment(event.target.value as "ALL" | "AUTO" | "MANUAL");
                setPage(1);
              }}
              aria-label="배정 방식 필터"
            >
              <option value="ALL">전체 배정 방식</option>
              <option value="AUTO">자동배정</option>
              <option value="MANUAL">수동배정</option>
            </select>
          </section>

          <div className="my-work-list-head">
            <div>
              <strong>나의 할 일</strong>
              <span>
                총 {total.toLocaleString()}건 · 페이지 {page}/{pageCount}
              </span>
            </div>
            <span>발생시각과 DB 기록시각을 별도로 보존합니다.</span>
          </div>

          {error && <div className="my-work-error">{error}</div>}
          {loading && (
            <div className="my-work-empty">내 업무를 불러오는 중입니다.</div>
          )}
          {!loading && !items.length && (
            <div className="my-work-empty">
              현재 조건에 해당하는 업무가 없습니다.
            </div>
          )}

          <div className="my-work-list">
            {items.map(item => {
              const itemEvents = events[item.workItemId] || [];
              const itemFiles = attachments[item.workItemId] || [];
              const selected = selectedIds.has(item.workItemId);
              return (
                <article
                  key={item.workItemId}
                  className={`my-work-card ${expandedId === item.workItemId ? "expanded" : ""}`}
                >
                  <div className="my-work-card-body">
                    {selectionMode && (
                      <label className="my-work-checkbox">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedIds(previous => {
                              const next = new Set(previous);
                              if (next.has(item.workItemId))
                                next.delete(item.workItemId);
                              else next.add(item.workItemId);
                              return next;
                            })
                          }
                        />
                        <span className="sr-only">
                          {item.obligationTitle} 선택
                        </span>
                      </label>
                    )}
                    <div className="my-work-card-copy">
                      <div className="my-work-meta-line">
                        <span
                          className={`priority priority-${item.priorityCode.toLowerCase()}`}
                        >
                          {getMyWorkPriorityLabel(item.priorityCode)}
                        </span>
                        <span>{item.targetCategory}</span>
                        <span>{item.targetName}</span>
                        <span>{item.obligationId}</span>
                      </div>
                      <h2>{item.obligationTitle}</h2>
                      <p>
                        {item.lawName} {item.articlePath} · {item.cycle}
                      </p>
                      <div className="my-work-assignment">
                        <span
                          className={`assignment-mode ${item.assignmentMode.toLowerCase()}`}
                        >
                          {item.assignmentMode === "AUTO"
                            ? "자동배정"
                            : "수동배정"}
                        </span>
                        <strong>
                          {item.assignedOrgName || "담당부서 선택 필요"}
                        </strong>
                        {item.assigneeDisplayName &&
                          item.assigneeDisplayName !== item.assignedOrgName && (
                            <span>{item.assigneeDisplayName}</span>
                          )}
                        {item.assignmentMode === "AUTO" && (
                          <small>{item.assignmentRuleName}</small>
                        )}
                      </div>
                    </div>
                    <div className="my-work-time-grid">
                      <span>배정</span>
                      <b>{formatDateTime(item.assignedAt)}</b>
                      <span>수락</span>
                      <b>{formatDateTime(item.acceptedAt)}</b>
                      <span>완료</span>
                      <b>{formatDateTime(item.completedAt)}</b>
                      <span>확인</span>
                      <b>
                        {formatDateTime(item.confirmedAt)}
                        {item.confirmedByName
                          ? ` · ${item.confirmedByName}`
                          : ""}
                      </b>
                      <span>기록</span>
                      <b>{formatDateTime(item.createdAt)}</b>
                    </div>
                    <span
                      className={`my-work-status ${statusTone(item.statusCode)}`}
                    >
                      {item.confirmedAt
                        ? "완료 확인"
                        : getMyWorkStatusLabel(item.statusCode)}
                    </span>
                  </div>

                  <div className="my-work-actions">
                    {item.statusCode !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() =>
                          setAssignDraft({
                            item,
                            assigneeName: item.assigneeDisplayName || "",
                            reason: item.assignedOrgKey
                              ? "담당부서 변경"
                              : "담당부서 지정",
                          })
                        }
                      >
                        {item.assignedOrgKey ? "수동 재배정" : "선택"}
                      </button>
                    )}
                    {item.assignedOrgKey && item.statusCode === "ASSIGNED" && (
                      <button type="button" onClick={() => confirmAccept(item)}>
                        배정 수락
                      </button>
                    )}
                    {item.assignedOrgKey &&
                      item.acceptedAt &&
                      !["COMPLETED", "NOT_APPLICABLE"].includes(
                        item.statusCode
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            confirmStatus(
                              item,
                              "IN_PROGRESS",
                              "시연 화면에서 업무 시작"
                            )
                          }
                        >
                          업무 시작
                        </button>
                      )}
                    {item.assignedOrgKey &&
                      item.acceptedAt &&
                      item.statusCode !== "COMPLETED" && (
                        <button
                          type="button"
                          className="primary"
                          onClick={() =>
                            confirmStatus(
                              item,
                              "COMPLETED",
                              "시연 화면에서 완료 처리"
                            )
                          }
                        >
                          완료
                        </button>
                      )}
                    {item.assignedOrgKey &&
                      item.acceptedAt &&
                      item.statusCode !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() =>
                            setStatusDraft({
                              item,
                              status:
                                item.statusCode === "SUPPLEMENT_REQUIRED" ||
                                item.statusCode === "NOT_APPLICABLE"
                                  ? item.statusCode
                                  : "IN_PROGRESS",
                              note: "",
                            })
                          }
                        >
                          상태 변경
                        </button>
                      )}
                    {item.statusCode === "COMPLETED" &&
                      !item.confirmedAt &&
                      role !== "담당자" && (
                        <button
                          type="button"
                          className="confirm"
                          onClick={() =>
                            setConfirmationDraft({ item, note: "" })
                          }
                        >
                          완료 확인
                        </button>
                      )}
                    {item.assignedOrgKey &&
                      item.acceptedAt &&
                      [
                        "ACCEPTED",
                        "IN_PROGRESS",
                        "SUPPLEMENT_REQUIRED",
                      ].includes(item.statusCode) && (
                        <button
                          type="button"
                          onClick={() =>
                            setDelegationDraft({
                              item,
                              assigneeName: "",
                              basisNote: "",
                            })
                          }
                        >
                          업무 위임
                        </button>
                      )}
                    <input
                      ref={element => {
                        uploadRefs.current[item.workItemId] = element;
                      }}
                      type="file"
                      hidden
                      onChange={event => {
                        confirmAttachment(item, event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="icon-action"
                      title="파일 첨부"
                      aria-label={`${item.obligationTitle} 파일 첨부`}
                      onClick={() =>
                        uploadRefs.current[item.workItemId]?.click()
                      }
                    >
                      <FilePlus2 size={17} />
                    </button>
                    <button
                      type="button"
                      className={expandedId === item.workItemId ? "active" : ""}
                      onClick={() => void toggleHistory(item)}
                    >
                      <History size={15} /> 이력{" "}
                      {expandedId === item.workItemId ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </div>

                  {expandedId === item.workItemId && (
                    <div className="my-work-history-panel">
                      {historyLoading === item.workItemId ? (
                        <div className="my-work-empty compact">
                          이력과 첨부파일을 불러오는 중입니다.
                        </div>
                      ) : (
                        <>
                          <section>
                            <h3>수동 재배정·상태 이력</h3>
                            {!itemEvents.length && (
                              <p>저장된 이력이 없습니다.</p>
                            )}
                            <ol>
                              {itemEvents.map(event => (
                                <li key={event.eventId}>
                                  <span className="history-dot" />
                                  <div>
                                    <strong>
                                      {eventLabel(event.eventType)}
                                    </strong>
                                    <p>
                                      {event.fromAssignee ||
                                        event.fromStatus ||
                                        "-"}{" "}
                                      →{" "}
                                      {event.toAssignee ||
                                        event.toStatus ||
                                        "-"}
                                    </p>
                                    {event.reason && (
                                      <small>{event.reason}</small>
                                    )}
                                  </div>
                                  <dl>
                                    <div>
                                      <dt>발생</dt>
                                      <dd>
                                        {formatDateTime(event.occurredAt)}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>기록</dt>
                                      <dd>{formatDateTime(event.createdAt)}</dd>
                                    </div>
                                    <div>
                                      <dt>처리자</dt>
                                      <dd>{event.actorDisplayName}</dd>
                                    </div>
                                  </dl>
                                </li>
                              ))}
                            </ol>
                          </section>
                          <section className="my-work-files">
                            <h3>첨부파일 ({itemFiles.length})</h3>
                            {!itemFiles.length && (
                              <p>등록된 첨부파일이 없습니다.</p>
                            )}
                            {itemFiles.map(file => (
                              <button
                                key={file.attachmentId}
                                type="button"
                                onClick={() =>
                                  void downloadMyWorkAttachment(file)
                                }
                              >
                                <Download size={15} />
                                <span>
                                  <strong>{file.originalName}</strong>
                                  <small>
                                    {fileSize(file.sizeBytes)} ·{" "}
                                    {formatDateTime(file.occurredAt)}
                                  </small>
                                </span>
                              </button>
                            ))}
                          </section>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="my-work-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(value => Math.max(1, value - 1))}
            >
              이전
            </button>
            <span>
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage(value => Math.min(pageCount, value + 1))}
            >
              다음
            </button>
          </div>
        </main>
      </div>

      <Dialog
        open={Boolean(assignDraft)}
        onOpenChange={open => {
          if (!open) {
            setAssignDraft(null);
            setOrgSearch("");
          }
        }}
      >
        <DialogContent
          className="my-work-dialog"
          aria-describedby="assignment-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>
              {assignDraft?.item.assignedOrgKey
                ? "담당부서 수동 재배정"
                : "담당부서 선택"}
            </DialogTitle>
            <DialogDescription id="assignment-dialog-description">
              공식 용인시 조직도 792개 조직 단위에서 담당 조직을 선택합니다.
            </DialogDescription>
          </DialogHeader>
          {assignDraft && (
            <>
              <div className="dialog-work-summary">
                <strong>{assignDraft.item.obligationTitle}</strong>
                <span>
                  {assignDraft.item.targetName} · {assignDraft.item.lawName}{" "}
                  {assignDraft.item.articlePath}
                </span>
              </div>
              <label className="dialog-search">
                <Search size={16} />
                <input
                  value={orgSearch}
                  onChange={event => setOrgSearch(event.target.value)}
                  placeholder="실·국·과·팀 이름 또는 조직 경로 검색"
                />
              </label>
              <div
                className="organization-picker"
                role="listbox"
                aria-label="용인시 조직도"
              >
                {orgCandidates.map(org => (
                  <button
                    key={org.orgKey}
                    type="button"
                    role="option"
                    aria-selected={assignDraft.org?.orgKey === org.orgKey}
                    className={
                      assignDraft.org?.orgKey === org.orgKey ? "selected" : ""
                    }
                    onClick={() => setAssignDraft({ ...assignDraft, org })}
                  >
                    <span
                      style={{
                        paddingLeft: Math.max(0, org.hierarchyLevel - 1) * 10,
                      }}
                    >
                      <strong>{org.name}</strong>
                      <small>{org.hierarchyPath}</small>
                    </span>
                    <em>{org.orgType}</em>
                  </button>
                ))}
              </div>
              <div className="dialog-form-grid">
                <label>
                  <span>선택 조직</span>
                  <input
                    readOnly
                    value={assignDraft.org?.hierarchyPath || "조직도에서 선택"}
                  />
                </label>
                <label>
                  <span>담당자 표시명</span>
                  <input
                    value={assignDraft.assigneeName}
                    onChange={event =>
                      setAssignDraft({
                        ...assignDraft,
                        assigneeName: event.target.value,
                      })
                    }
                    placeholder="미입력 시 조직명 사용"
                  />
                </label>
                <label className="full">
                  <span>배정·재배정 사유</span>
                  <textarea
                    value={assignDraft.reason}
                    onChange={event =>
                      setAssignDraft({
                        ...assignDraft,
                        reason: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setAssignDraft(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={confirmAssignment}
                >
                  확인 후 배정
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(delegationDraft)}
        onOpenChange={open => {
          if (!open) {
            setDelegationDraft(null);
            setOrgSearch("");
          }
        }}
      >
        <DialogContent
          className="my-work-dialog"
          aria-describedby="delegation-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>업무 위임 요청</DialogTitle>
            <DialogDescription id="delegation-dialog-description">
              위임할 조직과 근거자료를 등록한 뒤 확인을 거쳐 요청합니다.
            </DialogDescription>
          </DialogHeader>
          {delegationDraft && (
            <>
              <div className="dialog-work-summary">
                <strong>{delegationDraft.item.obligationTitle}</strong>
                <span>현재 담당: {delegationDraft.item.assignedOrgPath}</span>
              </div>
              <label className="dialog-search">
                <Search size={16} />
                <input
                  value={orgSearch}
                  onChange={event => setOrgSearch(event.target.value)}
                  placeholder="위임할 조직을 검색하세요"
                />
              </label>
              <div
                className="organization-picker compact"
                role="listbox"
                aria-label="위임 대상 조직도"
              >
                {orgCandidates.map(org => (
                  <button
                    key={org.orgKey}
                    type="button"
                    role="option"
                    aria-selected={delegationDraft.org?.orgKey === org.orgKey}
                    className={
                      delegationDraft.org?.orgKey === org.orgKey
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setDelegationDraft({ ...delegationDraft, org })
                    }
                  >
                    <span>
                      <strong>{org.name}</strong>
                      <small>{org.hierarchyPath}</small>
                    </span>
                    <em>{org.orgType}</em>
                  </button>
                ))}
              </div>
              <div className="dialog-form-grid">
                <label>
                  <span>위임 대상</span>
                  <input
                    readOnly
                    value={
                      delegationDraft.org?.hierarchyPath || "조직도에서 선택"
                    }
                  />
                </label>
                <label>
                  <span>담당자 표시명</span>
                  <input
                    value={delegationDraft.assigneeName}
                    onChange={event =>
                      setDelegationDraft({
                        ...delegationDraft,
                        assigneeName: event.target.value,
                      })
                    }
                    placeholder="선택 입력"
                  />
                </label>
                <label className="full">
                  <span>위임 근거</span>
                  <textarea
                    value={delegationDraft.basisNote}
                    onChange={event =>
                      setDelegationDraft({
                        ...delegationDraft,
                        basisNote: event.target.value,
                      })
                    }
                    placeholder="위임이 필요한 근거와 인계사항을 입력하세요"
                  />
                </label>
                <label className="full file-field">
                  <span>근거자료 등록 (필수)</span>
                  <input
                    type="file"
                    accept=".pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
                    onChange={event =>
                      setDelegationDraft({
                        ...delegationDraft,
                        file: event.target.files?.[0],
                      })
                    }
                  />
                  <small>
                    {delegationDraft.file?.name ||
                      "10MB 이하 파일을 선택하세요."}
                  </small>
                </label>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setDelegationDraft(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={confirmDelegation}
                >
                  확인 후 요청
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(statusDraft)}
        onOpenChange={open => {
          if (!open) setStatusDraft(null);
        }}
      >
        <DialogContent
          className="my-work-dialog status-dialog"
          aria-describedby="status-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>업무 상태 변경</DialogTitle>
            <DialogDescription id="status-dialog-description">
              변경 상태와 사유를 입력한 뒤 별도 확인을 거쳐 DB에 이력을
              저장합니다.
            </DialogDescription>
          </DialogHeader>
          {statusDraft && (
            <>
              <div className="dialog-work-summary">
                <strong>{statusDraft.item.obligationTitle}</strong>
                <span>
                  현재 상태: {getMyWorkStatusLabel(statusDraft.item.statusCode)}
                </span>
              </div>
              <div className="dialog-form-grid status-form-grid">
                <label className="full">
                  <span>변경 상태</span>
                  <select
                    value={statusDraft.status}
                    onChange={event =>
                      setStatusDraft({
                        ...statusDraft,
                        status: event.target.value as StatusDraft["status"],
                      })
                    }
                  >
                    <option value="IN_PROGRESS">진행 중</option>
                    <option value="SUPPLEMENT_REQUIRED">보완 필요</option>
                    <option value="COMPLETED">완료</option>
                    <option value="NOT_APPLICABLE">해당 없음</option>
                  </select>
                </label>
                <label className="full">
                  <span>변경 사유·메모</span>
                  <textarea
                    value={statusDraft.note}
                    onChange={event =>
                      setStatusDraft({
                        ...statusDraft,
                        note: event.target.value,
                      })
                    }
                    placeholder="상태 변경 사유를 입력하세요"
                  />
                </label>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setStatusDraft(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={confirmStatusDraft}
                >
                  확인
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmationDraft)}
        onOpenChange={open => {
          if (!open) setConfirmationDraft(null);
        }}
      >
        <DialogContent
          className="my-work-dialog status-dialog"
          aria-describedby="confirmation-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>완료 결과 확인</DialogTitle>
            <DialogDescription id="confirmation-dialog-description">
              완료 처리와 별개로 확인자·확인시각·확인이력을 저장합니다.
            </DialogDescription>
          </DialogHeader>
          {confirmationDraft && (
            <>
              <div className="dialog-work-summary">
                <strong>{confirmationDraft.item.obligationTitle}</strong>
                <span>
                  완료시각: {formatDateTime(confirmationDraft.item.completedAt)}
                </span>
              </div>
              <div className="dialog-form-grid status-form-grid">
                <label className="full">
                  <span>확인 메모</span>
                  <textarea
                    value={confirmationDraft.note}
                    onChange={event =>
                      setConfirmationDraft({
                        ...confirmationDraft,
                        note: event.target.value,
                      })
                    }
                    placeholder="완료 결과의 확인 내용을 입력하세요"
                  />
                </label>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setConfirmationDraft(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={confirmCompletionDraft}
                >
                  확인
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={open => {
          if (!open && !submitting) setConfirmAction(null);
        }}
      >
        <AlertDialogContent className="my-work-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={event => {
                event.preventDefault();
                void executeConfirmed();
              }}
            >
              {submitting ? "처리 중" : confirmAction?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
