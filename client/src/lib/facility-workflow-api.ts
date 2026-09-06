import { supabase } from "@/lib/supabase";
import type { ComplianceStatus } from "@/lib/demo-data";
import { formatLegalArticlePath } from "@/lib/facility-obligation-api";
import { validateMyWorkFile } from "@/lib/my-work-files";

export const CURRENT_PERIOD = "2026-H2";
export const CURRENT_INSPECTION_RUN_ID = "60000000-0000-0000-0000-000000000001";
const EVIDENCE_BUCKET = "evidence-private";

export type DbComplianceStatus = "DONE" | "SUPP" | "NONE" | "NA";

export type FacilityWorkflowItem = {
  targetRef: string;
  targetId: string;
  targetName: string;
  targetCategory: string;
  department: string;
  address: string;
  obligationId: string;
  targetObligationId: string;
  title: string;
  detail: string;
  group: string;
  documentType: string;
  documentTitle: string;
  lawName: string;
  article: string;
  cycle: string;
  evidenceRequirement: string;
  dueType: "month" | "half" | "event";
  dueValue: string;
  complianceId?: string;
  complianceStatus?: DbComplianceStatus;
  actionDate?: string;
  actionDetail?: string;
  note?: string;
  submittedAt?: string;
  updatedAt?: string;
  inspectionResultId?: string;
  inspectionStatus?: DbComplianceStatus;
  inspectionNote?: string;
  inspectedAt?: string;
};

type WorkflowRow = {
  target_ref: string;
  target_id: string | null;
  target_name: string;
  target_category: string;
  subject_name: string | null;
  address: string | null;
  obl_id: string;
  target_obligation_id: string | null;
  obligation_title: string;
  obligation_detail: string | null;
  obligation_group: string | null;
  layer: string | null;
  law_name: string;
  unit_path: string | null;
  cycle: string | null;
  evidence_requirement: string | null;
  due_type: "month" | "half" | "event" | null;
  due_value: string | null;
  compliance_id: string | null;
  period_key: string | null;
  compliance_status: DbComplianceStatus | null;
  action_date: string | null;
  action_detail: string | null;
  compliance_note: string | null;
  submitted_at: string | null;
  updated_at: string | null;
  inspection_result_id: string | null;
  inspection_status: DbComplianceStatus | null;
  inspection_note: string | null;
  inspected_at: string | null;
};

type ObligationLegalMetaRow = {
  obl_id: string;
  doc_id: string | null;
  law_name: string | null;
  article_no: string | null;
  unit_path: string | null;
};

type LegalDocumentMetaRow = {
  doc_id: string;
  document_title: string;
  norm_form: string | null;
};

export type EvidenceMetadata = {
  evidenceId: string;
  complianceId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  versionNo: number;
  uploadedAt: string;
  isCurrent: boolean;
};

export type ComplianceActionLogEntry = {
  actionEventId: string;
  complianceId: string;
  targetObligationId: string;
  periodKey: string;
  sequenceNo: number;
  actionKind: "IMPLEMENT" | "CHANGE" | "URGENT";
  occurredAt: string;
  createdAt: string;
  statusBefore?: DbComplianceStatus;
  statusAfter: DbComplianceStatus;
  actionDate?: string;
  actionDetail: string;
  note?: string;
  actorRole?: string;
  evidence: EvidenceMetadata[];
};

export type ComplianceExportEvent = {
  exportEventId: string;
  targetRef: string;
  periodKey: string;
  rowCount: number;
  fileName: string;
  actorRole?: string;
  occurredAt: string;
  createdAt: string;
};

export function toDbStatus(status: ComplianceStatus): DbComplianceStatus {
  return {
    이행완료: "DONE",
    보완필요: "SUPP",
    미이행: "NONE",
    해당없음: "NA",
  }[status] as DbComplianceStatus;
}

export function toKoreanStatus(
  status?: DbComplianceStatus | null
): ComplianceStatus {
  return {
    DONE: "이행완료",
    SUPP: "보완필요",
    NONE: "미이행",
    NA: "해당없음",
  }[status ?? "NA"] as ComplianceStatus;
}

