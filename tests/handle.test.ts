import { beforeEach, describe, expect, it, vi } from "vitest";

// `after` normally runs once the response is sent; here we collect and run it on demand.
const afterTasks: Array<() => Promise<void> | void> = [];
vi.mock("server-only", () => ({}));
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: (fn: () => Promise<void> | void) => void afterTasks.push(fn) };
});

type TagRow = {
  id: string;
  is_active: boolean;
  retired_at: string | null;
  store_id: string;
  stores: { id: string; is_active: boolean; google_review_url: string } | null;
};

let tag: TagRow | null;
let priorTapsForVisitor = 0;
let inserted: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from(table: string) {
      if (table === "tags") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: tag, error: null }),
        };
        return chain;
      }
      // tap_events
      const q = {
        select: () => q,
        eq: () => q,
        gte: async () => ({ count: priorTapsForVisitor, error: null }),
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row);
          return { error: null };
        },
      };
      return q;
    },
  }),
}));

import { handleTap } from "@/lib/redirect/handle";

const GOOGLE = "https://search.google.com/local/writereview?placeid=ChIJN1CJGPXDeUgRessfZdzwNVY";
const PHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function activeTag(overrides: Partial<TagRow> = {}): TagRow {
  return {
    id: "tag-1",
    is_active: true,
    retired_at: null,
    store_id: "store-1",
    stores: { id: "store-1", is_active: true, google_review_url: GOOGLE },
    ...overrides,
  };
}

const req = (ua = PHONE) =>
  new Request("https://tap.example/t/abcDEF1234", { headers: { "user-agent": ua, "x-forwarded-for": "203.0.113.9" } });

async function flush() {
  while (afterTasks.length) await afterTasks.shift()!();
}

beforeEach(() => {
  afterTasks.length = 0;
  inserted = [];
  priorTapsForVisitor = 0;
  tag = activeTag();
});

describe("redirect handler", () => {
  it("sends an active tag straight to Google, uncached, and logs the tap afterwards", async () => {
    const res = await handleTap(req(), "abcDEF1234", "nfc");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(GOOGLE);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(inserted).toHaveLength(0); // nothing logged until after the response
    await flush();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      tag_id: "tag-1",
      store_id: "store-1",
      method: "nfc",
      is_bot: false,
      is_duplicate: false,
      is_demo: false,
    });
    expect(JSON.stringify(inserted[0])).not.toContain("203.0.113.9"); // no raw IP stored
  });

  it("records QR scans with method qr", async () => {
    await handleTap(req(), "abcDEF1234", "qr");
    await flush();
    expect(inserted[0]).toMatchObject({ method: "qr" });
  });

  it("marks link-preview bots but still redirects them", async () => {
    const res = await handleTap(req("WhatsApp/2.23.20.0"), "abcDEF1234", "nfc");
    expect(res.status).toBe(302);
    await flush();
    expect(inserted[0]).toMatchObject({ is_bot: true });
  });

  it("marks a repeat tap by the same visitor within 30 minutes as a duplicate", async () => {
    priorTapsForVisitor = 1;
    await handleTap(req(), "abcDEF1234", "nfc");
    await flush();
    expect(inserted[0]).toMatchObject({ is_duplicate: true });
  });

  it.each([
    ["unknown code", null],
    ["inactive tag", activeTag({ is_active: false })],
    ["retired tag", activeTag({ retired_at: "2026-11-01T00:00:00Z" })],
    ["missing store", activeTag({ stores: null })],
    ["inactive store", activeTag({ stores: { id: "s", is_active: false, google_review_url: GOOGLE } })],
    ["review link not on Google", activeTag({ stores: { id: "s", is_active: true, google_review_url: "https://evil.example/x" } })],
  ])("shows the friendly page for %s, and logs nothing", async (_name, row) => {
    tag = row;
    const res = await handleTap(req(), "abcDEF1234", "nfc");
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/inactive");
    await flush();
    expect(inserted).toHaveLength(0);
  });

  it("shows the friendly page, not an error, if the database client cannot even be created", async () => {
    const admin = await import("@/lib/supabase/admin");
    const spy = vi.spyOn(admin, "supabaseAdmin").mockImplementation(() => {
      throw new Error("Missing environment variable SUPABASE_SECRET_KEY.");
    });
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleTap(req(), "abcDEF1234", "nfc");
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/inactive");
    spy.mockRestore();
    quiet.mockRestore();
  });

  it("rejects malformed codes without touching the database", async () => {
    const res = await handleTap(req(), "../etc/passwd", "nfc");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/inactive");
  });
});
