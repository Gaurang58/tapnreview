# 08 Demo script and local testing

This page has two parts. **Part A** shows you how to run Tap Review on your own computer and try it as each of the four roles (Admin, Area manager, Bureau manager, Staff). **Part B** is the step-by-step script for the Monday 9 November 2026 demo, with the backups to have ready.

---

## Part A: try every role on your own computer

### 1. Start it

Open Terminal in the project folder and run:

```bash
cd /Users/gaurang/Documents/GitHub/tapnreview
nvm use
npm install
npm run dev:webpack
```

Then open **http://localhost:3000** in your browser. (`npm run dev` also works on most machines, but `dev:webpack` is the one tested here.) Press `Ctrl+C` in Terminal to stop it.

The database is the real Supabase project, and your keys are already in `.env.local`, so nothing else is needed. If the demo data ever looks wrong or empty, put it back with:

```bash
npm run seed:demo
```

### 2. Get the four logins

```bash
npm run demo:logins
```

This prints each role's email and password in your Terminal only, plus what that role should see. The passwords live in `.env.local`, which is never uploaded to GitHub.

### 3. Use two roles at the same time

A browser holds one login at a time, so signing in as a second role signs the first one out. To compare roles side by side, use **different windows that don't share cookies**: a normal window for one role, a **private/incognito window** for another, and a different browser (for example Safari and Chrome) for a third. Or just sign out (bottom of the sidebar, or top right on a phone) between roles.

### 4. What each role should see, and what should NOT work

Sign in at http://localhost:3000/login. The first sign-in can take a few seconds.

| Role | Menu items | Overview shows | Should work | Should NOT work |
| --- | --- | --- | --- | --- |
| **Admin** | Overview, Tags, Areas and stores, People | All 3 areas and 12 stores | Add an area ("Areas and stores"), add cities, stores and tags anywhere, invite any role, switch people on and off | Nothing is blocked inside the organisation |
| **Area manager** | Overview, Tags, Areas and stores, People | Area 1 only (Nottingham x2, Leicester, Derby) | Add a city or store in Area 1, create and move tags between Area 1 stores, invite Bureau managers and Staff for Area 1 stores | No "Add an area" box; no sight of Areas 2 and 3; can't invite an Admin or another Area manager |
| **Bureau manager** | Overview, Tags, People | Nottingham West Bridgford only | Create, rename, switch off and retire tags for that store; invite **Staff** for that store | "Areas and stores" shows *page not found*; the invite form offers only Staff; can't move a tag to another store |
| **Staff** | Overview only | Nottingham West Bridgford only | Look at the figures, chart, tap board and the store page | Tags, People and Areas and stores all show *page not found*; nothing can be edited |

Quick extra checks that prove the walls are real:

- As **Staff**, copy the address of the store page, then change the end of it to another store's. You should get *page not found*.
- As **Staff**, add `?store=anything` to the Overview address. The page ignores a store you can't see.
- As **Admin**, open a store from the table, then use the **Today / 7 / 30 / 90 days / Custom** buttons and the Area, City, Store and Method boxes. The address changes with each choice, so you can copy and share the view.

### 5. Try an invitation (all roles can be tested this way)

1. Sign in as **Admin** (or Area manager, or Bureau manager). Open **People**.
2. Fill in a name and email (it can be made up, for example `trial@example.com`), choose a role and a store or area, and press **Create invitation**.
3. Copy the one-time link that appears. No email is sent.
4. Open the link in a **private window**. You'll be asked to choose a password (at least 10 characters), then you land signed in as the new person.
5. Back in your Admin window, press **Switch off** next to that person. Reload the private window: they're signed out with a "switched off" notice.

The invited person is real data in your Supabase project. Switch them off when you've finished; demo reset does not delete people.

### 6. Make taps and scans happen (and watch the live board)

Keep **Overview** open as Admin, then do any of these:

- **Tags** page, the West Bridgford tag: press **Test NFC link** or **Test QR link**. Each opens Google's review page in a new tab (close it, **don't post a review**) and counts as a real tap or scan. The tap board should show it within a couple of seconds.
- Or from Terminal, pretending to be a phone:

  ```bash
  curl -s -o /dev/null -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 Safari/604.1" http://localhost:3000/t/hB4ZCobE4h
  ```

  Change `/t/` to `/q/` for a QR scan. Taps from the same "phone" within 30 minutes count only once, so change a word in the quotes to be a different phone.
- The Terminal cannot test your real NFC card; for that you need the live address (milestone 8).

