import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/types";

loadEnv({ path: ".env.local" });
loadEnv();

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export { newPublicCode } from "../../lib/codes";

export function reviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function must<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  }
  return result.data as NonNullable<T>;
}
