import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DailyChart } from "@/components/charts/daily-chart";
import { ComparisonTable } from "@/components/dashboard/comparison-table";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { KpiTiles } from "@/components/dashboard/kpi-tiles";
import { TapBoard } from "@/components/dashboard/tap-board";
import { parseFilters, periodWords } from "@/lib/analytics/filters";
import { carryQuery, periodText, restrictToScope, scopeQuery } from "@/lib/analytics/page-helpers";
import { loadOverview, loadScope, scopeStoreIds } from "@/lib/analytics/queries";
import { requireSession } from "@/lib/auth/session";
import { londonToday } from "@/lib/dates";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSession();
  const today = londonToday();
  const supabase = await supabaseServer();
  const scope = await loadScope(supabase);
  const params = await searchParams;
  const f = restrictToScope(parseFilters(params, today), scope);
  const data = await loadOverview(supabase, f);

  const inScope = scopeStoreIds(scope, f);
  const storesInScope = scope.stores.filter((s) => s.is_active && (!inScope || inScope.includes(s.id))).length;
  const storeNames = Object.fromEntries(scope.stores.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Overview</h1>
        {data.totals.demo_events > 0 ? <Badge tone="demo">Demo data</Badge> : null}
      </div>

      <TapBoard
        initialToday={data.today}
        initialEvents={data.recent}
        storeNames={storeNames}
        scopeStoreIds={inScope}
        method={f.method ?? null}
        pollQuery={scopeQuery(f)}
        forcePolling={params.live === "poll"}
      />

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

      <section aria-labelledby="kpi-heading" className="space-y-2">
        <h2 id="kpi-heading" className="text-base font-semibold">
          {periodText(f)}
        </h2>
        <p className="text-sm text-muted">
          Taps and scans show customers heading to Google to review. They measure intent, not completed reviews.
        </p>
        <KpiTiles totals={data.totals} previous={data.previous} words={periodWords(f)} storesInScope={storesInScope} />
      </section>

      <Card>
        <CardTitle>Taps and scans by day</CardTitle>
        <CardDescription>NFC taps (solid green) and QR scans (dashed amber), by London calendar day.</CardDescription>
        <div className="mt-3">
          <DailyChart data={data.daily} />
        </div>
      </Card>

      <Card>
        <CardTitle>Where customers engage</CardTitle>
        <CardDescription>Compare areas, cities and stores. City and area figures are added up from their stores.</CardDescription>
        <div className="mt-3">
          <ComparisonTable rows={data.byStore} query={carryQuery(f)} />
        </div>
      </Card>
    </div>
  );
}
