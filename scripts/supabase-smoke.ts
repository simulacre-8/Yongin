import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const scenarioId = "10000000-0000-0000-0000-000000000001";
const bucket = "evidence-private";

if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error(
    "Only a Supabase publishable key may be used by this smoke test"
  );
}
if (
  Object.keys(process.env).some(
    key => key.startsWith("VITE_") && key.toLowerCase().includes("service_role")
  )
) {
  throw new Error(
    "A service-role key must never be exposed through VITE_* variables"
  );
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const smokeId = crypto.randomUUID();
const storagePath = `demo/smoke/${smokeId}/roundtrip.txt`;
const report: Record<string, string | number | boolean> = {
  target_id: smokeId,
  storage_path: storagePath,
};

async function assertReady() {
  const { count, error } = await supabase
    .from("ref_law")
    .select("law_id", { count: "exact", head: true });
  if (error) throw new Error(`Schema readiness failed: ${error.message}`);
  report.ref_law_count = count ?? 0;

  const { data, error: scenarioError } = await supabase
    .from("demo_scenario")
    .select("scenario_id")
    .eq("scenario_id", scenarioId)
    .maybeSingle();
  if (scenarioError)
    throw new Error(`Seed readiness failed: ${scenarioError.message}`);
  if (!data) throw new Error("Seed readiness failed: demo scenario is missing");
  report.schema_ready = true;
}

async function cleanup() {
  await supabase.storage.from(bucket).remove([storagePath]);
  await supabase.from("target").delete().eq("target_id", smokeId);
}

async function run() {
  try {
    await assertReady();

    const { error: createError } = await supabase.from("target").insert({
      target_id: smokeId,
      scenario_id: scenarioId,
      name: "Supabase CRUD 스모크 대상",
      target_type: "public_facility",
      detail_type: "smoke_test",
      manager_name: "CREATE",
      attributes: { smoke: true, phase: "create" },
      is_demo: true,
    });
    if (createError) throw new Error(`CREATE failed: ${createError.message}`);
    report.create = true;

    const { data: created, error: readError } = await supabase
      .from("target")
      .select("target_id,name,manager_name,attributes")
      .eq("target_id", smokeId)
      .single();
    if (readError || created?.manager_name !== "CREATE") {
      throw new Error(`READ failed: ${readError?.message ?? "unexpected row"}`);
    }
    report.read = true;

    const { error: updateError } = await supabase
      .from("target")
      .update({
        manager_name: "UPDATE",
        attributes: { smoke: true, phase: "update" },
      })
      .eq("target_id", smokeId);
    if (updateError) throw new Error(`UPDATE failed: ${updateError.message}`);

    const { data: updated, error: verifyUpdateError } = await supabase
      .from("target")
      .select("manager_name")
      .eq("target_id", smokeId)
      .single();
    if (verifyUpdateError || updated?.manager_name !== "UPDATE") {
      throw new Error(
        `UPDATE verification failed: ${verifyUpdateError?.message ?? "unexpected row"}`
      );
    }
    report.update = true;

    const payload = new TextEncoder().encode(
      `Yongin Supabase smoke ${smokeId}`
    );
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, payload, {
        contentType: "text/plain;charset=utf-8",
        upsert: false,
      });
    if (uploadError)
      throw new Error(`STORAGE upload failed: ${uploadError.message}`);

    const { data: downloaded, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(storagePath);
    if (downloadError || !downloaded)
      throw new Error(`STORAGE download failed: ${downloadError?.message}`);
    const downloadedText = await downloaded.text();
    if (!downloadedText.includes(smokeId))
      throw new Error("STORAGE roundtrip content mismatch");
    report.storage_roundtrip = true;

    const { error: storageDeleteError } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);
    if (storageDeleteError)
      throw new Error(`STORAGE delete failed: ${storageDeleteError.message}`);
    report.storage_delete = true;

    const { error: deleteError } = await supabase
      .from("target")
      .delete()
      .eq("target_id", smokeId);
    if (deleteError) throw new Error(`DELETE failed: ${deleteError.message}`);

    const { data: deleted, error: verifyDeleteError } = await supabase
      .from("target")
      .select("target_id")
      .eq("target_id", smokeId)
      .maybeSingle();
    if (verifyDeleteError || deleted) {
      throw new Error(
        `DELETE verification failed: ${verifyDeleteError?.message ?? "row still exists"}`
      );
    }
    report.delete = true;

    const { data: auditRows, error: auditError } = await supabase
      .from("audit_event")
      .select("action")
      .eq("entity_type", "target")
      .eq("entity_id", smokeId)
      .order("occurred_at", { ascending: true });
    if (auditError) throw new Error(`AUDIT read failed: ${auditError.message}`);
    const auditActions = new Set((auditRows ?? []).map(row => row.action));
    if (
      !["insert", "update", "delete"].every(action => auditActions.has(action))
    ) {
      throw new Error(
        `AUDIT verification failed: ${JSON.stringify([...auditActions])}`
      );
    }
    report.audit_events = auditRows?.length ?? 0;
    report.passed = true;
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await cleanup();
    console.error(
      JSON.stringify(
        {
          ...report,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

await run();
