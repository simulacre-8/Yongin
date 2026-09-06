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
});
