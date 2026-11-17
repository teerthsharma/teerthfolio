// SCULPTED HEAD of the neutral seal (head-local metres: origin at the nose, +y up, faces +z, 0.30 m across).
// One signed distance field: skull, a wide mid face with cheekbones, a heavy slanted brow ridge, carved eye sockets, a short
// snout with whisker pads and a nose pad at its tip, a jaw and chin, and a mouth pocket cut under the snout (a band between an
// upper and a lower lip curve, as deep as the muzzle). Expression is four numbers in `pa` baked into the field: smile lifts the
// cheeks and mouth corners, open sets the pocket height, brow slants and lowers the ridge, drop lowers the chin.
// The light then draws the face: shadow under the brow, down the far cheek and under the snout comes from this form.
import { C, E, mesh, recolor, smax, smin, ss, gridNoise, softenBias } from "./sculpt.js";
import { cone, paint, polygonize } from "../../../sdf.js";

const MOUTH = { y: -0.057, w: 0.1, depth: 0.03 };

export function headField(pa) {
  const bl = 0.022 * pa.brow, up = 0.012 * pa.brow;
  const cran = E([0, 0.052, -0.02], [0.142, 0.15, 0.16]), mid = E([0, -0.016, 0.005], [0.15, 0.088, 0.148]);
  const jaw = E([0, -0.064 - pa.drop, 0.01], [0.098, 0.046, 0.12]), chin = E([0, -0.084 - pa.drop, 0.078], [0.05, 0.028, 0.044]);
  const cheek = E([0.099, -0.012 + 0.012 * pa.smile, 0.076], [0.05 + 0.008 * pa.smile, 0.04 + 0.014 * pa.smile, 0.05]);
  const muz = E([0, -0.038, 0.147], [0.066, 0.05, 0.06]), pad = E([0.042, -0.057, 0.141], [0.046, 0.03, 0.04]);
  const bridge = C([0, 0.046, 0.134], [0, -0.004, 0.193], 0.031, 0.028), nose = E([0, -0.007, 0.209], [0.029, 0.019, 0.019]);
  const brow = C([0, 0.082 - bl, 0.152], [0.118, 0.1 + up, 0.106], 0.023, 0.021), temple = E([0.125, 0.07, 0.06], [0.03, 0.05, 0.07]);
  const sock = E([0.069, 0.056, 0.172], [0.038, 0.027, 0.052], [0, 0, 0.32 + 0.12 * pa.brow]), sock2 = E([0.093, 0.021, 0.158], [0.024, 0.014, 0.046], [0, 0, 0.3]);
  const base = (x, y, z) => {
    let d = smin(cran(x, y, z), mid(x, y, z), 0.07);
    d = smin(d, jaw(x, y, z), 0.05); d = smin(d, chin(x, y, z), 0.04); d = smin(d, cheek(x, y, z), 0.045);
    d = smin(d, muz(x, y, z), 0.05); d = smin(d, pad(x, y, z), 0.03); d = smin(d, bridge(x, y, z), 0.04); d = smin(d, nose(x, y, z), 0.014);
    d = smin(d, brow(x, y, z), 0.028); d = smin(d, temple(x, y, z), 0.05);
    d = smax(d, -sock(x, y, z), 0.012);
    return smax(d, -sock2(x, y, z), 0.01);
  };
  const w = MOUTH.w + 0.008 * pa.smile, h0 = 0.0065 + 0.017 * pa.open, c = 0.004 + 0.02 * pa.smile;
  const yU = (ax) => MOUTH.y + c * (ax / w) ** 2, yL = (ax) => yU(ax) - h0 * Math.max(0, 1 - (ax / w) ** 2) ** 0.7;
  const pocket = (x, y, z) => { // < 0 inside the mouth pocket
    const ax = Math.abs(x), band = Math.max(yL(ax) - y, y - yU(ax), ax - w, 0.02 - z);
    return Math.max(band, -base(x, y, z) - MOUTH.depth);
  };
  const full = (x, y, z) => { x = Math.abs(x); return smax(base(x, y, z), -pocket(x, y, z), 0.005); };
  return { full, base, pocket, yU, yL, w, h: h0 };
}

export function teethGeometry(H, base, tooth) {
  const prims = [], m = paint(tooth.col, tooth.shade, { line: 0.8 }), n = 14, span = H.w * 0.92;
  const zAt = (x, y) => { let a = 0.4, b = 0; for (let i = 0; i < 22; i++) { const mid = (a + b) / 2; if (H.base(x, y, mid) > 0) a = mid; else b = mid; } return (a + b) / 2; };
  for (const up of [1, -1]) for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n * 2 - 1, x = u * span, ax = Math.abs(x), y = up > 0 ? H.yU(ax) : H.yL(ax), z = zAt(x, y) - 0.011 - 0.004 * Math.abs(u);
    const canine = Math.abs(Math.abs(u) - 0.58) < 0.1, len = (0.0075 + (canine ? 0.005 : 0) - 0.0015 * Math.abs(u)) * (H.h > 0.02 ? 1 : 0.8), wd = (span * 2 / n) * 0.5 * (canine ? 0.95 : 0.9);
    const a = [x, y + (up > 0 ? 0.006 : 0), z - (up > 0 ? 0 : 0.006)], b = [x * 0.995, y - up * len * (up > 0 ? 1 : 0.85), z + 0.001];
    prims.push(cone(a, b, wd, 0.0032, m, 0.0));
  }
  return polygonize(prims, 0.0022);
}

export function headGeometry(look, pa) {
  const H = headField(pa), sk = look.skin, mo = look.mouth, noseF = E([0, -0.007, 0.209], [0.032, 0.021, 0.02]);
  const geo = mesh(H.full, [-0.17, -0.15, -0.2], [0.17, 0.22, 0.24], 0.0042, [sk.coat, sk.shade]);
  recolor(geo, (x, y, z, nx, ny, nz, o) => {
    const ax = Math.abs(x), yy = y + 0.062, nz2 = gridNoise(x, y, z, 52);
    const mz = ss(1.05, 0.78, Math.hypot(ax / 0.098, yy / 0.07)) * ss(0.03, 0.09, z) + 0.5 * ss(-0.075, -0.1, y) * ss(0.02, 0.08, z) + (nz2 - 0.5) * 0.3;
    o.col = mz > 0.5 ? sk.muzzle : sk.coat; o.shade = mz > 0.5 ? sk.muzzleShade : sk.shade;
    if (noseF(x, y, z) < 0.0035 && z > 0.18) { o.col = sk.nose; o.shade = sk.nose; if (y > 0 && nx < 0.2) o.col = "#7d6a72"; }
    const deep = H.base(x, y, z);
    if (deep < -0.003 && Math.abs(y - MOUTH.y) < 0.045) {
      const back = deep < -MOUTH.depth + 0.005;
      const atRow = y > H.yU(ax) - 0.008 || y < H.yL(ax) + 0.008;
      o.col = o.shade = back ? mo.cavity : atRow ? mo.gum : mo.cavity; o.id = 3;
    }
  });
  softenBias(geo, 0.55);
  return { geo, H };
}
