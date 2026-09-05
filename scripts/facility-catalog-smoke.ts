import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("Facility smoke test requires a Supabase publishable key");
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function exactCount(
  table: "ref_managed_target" | "ref_managed_target_obligation",
  column?: string,
  value?: string | boolean
) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (column && value !== undefined) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

const totalTargets = await exactCount("ref_managed_target");
const fmsTargets = await exactCount("ref_managed_target", "source_kind", "FMS");
const demoTargets = await exactCount(
  "ref_managed_target",
  "is_demo_virtual",
  true
);
const mappings = await exactCount("ref_managed_target_obligation");

const { data: transit, error: transitError } = await supabase
  .from("ref_managed_target")
  .select(
    "target_name,target_category,source_kind,is_demo_virtual,l2_basis_path"
  )
  .eq("source_id", "RAIL-EVERLINE")
  .limit(1)
  .maybeSingle();
if (transitError)
  throw new Error(`transit read failed: ${transitError.message}`);

const { data: waterworks, error: waterworksError } = await supabase
  .from("ref_managed_target")
  .select("target_ref,target_name")
  .eq("source_id", "WS2013-0000051")
  .limit(1)
  .maybeSingle();
if (waterworksError)
  throw new Error(`waterworks read failed: ${waterworksError.message}`);

const { data: waterworksMappings, error: waterworksMappingsError } =
  await supabase
    .from("ref_managed_target_obligation")
    .select("obl_id,law_name,unit_path,l2_result")
    .eq("target_ref", waterworks?.target_ref ?? "missing")
    .neq("l2_result", "제외")
    .limit(100);
if (waterworksMappingsError) {
  throw new Error(
    `waterworks obligations failed: ${waterworksMappingsError.message}`
  );
}

const sampleObligationId = waterworksMappings?.[0]?.obl_id;
const { data: obligationMaster, error: obligationMasterError } = await supabase
  .from("ref_obligation")
  .select("obl_id,title_ko,obligation_group")
  .eq("obl_id", sampleObligationId ?? "missing")
  .limit(1)
  .maybeSingle();
if (obligationMasterError) {
  throw new Error(
    `obligation master read failed: ${obligationMasterError.message}`
  );
}

const checks = {
  totalTargets: totalTargets === 153,
  fmsTargets: fmsTargets === 150,
  demoTargets: demoTargets === 3,
  mappings: mappings === 2929,
  transitExists: Boolean(transit),
  transitNotFms: transit?.source_kind === "DEMO_VIRTUAL",
  transitCategory: transit?.target_category === "공중교통수단",
  transitLegalBasis: String(transit?.l2_basis_path ?? "").includes(
    "도시철도법 제2조제2호"
  ),
  waterworksExists: waterworks?.target_name === "고기상수도",
  waterworksObligations: waterworksMappings?.length === 31,
  obligationMasterJoined:
    Boolean(sampleObligationId) &&
    obligationMaster?.obl_id === sampleObligationId &&
    Boolean(obligationMaster?.title_ko),
};

console.log(
  JSON.stringify(
    {
      totalTargets,
      fmsTargets,
      demoTargets,
      mappings,
      transit,
      waterworks,
      waterworksObligationCount: waterworksMappings?.length ?? 0,
      obligationMaster,
      checks,
    },
    null,
    2
  )
);

if (Object.values(checks).some(value => !value)) {
  throw new Error("Facility catalog smoke test failed");
}
console.log("FACILITY_CATALOG_SMOKE_PASSED");