export function resolveEvidenceSaveStatus(
  selectedStatus: ComplianceStatus,
  newFileCount: number
): ComplianceStatus {
  return newFileCount > 0 && selectedStatus === "미이행"
    ? "이행완료"
    : selectedStatus;
}

export function dueValueToInput(
  dueType: FacilityWorkflowItem["dueType"],
  dueValue: string
) {
  if (dueType === "half") {
    if (dueValue.endsWith("H1")) return "상반기";
    if (dueValue.endsWith("H2")) return "하반기";
  }
  return dueValue === "EVENT" ? "발생 시" : dueValue;
}

export function dueInputToValue(
  dueType: FacilityWorkflowItem["dueType"],
  value: string
) {
  if (dueType === "half") {
    return value === "상반기" ? "2026-H1" : "2026-H2";
  }
  return dueType === "event" ? "EVENT" : value;
}

export function formatLegalDocumentType(
  normForm?: string | null,
  documentTitle?: string | null
) {
  const title = String(documentTitle ?? "").replace(/\s+/g, "");
  if (title.includes("시행규칙")) return "시행규칙";
  if (title.includes("시행령")) return "시행령";

  const normalized = String(normForm ?? "").toLowerCase();
  if (["decree", "presidential_decree"].includes(normalized)) return "시행령";
  if (["rule", "ordinance", "ministerial_rule"].includes(normalized)) {
    return "시행규칙";
  }
  return "법률";
}

function mapWorkflowRow(
  row: WorkflowRow,
  obligationMeta?: ObligationLegalMetaRow,
  documentMeta?: LegalDocumentMetaRow
): FacilityWorkflowItem | null {
  if (!row.target_id || !row.target_obligation_id) return null;
  const documentTitle =
    documentMeta?.document_title || obligationMeta?.law_name || row.law_name;
  return {
    targetRef: row.target_ref,
    targetId: row.target_id,
    targetName: row.target_name,
    targetCategory: row.target_category,
    department: row.subject_name || "용인특례시",
    address: row.address || "-",
    obligationId: row.obl_id,
    targetObligationId: row.target_obligation_id,
    title: row.obligation_title,
    detail: row.obligation_detail || "시설별 적용 의무",
    group: row.layer || row.obligation_group || "관계 법령상 의무",
    documentType: formatLegalDocumentType(
      documentMeta?.norm_form,
      documentTitle
    ),
    documentTitle,
    lawName: documentTitle,
    article: formatLegalArticlePath(
      obligationMeta?.unit_path || row.unit_path,
      obligationMeta?.article_no
    ),
    cycle: row.cycle || "수시",
    evidenceRequirement: row.evidence_requirement || "이행 근거자료",
    dueType: row.due_type || "month",
    dueValue: row.due_value || "2026-09",
    ...(row.period_key === CURRENT_PERIOD && row.compliance_id
      ? {
          complianceId: row.compliance_id,
          complianceStatus: row.compliance_status || "NA",
          actionDate: row.action_date || undefined,
          actionDetail: row.action_detail || undefined,
          note: row.compliance_note || undefined,
          submittedAt: row.submitted_at || undefined,
          updatedAt: row.updated_at || undefined,
          inspectionResultId: row.inspection_result_id || undefined,
          inspectionStatus: row.inspection_status || undefined,
          inspectionNote: row.inspection_note || undefined,
          inspectedAt: row.inspected_at || undefined,
        }
      : {}),
  };
}

