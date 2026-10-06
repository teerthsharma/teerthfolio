// H0 PERSISTENCE, ported from Yuddh-Niti src/raytrace/topology.rs
// (h0_superlevel, significant_betti, total_persistence, hilbert_series,
// TopologicalConvergence), generalised from the 4-neighbour pixel grid to any
// graph given as CSR adjacency, so the same sweep runs on mesh vertex graphs
// (T1), on rendered frames (T6) and on a frame-time trace (T3).
//
// Superlevel filtration: sweep values high to low; each new local maximum is
// born; when two components meet the ELDER RULE keeps the one born higher and
// the younger dies at the joining value. Bars are (birth, death), longest first.
//   beta_0^tau = |{ i : b_i - d_i > tau max_j (b_j - d_j) }| + 1 (essential)

export function csrFromTriangles(n, index) {
  const sets = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    sets[a].add(b).add(c); sets[b].add(a).add(c); sets[c].add(a).add(b);
  }
  const off = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) off[i + 1] = off[i] + sets[i].size;
  const adj = new Uint32Array(off[n]);
  for (let i = 0; i < n; i++) adj.set([...sets[i]], off[i]);
  return { off, adj };
}

export function csrGrid(w, h) {
  const n = w * h, off = new Uint32Array(n + 1), adj = [];
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i / w) | 0;
    if (x > 0) adj.push(i - 1);
    if (x + 1 < w) adj.push(i + 1);
    if (y > 0) adj.push(i - w);
    if (y + 1 < h) adj.push(i + w);
    off[i + 1] = adj.length;
  }
  return { off, adj: Uint32Array.from(adj) };
}

// onDeath(youngRoot, birth, death, members) is called for every finite bar when
// `track` is set; members are the vertex ids of the dying component.
export function h0Superlevel(values, g, track = null) {
  const n = values.length;
  const order = [];
  for (let i = 0; i < n; i++) if (Number.isFinite(values[i])) order.push(i);
  if (!order.length) return { pairs: [], essential: null };
  order.sort((a, b) => values[b] - values[a] || a - b);
  const parent = new Int32Array(n).map((_, i) => i);
  const rank = new Uint8Array(n);
  const added = new Uint8Array(n);
  const birth = new Float64Array(n).fill(-Infinity);
  const members = track ? new Array(n) : null;
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const pairs = [];
  for (const i of order) {
    const v = values[i];
    added[i] = 1; birth[i] = v;
    if (track) members[i] = [i];
    for (let k = g.off[i]; k < g.off[i + 1]; k++) {
      const j = g.adj[k];
      if (!added[j]) continue;
      let ra = find(i), rb = find(j);
      if (ra === rb) continue;
      const ba = birth[ra], bb = birth[rb];
      const young = ba < bb || (ba === bb && ra > rb) ? ra : rb;
      const elderBirth = Math.max(ba, bb), youngBirth = Math.min(ba, bb);
      if (youngBirth > v) { pairs.push({ birth: youngBirth, death: v }); if (track) track(youngBirth, v, members[young]); }
      // union by rank, then carry the elder's birth (and members) on the root
      if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
      parent[rb] = ra;
      if (rank[ra] === rank[rb]) rank[ra]++;
      birth[ra] = elderBirth;
      if (track) { const A = members[ra], B = members[rb]; if (A.length < B.length) { B.push(...A); members[ra] = B; } else A.push(...B); members[rb] = null; }
    }
  }
  pairs.sort((a, b) => (b.birth - b.death) - (a.birth - a.death));
  return { pairs, essential: values[order[0]] };
}

