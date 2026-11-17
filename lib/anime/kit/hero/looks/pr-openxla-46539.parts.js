// PARTS for the pr-openxla-46539 look (All Might): the red/white costume panels, the gold belt and white V, the
// red glove cuffs with their pale band, and the two curved antenna bangs. Each is a figure the hero attaches
// to a pivot, built from the shared torso rows, the sdf modeller and one tapered tube.
import { CylinderGeometry, CatmullRomCurve3, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, polygonize } from "../../../sdf.js";
import { FORE, TORSO, cached, fieldOf, piece, torsoRow } from "../body.js";

export const GOLD = "#e6c84a", GOLD_SH = "#817029", RED = "#c02a30", RED_SH = "#6a1218", WHITE = "#e8e4da", WHITE_SH = "#a6a4b8";
const INK = "#1a1630";

function build(engine, geo, ink = INK, lineMul = 1.3) {
  const fig = engine.figure(geo, { ink, lineMul });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// one shell of the torso grown by g and cut by clip(x, y, z) > 0 outside; returns a non-indexed painted geometry
const TF = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null)));
function shell(col, shade, g, clip, h = 0.0075) {
  const m = paint(col, shade), F = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, m, g)));
  const f = (x, y, z) => Math.max(F(x, y, z), clip(x, y, z));
  return polygonize([{ f, m, k: 0, lo: [-0.45, 0, -0.4], hi: [0.45, 0.6, 0.4] }], h).toNonIndexed();
}
function frontAt(y, g) {
  let a = 0, b = 0.7;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (TF(0, y, -0.02 + m) - g < 0) a = m; else b = m; }
  return -0.02 + (a + b) / 2;
}

export function costumeTrim(engine) {
  const geo = cached("allmight|trim", () => {
    const P = [];
    const side = (x, y, z) => Math.max(0.2 - y, y - 0.39, 0.165 - Math.abs(x), Math.abs(x) - 0.225, -0.02 - z);
    P.push(shell(WHITE, WHITE_SH, 0.0225, (x, y, z) => Math.max(0.19 - y, y - 0.4, 0.15 - Math.abs(x), Math.abs(x) - 0.24, -0.03 - z)));
    P.push(shell(RED, RED_SH, 0.0245, side));
    P.push(shell(RED, RED_SH, 0.0245, (x, y, z) => Math.max(0.28 - y, y - 0.37, Math.abs(x) - 0.09, 0.016 - Math.abs(x), 0.09 - z)));
    // 2-tone step: a darker fold band low on each panel, a hair proud of it, so the cloth reads as bent
    P.push(shell(RED_SH, "#3a0a10", 0.0262, (x, y, z) => Math.max(side(x, y, z), y - 0.275, 0.2 - y)));
    P.push(shell(RED_SH, "#3a0a10", 0.0262, (x, y, z) => Math.max(0.28 - y, y - 0.305, Math.abs(x) - 0.09, 0.016 - Math.abs(x), 0.09 - z)));
    const vee = (k) => (x, y, z) => Math.max(0.068 - y, y - 0.152, Math.abs(x) - (0.03 + (y - 0.068) * 1.9 - k), 0.07 - z);
    P.push(shell(RED, RED_SH, 0.026, vee(0), 0.006));
    P.push(shell(WHITE, WHITE_SH, 0.0275, vee(0.02), 0.006));
    P.push(shell(GOLD, GOLD_SH, 0.0305, (x, y) => Math.max(0.153 - y, y - 0.21), 0.006));
    const z = frontAt(0.182, 0.03);
    P.push(piece(new SphereGeometry(0.03, 16, 10).scale(1.15, 0.85, 0.34).translate(0, 0.182, z + 0.002), "#f1da6a", GOLD_SH).toNonIndexed());
    P.push(piece(new SphereGeometry(0.014, 12, 8).scale(1.1, 0.9, 0.4).translate(0, 0.182, z + 0.011), "#c9a834", GOLD_SH).toNonIndexed());
    return mergeGeometries(P);
  });
  return build(engine, geo);
}

// the glove cuff: a red flare with a pale band above it, on the forearm pivot (wrist at y = -FORE)
export function gloveCuff(engine) {
  const geo = cached("allmight|cuff", () => {
    const y0 = -FORE;
    const red = new CylinderGeometry(0.066, 0.058, 0.056, 28, 1).translate(0, y0 + 0.034, 0);
    const band = new CylinderGeometry(0.0675, 0.0675, 0.016, 28, 1).translate(0, y0 + 0.073, 0);
    return mergeGeometries([piece(red, RED, RED_SH).toNonIndexed(), piece(band, WHITE, WHITE_SH).toNonIndexed()]);
  });
  return build(engine, geo, INK, 1.1);
}

// a tapered, curved antenna bang: rises from the front hairline, leans out in a V, the tip curling forward
export function antennae(engine) {
  const geo = cached("allmight|antennae", () => {
    const one = (s) => {
      const pts = [[0.03, 0.30, 0.13], [0.052, 0.355, 0.16], [0.088, 0.405, 0.185], [0.13, 0.43, 0.2], [0.168, 0.43, 0.215]].map(([x, y, z]) => new Vector3(s * x, y, z));
      const path = new CatmullRomCurve3(pts), segs = 20, rad = 6, g = new TubeGeometry(path, segs, 0.034, rad, false), P = g.attributes.position;
      for (let i = 0; i <= segs; i++) {
        const c = path.getPointAt(i / segs), k = Math.max(0.05, (1 - i / segs) ** 0.8);
        for (let j = 0; j <= rad; j++) { const v = new Vector3().fromBufferAttribute(P, i * (rad + 1) + j); v.sub(c).multiplyScalar(k).add(c); P.setXYZ(i * (rad + 1) + j, v.x, v.y, v.z); }
      }
      g.computeVertexNormals();
      return piece(g, "#e6c84a", GOLD_SH).toNonIndexed();
    };
    return mergeGeometries([one(1), one(-1)]);
  });
  return build(engine, geo, "#4a3d12", 0.8);
}
