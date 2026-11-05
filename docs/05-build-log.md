# 05 Build log

A dated record of what was built, the commands run, decisions made and problems hit. Newest entries at the bottom.

## 5 November 2026: picking up the earlier partial build

**Situation.** An earlier session had produced a partial build in `/Users/gaurang/tapnrewiew` (not a git repository). The new folder `tapnreview` started empty apart from a git repository linked to `https://github.com/Gaurang58/tapnreview` with no commits. The GitHub repository was also empty. The earlier folder was copied across with `rsync` (excluding `node_modules`, `.next`, `.git`), including hidden files; a recursive `diff` confirmed the copy identical. The original folder was not changed. The first commit records the import exactly as found; fixes are in later commits.

**Nothing has been applied to Supabase and nothing has been pushed to GitHub.**

### What was found, against the build prompt

**Done and matching the prompt**

- Migration 1 matches the prompt's schema exactly: same tables, columns, types, check constraints, foreign keys with `on delete restrict`, unique constraints and the three required indexes. Extras: `updated_at` triggers, a guard that stops a printed `public_code` changing and stops a retired tag being revived, a trigger creating a profile for each new login, an `is_demo` partial index, and adding `tap_events` to the Realtime publication.
- Migration 2 (roles and RLS): all nine tables have RLS; helper functions are `security definer` with a fixed search path; policies follow the prompt's access table; no signed-in user can write `tap_events` or `memberships`; profile email and active status are protected; audit triggers tag entries with the area so area managers see their own.
- Migration 3: seven analytics functions that run with the caller's rights, group by London day, exclude duplicates and bots by default and return zero-filled days.
- Redirect: `/t/[code]` and `/q/[code]`, one 302 to Google with `no-store`, logging after the response via `after()`, bot and 30-minute duplicate marking, friendly inactive page, Google-host allowlist, daily-salted visitor hash with no raw IP.
- Scaffold: Next.js 16, strict TypeScript, Tailwind 4, lint, `.env.example`, session proxy that skips `/t` and `/q`, design tokens and fonts from the mockups, UI primitives, home page.
- `npm run lint` and `npm run typecheck` pass.

**Incomplete (not started or empty)**

- `README.md` and every file in `docs/` (the folder was empty); `scripts/` was empty (no seed or reset); `public/` empty.
- No sign-in, set-password, dashboard layout, navigation or role helpers (milestone 4); no structure/tags pages or QR route (5); no analytics wrappers or Overview (6); no seed (7).
- No `package-lock.json`; no `supabase/config.toml` (needed before `supabase link`).
- Dark mode: the CSS expects a `.dark` class set by a theme toggle that doesn't exist yet.
- The API-level access tests (`supabase/tests/access.test.ts`) need a live project and the demo seed, so they could not run.

**Mismatches and weaknesses found, and what was done**

| Finding | Action |
| --- | --- |
| `npm test` also tried to run the live-project access tests and failed without credentials | Split into two Vitest configs; `npm test` is unit tests only, `npm run test:access` is the live API test |
| `lib/env.ts` threw at import time, so `next build` would fail on any machine without secrets | Made the values read lazily |
| Redirect made two sequential database queries | Now one query (tag with its store); types updated with the relationship |
| Bot list included `snapchat` and `viber`, which also appear in real customers' in-app browsers and would have hidden genuine taps | Removed; real preview fetchers are still caught by the generic `bot` and `preview` patterns |
| `profiles_guard` would error if the JWT claims setting were an empty string | Added `nullif` |
| Helper `area_id_for_store` was callable by anonymous users through the API (it reveals which area a store is in) | Revoked from public and anon (edited in place in migration 2, which had not been applied) |
| Only unit tests of bots/hash/URL existed; no test of the handler itself | Added `tests/handle.test.ts` (11 cases: redirect, no-store, QR vs NFC, bots, duplicates, six inactive cases, bad codes, no raw IP stored) |
| Access tests existed only as API tests needing a live project | Added `npm run test:db`: applies the three migrations to a throwaway local Postgres and runs 85 assertions as each role (see `docs/07-testing.md`) |

### Migration check against the prompt's schema and access rules

All three migrations were applied in order to a throwaway local Postgres (with stand-ins for Supabase's roles and `auth` schema) and exercised as anonymous, staff, bureau manager, area manager, admin and a deactivated user. Every assertion passed after the fixes above. Specifically confirmed: staff see and write nothing beyond their own store and name; bureau managers cannot create or move tags outside their store; area managers are confined to their area for cities, stores, tags and audit; nobody signed in can insert tap events or memberships; printed codes cannot change; nothing can be hard-deleted; London-day grouping puts a 23:30 UTC summer tap on the next day.

Not yet verified (needs the real project): that Supabase accepts the migrations as-is (Postgres 15+ is required for `unique nulls not distinct`; Supabase uses newer), that Realtime publishes `tap_events`, and the live API tests.

### Environment notes

- `npm install` needed a temporary cache folder (`--cache $TMPDIR/...`) because `~/.npm` has root-owned files. To fix permanently: `sudo chown -R 501:20 ~/.npm`.
- The default (Turbopack) `next build` fails in the sandboxed session because it needs to open a local port; `next build --webpack` succeeds. It should be fine on your own terminal and on Vercel.

## 5 November 2026 (evening): migrations applied to Supabase

**Approved by Gaurang** after reviewing the migration check above. Applied to project `lmwinllphnamjotliwkw` (tapnreview, London `eu-west-2`, Postgres 17), which was confirmed empty first (no tables, no migrations).

**What was applied, in order**

| Migration | Contents |
| --- | --- |
| `schema` | Tables, indexes, triggers, RLS switched on, Realtime on `tap_events` |
| `access` | Helper functions and all access policies, audit triggers |
| `analytics` | The seven analytics functions |
| `harden_functions` (new, file `..004`) | Found by Supabase's security advisor: trigger functions no longer callable from the API; search path pinned on four plain functions |
| `lock_internal_helper` (new, file `..005`) | `area_id_for_store` is internal only |

**Verified on the live project:** 9 tables, all with RLS on; 20 policies; `tap_events` is in the Realtime publication; anonymous users can call no helper that exposes data. All five migrations were also run through `npm run test:db` locally (85 checks pass).

**Remaining advisor warnings (16, deliberate).** Supabase warns that signed-in users can call the access-rule helpers (`is_admin`, `can_view_store` and so on) through the API. These must be callable by signed-in users because the row-level policies use them, and each only answers a question about the caller's own access.

**Note on migration history.** Applying through the Supabase tool recorded versions `20261105224342` to `...224508`-style timestamps, different from the filenames in `supabase/migrations/`. If `supabase db push` is used later it may try to re-apply them; run `supabase migration repair` first or keep applying through the tool. Two filenames (`..004`, `..005`) were written after the first three were applied.

**Not yet done:** the live API access tests (`npm run test:access`) wait for the demo seed (milestone 7); nothing has been pushed to GitHub.
