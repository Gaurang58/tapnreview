import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with en-GB thousands separators. */
export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}

/** Format a UTC timestamp as a Europe/London time, e.g. "14:32". */
export function formatTimeLondon(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** Format a date as "Mon 9 Nov" in Europe/London. */
export function formatDateLondon(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** Format a full date and time, e.g. "9 Nov 2026, 14:32". */
export function formatDateTimeLondon(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** Percentage change between two periods, or null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}
