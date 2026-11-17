// ISLANDS for pr-anyps5-12609: the persistence of the tower series (elder rule, union-find sweep from the highest frame down) and its brute-force oracle.
import { SERIES } from "./clock.js";
export { SERIES };

export const EVENTS = [
  { frame: 7, birth: 41.5, death: 16.6, persistence: 24.9 },
  { frame: 20, birth: 33.2, death: 16.7, persistence: 16.5 },
  { frame: 15, birth: 29.4, death: 21.5, persistence: 7.9 },
  { frame: 17, birth: 27.1, death: 24.0, persistence: 3.1 },
  { frame: 13, birth: 23.6, death: 17.0, persistence: 6.6 },
  { frame: 3, birth: 18.2, death: 16.7, persistence: 1.5 },
  { frame: 1, birth: 16.9, death: 16.7, persistence: 0.2 },
];

function pairs(series) {
  const n = series.length;
  const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => series[y] - series[x] || x - y);
  const pos = new Array(n), par = new Array(n).fill(-1), peak = new Array(n), out = [];
  order.forEach((i, p) => { pos[i] = p; });
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (const i of order) {
    par[i] = i; peak[i] = i;
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= n || par[j] < 0) continue;
      const a = find(i), b = find(j);
      if (a === b) continue;
      const older = pos[peak[a]] < pos[peak[b]] ? a : b;
      const young = older === a ? b : a;
      out.push({ peak: peak[young], death: series[i] });
      par[young] = older;
    }
  }
  if (n) out.push({ peak: order[0], death: Math.min(...series) });
  return out;
}

export function persistentSpikes(series) {
  return pairs(series)
    .map(({ peak, death }) => [peak, series[peak] - death])
    .filter(([, p]) => p > 0)
    .sort((u, v) => u[0] - v[0]);
}

// the brute-force oracle: nearest higher frame on each side, death at the higher barrier
export function bruteForce(series) {
  const n = series.length, gmin = n ? Math.min(...series) : 0, out = [];
  const beats = (j, i) => series[j] > series[i] || (series[j] === series[i] && j < i);
  for (let i = 0; i < n; i++) {
    let left = series[i], right = series[i], hl = false, hr = false;
    for (let j = i - 1; j >= 0 && !hl; j--) { left = Math.min(left, series[j]); hl = beats(j, i); }
    for (let k = i + 1; k < n && !hr; k++) { right = Math.min(right, series[k]); hr = beats(k, i); }
    const death = hl && hr ? Math.max(left, right) : hl ? left : hr ? right : gmin;
    const p = series[i] - death;
    if (p > 0) out.push([i, p]);
  }
  return out;
}

// death is null while W is above the saddle that joins a taller stall, and the saddle once W reaches it
export function islandsAt(W, series) {
  return pairs(series)
    .filter(({ peak, death }) => series[peak] - death > 0 && series[peak] > W)
    .map(({ peak, death }) => ({ peak, birth: series[peak], death: W <= death ? death : null }))
    .sort((u, v) => u.peak - v.peak);
}
