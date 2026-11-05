import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DailyPoint, HourlyCell, RecentEvent, StoreBreakdown, TagBreakdown, Totals } from "@/lib/supabase/types";
import { rpcArgs, type Filters } from "@/lib/analytics/filters";

type Client = SupabaseClient<Database>;

const EMPTY_TOTALS: Totals = { interactions: 0, nfc: 0, qr: 0, demo_events: 0, active_tags: 0, live_stores: 0 };

function check<T>(label: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data as T;
}

/** Areas, cities and stores the signed-in person may see (Row Level Security filters them). */
export async function loadScope(supabase: Client) {
  const [areas, cities, stores] = await Promise.all([
    supabase.from("areas").select("id, name").order("name"),
    supabase.from("cities").select("id, name, area_id").order("name"),
    supabase.from("stores").select("id, name, city_id, is_active").order("name"),
  ]);
  return {
    areas: check("areas", areas) ?? [],
    cities: check("cities", cities) ?? [],
    stores: check("stores", stores) ?? [],
  };
}

export type Scope = Awaited<ReturnType<typeof loadScope>>;

/** Store ids inside the chosen area / city / store filters, or null for "everything I can see". */
export function scopeStoreIds(scope: Scope, f: Pick<Filters, "areaId" | "cityId" | "storeId">): string[] | null {
  if (!f.areaId && !f.cityId && !f.storeId) return null;
  const cityArea = new Map(scope.cities.map((c) => [c.id, c.area_id]));
  return scope.stores
    .filter(
      (s) =>
        (!f.storeId || s.id === f.storeId) &&
        (!f.cityId || s.city_id === f.cityId) &&
        (!f.areaId || cityArea.get(s.city_id) === f.areaId),
    )
    .map((s) => s.id);
}

export async function loadOverview(supabase: Client, f: Filters) {
  const scopeArgs = { ...rpcArgs(f) };
  const [totals, previous, daily, byStore, recent, today] = await Promise.all([
    supabase.rpc("analytics_totals", rpcArgs(f)),
    supabase.rpc("analytics_totals", rpcArgs(f, f.prevFrom, f.prevTo)),
    supabase.rpc("analytics_daily", rpcArgs(f)),
    supabase.rpc("analytics_by_store", rpcArgs(f)),
    supabase.rpc("analytics_recent", {
      p_limit: 8,
      p_area_id: scopeArgs.p_area_id,
      p_city_id: scopeArgs.p_city_id,
      p_store_id: scopeArgs.p_store_id,
      p_method: scopeArgs.p_method,
    }),
    supabase.rpc("analytics_today", {
      p_area_id: scopeArgs.p_area_id,
      p_city_id: scopeArgs.p_city_id,
      p_store_id: scopeArgs.p_store_id,
      p_method: scopeArgs.p_method,
    }),
  ]);
  return {
    totals: check("totals", totals)?.[0] ?? EMPTY_TOTALS,
    previous: check("previous totals", previous)?.[0] ?? EMPTY_TOTALS,
    daily: (check("daily", daily) ?? []) as DailyPoint[],
    byStore: (check("by store", byStore) ?? []) as StoreBreakdown[],
    recent: (check("recent", recent) ?? []) as RecentEvent[],
    today: Number(check("today", today) ?? 0),
  };
}

export async function loadStoreDetail(supabase: Client, storeId: string, f: Filters) {
  const args = rpcArgs({ ...f, areaId: undefined, cityId: undefined, storeId });
  const prevArgs = rpcArgs({ ...f, areaId: undefined, cityId: undefined, storeId }, f.prevFrom, f.prevTo);
  const [totals, previous, daily, hourly, tags, recent, today] = await Promise.all([
    supabase.rpc("analytics_totals", args),
    supabase.rpc("analytics_totals", prevArgs),
    supabase.rpc("analytics_daily", args),
    supabase.rpc("analytics_hourly", args),
    supabase.rpc("analytics_by_tag", { p_from: f.from, p_to: f.to, p_store_id: storeId }),
    supabase.rpc("analytics_recent", { p_limit: 8, p_store_id: storeId, p_method: f.method ?? null }),
    supabase.rpc("analytics_today", { p_store_id: storeId, p_method: f.method ?? null }),
  ]);
  return {
    totals: check("totals", totals)?.[0] ?? EMPTY_TOTALS,
    previous: check("previous totals", previous)?.[0] ?? EMPTY_TOTALS,
    daily: (check("daily", daily) ?? []) as DailyPoint[],
    hourly: (check("hourly", hourly) ?? []) as HourlyCell[],
    tags: (check("tags", tags) ?? []) as TagBreakdown[],
    recent: (check("recent", recent) ?? []) as RecentEvent[],
    today: Number(check("today", today) ?? 0),
  };
}
