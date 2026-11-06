import { NextResponse } from "next/server";
import { signOutTarget } from "@/lib/auth/redirects";
import { supabaseServer } from "@/lib/supabase/server";

/** Signs out, then lands on the home page ("/") or the sign-in page, as the form asked. */
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  let to: "/" | "/login" = "/login";
  try {
    to = signOutTarget((await request.formData()).get("to"));
  } catch {
    /* no form body: default to the sign-in page */
  }
  return NextResponse.redirect(new URL(to, request.url), { status: 303 });
}
