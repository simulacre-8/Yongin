import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectFile = (relativePath: string) =>
  fileURLToPath(new URL(`../../../${relativePath}`, import.meta.url));

const readProjectFile = (relativePath: string) =>
  readFileSync(projectFile(relativePath), "utf8");

describe("My Work clean-install order", () => {
  it("keeps organization-dependent rule data out of the schema migration", () => {
    const migration = readProjectFile(
      "supabase/migrations/012_demo_my_work.sql"
    );

    expect(migration).not.toContain(
      "insert into public.demo_work_assignment_rule"
    );
    expect(migration).not.toMatch(
      /select\s+private\.seed_demo_work_items\(\)/i
    );
  });

  it("runs the runtime seed after organization and facility workflow seeds", () => {
    const runtimeSeed = readProjectFile("supabase/seed_my_work_runtime.sql");
    const readme = readProjectFile("README.md");
    const workflowSeedIndex = readme.indexOf("seed_facility_workflow.sql");
    const organizationSeedIndex = readme.indexOf("seed_yongin_org.sql");
    const runtimeSeedIndex = readme.indexOf("seed_my_work_runtime.sql");

    expect(runtimeSeed).toContain(
      "insert into public.demo_work_assignment_rule"
    );
    expect(runtimeSeed).toContain("select private.seed_demo_work_items()");
    expect(workflowSeedIndex).toBeGreaterThan(-1);
    expect(organizationSeedIndex).toBeGreaterThan(workflowSeedIndex);
    expect(runtimeSeedIndex).toBeGreaterThan(organizationSeedIndex);
  });
});
