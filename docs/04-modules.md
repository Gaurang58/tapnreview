# 04 Modules

Each part of the app lives in its own folder. This page says what each one is for and how to change it safely. Modules not yet built are marked.

| Module | Where | Status |
| --- | --- | --- |
| Redirect | `app/t`, `app/q`, `lib/redirect` | Built (milestone 3) |
| Access control | `supabase/migrations`, `lib/auth/roles.ts` | Database rules built; app helpers in milestone 4 |
| Analytics | `supabase/migrations/..003`, `lib/analytics` | SQL built; app wrappers in milestone 6 |
| Auth and invites | `app/login`, `lib/auth`, `proxy.ts` | Session proxy built; pages in milestone 4 |
| Structure, Tags and QR, Overview, Store detail, People, Audit, Demo data | | Later milestones |

## Redirect

**Purpose:** the only code a customer touches. **Files:** `app/t/[code]/route.ts` (NFC), `app/q/[code]/route.ts` (QR), `lib/redirect/handle.ts` (the logic), `bots.ts` (crawler list), `hash.ts` (anonymous visitor fingerprint), `url.ts` (Google link allowlist).

**How it works:** one database query finds the tag and its store. If anything is missing or off it redirects to `/inactive`. Otherwise it answers with a 302 to Google, then, after the response, records the tap, marking bots by user agent and repeat taps (same visitor, same tag, 30 minutes).

**Changing it safely:** keep it to one query and no extra libraries; never log before the redirect; never change a `public_code`. Run `npm test` afterwards.
