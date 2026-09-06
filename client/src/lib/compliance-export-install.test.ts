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
  const actionRuntimeSeed = projectFile(
    "supabase/seed_compliance_action_runtime.sql"
  );

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

  it("backfills compliance actions after compliance-producing seeds", () => {
    expect(actionRuntimeSeed).toContain(
      "insert into public.demo_compliance_action_event"
    );
    expect(actionRuntimeSeed).toContain(
      "insert into public.demo_compliance_action_evidence"
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
});