Open the same address twice quickly: the second tap from the same phone is a duplicate and won't appear. A WhatsApp-style link preview (`-A "WhatsApp/2.23"`) is marked as a bot and doesn't appear either.

### 7. Try it on your phone (same Wi-Fi)

Your phone can't reach `localhost`. Instead:

1. Find your computer's address on the Wi-Fi: System Settings, Wi-Fi, Details, IP address (for example `192.168.0.186`).
2. In `.env.local`, change `PUBLIC_APP_URL` to `http://192.168.0.186:3000` (your number), then start with `npm run dev:webpack -- -H 0.0.0.0`.
3. Open that address on the phone. Tag pages now show phone-reachable QR codes: scan one from the screen of your computer.
4. **Put `PUBLIC_APP_URL` back to `http://localhost:3000` afterwards**, and don't write a real NFC card with a `192.168…` address (it only works on your own Wi-Fi).

### 8. If something looks off

| Symptom | Fix |
| --- | --- |
| Sign-in takes a long time | Normal for the first request; Supabase is in London. Wait up to ~10 seconds |
| You're sent back to the login page | You were signed out (restarting the server doesn't do this in a normal browser, but a private window ends when closed). Sign in again |
| Overview says "no taps yet" | Run `npm run seed:demo` |
| "Updating every 15 seconds" instead of "Live" | The live connection was blocked or hasn't connected; the board still updates, just every 15 seconds |
| Wrong data after lots of testing | `npm run seed:reset` then `npm run seed:demo` (removes only demo taps; real taps from your tests stay) |
| `npm run dev` fails with a port or process error | Use `npm run dev:webpack` |

---

## Part B: the demo on Monday 9 November 2026

**Before you leave (the night before)**

- [ ] The app is on its public address (after the Vercel step), and you've signed in there on the laptop you'll present from.
- [ ] `npm run seed:demo` has been run so the numbers are fresh.
- [ ] Your physical card has had its NFC tag rewritten to the live address and the new QR sticker is on it. Tap it and scan it once on an iPhone and on an Android phone.
- [ ] A **screen recording** of the whole flow below is saved on the laptop.
- [ ] Your phone's **hotspot** works, in case the room's Wi-Fi fails.
- [ ] The four logins are written down (from `npm run demo:logins`), or saved in your password manager.
- [ ] Close any browser tabs that might show something other than the demo.

**The flow (about 5 minutes)**

1. **Sign in as Admin.** Overview opens on the **tap board**: today's count and the latest taps. Below it, 90 days across all areas: total interactions, NFC taps and QR scans, with change against the previous 90 days, and a chart of the two methods.
   *Say:* "Every tap and scan on a card goes through us before it reaches Google, so we can see where customers engage."
2. **Narrow it down.** Use the filters: Area 1, then Nottingham. In the table, open **Nottingham West Bridgford**.
3. **Hand over the physical card.** Someone taps it with their phone. Their phone opens Google's review page for the West Bridgford store (**tell them to close it, not post**), and the tap board shows a new **NFC** tap from Nottingham West Bridgford within a couple of seconds, the row lights up once, and today's count goes up.
4. **Scan the QR code** on the card with a phone camera. The board shows a **QR** scan.
5. **Tags page:** create a new tag (it names itself after the store), download its QR code (SVG or PNG), then move it to another store and retire it. Point out that retiring asks first and is permanent, and that a retired card shows a friendly "not active" page.
6. **Sign in as the Bureau manager, then as Staff** (use a private window to keep Admin open). Each sees only West Bridgford, and Staff can only look.

**What to say about reviews (important)**

- Taps and scans measure **intent**, not reviews: "We can see customers heading to Google; we don't see whether they post."
- Every customer gets the same journey: tap, then straight to Google. No rating screen first, no staff names, no incentives, no targets or leaderboards. This keeps the bureaux inside Google's review rules.
- No customer personal data is stored: no names, no emails, no IP addresses.

**If something goes wrong**

| Problem | What to do |
| --- | --- |
| Room Wi-Fi is down | Switch the laptop and phone to your phone's hotspot; or play the screen recording |
| Board says "Updating every 15 seconds" | It still works. Say so, or add `&live=poll` to the Overview address to make it deliberate |
| The card doesn't read on someone's phone | Use the QR code instead; ask them to hold the phone flat to the card's chip, with the case off |
| The demo numbers look odd | Run `npm run seed:reset` then `npm run seed:demo` before starting (or the night before) |
| Someone asks about other stores' Google links | Only West Bridgford has a real Google link; the others are placeholders, so avoid pressing "Test review link" on them |
