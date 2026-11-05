import { addDays } from "@/lib/dates";

/**
 * Dashboard filters live in the URL so a view can be shared or bookmarked.
 * Everything here is pure: it turns query-string values into a validated Filters
 * object and works out the "previous period" used for the change figures.
 */
export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";
export type Method = "nfc" | "qr";

export type Filters = {
  range: RangeKey;
  from: string; // London calendar date, inclusive
  to: string;
  prevFrom: string; // the equally long period immediately before
  prevTo: string;
  days: number;
  areaId?: string;
  cityId?: string;
  storeId?: string;
  method?: Method;
};

export const RANGE_LABELS: Record<Exclude<RangeKey, "custom">, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export const DEFAULT_RANGE: RangeKey = "90d";
const MAX_CUSTOM_DAYS = 366;

export function parseFilters(params: Params, today: string): Filters {
  const rawRange = first(params.range);
  let range: RangeKey = (["today", "7d", "30d", "90d", "custom"] as const).find((r) => r === rawRange) ?? DEFAULT_RANGE;

  let from = today;
  let to = today;
  if (range === "custom") {
    const f = first(params.from) ?? "";
    const t = first(params.to) ?? "";
    if (isRealDate(f) && isRealDate(t) && f <= t && t <= today && daysBetween(f, t) <= MAX_CUSTOM_DAYS) {
      from = f;
      to = t;
    } else {
      range = DEFAULT_RANGE; // a bad or hand-edited custom range falls back safely
    }
  }
  if (range !== "custom") {
    const span = { today: 1, "7d": 7, "30d": 30, "90d": 90 }[range];
    from = addDays(today, -(span - 1));
    to = today;
  }

  const days = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));

  const id = (key: string) => {
    const v = first(params[key]);
    return v && UUID.test(v) ? v : undefined;
  };
  const m = first(params.method);
  return {
    range,
    from,
    to,
    prevFrom,
    prevTo,
    days,
    areaId: id("area"),
    cityId: id("city"),
    storeId: id("store"),
    method: m === "nfc" || m === "qr" ? m : undefined,
  };
}

/** Plain-English name of the period, for "vs previous …" captions. */
export function periodWords(f: Pick<Filters, "range" | "days">): string {
  if (f.range === "today") return "yesterday";
  return `the previous ${f.days} days`;
}

/** Arguments shared by every analytics function. */
export function rpcArgs(f: Filters, from = f.from, to = f.to) {
  return {
    p_from: from,
    p_to: to,
    p_area_id: f.areaId ?? null,
    p_city_id: f.cityId ?? null,
    p_store_id: f.storeId ?? null,
    p_method: f.method ?? null,
  };
}
