# 04 Modules

Each part of the app lives in its own folder. This page says what each one is for and how to change it safely. Modules not yet built are marked.

| Module | Where | Status |
| --- | --- | --- |
| Redirect | `app/t`, `app/q`, `lib/redirect` | Built (milestone 3) |
| Access control | `supabase/migrations`, `lib/auth/roles.ts` | Built (milestones 2 and 4) |
| Analytics | `supabase/migrations/..003`, `lib/analytics` | Built (milestones 3 and 6) |
| Auth and invites | `app/login`, `app/set-password`, `app/auth`, `lib/auth`, `proxy.ts`, `app/(dashboard)/people` | Built (milestone 4) |
| Organisation structure | `app/(dashboard)/structure` | Built (milestone 5) |
| Tags and QR | `app/(dashboard)/tags`, `app/api/qr` | Built (milestone 5) |
| Demo data | `scripts/seed-demo.ts`, `scripts/reset-demo.ts` | Built |
| Overview and tap board, Store detail | `app/(dashboard)/overview`, `app/(dashboard)/stores/[id]`, `components/dashboard`, `components/charts`, `app/api/live` | Built (milestone 6) |
| Insights, Audit | | Later (optional) |

## Redirect

**Purpose:** the only code a customer touches. **Files:** `app/t/[code]/route.ts` (NFC), `app/q/[code]/route.ts` (QR), `lib/redirect/handle.ts` (the logic), `bots.ts` (crawler list), `hash.ts` (anonymous visitor fingerprint), `url.ts` (Google link allowlist).

**How it works:** one database query finds the tag and its store. If anything is missing or off it redirects to `/inactive`. Otherwise it answers with a 302 to Google, then, after the response, records the tap, marking bots by user agent and repeat taps (same visitor, same tag, 30 minutes).

**Changing it safely:** keep it to one query and no extra libraries; never log before the redirect; never change a `public_code`. Run `npm test` afterwards.

## Auth and invites

**Purpose:** invitation-only sign-in, and a dashboard that shows each role only what it may use.

**Files**

- `proxy.ts`: runs before dashboard pages; sends signed-out visitors to `/login`. It skips `/t` and `/q` so customers never pay for it.
- `app/login`: email and password form. Wrong details give one plain message that doesn't reveal which part was wrong. A switched-off account is signed straight out.
- `app/auth/confirm`: invitation links land here, swap their one-time token for a session and continue to `/set-password`.
- `app/set-password`: the invited person chooses a password (10+ characters).
- `app/auth/signout`, `app/auth/inactive`: sign out; and the clean-up point for anyone whose login was switched off or has no role (it clears their cookie so there is no redirect loop).
- `lib/auth/session.ts`: `getSession()` / `requireSession()` return who is signed in, their name, organisation and roles. Every dashboard page calls `requireSession()`.
- `lib/auth/roles.ts`: pure rules: which roles each person may hand out, who may switch whom off, and which menu items each role sees. Unit-tested in `tests/roles.test.ts`.
- `app/(dashboard)/layout.tsx`, `components/dashboard/nav.tsx`: the shell: sidebar on desktop, bottom bar on phones.
- `app/(dashboard)/people`: invite someone and switch people on or off.

**How an invitation works.** The inviter fills in name, email, role and area or store. The server action checks their rights (`canGrant`), then uses the secret key to create the login and its role, and records it in the audit log. No email is sent: the inviter gets a one-time link to pass on, which avoids depending on email delivery limits. The database independently blocks anyone from writing roles from the browser.

**Who can invite whom**

| Inviter | Can invite |
| --- | --- |
| Admin | Any role, anywhere |
| Area manager | Bureau managers and staff, in their own areas |
| Bureau manager | Staff, in their own stores |
| Staff | Nobody |

Switching a person off sets `is_active = false`, bans the login in Supabase so no new sessions start, and keeps their history. You can't switch yourself off, or anyone at your own level or above (admins excepted).

**Changing it safely:** to add a menu item, add it to `NAV` in `lib/auth/roles.ts` and set `built: true` only once its page exists. Never write memberships from anywhere except the server actions in `people/actions.ts`.

## Organisation structure

**Purpose:** create and edit areas, cities and stores, including each store's Google link. **Files:** `app/(dashboard)/structure/page.tsx` (the page) and `actions.ts` (the saves).

