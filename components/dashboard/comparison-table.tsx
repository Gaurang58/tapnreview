"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { rollup, sortRows, type Level, type SortKey } from "@/lib/analytics/aggregate";
import { cn, formatCount, formatDateTimeLondon, formatPercent } from "@/lib/utils";
import type { StoreBreakdown } from "@/lib/supabase/types";

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "nfc", label: "NFC taps", numeric: true },
  { key: "qr", label: "QR scans", numeric: true },
  { key: "total", label: "Total", numeric: true },
  { key: "nfcShare", label: "NFC share", numeric: true },
  { key: "activeTags", label: "Active tags", numeric: true },
  { key: "lastTapAt", label: "Latest" },
];

/**
 * A plain sortable table. Rows start in alphabetical order, and there are no ranks,
 * targets or medals: it is for comparing where customers engage, not for league tables.
 */
export function ComparisonTable({ rows, query }: { rows: StoreBreakdown[]; query: string }) {
  const [level, setLevel] = useState<Level>("store");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

  const data = useMemo(() => sortRows(rollup(rows, level), sort.key, sort.dir), [rows, level, sort]);

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  }

  return (
    <div>
      <div role="group" aria-label="Group figures by" className="mb-3 flex gap-1.5">
        {(["store", "city", "area"] as const).map((l) => (
          <Button key={l} size="sm" variant={level === l ? "default" : "secondary"} aria-pressed={level === l} onClick={() => setLevel(l)}>
            By {l}
          </Button>
        ))}
      </div>

      {data.length === 0 ? (
        <EmptyState title="No stores in this view" hint="Try widening the filters." />
      ) : (
        <Table>
          <caption className="sr-only">Interactions by {level}, sortable by column</caption>
          <THead>
            <TR>
              {COLUMNS.map((c) => (
                <TH
                  key={c.key}
                  className={cn(c.numeric && "text-right")}
                  aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    className={cn("inline-flex items-center gap-1 font-medium uppercase tracking-wide hover:text-[var(--fg)]", c.numeric && "flex-row-reverse")}
                  >
                    {c.label}
                    {sort.key === c.key ? (
                      sort.dir === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />
                    ) : null}
                  </button>
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {data.map((r) => (
              <TR key={r.key}>
                <TD>
                  {level === "store" ? (
                    <Link href={`/stores/${r.key}${query ? `?${query}` : ""}`} className="font-medium text-nfc hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{r.name}</span>
                  )}
                  <div className="text-xs text-muted">
                    {level === "store" ? `${r.city} · ${r.area}` : level === "city" ? `${r.area} · ` : ""}
                    {level !== "store" ? `${r.stores} ${r.stores === 1 ? "store" : "stores"}` : ""}
                  </div>
                </TD>
                <TD className="text-right tabular-nums">{formatCount(r.nfc)}</TD>
                <TD className="text-right tabular-nums">{formatCount(r.qr)}</TD>
                <TD className="text-right font-medium tabular-nums">{formatCount(r.total)}</TD>
                <TD className="text-right tabular-nums">{r.nfcShare === null ? "—" : formatPercent(r.nfcShare, 0)}</TD>
                <TD className="text-right tabular-nums">{formatCount(r.activeTags)}</TD>
                <TD className="whitespace-nowrap text-muted">{r.lastTapAt ? formatDateTimeLondon(r.lastTapAt) : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
