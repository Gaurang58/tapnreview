import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Heatmap } from "@/components/charts/heatmap";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { parseFilters, rpcArgs } from "@/lib/analytics/filters";
import { summarizeHourly } from "@/lib/analytics/insights";
import { filterQuery, periodText, restrictToScope } from "@/lib/analytics/page-helpers";
import { loadScope } from "@/lib/analytics/queries";
import { requireSession } from "@/lib/auth/session";
import { londonToday } from "@/lib/dates";
import { supabaseServer } from "@/lib/supabase/server";
import { formatCount, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

const hourRange = (h: number) => `${String(h).padStart(2, "0")}:00 to ${String((h + 1) % 24).padStart(2, "0")}:00`;

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSession();
  const today = londonToday();
  const supabase = await supabaseServer();
  const scope = await loadScope(supabase);
  const f = restrictToScope(parseFilters(await searchParams, today), scope);

  const [hourly, totals] = await Promise.all([
    supabase.rpc("analytics_hourly", rpcArgs(f)),
    supabase.rpc("analytics_totals", rpcArgs(f)),
  ]);
  if (hourly.error || totals.error) throw new Error("Could not load the insights");
  const cells = hourly.data ?? [];
  const summary = summarizeHourly(cells);
  const demo = (totals.data?.[0]?.demo_events ?? 0) > 0;
  const query = filterQuery(f);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Insights</h1>
        {demo ? <Badge tone="demo">Demo data</Badge> : null}
      </div>

      <FiltersBar
        range={f.range}
        from={f.from}
        to={f.to}
        areaId={f.areaId}
        cityId={f.cityId}
        storeId={f.storeId}
        method={f.method}
        today={today}
        areas={scope.areas}
        cities={scope.cities}
        stores={scope.stores}
      />

      <Card>
        <CardTitle>When customers tap or scan</CardTitle>
        <CardDescription>
          {periodText(f)}. Day of the week by hour of the day, in London time. These are taps and scans, which show intent to review.
        </CardDescription>
        {summary.total === 0 ? (
          <div className="mt-3">
            <EmptyState title="No taps or scans in this view" hint="Try a longer date range or widen the filters." />
          </div>
        ) : (
          <>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              <li className="panel p-3">
                <p className="text-xs text-muted">Busiest day</p>
                <p className="text-lg font-semibold">{summary.busiestDay!.day}</p>
                <p className="text-xs text-muted">{formatCount(summary.busiestDay!.total)} interactions</p>
              </li>
              <li className="panel p-3">
                <p className="text-xs text-muted">Busiest hour</p>
                <p className="text-lg font-semibold">{hourRange(summary.busiestHour!.hour)}</p>
                <p className="text-xs text-muted">{formatCount(summary.busiestHour!.total)} interactions</p>
              </li>
              <li className="panel p-3">
                <p className="text-xs text-muted">Weekend share</p>
                <p className="text-lg font-semibold">{formatPercent(summary.weekendShare ?? 0, 0)}</p>
                <p className="text-xs text-muted">on Saturday and Sunday</p>
              </li>
            </ul>
            <p className="mt-3 text-sm text-muted">
              Busiest single slots:{" "}
              {summary.topSlots.map((s) => `${s.day} ${String(s.hour).padStart(2, "0")}:00 (${formatCount(s.total)})`).join(", ")}.
            </p>
            <div className="mt-4">
              <Heatmap cells={cells} />
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardTitle>Download the figures</CardTitle>
        <CardDescription>
          CSV files that open in Excel or Numbers, for the dates and filters above. Repeat taps and link previews are not counted.
          {demo ? " Demo data is included while it is present." : ""}
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`/api/export/daily?${query}`} className={buttonVariants({ variant: "secondary" })}>
            <Download aria-hidden="true" /> Daily figures (CSV)
          </a>
          <a href={`/api/export/stores?${query}`} className={buttonVariants({ variant: "secondary" })}>
            <Download aria-hidden="true" /> Figures by store (CSV)
          </a>
        </div>
      </Card>
    </div>
  );
}