export const persistence = (p) => Math.max(0, p.birth - p.death);
export const maxPersistence = (bc) => bc.pairs.reduce((m, p) => Math.max(m, persistence(p)), 0);
export function significantBetti(bc, tau = 0.1) {
  const ess = bc.essential === null ? 0 : 1;
  const max = maxPersistence(bc);
  if (max <= 0) return ess;
  return ess + bc.pairs.filter((p) => persistence(p) > tau * max).length;
}
export const totalPersistence = (bc) => bc.pairs.reduce((s, p) => s + persistence(p), 0);
// noise mass: total persistence of the bars at or below tau max
export function noiseMass(bc, tau = 0.1) {
  const cut = tau * maxPersistence(bc);
  return bc.pairs.reduce((s, p) => s + (persistence(p) <= cut ? persistence(p) : 0), 0);
}
// N(t) = sum t^b_i - sum t^d_i over normalised births/deaths
export function hilbertSeries(bc, samples = 16) {
  const out = new Array(samples).fill(0);
  if (!bc.pairs.length) return out;
  let lo = Infinity, hi = -Infinity;
  for (const p of bc.pairs) { lo = Math.min(lo, p.death); hi = Math.max(hi, p.birth); }
  if (bc.essential !== null) hi = Math.max(hi, bc.essential);
  const span = Math.max(hi - lo, 1e-7);
  for (let k = 0; k < samples; k++) {
    const t = (k + 1) / (samples + 1);
    let v = 0;
    for (const p of bc.pairs) v += t ** Math.min(1, Math.max(0, (p.birth - lo) / span)) - t ** Math.min(1, Math.max(0, (p.death - lo) / span));
    out[k] = v;
  }
  return out;
}
export class TopologicalConvergence {
  constructor(dim = 16, tol = 0.01, rounds = 2) { this.dim = dim; this.tol = tol; this.rounds = rounds; this.prev = null; this.stable = 0; }
  update(bc) {
    const e = hilbertSeries(bc, this.dim);
    const moved = this.prev ? Math.max(...this.prev.map((a, i) => Math.abs(a - e[i]))) : Infinity;
    this.stable = moved <= this.tol ? this.stable + 1 : 0;
    this.prev = e;
    return this.stable >= this.rounds;
  }
  reset() { this.prev = null; this.stable = 0; }
}

// T1: PERSISTENCE-SIMPLIFIED SHADOW SHAPES, a bake on the mesh vertex graph.
// field f(v) = h(v) + 2 (R_v - 0.5) is what the shader thresholds (h = half-Lambert
// under the shot's key light, R the existing Xrd bias). Two sweeps:
//   shadow side s = 1 - f: every shadow component whose bar is shorter than
//     tau max is flattened to its death level (s' = min(s, d)), so it never
//     forms its own island at any threshold;
//   lit side f: the same for lit specks inside shadows.
// The change is written back into R (R' = R + (f' - f) / 2), the channel the
// threshold already reads: zero runtime cost, no new uniform or program.
// Stability (Cohen-Steiner, Edelsbrunner, Harer): d_B(Dgm f, Dgm g) <= |f - g|_inf.
export function bakeShadowBias(geo, Lobj, tau = 0.1, g = null) {
  const P = geo.attributes.normal.array, X = geo.attributes.aXrd.array;
  const n = P.length / 3;
  g = g ?? csrFromTriangles(n, geo.index.array);
  const f = new Float64Array(n);
  for (let v = 0; v < n; v++) f[v] = 0.5 * (P[3 * v] * Lobj.x + P[3 * v + 1] * Lobj.y + P[3 * v + 2] * Lobj.z) + 0.5 + 2 * (X[3 * v] - 0.5);
  const simplify = (vals) => {
    // the scale is the field's whole range (the essential bar), not only the longest
    // finite bar: on a lit sphere every finite bar is a speck. (Deviation from
    // significant_betti, which the T6 metric keeps as ported.)
    const bc0 = h0Superlevel(vals, g);
    let lo = Infinity; for (const x of vals) lo = Math.min(lo, x);
    const cut = tau * Math.max(maxPersistence(bc0), bc0.essential - lo);
    const out = Float64Array.from(vals);
    h0Superlevel(vals, g, (b, d, mem) => { if (b - d <= cut) for (const m of mem) out[m] = Math.min(out[m], d); });
    return out;
  };
  const s = simplify(f.map((x) => 1 - x)); // shadow specks
  const f1 = s.map((x) => 1 - x);
  const f2 = simplify(f1); // lit specks
  const R = new Float32Array(n);
  for (let v = 0; v < n; v++) R[v] = Math.min(1, Math.max(0, X[3 * v] + (f2[v] - f[v]) / 2));
  return { R, g };
}
