import "server-only";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TapMethod } from "@/lib/supabase/types";
import { isBotUserAgent } from "./bots";
import { clientIp, visitorHash } from "./hash";
import { isAllowedReviewUrl } from "./url";

const DUPLICATE_WINDOW_MINUTES = 30;

/**
 * The only code path a customer ever touches.
 *
 * 1. Look up the tag and its store (one query) with the service-role client (customers are
 *    not signed in, and RLS would otherwise hide everything).
 * 2. If anything is missing or switched off, show the friendly page.
 * 3. Otherwise 302 to Google immediately with Cache-Control: no-store.
 * 4. Record the tap *after* the response has gone, so logging can never slow
 *    the customer down.
 */
export async function handleTap(request: Request, code: string, method: TapMethod): Promise<Response> {
  const inactive = () =>
    NextResponse.redirect(new URL("/inactive", request.url), {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });

  if (!/^[A-Za-z0-9_-]{8,64}$/.test(code)) return inactive();

  const db = supabaseAdmin();
  // One round trip: the tag and its store together.
  const { data: tag, error } = await db
    .from("tags")
    .select("id, is_active, retired_at, store_id, stores(id, is_active, google_review_url)")
    .eq("public_code", code)
    .maybeSingle();

  if (error) {
    console.error("tag lookup failed", { code, error: error.message });
    return inactive();
  }
  if (!tag || !tag.is_active || tag.retired_at) return inactive();

  const store = Array.isArray(tag.stores) ? tag.stores[0] : tag.stores;
  if (!store || !store.is_active || !isAllowedReviewUrl(store.google_review_url)) return inactive();

  const response = NextResponse.redirect(store.google_review_url, {
    status: 302,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });

  const userAgent = request.headers.get("user-agent") ?? "";
  const ip = clientIp(request.headers);
  const salt = process.env.VISITOR_HASH_SALT ?? "tap-review";
  const hash = visitorHash(ip, userAgent, salt);
  const isBot = isBotUserAgent(userAgent);
  const now = new Date();

  after(async () => {
    try {
      const since = new Date(now.getTime() - DUPLICATE_WINDOW_MINUTES * 60_000).toISOString();
      const { count } = await db
        .from("tap_events")
        .select("id", { count: "exact", head: true })
        .eq("tag_id", tag.id)
        .eq("visitor_hash", hash)
        .gte("occurred_at", since);

      const { error: insertError } = await db.from("tap_events").insert({
        tag_id: tag.id,
        store_id: tag.store_id,
        method,
        occurred_at: now.toISOString(),
        visitor_hash: hash,
        is_duplicate: (count ?? 0) > 0,
        is_bot: isBot,
        is_demo: false,
      });
      if (insertError) console.error("tap insert failed", insertError.message);
    } catch (err) {
      console.error("tap logging failed", err);
    }
  });

  return response;
}
