// Loads public/data/stops.json (made by scripts/build-data.mjs) and indexes it.

export function indexData(raw) {
  const byCode = new Map();
  raw.stops.forEach((s, i) => {
    const list = byCode.get(s[0]);
    if (list) list.push(i); else byCode.set(s[0], [i]);
  });
  const patternsByStop = new Map();
  raw.patterns.forEach((p, pi) => {
    p.s.forEach((si, pos) => {
      let list = patternsByStop.get(si);
      if (!list) { list = []; patternsByStop.set(si, list); }
      if (!list.some((x) => x.pi === pi)) list.push({ pi, pos });
    });
  });
  return { ...raw, byCode, patternsByStop };
}

export async function loadStops() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/stops.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return indexData(await res.json());
}

export function stopAt(data, i) {
  const [code, name, lat, lon] = data.stops[i];
  return { code, name, lat, lon };
}

// Every route that serves a stop number, with where the stop sits on it.
export function findStop(data, code) {
  const indices = data.byCode.get(code);
  if (!indices) return null;
  const routes = [];
  for (const si of indices) {
    for (const { pi, pos } of data.patternsByStop.get(si) || []) {
      const p = data.patterns[pi];
      routes.push({ pi, pos, route: p.r, headsign: p.h });
    }
  }
  const collator = new Intl.Collator('en', { numeric: true });
  routes.sort((a, b) => collator.compare(a.route, b.route) || collator.compare(a.headsign, b.headsign));
  return { stop: stopAt(data, indices[0]), routes };
}

export function tripStops(data, pi) {
  return data.patterns[pi].s.map((i) => stopAt(data, i));
}
