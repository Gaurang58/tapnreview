import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { parseFilters, rpcArgs } from "@/lib/analytics/filters";
import { nfcShare } from "@/lib/analytics/aggregate";
import { londonToday } from "@/lib/dates";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * CSV downloads of the Insights figures: /api/export/daily and /api/export/stores, with
 * the same filters as the page. Read as the signed-in person, so Row Level Security
 * decides what is in the file. Counts exclude repeats and bots, like the dashboard.
 */
export async function GET(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (kind !== "daily" && kind !== "stores") return new NextResponse("Not found", { status: 404 });

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("Sign in required", { status: 401 });

  const f = parseFilters(Object.fromEntries(new URL(request.url).searchParams), londonToday());
  let csv: string;

  if (kind === "daily") {
    const { data, error } = await supabase.rpc("analytics_daily", rpcArgs(f));
    if (error) return new NextResponse("Could not build the file", { status: 500 });
    csv = toCsv(["date", "nfc_taps", "qr_scans", "total_interactions"], (data ?? []).map((d) => [d.day, d.nfc, d.qr, d.total]));
  } else {
    const { data, error } = await supabase.rpc("analytics_by_store", rpcArgs(f));
    if (error) return new NextResponse("Could not build the file", { status: 500 });
    csv = toCsv(
      ["area", "city", "store", "nfc_taps", "qr_scans", "total_interactions", "nfc_share_percent", "active_tags", "latest_interaction_london"],
      (data ?? []).map((s) => {
        const share = nfcShare(s.nfc, s.total);
        return [
          s.area_name,
          s.city_name,
          s.store_name,
          s.nfc,
          s.qr,
          s.total,
          share === null ? null : share.toFixed(1),
          s.active_tags,
          s.last_tap_at ? new Date(s.last_tap_at).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "short", timeStyle: "short" }) : null,
        ];
      }),
    );
  }

  const name = `tap-review-${kind}-${f.from}_to_${f.to}.csv`;
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
