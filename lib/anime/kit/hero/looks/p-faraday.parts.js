// PARTS for the p-faraday look: the Tokiwadai vest (V neck, wine trim, knit hem), the white Peter Pan collar, the
// chest crest and the short blouse sleeves, as plain geometries the look wraps in figures and attaches. Built on
// the shared torso rows and wear/geo.js decals; the sleeves are rigid caps in the shoulder pivot frame.
import { CylinderGeometry, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cone, ell, paint, polygonize } from "../../../sdf.js";
import { ALL_ROWS, P, TAU, clipped, grown, onF, patch, poly, strip, tube } from "../wear/geo.js";
import { UPPER, cached, darker, piece, torsoRow } from "../body.js";

const VEST = "#d8c0a8", VEST_SH = "#a98e78", WINE = "#8a3a40", WHITE = "#ffffff", WHITE_SH = "#c3cbe0";
const C0 = [0, 0, -0.02], GV = 0.026, V0 = 0.2, SLOPE = 0.5;
const vw = (y) => Math.max(0, (y - V0) * SLOPE);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const flat = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
const dec = (g, col, line = 0.45) => piece(g, col, darker(col, 0.7), { line });
const tag = (g, kind) => { g.userData.print = kind; return g; };

// one geometry on the body bone: vest shell, trim, hem, collar, crest
export const bodyWear = () => cached("faraday|body", () => {
  const m = P(VEST, VEST_SH), F = grown(GV), Fc = grown(GV + 0.012), parts = [];
  const neckTop = (x) => 0.405 + 0.035 * sstep(0.08, 0.13, Math.abs(x));
  const clip = (x, y, z) => Math.max(0.1 - y, y - neckTop(x), 0.1 - Math.hypot(Math.abs(x) - 0.238, y - 0.43, (z - 0.03) * 1.2), y > V0 ? Math.min(z + 0.02, vw(y) - Math.abs(x)) : -1);
  parts.push(polygonize([clipped(ALL_ROWS.map((n) => torsoRow(n, m, GV)), clip, m)], 0.008));
  const wm = P(WHITE, WHITE_SH), hole = (x, y, z) => 0.1 - Math.hypot(Math.abs(x) - 0.238, y - 0.43, (z - 0.03) * 1.2);
  parts.push(polygonize([clipped(ALL_ROWS.map((n) => torsoRow(n, wm, 0.012)), (x, y, z) => Math.max(0.17 - y, y - (0.43 + 0.04 * (1 - sstep(0.1, 0.16, Math.abs(x)))), hole(x, y, z)), wm)], 0.008));
  for (const s of [1, -1]) {
    const edge = []; for (let y = 0.435; y >= V0 - 0.004; y -= 0.02) edge.push([s * Math.atan2(vw(y) + 0.004, 0.2), y]);
    parts.push(dec(strip(F, C0, edge, 0.03, 0.018, 0.0035), WINE, 0.7));
    parts.push(dec(strip(F, C0, edge.map(([t, y]) => [t - s * 0.045, y - 0.012]), 0.008, 0.006, 0.0042), WHITE, 0.4));
  }
  const hem = []; for (let i = 0; i <= 96; i++) { const t = (i / 96) * TAU; hem.push(onF(F, C0, t, 0.108 + 0.011 * Math.cos(6 * t), 0.002)); }
  parts.push(piece(tube(hem, 0.0065, 192), "#c4a98f", VEST_SH));
  for (let k = 0; k < 6; k++) { const t = (k + 0.5) * TAU / 6, r = []; for (let j = 0; j <= 4; j++) r.push([t, 0.12 + 0.011 * Math.cos(6 * t) + j * 0.017]); parts.push(dec(strip(F, C0, r, 0.004, 0.0012, 0.002), VEST_SH, 0.3)); }
  const bow = (g, x, y, z, rz) => { g.rotateZ(rz).translate(x, y, z); return dec(g, WINE, 0.8); };
  const bp = onF(Fc, C0, 0, 0.405, 0.012);
  for (const s of [1, -1]) parts.push(bow(new SphereGeometry(1, 14, 10).scale(0.034, 0.018, 0.01), bp.x + s * 0.034, bp.y - 0.004, bp.z, s * 0.3));
  parts.push(bow(new SphereGeometry(1, 12, 8).scale(0.014, 0.014, 0.011), bp.x, bp.y, bp.z + 0.003, 0));
  for (const s of [1, -1]) {
    const lobe = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI; lobe.push([s * (0.08 + 0.3 * (1 - Math.cos(a)) / 2 * 1.6), 0.462 - 0.1 * Math.sin(a) * (0.55 + 0.45 * Math.sin(a))]); }
    parts.push(dec(poly(Fc, C0, lobe, 0.002), WHITE, 0.9));
  }
  const crest = (rf, col, lift, rot = 0) => dec(patch(F, C0, 0.58, 0.335, rf, { lift, rot }), col, 1);
  parts.push(crest(() => 0.03, "#a8503c", 0.004), crest((a) => 0.016 * (1 + 0.35 * Math.cos(5 * a)), "#e8c870", 0.007));
  return tag(flat(parts), "vest");
});

// short puffed sleeve over the upper arm, in the shoulder pivot frame (origin at the shoulder, arm along -y)
export const sleeveCaps = () => cached("faraday|sleeve", () => {
  const m = paint(WHITE, WHITE_SH), E = [0, -UPPER * 0.9, 0];
  const g = polygonize([ell([0, 0, 0], [0.066, 0.066, 0.066], m, 0.02), cone([0, 0, 0], E, 0.062, 0.058, m, 0.02)], 0.006);
  const hem = new SphereGeometry(1, 28, 6).scale(0.062, 0.012, 0.062).translate(0, E[1] + 0.006, 0);
  const cuff = new SphereGeometry(1, 28, 6).scale(0.06, 0.008, 0.06).translate(0, E[1] - 0.008, 0);
  return tag(flat([g, piece(hem, "#e9edf6", WHITE_SH), piece(cuff, WINE, darker(WINE, 0.7))]), "sleeve");
});

// ink-coloured coin and a spark bolt riding the raised hand
export const coinSpark = () => cached("faraday|coin", () => {
  const coin = new CylinderGeometry(0.03, 0.03, 0.007, 20).rotateX(Math.PI / 2).translate(0, 0.07, 0.02);
  const pts = [[0, 0.13, 0.02], [0.03, 0.15, 0.02], [0.005, 0.17, 0.02], [0.04, 0.2, 0.02]];
  return tag(flat([piece(coin, "#e6c25a", "#9c7a2c"), piece(tube(pts.map((p) => new Vector3(...p)), 0.004, 12), "#bfe8ff", "#5a9ad0")]), "coin");
});
