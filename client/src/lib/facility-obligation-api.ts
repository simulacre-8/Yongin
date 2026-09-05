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

type LegalSourceRow = {
  obligation_key: string;
  source_order: number;
  source_obl_id: string | null;
  source_unit_id: string;
  doc_id: string;
  law_id: string;
  law_name: string;
  document_title: string;
  unit_path: string | null;
  article_no: string | null;
  article_title: string | null;
  source_text: string;
  provision_last_amended_at: string | null;
  effective_from: string | null;
  source_version: string;
  source_kind: "CLIENT_ADOMS" | "DEMO_ALIAS";
};

type LegalDocumentRow = {
  doc_id: string;
  document_title: string;
  promulgated_no: string | null;
  last_amended_at: string | null;
  effective_from: string | null;
  amendment_kind: string | null;
  official_law_id: string | null;
  official_serial_no: string | null;
  official_detail_url: string | null;
  source_version: string;
  official_checked_at: string | null;
};

export type LegalSource = {
  sourceOrder: number;
  sourceObligationId: string;
  sourceUnitId: string;
  lawId: string;
  lawName: string;
  documentId: string;
  documentTitle: string;
  article: string;
  articleTitle: string;
  sourceText: string;
  provisionLastAmendedAt: string;
  provisionEffectiveFrom: string;
  lastAmendedAt: string;
  effectiveFrom: string;
  amendmentKind: string;
  promulgatedNo: string;
  officialLawId: string;
  officialSerialNo: string;
  officialDetailUrl: string;
  officialCheckedAt: string;
  sourceVersion: string;
  sourceKind: "CLIENT_ADOMS" | "DEMO_ALIAS" | "LEGACY_MASTER";
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
  legalSources: LegalSource[];
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

function legacySource(master?: ObligationRow): LegalSource[] {
  if (!master?.anchor_text?.trim()) return [];
  return [
    {
      sourceOrder: 1,
      sourceObligationId: master.obl_id,
      sourceUnitId: "",
      lawId: master.law_id || "",
      lawName: master.law_name || "관계 법령",
      documentId: master.doc_id || "",
      documentTitle: master.law_name || "관계 법령",
      article: formatLegalArticlePath(master.unit_path, master.article_no),
      articleTitle: master.article_title?.trim() || master.title_ko,
      sourceText: master.anchor_text.trim(),
      provisionLastAmendedAt: "",
      provisionEffectiveFrom: "",
      lastAmendedAt: "",
      effectiveFrom: "",
      amendmentKind: "",
      promulgatedNo: "",
      officialLawId: "",
      officialSerialNo: "",
      officialDetailUrl: "",
      officialCheckedAt: "",
      sourceVersion: master.source_version,
      sourceKind: "LEGACY_MASTER",
    },
  ];
}

export function buildLegalSourceMap(
  rows: LegalSourceRow[],
  documents: LegalDocumentRow[]
): Map<string, LegalSource[]> {
  const documentById = new Map(documents.map(row => [row.doc_id, row]));
  const grouped = new Map<string, LegalSource[]>();

  rows.forEach(row => {
    const document = documentById.get(row.doc_id);
    const item: LegalSource = {
      sourceOrder: row.source_order,
      sourceObligationId: row.source_obl_id || "",
      sourceUnitId: row.source_unit_id,
      lawId: row.law_id,
      lawName: row.law_name,
      documentId: row.doc_id,
      documentTitle:
        row.document_title || document?.document_title || row.law_name,
      article: formatLegalArticlePath(row.unit_path, row.article_no),
      articleTitle: row.article_title?.trim() || "",
      sourceText: row.source_text.trim(),
      provisionLastAmendedAt: row.provision_last_amended_at || "",
      provisionEffectiveFrom: row.effective_from || "",
      lastAmendedAt: document?.last_amended_at || "",
      effectiveFrom: document?.effective_from || row.effective_from || "",
      amendmentKind: document?.amendment_kind || "",
      promulgatedNo: document?.promulgated_no || "",
      officialLawId: document?.official_law_id || "",
      officialSerialNo: document?.official_serial_no || "",
      officialDetailUrl: document?.official_detail_url || "",
      officialCheckedAt: document?.official_checked_at || "",
      sourceVersion: row.source_version || document?.source_version || "",
      sourceKind: row.source_kind,
    };
    const previous = grouped.get(row.obligation_key) || [];
    grouped.set(row.obligation_key, [...previous, item]);
  });

  grouped.forEach(items => items.sort((a, b) => a.sourceOrder - b.sourceOrder));
  return grouped;
}

export function joinMappedObligations(
  mappings: MappingRow[],
  masters: ObligationRow[],
  legalSourceRows: LegalSourceRow[] = [],
  legalDocuments: LegalDocumentRow[] = []
): MappedObligation[] {
  const masterById = new Map(masters.map(row => [row.obl_id, row]));
  const sourceByKey = buildLegalSourceMap(legalSourceRows, legalDocuments);

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
      const legalSources =
        sourceByKey.get(mapping.obl_id) || legacySource(master);
      const primarySource = legalSources[0];

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
        articleTitle:
          primarySource?.articleTitle ||
          master?.article_title?.trim() ||
          master?.title_ko ||
          "",
        sourceText:
          primarySource?.sourceText || master?.anchor_text?.trim() || "",
        lawId: primarySource?.lawId || master?.law_id || "",
        documentId: primarySource?.documentId || master?.doc_id || "",
        sourceVersion:
          primarySource?.sourceVersion || master?.source_version || "",
        legalSources,
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

function fallbackItems(
  sourceByKey = new Map<string, LegalSource[]>()
): MappedObligation[] {
  return fallbackObligations.map(item => {
    const legalSources = sourceByKey.get(item.id) || [];
    const primarySource = legalSources[0];
    return {
      ...item,
      layer: "시연 기본값",
      evidence: "",
      mapReason: legalSources.length
        ? "용인시청 기본 의무와 ADOMS 정식 조문 연결"
        : "Supabase 시설 매핑 조회 전 기본 시연 의무",
      mapConfidence: legalSources.length ? "high" : "demo",
      applicability: "해당",
      mappingSource: legalSources.length ? "ADOMS_ALIAS" : "LOCAL_FALLBACK",
      isDemoVirtual: true,
      articleTitle: primarySource?.articleTitle || item.title,
      sourceText: primarySource?.sourceText || "",
      lawId: primarySource?.lawId || "",
      documentId: primarySource?.documentId || "",
      sourceVersion: primarySource?.sourceVersion || "",
      legalSources,
    };
  });
}

async function loadLegalSources(obligationKeys: string[]): Promise<{
  rows: LegalSourceRow[];
  documents: LegalDocumentRow[];
  error?: string;
}> {
  if (!supabase || obligationKeys.length === 0)
    return { rows: [], documents: [] };

  const { data: sourceData, error: sourceError } = await supabase
    .from("ref_obligation_legal_source")
    .select(
      "obligation_key,source_order,source_obl_id,source_unit_id,doc_id,law_id,law_name,document_title,unit_path,article_no,article_title,source_text,provision_last_amended_at,effective_from,source_version,source_kind"
    )
    .in("obligation_key", obligationKeys)
    .order("source_order", { ascending: true })
    .limit(500);

  if (sourceError || !sourceData) {
    return {
      rows: [],
      documents: [],
      error: sourceError?.message || "법령 원문 조회 실패",
    };
  }

  const documentIds = Array.from(
    new Set(sourceData.map(row => String(row.doc_id)))
  );
  if (documentIds.length === 0)
    return { rows: sourceData as LegalSourceRow[], documents: [] };

  const { data: documentData, error: documentError } = await supabase
    .from("ref_legal_document")
    .select(
      "doc_id,document_title,promulgated_no,last_amended_at,effective_from,amendment_kind,official_law_id,official_serial_no,official_detail_url,source_version,official_checked_at"
    )
    .in("doc_id", documentIds)
    .limit(100);

  return {
    rows: sourceData as LegalSourceRow[],
    documents: (documentData || []) as LegalDocumentRow[],
    error: documentError?.message,
  };
}

export async function loadTargetObligations(
  targetRef: string
): Promise<TargetObligationResult> {
  if (!supabase || !targetRef) {
    return {
      items: fallbackItems(),
      source: "fallback",
      reason: "Supabase 환경변수 미설정",
    };
  }

  if (targetRef === "target-yongin-cityhall") {
    const keys = fallbackObligations.map(item => item.id);
    const legal = await loadLegalSources(keys);
    return {
      items: fallbackItems(buildLegalSourceMap(legal.rows, legal.documents)),
      source: legal.error ? "fallback" : "supabase",
      reason: legal.error || "용인시청 기본 의무 10건 · ADOMS 정식 원문 연결",
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
  if (obligationIds.length === 0) return { items: [], source: "supabase" };

  const [{ data: masterData, error: masterError }, legal] = await Promise.all([
    supabase
      .from("ref_obligation")
      .select(
        "obl_id,title_ko,detail_ko,obligation_group,law_id,law_name,doc_id,unit_path,article_no,article_title,anchor_text,cycle,evidence_required,review_status,display_order,source_version"
      )
      .in("obl_id", obligationIds)
      .limit(500),
    loadLegalSources(obligationIds),
  ]);

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
      masterData as ObligationRow[],
      legal.rows,
      legal.documents
    ),
    source: "supabase",
    reason: legal.error,
  };
}
