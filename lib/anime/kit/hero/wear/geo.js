// WEAR GEOMETRY: the small exact pieces every garment and accessory is built from. Shells are polygonized from the
// torso rows; everything crisp (rims, folds, seams, motifs, tapered tails) is a mesh laid on the surface by bisection,
// so it stays sharp where a voxel would blur it. Decals (strip, patch) are painted flat in one colour: that colour IS
// the designed shadow or print, not a lit surface.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Matrix4, Quaternion, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { paint, polygonize } from "../../../sdf.js";
import { TORSO, darker, fieldOf, headPrims, torsoRow } from "../body.js";

export const TF = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null)));
export const HF = fieldOf(headPrims({ coat: "#888888", shade: "#444444" }));
export const grown = (g) => (x, y, z) => TF(x, y, z) - g;
export const P = (col, shade) => paint(col, shade ?? darker(col, 0.5));
export const TAU = Math.PI * 2;
// voxel multiplier for the tier being built (dressHero sets it): polygonize at h * k, so low tiers get a coarser cloth
export const VOX = { k: 1 };
export const pg = (prims, h) => polygonize(prims, h * VOX.k);

export function along(F, o, d, far = 0.7) {
  let a = 0, b = far;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (F(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m) < 0) a = m; else b = m; }
  return (a + b) / 2;
}
export const normalAt = (F, p, e = 0.002) => new Vector3(F(p.x + e, p.y, p.z) - F(p.x - e, p.y, p.z), F(p.x, p.y + e, p.z) - F(p.x, p.y - e, p.z), F(p.x, p.y, p.z + e) - F(p.x, p.y, p.z - e)).normalize();
export const dirOf = (th) => new Vector3(Math.sin(th), 0, Math.cos(th));
// a point on F at azimuth th (0 = front, + toward +x) and height y, `lift` proud, measured round the axis (c.x, c.z)
export const onF = (F, c, th, y, lift = 0) => { const d = dirOf(th), o = new Vector3(c[0], y, c[2]); return o.addScaledVector(d, along(F, o, d) + lift); };

export function clipped(prims, clip, m) {
  const F = fieldOf(prims), lo = [0, 1, 2].map((i) => Math.min(...prims.map((p) => p.lo[i]))), hi = [0, 1, 2].map((i) => Math.max(...prims.map((p) => p.hi[i])));
  return { f: (x, y, z) => Math.max(F(x, y, z), clip(x, y, z)), m, k: 0, lo, hi };
}

// a closed ring hugging F between heights y0 and y1, standing `out` proud (the radius read at `ref` if given);
// `flare` opens the top edge away from the surface, `lip` adds a rolled edge at the top
export function band(F, c, y0, y1, out, o = {}) {
  const seg = o.seg ?? 72, t = y1 - y0, flare = o.flare ?? 0;
  const prof = [[-0.014, y0], [out * 0.65, y0], [out, y0 + 0.28 * t], [out + flare * 0.6, y1 - 0.28 * t], [out * 0.65 + flare, y1], [-0.014, y1]], M = prof.length;
  const pos = [], idx = [];
  for (let i = 0; i < seg; i++) {
    const th = (i / seg) * TAU, d = dirOf(th), dy = -(o.tilt ?? 0) * Math.cos(th);
    for (const [off, y0_] of prof) { const y = y0_ + dy, r = along(F, new Vector3(c[0], o.ref ?? y, c[2]), d); pos.push(c[0] + d.x * (r + off), y, c[2] + d.z * (r + off)); }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = ((i + 1) % seg) * M + j, e = ((i + 1) % seg) * M + ((j + 1) % M), f = i * M + ((j + 1) % M);
    idx.push(a, e, b, a, f, e);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getZ(2) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

export const tube = (pts, r, seg = 48) => new TubeGeometry(new CatmullRomCurve3(pts), seg, r, 6, false);

// a tube whose radius runs r0 -> r1 along the curve (a scarf tail, a fold, a tassel); the thin end is closed
export function taper(pts, r0, r1, seg = 24, radial = 6) {
  const curve = new CatmullRomCurve3(pts), P_ = curve.getPoints(seg), fr = curve.computeFrenetFrames(seg, false), pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const r = r0 + (r1 - r0) * (i / seg);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * TAU, n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a));
      pos.push(P_[i].x + n.x * r, P_[i].y + n.y * r, P_[i].z + n.z * r);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
    idx.push(a, c, b, b, c, d);
  }
  const e = P_[seg], ei = pos.length / 3;
  pos.push(e.x, e.y, e.z);
  for (let j = 0; j < radial; j++) idx.push(seg * radial + j, ei, seg * radial + ((j + 1) % radial));
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function stud(F, p, r, flat = 0.4) {
  const n = normalAt(F, p), q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
  return new SphereGeometry(r, 14, 8).applyMatrix4(new Matrix4().compose(p.clone().addScaledVector(n, r * flat * 0.5), q, new Vector3(1, 1, flat)));
}

