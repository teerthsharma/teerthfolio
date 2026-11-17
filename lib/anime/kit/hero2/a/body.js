// SCULPTED UPPER FIGURE (figure-local metres: origin at the waist, +y up, faces +z): chest and shoulders, a neck, wide sleeves bent at
// the elbow with creases, black wristbands, and a hollow stand collar that stands higher at the back and sides than at the front.
// Meshed once from signed distance fields; the collar is a thin SDF shell, so it is open at the top.
import { cone, ell, paint, polygonize } from "../../../sdf.js";
import { recolor, softenBias, ss } from "./sculpt.js";

export const HEAD_AT = [0, 0.86, 0.02];
export const WRIST = [0.145, 0.425, 0.3]; // right wrist; the left is mirrored
const ELBOW = [0.5, 0.14, 0.04], SHOULDER = [0.4, 0.45, -0.01];

const collarR = (y) => { const t = Math.min(1, Math.max(0, (y - 0.5) / 0.3)); return [0.2 - 0.03 * t + 0.035 * t * t * t, 0.16 - 0.03 * t + 0.02 * t * t * t]; };
const collarTop = (x, z, rz, rise) => 0.69 + (0.05 * Math.max(0, -z / rz) + 0.085 * ss(0.05, 0.17, Math.abs(x))) * rise - 0.04 * Math.max(0, z / rz) ** 2;
function collarPrim(o) {
  const f = (x, y, z) => {
    const [rx, rz] = collarR(y), d = (Math.hypot(x / rx, (z - 0.0) / rz) - 1) * Math.min(rx, rz);
    const top = collarTop(x, z, rz, o.collar.rise);
    return Math.max(Math.abs(d) - (0.0125 + 0.009 * ss(top - 0.045, top, y)), y - top, 0.47 - y);
  };
  return { f, lo: [-0.27, 0.45, -0.25], hi: [0.27, 0.9, 0.25], k: 0.0, m: paint(o.cloth, o.shade) };
}

export function bodyGeometry(look) {
  const o = look.outfit, cl = paint(o.cloth, o.shade), cuff = paint(o.cuff, "#07050b"), sk = paint(look.hands.skin, look.hands.shade);
  const prims = [
    ell([0, 0.27, 0], [0.4, 0.27, 0.22], cl, 0.12), ell([0, 0.02, 0], [0.38, 0.2, 0.21], cl, 0.1), ell([0, 0.5, -0.03], [0.22, 0.07, 0.15], cl, 0.1),
    ell([0.37, 0.44, -0.01], [0.15, 0.092, 0.14], cl, 0.1), ell([-0.37, 0.44, -0.01], [0.15, 0.092, 0.14], cl, 0.1),
    cone([0, 0.56, 0], [0, 0.8, 0.012], 0.1, 0.088, paint(o.shade, o.shade), 0.05),
    collarPrim(o),
    ell([0.122, 0.672, 0.12], [0.02, 0.02, 0.008], paint(o.trim, "#6d5a1c"), 0, [0, 0.62, 0]),
    ell([0.17, 0.43, 0.2], [0.11, 0.013, 0.05], cl, 0.03, [0.35, 0.2, -0.55]), ell([-0.17, 0.43, 0.2], [0.11, 0.013, 0.05], cl, 0.03, [0.35, -0.2, 0.55]),
    ell([0, 0.24, 0.226], [0.008, 0.2, 0.012], cl, 0.03), ell([0.3, 0.5, 0.1], [0.1, 0.012, 0.05], cl, 0.03, [0.3, 0.3, 0.3]), ell([-0.3, 0.5, 0.1], [0.1, 0.012, 0.05], cl, 0.03, [0.3, -0.3, -0.3]),
    ell([0.2, 0.2, 0.2], [0.03, 0.1, 0.012], cl, 0.03, [0, 0, 0.3]), ell([-0.2, 0.2, 0.2], [0.03, 0.1, 0.012], cl, 0.03, [0, 0, -0.3]),
  ];
  for (const s of [1, -1]) {
    const S = [s * SHOULDER[0], SHOULDER[1], SHOULDER[2]], El = [s * ELBOW[0], ELBOW[1], ELBOW[2]], W = [s * WRIST[0], WRIST[1], WRIST[2]];
    const dir = [W[0] - El[0], W[1] - El[1], W[2] - El[2]], L = Math.hypot(...dir), u = dir.map((v) => v / L), at = (p, k) => p.map((v, i) => v + u[i] * k);
    prims.push(cone(S, El, 0.094, 0.086, cl, 0.07), ell(El, [0.09, 0.09, 0.09], cl, 0.06), cone(El, at(W, -0.015), 0.09, 0.058, cl, 0.06),
      ell(at(W, -0.035), [0.062, 0.045, 0.062], cl, 0.05), cone(at(W, -0.012), at(W, 0.055), 0.0545, 0.052, cuff, 0.006), cone(at(W, 0.05), at(W, 0.08), 0.039, 0.036, sk, 0.01));
    // creases: ridges folded across the elbow and the forearm
    for (const [t, r, k] of [[0.16, 0.098, 0.4], [0.3, 0.09, 0.5], [0.5, 0.074, 0.4], [0.7, 0.062, 0.3]]) {
      const c = El.map((v, i) => v + dir[i] * t);
      prims.push(ell([c[0], c[1] + 0.012 * s * 0, c[2]], [r * 0.98, 0.018, r * 0.98], cl, 0.03, [0.5 - 0.6 * t, 0, -s * (0.55 + 0.2 * t)]));
    }
  }
  const geo = softenBias(polygonize(prims, 0.0085), 0.7);
  recolor(geo, (x, y, z, nx, ny, nz, c) => {
    const bx = x - 0.115, by = y - 0.69, bz = z - 0.17;
    if (o.button && Math.hypot(bx, by * 1.15, bz) < 0.02 && nz > 0.3) { c.col = o.trim; c.shade = "#6d5a1c"; }
  });
  return geo;
}
