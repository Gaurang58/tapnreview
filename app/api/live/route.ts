import { NextResponse } from "next/server";
import { parseFilters } from "@/lib/analytics/filters";
import { londonToday } from "@/lib/dates";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Polling fallback for the tap board, used when Realtime is unavailable.
 * Returns today's count and the latest counted taps, for the same scope filters
 * as the page. Read as the signed-in person, so Row Level Security still applies.
 */
export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const f = parseFilters(params, londonToday());
  const scope = { p_area_id: f.areaId ?? null, p_city_id: f.cityId ?? null, p_store_id: f.storeId ?? null, p_method: f.method ?? null };

  const [recent, today] = await Promise.all([
    supabase.rpc("analytics_recent", { p_limit: 8, ...scope }),
    supabase.rpc("analytics_today", scope),
  ]);
  if (recent.error || today.error) return NextResponse.json({ error: "Could not load" }, { status: 500 });
  return NextResponse.json({ recent: recent.data, today: Number(today.data ?? 0) }, { headers: { "Cache-Control": "no-store" } });
}
