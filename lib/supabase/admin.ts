import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { publicEnv } from "@/lib/env";

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role client. Bypasses Row Level Security, so it is only used where
 * the database must be written on a customer's or an administrator's behalf:
 * the redirect routes (tap_events) and the invite / role server actions.
 * The `server-only` import makes the build fail if this ever reaches the browser.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing environment variable SUPABASE_SECRET_KEY.");
  cached = createClient<Database>(publicEnv.supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
