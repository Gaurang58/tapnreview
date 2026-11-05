/**
 * Removes every demo tap event (is_demo = true). Real taps, tags, stores and
 * logins are left alone. Safe to run at any time: `npm run seed:reset`.
 */
import { adminClient } from "./lib/common";

export async function resetDemoEvents(db = adminClient()): Promise<number> {
  const { count, error } = await db.from("tap_events").delete({ count: "exact" }).eq("is_demo", true);
  if (error) throw new Error(`Could not remove demo events: ${error.message}`);
  return count ?? 0;
}

if (process.argv[1]?.endsWith("reset-demo.ts")) {
  resetDemoEvents()
    .then((n) => console.log(`Removed ${n} demo events. Real taps were not touched.`))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
