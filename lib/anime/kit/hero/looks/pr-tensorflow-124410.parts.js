// PARTS for the DIO look (pr-tensorflow-124410): the swept-up mane as drawn locks on a scalp cap, and a thin green headband
// with a gold heart and two back tails. Head-local metres (origin at the neck joint), attached to the head part.
import { BufferAttribute, BufferGeometry, ExtrudeGeometry, Matrix4, Quaternion, Shape, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, piece } from "../body.js";
import { HF, TAU, band, normalAt, onF, taper } from "../wear/geo.js";

export const GOLD = { a: "#f3c428", b: "#e2a916", shade: "#a8720c", ink: "#2a1a04" };
const C = [0, 0.17, 0], R = [0.2, 0.18, 0.19];
const V = (x, y, z) => new Vector3(x, y, z);
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dome = (phi, th, s = 1) => V(C[0] + R[0] * s * Math.sin(phi) * Math.sin(th), C[1] + R[1] * s * Math.cos(phi), C[2] + R[2] * s * Math.sin(phi) * Math.cos(th));

function build(engine, geo, ink, lineMul, head) {
  const fig = engine.figure(geo, { ink, lineMul, head });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}
const HEAD = { pos: C, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.23 };

// the scalp cap: a hairline high on the forehead that drops at the temples and nape
function capGeo() {
  const NT = 48, NP = 14, pos = [], idx = [];
  for (let i = 0; i <= NT; i++) {
    const th = (i / NT) * TAU - Math.PI, pm = 0.9 + 0.45 * sstep(0.2, 1.4, Math.abs(th));
    for (let j = 0; j <= NP; j++) { const p = dome((pm * j) / NP, th, 1.035); pos.push(p.x, p.y, p.z); }
  }
  for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) { const a = i * (NP + 1) + j, b = (i + 1) * (NP + 1) + j; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { for (let q = 0; q < idx.length; q += 3) [idx[q + 1], idx[q + 2]] = [idx[q + 2], idx[q + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// a tube from taper() can come out inside-out; flip it when its faces point toward the axis
function outward(g) {
  const P = g.attributes.position, I = g.index.array, a = new Vector3(), b = new Vector3(), c = new Vector3(), m = new Vector3(), cen = new Vector3();
  for (let i = 0; i < P.count; i++) cen.add(a.fromBufferAttribute(P, i));
  cen.divideScalar(P.count);
  let v = 0;
  for (let i = 0; i < I.length; i += 3) { a.fromBufferAttribute(P, I[i]); b.fromBufferAttribute(P, I[i + 1]); c.fromBufferAttribute(P, I[i + 2]); m.copy(a).add(b).add(c).divideScalar(3).sub(cen); v += m.dot(b.sub(a).cross(c.sub(a))); }
  if (v < 0) { const f = Uint16Array.from(I); for (let i = 0; i < f.length; i += 3) [f[i + 1], f[i + 2]] = [f[i + 2], f[i + 1]]; g.setIndex(Array.from(f)); g.computeVertexNormals(); }
  return g;
}

// one lock: a tapered curve from the scalp that rises, sweeps back, flares out sideways and curls at the tip
function lock(phi, th, L, w, o) {
  const p0 = dome(phi, th, 1.02), n = p0.clone().sub(V(...C)).normalize(), side = V(Math.cos(th), 0, -Math.sin(th)), back = V(0, 0, -1);
  const fl = (o.flare ?? 0) * Math.sign(Math.sin(th) || 1), pts = [p0.clone()];
  const dir = (s) => n.clone().multiplyScalar(0.5 * (1 - s)).add(V(0, o.up ?? 0.8, 0)).addScaledVector(back, (o.back ?? 0.6) * (0.4 + s)).addScaledVector(side, fl * s).add(V(0, -(o.droop ?? 0) * s * s, 0)).normalize();
  let p = p0.clone();
  for (let i = 1; i <= 5; i++) { const d = dir(i / 5); if (i === 5) d.y += o.curl ?? 0.15; p = p.clone().addScaledVector(d.normalize(), L / 5); pts.push(p); }
  return outward(taper(pts, w, w * 0.08, 18, 6));
}

function hairGeo() {
  return cached("dio|hair", () => {
    const parts = [piece(capGeo(), GOLD.a, GOLD.shade, { line: 0.6 })];
    let i = 0;
    const add = (g) => parts.push(piece(g, i++ % 2 ? GOLD.b : GOLD.a, GOLD.shade, { line: 1 }));
    for (const t of [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05]) add(lock(0.8 + 0.05 * (i % 2), t, 0.17, 0.036, { up: 0.9, back: 0.9, flare: 0.2, curl: 0.25 }));
    for (const t of [-2.7, -2.15, -1.6, -1.05, -0.5, 0.05, 0.6, 1.15, 1.7, 2.25, 2.75]) add(lock(0.45 + 0.1 * (i % 2), t, 0.24, 0.042, { up: 0.7, back: 1.2, flare: 0.22, curl: 0.25 }));
    for (const t of [-3.1, -2.6, -2.1, 2.1, 2.6, 3.1]) add(lock(0.95 + 0.07 * (i % 2), t, 0.15, 0.04, { up: 0.05, back: 1.0, flare: 0.04, droop: 0.5, curl: 0.0 }));
    return mergeGeometries(parts.map(ni));
  });
}
export const mane = (engine) => build(engine, hairGeo(), GOLD.ink, 1.1, HEAD);

// the band: thin, across the brow just under the hairline; the heart on the front, two tails hanging at the back
const BAND = { col: "#2f9a48", shade: "#16582a", heart: "#e8b82c", heartShade: "#8a5a10", ink: "#06240f" };
const heart = (s) => {
  const h = new Shape();
  h.moveTo(0, -s);
  h.bezierCurveTo(-0.2 * s, -0.7 * s, -s, -0.2 * s, -s, 0.3 * s);
  h.bezierCurveTo(-s, 0.85 * s, -0.25 * s, 0.95 * s, 0, 0.4 * s);
  h.bezierCurveTo(0.25 * s, 0.95 * s, s, 0.85 * s, s, 0.3 * s);
  h.bezierCurveTo(s, -0.2 * s, 0.2 * s, -0.7 * s, 0, -s);
  return new ExtrudeGeometry(h, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelSegments: 1, curveSegments: 10 });
};
function bandGeo() {
  return cached("dio|band", () => {
    const parts = [piece(band(HF, C, 0.249, 0.282, 0.0165), BAND.col, BAND.shade, { line: 1 })];
    const p = onF(HF, C, 0, 0.266, 0.0165), n = normalAt(HF, p), q = new Quaternion().setFromUnitVectors(V(0, 0, 1), n);
    parts.push(piece(heart(0.0155).applyMatrix4(new Matrix4().compose(p.clone().addScaledVector(n, 0.0035), q, V(1, 1, 1))), BAND.heart, BAND.heartShade, { line: 0.9 }));
    const k = onF(HF, C, Math.PI + 0.15, 0.266, 0.015);
    for (const s of [-1, 1]) parts.push(piece(taper([k, k.clone().add(V(s * 0.03, -0.04, -0.025)), k.clone().add(V(s * 0.06, -0.12, -0.03))], 0.012, 0.004, 14, 6), BAND.col, BAND.shade, { line: 1 }));
    return mergeGeometries(parts.map(ni));
  });
}
export const headband = (engine) => build(engine, bandGeo(), BAND.ink, 1, HEAD);
