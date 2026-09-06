import { supabase } from "@/lib/supabase";
import type { Role } from "@/lib/demo-data";
import {
  formatLegalArticlePath,
  formatObligationFrequency,
} from "@/lib/facility-obligation-api";
import { buildMyWorkStoragePath } from "@/lib/my-work-files";

const EVIDENCE_BUCKET = "evidence-private";
export const MY_WORK_PAGE_SIZE = 20;

export type MyWorkStatus =
  | "UNASSIGNED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "SUPPLEMENT_REQUIRED"
  | "DELEGATION_REQUESTED"
  | "COMPLETED"
  | "NOT_APPLICABLE";

export type MyWorkPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export type MyWorkItem = {
  workItemId: string;
  targetObligationId: string;
  targetId: string;
  targetRef: string;
  targetName: string;
  targetCategory: string;
  obligationId: string;
  obligationTitle: string;
  lawName: string;
  articlePath: string;
  cycle: string;
  evidenceRequirement: string;
  dueAt?: string;
  priorityCode: MyWorkPriority;
  statusCode: MyWorkStatus;
  assignmentMode: "AUTO" | "MANUAL";
  assignmentRuleName?: string;
  assignmentBasis?: string;
  basisType?: "DEMO_INTERNAL" | "APPROVED_INTERNAL";
  assignedOrgKey?: string;
  assignedOrgName?: string;
  assignedOrgType?: string;
  assignedOrgPath?: string;
  assigneeDisplayName?: string;
  assignedByName?: string;
  assignedAt?: string;
  acceptedByName?: string;
  acceptedAt?: string;
  statusChangedAt?: string;
  delegationRequestedAt?: string;
  reassignedAt?: string;
  completedAt?: string;
  completionNote?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  confirmationNote?: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  attachmentNames?: string;
  delegationRequestId?: string;
  delegationToOrgName?: string;
  delegationStatus?: string;
};

export type MyWorkEvent = {
  eventId: number;
  eventType: string;
  fromOrgKey?: string;
  toOrgKey?: string;
  fromAssignee?: string;
  toAssignee?: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  actorDisplayName: string;
  occurredAt: string;
  createdAt: string;
};

export type MyWorkAttachment = {
  attachmentId: string;
  workItemId: string;
  attachmentType: "WORK_EVIDENCE" | "DELEGATION_BASIS";
  storagePath: string;
  originalName: string;
  fileExtension?: string;
  mimeType?: string;
  sizeBytes: number;
  occurredAt: string;
  createdAt: string;
};

export type OrgUnit = {
  orgKey: string;
  parentOrgKey?: string;
  parentName?: string;
  sourceCode?: string;
  name: string;
  orgType: string;
  hierarchyLevel: number;
  hierarchyPath: string;
  sourceSection: string;
  childCount: number;
  sortOrder: number;
};

export type MyWorkFilter = {
  status?: MyWorkStatus | "ALL";
  assignment?: "ALL" | "AUTO" | "MANUAL";
  orgPath?: string;
  search?: string;
  page?: number;
};

