// T4 (PREREGISTRATION-T4.md): phase kappa (L2) and amplitude Lambda (L3) of a plate from its finite bars, the edge share,
// the remaining life of {Hn >= 0.20} components, Spearman, and the pure verdict.
import { GRID } from "./heat.mjs";
import { h0Bars, holeBars } from "./critical.mjs";
import { makeLabeler } from "../topo-field/cc.mjs";

export const DELTA = 0.05;
export const NORM = 2 * DELTA;
export const BARS = {
  l2: "DEAD (L2) if |kappa(u) - kappa(v)| > delta on more than 10 percent of edges of any plate",
  l3: "DEAD (L3) if the Spearman correlation between Lambda at a cell and the remaining life of its {Hn >= 0.20} component (via `diffComponents`) is below 0.3 on any roam",
};

const n = GRID.n;

export const barsOf = (f) => [...h0Bars(f), ...holeBars(f)];

export function kappaFrom(f, bars, delta = DELTA) {
  const cap = 2 * delta;
  const live = bars
    .map((b) => ({ b: b.birth, d: b.death, pen: Math.max(0, cap - Math.abs(b.birth - b.death)) }))
    .filter((x) => x.pen < cap);
  return Float64Array.from(f, (v) => {
    let k = cap;
    for (const { b, d, pen } of live) {
      const t = Math.min(Math.abs(v - b), Math.abs(v - d)) + pen;
      if (t < k) k = t;
    }
    return k;
  });
}

export function lambdaFrom(f, bars, delta = DELTA, norm = NORM) {
  const long = bars
    .map((b) => ({ lo: Math.min(b.birth, b.death), hi: Math.max(b.birth, b.death) }))
    .filter((x) => x.hi - x.lo >= delta);
  return Float64Array.from(f, (v) => {
    let t = 0;
    for (const { lo, hi } of long) t = Math.max(t, Math.min(v - lo, hi - v));
    return t / norm;
  });
}

export function edgesOfCsr(offsets, indices) {
  const e = [];
  for (let i = 0; i + 1 < offsets.length; i++) {
    for (let k = offsets[i]; k < offsets[i + 1]; k++) if (indices[k] > i) e.push(i, indices[k]);
  }
  return Int32Array.from(e);
}

export function edgeShare(kappa, edges, delta = DELTA) {
  let over = 0;
  for (let q = 0; q < edges.length; q += 2) if (Math.abs(kappa[edges[q]] - kappa[edges[q + 1]]) > delta) over++;
  return over / (edges.length / 2);
}

function averageRanks(x) {
  const idx = Uint32Array.from({ length: x.length }, (_, i) => i).sort((a, b) => x[a] - x[b] || a - b);
  const r = new Float64Array(x.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && x[idx[j + 1]] === x[idx[i]]) j++;
    const mean = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k]] = mean;
    i = j + 1;
  }
  return r;
}

export function spearman(x, y) {
  const a = averageRanks(x);
  const b = averageRanks(y);
  const m = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < m; i++) { ma += a[i]; mb += b[i]; }
  ma /= m;
  mb /= m;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < m; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  if (saa === 0 || sbb === 0) return { rho: 0, defined: false };
  return { rho: sab / Math.sqrt(saa * sbb), defined: true };
}

const label = makeLabeler(GRID);

export function componentsAbove(Hn, thr = 0.2) {
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = Hn[i] >= thr ? 1 : 0;
  const labels = new Int32Array(n);
  return { labels, k: label(mask, labels) };
}

// labels[t] is the component label per cell at sample t (-1 outside); ks[t] its component count; m the cell count.
// A component at t is a parent of the components at t + 1 that share a cell with it; life = 1 + the longest parent chain,
// 0 if it has none, and a component with none is the death event of diffComponents.
export function lifetimes(labels, ks, m) {
  const T = labels.length;
  const life = new Array(T);
  const reaches = new Array(T);
  life[T - 1] = new Int32Array(ks[T - 1]);
  reaches[T - 1] = new Uint8Array(ks[T - 1]).fill(1);
  let deaths = 0;
  for (let t = T - 2; t >= 0; t--) {
    const L = new Int32Array(ks[t]);
    const R = new Uint8Array(ks[t]);
    const has = new Uint8Array(ks[t]);
    for (let i = 0; i < m; i++) {
      const c = labels[t][i];
      const d = labels[t + 1][i];
      if (c < 0 || d < 0) continue;
      has[c] = 1;
      if (life[t + 1][d] + 1 > L[c]) L[c] = life[t + 1][d] + 1;
      if (reaches[t + 1][d]) R[c] = 1;
    }
    for (let c = 0; c < ks[t]; c++) if (!has[c]) deaths++;
    life[t] = L;
    reaches[t] = R;
  }
  return { life, reaches, deaths };
}

const field = (fn) => Float64Array.from({ length: n }, (_, i) => fn(GRID.x[i], GRID.z[i]));
const gauss = (cx, cz, s, a = 1) => (x, z) => a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));

export function knownAnswers() {
  const one = field(gauss(0, 0, 14));
  const b1 = barsOf(one);
  const two = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10, 0.8)(x, z));
  const b2 = barsOf(two);
  const long = b2.filter((b) => Math.abs(b.birth - b.death) >= DELTA);
  const k2 = kappaFrom(two, b2);
  const l2 = lambdaFrom(two, b2);
  const p = long.length === 1 ? Math.abs(long[0].birth - long[0].death) : NaN;
  const maxL = Math.max(...l2);
  const checks = {
    singleBumpKappa: kappaFrom(one, b1).every((v) => v === 2 * DELTA),
    singleBumpLambda: lambdaFrom(one, b1).every((v) => v === 0),
    twoBumpsOneLongBar: long.length === 1 && p > 0.5,
    twoBumpsKappaZeroAtBar: long.length === 1 && k2[long[0].m] === 0 && k2[long[0].s] === 0,
    twoBumpsLambdaTent: long.length === 1 && l2[long[0].m] === 0 && l2[long[0].s] === 0 && maxL > 0.9 * (p / 2 / NORM) && maxL <= p / 2 / NORM + 1e-12,
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}

export function verdictT4({ gateOk, plateShares, roamRhos }) {
  if (!gateOk) return { verdict: "VOID" };
  const L2 = plateShares.some((s) => s > 0.1) ? "DEAD" : "SURVIVES";
  const L3 = roamRhos.some((r) => !(r >= 0.3)) ? "DEAD" : "SURVIVES";
  return { L2, L3, verdict: `L2 ${L2}, L3 ${L3}` };
}
