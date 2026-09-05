import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}

const client = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const activeRuleIds = ["RUL-000840", "RUL-000841", "RUL-000900", "RUL-000901"];

async function main() {
  const { data: rules, error: rulesError } = await client
    .from("ref_rule")
    .select("rul_id,source_unit_id,metric_key,operator,threshold_value")
    .in("rul_id", activeRuleIds)
    .order("rul_id");
  if (rulesError) throw rulesError;
  if (rules?.length !== activeRuleIds.length) {
    throw new Error(
      `Expected 4 approved ADOMS rules, got ${rules?.length ?? 0}`
    );
  }

  const { data: links, error: linksError } = await client
    .from("ref_rule_obligation")
    .select("rul_id,obl_id")
    .in("rul_id", activeRuleIds);
  if (linksError) throw linksError;
  if (links?.length !== activeRuleIds.length) {
    throw new Error(
      `Expected 4 approved ADOMS links, got ${links?.length ?? 0}`
    );
  }

  const obligationIds = Array.from(new Set(links.map(row => row.obl_id)));
  const { data: obligations, error: obligationsError } = await client
    .from("ref_obligation")
    .select("obl_id,anchor_unit_id,title_ko,metadata")
    .in("obl_id", obligationIds);
  if (obligationsError) throw obligationsError;
  if (obligations?.length !== 2) {
    throw new Error(
      `Expected 2 linked obligations, got ${obligations?.length ?? 0}`
    );
  }

  const unitIds = Array.from(
    new Set([
      ...rules.map(row => row.source_unit_id).filter(Boolean),
      ...obligations.map(row => row.anchor_unit_id).filter(Boolean),
    ])
  );
  const { data: units, error: unitsError } = await client
    .from("ref_unit")
    .select("unit_id,law_id,unit_label,display_text")
    .in("unit_id", unitIds);
  if (unitsError) throw unitsError;
  if (!units?.length || units.some(row => !row.display_text)) {
    throw new Error("ADOMS source-unit text is missing");
  }

  const { data: target, error: targetError } = await client
    .from("target")
    .select("target_id")
    .eq("is_demo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (targetError || !target)
    throw targetError ?? new Error("Demo target missing");

  const targetId = target.target_id;
  const { data: before, error: beforeError } = await client
    .from("target_applicability")
    .select(
      "applicability_id,rul_id,is_applicable,input_snapshot,rule_snapshot,source_version,evaluated_at"
    )
    .eq("target_id", targetId)
    .in("rul_id", activeRuleIds);
  if (beforeError) throw beforeError;

  const recordedAt = new Date().toISOString();
  const smokeRows = rules.map(rule => ({
    target_id: targetId,
    rul_id: rule.rul_id,
    is_applicable: true,
    input_snapshot: {
      smoke_test: true,
      worker_count: 120,
      gross_area: 39872,
      facts_effective_at: "2026-09-05",
      recorded_at: recordedAt,
    },
    rule_snapshot: {
      operator: rule.operator,
      expected: rule.threshold_value,
      source_unit_id: rule.source_unit_id,
    },
    source_version: "adoms-smoke-test",
    evaluated_at: recordedAt,
  }));
  const { error: upsertError } = await client
    .from("target_applicability")
    .upsert(smokeRows, { onConflict: "target_id,rul_id" });
  if (upsertError) throw upsertError;

  const { data: written, error: writtenError } = await client
    .from("target_applicability")
    .select("rul_id,source_version")
    .eq("target_id", targetId)
    .in("rul_id", activeRuleIds)
    .eq("source_version", "adoms-smoke-test");
  if (writtenError) throw writtenError;
  if (written?.length !== activeRuleIds.length) {
    throw new Error(`Expected 4 saved snapshots, got ${written?.length ?? 0}`);
  }

  const beforeByRule = new Map((before ?? []).map(row => [row.rul_id, row]));
  const restoreRows = activeRuleIds
    .map(ruleId => beforeByRule.get(ruleId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map(row => ({
      target_id: targetId,
      rul_id: row.rul_id,
      is_applicable: row.is_applicable,
      input_snapshot: row.input_snapshot,
      rule_snapshot: row.rule_snapshot,
      source_version: row.source_version,
      evaluated_at: row.evaluated_at,
    }));
  if (restoreRows.length) {
    const { error: restoreError } = await client
      .from("target_applicability")
      .upsert(restoreRows, { onConflict: "target_id,rul_id" });
    if (restoreError) throw restoreError;
  }

  const newRuleIds = activeRuleIds.filter(ruleId => !beforeByRule.has(ruleId));
  if (newRuleIds.length) {
    const { error: cleanupError } = await client
      .from("target_applicability")
      .delete()
      .eq("target_id", targetId)
      .in("rul_id", newRuleIds);
    if (cleanupError) throw cleanupError;
  }

  console.table({
    approvedRules: rules.length,
    approvedLinks: links.length,
    obligations: obligations.length,
    sourceUnits: units.length,
    savedSnapshots: written.length,
    cleanup: "restored",
  });
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
