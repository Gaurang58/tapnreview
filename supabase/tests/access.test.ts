/**
 * Access tests: sign in as each demo role and assert what it can and cannot
 * read and write, calling the Supabase API directly (no UI in the way).
 *
 * Needs a live project with `npm run seed:demo` applied and .env.local present.
 * Run with: npm run test:access
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "@/lib/supabase/types";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

type Client = SupabaseClient<Database>;

async function signIn(email: string | undefined, password: string | undefined): Promise<Client> {
  if (!email || !password) throw new Error("Demo login env vars missing; see .env.example");
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return client;
}

const anon = () =>
  createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

let admin: Client;
let areaManager: Client;
let bureauManager: Client;
let staff: Client;

let area1Id: string;
let otherAreaId: string;
let westBridgfordId: string;
let otherStoreId: string;

beforeAll(async () => {
  admin = await signIn(process.env.DEMO_ADMIN_EMAIL, process.env.DEMO_ADMIN_PASSWORD);
  areaManager = await signIn(process.env.DEMO_AREA_MANAGER_EMAIL, process.env.DEMO_AREA_MANAGER_PASSWORD);
  bureauManager = await signIn(
    process.env.DEMO_BUREAU_MANAGER_EMAIL,
    process.env.DEMO_BUREAU_MANAGER_PASSWORD,
  );
  staff = await signIn(process.env.DEMO_STAFF_EMAIL, process.env.DEMO_STAFF_PASSWORD);

  const { data: areas } = await admin.from("areas").select("id,name").order("name");
  area1Id = areas!.find((a) => a.name === "Area 1")!.id;
  otherAreaId = areas!.find((a) => a.name !== "Area 1")!.id;

  const { data: stores } = await admin.from("stores").select("id,name,cities(area_id)");
  westBridgfordId = stores!.find((s) => s.name === "Nottingham West Bridgford")!.id;
  otherStoreId = stores!.find((s) => s.name !== "Nottingham West Bridgford")!.id;
});

// The tests create a few throwaway rows (names start with "Test"). Remove them
// afterwards, with the secret key, so the demo data stays clean.
afterAll(async () => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return;
  const svc = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  await svc.from("tags").delete().like("label", "Test tag%");
  await svc.from("cities").delete().like("name", "Test city%");
  await svc.from("areas").delete().like("name", "Test area%");
  await svc.from("audit_log").delete().or("details->after->>name.like.Test*,details->after->>label.like.Test tag*");
});

describe("anonymous visitors", () => {
  it("cannot read any table", async () => {
    for (const table of ["stores", "tags", "tap_events", "profiles", "memberships", "areas"] as const) {
      const { data, error } = await anon().from(table).select("*").limit(1);
      expect(error ?? null).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("cannot call analytics", async () => {
    const { error } = await anon().rpc("analytics_totals", { p_from: "2026-01-01", p_to: "2026-12-31" });
    expect(error).not.toBeNull();
  });
});

describe("audit log", () => {
  it("admins see everything; nobody can write to it from the API", async () => {
    const { data, error } = await admin.from("audit_log").select("id, details").limit(500);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const client of [admin, areaManager, bureauManager, staff]) {
      const attempt = await client.from("audit_log").insert({ action: "fake.entry", entity: "x", details: {} });
      expect(attempt.error).not.toBeNull();
    }
  });

  it("area managers see only changes tagged with their own area", async () => {
    const { data } = await areaManager.from("audit_log").select("details").limit(500);
    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) expect((row.details as { area_id?: string }).area_id).toBe(area1Id);
  });

  it("bureau managers and staff see none of it", async () => {
    for (const client of [bureauManager, staff]) {
      const { data, error } = await client.from("audit_log").select("id").limit(5);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });
});

describe("admin", () => {
  it("sees every store and area", async () => {
    const { data: stores } = await admin.from("stores").select("id");
    expect(stores!.length).toBeGreaterThanOrEqual(12);
    const { data: areas } = await admin.from("areas").select("id");
    expect(areas!.length).toBeGreaterThanOrEqual(3);
  });

  it("can create and rename an area", async () => {
    const { data: org } = await admin.from("organisations").select("id").single();
    const name = `Test area ${Date.now()}`;
    const { data: created, error } = await admin
      .from("areas")
      .insert({ organisation_id: org!.id, name })
      .select("id")
      .single();
    expect(error).toBeNull();
    const { error: updateError } = await admin
      .from("areas")
      .update({ is_active: false, name: `${name} (retired)` })
      .eq("id", created!.id);
    expect(updateError).toBeNull();
  });

  it("reads the whole event history quickly (access checks run once per query, not once per row)", async () => {
    // Regression test: when the read rule was evaluated per row, 9,000 events timed out (8+ s).
    const started = Date.now();
    const { data, error } = await admin.rpc("analytics_by_store", { p_from: "2020-01-01", p_to: "2030-12-31" });
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(12);
    expect(Date.now() - started).toBeLessThan(3000);
    const t = await admin.rpc("analytics_totals", { p_from: "2020-01-01", p_to: "2030-12-31" });
    expect(t.error).toBeNull();
    expect(t.data![0]!.interactions).toBeGreaterThan(10000);
  });

  it("still cannot write tap_events (only the redirect routes may)", async () => {
    const { data: tag } = await admin.from("tags").select("id,store_id").limit(1).single();
    const { error } = await admin
      .from("tap_events")
      .insert({ tag_id: tag!.id, store_id: tag!.store_id, method: "nfc" });
    expect(error).not.toBeNull();
  });
});

describe("area manager (Area 1)", () => {
  it("sees only Area 1 stores", async () => {
    const { data } = await areaManager.from("stores").select("id, cities!inner(area_id)");
    expect(data!.length).toBeGreaterThan(0);
    for (const s of data!) {
      const city = s.cities as unknown as { area_id: string };
      expect(city.area_id).toBe(area1Id);
    }
  });

  it("cannot see other areas", async () => {
    const { data } = await areaManager.from("areas").select("id").eq("id", otherAreaId);
    expect(data).toEqual([]);
  });

  it("can add a city in Area 1 but not elsewhere", async () => {
    const ok = await areaManager
      .from("cities")
      .insert({ area_id: area1Id, name: `Test city ${Date.now()}` })
      .select("id")
      .single();
    expect(ok.error).toBeNull();

    const bad = await areaManager.from("cities").insert({ area_id: otherAreaId, name: `Nope ${Date.now()}` });
    expect(bad.error).not.toBeNull();
  });

  it("cannot point a store's card at a non-Google page, even straight through the API", async () => {
    const { data: store } = await areaManager.from("stores").select("id").limit(1).single();
    for (const url of ["https://evil.example/review", "https://google.com.evil.example/", "https://google.com@evil.example/", "http://search.google.com/x"]) {
      const { error } = await areaManager.from("stores").update({ google_review_url: url }).eq("id", store!.id);
      expect(error, url).not.toBeNull();
    }
  });

  it("cannot create areas", async () => {
    const { data: org } = await areaManager.from("organisations").select("id").single();
    const { error } = await areaManager.from("areas").insert({ organisation_id: org!.id, name: `X ${Date.now()}` });
    expect(error).not.toBeNull();
  });
});

describe("bureau manager (Nottingham West Bridgford)", () => {
  it("sees only their store", async () => {
    const { data } = await bureauManager.from("stores").select("id");
    expect(data!.map((s) => s.id)).toEqual([westBridgfordId]);
  });

  it("can create, rename and retire a tag in their store", async () => {
    const code = `T${Date.now().toString(36)}xyz`;
    const created = await bureauManager
      .from("tags")
      .insert({ store_id: westBridgfordId, label: "Test tag", public_code: code })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const renamed = await bureauManager
      .from("tags")
      .update({ label: "Test tag renamed" })
      .eq("id", created.data!.id)
      .select("label")
      .single();
    expect(renamed.data?.label).toBe("Test tag renamed");

    const retired = await bureauManager
      .from("tags")
      .update({ retired_at: new Date().toISOString() })
      .eq("id", created.data!.id)
      .select("is_active")
      .single();
    expect(retired.data?.is_active).toBe(false);

    // Retiring is permanent: it can't be switched back on or un-retired.
    const revive = await bureauManager.from("tags").update({ is_active: true }).eq("id", created.data!.id);
    expect(revive.error).not.toBeNull();
    const unretire = await bureauManager.from("tags").update({ retired_at: null }).eq("id", created.data!.id);
    expect(unretire.error).not.toBeNull();
  });

  it("cannot change a printed code", async () => {
    const { data: tag } = await bureauManager.from("tags").select("id").limit(1).single();
    const { error } = await bureauManager.from("tags").update({ public_code: "ChangedCode1" }).eq("id", tag!.id);
    expect(error).not.toBeNull();
  });

  it("cannot create a tag in another store", async () => {
    const { error } = await bureauManager
      .from("tags")
      .insert({ store_id: otherStoreId, label: "Nope", public_code: `N${Date.now().toString(36)}abc` });
    expect(error).not.toBeNull();
  });

  it("cannot edit the store itself", async () => {
    const { data } = await bureauManager
      .from("stores")
      .update({ name: "Hacked" })
      .eq("id", westBridgfordId)
      .select("id");
    expect(data).toEqual([]);
  });
});

describe("staff (Nottingham West Bridgford)", () => {
  it("sees only their store and its events", async () => {
    const { data: stores } = await staff.from("stores").select("id");
    expect(stores!.map((s) => s.id)).toEqual([westBridgfordId]);

    const { data: events } = await staff.from("tap_events").select("store_id").limit(200);
    for (const e of events!) expect(e.store_id).toBe(westBridgfordId);

    const { data: other } = await staff.from("tap_events").select("id").eq("store_id", otherStoreId).limit(1);
    expect(other).toEqual([]);
  });

  it("analytics are scoped to their store even without a filter", async () => {
    const { data, error } = await staff.rpc("analytics_by_store", { p_from: "2026-01-01", p_to: "2026-12-31" });
    expect(error).toBeNull();
    expect(data!.map((r) => r.store_id)).toEqual([westBridgfordId]);
  });

  it("cannot write anything", async () => {
    const tagInsert = await staff
      .from("tags")
      .insert({ store_id: westBridgfordId, label: "Nope", public_code: `S${Date.now().toString(36)}abc` });
    expect(tagInsert.error).not.toBeNull();

    const { data: tag } = await staff.from("tags").select("id").limit(1).single();
    const tagUpdate = await staff.from("tags").update({ label: "Nope" }).eq("id", tag!.id).select("id");
    expect(tagUpdate.data).toEqual([]);

    const eventInsert = await staff
      .from("tap_events")
      .insert({ tag_id: tag!.id, store_id: westBridgfordId, method: "qr" });
    expect(eventInsert.error).not.toBeNull();

    const { data: me } = await staff.auth.getUser();
    const membershipInsert = await staff.from("memberships").insert({
      user_id: me.user!.id,
      role: "admin",
      organisation_id: (await staff.from("organisations").select("id").single()).data!.id,
    });
    expect(membershipInsert.error).not.toBeNull();

    const profileFlip = await staff.from("profiles").update({ is_active: false }).eq("user_id", me.user!.id);
    expect(profileFlip.error).not.toBeNull();

    const nameChange = await staff
      .from("profiles")
      .update({ full_name: "Demo Staff" })
      .eq("user_id", me.user!.id)
      .select("full_name")
      .single();
    expect(nameChange.error).toBeNull();
  });

  it("cannot see other people's memberships", async () => {
    const { data } = await staff.from("memberships").select("user_id");
    const { data: me } = await staff.auth.getUser();
    for (const m of data!) expect(m.user_id).toBe(me.user!.id);
  });
});
