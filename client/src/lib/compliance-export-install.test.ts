import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectFile = (relativePath: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../../${relativePath}`, import.meta.url)),
    "utf8"
  );

describe("compliance CSV export log installation", () => {
  const migration = projectFile(
    "supabase/migrations/019_compliance_export_log.sql"
  );
  const actionMigration = projectFile(
    "supabase/migrations/020_compliance_action_events.sql"
  );
  const hardenedActionMigration = projectFile(
    "supabase/migrations/021_harden_compliance_action_logging.sql"
  );
  const documentActionMigration = projectFile(
    "supabase/migrations/022_compliance_action_document_model.sql"
  );
  const categoryBackfillMigration = projectFile(
    "supabase/migrations/023_backfill_compliance_work_categories.sql"
  );
  const workOriginMigration = projectFile(
    "supabase/migrations/024_confirm_compliance_work_origin.sql"
  );
  const categorySyncMigration = projectFile(
    "supabase/migrations/025_sync_compliance_work_categories.sql"
  );
  const compatibilityMigration = projectFile(
    "supabase/migrations/026_compat_compliance_action_rpc.sql"
  );
  const actionRuntimeSeed = projectFile(
    "supabase/seed_compliance_action_runtime.sql"
  );
  const formGenerator = projectFile("scripts/build-compliance-action-forms.py");
  const evidencePage = projectFile("client/src/pages/Evidence.tsx");

  it("keeps client occurrence and database record times separate", () => {
    expect(migration).toContain("occurred_at timestamptz not null");
    expect(migration).toContain(
      "created_at timestamptz not null default now()"
    );
    expect(migration).toContain("coalesce(p_occurred_at, now())");
  });

  it("uses RLS and exposes writes only through the guarded RPC", () => {
    expect(migration).toContain(
      "alter table public.demo_compliance_export_event enable row level security"
    );
    expect(migration).not.toMatch(
      /grant\s+insert\s+on\s+public\.demo_compliance_export_event/i
    );
    expect(migration).toContain("private.demo_write_enabled()");
    expect(migration).toContain("private.demo_access_enabled()");
    expect(migration).toMatch(
      /revoke all on function public\.demo_log_compliance_export[\s\S]+from public/i
    );
  });

  it("lists migration 019 before every seed in deployment docs", () => {
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const migrationIndex = document.indexOf(
        "supabase/migrations/019_compliance_export_log.sql"
      );
      const firstSeedIndex = document.indexOf("supabase/seed.sql");
      expect(migrationIndex).toBeGreaterThan(-1);
      expect(firstSeedIndex).toBeGreaterThan(migrationIndex);
    }
  });

  it("allows an empty target correction log export to be audited", () => {
    expect(actionMigration).toContain("check (row_count between 0 and 500)");
    expect(actionMigration).toContain(
      "Export row count must be between 0 and 500"
    );
  });

  it("stores repeatable correction sequence, kind and exact evidence links", () => {
    expect(actionMigration).toContain(
      "create table if not exists public.demo_compliance_action_event"
    );
    expect(actionMigration).toContain(
      "unique (target_obligation_id, period_key, sequence_no)"
    );
    expect(actionMigration).toContain(
      "action_kind text not null check (action_kind in ('IMPLEMENT', 'CHANGE', 'URGENT'))"
    );
    expect(actionMigration).toContain(
      "create table if not exists public.demo_compliance_action_evidence"
    );
    expect(actionMigration).toContain("unique (evidence_id)");
  });

  it("keeps repeatable correction writes behind the guarded RPC", () => {
    expect(actionMigration).not.toMatch(
      /grant\s+insert\s+on\s+public\.demo_compliance_action_event/i
    );
    expect(actionMigration).toContain("private.demo_write_enabled()");
    expect(actionMigration).toContain("private.demo_access_enabled()");
    expect(actionMigration).toMatch(
      /revoke all on function public\.demo_log_compliance_action[\s\S]+from public/i
    );
  });

  it("uses an idempotency request ID and rejects already-linked evidence", () => {
    expect(hardenedActionMigration).toContain(
      "add column if not exists request_id uuid"
    );
    expect(hardenedActionMigration).toContain(
      "where dae.request_id = p_request_id"
    );
    expect(hardenedActionMigration).toContain(
      "Evidence is already linked to a correction event"
    );
    expect(hardenedActionMigration).not.toContain(
      "on conflict (evidence_id) do nothing"
    );
  });

  it("separates work category, record kind, execution period and registration metadata", () => {
    expect(documentActionMigration).toContain(
      "check (work_category in ('PLAN', 'CONTRACT', 'PRECISION_DIAGNOSIS', 'SAFETY_INSPECTION', 'OTHER'))"
    );
    expect(documentActionMigration).toContain(
      "check (action_kind in ('CHANGE', 'IMPLEMENT', 'CORRECTION'))"
    );
    expect(documentActionMigration).toContain(
      "check (action_end_date >= action_start_date)"
    );
    expect(documentActionMigration).toContain("document_form_name text");
    expect(documentActionMigration).toContain("actor_employee_no text");
    expect(documentActionMigration).toContain("actor_org_name text");
    expect(documentActionMigration).toContain("actor_display_name text");
    expect(documentActionMigration).toContain(
      "check (work_origin in ('ORIGINAL', 'DELEGATED'))"
    );
    expect(documentActionMigration).toContain("delegated_at timestamptz");
  });

  it("reclassifies legacy action forms from the canonical obligation title", () => {
    expect(categoryBackfillMigration).toContain("ro.title_ko");
    expect(categoryBackfillMigration).toContain("'PRECISION_DIAGNOSIS'");
    expect(categoryBackfillMigration).toContain("'SAFETY_INSPECTION'");
    expect(categoryBackfillMigration).toContain("양식 4 안전점검 실시·결과서");
    expect(categoryBackfillMigration).toContain(
      "where dae.actor_employee_no = 'DEMO-UNASSIGNED'"
    );
  });

  it("marks delegated work only after a post-request reassignment", () => {
    expect(workOriginMigration).toContain("e.event_type = 'REASSIGNED'");
    expect(workOriginMigration).toContain(
      "e.occurred_at >= wi.delegation_requested_at"
    );
    expect(workOriginMigration).toContain("new.work_origin := 'ORIGINAL'");
    expect(workOriginMigration).toContain("new.work_origin := 'DELEGATED'");
    expect(workOriginMigration).toContain("new.delegated_at := v_delegated_at");
  });

  it("provides five named document templates for the work categories", () => {
    for (const name of [
      "안전 및 유지관리계획서",
      "도급·용역·위탁 계약관리서",
      "정밀안전진단 실시·결과서",
      "안전점검 실시·결과서",
      "기타 조치 및 증빙자료서",
    ]) {
      expect(formGenerator).toContain(name);
    }
    expect(formGenerator).toContain(
      'OUTPUT_DIR = PROJECT_ROOT / "docs" / "compliance-action-forms"'
    );
  });

  it("backfills compliance actions after compliance-producing seeds", () => {
    expect(actionRuntimeSeed).toContain(
      "insert into public.demo_compliance_action_event"
    );
    expect(actionRuntimeSeed).toContain(
      "insert into public.demo_compliance_action_evidence"
    );
    expect(actionRuntimeSeed).toContain("work_category");
    expect(actionRuntimeSeed).toContain("action_start_date");
    expect(actionRuntimeSeed).toContain("document_form_name");
    expect(actionRuntimeSeed).toContain("actor_employee_no");
    expect(actionRuntimeSeed).not.toMatch(
      /work_origin,\s*occurred_at,\s*created_at/
    );
    expect(actionRuntimeSeed).toContain(
      "private.demo_compliance_work_category_from_title(ro.title_ko)"
    );
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const baseSeedIndex = document.indexOf("supabase/seed.sql");
      const actionSeedIndex = document.indexOf(
        "supabase/seed_compliance_action_runtime.sql"
      );
      expect(actionSeedIndex).toBeGreaterThan(baseSeedIndex);
    }
  });

  it("lists migration 020 before every seed in deployment docs", () => {
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const migrationIndex = document.indexOf(
        "supabase/migrations/020_compliance_action_events.sql"
      );
      const firstSeedIndex = document.indexOf("supabase/seed.sql");
      expect(migrationIndex).toBeGreaterThan(-1);
      expect(firstSeedIndex).toBeGreaterThan(migrationIndex);
    }
  });

  it("lists migration 021 before every seed in deployment docs", () => {
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const migrationIndex = document.indexOf(
        "supabase/migrations/021_harden_compliance_action_logging.sql"
      );
      const firstSeedIndex = document.indexOf("supabase/seed.sql");
      expect(migrationIndex).toBeGreaterThan(-1);
      expect(firstSeedIndex).toBeGreaterThan(migrationIndex);
    }
  });

  it("lists migration 022 before every seed in deployment docs", () => {
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const migrationIndex = document.indexOf(
        "supabase/migrations/022_compliance_action_document_model.sql"
      );
      const firstSeedIndex = document.indexOf("supabase/seed.sql");
      expect(migrationIndex).toBeGreaterThan(-1);
      expect(firstSeedIndex).toBeGreaterThan(migrationIndex);
    }
  });

  it("lists migration 023 before every seed in deployment docs", () => {
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const migrationIndex = document.indexOf(
        "supabase/migrations/023_backfill_compliance_work_categories.sql"
      );
      const firstSeedIndex = document.indexOf("supabase/seed.sql");
      expect(migrationIndex).toBeGreaterThan(-1);
      expect(firstSeedIndex).toBeGreaterThan(migrationIndex);
    }
  });

  it("lists migration 024 before every seed in deployment docs", () => {
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const migrationIndex = document.indexOf(
        "supabase/migrations/024_confirm_compliance_work_origin.sql"
      );
      const firstSeedIndex = document.indexOf("supabase/seed.sql");
      expect(migrationIndex).toBeGreaterThan(-1);
      expect(firstSeedIndex).toBeGreaterThan(migrationIndex);
    }
  });

  it("keeps category precedence centralized and consistent", () => {
    for (const migrationSql of [
      categoryBackfillMigration,
      categorySyncMigration,
    ]) {
      expect(migrationSql).toContain(
        "private.demo_compliance_work_category_from_title"
      );
      expect(migrationSql.indexOf("%계획%")).toBeLessThan(
        migrationSql.indexOf("%도급%")
      );
      expect(migrationSql.indexOf("%도급%")).toBeLessThan(
        migrationSql.indexOf("%정밀안전진단%")
      );
      expect(migrationSql.indexOf("%정밀안전진단%")).toBeLessThan(
        migrationSql.lastIndexOf("%점검%")
      );
    }
    for (const contractKeyword of ["계약", "도급", "용역", "위탁"]) {
      expect(evidencePage).toContain(`title.includes("${contractKeyword}")`);
    }
  });

  it("keeps legacy 020 and 021 RPC signatures during rollout", () => {
    expect(compatibilityMigration).toContain("p_request_id uuid");
    expect(compatibilityMigration).toContain("p_action_date date");
    expect(compatibilityMigration).toContain("p_actor_role text");
    expect(compatibilityMigration).toContain(
      "case p_action_kind when 'URGENT' then 'CORRECTION'"
    );
    expect(compatibilityMigration).toContain("gen_random_uuid()");
  });

  it("lists migrations 025 and 026 before every seed in deployment docs", () => {
    for (const document of [
      projectFile("README.md"),
      projectFile("docs/SUPABASE_RUNBOOK.md"),
    ]) {
      const firstSeedIndex = document.indexOf("supabase/seed.sql");
      for (const migrationName of [
        "025_sync_compliance_work_categories.sql",
        "026_compat_compliance_action_rpc.sql",
      ]) {
        const migrationIndex = document.indexOf(
          `supabase/migrations/${migrationName}`
        );
        expect(migrationIndex).toBeGreaterThan(-1);
        expect(firstSeedIndex).toBeGreaterThan(migrationIndex);
      }
    }
  });
});