export type MyWorkPage = {
  items: MyWorkItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ResetResult = {
  deletedWorkItems: number;
  deletedEvents: number;
  deletedDelegations: number;
  deletedAttachments: number;
  seededWorkItems: number;
  resetAt: string;
};

type MyWorkRow = {
  work_item_id: string;
  target_obligation_id: string;
  target_id: string;
  target_ref: string;
  target_name: string;
  target_category: string;
  obligation_id: string;
  obligation_title: string;
  law_name: string;
  article_path: string | null;
  cycle: string | null;
  evidence_requirement: string | null;
  due_at: string | null;
  priority_code: MyWorkPriority;
  status_code: MyWorkStatus;
  assignment_mode: "AUTO" | "MANUAL";
  assignment_rule_name: string | null;
  assignment_basis: string | null;
  basis_type: "DEMO_INTERNAL" | "APPROVED_INTERNAL" | null;
  assigned_org_key: string | null;
  assigned_org_name: string | null;
  assigned_org_type: string | null;
  assigned_org_path: string | null;
  assignee_display_name: string | null;
  assigned_by_name: string | null;
  assigned_at: string | null;
  accepted_by_name: string | null;
  accepted_at: string | null;
  status_changed_at: string | null;
  delegation_requested_at: string | null;
  reassigned_at: string | null;
  completed_at: string | null;
  completion_note: string | null;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  confirmation_note: string | null;
  created_at: string;
  updated_at: string;
  attachment_count: number | null;
  attachment_names: string | null;
  delegation_request_id: string | null;
  delegation_to_org_name: string | null;
  delegation_status: string | null;
};

type EventRow = {
  event_id: number;
  event_type: string;
  from_org_key: string | null;
  to_org_key: string | null;
  from_assignee: string | null;
  to_assignee: string | null;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  actor_display_name: string | null;
  occurred_at: string;
  created_at: string;
};

type AttachmentRow = {
  attachment_id: string;
  work_item_id: string;
  attachment_type: "WORK_EVIDENCE" | "DELEGATION_BASIS";
  storage_path: string;
  original_name: string;
  file_extension: string | null;
  mime_type: string | null;
  size_bytes: number;
  occurred_at: string;
  created_at: string;
};

type OrgRow = {
  org_key: string;
  parent_org_key: string | null;
  parent_name: string | null;
  source_code: string | null;
  name: string;
  org_type: string;
  hierarchy_level: number;
  hierarchy_path: string;
  source_section: string;
  child_count: number;
  sort_order: number;
};

const statusLabels: Record<MyWorkStatus, string> = {
  UNASSIGNED: "미배정",
  ASSIGNED: "배정",
  ACCEPTED: "배정 수락",
  IN_PROGRESS: "진행 중",
  SUPPLEMENT_REQUIRED: "보완 필요",
  DELEGATION_REQUESTED: "위임 요청",
  COMPLETED: "완료",
  NOT_APPLICABLE: "해당 없음",
};

const priorityLabels: Record<MyWorkPriority, string> = {
  URGENT: "긴급",
  HIGH: "우선",
  NORMAL: "일반",
  LOW: "낮음",
};

export function getMyWorkStatusLabel(status: MyWorkStatus) {
  return statusLabels[status];
}

export function getMyWorkPriorityLabel(priority: MyWorkPriority) {
  return priorityLabels[priority];
}

export function formatDateTime(value?: string | null) {
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

function requireSupabase() {
  if (!supabase) throw new Error("이 배포본에 Supabase 설정이 없습니다.");
  return supabase;
}

function mapItem(row: MyWorkRow): MyWorkItem {
  return {
    workItemId: row.work_item_id,
    targetObligationId: row.target_obligation_id,
    targetId: row.target_id,
    targetRef: row.target_ref,
    targetName: row.target_name,
    targetCategory: row.target_category,
    obligationId: row.obligation_id,
    obligationTitle: row.obligation_title,
    lawName: row.law_name,
    articlePath: formatLegalArticlePath(row.article_path),
    cycle: formatObligationFrequency(row.cycle),
    evidenceRequirement: row.evidence_requirement || "미지정",
    dueAt: row.due_at || undefined,
    priorityCode: row.priority_code,
    statusCode: row.status_code,
    assignmentMode: row.assignment_mode,
    assignmentRuleName: row.assignment_rule_name || undefined,
    assignmentBasis: row.assignment_basis || undefined,
    basisType: row.basis_type || undefined,
    assignedOrgKey: row.assigned_org_key || undefined,
    assignedOrgName: row.assigned_org_name || undefined,
    assignedOrgType: row.assigned_org_type || undefined,
    assignedOrgPath: row.assigned_org_path || undefined,
    assigneeDisplayName: row.assignee_display_name || undefined,
    assignedByName: row.assigned_by_name || undefined,
    assignedAt: row.assigned_at || undefined,
    acceptedByName: row.accepted_by_name || undefined,
    acceptedAt: row.accepted_at || undefined,
    statusChangedAt: row.status_changed_at || undefined,
    delegationRequestedAt: row.delegation_requested_at || undefined,
    reassignedAt: row.reassigned_at || undefined,
    completedAt: row.completed_at || undefined,
    completionNote: row.completion_note || undefined,
    confirmedByName: row.confirmed_by_name || undefined,
    confirmedAt: row.confirmed_at || undefined,
    confirmationNote: row.confirmation_note || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachmentCount: Number(row.attachment_count || 0),
    attachmentNames: row.attachment_names || undefined,
    delegationRequestId: row.delegation_request_id || undefined,
    delegationToOrgName: row.delegation_to_org_name || undefined,
    delegationStatus: row.delegation_status || undefined,
  };
}

export async function loadMyWork(
  filter: MyWorkFilter = {}
): Promise<MyWorkPage> {
  const client = requireSupabase();
  const page = Math.max(1, filter.page || 1);
  const from = (page - 1) * MY_WORK_PAGE_SIZE;
  const to = from + MY_WORK_PAGE_SIZE - 1;
  let query = client
    .from("v_demo_my_work")
    .select("*", { count: "exact" })
    .order("priority_code", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (filter.status && filter.status !== "ALL") {
    query = query.eq("status_code", filter.status);
  }
  if (filter.assignment && filter.assignment !== "ALL") {
    query = query.eq("assignment_mode", filter.assignment);
  }
  if (filter.orgPath) {
    query = query.ilike("assigned_org_path", `${filter.orgPath}%`);
  }
  if (filter.search?.trim()) {
    const keyword = filter.search.trim().replace(/[%_,()]/g, " ");
    query = query.or(
      `obligation_title.ilike.%${keyword}%,target_name.ilike.%${keyword}%,law_name.ilike.%${keyword}%,assignee_display_name.ilike.%${keyword}%`
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  return {
    items: ((data || []) as MyWorkRow[]).map(mapItem),
    total: count || 0,
    page,
    pageSize: MY_WORK_PAGE_SIZE,
  };
}

export async function loadMyWorkSummary(orgPath = "") {
  const client = requireSupabase();
  const statuses: MyWorkStatus[] = [
    "UNASSIGNED",
    "ASSIGNED",
    "ACCEPTED",
    "IN_PROGRESS",
    "SUPPLEMENT_REQUIRED",
    "DELEGATION_REQUESTED",
    "COMPLETED",
    "NOT_APPLICABLE",
  ];
  const results = await Promise.all(
    statuses.map(status => {
      let query = client
        .from("v_demo_my_work")
        .select("work_item_id", { count: "exact", head: true })
        .eq("status_code", status);
      if (orgPath) query = query.ilike("assigned_org_path", `${orgPath}%`);
      return query;
    })
  );
  const failed = results.find(result => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  return Object.fromEntries(
    statuses.map((status, index) => [status, results[index].count || 0])
  ) as Record<MyWorkStatus, number>;
}

let organizationCache: OrgUnit[] | null = null;

export async function loadYonginOrgUnits(): Promise<OrgUnit[]> {
  if (organizationCache) return organizationCache;
  const client = requireSupabase();
  const rows: OrgRow[] = [];
  const chunkSize = 500;
  for (let from = 0; ; from += chunkSize) {
    const { data, error } = await client
      .from("v_yongin_org_tree")
      .select(
        "org_key,parent_org_key,parent_name,source_code,name,org_type,hierarchy_level,hierarchy_path,source_section,child_count,sort_order"
      )
      .order("sort_order")
      .range(from, from + chunkSize - 1);
    if (error) throw new Error(error.message);
    const chunk = (data || []) as OrgRow[];
    rows.push(...chunk);
    if (chunk.length < chunkSize) break;
  }
  organizationCache = rows.map(row => ({
    orgKey: row.org_key,
    parentOrgKey: row.parent_org_key || undefined,
    parentName: row.parent_name || undefined,
    sourceCode: row.source_code || undefined,
    name: row.name,
    orgType: row.org_type,
    hierarchyLevel: row.hierarchy_level,
    hierarchyPath: row.hierarchy_path,
    sourceSection: row.source_section,
    childCount: Number(row.child_count || 0),
    sortOrder: row.sort_order,
  }));
  return organizationCache;
}

export async function loadMyWorkEvents(workItemId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("demo_work_assignment_event")
    .select(
      "event_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,from_status,to_status,reason,actor_display_name,occurred_at,created_at"
    )
    .eq("work_item_id", workItemId)
    .order("occurred_at", { ascending: false })
    .order("event_id", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return ((data || []) as EventRow[]).map(row => ({
    eventId: row.event_id,
    eventType: row.event_type,
    fromOrgKey: row.from_org_key || undefined,
    toOrgKey: row.to_org_key || undefined,
    fromAssignee: row.from_assignee || undefined,
    toAssignee: row.to_assignee || undefined,
    fromStatus: row.from_status || undefined,
    toStatus: row.to_status || undefined,
    reason: row.reason || undefined,
    actorDisplayName: row.actor_display_name || "시스템",
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  })) as MyWorkEvent[];
}

export async function loadMyWorkAttachments(workItemId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("demo_work_attachment")
    .select(
      "attachment_id,work_item_id,attachment_type,storage_path,original_name,file_extension,mime_type,size_bytes,occurred_at,created_at"
    )
    .eq("work_item_id", workItemId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return ((data || []) as AttachmentRow[]).map(row => ({
    attachmentId: row.attachment_id,
    workItemId: row.work_item_id,
    attachmentType: row.attachment_type,
    storagePath: row.storage_path,
    originalName: row.original_name,
    fileExtension: row.file_extension || undefined,
    mimeType: row.mime_type || undefined,
    sizeBytes: row.size_bytes,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  })) as MyWorkAttachment[];
}

const roleCodeMap: Record<Role, "executive" | "inspector" | "target_manager"> =
  {
    경영책임자: "executive",
    "실·국 점검자": "inspector",
    담당자: "target_manager",
  };

const profileCache = new Map<Role, string>();

async function getActorProfileId(role: Role) {
  const cached = profileCache.get(role);
  if (cached) return cached;
  const client = requireSupabase();
  const { data, error } = await client
    .from("profile")
    .select("profile_id")
    .eq("role_code", roleCodeMap[role])
    .limit(1)
    .single();
  if (error || !data)
    throw new Error(error?.message || "시연 역할을 찾지 못했습니다.");
  profileCache.set(role, data.profile_id);
  return data.profile_id as string;
}

function nowIso() {
  return new Date().toISOString();
}

export async function assignMyWork(input: {
  workItemId: string;
  toOrgKey: string;
  assigneeDisplayName?: string;
  reason: string;
  role: Role;
}) {
  const client = requireSupabase();
  const actor = await getActorProfileId(input.role);
  const { data, error } = await client.rpc("demo_work_assign", {
    p_work_item_id: input.workItemId,
    p_to_org_key: input.toOrgKey,
    p_assignee_display_name: input.assigneeDisplayName || "",
    p_actor_profile_id: actor,
    p_reason: input.reason,
    p_occurred_at: nowIso(),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function acceptMyWork(workItemId: string, role: Role) {
  const client = requireSupabase();
  const actor = await getActorProfileId(role);
  const { data, error } = await client.rpc("demo_work_accept", {
    p_work_item_id: workItemId,
    p_actor_profile_id: actor,
    p_occurred_at: nowIso(),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function changeMyWorkStatus(input: {
  workItemId: string;
  statusCode:
    | "IN_PROGRESS"
    | "SUPPLEMENT_REQUIRED"
    | "COMPLETED"
    | "NOT_APPLICABLE";
  note: string;
  role: Role;
}) {
  const client = requireSupabase();
  const actor = await getActorProfileId(input.role);
  const { data, error } = await client.rpc("demo_work_change_status", {
    p_work_item_id: input.workItemId,
    p_status_code: input.statusCode,
    p_note: input.note,
    p_actor_profile_id: actor,
    p_occurred_at: nowIso(),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function confirmMyWorkCompletion(input: {
  workItemId: string;
  note: string;
  role: Role;
}) {
  const client = requireSupabase();
  const actor = await getActorProfileId(input.role);
  const { data, error } = await client.rpc("demo_work_confirm_completion", {
    p_work_item_id: input.workItemId,
    p_confirmation_note: input.note,
    p_actor_profile_id: actor,
    p_occurred_at: nowIso(),
  });
  if (error) throw new Error(error.message);
  return data;
}

async function uploadWorkFile(workItemId: string, file: File) {
  const client = requireSupabase();
  const storagePath = buildMyWorkStoragePath(workItemId, file);
  const { error } = await client.storage
    .from(EVIDENCE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return storagePath;
}

export async function addMyWorkAttachment(input: {
  workItemId: string;
  file: File;
  role: Role;
}) {
  const client = requireSupabase();
  const actor = await getActorProfileId(input.role);
  const storagePath = await uploadWorkFile(input.workItemId, input.file);
  const { data, error } = await client.rpc("demo_work_add_attachment", {
    p_work_item_id: input.workItemId,
    p_storage_path: storagePath,
    p_original_name: input.file.name,
    p_mime_type: input.file.type || "application/octet-stream",
    p_size_bytes: input.file.size,
    p_actor_profile_id: actor,
    p_occurred_at: nowIso(),
  });
  if (error) {
    await client.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return data;
}

export async function requestMyWorkDelegation(input: {
  workItemId: string;
  toOrgKey: string;
  assigneeDisplayName?: string;
  basisNote: string;
  basisFile: File;
  role: Role;
}) {
  const client = requireSupabase();
  const actor = await getActorProfileId(input.role);
  const storagePath = await uploadWorkFile(input.workItemId, input.basisFile);
  const { data, error } = await client.rpc("demo_work_request_delegation", {
    p_work_item_id: input.workItemId,
    p_to_org_key: input.toOrgKey,
    p_requested_assignee_name: input.assigneeDisplayName || "",
    p_basis_note: input.basisNote,
    p_storage_path: storagePath,
    p_original_name: input.basisFile.name,
    p_mime_type: input.basisFile.type || "application/octet-stream",
    p_size_bytes: input.basisFile.size,
    p_actor_profile_id: actor,
    p_occurred_at: nowIso(),
  });
  if (error) {
    await client.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return data;
}

export async function downloadMyWorkAttachment(attachment: MyWorkAttachment) {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(EVIDENCE_BUCKET)
    .download(attachment.storagePath);
  if (error || !data)
    throw new Error(error?.message || "파일을 내려받지 못했습니다.");
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.originalName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function resetMyWork(role: Role): Promise<ResetResult> {
  const client = requireSupabase();
  const actor = await getActorProfileId(role);
  const paths: string[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from("demo_work_attachment")
      .select("storage_path")
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    const chunk = (data || []).map(row => row.storage_path as string);
    paths.push(...chunk);
    if (chunk.length < 500) break;
  }
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await client.storage
      .from(EVIDENCE_BUCKET)
      .remove(paths.slice(index, index + 100));
    if (error) throw new Error(`첨부파일 초기화 실패: ${error.message}`);
  }
  const occurredAt = nowIso();
  const { data, error } = await client.rpc("demo_work_reset", {
    p_actor_profile_id: actor,
    p_occurred_at: occurredAt,
  });
  if (error) throw new Error(error.message);
  const result = data as Record<string, unknown>;
  return {
    deletedWorkItems: Number(result.deleted_work_items || 0),
    deletedEvents: Number(result.deleted_events || 0),
    deletedDelegations: Number(result.deleted_delegations || 0),
    deletedAttachments: Number(result.deleted_attachments || 0),
    seededWorkItems: Number(result.seeded_work_items || 0),
    resetAt: String(result.reset_at || occurredAt),
  };
}

export function serializeMyWorkCsv(items: MyWorkItem[]) {
  const headers = [
    "업무ID",
    "관리대상",
    "관리대상구분",
    "의무ID",
    "의무명",
    "법률명",
    "조항호목",
    "주기",
    "우선순위",
    "상태",
    "배정방식",
    "배정규칙",
    "배정부서",
    "담당자",
    "배정자",
    "배정발생시각",
    "배정수락자",
    "배정수락시각",
    "상태변경시각",
    "위임신청시각",
    "재배정발생시각",
    "완료시각",
    "확인자",
    "확인시각",
    "확인메모",
    "레코드생성시각",
    "레코드수정시각",
    "첨부파일수",
    "첨부파일명",
  ];
  const safe = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = items.map(item =>
    [
      item.workItemId,
      item.targetName,
      item.targetCategory,
      item.obligationId,
      item.obligationTitle,
      item.lawName,
      item.articlePath,
      item.cycle,
      getMyWorkPriorityLabel(item.priorityCode),
      getMyWorkStatusLabel(item.statusCode),
      item.assignmentMode === "AUTO" ? "자동배정" : "수동배정",
      item.assignmentRuleName || "",
      item.assignedOrgPath || "미배정",
      item.assigneeDisplayName || "",
      item.assignedByName || "",
      item.assignedAt || "",
      item.acceptedByName || "",
      item.acceptedAt || "",
      item.statusChangedAt || "",
      item.delegationRequestedAt || "",
      item.reassignedAt || "",
      item.completedAt || "",
      item.confirmedByName || "",
      item.confirmedAt || "",
      item.confirmationNote || "",
      item.createdAt,
      item.updatedAt,
      item.attachmentCount,
      item.attachmentNames || "",
    ].map(safe)
  );
  return `\ufeff${[headers.map(safe), ...rows].map(row => row.join(",")).join("\r\n")}`;
}

export function downloadMyWorkCsv(
  items: MyWorkItem[],
  fileName = "내업무.csv"
) {
  const csv = serializeMyWorkCsv(items);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
