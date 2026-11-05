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

## 6 November 2026: milestone 4, sign-in, invite-only accounts, role-aware navigation

**Built**

- Sign-in (`/login`), set-password (`/set-password`), invitation landing (`/auth/confirm`), sign-out, and a clean-up route for switched-off logins (`/auth/inactive`).
- Session helpers (`requireSession`), pure role rules (`lib/auth/roles.ts`) with 10 unit tests, dashboard shell (sidebar on desktop, bottom bar on phones), an Overview placeholder that lists the areas and stores the signed-in role can see, and a People page with invite and switch-on/off.
- Invitations use the Supabase admin API through a server action that checks the inviter's rights first and writes an audit entry. They produce a one-time link for the inviter to pass on rather than sending email (see decision below).

**Decisions**

- *No invitation email.* Supabase's built-in email is rate-limited on the free plan and needs template changes to work with this app's sign-in flow. Showing a copyable one-time link is more reliable for a demo; sending email can be added later without changing the rules.
- *Password minimum is 10 characters,* checked in the app.
- *Navigation lists only built pages,* so no link leads to a 404 (`built` flag in `NAV`).

**Problems found and fixed**

- A redirect loop was possible: the proxy sends signed-in people away from `/login`, and a page can't clear a cookie. Switched-off or role-less users now go through `/auth/inactive`, a route that signs out first.
- While smoke-testing, `/t/<code>` returned a raw 500 when the secret key was missing. The handler now catches any failure and shows the friendly "card isn't active" page; a unit test covers it.

**Checked**

`npm run lint`, `npm run typecheck`, 27 unit tests and `next build --webpack` pass. Against the built app: `/overview`, `/people` and `/set-password` redirect signed-out visitors to `/login`; the login page shows the right notices; a bad invitation link is rejected; `/t/…` and `/q/…` show the friendly page for an unknown code.

**Not yet verified (needs the secret key and seeded logins):** signing in as each role, a full invitation, and switching someone off. These are covered by the demo seed in milestone 7. `.env.local` was created with the project URL and publishable key only; `SUPABASE_SECRET_KEY` is blank and must be pasted in by you.

**Still to do in the Supabase dashboard:** switch off public sign-ups and raise the minimum password length (see `docs/01-setup.md`).

## 6 November 2026 (night): demo seed, live tests, real sign-in

The secret key was added to `.env.local`, so the seed (planned for milestone 7) was built early to allow live testing.

**Built:** `scripts/seed-demo.ts`, `scripts/reset-demo.ts`, `scripts/lib/common.ts`. The seed is repeatable (same pattern every time) and idempotent. Demo logins' passwords were generated into `.env.local` (not committed). Ran against the live project: 3 areas, 10 cities, 12 stores, 15 tags, 4 logins, 9,183 demo events.

**Data shape checked in SQL:** 54% NFC; Saturday and Friday busiest, Sunday quietest; taps only between 09:00 and 17:59 London time; latest 30 days about 29% higher than the oldest 30; 279 duplicates and 171 bots flagged; no real (non-demo) events.

**Live test found a real bug.** `npm run test:access` passed 17 of 18; the failure was an area manager adding a city and asking for the new row back (what the app does): refused by Row Level Security, because the read-policy helper looked the new row up in a snapshot that does not contain it yet. The same flaw affected stores. Fixed in migration `..006` (applied to Supabase and added to `supabase/migrations`), and `npm run test:db` now has four "insert and read it back" cases, which fail without the fix and pass with it. After the fix: 18 of 18 live tests pass. The tests now delete the few rows they create.

**Real sign-in checked in a browser (local build against the live project):**
- Signed out visitors are sent to `/login` and returned to the page they wanted after signing in.
- Staff login: sees only Area 1 and Nottingham West Bridgford; `/people` is a 404.
- Admin login: People page lists all four demo logins; no switch-off button on their own row.
- Full invitation: admin created an invitation, the one-time link signed the invitee in, a too-short password was refused with a clear message, a valid one was accepted, and the new person landed as Staff at their store only.
- Switching a login off ended an open session at the next page load, with the "switched off" notice and no redirect loop.
- The test invitee was deleted afterwards (4 profiles remain).

**Small change:** the invite form now defaults to the lowest role instead of Admin.

**Not exercised in a browser:** the "Switch off" button itself (a confirmation dialog); its rules are unit tested and the same database changes were applied by script.

**Demo logins** were shown in this session's tool output while testing. They are local demo passwords; change them (re-run the seed after editing `.env.local`) before any real pilot.
