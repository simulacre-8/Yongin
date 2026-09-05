import { targets as fallbackTargets } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

export type ManagedTargetRow = {
  id: string;
  name: string;
  department: string;
  address: string;
  manager: string;
  category: "사업장" | "시설물" | "공중교통수단" | "도급·용역·위탁";
  detailKind: string;
  obligationCount: number;
  sourceKind: "LOCAL_DEMO" | "FMS" | "DEMO_VIRTUAL";
  isDemoVirtual: boolean;
  applicability: string;
};

function fallbackRows(): ManagedTargetRow[] {
  return fallbackTargets.map(target => ({
    id: target.id,
    name: target.name,
    department: target.department,
    address: target.address,
    manager: target.manager,
    category: "사업장",
    detailKind: target.type,
    obligationCount: 10,
    sourceKind: "LOCAL_DEMO",
    isDemoVirtual: false,
    applicability: "해당",
  }));
}

export const LOCAL_MANAGED_TARGETS = fallbackRows();

export async function loadManagedTargets(): Promise<{
  rows: ManagedTargetRow[];
  source: "supabase" | "fallback";
  reason?: string;
}> {
  const base = LOCAL_MANAGED_TARGETS;
  if (!supabase) {
    return {
      rows: base,
      source: "fallback",
      reason: "Supabase 환경변수 미설정",
    };
  }

  const { data, error } = await supabase
    .from("v_managed_target_summary")
    .select(
      "target_ref,target_name,target_category,facility_group,facility_kind,facility_class,address,subject_name,l2_result,source_kind,is_demo_virtual,mapped_obligation_count"
    )
    .order("is_demo_virtual", { ascending: true })
    .order("target_name", { ascending: true })
    .limit(500);

  if (error || !data) {
    return {
      rows: base,
      source: "fallback",
      reason: error?.message ?? "시설 참조 데이터를 불러오지 못했습니다.",
    };
  }

  const remote = data.map(row => {
    const targetCategory = String(row.target_category ?? "");
    const category: ManagedTargetRow["category"] =
      targetCategory === "공중교통수단"
        ? "공중교통수단"
        : targetCategory === "도급·용역·위탁"
          ? "도급·용역·위탁"
          : "시설물";
    return {
      id: String(row.target_ref),
      name: String(row.target_name),
      department: String(row.subject_name ?? "용인특례시"),
      address: String(row.address ?? "-"),
      manager: row.source_kind === "FMS" ? "용인특례시" : "시연값",
      category,
      detailKind: [row.facility_group, row.facility_kind, row.facility_class]
        .filter(Boolean)
        .map(String)
        .join(" / "),
      obligationCount: Number(row.mapped_obligation_count ?? 0),
      sourceKind: String(row.source_kind) as "FMS" | "DEMO_VIRTUAL",
      isDemoVirtual: Boolean(row.is_demo_virtual),
      applicability: String(row.l2_result ?? "검토필요"),
    };
  });

  return { rows: [...base, ...remote], source: "supabase" };
}
