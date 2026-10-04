// THE PACE (owner, binding, 2026-10-04: "events happen so fast I barely get to
// read"): each paced scene is authored in scene seconds (its card, its moves)
// and played through a monotone time warp, so every animation slows with its
// beats. PACE lists [scene s, real s] marks; the curve between marks is
// a monotone cubic, so speed eases instead of jumping. A scene with no
// entry plays 1:1. Pure: scripts/check-world.mjs measures the real seconds.
const cum = (marks, segs) => {
  let r = 0;
  return marks.map((m, i) => [m, i ? (r += segs[i - 1]) : 0]);
};

export const PACE = {
  // marks: 0, the sign, bloom end, line A, move, line B, [line C], credit, collapse, end
  "p-caustic": cum([0, 0.45, 1.6, 3.0, 6.0, 6.6, 9.6, 10.8, 11.6], [0.45, 2.7, 1.0, 3.2, 2.6, 6.9, 4.1, 2.6]),
  "p-aether-lang": cum([0, 0.45, 1.6, 2.3, 6.0, 6.6, 10.8, 17.0, 19.2, 20], [0.45, 2.7, 0.3, 2.5, 2.6, 5.7, 9.0, 4.0, 2.5]),
  "pr-xnnpack-10801": cum([0, 0.45, 1.6, 3.0, 5.2, 6.4, 9.4, 13.2, 14.4, 15.2], [0.45, 2.7, 1.0, 3.4, 2.6, 5.1, 6.8, 4.1, 2.6]),
  "p-monodromy": cum([0, 0.45, 1.6, 4.6, 6.4, 7.0, 9.6, 12.0, 13.2, 14.0], [0.45, 2.7, 1.9, 2.5, 2.6, 5.1, 7.5, 4.1, 2.6]),
  "p-topological-ml-toolkit": cum([0, 0.45, 1.6, 5.6, 8.0, 9.0, 11.4, 13.8, 15.0, 15.8], [0.45, 2.7, 1.4, 2.6, 2.5, 5.8, 7.8, 4.1, 2.5]),
  "p-separatrix": cum([0, 0.2, 1.2, 3.0, 6.0, 6.4, 12.3, 15.4, 16.6, 17.4], [0.2, 2.8, 1.0, 3.0, 2.5, 5.9, 6.8, 4.1, 2.5]),
  "p-planimeter": cum([0, 0.45, 1.6, 3.3, 6.4, 9.0, 14.1, 19.2, 23.4, 24.2], [0.45, 2.7, 1.3, 3.0, 2.6, 5.2, 5.2, 4.2, 2.5]),
  "pr-mujoco-3396": cum([0, 0.45, 1.3, 3.2, 6.6, 7.2, 10.8, 16.2, 19.2, 20], [0.45, 2.7, 1.6, 2.6, 2.6, 5.2, 7.4, 4.2, 2.6]),
  "loop-awakening": cum([0, 1.5, 3.35, 4.4, 5.5, 7.0, 7.3, 10.1, 12.5, 13.6], [2.0, 3.0, 1.2, 2.8, 2.8, 0.4, 5.4, 4.2, 3.2]),
};

// real = scene for the Tensura dock: its beats are authored in real seconds
const id1 = (marks) => marks.map((x) => [x, x]);
PACE["p-epsilon-hollow"] = id1([0, 0.2, 0.9, 1.0, 1.5, 2.8, 3.4, 4.4, 8.6, 13.8, 22.6, 26.8, 29.3, 30.0]);

const HZ = 60;
const TABLES = new Map(); // id -> Float64Array of scene s at i / HZ real s

// A monotone cubic (Fritsch-Carlson) through the marks: exact at every mark,
// with a continuous rate, so the speed eases between beats instead of jumping.
function table(id) {
  let T = TABLES.get(id);
  if (T) return T;
  const k = PACE[id];
  const m = k.length - 1;
  const R = k[m][1];
  const d = Array.from({ length: m }, (_, i) => (k[i + 1][0] - k[i][0]) / (k[i + 1][1] - k[i][1]));
  const g = Array.from({ length: m + 1 }, (_, i) => (i === 0 ? d[0] : i === m ? d[m - 1] : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  const n = Math.ceil(R * HZ) + 1;
  T = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.min(i / HZ, R);
    while (s < m - 1 && r >= k[s + 1][1]) s++;
    const h = k[s + 1][1] - k[s][1];
    const u = (r - k[s][1]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    T[i] = (2 * u3 - 3 * u2 + 1) * k[s][0] + (u3 - 2 * u2 + u) * h * g[s] + (-2 * u3 + 3 * u2) * k[s + 1][0] + (u3 - u2) * h * g[s + 1];
  }
  TABLES.set(id, T);
  return T;
}

// scene seconds at `real` seconds since the arrival
export function sceneT(id, real) {
  if (!PACE[id] || real <= 0) return real;
  const T = table(id);
  const x = real * HZ;
  const i = Math.floor(x);
  if (i >= T.length - 1) return T[T.length - 1] + (real - (T.length - 1) / HZ);
  return T[i] + (T[i + 1] - T[i]) * (x - i);
}

// real seconds at which the scene reaches `scene` seconds
export function realAt(id, scene) {
  if (!PACE[id]) return scene;
  const T = table(id);
  let lo = 0;
  let hi = T.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (T[m] <= scene) lo = m;
    else hi = m;
  }
  return (lo + (T[hi] > T[lo] ? (scene - T[lo]) / (T[hi] - T[lo]) : 0)) / HZ;
}

export const realLength = (id, scene) => (PACE[id] ? PACE[id][PACE[id].length - 1][1] : scene);