export async function loadFacilityWorkflow(targetRef: string): Promise<{
  items: FacilityWorkflowItem[];
  source: "supabase" | "unavailable";
  reason?: string;
}> {
  if (!supabase) {
    return {
      items: [],
      source: "unavailable",
      reason: "Supabase 환경변수 미설정",
    };
  }

  const { data, error } = await supabase
    .from("v_facility_workflow")
    .select(
      "target_ref,target_id,target_name,target_category,subject_name,address,obl_id,target_obligation_id,obligation_title,obligation_detail,obligation_group,layer,law_name,unit_path,cycle,evidence_requirement,due_type,due_value,compliance_id,period_key,compliance_status,action_date,action_detail,compliance_note,submitted_at,updated_at,inspection_result_id,inspection_status,inspection_note,inspected_at"
    )
    .eq("target_ref", targetRef)
    .limit(500);

  if (error || !data) {
    return {
      items: [],
      source: "unavailable",
      reason: error?.message || "시설 업무 데이터를 불러오지 못했습니다.",
    };
  }

  const rows = data as WorkflowRow[];
  const obligationIds = Array.from(new Set(rows.map(row => row.obl_id)));
  const obligationMetaById = new Map<string, ObligationLegalMetaRow>();
  const documentMetaById = new Map<string, LegalDocumentMetaRow>();

  if (obligationIds.length > 0) {
    const obligationMetaResult = await supabase
      .from("ref_obligation")
      .select("obl_id,doc_id,law_name,article_no,unit_path")
      .in("obl_id", obligationIds)
      .limit(500);

    if (!obligationMetaResult.error && obligationMetaResult.data) {
      for (const item of obligationMetaResult.data as ObligationLegalMetaRow[]) {
        obligationMetaById.set(item.obl_id, item);
      }

      const documentIds = Array.from(
        new Set(
          (obligationMetaResult.data as ObligationLegalMetaRow[])
            .map(item => item.doc_id)
            .filter((value): value is string => Boolean(value))
        )
      );
      if (documentIds.length > 0) {
        const documentMetaResult = await supabase
          .from("ref_legal_document")
          .select("doc_id,document_title,norm_form")
          .in("doc_id", documentIds)
          .limit(500);
        if (!documentMetaResult.error && documentMetaResult.data) {
          for (const item of documentMetaResult.data as LegalDocumentMetaRow[]) {
            documentMetaById.set(item.doc_id, item);
          }
        }
      }
    }
  }

  const byObligation = new Map<string, FacilityWorkflowItem>();
  for (const row of rows) {
    const obligationMeta = obligationMetaById.get(row.obl_id);
    const documentMeta = obligationMeta?.doc_id
      ? documentMetaById.get(obligationMeta.doc_id)
      : undefined;
    const mapped = mapWorkflowRow(row, obligationMeta, documentMeta);
    if (!mapped) continue;
    const existing = byObligation.get(mapped.obligationId);
    if (!existing || mapped.complianceId) {
      byObligation.set(mapped.obligationId, mapped);
    }
  }

  return {
    items: Array.from(byObligation.values()).sort(
      (a, b) =>
        a.group.localeCompare(b.group, "ko") ||
        a.lawName.localeCompare(b.lawName, "ko") ||
        a.title.localeCompare(b.title, "ko")
    ),
    source: "supabase",
  };
}

export async function saveDueSchedules(
  items: FacilityWorkflowItem[],
  values: Record<string, string>
) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const client = supabase;
  const updates = items.map(item => {
    const inputValue = values[`${item.targetRef}:${item.obligationId}`];
    const dueValue = dueInputToValue(
      item.dueType,
      inputValue || dueValueToInput(item.dueType, item.dueValue)
    );
    return client
      .from("target_obligation")
      .update({ due_value: dueValue, is_active: true })
      .eq("target_obligation_id", item.targetObligationId)
      .select("target_obligation_id,due_value")
      .single();
  });
  const results = await Promise.all(updates);
  const failed = results.find(result => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  return results.map(result => result.data);
}

async function upsertCompliance(
  item: FacilityWorkflowItem,
  input: {
    status: DbComplianceStatus;
    actionDate?: string;
    actionDetail?: string;
    note?: string;
    submitted?: boolean;
  }
) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const { data, error } = await supabase
    .from("compliance_record")
    .upsert(
      {
        target_obligation_id: item.targetObligationId,
        period_key: CURRENT_PERIOD,
        status: input.status,
        action_date: input.actionDate || null,
        action_detail: input.actionDetail || null,
        note: input.note || null,
        submitted_at: input.submitted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "target_obligation_id,period_key" }
    )
    .select(
      "compliance_id,target_obligation_id,period_key,status,action_date,action_detail,note,submitted_at,updated_at"
    )
    .single();
  if (error || !data) {
    throw new Error(error?.message || "이행기록 저장에 실패했습니다.");
  }
  return data;
}

function safeSegment(value: string) {
  return value.normalize("NFKC").replace(/[^0-9A-Za-z._-]+/g, "-");
}

