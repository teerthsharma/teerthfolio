// THE PYREFLY FLOES, as numbers: facebook/pyrefly #4180 laid out on the
// river's outflow (lib/world/river.js), east of the NVIDIA moat.
//
// The landing figure ("chain", data/showcase.json) is a reproducer: 208
// two-module strongly connected components chained one after another, wound
// into a tapering coil that descends to commit at its foot. Here each
// component is one ice floe of two lobes (one per module) frozen together
// along a thick pressure ridge (the short thick link), and a thin ice thread
// ties it to the next floe (the thin link). All 208 are laid out.
//
// THE ANOMALY (the radiation's doing): the chained floes do not float on
// the river. They hang in the air above it, wound into a funnel, a whirlpool
// lifted off the water and hung up to dry, the widest turn 3.6 m up and the
// last floe pinned to the top of a basalt stack standing in the shallows,
// where the chain commits. Plain floes stranded along the banks show what
// floes normally do.
//
// Pure and run once. Local frame: origin on the water plane's y = 0 at the
// pin (the stack), x east, z south (toward the camera), y up. Everything is
// in metres; Floes.jsx places the group at PIN.

import { riverAt } from "../../../../lib/world/river.js";

export const N = 208; // figure.labels[0]: "one export change, 208 two-module SCCs"
export const DOOR = 100; // figure.labels[1]: "the incremental budget runs out at epoch 100"

// The pin: a basalt stack in the outflow's north shallows, 1.5 m in from the
// bank and ~3 m off the centre line, clear of a seal riding the current.
export const PIN = { x: 73.5, z: -35.6 };
export const PIN_R = 0.3; // the stack's radius
export const PIN_TOP = 0.95; // where the chain commits

// The funnel: TURNS turns from the rim (R1, YT) down to the foot (R0, YB),
// stretched ASPECT times along the river (x). Its profile is a whirlpool's,
// flat at the rim and steep near the foot.
const TURNS = 6;
const R1 = 4.6;
const R0 = 1;
const ASPECT = 1.3;
const YT = 3.6;
const YB = 1.05;
const PHASE = 0.9; // turns the whole coil so the door faces the camera across the funnel's mouth
const A = TURNS * Math.PI * 2;

// The floe: two lobes along the chain (local x), each LOBE_X long and LOBE_Z
// wide, their centres LOBE_OFF either side of the ridge.
export const FLOE = { lobeX: 0.12, lobeZ: 0.19, lobeOff: 0.1, thick: 0.16 };
const HALF_LEN = FLOE.lobeOff + FLOE.lobeX; // centre to the floe's leading edge

function radiusAt(f) {
  return R1 + (R0 - R1) * f;
}
function heightFor(r) {
  return YB + (YT - YB) * Math.pow(Math.max(0, (r - R0) / (R1 - R0)), 0.7);
}
function at(a, out) {
  const r = radiusAt(Math.min(1, a / A));
  out[0] = r * ASPECT * Math.cos(a + PHASE);
  out[1] = heightFor(r);
  out[2] = r * Math.sin(a + PHASE);
  return out;
}

// Arc length, tabulated once and inverted, so the floes sit at equal spacing
// along the real curve (the figure does the same).
const K = 6000;
const cum = new Float64Array(K + 1);
{
  const prev = at(0, [0, 0, 0]);
  const cur = [0, 0, 0];
  for (let i = 1; i <= K; i++) {
    at((A * i) / K, cur);
    cum[i] = cum[i - 1] + Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
    prev[0] = cur[0];
    prev[1] = cur[1];
    prev[2] = cur[2];
  }
}
export const LENGTH = cum[K];
function pointAt(s, out = [0, 0, 0]) {
  const target = Math.min(1, Math.max(0, s)) * LENGTH;
  let lo = 0;
  let hi = K;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid;
    else hi = mid;
  }
  const frac = (target - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return at((A * (lo + frac)) / K, out);
}

