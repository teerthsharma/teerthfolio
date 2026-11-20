// T2 (PREREGISTRATION-T2.md): PL critical cells, H0 bars and dual-sweep hole bars of a scalar field on the hex disc.
// The disc is coned with one virtual vertex w below every cell; every comparison uses the tie order of
// lib/anime/topology.js:45 (value descending, id ascending), and the dual sweep uses its exact reverse.
import { GRID } from "./heat.mjs";
import { makeDetector } from "../topo-field/cc.mjs";

export const BARS = {
  banchoff: "the Banchoff sum = 2 on every field",
  h0: "finite H0 bars of f = maxima - 1",
  holes: "at 20 thresholds per field the dual-sweep hole count equals `holeLabels` (`cc.mjs:98`)",
  k4: "K4 passes",
  kill: "KILL: any mismatch; holes are then dropped from the harness",
};

const n = GRID.n;
let cyc = null;

export function links() {
  if (cyc) return cyc;
  cyc = new Array(n);
  for (let i = 0; i < n; i++) {
    const ids = [];
    for (let k = GRID.off[i]; k < GRID.off[i + 1]; k++) ids.push(GRID.adj[k]);
    const ang = (j) => Math.atan2(GRID.z[j] - GRID.z[i], GRID.x[j] - GRID.x[i]);
    ids.sort((a, b) => ang(a) - ang(b));
    if (!GRID.border[i]) { cyc[i] = ids; continue; }
    const gaps = [];
    for (let k = 0; k < ids.length; k++) {
      const next = ang(ids[(k + 1) % ids.length]) - ang(ids[k]);
      if ((next + 2 * Math.PI) % (2 * Math.PI) > 1.1 || ids.length === 1) gaps.push(k);
    }
    if (gaps.length !== 1) throw new Error(`border cell ${i}: ${gaps.length} angular gaps, the run is void`);
    const k = gaps[0];
    cyc[i] = [...ids.slice(k + 1), ...ids.slice(0, k + 1), -1];
  }
  return cyc;
}

function orderOf(f) {
  const order = Int32Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => f[b] - f[a] || a - b);
  const pos = new Int32Array(n);
  for (let k = 0; k < n; k++) pos[order[k]] = k;
  return { order, pos };
}

export function classify(f) {
  const { pos } = orderOf(f);
  const L = links();
  const type = new Uint8Array(n);
  const mult = new Uint8Array(n);
  let maxima = 0;
  let minima = 1;
  let saddles = 0;
  let saddleMult = 0;
  for (let i = 0; i < n; i++) {
    const ring = L[i];
    const m = ring.length;
    const up = ring.map((j) => (j >= 0 && pos[j] < pos[i] ? 1 : 0));
    const sum = up.reduce((s, b) => s + b, 0);
    if (sum === 0) { type[i] = 1; maxima++; continue; }
    if (sum === m) { type[i] = 2; minima++; continue; }
    let runs = 0;
    for (let k = 0; k < m; k++) if (up[k] === 1 && up[(k + m - 1) % m] === 0) runs++;
    if (runs >= 2) { type[i] = 3; mult[i] = runs - 1; saddles++; saddleMult += runs - 1; }
  }
  return { type, mult, maxima, minima, saddles, saddleMult, banchoff: maxima + minima - saddleMult };
}

function merges(order, cone) {
  const N = cone ? n + 1 : n;
  const parent = Int32Array.from({ length: N }, (_, i) => i);
  const added = new Uint8Array(N);
  const bp = new Int32Array(N);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const born = new Int32Array(N).map((_, i) => i);
  if (cone) { added[n] = 1; bp[n] = -1; }
  const out = [];
  for (let k = 0; k < n; k++) {
    const i = order[k];
    added[i] = 1;
    bp[i] = k;
    const nb = [];
    for (let q = GRID.off[i]; q < GRID.off[i + 1]; q++) nb.push(GRID.adj[q]);
    if (cone && GRID.border[i]) nb.push(n);
    let joined = false;
    for (const j of nb) {
      if (!added[j]) continue;
      if (!joined) { parent[i] = find(j); joined = true; continue; }
      const ra = find(i);
      const rb = find(j);
      if (ra === rb) continue;
      const [elder, young] = bp[born[ra]] < bp[born[rb]] ? [ra, rb] : [rb, ra];
      out.push({ m: born[young], s: i });
      parent[young] = elder;
    }
  }
  return out;
}

export function h0Bars(f) {
  const { order } = orderOf(f);
  return merges(order, false).map(({ m, s }) => ({ m, s, birth: f[m], death: f[s] }));
}

export function holeBars(f) {
  const { order } = orderOf(f);
  return merges(order.slice().reverse(), true).map(({ m, s }) => ({ m, s, birth: f[m], death: f[s] }));
}

export const holesAt = (bars, t) => bars.reduce((c, b) => c + (b.birth <= t && t < b.death ? 1 : 0), 0);

export function thresholds(f) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of f) { if (v < lo) lo = v; if (v > hi) hi = v; }
  return Array.from({ length: 20 }, (_, k) => lo + ((k + 1) * (hi - lo)) / 21);
}

export function detectorHoles(f, t) {
  const det = makeDetector(GRID, { lo: -t });
  det.step(Float64Array.from(f, (v) => -v));
  return det.holes;
}
