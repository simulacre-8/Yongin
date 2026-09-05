import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export async function checkSupabaseConnection() {
  if (!supabaseUrl || !publishableKey) return { connected: false, reason: "환경변수 미설정" };

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    });
    return response.ok
      ? { connected: true, reason: "Supabase 연결됨" }
      : { connected: false, reason: `연결 실패 (${response.status})` };
  } catch {
    return { connected: false, reason: "네트워크 연결 실패" };
  }
}
