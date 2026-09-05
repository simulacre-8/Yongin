import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("Core-data smoke test requires a publishable key");
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function exactCount(
  table:
    | "ref_obligation"
    | "ref_managed_target"
    | "ref_managed_target_obligation",
  column?: string,
  value?: string
) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (column && value !== undefined) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

const obligationPool = await exactCount(
  "ref_obligation",
  "source_version",
  "yongin-obligation-pool-20260906"
);
const clientFacilities = await exactCount(
  "ref_managed_target",
  "source_kind",
  "FMS"
);
const clientMappings = await exactCount(
  "ref_managed_target_obligation",
  "mapping_source",
  "CLIENT_CSV"
);

const { data: mappedSample, error: mappedSampleError } = await supabase
  .from("ref_obligation")
  .select(
    "obl_id,title_ko,law_id,law_name,doc_id,unit_path,article_no,article_title,anchor_text,source_version"
  )
  .eq("obl_id", "OBL-0002590")
  .limit(1)
  .single();
if (mappedSampleError) {
  throw new Error(
    `Mapped obligation sample failed: ${mappedSampleError.message}`
  );
}

const { data: mapping, error: mappingError } = await supabase
  .from("ref_managed_target_obligation")
  .select("target_ref,obl_id,law_name,unit_path,mapping_source")
  .eq("target_ref", "FMS:WS2013-0000051")
  .eq("obl_id", "OBL-0002590")
  .limit(1)
  .single();
if (mappingError) {
  throw new Error(`Facility mapping sample failed: ${mappingError.message}`);
}

const checks = {
  obligationPool: obligationPool === 3688,
  clientFacilities: clientFacilities === 150,
  clientMappings: clientMappings === 2906,
  sampleIdentity: mappedSample.obl_id === mapping.obl_id,
  sampleLaw: mappedSample.law_name === mapping.law_name,
  sampleUnitPath: mappedSample.unit_path === mapping.unit_path,
  graphKeysPreserved: Boolean(
    mappedSample.law_id &&
      mappedSample.doc_id &&
      mappedSample.unit_path &&
      mappedSample.obl_id
  ),
  sourceVersion:
    mappedSample.source_version === "yongin-obligation-pool-20260906",
  anchorPreserved: Boolean(mappedSample.anchor_text),
};

console.log(
  JSON.stringify(
    {
      obligationPool,
      clientFacilities,
      clientMappings,
      mappedSample,
      mapping,
      checks,
    },
    null,
    2
  )
);

if (Object.values(checks).some(value => !value)) {
  throw new Error("Yongin core-data smoke test failed");
}
console.log("YONGIN_CORE_DATA_SMOKE_PASSED");
