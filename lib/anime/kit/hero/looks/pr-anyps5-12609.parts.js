// PARTS for the Vice seal (pr-anyps5-12609): the yellow palm-leaf print on the teal shirt, the denim shell, the red
// bandana with its hanging point, and the sunglasses (pushed up on the brow, or down over the eyes). Small meshes laid
// on the torso and head fields; each is one figure the look attaches to a bone.
import { Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, polygonize } from "../../../sdf.js";
import { DOME, TORSO, cached, darker, fieldOf, piece, torsoRow } from "../body.js";
import { HF, band, grown, normalAt, onF, poly, tube } from "../wear/geo.js";

export const TEAL = "#1f8a8a", PRINT = "#f2c14e", DENIM = "#3a5a86", RED = "#c8303a", FRAME = "#1a1a1e", LENS = "#2a6f8a", GLINT = "#ffd27a";
const SHIRT_G = 0.022, DENIM_G = 0.032, BAND_G = 0.034, C0 = [0, 0, -0.02];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (parts) => mergeGeometries(parts.map(ni));
const figure = (engine, geo, ink, lineMul = 1.2, head = null) => {
  const fig = engine.figure(geo, head ? { ink, lineMul, head } : { ink, lineMul });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
};

// seven palm fronds, each a fan of three pointed leaves, laid on the shirt field outside the open front
const FRONDS = [[0.85, 0.24, 0.3], [-0.9, 0.27, -0.25], [1.45, 0.34, 0.1], [-1.5, 0.3, -0.2], [2.7, 0.3, 0.2], [0.62, 0.36, 0.5], [-0.62, 0.15, -0.4]];
function leaf(F, th, y, ang, len, wid) {
  const R = 0.25, c = Math.cos(ang), s = Math.sin(ang);
  const q = [[0, 0], [0.55, 0.22], [0.5, 0.7], [0, 1], [-0.5, 0.7], [-0.55, 0.22]].map(([u, v]) => { const x = u * wid, z = v * len; return [th + (x * c - z * s) / R, y + x * s + z * c]; });
  return poly(F, C0, q, 0.0034);
}
export function palmPrint(engine) {
  const geo = cached("vice|print", () => {
    const F = grown(SHIRT_G + 0.011), parts = [];
    for (const [th, y, tilt] of FRONDS) for (const a of [-0.95, 0, 0.95]) parts.push(piece(leaf(F, th, y, tilt + a, 0.12, 0.045), PRINT, darker(PRINT, 0.75), { line: 0.35 }));
    return merge(parts);
  });
  return figure(engine, geo, "#1a3a3a", 0.7);
}

// denim: a torso shell from the hem up to a belt line, a darker belt band and a stitched seam down the front
export function denim(engine) {
  const geo = cached("vice|denim", () => {
    const m = paint(DENIM, "#26406a"), F = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, m, DENIM_G))), top = 0.15;
    const shell = polygonize([{ f: (x, y, z) => Math.max(F(x, y, z), 0.004 - y, y - top), m, k: 0, lo: [-0.45, 0, -0.4], hi: [0.45, 0.6, 0.4] }], 0.007);
    const G = grown(DENIM_G), seam = [[0, 0.1], [0, 0.03]].map(([t, y]) => onF(G, C0, t, y, 0.003));
    return merge([shell, piece(band(G, C0, top - 0.026, top, 0.007), "#1a2a48", "#101a30", { line: 1 }), piece(tube(seam, 0.0028, 8), "#e0b06a", "#8a6a3a", { line: 0.3 })]);
  });
  return figure(engine, geo, "#18243a", 1.3);
}

// the bandana: a band round the neck, a knot at the front and a triangle hanging to the chest, with cream dots
export function bandana(engine) {
  const geo = cached("vice|bandana", () => {
    const F = grown(BAND_G), parts = [piece(band(F, C0, 0.44, 0.482, 0.011), RED, darker(RED, 0.55), { line: 1 })];
    parts.push(piece(poly(F, C0, [[-0.62, 0.47], [0.62, 0.47], [0.1, 0.33], [0, 0.31], [-0.1, 0.33]], 0.012), RED, darker(RED, 0.55), { line: 1 }));
    parts.push(piece(poly(F, C0, [[-0.48, 0.452], [0.48, 0.452], [0.4, 0.46], [-0.4, 0.46]], 0.0165), darker(RED, 0.7), darker(RED, 0.4), { line: 0.6 }));
    const k = onF(F, C0, 0, 0.462, 0.02);
    parts.push(piece(new SphereGeometry(0.02, 12, 8).scale(1.3, 0.9, 0.8).translate(k.x, k.y, k.z), darker(RED, 1.1), darker(RED, 0.5), { line: 1 }));
    for (const [t, y] of [[-0.25, 0.41], [0.22, 0.4], [0, 0.365], [-0.4, 0.45], [0.42, 0.45]]) {
      const p = onF(F, C0, t, y, 0.0135);
      parts.push(piece(new SphereGeometry(0.006, 6, 4).scale(1, 1, 0.3).translate(p.x, p.y, p.z), "#f4e9d2", "#b8a98c", { line: 0.2 }));
    }
    return merge(parts);
  });
  return figure(engine, geo, "#3a1018", 1.2);
}

// sunglasses on the head field: lenses are flattened domes turned to the surface normal; `y` is the lens centre height
function lens(p, n, sx, sy, sz, col, shade, tilt = 0, line = 1) {
  const g = new SphereGeometry(1, 16, 10).scale(sx, sy, sz), q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
  q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), tilt));
  return piece(g.applyMatrix4(new Matrix4().compose(p, q, new Vector3(1, 1, 1))), col, shade, { line });
}
export function shades(engine, down) {
  const geo = cached(`vice|shades|${down ? 1 : 0}`, () => {
    const y = down ? 0.203 : 0.29, th = down ? 0.4 : 0.3, lift = down ? 0.012 : 0.012, pts = [], parts = [];
    for (const k of [1, -1]) {
      const p = onF(HF, [0, 0, 0], k * th, y, lift), n = normalAt(HF, p), tilt = -k * 0.14;
      parts.push(lens(p, n, 0.056, 0.04, 0.012, FRAME, "#0c0c10", tilt, 1.2));
      parts.push(lens(p.clone().addScaledVector(n, 0.006), n, 0.046, 0.031, 0.01, LENS, "#17475a", tilt, 0.5));
      const g = p.clone().addScaledVector(n, 0.014).add(new Vector3(0.02 * k * 0.3 + 0.012, 0.014, 0));
      parts.push(lens(g, n, 0.012, 0.0045, 0.002, GLINT, GLINT, -0.5, 0.1));
      pts.push(p);
      const s = onF(HF, [0, 0, 0], k * (th + 0.38), y + 0.002, 0.008);
      parts.push(piece(tube([onF(HF, [0, 0, 0], k * (th + 0.17), y + 0.002, 0.012), s, onF(HF, [0, 0, 0], k * (th + 0.9), y - 0.01, 0.01)], 0.0036, 12), FRAME, "#0c0c10", { line: 0.8 }));
    }
    const a = pts[0].clone(), b = pts[1].clone(), m = a.clone().add(b).multiplyScalar(0.5).add(new Vector3(0, 0.006, 0.004));
    parts.push(piece(tube([a.clone().lerp(m, 0.55), m, b.clone().lerp(m, 0.55)], 0.0042, 10), FRAME, "#0c0c10", { line: 0.8 }));
    return merge(parts);
  });
  return figure(engine, geo, "#0c0c10", 1.0, { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 });
}
