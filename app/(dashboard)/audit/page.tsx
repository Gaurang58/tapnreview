import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CATEGORY_ENTITY, CATEGORY_LABELS, categoryOf, describeAudit, type AuditRow, type Category } from "@/lib/audit/describe";
import { highestRole, isAdmin } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { addDays, londonStartOfDay, londonToday } from "@/lib/dates";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTimeLondon } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 25;
const RANGES = { "7d": 7, "30d": 30, "90d": 90, all: 0 } as const;
type RangeKey = keyof typeof RANGES;
const RANGE_LABELS: Record<RangeKey, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const top = highestRole(session.memberships);
  if (top !== "admin" && top !== "area_manager") notFound();

  const sp = await searchParams;
  const category = (Object.keys(CATEGORY_ENTITY) as Category[]).find((c) => c === first(sp.category));
  const range: RangeKey = (Object.keys(RANGES) as RangeKey[]).find((r) => r === first(sp.range)) ?? "90d";
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);

  // Read as the signed-in person: admins get everything, area managers only changes in their areas.
  const supabase = await supabaseServer();
  let query = supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, actor_id, occurred_at, details", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (category) query = query.eq("entity", CATEGORY_ENTITY[category]);
  if (RANGES[range] > 0) query = query.gte("occurred_at", londonStartOfDay(addDays(londonToday(), -(RANGES[range] - 1))).toISOString());

  const { data, count, error } = await query;
  if (error) throw new Error("Could not load the audit log");
  const rows = (data ?? []) as AuditRow[];

  // Names for people and stores mentioned in these rows (anything outside your view stays unnamed).
  const personIds = [...new Set(rows.flatMap((r) => [r.actor_id, r.action.startsWith("user.") && r.action !== "user.invited" ? r.entity_id : null]).filter((v): v is string => Boolean(v)))];
  const [{ data: people }, { data: stores }] = await Promise.all([
    personIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", personIds) : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
    supabase.from("stores").select("id, name"),
  ]);
  const personName = new Map((people ?? []).map((p) => [p.user_id, p.full_name]));
  const names = { stores: new Map((stores ?? []).map((s) => [s.id, s.name])), people: personName };

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    q.set("range", range);
    if (p > 1) q.set("page", String(p));
    return `/audit?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-muted">
          Who changed what, and when. {isAdmin(session.memberships) ? "You can see every change." : "You can see changes in your areas."} Taps and scans are not listed here.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filter the audit log">
        <Field label="What changed" htmlFor="category">
          <Select id="category" name="category" defaultValue={category ?? ""} className="w-48">
            <option value="">Everything</option>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="When" htmlFor="range">
          <Select id="range" name="range" defaultValue={range} className="w-48">
            {(Object.keys(RANGES) as RangeKey[]).map((r) => (
              <option key={r} value={r}>
                {RANGE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          Apply
        </button>
      </form>

      <Card>
        <CardDescription>
          {total === 0 ? "No changes match." : `${total} change${total === 1 ? "" : "s"}, newest first. Page ${page} of ${pages}.`}
        </CardDescription>
        {rows.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nothing to show" hint="Try a longer period or a different type of change." />
          </div>
        ) : (
          <Table className="mt-3">
            <caption className="sr-only">Changes made in Tap Review</caption>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Who</TH>
                <TH>What happened</TH>
                <TH>Type</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const cat = categoryOf(r.entity);
                return (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap text-muted">{formatDateTimeLondon(r.occurred_at)}</TD>
                    <TD className="whitespace-nowrap">{r.actor_id ? (personName.get(r.actor_id) ?? "Another user") : "System"}</TD>
                    <TD>{describeAudit(r, names)}</TD>
                    <TD>{cat ? <Badge>{CATEGORY_LABELS[cat]}</Badge> : null}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
            {page > 1 ? (
              <Link href={link(page - 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Newer
              </Link>
            ) : (
              <span />
            )}
            {page < pages ? (
              <Link href={link(page + 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Older
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Card>
    </div>
  );
}
