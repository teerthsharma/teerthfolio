// Pure layout for the "chain" sculpture: facebook/pyrefly #4180. Ports the
// landing figure's own geometry (teerthsharma.github.io/fig.js, "chain —
// pyrefly-4180") into 3D: 208 two-module SCCs wound into a tapering coil,
// each component a pair of beads (a, b) bound by a short thick link, spaced
// at equal ARC LENGTH along the coil (tabulated once and inverted, exactly
// as the figure does) rather than equal angle, so the taper reads evenly.
//
// World axes: x/z are the coil's horizontal circle, y is height (the
// figure's z). Local origin is the plinth top; +z faces the camera and dock.

const N = 208; // labels[0]: "one export change, 208 two-module SCCs"
const DOOR = 100; // labels[1]: "the incremental budget runs out at epoch 100"
const TURNS = 4.5;
const R1 = 2.6, R0 = 0.85; // top / bottom radius -- stays inside the 3.4 m footprint
const Y_TOP = 6.3, Y_BOTTOM = 0.85; // stays under the 7 m height cap
const A = TURNS * Math.PI * 2;

// Turn the whole coil about the y axis so the door faces the dock (+z), a
// little to the side -- tuned by eye against a capture, as fig.js's own
// M.ph0 is tuned against its 2D canvas.
const FACING = 1.05;

function at(a) {
  const f = a / A;
  const r = R1 + (R0 - R1) * f;
  return [r * Math.cos(a), Y_TOP + (Y_BOTTOM - Y_TOP) * f, r * Math.sin(a)];
}

// Arc-length table, tabulated once and inverted: N components land at equal
// length along the real curve, not equal angle.
const K = 4000;
const cum = new Float64Array(K + 1);
{
  let prev = at(0);
  for (let i = 1; i <= K; i++) {
    const cur = at((A * i) / K);
    cum[i] = cum[i - 1] + Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
    prev = cur;
  }
}
const LEN = cum[K];
function pointAt(s) {
  const target = s * LEN;
  let lo = 0, hi = K;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid; else hi = mid;
  }
  const frac = (target - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return at((A * (lo + frac)) / K);
}

const doorRaw = pointAt(DOOR / N);
const rotOff = FACING - Math.atan2(doorRaw[2], doorRaw[0]);
const cosR = Math.cos(rotOff), sinR = Math.sin(rotOff);
const rot = (p) => [p[0] * cosR - p[2] * sinR, p[1], p[0] * sinR + p[2] * cosR];

const GAP = 1 / N;
const HALF = GAP * 0.22;

export const CHAIN_N = N;
export const CHAIN_DOOR = DOOR;

// One entry per component: a/b are the two module-beads (the bond between
// them is the "short thick link" -- the SCC's own cycle); c is its centre,
// used both for the wavefront marker and as the next component's anchor.
export const CHAIN = Array.from({ length: N }, (_, i) => {
  const sc = GAP * (i + 0.5);
  return { a: rot(pointAt(sc - HALF)), b: rot(pointAt(sc + HALF)), c: rot(pointAt(sc)) };
});

// Commit sits at the coil's foot: below its lowest turn and pulled toward
// the dock (+z) so the coil's own strands never sit in front of it.
export const CHAIN_COMMIT = [0.05, Y_BOTTOM - 0.42, 0.62];

// The door: a hoop around the coil at component 100, oriented across the
// path's own tangent there.
export const CHAIN_DOOR_POINT = rot(pointAt(DOOR / N));
const p0 = rot(pointAt(DOOR / N - 0.0015));
const p1 = rot(pointAt(DOOR / N + 0.0015));
const tx = p1[0] - p0[0], ty = p1[1] - p0[1], tz = p1[2] - p0[2];
const tl = Math.hypot(tx, ty, tz) || 1;
export const CHAIN_DOOR_TANGENT = [tx / tl, ty / tl, tz / tl];

// A point a fractional distance `front` (0..N) along the coil, lerped
// between the two nearest components' centres -- used to place the
// travelling "change" marker.
export function chainFrontPoint(front, out) {
  const f = Math.max(0, Math.min(N - 1, front));
  const i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1);
  const u = f - i0;
  const c0 = CHAIN[i0].c, c1 = CHAIN[i1].c;
  out[0] = c0[0] + (c1[0] - c0[0]) * u;
  out[1] = c0[1] + (c1[1] - c0[1]) * u;
  out[2] = c0[2] + (c1[2] - c0[2]) * u;
  return out;
}