export async function saveEvidenceRecord(
  item: FacilityWorkflowItem,
  input: {
    actionDate: string;
    actionDetail: string;
    note: string;
    status: ComplianceStatus;
    file?: File;
  }
) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const complianceInput = {
    status: toDbStatus(input.status),
    actionDate: input.actionDate,
    actionDetail: input.actionDetail,
    note: input.note,
    submitted: true,
  } as const;

  if (!input.file) {
    const compliance = await upsertCompliance(item, complianceInput);
    return { compliance, evidence: undefined };
  }

  const extension = validateMyWorkFile(input.file);
  const storagePath = [
    "demo",
    safeSegment(item.targetRef),
    safeSegment(item.obligationId),
    CURRENT_PERIOD,
    `${crypto.randomUUID()}.${extension}`,
  ].join("/");
  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  let compliance: Awaited<ReturnType<typeof upsertCompliance>> | undefined;
  let insertedEvidenceId = "";
  try {
    compliance = await upsertCompliance(item, complianceInput);
    const versionQuery = await supabase
      .from("evidence")
      .select("evidence_id,version_no")
      .eq("compliance_id", compliance.compliance_id)
      .eq("original_name", input.file.name)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (versionQuery.error) throw new Error(versionQuery.error.message);
    const versionNo = Number(versionQuery.data?.version_no ?? 0) + 1;

    const { data: metadata, error: metadataError } = await supabase
      .from("evidence")
      .insert({
        compliance_id: compliance.compliance_id,
        storage_bucket: EVIDENCE_BUCKET,
        storage_path: storagePath,
        original_name: input.file.name,
        mime_type: input.file.type || "application/octet-stream",
        size_bytes: input.file.size,
        version_no: versionNo,
        is_current: true,
      })
      .select(
        "evidence_id,compliance_id,storage_path,original_name,mime_type,size_bytes,version_no,uploaded_at,is_current"
      )
      .single();
    if (metadataError || !metadata) {
      throw new Error(metadataError?.message || "증빙 메타데이터 저장 실패");
    }
    insertedEvidenceId = metadata.evidence_id;

    if (versionQuery.data?.evidence_id) {
      const { error: versionError } = await supabase
        .from("evidence")
        .update({ is_current: false })
        .eq("evidence_id", versionQuery.data.evidence_id);
      if (versionError) throw new Error(versionError.message);
    }

    const evidence: EvidenceMetadata = {
      evidenceId: metadata.evidence_id,
      complianceId: metadata.compliance_id,
      storagePath: metadata.storage_path,
      originalName: metadata.original_name,
      mimeType: metadata.mime_type || "application/octet-stream",
      sizeBytes: Number(metadata.size_bytes),
      versionNo: metadata.version_no,
      uploadedAt: metadata.uploaded_at,
      isCurrent: metadata.is_current,
    };
    return { compliance, evidence };
  } catch (error) {
    const recoveryErrors: string[] = [];
    if (insertedEvidenceId) {
      const { error: metadataDeleteError } = await supabase
        .from("evidence")
        .delete()
        .eq("evidence_id", insertedEvidenceId);
      if (metadataDeleteError) recoveryErrors.push(metadataDeleteError.message);
    }
    const { error: storageDeleteError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .remove([storagePath]);
    if (storageDeleteError) recoveryErrors.push(storageDeleteError.message);

    if (compliance) {
      if (item.complianceId) {
        const { error: restoreError } = await supabase
          .from("compliance_record")
          .update({
            status: item.complianceStatus || "NONE",
            action_date: item.actionDate || null,
            action_detail: item.actionDetail || null,
            note: item.note || null,
            submitted_at: item.submittedAt || null,
            updated_at: item.updatedAt || new Date().toISOString(),
          })
          .eq("compliance_id", item.complianceId);
        if (restoreError) recoveryErrors.push(restoreError.message);
      } else {
        const { error: removeComplianceError } = await supabase
          .from("compliance_record")
          .delete()
          .eq("compliance_id", compliance.compliance_id);
        if (removeComplianceError)
          recoveryErrors.push(removeComplianceError.message);
      }
    }

    const message = error instanceof Error ? error.message : "증빙 저장 실패";
    if (recoveryErrors.length > 0) {
      throw new Error(
        `${message} · 자동 복구도 완료되지 않았습니다. 다시 시도하거나 초기화가 필요합니다.`
      );
    }
    throw new Error(`${message} · 기존 이행상태는 복원되었습니다.`);
  }
}