function finish(pos, nor, idx) {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  g.setIndex(idx);
  return g;
}

// a ribbon laid on F along a path of [th, y]; width w0 -> w1 (metres), `lift` proud. The decal for folds, seams, stripes, panels.
export function strip(F, c, path, w0, w1 = w0, lift = 0.0015) {
  const pts = path.map(([th, y]) => onF(F, c, th, y, 0)), nrm = pts.map((p) => normalAt(F, p)), pos = [], nor = [], idx = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const T = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize(), s = new Vector3().crossVectors(T, nrm[i]).normalize(), w = (w0 + (w1 - w0) * (i / Math.max(1, n - 1))) / 2;
    const p = pts[i].clone().addScaledVector(nrm[i], lift);
    for (const k of [-1, 1]) { const q = p.clone().addScaledVector(s, k * w); pos.push(q.x, q.y, q.z); nor.push(nrm[i].x, nrm[i].y, nrm[i].z); }
  }
  for (let i = 0; i < n - 1; i++) { const a = 2 * i, b = a + 1, c2 = a + 2, d = a + 3; idx.push(a, b, c2, b, d, c2); }
  const g = finish(pos, nor, idx);
  orient(g);
  return g;
}

// a flat shape on F: polar radius `rf(phi)` in metres around (th, y); sx stretches it along the circumference
export function patch(F, c, th, y, rf, o = {}) {
  const seg = o.seg ?? 40, R = o.R ?? 0.25, lift = o.lift ?? 0.002, sx = o.sx ?? 1, rot = o.rot ?? 0, pos = [], nor = [], idx = [];
  const at = (u, v) => { const p = onF(F, c, th + u / R, y + v, 0), n = normalAt(F, p); pos.push(p.x + n.x * lift, p.y + n.y * lift, p.z + n.z * lift); nor.push(n.x, n.y, n.z); };
  at(0, 0);
  for (let i = 0; i < seg; i++) { const a = (i / seg) * TAU, r = rf(a), x = Math.cos(a) * r * sx, v = Math.sin(a) * r, cr = Math.cos(rot), sr = Math.sin(rot); at(x * cr - v * sr, x * sr + v * cr); }
  for (let i = 0; i < seg; i++) idx.push(0, 1 + i, 1 + ((i + 1) % seg));
  const g = finish(pos, nor, idx);
  orient(g);
  return g;
}

// a flat polygon on F given as [th, y] corners (convex or star-shaped around the mean): zigzag hems, flame tongues, panels
export function poly(F, c, corners, lift = 0.002) {
  const pos = [], nor = [], idx = [], m = corners.reduce((a, [t, y]) => [a[0] + t / corners.length, a[1] + y / corners.length], [0, 0]);
  for (const [t, y] of [m, ...corners]) { const p = onF(F, c, t, y, 0), n = normalAt(F, p); pos.push(p.x + n.x * lift, p.y + n.y * lift, p.z + n.z * lift); nor.push(n.x, n.y, n.z); }
  for (let i = 0; i < corners.length; i++) idx.push(0, 1 + i, 1 + ((i + 1) % corners.length));
  const g = finish(pos, nor, idx);
  orient(g);
  return g;
}

// polar radius of a union of circles [[x, y, r], ...] that all contain the origin: the cloud / flower / lobed motif
export const lobes = (cs) => (a) => { const dx = Math.cos(a), dy = Math.sin(a); let best = 0; for (const [cx, cy, r] of cs) { const b = cx * dx + cy * dy; best = Math.max(best, b + Math.sqrt(Math.max(0, b * b - cx * cx - cy * cy + r * r))); } return best; };

// flip triangles whose face points against their vertex normals
function orient(g) {
  const P_ = g.attributes.position, N = g.attributes.normal, I = g.index.array, a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3();
  for (let t = 0; t < I.length; t += 3) {
    a.fromBufferAttribute(P_, I[t]); b.fromBufferAttribute(P_, I[t + 1]); c.fromBufferAttribute(P_, I[t + 2]);
    n.crossVectors(b.sub(a), c.sub(a));
    if (n.x * N.getX(I[t]) + n.y * N.getY(I[t]) + n.z * N.getZ(I[t]) < 0) { const s = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = s; }
  }
}

// one cloth shell: the torso rows grown by g, cut by clip(x, y, z) > 0
export function torsoShell(rows, g, clip, m) { return clipped(rows.map((n) => torsoRow(n, m, g)), clip, m); }
export const ALL_ROWS = Object.keys(TORSO);
