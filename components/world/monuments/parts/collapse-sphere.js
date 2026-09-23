// Pure geometry for the "collapse" sculpture (Epsilon-Hollow, p-epsilon-hollow).
//
// The figure it retells (teerthsharma.github.io/fig.js, "collapse —") draws
// OS state as a hollow planet: a triangulated unit sphere, a shell of light,
// its points coloured by territory (memory, files, the scheduler). Built
// once here, no dependencies: an icosahedron subdivided `detail` times, each
// new midpoint pushed back onto the unit sphere (same construction as the
// figure's own `mp`), plus the handful of faces that stand in for eviction's
// folds and the two vertices a file's payload travels between.

function normalize([x, y, z]) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function hexToRgb01(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function baseIcosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  const V = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(normalize);
  const F = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return { V, F };
}

// Subdivide every face into 4, each new edge midpoint shared and pushed back
// onto the unit sphere, so the result is a closed icosphere at every step.
function buildIcosphere(detail) {
  let { V, F } = baseIcosahedron();
  for (let s = 0; s < detail; s++) {
    const mid = new Map();
    const midpoint = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let idx = mid.get(key);
      if (idx === undefined) {
        V.push(normalize([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2]));
        idx = V.length - 1;
        mid.set(key, idx);
      }
      return idx;
    };
    const NF = [];
    for (const [a, b, c] of F) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      NF.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    F = NF;
  }
  return { V, F };
}

// Three territories on the sphere — memory, files, the scheduler — each
// vertex belongs to whichever seed direction it's closest to. Illustrative,
// like the figure's own (it adds a coastline wobble; this doesn't need one
// at game distance).
const SEEDS = [
  normalize([0.3, 0.9, 0.35]), // memory
  normalize([-0.85, -0.2, 0.5]), // files
  normalize([0.5, -0.6, -0.65]), // the scheduler
];
function territoryOf(v) {
  let best = 0, bv = -Infinity;
  for (let i = 0; i < 3; i++) {
    const d = dot(v, SEEDS[i]);
    if (d > bv) { bv = d; best = i; }
  }
  return best;
}

// Every vertex once, tinted by its own territory: the literal "points" the
// figure's story is about (memory, files, the scheduler live as points on
// the sphere). A building retelling it needs the joints as real jewels, not
// just the struts between them.
function buildPointList(V, colorsRgb, radius) {
  const n = V.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = V[i];
    positions[i * 3] = p[0] * radius;
    positions[i * 3 + 1] = p[1] * radius;
    positions[i * 3 + 2] = p[2] * radius;
    const c = colorsRgb[territoryOf(p)];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  return { positions, colors, count: n };
}

// Every triangle edge once, each end tinted by its own territory, as a flat
// vertex-coloured line list for a single LineSegments draw call. `pairs`
// carries the two vertex indices behind each edge, in the same order as the
// instances, so a caller can find "the strut between vertex a and b".
function buildEdges(V, F, colorsRgb, radius) {
  const seen = new Set();
  const positions = [];
  const colors = [];
  const pairs = [];
  const pushEdge = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    const pa = V[a], pb = V[b];
    positions.push(pa[0] * radius, pa[1] * radius, pa[2] * radius, pb[0] * radius, pb[1] * radius, pb[2] * radius);
    const ca = colorsRgb[territoryOf(pa)], cb = colorsRgb[territoryOf(pb)];
    colors.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2]);
    pairs.push(a, b);
  };
  for (const [a, b, c] of F) { pushEdge(a, b); pushEdge(b, c); pushEdge(c, a); }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), pairs };
}

