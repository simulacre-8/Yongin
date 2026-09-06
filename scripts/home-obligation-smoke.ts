import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("Home-obligation smoke test requires a publishable key");
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const sourceVersion = "yongin-obligation-pool-20260906";
const citizenFacilityIds = [
  "OBL-0000004",
  "OBL-0000005",
  "OBL-0000006",
  "OBL-0000020",
  "OBL-0000021",
  "OBL-0000022",
  "OBL-0000023",
  "OBL-0000024",
  "OBL-0000025",
  "OBL-0000026",
  "OBL-0000027",
  "OBL-0000028",
  "OBL-0000029",
];
const citizenProductIds = [
  "OBL-0000007",
  "OBL-0000008",
  "OBL-0000030",
  "OBL-0000031",
  "OBL-0000032",
  "OBL-0000033",
  "OBL-0000034",
  "OBL-0000035",
  "OBL-0000036",
];

async function countRows(configure: (query: any) => any) {
  const base = supabase
    .from("ref_obligation")
    .select("obl_id", { count: "exact", head: true })
    .eq("source_version", sourceVersion);
  const { count, error } = await configure(base);
  if (error) throw new Error(`Home obligation count failed: ${error.message}`);
  return count ?? 0;
}

const [
  total,
  sapaTotal,
  recurrence,
  correctiveOrder,
  directRelatedLaw,
  industrial,
  citizenFacility,
  citizenProduct,
] = await Promise.all([
  countRows(query => query),
  countRows(query => query.eq("law_name", "중대재해처벌법")),
  countRows(query =>
    query.eq("law_name", "중대재해처벌법").eq("obligation_group", "MG11")
  ),
  countRows(query =>
    query.eq("law_name", "중대재해처벌법").eq("obligation_group", "MG05")
  ),
  countRows(query =>
    query
      .eq("law_name", "중대재해처벌법")
      .in("title_ko", ["관계법령 의무이행", "관계법령 교육이수"])
  ),
  countRows(query =>
    query.eq("law_name", "중대재해처벌법").in("article_no", ["4", "5"])
  ),
  countRows(query => query.in("obl_id", citizenFacilityIds)),
  countRows(query => query.in("obl_id", citizenProductIds)),
]);

const safetySystem =
  sapaTotal - recurrence - correctiveOrder - directRelatedLaw;
const relatedLaw = total - sapaTotal + directRelatedLaw;
const checks = {
  total: total === 3688,
  safetySystem: safetySystem === 24,
  recurrence: recurrence === 3,
  correctiveOrder: correctiveOrder === 3,
  relatedLaw: relatedLaw === 3658,
  industrial: industrial === 14,
  citizenTotal: citizenFacility + citizenProduct === 22,
  citizenFacility: citizenFacility === 13,
  citizenProduct: citizenProduct === 9,
};

console.log(
  JSON.stringify(
    {
      total,
      safetySystem,
      recurrence,
      correctiveOrder,
      relatedLaw,
      industrial,
      citizenFacility,
      citizenProduct,
      checks,
    },
    null,
    2
  )
);

if (Object.values(checks).some(value => !value)) {
  throw new Error("Home-obligation smoke test failed");
}
console.log("HOME_OBLIGATION_SMOKE_PASSED");
