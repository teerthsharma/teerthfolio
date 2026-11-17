// PARTS for the p-separatrix look (Giorno Giovanna): the pink jacket with heart cut-outs and gold hem, the three
// side coils, the beaded braid with its ribbon, and the ladybug brooches. Each builder returns one engine figure.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, polygonize } from "../../../sdf.js";
import { DOME, TORSO, darker, fieldOf, piece, torsoRow } from "./../body.js";

const LADY = "#c8323c", LADY_SH = "#7a1a22", PINK = "#d985bd", PINK_SH = "#b8559a", GOLD = "#e3b04a", GOLD_SH = "#9a6a22", SPOT = "#2a1a24";
const TF = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null)));
const rows = (m, g) => Object.keys(TORSO).map((n) => torsoRow(n, m, g));

const fig = (engine, geo, o = {}) => {
  const f = engine.figure(geo, o);
  f.userData.hull.uniforms.uConst.value = 1;
  return f;
};

function clipped(prims, clip, m) {
  const F = fieldOf(prims), lo = [0, 1, 2].map((i) => Math.min(...prims.map((p) => p.lo[i]))), hi = [0, 1, 2].map((i) => Math.max(...prims.map((p) => p.hi[i])));
  return { f: (x, y, z) => Math.max(F(x, y, z), clip(x, y, z)), m, k: 0, lo, hi };
}
// the implicit heart (x2+y2-1)^3 = x2 y3, negative inside, scaled to roughly metres
const heart = (x, y, cx, cy, s) => { const u = (x - cx) / s, v = (y - cy) / s + 0.12, a = u * u + v * v - 1; return (a * a * a - u * u * v * v * v) * s * 0.35; };

function along(o, d, far = 0.6) {
  let a = 0, b = far;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (TF(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m) < 0) a = m; else b = m; }
  return (a + b) / 2;
}
const surf = (x, y, dir, lift = 0) => { const o = new Vector3(x, y, -0.02), d = dir.clone().normalize(); return o.addScaledVector(d, along(o, d) + lift); };
const nrm = (p, e = 0.002) => new Vector3(TF(p.x + e, p.y, p.z) - TF(p.x - e, p.y, p.z), TF(p.x, p.y + e, p.z) - TF(p.x, p.y - e, p.z), TF(p.x, p.y, p.z + e) - TF(p.x, p.y, p.z - e)).normalize();

// pink jacket, body-local: a grown torso shell, three heart windows down the chest, gold hem, stand collar
export function jacketShell(engine) {
  const m = paint(PINK, PINK_SH), gm = paint(GOLD, GOLD_SH), g = 0.013, hearts = [[0.012, 0.358, 0.028], [0.012, 0.29, 0.034], [0.012, 0.205, 0.036]];
  const hole = (x, y, z) => Math.max(Math.min(...hearts.map(([cx, cy, s]) => heart(x, y, cx, cy, s))), 0.06 - z);
  const jacket = clipped(rows(m, g), (x, y, z) => Math.max(0.1 - y, y - 0.455, -hole(x, y, z)), m);
  const hem = clipped(rows(gm, g + 0.007), (x, y) => Math.max(0.1 - y, y - 0.135), gm);
  const collar = clipped(rows(m, g + 0.011), (x, y) => Math.max(0.43 - y, y - 0.49), m);
  const geo = mergeGeometries([polygonize([jacket], 0.0065), polygonize([hem], 0.006), polygonize([collar], 0.006)]);
  return fig(engine, geo, { ink: darker(PINK_SH, 0.5), lineMul: 1.3 });
}

// one ladybug: gold dome, dark centre seam, two spots a side, dark head
function ladybug(r) {
  const p = [];
  p.push(piece(new SphereGeometry(r, 18, 12).scale(1, 1, 0.5), LADY, LADY_SH));
  p.push(piece(new SphereGeometry(r * 0.2, 8, 6).translate(0, r * 0.9, r * 0.1), SPOT));
  p.push(piece(new SphereGeometry(r * 0.1, 8, 6).scale(0.45, 2.6, 1).translate(0, -r * 0.1, r * 0.48), SPOT));
  for (const [x, y] of [[0.46, 0.3], [-0.46, 0.3], [0.4, -0.35], [-0.4, -0.35]]) p.push(piece(new SphereGeometry(r * 0.17, 8, 6).scale(1, 1, 0.5).translate(x * r, y * r, r * 0.46), SPOT));
  return mergeGeometries(p.map((g) => (g.index ? g.toNonIndexed() : g)));
}
export function brooches(engine) {
  const out = [];
  for (const [x, y, r, dx] of [[0.115, 0.335, 0.032, 0.35], [-0.03, 0.455, 0.02, 0]]) {
    const dir = new Vector3(dx, 0, 1), p = surf(x, y, dir, 0.026), n = nrm(p);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
    out.push(ladybug(r).applyMatrix4(new Matrix4().compose(p, q, new Vector3(1, 1, 1))));
  }
  return fig(engine, mergeGeometries(out), { ink: LADY_SH, lineMul: 0.9 });
}