// The evictions the figure narrates, computed the way fig.js computes them
// (teerthsharma.github.io/fig.js, "collapse —"): repeatedly contract the
// shortest edge whose two ends both have at least 4 neighbours and share
// exactly 2 of them (the link condition — the mesh stays a sphere), folding
// the more crowded end onto the other. Each contraction reports the victim
// vertex `a`, its target `b`, the ORIGINAL mesh's edges that meet `a` (so a
// building can find and re-aim the struts that follow it), and the 1-2
// original faces between `a` and `b` (the coral fold), as vertex indices —
// positions come from the vertex list itself, so nothing here is ever the
// wrong scale.
function pickContractions(V, F, count, radius) {
  const len = (a, b) => {
    const dx = V[a][0] - V[b][0], dy = V[a][1] - V[b][1], dz = V[a][2] - V[b][2];
    return Math.hypot(dx, dy, dz);
  };
  // Neighbours in the UNREDUCED mesh: what the drawn struts actually
  // connect, regardless of how many earlier folds have relabelled `cur`.
  const baseN = V.map(() => new Set());
  for (const [a, b, c] of F) {
    baseN[a].add(b); baseN[a].add(c);
    baseN[b].add(a); baseN[b].add(c);
    baseN[c].add(a); baseN[c].add(b);
  }
  const scale = (p) => [p[0] * radius, p[1] * radius, p[2] * radius];

  let cur = F.map((f) => f.slice());
  const out = [];
  while (out.length < count) {
    const N = V.map(() => []);
    const link = (a, b) => {
      if (!N[a].includes(b)) N[a].push(b);
      if (!N[b].includes(a)) N[b].push(a);
    };
    for (const [a, b, c] of cur) { link(a, b); link(b, c); link(c, a); }

    const edges = [];
    for (let i = 0; i < V.length; i++) for (const j of N[i]) if (i < j) edges.push([i, j, len(i, j)]);
    edges.sort((x, y) => x[2] - y[2]);
    const crowd = (x) => N[x].reduce((s, n) => s + len(x, n), 0) / N[x].length;

    let pick = null;
    for (const [a, b] of edges) {
      if (N[a].length < 4 || N[b].length < 4) continue;
      let common = 0;
      for (const n of N[a]) if (N[b].includes(n)) common++;
      if (common !== 2) continue; // the link condition: still a sphere
      const v = crowd(a) < crowd(b) ? a : b; // the more crowded end folds
      pick = { v, u: v === a ? b : a };
      break;
    }
    if (!pick) break;

    const { v, u } = pick;
    const folds = cur.filter((f) => f.includes(v) && f.includes(u)).map((f) => f.slice());
    out.push({ a: v, b: u, pa: scale(V[v]), pb: scale(V[u]), edges: [...baseN[v]].map((n) => [v, n]), folds });

    cur = cur
      .filter((f) => !(f.includes(v) && f.includes(u)))
      .map((f) => f.map((x) => (x === v ? u : x)));
  }
  return out;
}

// The two points a file's payload travels between: vertex 0 and whichever
// vertex sits most nearly opposite it — a real chord across the hollow, not
// an arbitrary pair.
function travelPair(V, radius) {
  let far = 1, fv = Infinity;
  for (let i = 1; i < V.length; i++) {
    const d = dot(V[0], V[i]);
    if (d < fv) { fv = d; far = i; }
  }
  const s = V[0], e = V[far];
  return { start: [s[0] * radius, s[1] * radius, s[2] * radius], end: [e[0] * radius, e[1] * radius, e[2] * radius] };
}

// Everything the sculpture needs, built once at module load.
export function buildCollapse({ outerDetail, innerDetail, outerR, innerR, contractionCount, territoryHex }) {
  const colorsRgb = territoryHex.map(hexToRgb01);
  const outer = buildIcosphere(outerDetail);
  const inner = buildIcosphere(innerDetail);
  return {
    outer: buildEdges(outer.V, outer.F, colorsRgb, outerR),
    inner: buildEdges(inner.V, inner.F, colorsRgb, innerR),
    points: buildPointList(outer.V, colorsRgb, outerR),
    contractions: pickContractions(outer.V, outer.F, contractionCount, outerR),
    travel: travelPair(outer.V, outerR * 0.985),
  };
}
