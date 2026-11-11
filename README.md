# Bus Stop Alert

Enter a TransLink stop number, pick your bus, and your phone alerts you one stop before yours.

## Run locally

    npm install
    npm run data      # downloads TransLink's GTFS feed into public/data/stops.json
    npm run dev       # open on your phone over https (or localhost) for GPS

`npm run data` reads `GTFS_URL` if set, or a local zip: `node scripts/build-data.mjs ./google_transit.zip`.

## Deploy (Vercel or Netlify)

Push this folder to a GitHub repo and import it in Vercel or Netlify. `vercel.json` and `netlify.toml` already set the build
(`npm run build:netlify`, which fetches fresh stop data and builds) and the publish folder (`dist`).
Redeploy whenever TransLink updates its schedule to refresh the stop data.

## How it works

- `scripts/build-data.mjs` turns GTFS into a compact list of stops and, for each route and
  direction, its stops in order (the longest trip of that pattern).
- `src/lib/tracker.js` follows GPS along the chosen route and fires near or just past the stop
  before yours, so it works even when the bus doesn't stop there.
- `src/lib/alarm.js` plays a chime and vibrates (Android) every 3.5 s until "Got it".
- The screen wake lock keeps the page alive; browsers pause GPS when the phone is locked.

## Known limits (MVP)

- The page must stay open with the screen on.
- iPhone: no vibration from web pages, and the silent switch mutes the chime.
- Short-turn variants of a route use the longest trip's stop list.
