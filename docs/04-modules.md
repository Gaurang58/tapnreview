# 04 Modules

Each part of the app lives in its own folder. This page says what each one is for and how to change it safely. Modules not yet built are marked.

| Module | Where | Status |
| --- | --- | --- |
| Redirect | `app/t`, `app/q`, `lib/redirect` | Built (milestone 3) |
| Access control | `supabase/migrations`, `lib/auth/roles.ts` | Built (milestones 2 and 4) |
| Analytics | `supabase/migrations/..003`, `lib/analytics` | SQL built; app wrappers in milestone 6 |
| Auth and invites | `app/login`, `app/set-password`, `app/auth`, `lib/auth`, `proxy.ts`, `app/(dashboard)/people` | Built (milestone 4) |
| Structure, Tags and QR, Overview, Store detail, People, Audit, Demo data | | Later milestones |

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
