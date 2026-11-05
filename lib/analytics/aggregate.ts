import type { StoreBreakdown } from "@/lib/supabase/types";

/**
 * City and area figures are always added up from their stores when asked, never
 * stored, so they cannot drift from the store figures.
 */
export type Level = "store" | "city" | "area";

export type RollupRow = {
  key: string;
  name: string;
  /** For a store: its city and area. For a city: its area. */
  city?: string;
  area?: string;
  nfc: number;
  qr: number;
  total: number;
  /** NFC taps as a share of all interactions, 0 to 100; null when there are none. */
  nfcShare: number | null;
  activeTags: number;
  stores: number;
  lastTapAt: string | null;
};

export const nfcShare = (nfc: number, total: number): number | null => (total > 0 ? (nfc / total) * 100 : null);

export function rollup(rows: StoreBreakdown[], level: Level): RollupRow[] {
  const groups = new Map<string, RollupRow>();
  for (const r of rows) {
    const key = level === "store" ? r.store_id : level === "city" ? r.city_id : r.area_id;
    const existing = groups.get(key);
    const base: RollupRow =
      existing ?? {
        key,
        name: level === "store" ? r.store_name : level === "city" ? r.city_name : r.area_name,
        city: level === "store" ? r.city_name : undefined,
        area: level === "area" ? undefined : r.area_name,
        nfc: 0,
        qr: 0,
        total: 0,
        nfcShare: null,
        activeTags: 0,
        stores: 0,
        lastTapAt: null,
      };
    base.nfc += r.nfc;
    base.qr += r.qr;
    base.total += r.total;
    base.activeTags += r.active_tags;
    base.stores += 1;
    if (r.last_tap_at && (!base.lastTapAt || r.last_tap_at > base.lastTapAt)) base.lastTapAt = r.last_tap_at;
    groups.set(key, base);
  }
  return [...groups.values()].map((g) => ({ ...g, nfcShare: nfcShare(g.nfc, g.total) }));
}

export type SortKey = "name" | "nfc" | "qr" | "total" | "nfcShare" | "activeTags" | "lastTapAt";

export function sortRows(rows: RollupRow[], key: SortKey, dir: "asc" | "desc"): RollupRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    // Empty values always sink to the bottom, whichever way we sort.
    if (av === null && bv === null) return a.name.localeCompare(b.name, "en-GB");
    if (av === null) return 1;
    if (bv === null) return -1;
    const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv, "en-GB") : (av as number) - (bv as number);
    return cmp !== 0 ? sign * cmp : a.name.localeCompare(b.name, "en-GB");
  });
}