export async function loadEvidenceMetadata(complianceId?: string) {
  if (!supabase || !complianceId) return [] as EvidenceMetadata[];
  const { data, error } = await supabase
    .from("evidence")
    .select(
      "evidence_id,compliance_id,storage_path,original_name,mime_type,size_bytes,version_no,uploaded_at,is_current"
    )
    .eq("compliance_id", complianceId)
    .order("uploaded_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    evidenceId: row.evidence_id,
    complianceId: row.compliance_id,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type || "application/octet-stream",
    sizeBytes: Number(row.size_bytes),
    versionNo: row.version_no,
    uploadedAt: row.uploaded_at,
    isCurrent: row.is_current,
  }));
}

export async function loadEvidenceMetadataByComplianceIds(
  complianceIds: string[]
) {
  const result = new Map<string, EvidenceMetadata[]>();
  if (!supabase || complianceIds.length === 0) return result;
  const { data, error } = await supabase
    .from("evidence")
    .select(
      "evidence_id,compliance_id,storage_path,original_name,mime_type,size_bytes,version_no,uploaded_at,is_current"
    )
    .in("compliance_id", complianceIds)
    .order("uploaded_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  for (const row of data || []) {
    const metadata: EvidenceMetadata = {
      evidenceId: row.evidence_id,
      complianceId: row.compliance_id,
      storagePath: row.storage_path,
      originalName: row.original_name,
      mimeType: row.mime_type || "application/octet-stream",
      sizeBytes: Number(row.size_bytes),
      versionNo: row.version_no,
      uploadedAt: row.uploaded_at,
      isCurrent: row.is_current,
    };
    result.set(metadata.complianceId, [
      ...(result.get(metadata.complianceId) || []),
      metadata,
    ]);
  }
  return result;
}

async function attachEvidenceToActionEvents(
  rows: Array<Record<string, unknown>>
) {
  const result = new Map<string, EvidenceMetadata[]>();
  if (!supabase || rows.length === 0) return result;
  const eventIds = rows.map(row => String(row.action_event_id));
  const { data: links, error: linkError } = await supabase
    .from("demo_compliance_action_evidence")
    .select("action_event_id,evidence_id")
    .in("action_event_id", eventIds)
    .limit(5000);
  if (linkError) throw new Error(linkError.message);
  const evidenceIds = Array.from(
    new Set((links || []).map(link => link.evidence_id))
  );
  if (evidenceIds.length === 0) return result;
  const { data: evidenceRows, error: evidenceError } = await supabase
    .from("evidence")
    .select(
      "evidence_id,compliance_id,storage_path,original_name,mime_type,size_bytes,version_no,uploaded_at,is_current"
    )
    .in("evidence_id", evidenceIds)
    .limit(5000);
  if (evidenceError) throw new Error(evidenceError.message);
  const evidenceById = new Map(
    (evidenceRows || []).map(row => [
      row.evidence_id,
      {
        evidenceId: row.evidence_id,
        complianceId: row.compliance_id,
        storagePath: row.storage_path,
        originalName: row.original_name,
        mimeType: row.mime_type || "application/octet-stream",
        sizeBytes: Number(row.size_bytes),
        versionNo: row.version_no,
        uploadedAt: row.uploaded_at,
        isCurrent: row.is_current,
      } satisfies EvidenceMetadata,
    ])
  );
  for (const link of links || []) {
    const evidence = evidenceById.get(link.evidence_id);
    if (!evidence) continue;
    result.set(link.action_event_id, [
      ...(result.get(link.action_event_id) || []),
      evidence,
    ]);
  }
  return result;
}

