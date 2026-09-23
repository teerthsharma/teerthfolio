// Pure geometry for the "collapse" sculpture (Epsilon-Hollow, p-epsilon-hollow).
//
// A hollow, triangulated icosphere shell — a geodesic globe, the kind an
// expo pavilion hangs over its own plaza. Built once here, no dependencies:
// an icosahedron subdivided `detail` times, each new midpoint pushed back
// onto the unit sphere. Struts and beads carry playful accent colours with
// no meaning attached (round 2: dropped the territory/eviction machinery
// that retold the landing site's explainer figure — see Collapse.jsx).

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

// A playful, non-semantic pick: which accent colour vertex `i` wears. Just
// a mechanical spread across the palette, not a legend for anything.
const accentOf = (i, n) => i % n;

// Every vertex once, tinted with a funky accent colour: the joints read as
// real jewels, not just the struts between them.
function buildPointList(V, colorsRgb, radius) {
  const n = V.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = V[i];
    positions[i * 3] = p[0] * radius;
    positions[i * 3 + 1] = p[1] * radius;
    positions[i * 3 + 2] = p[2] * radius;
    const c = colorsRgb[accentOf(i, colorsRgb.length)];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  return { positions, colors, count: n };
}

// Every triangle edge once, each end tinted with its own accent colour, as a
// flat vertex-coloured line list for a single LineSegments draw call.
// `pairs` carries the two vertex indices behind each edge, in the same order
// as the instances, so a caller can find "the strut between vertex a and b".
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
    const ca = colorsRgb[accentOf(a, colorsRgb.length)], cb = colorsRgb[accentOf(b, colorsRgb.length)];
    colors.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2]);
    pairs.push(a, b);
  };
  for (const [a, b, c] of F) { pushEdge(a, b); pushEdge(b, c); pushEdge(c, a); }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), pairs };
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
export function buildCollapse({ outerDetail, innerDetail, outerR, innerR, accentHex }) {
  const colorsRgb = accentHex.map(hexToRgb01);
  const outer = buildIcosphere(outerDetail);
  const inner = buildIcosphere(innerDetail);
  return {
    outer: buildEdges(outer.V, outer.F, colorsRgb, outerR),
    inner: buildEdges(inner.V, inner.F, colorsRgb, innerR),
    points: buildPointList(outer.V, colorsRgb, outerR),
    travel: travelPair(outer.V, outerR * 0.985),
  };
}
