import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("Readiness check requires a Supabase publishable key");
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const tables = [
  "ref_law",
  "ref_unit",
  "ref_rule",
  "ref_obligation",
  "ref_rule_obligation",
  "ref_managed_target",
  "ref_managed_target_obligation",
  "ref_yongin_org_snapshot",
  "ref_yongin_org_unit",
  "v_yongin_org_tree",
  "v_facility_workflow",
  "demo_work_assignment_rule",
  "demo_work_item",
  "demo_work_assignment_event",
  "demo_work_delegation_request",
  "demo_work_attachment",
  "demo_work_reset_log",
  "v_demo_my_work",
  "demo_scenario",
  "org",
  "profile",
  "target",
  "target_applicability",
  "target_obligation",
  "compliance_record",
  "evidence",
  "demo_compliance_export_event",
  "demo_compliance_action_event",
  "demo_compliance_action_evidence",
  "inspection_run",
  "inspection_scope",
  "inspection_result",
  "audit_event",
] as const;

const results: Array<{
  resource: string;
  ready: boolean;
  count?: number;
  error?: string;
}> = [];

for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .limit(1);
  results.push({
    resource: `table:${table}`,
    ready: !error,
    ...(error ? { error: error.message } : { count: count ?? 0 }),
  });
}

const { error: complianceActionModelError } = await supabase
  .from("demo_compliance_action_event")
  .select(
    "work_category,action_kind,action_start_date,action_end_date,document_form_name,actor_employee_no,actor_org_name,actor_display_name,work_origin,delegated_at,occurred_at,created_at"
  )
  .limit(1);
results.push({
  resource: "contract:compliance-action-document-model",
  ready: !complianceActionModelError,
  ...(complianceActionModelError
    ? { error: complianceActionModelError.message }
    : {}),
});

function rpcExists(error?: { code?: string; message?: string } | null) {
  return !(
    error?.code === "PGRST202" ||
    error?.message?.includes("Could not find the function")
  );
}

const { error: documentActionRpcError } = await supabase.rpc(
  "demo_log_compliance_action",
  {
    p_request_id: null,
    p_compliance_id: null,
    p_target_obligation_id: null,
    p_period_key: null,
    p_work_category: null,
    p_action_kind: null,
    p_status_before: null,
    p_status_after: null,
    p_action_start_date: null,
    p_action_end_date: null,
    p_action_detail: null,
    p_document_form_name: null,
    p_actor_profile_id: null,
    p_evidence_ids: [],
    p_occurred_at: null,
  }
);
results.push({
  resource: "contract:compliance-action-document-rpc",
  ready: rpcExists(documentActionRpcError),
  ...(!rpcExists(documentActionRpcError)
    ? { error: documentActionRpcError?.message || "RPC not found" }
    : {}),
});

const { error: legacyActionRpcError } = await supabase.rpc(
  "demo_log_compliance_action",
  {
    p_compliance_id: null,
    p_target_obligation_id: null,
    p_period_key: null,
    p_action_kind: null,
    p_status_before: null,
    p_status_after: null,
    p_action_date: null,
    p_action_detail: null,
    p_note: null,
    p_actor_role: null,
    p_evidence_ids: [],
    p_occurred_at: null,
  }
);
results.push({
  resource: "contract:compliance-action-legacy-rpc",
  ready: rpcExists(legacyActionRpcError),
  ...(!rpcExists(legacyActionRpcError)
    ? { error: legacyActionRpcError?.message || "RPC not found" }
    : {}),
});

const { error: storageError } = await supabase.storage
  .from("evidence-private")
  .list("demo", { limit: 1 });
results.push({
  resource: "bucket:evidence-private/demo",
  ready: !storageError,
  ...(storageError ? { error: storageError.message } : {}),
});

console.table(
  results.map(({ resource, ready, count, error }) => ({
    resource,
    ready,
    count: count ?? "-",
    error: error ?? "",
  }))
);
const missing = results.filter(item => !item.ready);
console.log(
  JSON.stringify(
    {
      ready: missing.length === 0,
      resources: results.length,
      missing: missing.map(item => item.resource),
    },
    null,
    2
  )
);
if (missing.length > 0) process.exitCode = 1;
