"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCount, formatDateLondon } from "@/lib/utils";
import type { DailyPoint } from "@/lib/supabase/types";

const NFC = "#2E7D32";
const QR = "#E39A2D";

const label = (day: string, opts?: Intl.DateTimeFormatOptions) =>
  formatDateLondon(new Date(`${day}T12:00:00Z`), { weekday: undefined, ...opts });

/** NFC is solid green, QR is dashed amber, so the two never rely on colour alone. */
export function DailyChart({ data }: { data: DailyPoint[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const busiest = data.reduce((best, d) => (d.total > best.total ? d : best), data[0] ?? { day: "", total: 0, nfc: 0, qr: 0 });
  const summary = total
    ? `Line chart of daily NFC taps and QR scans from ${label(data[0]!.day)} to ${label(data.at(-1)!.day)}. ${formatCount(total)} in total; the busiest day was ${label(busiest.day)} with ${formatCount(busiest.total)}.`
    : "Line chart of daily NFC taps and QR scans. There is no data for this period.";

  return (
    <figure>
      <div role="img" aria-label={summary} className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(d: string) => label(d, { day: "numeric", month: "short" })}
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              minTickGap={28}
              stroke="var(--line)"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted)" }} stroke="var(--line)" width={44} />
            <Tooltip
              labelFormatter={(d) => label(String(d), { weekday: "short", day: "numeric", month: "short" })}
              formatter={(v, name) => [formatCount(Number(v)), name]}
              contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--fg)" }}
            />
            <Legend verticalAlign="top" height={28} />
            <Line type="monotone" dataKey="nfc" name="NFC taps" stroke={NFC} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="qr" name="QR scans" stroke={QR} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-nfc">View as a table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Daily NFC taps and QR scans</caption>
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-2 py-1">Day</th>
                <th scope="col" className="px-2 py-1">NFC taps</th>
                <th scope="col" className="px-2 py-1">QR scans</th>
                <th scope="col" className="px-2 py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t hairline">
                  <th scope="row" className="px-2 py-1 font-normal">{label(d.day, { weekday: "short", day: "numeric", month: "short" })}</th>
                  <td className="px-2 py-1 tabular-nums">{formatCount(d.nfc)}</td>
                  <td className="px-2 py-1 tabular-nums">{formatCount(d.qr)}</td>
                  <td className="px-2 py-1 tabular-nums">{formatCount(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
