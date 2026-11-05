"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatCount, formatTimeLondon } from "@/lib/utils";
import { londonToday } from "@/lib/dates";
import type { RecentEvent, TapMethod } from "@/lib/supabase/types";

type FeedItem = Pick<RecentEvent, "id" | "occurred_at" | "method" | "store_id" | "store_name">;

type Mode = "connecting" | "live" | "polling";

const FEED_SIZE = 8;
const POLL_MS = 15_000;
const REALTIME_GRACE_MS = 8_000;
const REFRESH_DELAY_MS = 2_500;

/**
 * The rate-board style panel: today's count and the latest taps, updating within
 * seconds of a tap. It listens on Supabase Realtime (Row Level Security still
 * decides which rows reach this person) and, if that is unavailable, polls every
 * 15 seconds. The rest of the page (tiles, charts, table) is refreshed shortly
 * after each tap.
 */
export function TapBoard({
  initialToday,
  initialEvents,
  storeNames,
  scopeStoreIds,
  method,
  pollQuery,
  title = "Tap board",
  forcePolling = false,
}: {
  initialToday: number;
  initialEvents: FeedItem[];
  storeNames: Record<string, string>;
  /** null means every store this person can see. */
  scopeStoreIds: string[] | null;
  method: TapMethod | null;
  /** Scope filters as a query string for the polling endpoint. */
  pollQuery: string;
  title?: string;
  /** Skip Realtime and poll every 15 seconds (add ?live=poll to the page address). */
  forcePolling?: boolean;
}) {
  const router = useRouter();
  const [events, setEvents] = useState<FeedItem[]>(initialEvents);
  const [today, setToday] = useState(initialToday);
  const [freshId, setFreshId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(forcePolling ? "polling" : "connecting");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After the page re-renders on the server, take its (newer) numbers. Comparing during
  // render, rather than in an effect, avoids a wasted extra render.
  const [served, setServed] = useState({ events: initialEvents, today: initialToday });
  if (served.events !== initialEvents || served.today !== initialToday) {
    setServed({ events: initialEvents, today: initialToday });
    setEvents(initialEvents);
    setToday(initialToday);
  }

  const scopeKey = scopeStoreIds ? scopeStoreIds.join(",") : "*";

  function scheduleRefresh() {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, REFRESH_DELAY_MS);
  }

  // --- Realtime ----------------------------------------------------------------
  useEffect(() => {
    if (forcePolling) return;
    const supabase = supabaseBrowser();
    const inScope = scopeKey === "*" ? null : new Set(scopeKey.split(","));
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const giveUp = setTimeout(() => setMode((m) => (m === "connecting" ? "polling" : m)), REALTIME_GRACE_MS);

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      channel = supabase
        .channel(`tap-board-${scopeKey.slice(0, 40)}-${method ?? "all"}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "tap_events" }, (payload) => {
          const row = payload.new as {
            id: number;
            store_id: string;
            method: TapMethod;
            occurred_at: string;
            is_bot: boolean;
            is_duplicate: boolean;
          };
          if (row.is_bot || row.is_duplicate) return; // only counted taps appear
          if (inScope && !inScope.has(row.store_id)) return;
          if (method && row.method !== method) return;

          setEvents((prev) =>
            [{ id: row.id, occurred_at: row.occurred_at, method: row.method, store_id: row.store_id, store_name: storeNames[row.store_id] ?? "Store" }, ...prev]
              .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i)
              .slice(0, FEED_SIZE),
          );
          if (londonToday(new Date(row.occurred_at)) === londonToday()) setToday((t) => t + 1);
          setFreshId(row.id);
          scheduleRefresh();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setMode("live");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setMode("polling");
        });
    })();

    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, method, forcePolling]);

  // --- Polling fallback --------------------------------------------------------
  useEffect(() => {
    if (mode !== "polling") return;
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/live?${pollQuery}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const body = (await res.json()) as { recent: FeedItem[]; today: number };
        setEvents((prev) => {
          if (body.recent[0] && body.recent[0].id !== prev[0]?.id) setFreshId(body.recent[0].id);
          return body.recent;
        });
        setToday(body.today);
        router.refresh();
      } catch {
        /* try again at the next tick */
      }
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pollQuery]);

  useEffect(() => () => void (refreshTimer.current && clearTimeout(refreshTimer.current)), []);

  return (
    <section aria-labelledby="tap-board-title" className="tap-board p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 id="tap-board-title" className="tap-board-text text-xs opacity-80">
          {title}
        </h2>
        <p className="tap-board-text flex items-center gap-2 text-[11px] opacity-90" role="status">
          <span
            aria-hidden="true"
            className={`inline-block size-2 rounded-full ${mode === "live" ? "bg-[var(--color-lime)]" : "bg-[var(--color-qr)]"}`}
          />
          {mode === "live" ? "Live" : mode === "polling" ? "Updating every 15 seconds" : "Connecting"}
        </p>
      </div>

      <div className="mt-3 grid gap-6 md:grid-cols-[auto_1fr] md:gap-10">
        <div>
          <p className="tap-board-text text-6xl leading-none sm:text-7xl" aria-live="polite" aria-atomic="true">
            <span className="sr-only">Today: </span>
            {formatCount(today)}
          </p>
          <p className="tap-board-text mt-2 text-xs opacity-80">Taps and scans today</p>
        </div>

        {events.length === 0 ? (
          <p className="text-sm opacity-90">No taps yet: tap a card to see it here.</p>
        ) : (
          <ol aria-label="Latest taps and scans" className="min-w-0 space-y-1 text-sm sm:text-base">
            {events.map((e) => (
              <li
                key={e.id}
                className={`tap-board-text flex min-w-0 items-center justify-between gap-3 rounded px-2 py-1 ${e.id === freshId ? "board-arrive" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <time dateTime={e.occurred_at}>{formatTimeLondon(e.occurred_at)}</time>
                  <span className="truncate">{e.store_name}</span>
                </span>
                <span className="shrink-0">{e.method === "nfc" ? "NFC" : "QR"}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
