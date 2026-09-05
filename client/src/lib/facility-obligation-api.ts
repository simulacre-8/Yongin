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
  law_id: string | null;
  law_name: string | null;
  doc_id: string | null;
  unit_path: string | null;
  article_no: string | null;
  article_title: string | null;
  anchor_text: string | null;
  cycle: string | null;
  evidence_required: boolean;
  review_status: string;
  display_order: number;
  source_version: string;
};

export type MappedObligation = DemoObligation & {
  layer: string;
  evidence: string;
  mapReason: string;
  mapConfidence: string;
  applicability: string;
  mappingSource: string;
  isDemoVirtual: boolean;
  articleTitle: string;
  sourceText: string;
  lawId: string;
  documentId: string;
  sourceVersion: string;
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

export function formatLegalArticlePath(
  unitPath?: string | null,
  articleNo?: string | null
): string {
  const rawPath = String(unitPath ?? "").trim();
  if (/^제\d+조/.test(rawPath)) return rawPath;

  const labels = rawPath
    .split("/")
    .map(segment => {
      const article = segment.match(/^a(\d+)(?:g(\d+))?$/i);
      if (article) {
        return `제${article[1]}조${article[2] ? `의${article[2]}` : ""}`;
      }
      const paragraph = segment.match(/^p(\d+)$/i);
      if (paragraph) return `제${paragraph[1]}항`;
      const item = segment.match(/^n(\d+)$/i);
      if (item) return `제${item[1]}호`;
      return "";
    })
    .filter(Boolean);

  if (labels.length > 0) return labels.join(" ");

  const normalizedArticleNo = String(articleNo ?? "")
    .trim()
    .replace(/^제/, "")
    .replace(/조$/, "");
  return /^\d+(?:의\d+)?$/.test(normalizedArticleNo)
    ? `제${normalizedArticleNo}조`
    : "조문 확인 필요";
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
      const lawName = mapping.law_name || master?.law_name || "관계 법령";
      const article = formatLegalArticlePath(
        master?.unit_path || mapping.unit_path,
        master?.article_no
      );
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
        lawName,
        article,
        scheduleType: schedule.scheduleType,
        defaultDue: schedule.defaultDue,
        layer: mapping.layer,
        evidence: mapping.evidence || "",
        mapReason: mapping.map_reason || "",
        mapConfidence: mapping.map_confidence,
        applicability: mapping.l2_result,
        mappingSource: mapping.mapping_source,
        isDemoVirtual: mapping.is_demo_virtual,
        articleTitle: master?.article_title?.trim() || master?.title_ko || "",
        sourceText: master?.anchor_text?.trim() || "",
        lawId: master?.law_id || "",
        documentId: master?.doc_id || "",
        sourceVersion: master?.source_version || "",
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
    articleTitle: item.title,
    sourceText: "",
    lawId: "",
    documentId: "",
    sourceVersion: "",
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
      "obl_id,title_ko,detail_ko,obligation_group,law_id,law_name,doc_id,unit_path,article_no,article_title,anchor_text,cycle,evidence_required,review_status,display_order,source_version"
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
