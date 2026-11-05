# 07 Testing

Four kinds of check, each answering a different question. Run all of them before merging.

| Command | What it proves |
| --- | --- |
| `npm run lint` | Code style problems and likely mistakes are absent |
| `npm run typecheck` | Types are consistent everywhere (strict TypeScript) |
| `npm test` | Redirect logic (including that a missing key or outage shows the friendly page rather than an error), and the role rules (who may invite or switch off whom, and which menu items each role sees): active tag goes to Google uncached; inactive, retired, missing and non-Google links show the friendly page and log nothing; bots and repeat taps are flagged; no raw IP is stored; allowlist and visitor hash behave |
| `npm run test:db` | Database access rules (95 checks), on a throwaway Postgres on your Mac (no Supabase project touched). Acting as anonymous, staff, bureau manager, area manager, admin and a deactivated user, it asserts what each can read and write, that tap events can't be written by anyone signed in, that printed codes can't change, that a store's review link must be on a Google address, that retired tags stay off, that creating then reading back works, and that analytics use London days and skip bots and duplicates. Needs Postgres from Homebrew |
| `npm run test:access` | The same idea through the live Supabase API with real logins. Needs the live project, the demo seed and `.env.local`. It tidies up the few rows it creates (names starting "Test") |
| `npm run build` | The production build succeeds |
