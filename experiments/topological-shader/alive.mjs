// T3, L1 half (PREREGISTRATION-T3.md): the share of cells within one ring of a surviving critical cell of the live field.
// A critical cell survives when the bar it creates or kills in h0Bars or holeBars (critical.mjs) has persistence >= DELTA;
// the global maximum survives when max - min >= DELTA. Delta <= 0 marks every critical cell (the unfiltered context figure).
import { GRID } from "./heat.mjs";
import { classify, h0Bars, holeBars } from "./critical.mjs";

export const DELTA = 0.05;
export const BARS = {
  pass: "PASS: median share <= 0.10 on every roam and the tour",
  dead: "DEAD: median > 0.25 on any",
  control: "the same field with cells permuted must give at least 3 times the share",
  filter: "persistence >= 0.05",
};

const n = GRID.n;

export function survivors(f, delta = DELTA) {
  const c = classify(f);
  const mask = new Uint8Array(n);
  const persist = new Float64Array(n);
  let unmatched = 0;
  const mark = (i, p) => {
    if (c.type[i] === 0) { unmatched++; return; }
    mask[i] = 1;
    if (p > persist[i]) persist[i] = p;
  };
  if (delta <= 0) {
    for (let i = 0; i < n; i++) if (c.type[i] !== 0) mask[i] = 1;
  } else {
    for (const b of [...h0Bars(f), ...holeBars(f)]) {
      const p = Math.abs(b.birth - b.death);
      if (p >= delta) { mark(b.m, p); mark(b.s, p); }
    }
    let top = 0;
    let lo = f[0];
    for (let i = 1; i < n; i++) { if (f[i] > f[top]) top = i; if (f[i] < lo) lo = f[i]; }
    if (f[top] - lo >= delta) mark(top, f[top] - lo);
  }
  const by = { 1: 0, 2: 0, 3: 0 };
  const maxPersistence = { max: 0, min: 0, saddle: 0 };
  const name = { 1: "max", 2: "min", 3: "saddle" };
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue;
    count++;
    by[c.type[i]]++;
    if (persist[i] > maxPersistence[name[c.type[i]]]) maxPersistence[name[c.type[i]]] = persist[i];
  }
  return { mask, persist, type: c.type, count, max: by[1], min: by[2], saddle: by[3], maxPersistence, unmatched };
}

export function aliveShare(f, delta = DELTA) {
  const s = survivors(f, delta);
  const marked = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!s.mask[i]) continue;
    marked[i] = 1;
    for (let k = GRID.off[i]; k < GRID.off[i + 1]; k++) marked[GRID.adj[k]] = 1;
  }
  let cells = 0;
  for (let i = 0; i < n; i++) cells += marked[i];
  return { share: cells / n, cells, survivors: s };
}

export function permuteField(f, rng) {
  const p = Int32Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Float64Array.from(p, (k) => f[k]);
}

export function verdictT3({ gateOk, beds }) {
  if (!gateOk) return { verdict: "VOID" };
  if (beds.some((b) => b.median > 0.25)) return { verdict: "DEAD", bar: BARS.dead };
  const controlOk = beds.every((b) => b.control >= 3 * b.median);
  if (beds.every((b) => b.median <= 0.1) && controlOk) return { verdict: "PASS", bar: BARS.pass };
  return { verdict: "UNRESOLVED", controlOk };
}
