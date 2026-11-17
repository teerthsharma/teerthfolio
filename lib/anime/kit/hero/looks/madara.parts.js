// PARTS for the madara look: the red lamellar chest and skirt rows with the cream rope belt (one figure on the body) and the
// gunbai war fan (a copy on the back, a copy in the right flipper; the pose "madara-gunbai" swaps them).
import { ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cone, ell, paint, polygonize } from "../../../sdf.js";
import { cached, piece } from "../body.js";
import { HF, TF, along, clipped, onF, taper } from "../wear/geo.js";

export const RED = "#b3202e", RED_SH = "#6a0f1a", RED2 = "#9a1a28", CREAM = "#e8dcc2", CREAM_SH = "#b9a98a", INK = "#17120f";

const radius = (y, d) => along(TF, new Vector3(0, y, 0), d);

// one lamella row: an ellipsoid disc hugging the torso at height y, `g` proud of it
function row(y, g, hh, m, flare = 0) {
  const xr = radius(y, new Vector3(1, 0, 0)), zf = radius(y, new Vector3(0, 0, 1)), zb = radius(y, new Vector3(0, 0, -1));
  return ell([0, y, (zf - zb) / 2], [xr + g + flare, hh, (zf + zb) / 2 + g + flare], m, 0.006);
}

