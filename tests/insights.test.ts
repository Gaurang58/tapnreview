import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { summarizeHourly } from "@/lib/analytics/insights";
import { describeAudit } from "@/lib/audit/describe";
import type { HourlyCell } from "@/lib/supabase/types";

describe("csv", () => {
  it("quotes only when needed and doubles quotes", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("Smith, Jones")).toBe('"Smith, Jones"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
  });
  it("defuses spreadsheet formulas in text", () => {
    for (const evil of ["=HYPERLINK(\"http://evil\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd"]) {
      expect(csvCell(evil).replace(/^"/, "").startsWith("'"), evil).toBe(true);
    }
    expect(csvCell(-5)).toBe("-5"); // a real negative number stays a number
  });
  it("writes a header row and one line per row", () => {
    expect(toCsv(["date", "total"], [["2026-11-05", 12], ["2026-11-06", 0]])).toBe("date,total\r\n2026-11-05,12\r\n2026-11-06,0\r\n");
  });
});

const cell = (dow: number, hour: number, total: number): HourlyCell => ({ dow, hour, nfc: total, qr: 0, total });

describe("summarizeHourly", () => {
  it("handles no data", () => {
    expect(summarizeHourly([])).toMatchObject({ total: 0, busiestDay: null, busiestHour: null, topSlots: [], weekendShare: null });
  });
  it("finds the busiest day, hour and slots", () => {
    const s = summarizeHourly([cell(6, 12, 30), cell(6, 13, 22), cell(5, 12, 25), cell(1, 9, 3), cell(0, 11, 20)]);
    expect(s.total).toBe(100);
    expect(s.busiestDay).toEqual({ day: "Saturday", total: 52 });
    expect(s.busiestHour).toEqual({ hour: 12, total: 55 });
    expect(s.topSlots.map((t) => `${t.day} ${t.hour}`)).toEqual(["Saturday 12", "Friday 12", "Saturday 13"]);
    expect(s.weekendShare).toBe(72);
  });
});

describe("describeAudit", () => {
  const names = { stores: new Map([["s1", "Nottingham West Bridgford"], ["s2", "Nottingham Bulwell"]]), people: new Map([["u1", "Sam Staff"]]) };
  const row = (action: string, details: unknown, entity = "tags", entity_id: string | null = null) => ({ action, entity, entity_id, details });

  it("describes tag changes in plain words", () => {
    expect(describeAudit(row("tag.retired", { after: { label: "West Bridgford tag" } }), names)).toBe("Retired the tag “West Bridgford tag” (permanent)");
    expect(describeAudit(row("tag.moved", { before: { store_id: "s1" }, after: { label: "T", store_id: "s2" } }), names)).toBe(
      "Moved the tag “T” from Nottingham West Bridgford to Nottingham Bulwell",
    );
    expect(describeAudit(row("tags.insert", { after: { label: "New", store_id: "s1" } }), names)).toBe("Created the tag “New” at Nottingham West Bridgford");
  });
  it("describes store edits without printing the Google link", () => {
    const text = describeAudit(
      row("stores.update", { before: { name: "X", google_review_url: "https://a.example" }, after: { name: "X", google_review_url: "https://search.google.com/b" } }, "stores"),
      names,
    );
    expect(text).toBe("Changed the Google link for X");
    expect(text).not.toContain("google.com");
  });
  it("describes people changes and never leaks raw details", () => {
    expect(describeAudit(row("user.invited", { role: "area_manager", email: "a@b.co" }, "profile"), names)).toBe("Invited a@b.co as Area manager");
    expect(describeAudit(row("user.deactivated", {}, "profile", "u1"), names)).toBe("Switched off the login for Sam Staff");
    expect(describeAudit(row("something.odd", { secret: "x" }, "mystery"), names)).toBe("Changed mystery");
  });
});
