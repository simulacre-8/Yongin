import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required"
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("Legal-source smoke test requires a publishable key");
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const aliases = Array.from(
  { length: 10 },
  (_, index) => `OBL-${String(index + 1).padStart(2, "0")}`
);
const { data: sources, error: sourceError } = await supabase
  .from("ref_obligation_legal_source")
  .select(
    "obligation_key,source_order,source_obl_id,source_unit_id,doc_id,law_id,law_name,document_title,unit_path,source_text,effective_from,source_kind"
  )
  .in("obligation_key", aliases)
  .order("obligation_key", { ascending: true })
  .order("source_order", { ascending: true })
  .limit(30);
if (sourceError || !sources) {
  throw new Error(`Legal-source alias read failed: ${sourceError?.message}`);
}

const documentIds = Array.from(new Set(sources.map(row => row.doc_id)));
const { data: documents, error: documentError } = await supabase
  .from("ref_legal_document")
  .select(
    "doc_id,document_title,last_amended_at,effective_from,amendment_kind,official_detail_url,official_checked_at"
  )
  .in("doc_id", documentIds)
  .limit(30);
if (documentError || !documents) {
  throw new Error(`Legal-document read failed: ${documentError?.message}`);
}

const sourceKeys = new Set(sources.map(row => row.obligation_key));
const multiSource = sources.filter(row => row.obligation_key === "OBL-10");
const disasterSource = sources.find(row => row.obligation_key === "OBL-07");
const checks = {
  allTenAliases: aliases.every(alias => sourceKeys.has(alias)),
  elevenAliasRows: sources.length === 11,
  allSourceTextPresent: sources.every(row => Boolean(row.source_text)),
  allSourceUnitsPresent: sources.every(row => Boolean(row.source_unit_id)),
  allEffectiveDatesPresent: sources.every(row => Boolean(row.effective_from)),
  multiSourceObligation: multiSource.length === 2,
  disasterDirectUnit:
    disasterSource?.source_unit_id === "UNIT-0011597" &&
    disasterSource.source_obl_id === null,
  documentCoverage: documents.length === documentIds.length,
  officialDatesPresent: documents.every(
    row => Boolean(row.last_amended_at) && Boolean(row.effective_from)
  ),
  officialLinksPresent: documents.every(row =>
    Boolean(row.official_detail_url)
  ),
  snapshotDate: documents.every(
    row => row.official_checked_at === "2026-09-06"
  ),
};

console.log(
  JSON.stringify(
    {
      aliasCount: sourceKeys.size,
      aliasSourceRows: sources.length,
      documentCount: documents.length,
      disasterSource,
      multiSource,
      documents,
      checks,
    },
    null,
    2
  )
);

if (Object.values(checks).some(value => !value)) {
  throw new Error("Legal-source popup smoke test failed");
}
console.log("LEGAL_SOURCE_POPUP_SMOKE_PASSED");
