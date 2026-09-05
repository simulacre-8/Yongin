import { describe, expect, it } from "vitest";

describe("Supabase public credentials", () => {
  it("can reach the project auth settings endpoint", async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(url).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
    expect(publishableKey).toMatch(/^sb_publishable_/);

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toHaveProperty("disable_signup");
  });

  it("does not expose a service-role credential through Vite", () => {
    expect(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(import.meta.env.VITE_SUPABASE_SECRET_KEY).toBeUndefined();
    expect(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).toMatch(
      /^sb_publishable_/
    );
  });

  it("does not expose security-definer helpers through public RPC", async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    for (const functionName of [
      "demo_write_enabled",
      "demo_access_enabled",
      "capture_demo_audit_event",
    ]) {
      const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
        method: "POST",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      expect([401, 403, 404]).toContain(response.status);
    }
  });
});
