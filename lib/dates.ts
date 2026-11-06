/** Calendar helpers in Europe/London. Dates travel as "YYYY-MM-DD" strings. */
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });

export function londonToday(now = new Date()): string {
  return fmt.format(now);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

/** The instant a London calendar day begins (midnight London time), as a UTC Date. */
export function londonStartOfDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, 0, 0);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asLondon = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return new Date(guess - (asLondon - guess));
}
