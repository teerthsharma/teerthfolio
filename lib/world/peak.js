// THE FOUNTAIN PEAK (open2c/polychrom #79, place pr-polychrom-79): a spire mountain standing alone
// in the far south-east of the island, 20+ m of banded cliff and terrace, with the Fountain of
// Immortality on its flat summit. A winding path (PEAK_PATH) is cut into the cliff and climbs it in
// a turn and a half; the seal walks it (the ground follows the path's height, the rest is cliff:
// peakBlocked). A glacier river leaves the summit as a waterfall down the north-east face and
// lands in the spring pool at the foot, where lib/world/river.js's GLACIER river begins.
// Pure and allocation-free per call, like lib/world/terrain.js, which adds the peak to the island.

export const PEAK = {
  x: 30,
  z: 57,
  top: 21, // summit height (m)
  flat: 6.5, // radius of the flat summit
  edge: 14, // radius of the foot on the plain
  turns: 1.5, // how far round the path winds
  half: 1.6, // half-width of the walkable bench
  fall: -0.35, // the waterfall's face, as an angle (rad) from east toward south: north-east
};

const TAU = Math.PI * 2;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function hash(ix, iz) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  return (hash(ix, iz) * (1 - ux) + hash(ix + 1, iz) * ux) * (1 - uz) + (hash(ix, iz + 1) * (1 - ux) + hash(ix + 1, iz + 1) * ux) * uz;
}

const SPAN = PEAK.edge - PEAK.flat;
const PERIOD = PEAK.top / 7; // seven terraces, the top one the summit itself

// The spire's bare profile at radius d: flat on top, a steep dome down to the plain.
function profile(d) {
  return PEAK.top * Math.pow(1 - clamp01((d - PEAK.flat) / SPAN), 1.3);
}
// its inverse: the radius where the bare profile stands at height h
function radiusAt(h) {
  let lo = PEAK.flat;
  let hi = PEAK.edge;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (profile(mid) > h) lo = mid;
    else hi = mid;
  }
  return lo;
}

// The path, from the north foot (angle -90) up to the dock on the summit's south side (angle +90):
// centre-line samples [x, z, height]. It is cut into the cliff (radius a little inside the bare
// profile), so the bench is a ledge, not a bridge.
const N = 220;
export const PEAK_PATH = [];
export const PEAK_DOCK_RADIUS = 4.2;
for (let i = 0; i <= N; i++) {
  const t = i / N;
  const h = PEAK.top * t;
  const r = Math.max(radiusAt(h) - 1.4, PEAK.flat + 0.9); // a ledge cut into the cliff; the last stretch rings the summit rim
  const a = -Math.PI / 2 + PEAK.turns * TAU * t;
  PEAK_PATH.push([PEAK.x + Math.cos(a) * r, PEAK.z + Math.sin(a) * r, h]);
}
// the last metres run straight in over the flat summit to the dock
for (let k = 1; k <= 6; k++) PEAK_PATH.push([PEAK.x, PEAK.z + PEAK.flat + 0.9 + ((PEAK_DOCK_RADIUS - PEAK.flat - 0.9) * k) / 6, PEAK.top]);
const M = PEAK_PATH.length - 1;
// waypoints for lib/world/land.js PATHS: the foot link first, then every 12th sample
export const PEAK_WAYPOINTS = PEAK_PATH.filter((_, i) => i % 11 === 0 || i === M).map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);

// nearest path point to (x, z): squared-free distance and the path height there
function nearPath(x, z, out) {
  let best = Infinity;
  let h = 0;
  for (let i = 0; i < M; i++) {
    const [ax, az, ah] = PEAK_PATH[i];
    const [bx, bz, bh] = PEAK_PATH[i + 1];
    const sx = bx - ax;
    const sz = bz - az;
    const t = clamp01(((x - ax) * sx + (z - az) * sz) / (sx * sx + sz * sz || 1));
    const d = Math.hypot(x - ax - sx * t, z - az - sz * t);
    if (d < best) {
      best = d;
      h = ah + (bh - ah) * t;
    }
  }
  out.dist = best;
  out.h = h;
}

const NP = {};
// The peak's height at (x, z): -Infinity outside its foot. Banded terraces with steep risers,
// ridged by noise, the summit dead flat, the path bench flat across and blended into the rock.
export function peakHeight(x, z) {
  const d = Math.hypot(x - PEAK.x, z - PEAK.z);
  if (d >= PEAK.edge) return -Infinity;
  if (d <= PEAK.flat) return PEAK.top;
  let h = profile(d);
  const tt = h / PERIOD;
  const n = Math.floor(tt);
  h = 0.55 * h + 0.45 * (n + smooth(0.55, 1, tt - n)) * PERIOD; // terraces
  h += (vnoise(x / 2.3, z / 2.3) - 0.5) * 1.4 * smooth(0, 5, h) * smooth(PEAK.top, PEAK.top - 3, h); // ridges
  nearPath(x, z, NP);
  const w = 1 - smooth(PEAK.half + 0.5, PEAK.half + 1.9, NP.dist);
  h = h * (1 - w) + NP.h * w;
  return h < 0 ? 0 : h;
}

// Can the seal stand here? On the summit, on the path's bench, or on the plain at the foot.
export function peakBlocked(x, z) {
  const d = Math.hypot(x - PEAK.x, z - PEAK.z);
  if (d >= PEAK.edge - 0.5 || d <= PEAK.flat) return false;
  nearPath(x, z, NP);
  return NP.dist > PEAK.half;
}

// the walking height of the seal at (x, z): the ground on the peak, 0 elsewhere
export function peakFloor(x, z) {
  const d = Math.hypot(x - PEAK.x, z - PEAK.z);
  if (d >= PEAK.edge) return 0;
  if (d <= PEAK.flat) return PEAK.top;
  nearPath(x, z, NP);
  return NP.dist <= PEAK.half + 0.6 ? NP.h : peakHeight(x, z);
}

// the seal's view of the peak (lib/world/motion.js world.peak)
export const PEAK_WORLD = { floor: peakFloor, blocked: peakBlocked };
