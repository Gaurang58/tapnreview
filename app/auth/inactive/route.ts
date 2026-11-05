import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Landing point for anyone whose session is no longer usable (deactivated,
 * deleted, or holding no role). Signing out here clears the cookie, which a
 * page cannot do, and so avoids a redirect loop with the proxy.
 */
export async function GET(request: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  const reason = new URL(request.url).searchParams.get("reason");
  const target = new URL("/login", request.url);
  target.searchParams.set("error", reason === "no-access" ? "no-access" : "inactive");
  return NextResponse.redirect(target);
}
