import { distance } from './geo.js';

// Follows the rider along a route's stops and decides when to alert.
// stops: [{ lat, lon }], target: index of the rider's stop.
// The alert fires near or just past the stop before the target, so it works
// whether or not the bus actually stops there.
export function createTracker(stops, target) {
  let current = -1; // index of the stop the rider is at or has passed
  let fired = false;
  const prev = target - 1;
  const segment = prev >= 0 ? distance(stops[prev], stops[target]) : 0;

  return {
    update(pos) {
      const slack = Math.min(pos.accuracy ?? 30, 80);

      // Snap to the nearest stop at or ahead of where we were (never backwards).
      let best = -1;
      let bestD = Infinity;
      for (let i = Math.max(0, current); i <= target; i++) {
        const d = distance(pos, stops[i]);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0 && bestD <= 500 + slack) current = Math.max(current, best);

      let fire = false;
      if (!fired && prev >= 0 && current >= prev) {
        const nearPrev = distance(pos, stops[prev]) <= 60 + slack / 2;
        const pastPrev = distance(pos, stops[target]) < segment * 0.85;
        if (nearPrev || pastPrev || current >= target) fire = true;
      }
      if (fire) fired = true;
      return { current, fire };
    },
  };
}
