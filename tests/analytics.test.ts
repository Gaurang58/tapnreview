import { describe, expect, it } from "vitest";
import { daysBetween, parseFilters, periodWords } from "@/lib/analytics/filters";
import { nfcShare, rollup, sortRows } from "@/lib/analytics/aggregate";
import type { StoreBreakdown } from "@/lib/supabase/types";

const TODAY = "2026-11-09";
const A = "11111111-1111-4111-8111-111111111111";

describe("parseFilters", () => {
  it("defaults to the last 90 days, all areas and both methods", () => {
    const f = parseFilters({}, TODAY);
    expect(f).toMatchObject({ range: "90d", from: "2026-08-12", to: TODAY, days: 90 });
    expect(f.areaId).toBeUndefined();
    expect(f.method).toBeUndefined();
  });
  it("handles each preset", () => {
    expect(parseFilters({ range: "today" }, TODAY)).toMatchObject({ from: TODAY, to: TODAY, days: 1 });
    expect(parseFilters({ range: "7d" }, TODAY)).toMatchObject({ from: "2026-11-03", days: 7 });
    expect(parseFilters({ range: "30d" }, TODAY)).toMatchObject({ from: "2026-10-11", days: 30 });
  });
  it("makes the previous period the same length, immediately before", () => {
    const f = parseFilters({ range: "7d" }, TODAY);
    expect([f.prevFrom, f.prevTo]).toEqual(["2026-10-27", "2026-11-02"]);
    expect(daysBetween(f.prevFrom, f.prevTo)).toBe(7);
    const t = parseFilters({ range: "today" }, TODAY);
    expect([t.prevFrom, t.prevTo]).toEqual(["2026-11-08", "2026-11-08"]);
    expect(periodWords(t)).toBe("yesterday");
    expect(periodWords(f)).toBe("the previous 7 days");
  });
  it("accepts a valid custom range", () => {
    const f = parseFilters({ range: "custom", from: "2026-10-01", to: "2026-10-31" }, TODAY);
    expect(f).toMatchObject({ range: "custom", from: "2026-10-01", to: "2026-10-31", days: 31 });
    expect([f.prevFrom, f.prevTo]).toEqual(["2026-08-31", "2026-09-30"]);
  });
  it("falls back safely on bad or hostile custom ranges", () => {
    for (const bad of [
      { range: "custom", from: "2026-10-31", to: "2026-10-01" }, // backwards
      { range: "custom", from: "2026-10-01", to: "2027-01-01" }, // future
      { range: "custom", from: "2026-02-30", to: "2026-03-01" }, // not a real date
      { range: "custom", from: "2024-01-01", to: "2026-11-01" }, // too long
      { range: "custom", from: "'; drop table", to: "x" },
      { range: "custom" },
    ]) {
      expect(parseFilters(bad, TODAY).range, JSON.stringify(bad)).toBe("90d");
    }
  });
  it("ignores unknown ranges and malformed ids or methods", () => {
    const f = parseFilters({ range: "forever", area: "not-a-uuid", store: A, method: "sms" }, TODAY);
    expect(f.range).toBe("90d");
    expect(f.areaId).toBeUndefined();
    expect(f.storeId).toBe(A);
    expect(f.method).toBeUndefined();
    expect(parseFilters({ method: "qr" }, TODAY).method).toBe("qr");
  });
});

const row = (o: Partial<StoreBreakdown>): StoreBreakdown => ({
  store_id: "s1", store_name: "Nottingham West Bridgford", store_is_active: true,
  city_id: "c1", city_name: "Nottingham", area_id: "a1", area_name: "Area 1",
  nfc: 0, qr: 0, total: 0, active_tags: 1, last_tap_at: null, ...o,
});

describe("rollup", () => {
  const stores = [
    row({ store_id: "s1", nfc: 6, qr: 4, total: 10, last_tap_at: "2026-11-09T10:00:00Z" }),
    row({ store_id: "s2", store_name: "Nottingham Bulwell", nfc: 2, qr: 3, total: 5, last_tap_at: "2026-11-09T12:00:00Z" }),
    row({ store_id: "s3", store_name: "Manchester Arndale", city_id: "c2", city_name: "Manchester", area_id: "a2", area_name: "Area 2", nfc: 1, qr: 1, total: 2, active_tags: 2 }),
  ];
  it("adds city and area figures up from their stores", () => {
    const cities = rollup(stores, "city");
    const nott = cities.find((c) => c.name === "Nottingham")!;
    expect(nott).toMatchObject({ nfc: 8, qr: 7, total: 15, stores: 2, activeTags: 2, lastTapAt: "2026-11-09T12:00:00Z" });
    const areas = rollup(stores, "area");
    expect(areas.map((a) => [a.name, a.total])).toEqual([["Area 1", 15], ["Area 2", 2]]);
  });
  it("keeps the grand total identical at every level", () => {
    for (const level of ["store", "city", "area"] as const) {
      expect(rollup(stores, level).reduce((s, r) => s + r.total, 0)).toBe(17);
    }
  });
  it("works out NFC share, with no divide-by-zero", () => {
    expect(nfcShare(6, 10)).toBe(60);
    expect(nfcShare(0, 0)).toBeNull();
  });
});

describe("sortRows", () => {
  const rows = rollup(
    [
      row({ store_id: "s1", store_name: "Bravo", nfc: 5, total: 5 }),
      row({ store_id: "s2", store_name: "Alpha", nfc: 9, total: 9 }),
      row({ store_id: "s3", store_name: "Charlie", total: 0 }),
    ],
    "store",
  );
  it("sorts by name or number, either way", () => {
    expect(sortRows(rows, "name", "asc").map((r) => r.name)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(sortRows(rows, "total", "desc").map((r) => r.name)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(sortRows(rows, "total", "asc").map((r) => r.name)).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
  it("sinks empty values to the bottom whichever way you sort", () => {
    expect(sortRows(rows, "nfcShare", "asc").at(-1)!.name).toBe("Charlie");
    expect(sortRows(rows, "nfcShare", "desc").at(-1)!.name).toBe("Charlie");
  });
});
