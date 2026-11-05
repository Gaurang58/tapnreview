/**
 * Fills the project with realistic demo data: one organisation, three areas,
 * ten cities, twelve stores, a tag per store (two in the bigger ones), four
 * demo logins and 180 days of believable taps (so the 90-day view has a previous period). Every event is marked is_demo.
 * Safe to run again: structure is reused, demo events are replaced.
 * `npm run seed:demo`
 */
import { adminClient, must, newPublicCode, reviewUrl } from "./lib/common";
import { resetDemoEvents } from "./reset-demo";
import type { Database } from "../lib/supabase/types";

const db = adminClient();

const STRUCTURE: Record<string, Record<string, { stores: string[]; big?: string[] }>> = {
  "Area 1": {
    Nottingham: { stores: ["Nottingham West Bridgford", "Nottingham Bulwell"] },
    Leicester: { stores: ["Leicester Highcross"] },
    Derby: { stores: ["Derby Centre"] },
  },
  "Area 2": {
    Manchester: { stores: ["Manchester Arndale", "Manchester Trafford Centre"], big: ["Manchester Arndale"] },
    Liverpool: { stores: ["Liverpool One"] },
    Leeds: { stores: ["Leeds Trinity"], big: ["Leeds Trinity"] },
  },
  "Area 3": {
    Birmingham: { stores: ["Birmingham Bullring"], big: ["Birmingham Bullring"] },
    Coventry: { stores: ["Coventry Central"] },
    Bristol: { stores: ["Bristol Cabot Circus"] },
    Cardiff: { stores: ["Cardiff St Davids"] },
  },
};
const REAL_STORE = "Nottingham West Bridgford";

// --- small helpers -----------------------------------------------------------
function rng(seed: number) {
  // mulberry32: same seed, same demo data every time.
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** UTC instant for a wall-clock time in Europe/London (handles BST/GMT). */
function londonToUtc(y: number, m: number, d: number, h: number, min: number): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
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

function londonToday(): { y: number; m: number; d: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()).split("-").map(Number);
  return { y: p[0]!, m: p[1]!, d: p[2]! };
}

// --- structure ---------------------------------------------------------------
async function ensureStructure() {
  const org =
    (await db.from("organisations").select("id").eq("name", "Asda Travel Money").maybeSingle()).data ??
    must(await db.from("organisations").insert({ name: "Asda Travel Money" }).select("id").single(), "organisation");

  const realPlaceId = process.env.REAL_STORE_PLACE_ID ?? "ChIJN1CJGPXDeUgRessfZdzwNVY";
  const stores: { id: string; name: string; big: boolean }[] = [];

  for (const [areaName, cities] of Object.entries(STRUCTURE)) {
    const area =
      (await db.from("areas").select("id").eq("organisation_id", org.id).eq("name", areaName).maybeSingle()).data ??
      must(await db.from("areas").insert({ organisation_id: org.id, name: areaName }).select("id").single(), areaName);

    for (const [cityName, def] of Object.entries(cities)) {
      const city =
        (await db.from("cities").select("id").eq("area_id", area.id).eq("name", cityName).maybeSingle()).data ??
        must(await db.from("cities").insert({ area_id: area.id, name: cityName }).select("id").single(), cityName);

      for (const storeName of def.stores) {
        const existing = (
          await db.from("stores").select("id").eq("city_id", city.id).eq("name", storeName).maybeSingle()
        ).data;
        // Only the West Bridgford store has a real Place ID; the rest are obvious placeholders.
        const placeId =
          storeName === REAL_STORE ? realPlaceId : `DEMO_${storeName.replace(/[^A-Za-z0-9]/g, "")}_PLACE_ID`;
        const store =
          existing ??
          must(
            await db
              .from("stores")
              .insert({ city_id: city.id, name: storeName, google_place_id: placeId, google_review_url: reviewUrl(placeId) })
              .select("id")
              .single(),
            storeName,
          );
        stores.push({ id: store.id, name: storeName, big: !!def.big?.includes(storeName) });
      }
    }
  }
  return { org, stores };
}