async function mapComplianceActionEvents(rows: Array<Record<string, unknown>>) {
  const evidenceByEvent = await attachEvidenceToActionEvents(rows);
  return rows.map(row => ({
    actionEventId: String(row.action_event_id),
    complianceId: String(row.compliance_id),
    targetObligationId: String(row.target_obligation_id),
    periodKey: String(row.period_key),
    sequenceNo: Number(row.sequence_no),
    actionKind: row.action_kind as ComplianceActionLogEntry["actionKind"],
    occurredAt: String(row.occurred_at),
    createdAt: String(row.created_at),
    statusBefore: row.status_before as DbComplianceStatus | undefined,
    statusAfter: row.status_after as DbComplianceStatus,
    actionDate: row.action_date ? String(row.action_date) : undefined,
    actionDetail: String(row.action_detail),
    note: row.note ? String(row.note) : undefined,
    actorRole: row.actor_role ? String(row.actor_role) : undefined,
    evidence: evidenceByEvent.get(String(row.action_event_id)) || [],
  }));
}

const COMPLIANCE_ACTION_COLUMNS =
  "action_event_id,compliance_id,target_obligation_id,period_key,sequence_no,action_kind,status_before,status_after,action_date,action_detail,note,actor_role,occurred_at,created_at";

export async function loadComplianceActionLog(targetObligationId?: string) {
  if (!supabase || !targetObligationId) return [] as ComplianceActionLogEntry[];
  const { data, error } = await supabase
    .from("demo_compliance_action_event")
    .select(COMPLIANCE_ACTION_COLUMNS)
    .eq("target_obligation_id", targetObligationId)
    .order("sequence_no", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return mapComplianceActionEvents(
    (data || []) as Array<Record<string, unknown>>
  );
}

export async function loadComplianceActionLogsByTargetObligationIds(
  targetObligationIds: string[]
) {
  if (!supabase || targetObligationIds.length === 0) {
    return [] as ComplianceActionLogEntry[];
  }
  const { data, error } = await supabase
    .from("demo_compliance_action_event")
    .select(COMPLIANCE_ACTION_COLUMNS)
    .in("target_obligation_id", targetObligationIds)
    .order("occurred_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return mapComplianceActionEvents(
    (data || []) as Array<Record<string, unknown>>
  );
}

export async function logComplianceAction(input: {
  requestId: string;
  complianceId: string;
  targetObligationId: string;
  actionKind: ComplianceActionLogEntry["actionKind"];
  statusBefore?: DbComplianceStatus;
  statusAfter: DbComplianceStatus;
  actionDate?: string;
  actionDetail: string;
  note?: string;
  actorRole: string;
  evidenceIds: string[];
  occurredAt?: string;
}) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const { data, error } = await supabase.rpc("demo_log_compliance_action", {
    p_request_id: input.requestId,
    p_compliance_id: input.complianceId,
    p_target_obligation_id: input.targetObligationId,
    p_period_key: CURRENT_PERIOD,
    p_action_kind: input.actionKind,
    p_status_before: input.statusBefore || null,
    p_status_after: input.statusAfter,
    p_action_date: input.actionDate || null,
    p_action_detail: input.actionDetail,
    p_note: input.note || null,
    p_actor_role: input.actorRole,
    p_evidence_ids: input.evidenceIds,
    p_occurred_at: input.occurredAt || new Date().toISOString(),
  });
  if (error || !data) {
    throw new Error(error?.message || "시정조치 로그 저장에 실패했습니다.");
  }
  return String(data);
}

export async function hasComplianceActionRequest(requestId: string) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const { data, error } = await supabase
    .from("demo_compliance_action_event")
    .select("action_event_id")
    .eq("request_id", requestId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.action_event_id);
}

