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

## 5 November 2026: milestone 4, sign-in, invite-only accounts, role-aware navigation

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

## 5 November 2026 (night): demo seed, live tests, real sign-in

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

## 5 November 2026 (late): milestone 5, structure, tags and QR

**Built**

- **Areas and stores** (`/structure`): add and edit areas (admin), cities and stores (admin, and area managers within their areas); each store has a Place ID or a pasted Google link, a Test review link and a link to Google's Place ID Finder.
- **Tags** (`/tags`): create (named after the store by default), rename, switch on/off, move, retire with a confirmation; NFC address with Copy; Test NFC link and Test QR link; QR as SVG and PNG; last-30-day counts.
- **QR route** (`/api/qr/<code>`): signed-in only, scoped by the database's access rules.
- Shared pieces: code generator (`lib/codes.ts`), review-link resolver, London date helpers, a form wrapper with success and error messages.
- Migrations 7 and 8, applied to Supabase: the database itself now refuses non-Google review links, and a retired tag can never be switched on.

**Decision: test links count as real taps.** They go through the real redirect so they prove the whole path, and the buttons say so. (The alternative, a silent test mode, would not prove the logging works.)

**Problems found by using it, and fixed**

- *A failed save wiped what the person had typed* (React clears forms after every action, even a failed one). A wrong Google link would have emptied the whole store form. The wrapper no longer resets on errors; the login and invite forms got the same fix.
- *A scam-link gap:* the database only checked "starts with https", so a compromised login could have used the API to point a store at any site. Now enforced in the database (migration 7) as well as the app and at every tap.
- Navigation test updated for the new menu items.

**Checked against the live project (local build, real logins)**

- Tags page: 15 cards, all 15 QR images load, counts scoped to 30 days.
- QR downloads: correct file types and names; unknown and malicious codes give 404. The PNG, decoded by the browser's barcode reader, reads `…/q/<code>`, i.e. the scan address.
- Created a tag (default name), renamed it, moved it to another store, switched it off (card shows "not active"), on again (redirects to Google), and retired it (confirmation shown; card shows "not active"; appears under Retired).
- **The redirect logged a real tap against the tag's new store**, with `no-store` and a 302 to Google. A second scan from the same phone was marked a duplicate, and a WhatsApp preview was marked a bot.
- Structure: a scam link was refused with a plain message and the typed values were kept; a store created from a Place ID got the standard Google link and a Test review link.
- Area manager login: sees only Area 1, with no add or edit area controls; sees the new city.
- Wrong password: clear message and the email is kept.
- Test data (tag, its three test events, store, city) was then removed: back to 3 areas, 10 cities, 12 stores, 15 tags and no real events.

**Automated checks:** lint and typecheck clean; 34 unit tests; local database suite passes; 19 live-API tests (two new: scam links refused through the API, retired tags stay off).

**Not covered:** the NFC chip itself (needs your phone); mobile-width and accessibility checks of these two pages (planned for the final pass); sign-in is slow (about 5 to 8 seconds) from this machine, likely distance to the database plus three sequential calls, to be measured on Vercel.

## 5 November 2026 (night): milestone 6, Overview, Store detail and the live feed

**Built**

- **Overview** (`/overview`): tap board, filters in the address (date range, area, city, store, method), six KPI tiles with change against the previous period, a daily NFC-vs-QR line chart, and a sortable comparison table grouped by store, city or area (city and area figures are summed from stores when shown). "Demo data" badge, skeleton loading and plain empty states.
- **Store detail** (`/stores/<id>`): the same board and tiles for one store, day-of-week by hour heatmap, tags with counts and QR downloads.
- **Live feed:** Supabase Realtime, with a 15-second polling fallback (`/api/live`) and a `?live=poll` switch to force it.
- Migration 9, applied: the read rules on events, tags and stores were rewritten to be fast.
- Seed now creates 180 days of events (was 90) so the default 90-day view has a previous period to compare with; real taps are untouched by reseeding.

