/** Calendar helpers in Europe/London. Dates travel as "YYYY-MM-DD" strings. */
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });

export function londonToday(now = new Date()): string {
  return fmt.format(now);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}
