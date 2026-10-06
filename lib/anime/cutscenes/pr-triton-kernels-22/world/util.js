// WORLD helpers for pr-triton-kernels-22 (layer-local; Consolidate may promote `clipSolid`, `reveal`, `surf`).
// Maths used here:
//   sm(x)        = x^2 (3 - 2x) on clamp(x, 0, 1)                      smoothstep
//   bo(x)        = 1 + c3 (x-1)^3 + c1 (x-1)^2, c1 = 1.70158, c3 = c1+1   back.out ease (overshoots then settles)
//   bounce(x)    = Penner easeOutBounce                                   lamp topple settle
//   clip(P, n, d, s) Sutherland-Hodgman: keep s (n.p - d) >= 0; edge crossing at k = da / (da - db), every attribute lerped
//   cap polygon  = the points on the plane, sorted by atan2 in the plane basis (u, n x u), wound to face outward (-s n)
import { BufferGeometry, Color, Float32BufferAttribute, Mesh, Vector3, Vector4 } from "three";
import { paint, painted } from "../../../sdf.js";
import { hullMaterial } from "../../../material.js";

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const bo = (x) => { x = clamp01(x) - 1; return 1 + 2.70158 * x ** 3 + 1.70158 * x * x; };
export const bounce = (x) => {
  x = clamp01(x); const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

// a ground-plane reveal for any anime-surface material: fragments farther than min(drawR, rubR) from the seal are discarded.
// drawR grows from the pup (the draw-in wipe); rubR shrinks from the horizon (the rub-out). One shared programme ("reveal").
export function reveal(mat, U) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDrawR = U.drawR; sh.uniforms.uRubR = U.rubR; sh.uniforms.uRevC = U.C;
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", "uniform float uDrawR; uniform float uRubR; uniform vec2 uRevC;\nvoid main() { if (length(vWP.xz - uRevC) > min(uDrawR, uRubR)) discard;");
  };
  mat.customProgramCacheKey = () => "reveal";
  return mat;
}

// one painted mesh on the shared anime programme.
// f: { stone, gloss, emit:[r,g,b], glow:[x,y,z,r,hex], fog:[amount,base,fall,ramp,hex], ink:mul, reveal:U }
export function surf(engine, geo, col, shade, id, f = {}) {
  if (!geo.attributes.aCol) painted(geo, paint(col, shade));
  const m = engine.prop(geo, id), u = m.material.uniforms;
  if (f.stone) u.uStone.value.set(...f.stone);
  if (f.gloss) u.uGloss.value.set(...f.gloss);
  if (f.emit) u.uEmit.value.setRGB(...f.emit);
  if (f.glow) { u.uGlow0.value.set(f.glow[0], f.glow[1], f.glow[2], f.glow[3]); u.uGlowCol.value.set(f.glow[4]); }
  if (f.fog) { u.uFog = { value: new Vector4(f.fog[0], f.fog[1], f.fog[2], f.fog[3]) }; u.uFogCol = { value: new Color(f.fog[4]) }; }
  if (f.reveal) reveal(m.material, f.reveal);
  if (f.ink) {
    const h = new Mesh(m.geometry, hullMaterial(engine.shared, { mul: f.ink, ink: "#0e0b0d", constant: true }));
    h.renderOrder = -1; h.userData.hull = true; m.add(h);
  }
  return m;
}

