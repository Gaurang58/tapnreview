/**
 * Minimal, safe CSV. Cells are quoted when needed, and any text that a spreadsheet
 * could mistake for a formula (starting with = + - @ or a tab) is prefixed with an
 * apostrophe, so a store named "=HYPERLINK(...)" can't run anything when opened in Excel.
 */
export type Cell = string | number | null | undefined;

export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "number" ? String(value) : value;
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
