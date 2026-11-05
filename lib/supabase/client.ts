"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/** Browser client using the publishable key; RLS applies to everything it does. */
export function supabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
