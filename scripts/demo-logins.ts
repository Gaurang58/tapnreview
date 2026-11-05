/**
 * Prints the four demo logins (and what each can see) from .env.local, so you
 * can sign in without opening the file. Output goes only to your terminal.
 * `npm run demo:logins`
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const people = [
  { role: "Admin", key: "ADMIN", sees: "Everything: all 3 areas, 12 stores, People, Areas and stores, Tags" },
  { role: "Area manager", key: "AREA_MANAGER", sees: "Area 1 only (Nottingham x2, Leicester, Derby); can edit its cities, stores, tags and invite below them" },
  { role: "Bureau manager", key: "BUREAU_MANAGER", sees: "Nottingham West Bridgford only; can manage its tags and invite Staff there" },
  { role: "Staff", key: "STAFF", sees: "Nottingham West Bridgford figures only; can change nothing" },
];

const base = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
console.log(`\nSign in at ${base}/login\n`);
for (const p of people) {
  const email = process.env[`DEMO_${p.key}_EMAIL`];
  const password = process.env[`DEMO_${p.key}_PASSWORD`];
  if (!email || !password) {
    console.log(`${p.role}: missing DEMO_${p.key}_EMAIL / _PASSWORD in .env.local (then run npm run seed:demo)\n`);
    continue;
  }
  console.log(`${p.role}\n  email:    ${email}\n  password: ${password}\n  sees:     ${p.sees}\n`);
}
