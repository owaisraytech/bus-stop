#!/usr/bin/env node
// Downloads TransLink's static GTFS feed and writes public/data/stops.json.
//
//   node scripts/build-data.mjs                  download from GTFS_URL
//   node scripts/build-data.mjs ./feed.zip       use a local copy
//
// Output shape:
//   stops:    [[code, name, lat, lon], ...]          only stops with a stop number
//   patterns: [{ r: route, h: headsign, s: [stopIndex, ...] }, ...]
// A pattern is one route + direction + headsign, using its longest trip.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

const GTFS_URL = process.env.GTFS_URL || 'https://gtfs-static.translink.ca/gtfs/google_transit.zip';
const OUT_DIR = new URL('../public/data/', import.meta.url);
const NEEDED = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];

async function getZip() {
  const local = process.argv[2];
  if (local) return new Uint8Array(await readFile(local));
  console.log(`Downloading ${GTFS_URL}`);
  const res = await fetch(GTFS_URL);
  if (!res.ok) throw new Error(`Download failed with HTTP ${res.status}. Set GTFS_URL to TransLink's current GTFS zip.`);
  return new Uint8Array(await res.arrayBuffer());
}

function parseQuoted(line) {
  const out = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}

function* rows(text) {
  let start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (start < text.length) {
    let end = text.indexOf('\n', start);
    if (end === -1) end = text.length;
    let line = text.slice(start, end);
    start = end + 1;
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (!line) continue;
    yield line.includes('"') ? parseQuoted(line) : line.split(',');
  }
}

function table(text) {
  const it = rows(text);
  const header = it.next().value.map((h) => h.trim());
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  return { col, it };
}

const round = (n) => Math.round(Number(n) * 1e5) / 1e5;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const zip = await getZip();
  const files = unzipSync(zip, { filter: (f) => NEEDED.includes(f.name) });
  for (const name of NEEDED) {
    if (!files[name]) throw new Error(`The feed has no ${name}.`);
  }
  const text = (name) => strFromU8(files[name]);

  // Routes: route_id -> display number ("009" becomes "9").
  const routeName = new Map();
  {
    const { col, it } = table(text('routes.txt'));
    for (const r of it) {
      let s = (r[col.route_short_name] || '').trim();
      if (/^\d+$/.test(s)) s = String(Number(s));
      routeName.set(r[col.route_id], s || (r[col.route_long_name] || '').trim());
    }
  }

  // Trips: trip_id -> pattern key.
  const tripKey = new Map();
  const keyInfo = new Map();
  {
    const { col, it } = table(text('trips.txt'));
    for (const r of it) {
      const route = routeName.get(r[col.route_id]) || '';
      let headsign = (r[col.trip_headsign] || '').trim();
      if (route) headsign = headsign.replace(new RegExp(`^${escapeRe(route)}\\s+`, 'i'), '');
      const key = `${r[col.route_id]}|${r[col.direction_id] ?? ''}|${headsign}`;
      tripKey.set(r[col.trip_id], key);
      if (!keyInfo.has(key)) keyInfo.set(key, { route, headsign });
    }
  }

  // stop_times, pass 1: stops per trip, to pick each pattern's longest trip.
  const stText = text('stop_times.txt');
  delete files['stop_times.txt'];
  const counts = new Map();
  {
    const { col, it } = table(stText);
    const ti = col.trip_id;
    for (const r of it) counts.set(r[ti], (counts.get(r[ti]) || 0) + 1);
  }
  const repTrip = new Map();
  for (const [trip, n] of counts) {
    const key = tripKey.get(trip);
    if (!key) continue;
    const cur = repTrip.get(key);
    if (!cur || n > counts.get(cur)) repTrip.set(key, trip);
  }
  const chosen = new Map([...repTrip].map(([key, trip]) => [trip, key]));

  // stop_times, pass 2: the ordered stops of each chosen trip.
  const seqs = new Map();
  {
    const { col, it } = table(stText);
    for (const r of it) {
      const trip = r[col.trip_id];
      if (!chosen.has(trip)) continue;
      let a = seqs.get(trip);
      if (!a) { a = []; seqs.set(trip, a); }
      a.push([Number(r[col.stop_sequence]), r[col.stop_id]]);
    }
  }

  // Stops with a public stop number.
  const stopsById = new Map();
  {
    const { col, it } = table(text('stops.txt'));
    for (const r of it) {
      const code = (r[col.stop_code] || '').trim();
      const type = (r[col.location_type] || '').trim();
      if (!code || (type && type !== '0')) continue;
      stopsById.set(r[col.stop_id], {
        code,
        name: (r[col.stop_name] || '').trim(),
        lat: round(r[col.stop_lat]),
        lon: round(r[col.stop_lon]),
      });
    }
  }

  const outStops = [];
  const indexOf = new Map();
  const idx = (id) => {
    if (indexOf.has(id)) return indexOf.get(id);
    const s = stopsById.get(id);
    if (!s) return -1;
    indexOf.set(id, outStops.length);
    outStops.push([s.code, s.name, s.lat, s.lon]);
    return outStops.length - 1;
  };

  const patterns = [];
  for (const [trip, key] of chosen) {
    const s = (seqs.get(trip) || [])
      .sort((a, b) => a[0] - b[0])
      .map(([, id]) => idx(id))
      .filter((i) => i >= 0);
    if (s.length < 2) continue;
    const { route, headsign } = keyInfo.get(key);
    patterns.push({ r: route, h: headsign, s });
  }
  for (const id of stopsById.keys()) idx(id); // keep stops with no service so lookups can say so

  const collator = new Intl.Collator('en', { numeric: true });
  patterns.sort((a, b) => collator.compare(a.r, b.r) || collator.compare(a.h, b.h));

  const out = JSON.stringify({ generated: new Date().toISOString(), stops: outStops, patterns });
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(new URL('stops.json', OUT_DIR), out);
  console.log(`Wrote ${outStops.length} stops and ${patterns.length} route patterns (${(out.length / 1e6).toFixed(1)} MB).`);
}

main().catch((err) => {
  console.error(`Stop data build failed: ${err.message}`);
  process.exit(1);
});
