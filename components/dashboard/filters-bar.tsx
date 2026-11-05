"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };
type CityOpt = Opt & { area_id: string };
type StoreOpt = Opt & { city_id: string };

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "custom", label: "Custom" },
] as const;

/**
 * Filters live in the URL, so any view can be shared or bookmarked. Each person is
 * only offered the areas, cities and stores their role allows (the lists passed in
 * were already filtered by the database).
 */
export function FiltersBar({
  range,
  from,
  to,
  areaId,
  cityId,
  storeId,
  method,
  today,
  areas,
  cities,
  stores,
  showScope = true,
}: {
  range: string;
  from: string;
  to: string;
  areaId?: string;
  cityId?: string;
  storeId?: string;
  method?: string;
  today: string;
  areas: Opt[];
  cities: CityOpt[];
  stores: StoreOpt[];
  showScope?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [custom, setCustom] = useState(range === "custom");
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(changes: Record<string, string | null>) {
    const params = new URLSearchParams(current.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const visibleCities = areaId ? cities.filter((c) => c.area_id === areaId) : cities;
  const visibleStores = cityId
    ? stores.filter((s) => s.city_id === cityId)
    : areaId
      ? stores.filter((s) => visibleCities.some((c) => c.id === s.city_id))
      : stores;

  return (
    <form
      aria-label="Filters"
      aria-busy={pending}
      className={cn("panel space-y-3 p-3 sm:p-4", pending && "opacity-70")}
      onSubmit={(e) => e.preventDefault()}
    >
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = p.key === "custom" ? custom || range === "custom" : !custom && range === p.key;
          return (
            <Button
              key={p.key}
              size="sm"
              variant={active ? "default" : "secondary"}
              aria-pressed={active}
              onClick={() => {
                if (p.key === "custom") setCustom(true);
                else {
                  setCustom(false);
                  go({ range: p.key, from: null, to: null });
                }
              }}
            >
              {p.label}
            </Button>
          );
        })}
      </div>

      {custom ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">From</span>
            <Input type="date" value={customFrom} max={today} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">To</span>
            <Input type="date" value={customTo} max={today} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
          </label>
          <Button size="sm" onClick={() => go({ range: "custom", from: customFrom, to: customTo })}>
            Apply dates
          </Button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {showScope ? (
          <>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Area</span>
              <Select value={areaId ?? ""} onChange={(e) => go({ area: e.target.value || null, city: null, store: null })}>
                <option value="">All areas</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">City</span>
              <Select value={cityId ?? ""} onChange={(e) => go({ city: e.target.value || null, store: null })}>
                <option value="">All cities</option>
                {visibleCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Store</span>
              <Select value={storeId ?? ""} onChange={(e) => go({ store: e.target.value || null })}>
                <option value="">All stores</option>
                {visibleStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
          </>
        ) : null}
        <label className="text-sm">
          <span className="mb-1 block font-medium">Method</span>
          <Select value={method ?? ""} onChange={(e) => go({ method: e.target.value || null })}>
            <option value="">NFC taps and QR scans</option>
            <option value="nfc">NFC taps only</option>
            <option value="qr">QR scans only</option>
          </Select>
        </label>
      </div>
    </form>
  );
}
