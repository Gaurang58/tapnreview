import type { HourlyCell } from "@/lib/supabase/types";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type Slot = { dow: number; day: string; hour: number; total: number };

export type HourlySummary = {
  total: number;
  /** Busiest day of the week, and busiest hour of the day, over the whole period. */
  busiestDay: { day: string; total: number } | null;
  busiestHour: { hour: number; total: number } | null;
  /** The three busiest single day-and-hour slots. */
  topSlots: Slot[];
  /** Saturday and Sunday as a share of everything, 0 to 100. */
  weekendShare: number | null;
};

export function summarizeHourly(cells: HourlyCell[]): HourlySummary {
  const total = cells.reduce((s, c) => s + c.total, 0);
  if (total === 0) return { total: 0, busiestDay: null, busiestHour: null, topSlots: [], weekendShare: null };

  const byDay = new Map<number, number>();
  const byHour = new Map<number, number>();
  for (const c of cells) {
    byDay.set(c.dow, (byDay.get(c.dow) ?? 0) + c.total);
    byHour.set(c.hour, (byHour.get(c.hour) ?? 0) + c.total);
  }
  const best = (m: Map<number, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]!;
  const [dow, dayTotal] = best(byDay);
  const [hour, hourTotal] = best(byHour);
  const weekend = (byDay.get(0) ?? 0) + (byDay.get(6) ?? 0);

  return {
    total,
    busiestDay: { day: DAY_NAMES[dow]!, total: dayTotal },
    busiestHour: { hour, total: hourTotal },
    topSlots: [...cells]
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total || a.dow - b.dow || a.hour - b.hour)
      .slice(0, 3)
      .map((c) => ({ dow: c.dow, day: DAY_NAMES[c.dow]!, hour: c.hour, total: c.total })),
    weekendShare: (weekend / total) * 100,
  };
}
