import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const planId = "yongin-tuesday-20260908";
const itemId = "sat-01";

if (!url || !key) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!key.startsWith("sb_publishable_")) {
  throw new Error("Plan smoke test requires a Supabase publishable key");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const marker = `plan-smoke:${crypto.randomUUID()}`;
const { data: original, error: readError } = await supabase
  .from("project_plan_item")
  .select("status,progress,note")
  .eq("plan_id", planId)
  .eq("item_id", itemId)
  .single();

if (readError || !original) {
  throw new Error(
    `Plan row precondition failed: ${readError?.message ?? "missing"}`
  );
}

let restored = false;
try {
  const { error: updateError } = await supabase
    .from("project_plan_item")
    .update({ note: marker, updated_by: "plan-smoke" })
    .eq("plan_id", planId)
    .eq("item_id", itemId);
  if (updateError) throw updateError;

  const { data: updated, error: verifyError } = await supabase
    .from("project_plan_item")
    .select("note")
    .eq("plan_id", planId)
    .eq("item_id", itemId)
    .single();
  if (verifyError || updated?.note !== marker) {
    throw verifyError ?? new Error("Plan update did not persist");
  }

  const { data: events, error: eventError } = await supabase
    .from("project_plan_event")
    .select("after_note")
    .eq("plan_id", planId)
    .eq("item_id", itemId)
    .eq("after_note", marker)
    .limit(1);
  if (eventError || !events?.length) {
    throw eventError ?? new Error("Plan audit event was not captured");
  }
} finally {
  const { error: restoreError } = await supabase
    .from("project_plan_item")
    .update({
      status: original.status,
      progress: original.progress,
      note: original.note,
      updated_by: "plan-smoke-restore",
    })
    .eq("plan_id", planId)
    .eq("item_id", itemId);
  restored = !restoreError;
}

if (!restored) throw new Error("Plan smoke row restoration failed");
console.log(
  JSON.stringify(
    {
      plan_id: planId,
      item_id: itemId,
      read: true,
      update: true,
      audit: true,
      restored,
      passed: true,
    },
    null,
    2
  )
);
