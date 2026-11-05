import { describe, expect, it } from "vitest";
import { isBotUserAgent } from "@/lib/redirect/bots";
import { visitorHash } from "@/lib/redirect/hash";
import { isAllowedReviewUrl, reviewUrlFromPlaceId } from "@/lib/redirect/url";

describe("bot detection", () => {
  it("flags link-preview and crawler agents", () => {
    for (const ua of [
      "WhatsApp/2.23.20.0",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "facebookexternalhit/1.1",
      "Twitterbot/1.0",
      "TelegramBot (like TwitterBot)",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "LinkedInBot/1.0",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "curl/8.4.0",
      "",
    ]) {
      expect(isBotUserAgent(ua), ua).toBe(true);
    }
  });

  it("lets real phones through", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
    ]) {
      expect(isBotUserAgent(ua), ua).toBe(false);
    }
  });
});

describe("visitor hash", () => {
  it("is stable within a day and changes with the day or salt", () => {
    const d1 = new Date("2026-11-09T10:00:00Z");
    const d2 = new Date("2026-11-09T16:00:00Z");
    const d3 = new Date("2026-11-10T10:00:00Z");
    const a = visitorHash("203.0.113.9", "ua", "salt", d1);
    expect(visitorHash("203.0.113.9", "ua", "salt", d2)).toBe(a);
    expect(visitorHash("203.0.113.9", "ua", "salt", d3)).not.toBe(a);
    expect(visitorHash("203.0.113.9", "ua", "other", d1)).not.toBe(a);
    expect(a).toHaveLength(24);
    expect(a).not.toContain("203.0.113.9");
  });
});

describe("review link allowlist", () => {
  it("builds the standard write-review link from a Place ID", () => {
    expect(reviewUrlFromPlaceId("ChIJN1CJGPXDeUgRessfZdzwNVY")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJN1CJGPXDeUgRessfZdzwNVY",
    );
  });

  it("accepts only https Google hosts", () => {
    expect(isAllowedReviewUrl("https://search.google.com/local/writereview?placeid=x")).toBe(true);
    expect(isAllowedReviewUrl("https://g.page/r/abc/review")).toBe(true);
    expect(isAllowedReviewUrl("https://www.google.co.uk/maps/place/x")).toBe(true);
    expect(isAllowedReviewUrl("http://search.google.com/local/writereview?placeid=x")).toBe(false);
    expect(isAllowedReviewUrl("https://evil.example/google.com")).toBe(false);
    expect(isAllowedReviewUrl("https://google.com.evil.example/")).toBe(false);
    expect(isAllowedReviewUrl("not a url")).toBe(false);
    expect(isAllowedReviewUrl(null)).toBe(false);
  });
});
