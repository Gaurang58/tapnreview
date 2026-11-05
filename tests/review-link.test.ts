import { describe, expect, it } from "vitest";
import { resolveReviewTarget, isAllowedReviewUrl } from "@/lib/redirect/url";
import { newPublicCode, PUBLIC_CODE_PATTERN } from "@/lib/codes";
import { addDays, londonToday } from "@/lib/dates";

describe("resolveReviewTarget", () => {
  it("builds the standard link from a Place ID", () => {
    expect(resolveReviewTarget("ChIJN1CJGPXDeUgRessfZdzwNVY", "")).toEqual({
      ok: true,
      placeId: "ChIJN1CJGPXDeUgRessfZdzwNVY",
      url: "https://search.google.com/local/writereview?placeid=ChIJN1CJGPXDeUgRessfZdzwNVY",
    });
  });
  it("accepts a pasted Google link, and prefers it over the Place ID", () => {
    const r = resolveReviewTarget("ChIJN1CJGPXDeUgRessfZdzwNVY", "https://g.page/r/abc/review");
    expect(r).toMatchObject({ ok: true, url: "https://g.page/r/abc/review" });
  });
  it("refuses links that are not Google's, however they are dressed up", () => {
    for (const bad of [
      "https://evil.example/review",
      "https://google.com.evil.example/",
      "https://google.com@evil.example/",
      "https://google.com:8443/x",
      "http://search.google.com/local/writereview?placeid=x",
      "javascript:alert(1)",
    ]) {
      expect(resolveReviewTarget("", bad).ok, bad).toBe(false);
      expect(isAllowedReviewUrl(bad), bad).toBe(false);
    }
  });
  it("needs one or the other", () => {
    expect(resolveReviewTarget("", "").ok).toBe(false);
    expect(resolveReviewTarget("not a place id!", "").ok).toBe(false);
  });
});

describe("public codes", () => {
  it("are 10 base-62 characters, valid for the database, and don't repeat", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const code = newPublicCode();
      expect(code).toMatch(/^[0-9A-Za-z]{10}$/);
      expect(PUBLIC_CODE_PATTERN.test(code)).toBe(true);
      seen.add(code);
    }
    expect(seen.size).toBe(2000);
  });
});

describe("London dates", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("uses the London calendar day, not UTC", () => {
    // 23:30 UTC on 1 July is 00:30 BST on 2 July.
    expect(londonToday(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
  });
});
