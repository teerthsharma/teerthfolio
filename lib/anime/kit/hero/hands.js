// HERO HANDS: stylised four-finger-and-thumb mitten hands as swappable shapes. RIGHT hand, wrist at the origin,
// fingers along -y, palm facing -x (the body), thumb toward +z. Every finger, thumb and palm is its own closed
// SDF part, so where two parts overlap the line pass finds a crease (finger separation, knuckles) and the
// ink hull stays one clean outline. handParts() returns lists of prims, one list per part, to polygonize.
import { cone, ell } from "../../sdf.js";

export const HAND_SHAPES = ["open", "fist", "point", "two", "flat", "flipper", "claw", "hold"];
// the grip axis of "hold" is +z through this wrist-frame point (props.js frame: the line the curled fingers wrap)
export const GRIP = [-0.016, -0.052, 0];

const FZ = [0.0255, 0.0085, -0.0085, -0.0255], FL = [0.043, 0.049, 0.044, 0.035], ROOT = -0.066;
const RAD = [0.0094, 0.0089, 0.0083, 0.0077], FR = [0.42, 0.31, 0.27];
const dirOf = (th, phi) => { const v = [-Math.sin(th), -Math.cos(th), Math.sin(phi)], l = Math.hypot(...v); return v.map((x) => x / l); };
const add = (p, d, s) => [p[0] + d[0] * s, p[1] + d[1] * s, p[2] + d[2] * s];

// one finger: root, flex per joint (rad, toward the palm), fan angle phi; straight ones are one smooth cone,
// bent ones are one part per phalanx so the knuckles crease. `nail` adds a pointed tip.
function digit(i, flex, phi, m, nail, lenK = 1) {
  const root = [-0.002, ROOT, FZ[i]], pts = [root];
  let th = 0, d = dirOf(0, phi);
  for (let j = 0; j < 3; j++) { th += flex[j]; d = dirOf(th, phi); pts.push(add(pts[j], d, FL[i] * lenK * FR[j])); }
  const parts = flex.every((f) => Math.abs(f) < 0.25)
    ? [[cone(root, pts[3], RAD[0], RAD[3], m, 0.004)]]
    : [0, 1, 2].map((j) => [cone(pts[j], pts[j + 1], RAD[j], RAD[j + 1], m, 0)]);
  if (nail) parts.push([cone(pts[3], add(pts[3], d, 0.016), 0.0056, 0.0014, nail, 0.002)]);
  return parts;
}

function thumb(pts, m, nail, split) {
  const [a, b, c] = pts, tip = c;
  const segs = split ? [[cone(a, b, 0.0128, 0.0112, m, 0)], [cone(b, c, 0.0112, 0.0096, m, 0)]] : [[cone(a, b, 0.0128, 0.0112, m, 0.006), cone(b, c, 0.0112, 0.0096, m, 0.006)]];
  if (nail) { const d = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], l = Math.hypot(...d); segs.push([cone(tip, add(tip, d, 0.016 / l), 0.0058, 0.0014, nail, 0.002)]); }
  return segs;
}

const CURL = [1.5, 1.6, 1.1], LOOSE = [1.2, 1.5, 1.0], HOOK = [0.5, 0.75, 0.55], STR = [0, 0, 0], REST = [0.1, 0.06, 0.03];
const THUMB = {
  out: [[-0.006, -0.026, 0.031], [-0.014, -0.052, 0.06], [-0.02, -0.072, 0.078]],
  along: [[-0.004, -0.03, 0.032], [-0.007, -0.058, 0.04], [-0.01, -0.079, 0.041]],
  tuck: [[-0.008, -0.03, 0.032], [-0.03, -0.05, 0.028], [-0.036, -0.071, 0.012]],
  hook: [[-0.006, -0.026, 0.031], [-0.017, -0.05, 0.056], [-0.03, -0.065, 0.068]],
};
const SPEC = {
  open: { fl: [STR, STR, STR, STR], phi: [0.22, 0.07, -0.08, -0.24], th: "out" },
  flat: { fl: [REST, REST, REST, REST], phi: [0.03, 0.01, -0.01, -0.03], th: "along" },
  fist: { fl: [CURL, CURL, CURL, CURL], phi: [0, 0, 0, 0], th: "tuck", split: true, big: 1.1 },
  hold: { fl: [LOOSE, LOOSE, LOOSE, LOOSE], phi: [0, 0, 0, 0], th: "tuck", split: true, big: 1.12 },
  point: { fl: [STR, CURL, CURL, CURL], phi: [0.04, 0, 0, 0], th: "tuck", split: true, big: 1.1 },
  two: { fl: [STR, STR, CURL, CURL], phi: [0.14, -0.06, 0, 0], th: "tuck", split: true, big: 1.1 },
  claw: { fl: [HOOK, HOOK, HOOK, HOOK], phi: [0.3, 0.1, -0.1, -0.3], th: "hook", nails: true },
};

// m: skin paint, nail: darker paint for claws; returns an array of prim lists
export function handParts(shape, m, nail) {
  if (shape === "flipper") return [[ell([0, -0.058, 0.004], [0.018, 0.074, 0.046], m, 0.02, [0, 0, 0.08]), ell([0, -0.012, 0], [0.024, 0.026, 0.034], m, 0.02)],
    ...[0.03, 0.01, -0.01, -0.03].map((z, i) => [cone([-0.002, -0.112, z * 1.3], [-0.005 - 0.002 * i, -0.142 - 0.004 * (i === 1 || i === 2), z * 2.1], 0.0095, 0.0072, m, 0.002)]),
    [cone([-0.002, -0.056, 0.036], [-0.012, -0.092, 0.074], 0.0125, 0.0092, m, 0.004)]]; // thumb, split off the finger fan
  const s = SPEC[shape], b = s.big ?? 1;
  const parts = [[ell([0, -0.038, 0], [0.0185 * b, 0.042, 0.0355 * b], m, 0.01), ell([-0.002, -0.068, 0], [0.016 * b, 0.011, 0.034 * b], m, 0.01)]];
  for (let i = 0; i < 4; i++) parts.push(...digit(i, s.fl[i], s.phi[i], m, s.nails ? nail : null));
  parts.push(...thumb(THUMB[s.th], m, s.nails ? nail : null, s.split));
  return parts;
}
