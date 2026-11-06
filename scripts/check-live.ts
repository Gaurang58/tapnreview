/**
 * A quick health check of the deployed site that needs no login. Run it before a demo:
 *
 *   npm run check:live                         (checks PUBLIC_APP_URL from .env.local)
 *   npm run check:live -- https://other.site   (checks another address)
 *
 * It sends ONE request to the card's address using a link-preview user agent, so it is
 * logged as a bot and never counted in the figures.
 */
import { config as loadEnv } from "dotenv";
import { adminClient } from "./lib/common";

loadEnv({ path: ".env.local", quiet: true });

const base = (process.argv[2] ?? process.env.PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Give the site address: npm run check:live -- https://your-site.vercel.app");
  process.exit(1);
}

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
const check = (name: string, ok: boolean, detail = "") => results.push({ name, ok, detail });

async function get(path: string, init: RequestInit = {}) {
  const started = Date.now();
  const res = await fetch(base + path, { redirect: "manual", ...init });
  return { res, ms: Date.now() - started, text: res.status < 300 ? await res.text() : "" };
}

async function main() {
  console.log(`\nChecking ${base}\n`);

  const home = await get("/");
  check("Home page loads", home.res.status === 200, `status ${home.res.status}`);
  check("It is the new app, not the old MVP", home.text.includes("Tap Review") && !home.text.includes("Tap Review MVP"));

  const login = await get("/login");
  check("Sign-in page loads", login.res.status === 200 && /invitation only|already signed in/.test(login.text));

  const guarded = await get("/overview");
  check(
    "Dashboard is closed to signed-out visitors",
    guarded.res.status >= 300 && guarded.res.status < 400 && (guarded.res.headers.get("location") ?? "").includes("/login"),
    `status ${guarded.res.status}`,
  );
  const guardedPeople = await get("/api/live");
  check("Live feed endpoint refuses signed-out visitors", [307, 401].includes(guardedPeople.res.status), `status ${guardedPeople.res.status}`);

  const unknown = await get("/t/NoSuchCode" + Math.random().toString(36).slice(2, 8));
  check(
    "An unknown card shows the friendly page",
    unknown.res.status === 302 && (unknown.res.headers.get("location") ?? "").endsWith("/inactive"),
    `status ${unknown.res.status}`,
  );

  // The real card: compare against what the database says it should open.
  const db = adminClient();
  const { data: store } = await db.from("stores").select("id, google_review_url").eq("name", "Nottingham West Bridgford").maybeSingle();
  const { data: tag } = store
    ? await db.from("tags").select("public_code").eq("store_id", store.id).is("retired_at", null).eq("is_active", true).order("created_at").limit(1).maybeSingle()
    : { data: null };
  if (store && tag) {
    const card = await get(`/t/${tag.public_code}`, { headers: { "user-agent": "TapReviewHealthCheck link-preview bot" } });
    const where = card.res.headers.get("location") ?? "";
    check("The card's address opens the West Bridgford Google page", card.res.status === 302 && where === store.google_review_url, `goes to ${where.slice(0, 70)}`);
    check("It is not cached", (card.res.headers.get("cache-control") ?? "").includes("no-store"));
    check("The card answers quickly (under 1.5 s)", card.ms < 1500, `${card.ms} ms`);
    console.log(`Card address: ${base}/t/${tag.public_code}\n`);
  } else {
    check("Found the West Bridgford card in the database", false, "run npm run seed:demo");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const s = (await (await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })).json()) as { disable_signup?: boolean };
    check("Public sign-ups are switched off in Supabase", s.disable_signup === true);
  }

  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
  }
  console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
  console.log("Not covered (needs a sign-in): the dashboard itself and the address shown on the Tags page.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
