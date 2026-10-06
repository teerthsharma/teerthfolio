// HOME fx: shared constants, the clock, the world ports and the GLSL snippets every effect uses.
// Coordinates are the bible's rig frame (pup at the jetty end = origin, -z toward Vinland, +x right of the jetty).
// These are ports of the p4-int home move (farm.js / land.js / home.jsx) so the FX agrees with the WORLD and CAST layers on where things are.
// The clock reads scene.beats first (the DIRECTION agent's times win) and falls back to the bible's seconds (24 fps frame / 24).

export const WATER_Y = -0.55;
export const VIN = { x: 6, z: -162 };                       // Vinland headland centre (land.js: vinlandGeometry at VIN_Z -150, shifted +6 in x, -12 in z)
export const IGLOO = { x: -12.6, z: -6.4, ry: 0.55, s: 1.75 };
export const JETTY = { x0: -6.6, x1: 1.4, w: 1.55 };
export const OC = { cx: 0.5, cz: -0.3, rx: 3.3, rz: 2.7 }; // the orca's circle round the pup
export const THORS_AT = [-2.4, 0, -0.5];
const _s = Math.hypot(0.3, 0.2, 0.93);
export const SUN_DIR = [0.3 / _s, 0.2 / _s, -0.93 / _s];     // toward the low dawn sun, over the fjord mouth

export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, k) => a + (b - a) * k;

// ---- terrain height (port of land.js H) so the cairns sit on the ledges the WORLD agent builds ----
const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, z) => {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (hash2(ix, iz) * (1 - u) + hash2(ix + 1, iz) * u) * (1 - v) + (hash2(ix, iz + 1) * (1 - u) + hash2(ix + 1, iz + 1) * u) * v;
};
const fbm = (x, z) => 0.5 * vn(x, z) + 0.25 * vn(x * 2.03, z * 2.03) + 0.125 * vn(x * 4.1, z * 4.1) + 0.0625 * vn(x * 8.3, z * 8.3);
const SHORE_L = -6;
const mouth = (z) => sm(-118, -150, z);
export const shoreL = (z) => SHORE_L - 80 * mouth(z);
export const shoreR = (z) => 15 - 6 * sm(-15, -95, z) + 80 * mouth(z);
function ledges(w) { const t = w / 3.4, f = t - Math.floor(t); return (Math.floor(t) + sm(0.5, 0.93, f)) * 3.4 * 0.62 + w * 0.38; }
export function H(x, z) {
  const dL = shoreL(z) - x, dR = x - shoreR(z), fade = 1 - mouth(z) * 0.92;
  let y;
  if (dL > 0) {
    const meadow = -0.62 + 1.1 * Math.pow(Math.min(1, dL / 3.6), 0.8) + 0.03 * Math.max(0, Math.min(dL, 24) - 3.6);
    const wall = ledges((36 * (1 - Math.exp(-dL / 6.5)) + 16 * fbm(x * 0.05, z * 0.05) * sm(2, 16, dL)) * fade);
    const k = Math.max(sm(-20, -34, z), sm(24, 34, dL), sm(14, 22, z));
    y = meadow + (wall - meadow) * k;
    y += (fbm(x * 0.5, z * 0.5) - 0.5) * 0.35 * sm(3, 8, dL) * (1 - k);
  } else if (dR > 0) {
    y = -0.62 + ledges((38 * (1 - Math.exp(-dR / 7.5)) + 14 * fbm(x * 0.05 + 9, z * 0.05) * sm(2, 16, dR)) * fade);
  } else { y = -0.62 - 2.6 * sm(0, 6, Math.min(-dL, -dR)); }
  if (x > SHORE_L - 1) y = Math.max(y, -0.58 + 0.78 * Math.exp(-(((z + 3.7) / 1.05) ** 2)) * (1 - sm(0.5, 4.4, x)) * (1 - sm(-7, -5, -x)));
  return y;
}

// eleven cairns along the fjord's rim: right wall, left wall, alternating, away down the fjord (farm.js beaconSpots)
export function beaconSpots() {
  const out = [];
  for (let j = 0; j < 11; j++) {
    const z = -32 - 8.6 * j, right = j % 2 === 0;
    let x = right ? shoreR(z) + 3 : shoreL(z) - 3;
    for (let k = 0; k < 90; k++) { if (H(x, z) >= 17) break; x += right ? 0.6 : -0.6; }
    out.push([x, H(x, z), z]);
  }
  return out;
}
// longhouse smoke holes (farm.js HOUSES -> SMOKE_AT)
const HOUSES = [[9.5, 4.4, 1.5, 1.95, -22.5, -4.2, 0.12], [8.2, 4.0, 1.4, 1.8, -21, -14, -0.1], [7.0, 3.6, 1.3, 1.65, -31, -10, 0.35], [5.6, 3.2, 1.2, 1.5, -13.8, -16, -0.2], [6.4, 3.4, 1.2, 1.6, -29, 2.4, -0.15]];
export const SMOKE_AT = HOUSES.map(([, , wh, rh, x, z, ry]) => [x + Math.cos(ry) * 0.4, H(x, z) + 0.4 + wh + rh * 0.98 + 0.3, z - Math.sin(ry) * 0.4]);

