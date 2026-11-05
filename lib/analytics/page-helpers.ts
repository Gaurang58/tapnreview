import type { Filters } from "@/lib/analytics/filters";
import type { Scope } from "@/lib/analytics/queries";
import { formatDateLondon } from "@/lib/utils";

/** Drop filter ids this person can't see, so a hand-edited URL can't pretend otherwise. */
export function restrictToScope(f: Filters, scope: Scope): Filters {
  const areaOk = f.areaId && scope.areas.some((a) => a.id === f.areaId);
  const cityOk = f.cityId && scope.cities.some((c) => c.id === f.cityId);
  const storeOk = f.storeId && scope.stores.some((s) => s.id === f.storeId);
  return { ...f, areaId: areaOk ? f.areaId : undefined, cityId: cityOk ? f.cityId : undefined, storeId: storeOk ? f.storeId : undefined };
}

/** "12 Aug to 9 Nov 2026", or just "9 Nov 2026" for a single day. */
export function periodText(f: Pick<Filters, "from" | "to">): string {
  const d = (day: string, withYear: boolean) =>
    formatDateLondon(new Date(`${day}T12:00:00Z`), { weekday: undefined, day: "numeric", month: "short", year: withYear ? "numeric" : undefined });
  return f.from === f.to ? d(f.to, true) : `${d(f.from, false)} to ${d(f.to, true)}`;
}

/** The part of the query string worth carrying to a store page: dates and method. */
export function carryQuery(f: Filters): string {
  const p = new URLSearchParams();
  p.set("range", f.range);
  if (f.range === "custom") {
    p.set("from", f.from);
    p.set("to", f.to);
  }
  if (f.method) p.set("method", f.method);
  return p.toString();
}

/** Scope-only query string for the live polling endpoint. */
export function scopeQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.areaId) p.set("area", f.areaId);
  if (f.cityId) p.set("city", f.cityId);
  if (f.storeId) p.set("store", f.storeId);
  if (f.method) p.set("method", f.method);
  return p.toString();
}
