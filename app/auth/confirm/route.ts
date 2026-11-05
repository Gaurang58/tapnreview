import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

const ALLOWED: EmailOtpType[] = ["invite", "recovery", "email"];

/**
 * Invitation (and password reset) links land here with a one-time token.
 * We swap it for a session, then ask the person to choose a password.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && ALLOWED.includes(type)) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/set-password", url));
  }
  const failed = new URL("/login", url);
  failed.searchParams.set("error", "link");
  return NextResponse.redirect(failed);
}
