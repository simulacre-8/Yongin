import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("Yongin organization smoke test requires a publishable key");
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function exactCount(orgType?: string, sourceSection?: string) {
  let query = supabase
    .from("ref_yongin_org_unit")
    .select("org_key", { count: "exact", head: true })
    .eq("is_active", true);
  if (orgType) query = query.eq("org_type", orgType);
  if (sourceSection) query = query.eq("source_section", sourceSection);
  const { count, error } = await query;
  if (error) throw new Error(`Organization count failed: ${error.message}`);
  return count ?? 0;
}

const [
  total,
  cityBureaus,
  cityDepartments,
  directAgencies,
  directDepartments,
  serviceOffices,
  serviceDepartments,
  districts,
  districtDepartments,
  localOffices,
  teams,
] = await Promise.all([
  exactCount(),
  exactCount("BUREAU", "시청"),
  exactCount("DEPARTMENT", "시청"),
  exactCount("DIRECT_AGENCY", "직속기관"),
  exactCount("DEPARTMENT", "직속기관"),
  exactCount("SERVICE_OFFICE", "사업소"),
  exactCount("DEPARTMENT", "사업소"),
  exactCount("DISTRICT", "3개구청"),
  exactCount("DEPARTMENT", "3개구청"),
  exactCount("LOCAL_OFFICE", "3개구청"),
  exactCount("TEAM"),
]);

const { data: safetyTeam, error: safetyTeamError } = await supabase
  .from("v_yongin_org_tree")
  .select(
    "org_key,parent_name,name,org_type,hierarchy_path,source_section,snapshot_date"
  )
  .eq("name", "중대재해예방팀")
  .limit(1)
  .single();
if (safetyTeamError) {
  throw new Error(`Safety-team lookup failed: ${safetyTeamError.message}`);
}

const { data: railDepartment, error: railDepartmentError } = await supabase
  .from("v_yongin_org_tree")
  .select("name,parent_name,org_type,source_code,child_count")
  .eq("name", "도시철도과")
  .limit(1)
  .single();
if (railDepartmentError) {
  throw new Error(
    `Rail-department lookup failed: ${railDepartmentError.message}`
  );
}

const { count: falseTeamCount, error: falseTeamError } = await supabase
  .from("ref_yongin_org_unit")
  .select("org_key", { count: "exact", head: true })
  .eq("is_active", true)
  .eq("name", "부팀");
if (falseTeamError) {
  throw new Error(`False-team check failed: ${falseTeamError.message}`);
}

const checks = {
  total: total === 792,
  cityBureaus: cityBureaus === 13,
  cityDepartments: cityDepartments === 66,
  directAgencies: directAgencies === 4,
  directDepartments: directDepartments === 9,
  serviceOffices: serviceOffices === 5,
  serviceDepartments: serviceDepartments === 14,
  districts: districts === 3,
  districtDepartments: districtDepartments === 38,
  localOffices: localOffices === 39,
  derivedTeams: teams === 590,
  safetyTeam:
    safetyTeam.parent_name === "안전정책관" &&
    safetyTeam.org_type === "TEAM" &&
    safetyTeam.hierarchy_path.includes("중대재해예방팀"),
  railDepartment:
    railDepartment.parent_name === "교통정책국" &&
    railDepartment.org_type === "DEPARTMENT" &&
    Boolean(railDepartment.source_code) &&
    Number(railDepartment.child_count) > 0,
  noFalseTeam: (falseTeamCount ?? 0) === 0,
};

console.log(
  JSON.stringify(
    {
      counts: {
        total,
        cityBureaus,
        cityDepartments,
        directAgencies,
        directDepartments,
        serviceOffices,
        serviceDepartments,
        districts,
        districtDepartments,
        localOffices,
        teams,
      },
      safetyTeam,
      railDepartment,
      falseTeamCount,
      checks,
    },
    null,
    2
  )
);

if (Object.values(checks).some(value => !value)) {
  throw new Error("Yongin organization smoke test failed");
}
console.log("YONGIN_ORG_SMOKE_PASSED");
