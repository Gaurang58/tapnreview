import { formatCount } from "@/lib/utils";
import type { HourlyCell } from "@/lib/supabase/types";

const DAYS = [
  { dow: 1, name: "Monday", short: "Mon" },
  { dow: 2, name: "Tuesday", short: "Tue" },
  { dow: 3, name: "Wednesday", short: "Wed" },
  { dow: 4, name: "Thursday", short: "Thu" },
  { dow: 5, name: "Friday", short: "Fri" },
  { dow: 6, name: "Saturday", short: "Sat" },
  { dow: 0, name: "Sunday", short: "Sun" },
];

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Day of week by hour of day (London time): when do customers tap or scan? */
export function Heatmap({ cells }: { cells: HourlyCell[] }) {
  const byKey = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.total]));
  const hours = cells.map((c) => c.hour);
  const first = Math.min(9, ...(hours.length ? hours : [9]));
  const last = Math.max(17, ...(hours.length ? hours : [17]));
  const range = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const max = Math.max(1, ...cells.map((c) => c.total));

  const busiest = cells.reduce<HourlyCell | null>((b, c) => (!b || c.total > b.total ? c : b), null);
  const summary = busiest
    ? `Heatmap of interactions by day of the week and hour. Busiest: ${DAYS.find((d) => d.dow === busiest.dow)!.name} around ${hourLabel(busiest.hour)}, with ${formatCount(busiest.total)}.`
    : "Heatmap of interactions by day of the week and hour. There is no data for this period.";

  return (
    <figure>
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={summary}
          className="grid min-w-[34rem] gap-[3px]"
          style={{ gridTemplateColumns: `3rem repeat(${range.length}, minmax(0, 1fr))` }}
        >
          <div />
          {range.map((h) => (
            <div key={h} className="text-center text-[11px] text-muted" aria-hidden="true">
              {String(h).padStart(2, "0")}
            </div>
          ))}
          {DAYS.map((d) => (
            <div key={d.dow} className="contents" aria-hidden="true">
              <div className="flex items-center text-xs text-muted">{d.short}</div>
              {range.map((h) => {
                const v = byKey.get(`${d.dow}-${h}`) ?? 0;
                const pct = Math.round((v / max) * 100);
                return (
                  <div
                    key={h}
                    title={`${d.name} ${hourLabel(h)}: ${formatCount(v)}`}
                    className="flex h-8 items-center justify-center rounded-sm border text-[11px] tabular-nums hairline"
                    style={{
                      background: `color-mix(in srgb, var(--color-board) ${pct}%, var(--panel))`,
                      color: pct > 55 ? "#fff" : "var(--fg)",
                    }}
                  >
                    {v > 0 ? formatCount(v) : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 flex items-center gap-2 text-xs text-muted">
        Fewer
        <span aria-hidden="true" className="h-2 w-24 rounded" style={{ background: "linear-gradient(to right, var(--panel), var(--color-board))", border: "1px solid var(--line)" }} />
        More · hours are London time
      </figcaption>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-nfc">View as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Interactions by day and hour</caption>
            <thead className="text-muted">
              <tr>
                <th scope="col" className="px-1 py-1">Day</th>
                {range.map((h) => (
                  <th key={h} scope="col" className="px-1 py-1 text-right">{String(h).padStart(2, "0")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d.dow} className="border-t hairline">
                  <th scope="row" className="px-1 py-1 font-normal">{d.name}</th>
                  {range.map((h) => (
                    <td key={h} className="px-1 py-1 text-right tabular-nums">{formatCount(byKey.get(`${d.dow}-${h}`) ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