export async function rollbackComplianceActionPersistence(input: {
  before: FacilityWorkflowItem;
  persistedComplianceId: string;
  createdEvidence: EvidenceMetadata[];
}) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const recoveryErrors: string[] = [];

  for (const metadata of input.createdEvidence) {
    const { error: metadataDeleteError } = await supabase
      .from("evidence")
      .delete()
      .eq("evidence_id", metadata.evidenceId);
    if (metadataDeleteError) {
      recoveryErrors.push(metadataDeleteError.message);
      continue;
    }

    const { error: storageDeleteError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .remove([metadata.storagePath]);
    if (storageDeleteError) recoveryErrors.push(storageDeleteError.message);

    const { data: previous, error: previousError } = await supabase
      .from("evidence")
      .select("evidence_id")
      .eq("compliance_id", metadata.complianceId)
      .eq("original_name", metadata.originalName)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previousError) {
      recoveryErrors.push(previousError.message);
    } else if (previous?.evidence_id) {
      const { error: versionRestoreError } = await supabase
        .from("evidence")
        .update({ is_current: true })
        .eq("evidence_id", previous.evidence_id);
      if (versionRestoreError) recoveryErrors.push(versionRestoreError.message);
    }
  }

  if (input.before.complianceId) {
    const { error } = await supabase
      .from("compliance_record")
      .update({
        status: input.before.complianceStatus || "NONE",
        action_date: input.before.actionDate || null,
        action_detail: input.before.actionDetail || null,
        note: input.before.note || null,
        submitted_at: input.before.submittedAt || null,
        updated_at: input.before.updatedAt || new Date().toISOString(),
      })
      .eq("compliance_id", input.before.complianceId);
    if (error) recoveryErrors.push(error.message);
  } else {
    const { error } = await supabase
      .from("compliance_record")
      .delete()
      .eq("compliance_id", input.persistedComplianceId);
    if (error) recoveryErrors.push(error.message);
  }

  if (recoveryErrors.length > 0) {
    throw new Error(recoveryErrors.join(" · "));
  }
}

export async function logComplianceCsvExport(input: {
  targetRef: string;
  rowCount: number;
  fileName: string;
  actorRole: string;
  statusFilter?: string;
  occurredAt?: string;
}) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const occurredAt = input.occurredAt || new Date().toISOString();
  const { data, error } = await supabase.rpc("demo_log_compliance_export", {
    p_target_ref: input.targetRef,
    p_period_key: CURRENT_PERIOD,
    p_row_count: input.rowCount,
    p_file_name: input.fileName,
    p_actor_role: input.actorRole,
    p_filter_snapshot: { status: input.statusFilter || "ALL" },
    p_occurred_at: occurredAt,
  });
  if (error || !data) {
    throw new Error(error?.message || "CSV 다운로드 로그 저장에 실패했습니다.");
  }
  return String(data);
}

export async function loadComplianceExportEvents(targetRef: string) {
  if (!supabase) return [] as ComplianceExportEvent[];
  const { data, error } = await supabase
    .from("demo_compliance_export_event")
    .select(
      "export_event_id,target_ref,period_key,row_count,file_name,actor_role,occurred_at,created_at"
    )
    .eq("target_ref", targetRef)
    .order("occurred_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    exportEventId: row.export_event_id,
    targetRef: row.target_ref,
    periodKey: row.period_key,
    rowCount: row.row_count,
    fileName: row.file_name,
    actorRole: row.actor_role || undefined,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }));
}

export async function downloadEvidenceFile(metadata: EvidenceMetadata) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .download(metadata.storagePath);
  if (error || !data) throw new Error(error?.message || "파일 다운로드 실패");
  return data;
}

export async function saveInspectionResult(
  item: FacilityWorkflowItem,
  status: ComplianceStatus,
  note: string
) {
  if (!supabase) throw new Error("Supabase 연결이 없습니다.");
  const compliance = await upsertCompliance(item, {
    status: item.complianceStatus || "NONE",
    actionDate: item.actionDate,
    actionDetail: item.actionDetail,
    note: item.note,
    submitted: Boolean(item.submittedAt),
  });

  const { error: scopeError } = await supabase.from("inspection_scope").upsert(
    {
      inspection_run_id: CURRENT_INSPECTION_RUN_ID,
      target_id: item.targetId,
      target_obligation_id: item.targetObligationId,
      is_active: true,
    },
    { onConflict: "inspection_run_id,target_id,target_obligation_id" }
  );
  if (scopeError) throw new Error(scopeError.message);

  const { data, error } = await supabase
    .from("inspection_result")
    .upsert(
      {
        inspection_run_id: CURRENT_INSPECTION_RUN_ID,
        compliance_id: compliance.compliance_id,
        status: toDbStatus(status),
        inspection_note: note || null,
        inspected_at: new Date().toISOString(),
      },
      { onConflict: "inspection_run_id,compliance_id" }
    )
    .select(
      "inspection_result_id,inspection_run_id,compliance_id,status,inspection_note,inspected_at"
    )
    .single();
  if (error || !data) {
    throw new Error(error?.message || "점검 결과 저장에 실패했습니다.");
  }
  return data;
}
