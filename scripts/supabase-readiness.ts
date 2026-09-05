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
  "demo_scenario",
  "org",
  "profile",
  "target",
  "target_applicability",
  "target_obligation",
  "compliance_record",
  "evidence",
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
