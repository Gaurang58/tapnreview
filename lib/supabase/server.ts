import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { publicEnv } from "@/lib/env";

/**
 * Per-request client that carries the signed-in user's session from cookies.
 * Everything it reads is filtered by Row Level Security for that user.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The
          // proxy (proxy.ts) refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
