import { obligations as fallbackObligations } from "@/lib/demo-data";
import {
  formatLegalArticlePath,
  formatObligationFrequency,
} from "@/lib/facility-obligation-api";
import { supabase } from "@/lib/supabase";

const SAPA_LAW_NAME = "중대재해처벌법";
const YONGIN_SOURCE_VERSION = "yongin-obligation-pool-20260906";
const OBLIGATION_COLUMNS =
  "obl_id,title_ko,detail_ko,law_name,article_no,article_title,unit_path,obligation_group,nature,cycle,evidence_required,display_order,source_version";

export const CITIZEN_FACILITY_OBLIGATION_IDS = [
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

export const CITIZEN_PRODUCT_OBLIGATION_IDS = [
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

export type HomeObligationView =
  | "all"
  | "safety-system"
  | "recurrence"
  | "corrective-order"
  | "related-law"
  | "industrial"
  | "citizen-facility"
  | "citizen-product";

type ObligationRow = {
  obl_id: string;
  title_ko: string;
  detail_ko: string | null;
  law_name: string | null;
  article_no: string | null;
  article_title: string | null;
  unit_path: string | null;
  obligation_group: string;
  nature: string | null;
  cycle: string | null;
  evidence_required: boolean;
  display_order: number;
  source_version: string;
};

export type HomeObligationItem = {
  id: string;
  title: string;
  detail: string;
  lawName: string;
  article: string;
  articleTitle: string;
  nature: string;
  frequency: string;
  evidenceRequired: boolean;
  sourceVersion: string;
};

export type HomeNavigationData = {
  total: number;
  categories: {
    safetySystem: number;
    recurrence: number;
    correctiveOrder: number;
    relatedLaw: number;
  };
  accidentTypes: {
    industrial: number;
    citizen: number;
    citizenFacility: number;
    citizenProduct: number;
  };
  industrialSubtypes: HomeObligationItem[];
  source: "supabase" | "fallback";
  reason?: string;
};

export type HomeObligationResult = {
  items: HomeObligationItem[];
  totalCount: number;
  source: "supabase" | "fallback";
  reason?: string;
};

export const RELATED_LAW_OPTIONS = [
  "산업안전보건법",
  "시설물안전법",
  "철도안전법",
  "도로법",
  "수도법",
  "하천법",
  "하수도법",
  "급경사지 재해예방법",
  "저수지·댐 안전관리법",
  "미지정",
] as const;

const FALLBACK_NAVIGATION: HomeNavigationData = {
  total: 3688,
  categories: {
    safetySystem: 24,
    recurrence: 3,
    correctiveOrder: 3,
    relatedLaw: 3658,
  },
  accidentTypes: {
    industrial: 14,
    citizen: 22,
    citizenFacility: 13,
    citizenProduct: 9,
  },
  industrialSubtypes: [],
  source: "fallback",
  reason: "Supabase 홈 집계 조회 전 기준 수량",
};

export function classifyHomeCategory(
  row: Pick<ObligationRow, "law_name" | "obligation_group" | "title_ko">
): "safety-system" | "recurrence" | "corrective-order" | "related-law" {
  if (row.law_name !== SAPA_LAW_NAME) return "related-law";
  if (row.obligation_group === "MG11") return "recurrence";
  if (row.obligation_group === "MG05") return "corrective-order";
  if (
    row.title_ko === "관계법령 의무이행" ||
    row.title_ko === "관계법령 교육이수"
  ) {
    return "related-law";
  }
  return "safety-system";
}

function toHomeItem(row: ObligationRow): HomeObligationItem {
  return {
    id: row.obl_id,
    title: row.title_ko,
    detail:
      row.detail_ko?.trim() || row.article_title?.trim() || "의무 상세 확인",
    lawName: row.law_name?.trim() || "법령 미지정",
    article: formatLegalArticlePath(row.unit_path, row.article_no),
    articleTitle: row.article_title?.trim() || "",
    nature: row.nature?.trim() || "성격 미지정",
    frequency: formatObligationFrequency(row.cycle),
    evidenceRequired: row.evidence_required,
    sourceVersion: row.source_version,
  };
}

function matchesSearch(row: ObligationRow, search: string) {
  const keyword = search.trim().toLocaleLowerCase("ko");
  if (!keyword) return true;
  return [
    row.obl_id,
    row.title_ko,
    row.detail_ko,
    row.law_name,
    row.article_title,
  ].some(value =>
    String(value || "")
      .toLocaleLowerCase("ko")
      .includes(keyword)
  );
}

function searchExpression(search: string) {
  const keyword = search
    .replace(/[%_,().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!keyword) return "";
  return `title_ko.ilike.%${keyword}%,detail_ko.ilike.%${keyword}%,law_name.ilike.%${keyword}%,article_title.ilike.%${keyword}%`;
}

function fallbackItems(view: HomeObligationView): HomeObligationItem[] {
  return fallbackObligations
    .filter(item => {
      if (view === "recurrence") return item.id === "OBL-08";
      if (view === "corrective-order") return item.id === "OBL-09";
      if (view === "related-law") return item.id === "OBL-10";
      return true;
    })
    .map(item => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      lawName: item.lawName,
      article: item.article,
      articleTitle: item.title,
      nature: item.group,
      frequency: item.scheduleType === "half" ? "반기 1회" : "정기",
      evidenceRequired: true,
      sourceVersion: "LOCAL_DEMO",
    }));
}

async function countRows(configure: (query: any) => any) {
  if (!supabase) return 0;
  const base = supabase
    .from("ref_obligation")
    .select("obl_id", {
      count: "exact",
      head: true,
    })
    .eq("source_version", YONGIN_SOURCE_VERSION);
  const { count, error } = await configure(base);
  if (error) throw error;
  return count || 0;
}

async function fetchHomeNavigation(): Promise<HomeNavigationData> {
  if (!supabase) return FALLBACK_NAVIGATION;

  try {
    const [
      total,
      sapaTotal,
      recurrence,
      correctiveOrder,
      directRelatedLaw,
      industrial,
      citizenFacility,
      citizenProduct,
      industrialRows,
    ] = await Promise.all([
      countRows(query => query),
      countRows(query => query.eq("law_name", SAPA_LAW_NAME)),
      countRows(query =>
        query.eq("law_name", SAPA_LAW_NAME).eq("obligation_group", "MG11")
      ),
      countRows(query =>
        query.eq("law_name", SAPA_LAW_NAME).eq("obligation_group", "MG05")
      ),
      countRows(query =>
        query
          .eq("law_name", SAPA_LAW_NAME)
          .in("title_ko", ["관계법령 의무이행", "관계법령 교육이수"])
      ),
      countRows(query =>
        query.eq("law_name", SAPA_LAW_NAME).in("article_no", ["4", "5"])
      ),
      countRows(query => query.in("obl_id", CITIZEN_FACILITY_OBLIGATION_IDS)),
      countRows(query => query.in("obl_id", CITIZEN_PRODUCT_OBLIGATION_IDS)),
      supabase
        .from("ref_obligation")
        .select(OBLIGATION_COLUMNS)
        .eq("source_version", YONGIN_SOURCE_VERSION)
        .eq("law_name", SAPA_LAW_NAME)
        .in("article_no", ["4", "5"])
        .order("display_order", { ascending: true })
        .limit(30),
    ]);

    if (industrialRows.error) throw industrialRows.error;

    return {
      total,
      categories: {
        safetySystem:
          sapaTotal - recurrence - correctiveOrder - directRelatedLaw,
        recurrence,
        correctiveOrder,
        relatedLaw: total - sapaTotal + directRelatedLaw,
      },
      accidentTypes: {
        industrial,
        citizen: citizenFacility + citizenProduct,
        citizenFacility,
        citizenProduct,
      },
      industrialSubtypes: (industrialRows.data as ObligationRow[]).map(
        toHomeItem
      ),
      source: "supabase",
    };
  } catch (error) {
    return {
      ...FALLBACK_NAVIGATION,
      reason: error instanceof Error ? error.message : "홈 의무 집계 조회 실패",
    };
  }
}

let homeNavigationPromise: Promise<HomeNavigationData> | null = null;

export function loadHomeNavigation(): Promise<HomeNavigationData> {
  homeNavigationPromise ||= fetchHomeNavigation();
  return homeNavigationPromise;
}

async function loadSmallSapaSet(
  view: HomeObligationView,
  search: string,
  detailId?: string
): Promise<HomeObligationResult> {
  if (!supabase) {
    const items = fallbackItems(view);
    return {
      items,
      totalCount: items.length,
      source: "fallback",
      reason: "Supabase 환경변수 미설정",
    };
  }

  let query = supabase
    .from("ref_obligation")
    .select(OBLIGATION_COLUMNS)
    .eq("source_version", YONGIN_SOURCE_VERSION)
    .eq("law_name", SAPA_LAW_NAME)
    .order("display_order", { ascending: true })
    .limit(200);

  if (view === "recurrence") query = query.eq("obligation_group", "MG11");
  if (view === "corrective-order") query = query.eq("obligation_group", "MG05");
  if (view === "industrial") query = query.in("article_no", ["4", "5"]);
  if (view === "citizen-facility")
    query = query.in("obl_id", CITIZEN_FACILITY_OBLIGATION_IDS);
  if (view === "citizen-product")
    query = query.in("obl_id", CITIZEN_PRODUCT_OBLIGATION_IDS);
  if (detailId) query = query.eq("obl_id", detailId);

  const { data, error } = await query;
  if (error || !data) {
    return {
      items: [],
      totalCount: 0,
      source: "fallback",
      reason: error?.message || "중처법 의무 조회 실패",
    };
  }

  let rows = data as ObligationRow[];
  if (view === "safety-system")
    rows = rows.filter(row => classifyHomeCategory(row) === "safety-system");
  rows = rows.filter(row => matchesSearch(row, search));

  return {
    items: rows.map(toHomeItem),
    totalCount: rows.length,
    source: "supabase",
  };
}

async function loadRelatedLawSet(
  search: string,
  lawName: string
): Promise<HomeObligationResult> {
  if (!supabase) {
    const items = fallbackItems("related-law");
    return {
      items,
      totalCount: items.length,
      source: "fallback",
      reason: "Supabase 환경변수 미설정",
    };
  }

  const expression = searchExpression(search);
  let relatedQuery = supabase
    .from("ref_obligation")
    .select(OBLIGATION_COLUMNS, { count: "exact" })
    .eq("source_version", YONGIN_SOURCE_VERSION)
    .order("law_name", { ascending: true, nullsFirst: false })
    .order("display_order", { ascending: true })
    .limit(80);

  if (lawName === "미지정") {
    relatedQuery = relatedQuery.is("law_name", null);
  } else if (lawName) {
    relatedQuery = relatedQuery.eq("law_name", lawName);
  } else {
    relatedQuery = relatedQuery.or(
      `law_name.is.null,law_name.neq.${SAPA_LAW_NAME}`
    );
  }
  if (expression) relatedQuery = relatedQuery.or(expression);

  const directQueryBase = supabase
    .from("ref_obligation")
    .select(OBLIGATION_COLUMNS, { count: "exact" })
    .eq("source_version", YONGIN_SOURCE_VERSION)
    .eq("law_name", SAPA_LAW_NAME)
    .in("title_ko", ["관계법령 의무이행", "관계법령 교육이수"])
    .order("display_order", { ascending: true })
    .limit(20);
  const directQuery = expression
    ? directQueryBase.or(expression)
    : directQueryBase;

  const [relatedResult, directResult] = await Promise.all([
    relatedQuery,
    lawName
      ? Promise.resolve({ data: [], count: 0, error: null })
      : directQuery,
  ]);

  if (relatedResult.error || directResult.error) {
    return {
      items: [],
      totalCount: 0,
      source: "fallback",
      reason:
        relatedResult.error?.message ||
        directResult.error?.message ||
        "관계법령 의무 조회 실패",
    };
  }

  const rows = [
    ...((directResult.data || []) as ObligationRow[]),
    ...((relatedResult.data || []) as ObligationRow[]),
  ];

  return {
    items: rows.slice(0, 80).map(toHomeItem),
    totalCount: (relatedResult.count || 0) + (directResult.count || 0),
    source: "supabase",
  };
}

export async function loadHomeObligations(options: {
  view: HomeObligationView;
  search?: string;
  lawName?: string;
  detailId?: string;
}): Promise<HomeObligationResult> {
  const search = options.search?.trim() || "";
  if (options.view === "related-law") {
    return loadRelatedLawSet(search, options.lawName || "");
  }
  if (options.view !== "all") {
    return loadSmallSapaSet(options.view, search, options.detailId);
  }

  if (!supabase) {
    const items = fallbackItems("all");
    return {
      items,
      totalCount: items.length,
      source: "fallback",
      reason: "Supabase 환경변수 미설정",
    };
  }

  const expression = searchExpression(search);
  let query = supabase
    .from("ref_obligation")
    .select(OBLIGATION_COLUMNS, { count: "exact" })
    .eq("source_version", YONGIN_SOURCE_VERSION)
    .order("law_name", { ascending: true, nullsFirst: false })
    .order("display_order", { ascending: true })
    .limit(80);
  if (expression) query = query.or(expression);

  const { data, count, error } = await query;
  if (error || !data) {
    return {
      items: [],
      totalCount: 0,
      source: "fallback",
      reason: error?.message || "전체 의무 조회 실패",
    };
  }

  return {
    items: (data as ObligationRow[]).map(toHomeItem),
    totalCount: count || 0,
    source: "supabase",
  };
}
