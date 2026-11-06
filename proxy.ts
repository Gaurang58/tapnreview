import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs before dashboard requests to refresh the Supabase session cookie and
 * send signed-out visitors to the login page. The customer-facing redirect
 * routes (/t and /q) are deliberately excluded by the matcher below so they
 * never pay for an auth round-trip.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims validates the JWT locally; no network call on every request.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  // The home page is public, but it also runs through here so an expired sign-in is
  // refreshed and the page can show who is signed in.
  const isAuthPage = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/set-password");

  if (!signedIn && !isAuthPage) {
    // Keep the filters in the address (?range=7d&area=...) so a shared or bookmarked view
    // survives signing in.
    const url = request.nextUrl.clone();
    const next = pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
  // A signed-in person who opens /login is NOT redirected: the page tells them who they
  // are signed in as and lets them continue or switch account.
  return response;
}

export const config = {
  matcher: [
    "/",
    "/overview/:path*",
    "/stores/:path*",
    "/tags/:path*",
    "/structure/:path*",
    "/people/:path*",
    "/insights/:path*",
    "/audit/:path*",
    "/api/live/:path*",
    "/api/qr/:path*",
    "/api/export/:path*",
    "/login",
    "/set-password",
  ],
};