const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Seeded jitter, so no two floes sit quite alike.
function rand(i, k) {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// One entry per component, from the top of the coil (where the change
// enters) to its foot: c its centre, basis x (along the chain), y (the
// floe's up, banked into the funnel), z; head/tail the floe's two ends
// along the chain; scale a little jitter.
export const FLOES = Array.from({ length: N }, (_, i) => {
  const s = (i + 0.5) / N;
  const c = pointAt(s);
  const p0 = pointAt(s - 0.001);
  const p1 = pointAt(s + 0.001);
  const x = norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
  // the funnel wall's normal, half-banked: floes tip in toward the axis
  const out = norm([c[0] / (ASPECT * ASPECT), 0, c[2]]);
  const r = Math.hypot(c[0] / ASPECT, c[2]);
  const f = (R1 - r) / (R1 - R0);
  const slope = (heightFor(radiusAt(f - 0.01)) - heightFor(radiusAt(f + 0.01))) / (radiusAt(f - 0.01) - radiusAt(f + 0.01));
  const bank = 0.5 * slope;
  let y = norm([-bank * out[0], 1, -bank * out[2]]);
  const d = y[0] * x[0] + y[1] * x[1] + y[2] * x[2];
  y = norm([y[0] - d * x[0], y[1] - d * x[1], y[2] - d * x[2]]);
  const z = cross(x, y);
  // a little yaw about the floe's own up, and a size jitter
  const yaw = (rand(i, 1) - 0.5) * 0.3;
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const xj = [x[0] * cs - z[0] * sn, x[1] * cs - z[1] * sn, x[2] * cs - z[2] * sn];
  const zj = cross(xj, y);
  const scale = 0.92 + 0.16 * rand(i, 2);
  const reach = HALF_LEN * scale;
  return {
    c,
    x: xj,
    y,
    z: zj,
    scale,
    head: [c[0] - x[0] * reach, c[1] - x[1] * reach, c[2] - x[2] * reach],
    tail: [c[0] + x[0] * reach, c[1] + x[1] * reach, c[2] + x[2] * reach],
  };
});

// Where the chain commits: the top of the stack.
export const COMMIT = [0, PIN_TOP, 0];

// The thin threads: floe i's tail to floe i+1's head, the last one down onto
// the stack's top.
export const THREADS = FLOES.map((f, i) => [f.tail, i < N - 1 ? FLOES[i + 1].head : COMMIT]);

// The door: a hoop across the chain at component DOOR, square to it.
export const DOOR_AT = FLOES[DOOR].c;
export const DOOR_AXIS = FLOES[DOOR].x;

// A point `front` components (0..N) along the chain, between the two
// nearest floes' centres (for the travelling change).
export function frontPoint(front, out) {
  const f = Math.max(0, Math.min(N - 1, front));
  const i0 = Math.floor(f);
  const i1 = Math.min(N - 1, i0 + 1);
  const u = f - i0;
  const a = FLOES[i0].c;
  const b = FLOES[i1].c;
  out[0] = a[0] + (b[0] - a[0]) * u;
  out[1] = a[1] + (b[1] - a[1]) * u;
  out[2] = a[2] + (b[2] - a[2]) * u;
  return out;
}

// Plain floes stranded along the outflow's banks, in world x/z: afloat in
// the shallows where floes belong. Up and downstream of the funnel, off the
// Outflow Bridge, never in the fast water down the middle.
export const STRANDED = [];
{
  const probe = {};
  for (const [x0, side] of [[60.8, -1], [67.2, 1], [68.6, -1], [80.6, 1], [82.2, -1], [84.2, 1], [85.4, -1]]) {
    // walk across the river from the centre line to the bank at this x
    const zc = x0 < 66 ? -30 - (x0 - 58) / 8 : -31 - (x0 - 66) / 4;
    let z = zc;
    for (let k = 0; k < 80; k++) {
      riverAt(x0, z + side * 0.1, probe);
      if (probe.depth < 0.2) break;
      z += side * 0.1;
    }
    STRANDED.push({ x: x0, z, yaw: rand(x0, 3) * Math.PI, scale: 0.8 + 0.5 * rand(x0, 4) });
  }
}