// the orca's track (home.jsx orcaAt): out of the water beside the jetty, once round the pup, up to eye level at the deck's end, then down.
// surf 0..1 = how much of it breaks the surface.
export const TRK = { rise: [5.0, 5.9], circle: [5.8, 10.6], spy: [10.7, 11.3], sink: [11.6, 12.6] };
export function orcaAt(t, o = {}) {
  const rise = sm(TRK.rise[0], TRK.rise[1], t), k = sm(TRK.circle[0], TRK.circle[1], t);
  const a = 0.15 + Math.PI * 2 * k;
  let x = OC.cx + OC.rx * Math.cos(a), z = OC.cz - OC.rz * Math.sin(a);
  let yaw = Math.atan2(-OC.rx * Math.sin(a), -OC.rz * Math.cos(a));
  const dive = (1 - sm(0.5, 1.25, Math.abs(z))) * (1 - sm(1.0, 2.3, x));
  let y = lerp(-2.6, -0.66, rise) + (t < TRK.rise[1] + 0.4 ? 0.3 * Math.sin(Math.PI * sm(TRK.rise[0] + 0.05, TRK.rise[1] + 0.3, t)) : 0) - 1.9 * dive;
  const sp = sm(TRK.spy[0], TRK.spy[1] + 0.3, t);
  let pitch = 0;
  if (t > TRK.circle[1] - 0.3) {
    const j = sm(TRK.circle[1] - 0.3, TRK.spy[0] + 0.1, t);
    x = lerp(x, 3.7, j); z = lerp(z, 0.45, j);
    const to = Math.atan2(-3.7, -0.45);
    yaw += Math.atan2(Math.sin(to - yaw), Math.cos(to - yaw)) * j;
    pitch = 1.02 * sp; y = lerp(y, -1.5, sp);
  }
  const sink = sm(TRK.sink[0], TRK.sink[1], t);
  y -= 2.4 * sink;
  o.x = x; o.z = z; o.y = y; o.yaw = yaw; o.pitch = pitch * (1 - sink * 0.6);
  o.vis = t > TRK.rise[0] - 0.2 && t < TRK.sink[1] + 0.05 ? 1 : 0;
  o.surf = o.vis * (1 - sink) * sm(-2.0, -1.0, y);
  return o;
}

// ---- the clock: scene.beats first, the bible's seconds as fallback. Cue names used by this layer:
//   bleed, thorsbloom, smear, bloop, vinland, beacon (x11, or one + 0.5 s steps), rain, runoff
export function clock(scene) {
  const beats = scene.beats || [];
  const one = (n) => beats.find((b) => b.name === n);
  const bt = (n, d) => (one(n) ? one(n).t : d);
  const bd = (n, d) => (one(n) && one(n).dur ? one(n).dur : d);
  const all = (n) => beats.filter((b) => b.name === n).map((b) => b.t).sort((a, b) => a - b);
  const bc = all("beacon");
  const lit = Array.from({ length: 11 }, (_, j) => (bc.length >= 11 ? bc[j] : (bc.length ? bc[0] : 19.0) + 0.5 * j));
  const rain0 = bt("rain", 24.4), run0 = bt("runoff", 25.58);
  return {
    bleed: [bt("bleed", 0), bt("bleed", 0) + bd("bleed", 1.67)],
    thors: bt("thorsbloom", 2.3),
    smear: bt("smear", 10.708),
    bloop: bt("bloop", 12.0),
    vinland: bt("vinland", 12.8),
    lit,
    rain: [rain0, rain0 + bd("rain", 1.4)],
    run: [run0, run0 + bd("runoff", 2.7)], // front travel; the sheet holds bare to ~28.3 s
    end: scene.duration ?? 30.2,
  };
}

// ---- GLSL shared by the effects. h21/h11: sin-hash; vn: value noise; fbm: 4 octaves (maths in each shader's header)
export const GLSL_NOISE = /* glsl */ `
float h11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { return 0.5 * vn(p) + 0.25 * vn(p * 2.03) + 0.125 * vn(p * 4.1) + 0.0625 * vn(p * 8.3); }
`;
// camera-facing basis from the view matrix (rows of the rotation)
export const GLSL_BILL = /* glsl */ `
vec3 camRight() { return vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); }
vec3 camUp() { return vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]); }
`;

export function disposeAll(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}
