import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DailyChart } from "@/components/charts/daily-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { KpiTiles } from "@/components/dashboard/kpi-tiles";
import { TapBoard } from "@/components/dashboard/tap-board";
import { parseFilters, periodWords } from "@/lib/analytics/filters";
import { periodText } from "@/lib/analytics/page-helpers";
import { loadStoreDetail } from "@/lib/analytics/queries";
import { highestRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { londonToday } from "@/lib/dates";
import { supabaseServer } from "@/lib/supabase/server";
import { formatCount, formatDateTimeLondon } from "@/lib/utils";

export const metadata: Metadata = { title: "Store" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await supabaseServer();
  // Read as the signed-in person: a store they can't see is simply "not found".
  const { data: store } = await supabase.from("stores").select("id, name, city_id, is_active").eq("id", id).maybeSingle();
  if (!store) notFound();
  const { data: city } = await supabase.from("cities").select("name, area_id").eq("id", store.city_id).maybeSingle();
  const { data: area } = city ? await supabase.from("areas").select("name").eq("id", city.area_id).maybeSingle() : { data: null };

  const today = londonToday();
  const query = await searchParams;
  const f = parseFilters(query, today);
  const data = await loadStoreDetail(supabase, id, f);
  const canManage = highestRole(session.memberships) !== "staff";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/overview" className="inline-flex items-center gap-1 text-sm font-medium text-nfc hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> Overview
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{store.name}</h1>
          {store.is_active ? <Badge tone="nfc">Active</Badge> : <Badge tone="danger">Switched off</Badge>}
          {data.totals.demo_events > 0 ? <Badge tone="demo">Demo data</Badge> : null}
        </div>
        <p className="text-sm text-muted">
          {city?.name} · {area?.name}
        </p>
      </div>

      <TapBoard
        title={`Tap board · ${store.name}`}
        initialToday={data.today}
        initialEvents={data.recent}
        storeNames={{ [store.id]: store.name }}
        scopeStoreIds={[store.id]}
        method={f.method ?? null}
        pollQuery={new URLSearchParams({ store: store.id, ...(f.method ? { method: f.method } : {}) }).toString()}
        forcePolling={query.live === "poll"}
      />

      <FiltersBar
        range={f.range}
        from={f.from}
        to={f.to}
        method={f.method}
        today={today}
        areas={[]}
        cities={[]}
        stores={[]}
        showScope={false}
      />

      <section aria-labelledby="kpi-heading" className="space-y-2">
        <h2 id="kpi-heading" className="text-base font-semibold">
          {periodText(f)}
        </h2>
        <KpiTiles totals={data.totals} previous={data.previous} words={periodWords(f)} storesInScope={1} />
      </section>

      <Card>
        <CardTitle>Taps and scans by day</CardTitle>
        <div className="mt-3">
          <DailyChart data={data.daily} />
        </div>
      </Card>

      <Card>
        <CardTitle>When customers tap or scan</CardTitle>
        <CardDescription>Day of the week by hour of the day, in London time.</CardDescription>
        <div className="mt-3">
          <Heatmap cells={data.hourly} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Tags at this store</CardTitle>
          {canManage ? (
            <Link href={`/tags?store=${store.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Manage tags
            </Link>
          ) : null}
        </div>
        {data.tags.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No tags at this store yet" hint="Add a tag, then write its NFC address to a card." />
          </div>
        ) : (
          <Table className="mt-3">
            <caption className="sr-only">Tags at {store.name}</caption>
            <THead>
              <TR>
                <TH>Tag</TH>
                <TH>Status</TH>
                <TH className="text-right">NFC taps</TH>
                <TH className="text-right">QR scans</TH>
                <TH>Latest</TH>
                <TH>QR code</TH>
              </TR>
            </THead>
            <TBody>
              {data.tags.map((t) => (
                <TR key={t.tag_id}>
                  <TD className="font-medium">{t.label}</TD>
                  <TD>
                    {t.retired_at ? <Badge tone="danger">Retired</Badge> : t.is_active ? <Badge tone="nfc">Active</Badge> : <Badge tone="danger">Switched off</Badge>}
                  </TD>
                  <TD className="text-right tabular-nums">{formatCount(t.nfc)}</TD>
                  <TD className="text-right tabular-nums">{formatCount(t.qr)}</TD>
                  <TD className="whitespace-nowrap text-muted">{t.last_tap_at ? formatDateTimeLondon(t.last_tap_at) : "—"}</TD>
                  <TD>
                    {t.retired_at ? null : (
                      <a href={`/api/qr/${t.public_code}?format=svg&download=1`} className="inline-flex items-center gap-1 text-sm font-medium text-nfc hover:underline">
                        <Download className="size-3.5" aria-hidden="true" /> SVG
                        <span className="sr-only"> for {t.label}</span>
                      </a>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
