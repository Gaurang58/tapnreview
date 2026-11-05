import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatCount, formatPercent, percentChange } from "@/lib/utils";
import { nfcShare } from "@/lib/analytics/aggregate";
import type { Totals } from "@/lib/supabase/types";

function Change({ now, before, words, points }: { now: number; before: number; words: string; points?: boolean }) {
  if (points) {
    // For a share, show the change in percentage points rather than a percentage of a percentage.
    const diff = now - before;
    const Icon = diff > 0.05 ? ArrowUp : diff < -0.05 ? ArrowDown : Minus;
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        <Icon className="size-3.5" aria-hidden="true" />
        <span>
          {diff > 0 ? "+" : ""}
          {diff.toFixed(1)} points <span className="sr-only">compared with </span>vs {words}
        </span>
      </p>
    );
  }
  const change = percentChange(now, before);
  if (change === null) {
    return <p className="mt-1 text-xs text-muted">No data for {words} to compare</p>;
  }
  const Icon = change > 0.5 ? ArrowUp : change < -0.5 ? ArrowDown : Minus;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
      <Icon className="size-3.5" aria-hidden="true" />
      <span>
        {change > 0 ? "+" : ""}
        {formatPercent(change, 0)} <span className="sr-only">compared with </span>vs {words}
      </span>
    </p>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
      {children}
    </div>
  );
}

/** Taps and scans measure intent to review; nothing here is ever called a review. */
export function KpiTiles({
  totals,
  previous,
  words,
  storesInScope,
}: {
  totals: Totals;
  previous: Totals;
  words: string;
  storesInScope: number;
}) {
  const share = nfcShare(totals.nfc, totals.interactions);
  const prevShare = nfcShare(previous.nfc, previous.interactions);
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Tile label="Total interactions" value={formatCount(totals.interactions)}>
        <Change now={totals.interactions} before={previous.interactions} words={words} />
      </Tile>
      <Tile label="NFC taps" value={formatCount(totals.nfc)}>
        <Change now={totals.nfc} before={previous.nfc} words={words} />
      </Tile>
      <Tile label="QR scans" value={formatCount(totals.qr)}>
        <Change now={totals.qr} before={previous.qr} words={words} />
      </Tile>
      <Tile label="NFC share" value={share === null ? "No data" : formatPercent(share, 0)}>
        {share !== null && prevShare !== null ? (
          <Change now={share} before={prevShare} words={words} points />
        ) : (
          <p className="mt-1 text-xs text-muted">No data for {words} to compare</p>
        )}
      </Tile>
      <Tile label="Active tags" value={formatCount(totals.active_tags)}>
        <p className="mt-1 text-xs text-muted">Switched on right now</p>
      </Tile>
      <Tile label="Live bureaux" value={formatCount(totals.live_stores)}>
        <p className="mt-1 text-xs text-muted">
          with a tap or scan, of {formatCount(storesInScope)} {storesInScope === 1 ? "store" : "stores"}
        </p>
      </Tile>
    </dl>
  );
}