**Problems found by using it, and fixed**

1. **The Overview timed out for the admin.** The database's read rule ran a heavy check once per event row (about 1 ms each); at 9,000 events that was 8.7 seconds, past Postgres's time limit. Staff logins hid it because they see very few rows. Fixed with migration 9 (same rule, evaluated once per query): the heaviest query went from timeout to 24 ms. A live test now guards it. This would have failed in front of the head of marketing.
2. **Tap board clipped on phones:** long store names pushed the NFC/QR label off the panel. Names now shorten with an ellipsis.
3. **Filters lost on sign-in:** when a signed-out visitor was sent to the login page, the page's filters (`?range=7d…`) were dropped. They are now kept, so a shared or bookmarked view survives signing in.
4. **Default view showed "no data to compare"** because only 90 days existed: fixed by seeding 180 days.
5. Earlier build-log entries were dated 6 November in error; the date is 5 November. Corrected.

**Verified against the live project (local build, real logins)**

- *Live feed:* tapped the physical card's NFC address from the command line; within 3 seconds the board showed "NOTTINGHAM WEST BRIDGFORD NFC" at the top, lit up, and today's count went 123 to 124. A QR scan from a different phone appeared the same way. A WhatsApp link preview did not appear. The KPI tiles refreshed by themselves (8,733 to 8,735 total interactions).
- *Polling fallback* (`?live=poll`): board read "Updating every 15 seconds"; a tap at 23:42:36 was on the board by 23:42:54.
- *Staff login:* filter lists contain only Area 1, Nottingham and West Bridgford; board, tiles and table show only that store; another store's page is a 404; a hand-edited `?store=` for a store they can't see is ignored.
- *Store detail:* board scoped to the store, tiles with change figures, chart, heatmap and tag table all render.
- *Phone width (375 px):* no sideways scrolling, bottom navigation, board readable (visually checked after the fix).

**Automated checks:** lint and typecheck clean; 45 unit tests; local database suite (95 checks) passes; 20 live-API tests pass.

**About the test browser:** it discards cookies whenever the local server restarts (a harmless plain test cookie vanished the same way), so I had to sign in again after each rebuild. It is a quirk of the tool, not of the app.

**Not yet covered:** an automated accessibility scan and a manual keyboard pass over the new pages; the Insights page (heatmap across a whole scope, CSV export) and Audit log (milestone 9, optional); the Vercel deploy and the real card (milestone 8). Browsers other than the in-app one, and a real phone, have not been tried.

## 5 November 2026 (night): milestone 8 preparation, deployment

**Done**

- `vercel.json` pins the site to London (`lhr1`), next to the database. Vercel's default is Washington, which would add a transatlantic delay to every database call (the redirect, the sign-in, every dashboard query).
- `npm run build` now runs `next build --webpack`. That is the build I could verify here; the default (Turbopack) production build could not run in my sandbox, so its behaviour on Vercel was unproven. It can be switched back once it has been run elsewhere.
- `npm run vercel:env` writes `.env.vercel` from `.env.local` with the public address changed to the Vercel site (five settings; values never printed; file readable only by you; ignored by git) for dragging into Vercel's Environment Variables box.
- Docs: deployment steps in `docs/01-setup.md`.

**Blocked on you (not something I could or should do)**

- *Creating the Vercel project from the repository* failed: the Vercel account has no GitHub login connection. That has to be done by you in the Vercel dashboard (steps in `docs/01-setup.md`). The account has one team and no projects, so the old `tap-review-mvp` is not there and was not touched.
- *Entering the Supabase secret key into Vercel* and *switching off public sign-ups in Supabase* are both things I must not do for you (entering keys into a service, changing a security setting). The first is one drag and drop; the second is one switch.

**Not yet done:** the deployment itself, checking the live address, rewriting the card's NFC chip, printing the new QR sticker, and running the demo flow on the live site.
