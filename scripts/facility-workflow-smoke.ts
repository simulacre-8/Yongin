import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const periodKey = "2026-H2";
const inspectionRunId = "60000000-0000-0000-0000-000000000001";
const bucket = "evidence-private";
if (!url || !key || !key.startsWith("sb_publishable_")) {
  throw new Error("A Supabase URL and publishable key are required");
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const report: Record<string, unknown> = {};
let storagePath = "";
let evidenceId = "";
let complianceId = "";
let scopeId = "";
let inspectionResultId = "";
let targetObligationId = "";
let originalDue = "";

async function cleanup() {
  if (inspectionResultId) {
    await supabase
      .from("inspection_result")
      .delete()
      .eq("inspection_result_id", inspectionResultId);
  }
  if (scopeId) {
    await supabase
      .from("inspection_scope")
      .delete()
      .eq("inspection_scope_id", scopeId);
  }
  if (evidenceId) {
    await supabase.from("evidence").delete().eq("evidence_id", evidenceId);
  }
  if (storagePath) await supabase.storage.from(bucket).remove([storagePath]);
  if (complianceId) {
    await supabase
      .from("compliance_record")
      .delete()
      .eq("compliance_id", complianceId);
  }
  if (targetObligationId && originalDue) {
    await supabase
      .from("target_obligation")
      .update({ due_value: originalDue })
      .eq("target_obligation_id", targetObligationId);
  }
}

try {
  const { data: sample, error: sampleError } = await supabase
    .from("v_facility_workflow")
    .select(
      "target_ref,target_id,target_name,obl_id,target_obligation_id,due_type,due_value,compliance_id"
    )
    .eq("target_name", "고기상수도")
    .is("compliance_id", null)
    .order("obl_id", { ascending: true })
    .limit(1)
    .single();
  if (sampleError || !sample) {
    throw new Error(sampleError?.message || "No unused workflow row found");
  }
  targetObligationId = sample.target_obligation_id;
  originalDue = sample.due_value;
  report.identity = `${sample.target_ref}:${sample.obl_id}:${periodKey}`;

  const nextDue = sample.due_type === "half" ? "2026-H1" : "2026-12";
  const { error: dueError } = await supabase
    .from("target_obligation")
    .update({ due_value: nextDue })
    .eq("target_obligation_id", targetObligationId);
  if (dueError) throw new Error(`due update failed: ${dueError.message}`);
  const { data: dueRow, error: dueReadError } = await supabase
    .from("target_obligation")
    .select("due_value")
    .eq("target_obligation_id", targetObligationId)
    .single();
  if (dueReadError || dueRow?.due_value !== nextDue) {
    throw new Error("due roundtrip failed");
  }
  report.due_roundtrip = true;

  const { data: compliance, error: complianceError } = await supabase
    .from("compliance_record")
    .insert({
      target_obligation_id: targetObligationId,
      period_key: periodKey,
      status: "DONE",
      action_date: "2026-09-06",
      action_detail: "시설 워크플로 스모크 이행",
      note: "event time and recorded time verified",
      submitted_at: new Date().toISOString(),
    })
    .select("compliance_id")
    .single();
  if (complianceError || !compliance) {
    throw new Error(complianceError?.message || "compliance insert failed");
  }
  complianceId = compliance.compliance_id;
  report.compliance_saved = true;

  storagePath = `demo/smoke/workflow-${crypto.randomUUID()}.txt`;
  const file = new TextEncoder().encode(String(report.identity));
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, { contentType: "text/plain", upsert: false });
  if (uploadError)
    throw new Error(`storage upload failed: ${uploadError.message}`);
  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .insert({
      compliance_id: complianceId,
      storage_bucket: bucket,
      storage_path: storagePath,
      original_name: "workflow-smoke.txt",
      mime_type: "text/plain",
      size_bytes: file.byteLength,
      version_no: 1,
      is_current: true,
    })
    .select("evidence_id")
    .single();
  if (evidenceError || !evidence) {
    throw new Error(evidenceError?.message || "evidence insert failed");
  }
  evidenceId = evidence.evidence_id;
  report.evidence_saved = true;

  const { data: scope, error: scopeError } = await supabase
    .from("inspection_scope")
    .upsert(
      {
        inspection_run_id: inspectionRunId,
        target_id: sample.target_id,
        target_obligation_id: targetObligationId,
        is_active: true,
      },
      { onConflict: "inspection_run_id,target_id,target_obligation_id" }
    )
    .select("inspection_scope_id")
    .single();
  if (scopeError || !scope) {
    throw new Error(scopeError?.message || "inspection scope failed");
  }
  scopeId = scope.inspection_scope_id;

  const { data: inspection, error: inspectionError } = await supabase
    .from("inspection_result")
    .insert({
      inspection_run_id: inspectionRunId,
      compliance_id: complianceId,
      status: "SUPP",
      inspection_note: "동일 의무 ID 점검 스모크",
    })
    .select("inspection_result_id")
    .single();
  if (inspectionError || !inspection) {
    throw new Error(inspectionError?.message || "inspection result failed");
  }
  inspectionResultId = inspection.inspection_result_id;
  report.inspection_saved = true;

  const { data: summary, error: summaryError } = await supabase
    .from("v_facility_workflow")
    .select(
      "target_ref,obl_id,period_key,compliance_status,inspection_status,inspection_note"
    )
    .eq("target_ref", sample.target_ref)
    .eq("obl_id", sample.obl_id)
    .eq("period_key", periodKey)
    .limit(1)
    .single();
  if (
    summaryError ||
    summary?.compliance_status !== "DONE" ||
    summary?.inspection_status !== "SUPP"
  ) {
    throw new Error(summaryError?.message || "summary view roundtrip failed");
  }
  report.summary_same_identity = true;
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.passed = false;
  report.error = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await cleanup();
}
