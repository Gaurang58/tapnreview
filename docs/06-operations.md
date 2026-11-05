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