- Admins add and edit areas, cities and stores anywhere. Area managers add and edit cities and stores inside their own areas. Bureau managers and staff don't see this page.
- A store's Google link comes from its **Place ID** (built into `https://search.google.com/local/writereview?placeid=…`) or from a **pasted Google review link**. Only HTTPS links on Google's own addresses are accepted, checked three times: in the form (`lib/redirect/url.ts`), in the database (a constraint on `stores`), and again at the moment of every tap.
- Each store has a **Test review link** (opens Google in a new tab) and a link to Google's Place ID Finder.
- Stores are switched off, never deleted, so their history stays.
- Saves run as the signed-in person, so the database's access rules decide, and a refused save gives a plain message.

## Tags and QR

**Purpose:** create tags, give them their NFC address and QR code, and manage their life. **Files:** `app/(dashboard)/tags/page.tsx`, `actions.ts`; `app/api/qr/[code]/route.ts`; `lib/codes.ts` (code generator).

- **Create:** pick a store; the tag is named "<store> tag" unless you type another name. Its code is 10 random letters and numbers from a cryptographic source.
- **NFC address** `<PUBLIC_APP_URL>/t/<code>` (with a Copy button) is what you write to the chip. **QR code** encodes `<PUBLIC_APP_URL>/q/<code>`, so scans and taps are counted separately.
- **QR downloads:** SVG (best for printing) and a 1024-pixel PNG, both with a quiet border, at `/api/qr/<code>?format=svg|png&download=1`. Only signed-in people who can see the tag can fetch them.
- **Test NFC link / Test QR link** open the real address in a new tab. They count as a real tap or scan.
- **Rename, switch on/off, move, retire.** Moving keeps the printed card valid; past taps stay with the store they were made at. Retiring asks for confirmation and is permanent: the card then shows "not active", and the tag can never be switched on again.
- Counts on each card are the last 30 days of NFC taps and QR scans (duplicates and bots excluded).

## Analytics, Overview and Store detail

**Purpose:** answer "how are customers engaging, and where?" at a glance, and update live when someone taps a card.

**Files**

- `lib/analytics/filters.ts`: turns the address (`?range=30d&area=…&method=nfc`) into validated filters, and works out the equally long *previous period* used for the change figures. Bad or hand-edited values fall back safely.
- `lib/analytics/aggregate.ts`: adds stores up into cities and areas at the moment they're shown (never stored), and sorts. `lib/analytics/queries.ts`: the database calls. `lib/analytics/page-helpers.ts`: small helpers that keep an address honest (a person can't select a store they can't see).
- `components/dashboard/tap-board.tsx`: the green rate-board panel. `kpi-tiles.tsx`, `filters-bar.tsx`, `comparison-table.tsx`. `components/charts/daily-chart.tsx`, `heatmap.tsx`.
- `app/api/live/route.ts`: the polling endpoint.

**What's on the Overview:** the tap board (today's count in the dot-matrix font and the latest taps), filters (Today, 7, 30, 90 days or custom; area, city, store, method; all in the web address so a view can be shared or bookmarked), six tiles with change against the previous period, a daily NFC-vs-QR chart, and a sortable comparison table that can group by store, city or area. A "Demo data" badge shows whenever demo events are in view. Each person's filter lists contain only the areas, cities and stores their role allows.

**Store detail** (`/stores/<id>`): the same board and tiles for one store, plus the day-by-hour grid, that store's tags with counts and QR downloads. A store you may not see is simply "not found".

**How the live feed works:** the page listens on Supabase Realtime for new rows in `tap_events` (the database's access rules decide which rows reach you). Bots and repeat taps are left out. A new tap appears in about a second, lights its row once, bumps today's count, and a moment later the tiles, chart and table refresh. If Realtime can't connect (venue Wi-Fi sometimes blocks it), the board says "Updating every 15 seconds" and polls instead. You can force that mode by adding `&live=poll` to the Overview address.

**Accessibility:** every chart has a text summary and a "View as a table"; sorting buttons announce their state; the table and heatmap use real headings; colour is never the only signal (NFC is a solid line, QR is dashed).

**Wording:** taps and scans are always "interactions" or "intent to review", never reviews. There are no targets, ranks or leaderboards; the table starts in alphabetical order.

**Changing it safely:** add a new filter in `filters.ts` first (with a test), then pass it through `rpcArgs`.