// ---- convex solids as polygon lists; a vertex is [x, y, z, u, v] ----
export function boxFaces(hx, hy, hz, cy = 0) {
  const V = (x, y, z) => [x, y + cy, z, 0, 0];
  return [
    [V(hx, -hy, -hz), V(hx, hy, -hz), V(hx, hy, hz), V(hx, -hy, hz)],
    [V(-hx, -hy, hz), V(-hx, hy, hz), V(-hx, hy, -hz), V(-hx, -hy, -hz)],
    [V(-hx, hy, hz), V(hx, hy, hz), V(hx, hy, -hz), V(-hx, hy, -hz)],
    [V(-hx, -hy, -hz), V(hx, -hy, -hz), V(hx, -hy, hz), V(-hx, -hy, hz)],
    [V(-hx, -hy, hz), V(hx, -hy, hz), V(hx, hy, hz), V(-hx, hy, hz)],
    [V(hx, -hy, -hz), V(-hx, -hy, -hz), V(-hx, hy, -hz), V(hx, hy, -hz)],
  ];
}
const sd = (v, n, d, s) => s * (n.x * v[0] + n.y * v[1] + n.z * v[2] - d);
export function clipPoly(poly, n, d, s) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = sd(a, n, d, s), db = sd(b, n, d, s);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const k = da / (da - db); out.push(a.map((x, j) => x + (b[j] - x) * k)); }
  }
  return out;
}
// clip a convex solid (faces) by the plane n.p = d, keeping side s (+1: n.p >= d); returns faces with the cap last (cap.cap = true)
export function clipSolid(faces, n, d, s) {
  const out = [], pts = [];
  for (const f of faces) {
    const c = clipPoly(f, n, d, s);
    if (c.length < 3) continue;
    out.push(c);
    for (const v of c) if (Math.abs(sd(v, n, d, 1)) < 1e-4 && !pts.some((p) => Math.hypot(p[0] - v[0], p[1] - v[1], p[2] - v[2]) < 1e-3)) pts.push([v[0], v[1], v[2], 0, 0]);
  }
  if (pts.length >= 3) {
    const cen = [0, 1, 2].map((k) => pts.reduce((a, p) => a + p[k], 0) / pts.length);
    const nn = new Vector3(n.x, n.y, n.z).normalize();
    const u = Math.abs(nn.y) < 0.9 ? new Vector3(0, 1, 0).cross(nn).normalize() : new Vector3(1, 0, 0).cross(nn).normalize(), w = nn.clone().cross(u);
    const ang = (p) => Math.atan2((p[0] - cen[0]) * w.x + (p[1] - cen[1]) * w.y + (p[2] - cen[2]) * w.z, (p[0] - cen[0]) * u.x + (p[1] - cen[1]) * u.y + (p[2] - cen[2]) * u.z);
    pts.sort((a, b) => ang(a) - ang(b));            // CCW seen from +n
    const cap = s > 0 ? pts.reverse() : pts;        // the kept-upper cap faces -n (outward); the kept-lower cap faces +n
    cap.cap = true; out.push(cap);
  }
  return out;
}
// polygons -> a painted, flat-shaded geometry; cap polygons take the cut-face colours (a fresh cut reads paper-bright)
export function solidGeo(polys, col, shade, capCol, capShade) {
  const P = [], capIdx = [];
  for (const poly of polys) for (let i = 1; i < poly.length - 1; i++) for (const v of [poly[0], poly[i], poly[i + 1]]) { if (poly.cap) capIdx.push(P.length / 3); P.push(v[0], v[1], v[2]); }
  const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  painted(g, paint(col, shade));
  if (capCol) {
    const c = new Color(capCol), s = new Color(capShade ?? capCol), A = g.attributes.aCol, B = g.attributes.aShade;
    for (const i of capIdx) { A.setXYZ(i, c.r, c.g, c.b); B.setXYZ(i, s.r, s.g, s.b); }
  }
  return g;
}
// polygons with uv -> a card geometry (position, normal, uv) for a baked window card
export function cardGeo(polys) {
  const P = [], T = [];
  for (const poly of polys) for (let i = 1; i < poly.length - 1; i++) for (const v of [poly[0], poly[i], poly[i + 1]]) { P.push(v[0], v[1], v[2]); T.push(v[3], v[4]); }
  const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(P, 3)); g.setAttribute("uv", new Float32BufferAttribute(T, 2)); g.computeVertexNormals();
  return g;
}
// merge painted (non-indexed) geometries that share one attribute set
export function merged(gs) {
  const out = new BufferGeometry();
  for (const k of Object.keys(gs[0].attributes)) {
    const n = gs[0].attributes[k].itemSize, arr = [];
    for (const g of gs) for (const v of g.attributes[k].array) arr.push(v);
    out.setAttribute(k, new Float32BufferAttribute(arr, n));
  }
  return out;
}
