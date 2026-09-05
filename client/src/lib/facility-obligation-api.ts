import type { DemoObligation } from "@/lib/demo-data";
import { obligations as fallbackObligations } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

type MappingRow = {
  obl_id: string;
  law_name: string;
  unit_path: string | null;
  layer: string;
  cycle: string | null;
  evidence: string | null;
  map_basis: string | null;
  map_reason: string | null;
  map_confidence: string;
  l2_result: string;
  mapping_source: string;
  is_demo_virtual: boolean;
};

type ObligationRow = {
  obl_id: string;
  title_ko: string;
  detail_ko: string | null;
  obligation_group: string;
  cycle: string | null;
  evidence_required: boolean;
  review_status: string;
  display_order: number;
};

export type MappedObligation = DemoObligation & {
  layer: string;
  evidence: string;
  mapReason: string;
  mapConfidence: string;
  applicability: string;
  mappingSource: string;
  isDemoVirtual: boolean;
};

export type TargetObligationResult = {
  items: MappedObligation[];
  source: "supabase" | "fallback";
  reason?: string;
};

export function cycleToSchedule(cycle?: string | null): {
  scheduleType: "month" | "half";
  defaultDue: string;
} {
  const normalized = String(cycle ?? "").replace(/\s+/g, "");
  const isHalf =
    normalized.includes("반기") ||
    normalized.includes("상·하반기") ||
    normalized.includes("상/하반기");
  return isHalf
    ? { scheduleType: "half", defaultDue: "하반기" }
    : { scheduleType: "month", defaultDue: "2026-09" };
}

export function joinMappedObligations(
  mappings: MappingRow[],
  masters: ObligationRow[]
): MappedObligation[] {
  const masterById = new Map(masters.map(row => [row.obl_id, row]));

  return mappings
    .map(mapping => {
      const master = masterById.get(mapping.obl_id);
      const schedule = cycleToSchedule(mapping.cycle ?? master?.cycle);
      const detailParts = Array.from(
        new Set(
          [
            master?.detail_ko,
            mapping.map_reason,
            mapping.evidence ? `증빙: ${mapping.evidence}` : null,
          ]
            .map(value => value?.trim().replace(/\s+/g, " "))
            .filter((value): value is string => Boolean(value))
        )
      );

      return {
        id: mapping.obl_id,
        group: master?.obligation_group || mapping.layer || "관계 법령상 의무",
        title: master?.title_ko || mapping.obl_id,
        detail: detailParts.join(" · ") || "시설별 적용 의무",
        lawName: mapping.law_name,
        article: mapping.unit_path || mapping.map_basis || "근거 경로 확인",
        scheduleType: schedule.scheduleType,
        defaultDue: schedule.defaultDue,
        layer: mapping.layer,
        evidence: mapping.evidence || "",
        mapReason: mapping.map_reason || "",
        mapConfidence: mapping.map_confidence,
        applicability: mapping.l2_result,
        mappingSource: mapping.mapping_source,
        isDemoVirtual: mapping.is_demo_virtual,
      } satisfies MappedObligation;
    })
    .sort((a, b) => {
      const aOrder = masterById.get(a.id)?.display_order ?? 99999;
      const bOrder = masterById.get(b.id)?.display_order ?? 99999;
      return (
        a.group.localeCompare(b.group, "ko") ||
        a.lawName.localeCompare(b.lawName, "ko") ||
        aOrder - bOrder ||
        a.title.localeCompare(b.title, "ko")
      );
    });
}

function fallbackItems(): MappedObligation[] {
  return fallbackObligations.map(item => ({
    ...item,
    layer: "시연 기본값",
    evidence: "",
    mapReason: "Supabase 시설 매핑 조회 전 기본 시연 의무",
    mapConfidence: "demo",
    applicability: "해당",
    mappingSource: "LOCAL_FALLBACK",
    isDemoVirtual: true,
  }));
}

export async function loadTargetObligations(
  targetRef: string
): Promise<TargetObligationResult> {
  if (!supabase || !targetRef || targetRef === "target-yongin-cityhall") {
    return {
      items: fallbackItems(),
      source: "fallback",
      reason: !supabase
        ? "Supabase 환경변수 미설정"
        : "용인시청 기본 시연 의무",
    };
  }

  const { data: mappingData, error: mappingError } = await supabase
    .from("ref_managed_target_obligation")
    .select(
      "obl_id,law_name,unit_path,layer,cycle,evidence,map_basis,map_reason,map_confidence,l2_result,mapping_source,is_demo_virtual"
    )
    .eq("target_ref", targetRef)
    .neq("l2_result", "제외")
    .order("law_name", { ascending: true })
    .limit(500);

  if (mappingError || !mappingData) {
    return {
      items: [],
      source: "fallback",
      reason: mappingError?.message || "시설별 의무 매핑 조회 실패",
    };
  }

  const obligationIds = Array.from(
    new Set(mappingData.map(row => String(row.obl_id)))
  );
  if (obligationIds.length === 0) {
    return { items: [], source: "supabase" };
  }

  const { data: masterData, error: masterError } = await supabase
    .from("ref_obligation")
    .select(
      "obl_id,title_ko,detail_ko,obligation_group,cycle,evidence_required,review_status,display_order"
    )
    .in("obl_id", obligationIds)
    .limit(500);

  if (masterError || !masterData) {
    return {
      items: [],
      source: "fallback",
      reason: masterError?.message || "의무 마스터 조회 실패",
    };
  }

  return {
    items: joinMappedObligations(
      mappingData as MappingRow[],
      masterData as ObligationRow[]
    ),
    source: "supabase",
  };
}
