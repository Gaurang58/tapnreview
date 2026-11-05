# 06 Operations

Everyday tasks. This page grows as features are built; for now it covers only what exists.

## If a tag stops working

1. Open the tag's address, `<PUBLIC_APP_URL>/t/<code>`, in a browser. If it shows "This card isn't active right now", the tag or its store has been switched off or retired, or the store has no valid Google review link.
2. If it opens Google but nothing is counted, check the tap wasn't marked as a duplicate (same phone within 30 minutes) or a bot.
3. A printed code can never be changed. If a card is lost or damaged, retire the tag and create a new one.

## Checking the database rules without touching Supabase

```bash
npm run test:db
```

## Resetting demo data

```bash
npm run seed:reset    # removes demo taps only
npm run seed:demo     # puts a fresh 90 days back
```

Real taps (made on the physical card) are never touched by either command.

## Adding a store (or city)

1. Sign in as an Admin or Area manager and open **Areas and stores**.
2. To add a city, open "Add a city" in its area. To add a store, open "Add a store in <city>".
3. Name the store with the city plus the location, for example "Derby Centre".
4. Give its Google link: paste the store's **Place ID** (use the "Find the Place ID on Google" link if you don't have it), or paste its Google review link. Only Google addresses are accepted.
5. Save, then press **Test review link** to confirm it opens the right store's review page. Close it without posting.

## Adding a tag and making the card

1. Open **Tags**, "Add a tag", choose the store and create it. It is named after the store.
2. On its card, press **Copy** next to the NFC address.
3. **Write the NFC chip** with a phone app such as NFC Tools: Write, Add a record, URL, paste the address, Write, then hold the phone to the card. Test it by tapping with another phone. **Do not lock the chip yet.** A locked chip can never be changed.
4. **Print the QR code:** press "QR (SVG)" (best for printing) or "QR (PNG)" and print it at least 2.5 cm wide on a white background, leaving the blank border. Scan it with a phone camera to check it opens the store's Google page.
5. Press **Test NFC link** and **Test QR link**. Each counts as a real tap or scan, so the live feed will show them.

## Locking an NFC chip (only when you are certain)

Locking makes the chip read-only for ever. Do it once the address is final (on the real website address, not localhost) and the card has been tested on an iPhone and an Android phone. In NFC Tools: Other, Lock tag. If a locked card ever needs a different address you would retire its tag and make a new card; the old QR sticker can be covered with a new one.

## Moving or retiring a card

- **Move** a tag to another store if a card is physically relocated; the printed card stays valid and past taps stay with the old store.
- **Retire** a tag if a card is lost, damaged or withdrawn. This is permanent, and anyone tapping it then sees "This card isn't active right now".