export function armourFigure(engine) {
  const geo = cached("madara|armour2", () => {
    const A = paint("#d0303c", "#b02432", { line: 1.2 }), B = paint("#b02636", "#901c2a", { line: 1.2 }), K = paint(CREAM, CREAM_SH, { line: 1.1 }), L = paint("#e0525c", "#a02a36", { line: 0.8 });
    const prims = [], panel = (p, m) => clipped([p], (x) => Math.abs(x) - 0.19, m);
    // chest: three broad plates with a lighter top lip, the undersuit showing in the gaps
    [0.385, 0.315, 0.245].forEach((y, i) => { const m = i % 2 ? B : A; prims.push(panel(row(y, 0.062, 0.026, m), m), panel(row(y + 0.026, 0.07, 0.008, L), L)); });
    prims.push(panel(row(0.178, 0.04, 0.02, K), K));
    // shoulder guards: four overlapping lames each, wide and tilted out
    for (const sx of [1, -1]) for (let j = 0; j < 4; j++) prims.push(ell([sx * (0.262 + 0.014 * j), 0.485 - 0.042 * j, 0.03], [0.125 - 0.008 * j, 0.022, 0.11 - 0.006 * j], j % 2 ? B : A, 0.004, [0, 0, -sx * (0.5 + 0.13 * j)]));
    // skirt: separate hanging plates, front, sides and back, flaring out from the belt
    [[0.15, 9, 0.022], [0.085, 9, 0.03]].forEach(([y, n, g], r) => {
      for (let i = 0; i < n; i++) {
        const th = ((i + 0.5) / n - 0.5) * Math.PI * 2 * 0.95 + (r ? Math.PI / n : 0) + Math.PI, d = new Vector3(Math.sin(th), 0, Math.cos(th)), rad = radius(y, d) + g, m = (i + r) % 2 ? B : A;
        prims.push(ell([d.x * rad, y, d.z * rad], [0.08, 0.05, 0.014], m, 0.003, [0, th, 0]), ell([d.x * (rad + 0.004), y + 0.046, d.z * (rad + 0.004)], [0.078, 0.008, 0.016], L, 0.002, [0, th, 0]));
      }
    });
    const g = polygonize(prims, 0.0085);
    const zk = radius(0.178, new Vector3(0, 0, 1)) + 0.03;
    const knot = new SphereGeometry(0.03, 14, 10).scale(1, 1, 0.7).translate(0.075, 0.178, zk);
    const t = (x, r) => new ConeGeometry(0.018, 0.12, 8).rotateZ(Math.PI + r).translate(x, 0.115, zk);
    return mergeGeometries([g, piece(knot, CREAM, CREAM_SH), piece(t(0.095, 0.2), CREAM, CREAM_SH), piece(t(0.135, -0.15), CREAM, CREAM_SH)].map((x) => (x.index ? x.toNonIndexed() : x)));
  });
  const fig = engine.figure(geo, { ink: INK, lineMul: 1.2 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// the gunbai in its own frame: disc face up the +y axis, handle down -y, face looking +z; r 0.19 on a 0.85 m seal
function gunbaiGeometry() {
  return cached("madara|gunbai", () => {
    const disc = (r, h, c, s, z) => piece(new CylinderGeometry(r, r, h, 40).rotateX(Math.PI / 2).translate(0, 0.19, z), c, s, { line: 0.8 });
    const parts = [disc(0.2, 0.016, INK, INK, -0.004), disc(0.188, 0.022, "#2a231c", INK, 0),
      piece(new TorusGeometry(0.17, 0.011, 8, 40).translate(0, 0.19, 0.008), CREAM, CREAM_SH, { line: 0.7 }),
      piece(new CylinderGeometry(0.016, 0.02, 0.34, 10).translate(0, -0.06, 0), "#3a2218", "#1a0e08")];
    for (let i = 0; i < 12; i++) { // the toothed rim
      const a = (i / 12) * Math.PI * 2;
      parts.push(piece(new ConeGeometry(0.02, 0.05, 6).rotateZ(a - Math.PI / 2).translate(Math.sin(a) * 0.215, 0.19 + Math.cos(a) * 0.215, -0.002), RED, RED_SH, { line: 0.6 }));
    }
    parts.push(piece(new CylinderGeometry(0.072, 0.072, 0.006, 24, 1, false, 0, Math.PI).rotateX(Math.PI / 2).translate(0, 0.19, 0.014), RED, RED_SH, { line: 0.5 }),
      piece(new CylinderGeometry(0.072, 0.072, 0.006, 24, 1, false, Math.PI, Math.PI).rotateX(Math.PI / 2).translate(0, 0.19, 0.014), CREAM, CREAM_SH, { line: 0.5 }));
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
}

export function gunbaiFigure(engine) {
  const fig = engine.figure(gunbaiGeometry(), { ink: INK, lineMul: 1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// the mane: one filled mass behind and beside the head down to the waist (smooth union of broad ellipsoids), a jagged lower edge,
// side and crown spikes cut from it, and two heavy bangs. Head-local coordinates (origin at the neck joint).
const HC = [0, 0.17, 0], V = (x, y, z) => new Vector3(x, y, z);
function bang(th0, th1, y0, y1, r) {
  const pts = [0, 1, 2, 3, 4, 5].map((i) => onF(HF, HC, th0 + (th1 - th0) * (i / 5), y0 + (y1 - y0) * (i / 5), 0.016 - 0.002 * i));
  pts.push(pts[5].clone().add(V(0.012, -0.05, 0.008)));
  return piece(taper(pts, r, 0.004, 18, 8), "#2b2535", "#0f0b14", { line: 1 });
}
export function maneFigure(engine) {
  const geo = cached("madara|mane2", () => {
    const M = paint("#2b2535", "#0f0b14", { line: 1 }), prims = [];
    const E = (c, r, k = 0.05) => prims.push(ell(c, r, M, k));
    prims.push(clipped([ell([0, 0.19, -0.1], [0.225, 0.215, 0.19], M, 0.03)], (x, y, z) => z - 0.03, M));
    E([0, -0.02, -0.2], [0.3, 0.28, 0.12]); E([0, -0.22, -0.26], [0.31, 0.2, 0.1]);
    for (const s of [1, -1]) { E([s * 0.25, 0.1, -0.16], [0.1, 0.2, 0.13], 0.04); E([s * 0.29, -0.18, -0.15], [0.09, 0.2, 0.12], 0.04); }
    for (let i = 0; i < 7; i++) { const x = -0.27 + i * 0.09; prims.push(cone([x, -0.34, -0.26], [x * 1.2, -0.47, -0.3], 0.06, 0.006, M, 0.02)); }
    for (const s of [1, -1]) [[0.14, 0.06], [-0.03, 0.04], [-0.2, 0.02]].forEach(([y, e]) => prims.push(cone([s * 0.3, y, -0.13], [s * (0.5 + e), y - 0.13, -0.2], 0.065, 0.006, M, 0.02)));
    for (const x of [-0.11, 0, 0.11]) prims.push(cone([x, 0.3, -0.1], [x * 1.4, 0.58 - Math.abs(x), -0.3], 0.065, 0.006, M, 0.02));
    return mergeGeometries([polygonize(prims, 0.01), bang(0.15, 1.0, 0.36, 0.08, 0.034), bang(-0.15, -1.0, 0.36, 0.14, 0.028)].map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  const fig = engine.figure(geo, { ink: INK, lineMul: 1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}
