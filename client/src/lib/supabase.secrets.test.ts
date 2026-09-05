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
});
