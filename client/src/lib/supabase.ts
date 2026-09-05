import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export async function checkSupabaseConnection() {
  if (!supabaseUrl || !publishableKey)
    return { connected: false, reason: "환경변수 미설정" };

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    });
    if (!authResponse.ok)
      return {
        connected: false,
        reason: `API 연결 실패 (${authResponse.status})`,
      };

    const databaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/ref_law?select=law_id&limit=1`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
        },
      }
    );
    return databaseResponse.ok
      ? { connected: true, reason: "Supabase DB 준비됨" }
      : { connected: false, reason: "DB 마이그레이션 대기" };
  } catch {
    return { connected: false, reason: "네트워크 연결 실패" };
  }
}