async function ensureTags(stores: { id: string; name: string; big: boolean }[]) {
  const tags: { id: string; storeId: string; code: string }[] = [];
  for (const s of stores) {
    const wanted = s.big ? 2 : 1;
    const { data: existing } = await db
      .from("tags")
      .select("id, public_code, label")
      .eq("store_id", s.id)
      .is("retired_at", null)
      .order("created_at");
    const have = existing ?? [];
    for (const t of have) tags.push({ id: t.id, storeId: s.id, code: t.public_code });
    for (let i = have.length; i < wanted; i++) {
      const label = i === 0 ? `${s.name} tag` : `${s.name} tag ${i + 1}`;
      const row = must(
        await db.from("tags").insert({ store_id: s.id, label, public_code: newPublicCode() }).select("id, public_code").single(),
        label,
      );
      tags.push({ id: row.id, storeId: s.id, code: row.public_code });
    }
  }
  return tags;
}

// --- people ------------------------------------------------------------------
async function ensureUser(email: string, password: string, fullName: string): Promise<string> {
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (created.data.user) return created.data.user.id;
  // Already there: find them and reset the password so .env.local always works.
  const { data: profile } = await db.from("profiles").select("user_id").eq("email", email).maybeSingle();
  if (!profile) throw new Error(`Could not create ${email}: ${created.error?.message}`);
  await db.auth.admin.updateUserById(profile.user_id, { password, ban_duration: "none" });
  await db.from("profiles").update({ is_active: true }).eq("user_id", profile.user_id);
  return profile.user_id;
}

async function ensureMembership(row: Database["public"]["Tables"]["memberships"]["Insert"]) {
  let q = db.from("memberships").select("id").eq("user_id", row.user_id).eq("role", row.role);
  q = row.organisation_id ? q.eq("organisation_id", row.organisation_id) : q.is("organisation_id", null);
  q = row.area_id ? q.eq("area_id", row.area_id) : q.is("area_id", null);
  q = row.store_id ? q.eq("store_id", row.store_id) : q.is("store_id", null);
  const { data } = await q.maybeSingle();
  if (!data) must(await db.from("memberships").insert(row).select("id").single(), "membership");
}

async function ensureLogins(orgId: string, stores: { id: string; name: string }[]) {
  const env = (k: string) => {
    const v = process.env[k];
    if (!v || v.length < 8) throw new Error(`Set ${k} in .env.local (at least 8 characters).`);
    return v;
  };
  const wb = stores.find((s) => s.name === REAL_STORE)!;
  const area1 = must(await db.from("areas").select("id").eq("name", "Area 1").single(), "Area 1");

  const admin = await ensureUser(env("DEMO_ADMIN_EMAIL"), env("DEMO_ADMIN_PASSWORD"), "Demo Admin");
  const am = await ensureUser(env("DEMO_AREA_MANAGER_EMAIL"), env("DEMO_AREA_MANAGER_PASSWORD"), "Demo Area Manager");
  const bm = await ensureUser(env("DEMO_BUREAU_MANAGER_EMAIL"), env("DEMO_BUREAU_MANAGER_PASSWORD"), "Demo Bureau Manager");
  const st = await ensureUser(env("DEMO_STAFF_EMAIL"), env("DEMO_STAFF_PASSWORD"), "Demo Staff");

  await ensureMembership({ user_id: admin, role: "admin", organisation_id: orgId });
  await ensureMembership({ user_id: am, role: "area_manager", area_id: area1.id });
  await ensureMembership({ user_id: bm, role: "bureau_manager", store_id: wb.id });
  await ensureMembership({ user_id: st, role: "staff", store_id: wb.id });
}

// --- events ------------------------------------------------------------------
type EventRow = Database["public"]["Tables"]["tap_events"]["Insert"];

