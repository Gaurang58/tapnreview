/**
 * Builds `.env.vercel`: the five settings the live site needs, copied from your
 * `.env.local`, with the public address pointed at the Vercel site. You then drag
 * that file into Vercel (Project, Settings, Environment Variables). The file stays on
 * your computer and is ignored by git. Nothing is printed or sent anywhere.
 *
 *   npm run vercel:env                       (uses https://tapnreview-chi.vercel.app)
 *   npm run vercel:env -- https://my.domain  (a different public address)
 */
import { chmodSync, writeFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const publicUrl = (process.argv[2] ?? "https://tapnreview-chi.vercel.app").replace(/\/+$/, "");
if (!/^https:\/\/[^\s/]+$/.test(publicUrl)) {
  console.error("The public address must start with https:// and have no path, e.g. https://tapnreview-chi.vercel.app");
  process.exit(1);
}

const wanted = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "VISITOR_HASH_SALT",
] as const;

const missing = wanted.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing from .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const lines = [`PUBLIC_APP_URL=${publicUrl}`, ...wanted.map((k) => `${k}=${process.env[k]}`)];
writeFileSync(".env.vercel", lines.join("\n") + "\n", { mode: 0o600 });
chmodSync(".env.vercel", 0o600);

console.log(`Wrote .env.vercel with ${lines.length} settings (values not shown):`);
for (const l of lines) console.log("  " + l.split("=")[0]);
console.log(`\nPUBLIC_APP_URL is ${publicUrl}`);
console.log("Next: Vercel, Project, Settings, Environment Variables, then drag .env.vercel into the box.");