// a tapered tube along a polyline (radius r0 to r1, closed to a point at the tip)
function taper(pts, r0, r1, sides = 7) {
  const n = pts.length, pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    const t = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
    const a = new Vector3().crossVectors(t, Math.abs(t.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)).normalize(), b = new Vector3().crossVectors(t, a);
    const r = i === n - 1 ? 0.0008 : r0 + (r1 - r0) * (i / (n - 1)) ** 0.8;
    for (let k = 0; k < sides; k++) { const th = (k / sides) * Math.PI * 2; pos.push(...pts[i].clone().addScaledVector(a, Math.cos(th) * r).addScaledVector(b, Math.sin(th) * r * 0.85).toArray()); }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) { const a = i * sides + k, b = i * sides + ((k + 1) % sides), c = a + sides, d = b + sides; idx.push(a, b, c, b, d, c); }
  const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const HAIR = { col: "#f5c518", shade: "#d9a02c", hi: "#f8e08a" };
const hairPiece = (g, col = HAIR.col) => piece(g, col, HAIR.shade, { id: 1 });

// three hooked rolls on each side of the face, head-local, curling forward to a point
// combed-back locks over the crown: fat at the brow line, thinning toward the nape
export function pompadour(engine) {
  const parts = [], C = DOME.c, R = DOME.r;
  // [root x, root angle, k at the crest, root radius]: the two big front rolls, then the side locks
  for (const [x0, a0, kc, r0] of [[0, 0.95, 1.5, 0.05], [0.07, 1.0, 1.4, 0.042], [-0.07, 1.0, 1.4, 0.042]]) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, a = a0 + t * 1.9, k = 1.05 + (kc - 1.05) * Math.sin(Math.PI * Math.min(1, t * 1.3)) ** 0.7 * (1 - 0.3 * t);
      pts.push(new Vector3(x0 * (1 - 0.5 * t) * k, C[1] + R[1] * k * Math.sin(a), C[2] + R[2] * k * Math.cos(a) + 0.04 * Math.sin(Math.PI * t)));
    }
    parts.push(hairPiece(taper(pts, r0, 0.014, 10), HAIR.col));
  }
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  return fig(engine, geo, { ink: "#7a5418", lineMul: 0.8, head: { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 } });
}

export function coils(engine) {
  const parts = [], hook = [[0, 0, 0], [0.05, 0.005, 0.03], [0.085, -0.012, 0.075], [0.09, -0.04, 0.12], [0.065, -0.062, 0.135], [0.04, -0.055, 0.115]];
  for (const s of [1, -1]) [[0.255, 1, 0.034], [0.18, 0.92, 0.032], [0.105, 0.84, 0.029]].forEach(([y, k, r0], j) => {
    const curve = new CatmullRomCurve3(hook.map(([x, dy, z]) => new Vector3(s * (0.172 - 0.012 * j + x * k), y + dy * k, -0.005 + z * k)));
    parts.push(hairPiece(taper(curve.getPoints(24), r0, 0.009), j === 1 ? "#f0bd18" : HAIR.col));
  });
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  return fig(engine, geo, { ink: "#7a5418", lineMul: 0.85, head: { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 } });
}

// the short braid at the nape: five beads shrinking down and back, a pink ribbon bow at the root
export function braid(engine) {
  const p = [];
  const at = (i) => new Vector3(0, 0.1 - 0.047 * i, -0.15 - 0.034 * i);
  for (let i = 0; i < 5; i++) { const r = 0.03 - 0.0035 * i; p.push(hairPiece(new SphereGeometry(r, 14, 10).scale(1, 1.05, 0.95).translate(...at(i).toArray()), i % 2 ? "#f0bd18" : HAIR.col)); }
  const b = at(0).add(new Vector3(0, 0.03, -0.012));
  for (const s of [1, -1]) p.push(piece(new SphereGeometry(0.03, 12, 8).scale(1.5, 0.8, 0.45).rotateZ(s * 0.35).translate(b.x + s * 0.034, b.y, b.z), "#e3769f", darker("#e3769f", 0.62)));
  p.push(piece(new SphereGeometry(0.014, 10, 8).translate(b.x, b.y, b.z), "#e3769f", darker("#e3769f", 0.62)));
  return fig(engine, mergeGeometries(p.map((g) => (g.index ? g.toNonIndexed() : g))), { ink: "#7a5418", lineMul: 0.85, head: { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 } });
}