function buildEvents(tags: { id: string; storeId: string }[], storeBase: Map<string, number>): EventRow[] {
  const rand = rng(20261109);
  const rows: EventRow[] = [];
  const now = Date.now();
  const today = londonToday();
  // 180 days, not 90: the dashboard's default 90-day view compares itself with the 90 days
  // before it, and that comparison needs data to be shown. Change this one number to taste.
  const DAYS = 180;

  // weekday multipliers, Sunday=0
  const dow = [0.35, 0.9, 0.9, 1.0, 1.05, 1.5, 1.45];
  // opening-hours weighting: lunchtime and after-work peaks
  const hourWeight: Record<number, number> = { 9: 0.6, 10: 1, 11: 1.2, 12: 1.6, 13: 1.5, 14: 1.1, 15: 1.0, 16: 1.1, 17: 0.5 };

  for (let back = DAYS - 1; back >= 0; back--) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d - back));
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
    const weekday = day.getUTCDay();
    const trend = 1 + 0.4 * ((DAYS - back) / DAYS); // gentle upward drift, +40% over 90 days
    const hours = weekday === 0 ? [10, 11, 12, 13, 14, 15] : weekday === 6 ? [9, 10, 11, 12, 13, 14, 15, 16] : [9, 10, 11, 12, 13, 14, 15, 16, 17];
    const totalWeight = hours.reduce((s, h) => s + (hourWeight[h] ?? 1), 0);

    for (const tag of tags) {
      const expected = (storeBase.get(tag.storeId) ?? 4) * dow[weekday]! * trend * (0.8 + rand() * 0.4);
      const n = Math.max(0, Math.round(expected));
      for (let i = 0; i < n; i++) {
        // pick an hour by weight
        let r = rand() * totalWeight, hour = hours[0]!;
        for (const h of hours) {
          r -= hourWeight[h] ?? 1;
          if (r <= 0) { hour = h; break; }
        }
        const at = londonToUtc(y, m, d, hour, Math.floor(rand() * 60));
        if (at.getTime() > now) continue; // no events in the future
        const duplicate = rand() < 0.03;
        const bot = !duplicate && rand() < 0.02;
        rows.push({
          tag_id: tag.id,
          store_id: tag.storeId,
          method: rand() < 0.55 ? "nfc" : "qr",
          occurred_at: at.toISOString(),
          visitor_hash: Math.floor(rand() * 0xffffffffff).toString(16).padStart(10, "0"),
          is_duplicate: duplicate,
          is_bot: bot,
          is_demo: true,
        });
      }
    }
  }
  return rows;
}

async function main() {
  console.log("Structure…");
  const { org, stores } = await ensureStructure();
  const tags = await ensureTags(stores);
  console.log(`  ${stores.length} stores, ${tags.length} tags`);

  console.log("Demo logins…");
  await ensureLogins(org.id, stores);

  console.log("Demo events (replacing any earlier demo events)…");
  const removed = await resetDemoEvents(db);
  // Bigger stores get more traffic; the real card's store gets a healthy middle.
  const base = new Map<string, number>();
  stores.forEach((s, i) => base.set(s.id, s.big ? 7 : 3 + (i % 4)));
  const rows = buildEvents(tags, base);
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from("tap_events").insert(rows.slice(i, i + 1000));
    if (error) throw new Error(`Insert failed: ${error.message}`);
  }
  console.log(`  removed ${removed} old, inserted ${rows.length} new demo events`);

  const wb = stores.find((s) => s.name === REAL_STORE)!;
  const wbTag = tags.find((t) => t.storeId === wb.id)!;
  const base_url = (process.env.PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  console.log(`\nYour physical card (Nottingham West Bridgford):`);
  console.log(`  NFC address: ${base_url}/t/${wbTag.code}`);
  console.log(`  QR address:  ${base_url}/q/${wbTag.code}`);
  console.log("Done. Demo logins are in .env.local.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
