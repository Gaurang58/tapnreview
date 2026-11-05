# Tap Review

Tap Review turns a card on the bureau glass into a review prompt that customers actually follow through. The card carries an NFC tag and a QR code. A customer taps or scans with their own phone and lands straight on that store's Google "write a review" page. Every tap and scan passes through this app first, so we can count them by tag, store, city and area, day by day. Taps and scans measure intent to review; they are never reported as reviews.

This is a demo build for **Monday 9 November 2026**, designed so a real pilot is a configuration change rather than a rewrite.

## What's in the repository

| Path | What it is |
| --- | --- |
| `app/` | The web app (Next.js): the public home page, the `/t/<code>` and `/q/<code>` redirect routes, and (from milestone 4) the dashboard |
| `lib/redirect/` | The code a customer's tap runs through: lookup, redirect, bot and duplicate marking |
| `lib/supabase/` | Database connections (browser, signed-in server, and the server-only secret-key client) |
| `supabase/migrations/` | The database, as three SQL files: schema, access rules, analytics |
| `supabase/tests/` | Access tests: SQL checks that run locally, and API checks that run against a live project |
| `tests/` | Unit tests for the redirect |
| `scripts/` | Helper scripts (local database check now; demo seed and reset in milestone 7) |
| `docs/` | Plain-English documentation (below) |

## Documentation

1. [Setup](docs/01-setup.md): from a fresh laptop to running locally and deployed
2. [Architecture](docs/02-architecture.md): the parts and how a tap flows through them
3. [Database](docs/03-database.md): every table and every access rule
4. [Modules](docs/04-modules.md): what each piece does and how to change it safely
5. [Build log](docs/05-build-log.md): what was built, when, and what went wrong
6. [Operations](docs/06-operations.md): everyday tasks
7. [Testing](docs/07-testing.md): how to run every check
8. [Demo script and local testing](docs/08-demo-script.md): how to try every role on your computer, and the Monday demo flow

## Quick start

```bash
nvm use                      # Node 22
npm install
cp .env.example .env.local   # then fill in the values (see docs/01-setup.md)
npm run seed:demo            # sample data and four demo logins
npm run dev:webpack          # http://localhost:3000
npm run demo:logins          # prints the four logins (Admin, Area manager, Bureau manager, Staff)
```

[docs/08-demo-script.md](docs/08-demo-script.md) explains how to try each role.

## Checks

```bash
npm run lint && npm run typecheck && npm test   # code checks
npm run test:db                                  # database access rules, on a throwaway local Postgres
npm run build                                    # production build
```

## House rules (from Google's review policy)

No staff names, no star rating or feedback step before Google, no incentives, no targets or leaderboards, no customer personal data. Every customer gets the same journey: tap or scan, then straight to Google.
