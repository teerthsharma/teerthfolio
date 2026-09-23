// Pure math for the Aether-Lang building's story (place id p-aether-lang).
//
// A small point cloud runs through NP passes. Each pass is measured by a
// real Vietoris-Rips filtration — grow a scale, join every pair of points
// closer than it — and its one longest-lived 1-cycle is found by
// boundary-matrix reduction over Z2, the same method the landing figure
// uses (teerthsharma.github.io/fig.js, "aether —"). The last two passes
// share the same point SET, just slid one slot around the ring, so their
// topology comes back identical: that identity is the loop's own exit
// condition (data/showcase.json figure.labels: "the last pass still moves,
// but its shape does not"). Everything here runs once, at module load —
// nothing in this file runs per frame.

const TAU = Math.PI * 2;
export const N = 14;
export const NP = 4;

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let q = Math.imul(s ^ (s >>> 15), 1 | s);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}
const wrapPi = (a) => a - TAU * Math.round(a / TAU);

// Passes 0..NP-1 in a unit disc: { th, r } in polar (unwrapped across passes
// so a pass can be tweened smoothly from the one before it) and the same
// point cached as { x, y }.
function buildPasses() {
  const rnd = mulberry32(20260923); // seeded: every visitor sees the same run
  const PH0 = -Math.PI / 2;
  const RING_R = 0.95;
  const P = [];
  for (let k = 0; k < NP; k++) {
    const th = new Float64Array(N);
    const r = new Float64Array(N);
    const x = new Float64Array(N);
    const y = new Float64Array(N);
    if (k === 0) {
      // pass 0: a loose scatter, no structure yet
      const ang = [];
      for (let i = 0; i < N; i++) ang.push(rnd() * TAU);
      ang.sort((a, b) => a - b);
      for (let i = 0; i < N; i++) { th[i] = ang[i] + PH0; r[i] = 0.5 * Math.sqrt(0.1 + 0.9 * rnd()); }
    } else if (k === 1) {
      // pass 1: gathering toward a ring, still noisy
      for (let i = 0; i < N; i++) {
        th[i] = PH0 + 0.3 * Math.PI + 0.7 * TAU * (i / N) + 0.14 * (rnd() - 0.5);
        r[i] = 0.82 + 0.22 * (rnd() - 0.5);
      }
    } else {
      // pass NP-2 closes the ring; pass NP-1 is the same ring, points slid
      // one slot on — same set, so the same shape.
      const slot = k - (NP - 2);
      for (let i = 0; i < N; i++) { th[i] = PH0 + TAU * ((i + slot) / N); r[i] = RING_R; }
    }
    for (let i = 0; i < N; i++) {
      if (k > 0) th[i] = P[k - 1].th[i] + wrapPi(th[i] - P[k - 1].th[i]);
      const a = k >= NP - 2 ? PH0 + TAU * (((i + (k - (NP - 2))) % N) / N) : th[i];
      x[i] = r[i] * Math.cos(a);
      y[i] = r[i] * Math.sin(a);
    }
    P.push({ th, r, x, y });
  }
  return P;
}

function symdiff(a, b) {
  const o = [];
  let x = 0, y = 0;
  while (x < a.length || y < b.length) {
    if (y >= b.length || (x < a.length && a[x] > b[y])) o.push(a[x++]);
    else if (x >= a.length || b[y] > a[x]) o.push(b[y++]);
    else { x++; y++; }
  }
  return o;
}

// The one longest-lived 1-cycle of a pass: born when the edge that finally
// closes it appears, killed when a triangle first spans it.
function topologyOf(p) {
  const E = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) E.push({ i, j, l: Math.hypot(p.x[i] - p.x[j], p.y[i] - p.y[j]) });
  E.sort((a, b) => a.l - b.l);
  const eid = new Int32Array(N * N);
  E.forEach((e, idx) => { eid[e.i * N + e.j] = idx; eid[e.j * N + e.i] = idx; });

  const T = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) for (let m = j + 1; m < N; m++) {
    const c = [eid[i * N + j], eid[i * N + m], eid[j * N + m]].sort((a, b) => b - a);
    T.push({ c, v: [i, j, m] });
  }
  T.sort((a, b) => a.c[0] - b.c[0] || a.c[1] - b.c[1] || a.c[2] - b.c[2]);

  const piv = new Array(E.length);
  const dtri = new Array(E.length);
  for (const t of T) {
    let col = t.c;
    while (col.length && piv[col[0]]) col = symdiff(col, piv[col[0]]);
    if (col.length) { piv[col[0]] = col; dtri[col[0]] = t; }
  }
  // Most edges that close a 1-cycle close the smallest possible one — a bare
  // triangle, filled at the same instant it closes, zero persistence. Take
  // whichever pivot lives longest regardless: for a near-ring pass that is a
  // real, wide loop; on an unlucky scatter it can legitimately be a near-tie,
  // and the render below gives it a floor so the ring still reads.
  let best = null;
  for (let i = 0; i < E.length; i++) {
    if (!piv[i]) continue;
    const b = E[i].l, d = E[dtri[i].c[0]].l;
    if (!best || d - b > best.d - best.b) best = { e: i, b, d, tri: dtri[i].v };
  }

  // a real cycle for that edge: shortest path between its ends through edges
  // that were already shorter, closed by the edge itself
  const src = E[best.e].i, dst = E[best.e].j;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  dist[src] = 0;
  for (let it = 0; it < N; it++) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    done[u] = 1;
    for (let i = 0; i < N; i++) {
      if (i === u || eid[u * N + i] >= best.e) continue;
      const nd = dist[u] + E[eid[u * N + i]].l;
      if (nd < dist[i]) { dist[i] = nd; prev[i] = u; }
    }
  }
  const cyc = [];
  for (let v = dst; v >= 0; v = prev[v]) cyc.push(v);
  cyc.reverse();

  const rmax = Math.max(best.d * 1.08, best.b + 0.05, 0.3);
  const bFrac = best.b / rmax;
  const dFrac = Math.min(0.97, Math.max(bFrac + 0.06, best.d / rmax));
  return { E, best, cyc, rmax, bFrac, dFrac };
}

// Built once: NP passes' points plus each one's topology.
export function buildAetherLoop() {
  const passes = buildPasses();
  const topo = passes.map(topologyOf);
  return { N, NP, passes, topo };
}
