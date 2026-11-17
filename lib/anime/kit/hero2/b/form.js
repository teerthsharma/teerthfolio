// Neutral forms for hero2 method b: skull with a short snout, neck, jacket, collar, five-finger hands, flat hair locks; looks only supply colours and rows.
// Head frame: origin at the skull centre, +z forward. Figure frame: y up, 0 at the waist.
import { BufferAttribute, BufferGeometry, Color, Matrix4 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cone, ell, paint, painted, polygonize } from "../../../sdf.js";

export const HEAD_AT = [0, 0.79, 0.02];
const NECK_TOP = [0, 0.62, -0.02];

const C = (look) => paint(look.fur.coat, look.fur.shade, { id: 0 });

export function headPrims(c) {
  return [
    ell([0, 0.025, -0.01], [0.186, 0.172, 0.178], c, 0.06),
    ell([0, -0.03, 0.0], [0.192, 0.1, 0.165], c, 0.09),
    ell([0, -0.1, 0.03], [0.14, 0.07, 0.13], c, 0.08), ell([0, -0.15, 0.06], [0.08, 0.04, 0.09], c, 0.06),
    ell([0.125, -0.02, 0.095], [0.056, 0.05, 0.07], c, 0.05), ell([-0.125, -0.02, 0.095], [0.056, 0.05, 0.07], c, 0.05),
    ell([0, 0.074, 0.15], [0.152, 0.026, 0.05], c, 0.05),
    ell([0.105, 0.07, 0.125], [0.06, 0.03, 0.05], c, 0.05, [0, 0, -0.25]), ell([-0.105, 0.07, 0.125], [0.06, 0.03, 0.05], c, 0.05, [0, 0, 0.25]),
    ell([0, -0.052, 0.158], [0.098, 0.07, 0.078], c, 0.06),
    ell([0.056, -0.075, 0.2], [0.058, 0.042, 0.042], c, 0.05), ell([-0.056, -0.075, 0.2], [0.058, 0.042, 0.042], c, 0.05),
    cone([0, 0.05, 0.158], [0, -0.03, 0.222], 0.03, 0.034, c, 0.05),
    ell([0, -0.04, 0.236], [0.04, 0.027, 0.03], c, 0.03),
    cone([0, -0.1, -0.02], [0, -0.3, -0.04], 0.125, 0.15, c, 0.06),
  ];
}
export const headGeometry = (look, h = 0.0045) => polygonize(headPrims(C(look)), h);

export const ARM = { S: [0.4, 0.44, -0.01], E: [0.54, -0.1, 0.1], W: [0.23, 0.15, 0.38] };
const mx = (p, s) => [p[0] * s, p[1], p[2]];

const CREASES = [
  [[[0.3, 0.38], [0.2, 0.24], [0.11, 0.05]], 0.016, 1], [[[0.15, 0.5], [0.3, 0.42], [0.37, 0.28]], 0.014, 0.9],
  [[[0.2, 0.56], [0.34, 0.54], [0.42, 0.5]], 0.012, 0.8], [[[0.4, 0.34], [0.43, 0.18], [0.41, 0.0]], 0.015, 0.9],
  [[[0.02, 0.52], [0.03, 0.25], [0.02, -0.05]], 0.006, 1], [[[0.28, 0.12], [0.2, 0.0], [0.16, -0.1]], 0.014, 0.8],
];
function distSeg(px, py, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy))); return [Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t), t]; }
function creaseField(x, y, nz) {
  let f = 0;
  for (const [pts, w, k] of CREASES) for (const s of [1, -1]) {
    const ax = Math.abs(x) * (s === Math.sign(x) || x === 0 ? 1 : 0);
    if (!ax && s === -1) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const [d, t] = distSeg(ax, y, pts[i], pts[i + 1]), tt = (i + t) / (pts.length - 1), ww = w * (1.25 - tt);
      f = Math.max(f, k * (1 - Math.min(1, Math.max(0, (d - ww * 0.35) / ww))));
    }
  }
  return f * Math.min(1, Math.max(0, (nz + 0.05) / 0.4));
}
function sleeveField(P, nrm, s) {
  const S = mx(ARM.S, s), E = mx(ARM.E, s), W = mx(ARM.W, s);
  let best = 0;
  for (const [A, B, k] of [[S, E, 0.5], [E, W, 1]]) {
    const ax = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L2 = ax[0] ** 2 + ax[1] ** 2 + ax[2] ** 2;
    const t = ((P[0] - A[0]) * ax[0] + (P[1] - A[1]) * ax[1] + (P[2] - A[2]) * ax[2]) / L2;
    if (t < 0.02 || t > (k === 1 ? 0.8 : 0.98)) continue;
    const q = [P[0] - A[0] - ax[0] * t, P[1] - A[1] - ax[1] * t, P[2] - A[2] - ax[2] * t], r = Math.hypot(...q);
    if (r > 0.2) continue;
    const ang = Math.atan2(q[2], q[0]), u = t * 5.2 + ang * 0.75 + 0.35 * Math.sin(t * 9 + ang * 2);
    const stripe = 1 - Math.min(1, Math.abs(((u % 1) + 1) % 1 - 0.5) / 0.11), win = Math.min(1, Math.max(0, Math.sin(t * Math.PI) * 1.8)) * (t > 0.2 ? 1 : 0.4);
    best = Math.max(best, stripe * win * k * (0.3 + 0.7 * Math.max(0, nrm[2] + 0.2)));
  }
  return best;
}

export function bodyGeometry(look, h = 0.012) {
  const J = paint(look.outfit.col, look.outfit.shade, { id: 0 }), D = paint(look.outfit.cuff, look.outfit.cuffShade ?? look.outfit.cuff, { id: 0, pri: 0.004 });
  const prims = [
    ell([0, 0.28, -0.02], [0.34, 0.3, 0.21], J, 0.1), ell([0, -0.3, -0.01], [0.46, 0.6, 0.24], J, 0.12), ell([0, 0.53, -0.03], [0.28, 0.09, 0.18], J, 0.08),
    ell([0.41, 0.45, -0.02], [0.14, 0.12, 0.14], J, 0.08), ell([-0.41, 0.45, -0.02], [0.14, 0.12, 0.14], J, 0.08),
  ];
  for (const s of [1, -1]) {
    const S = mx(ARM.S, s), E = mx(ARM.E, s), W = mx(ARM.W, s);
    const d = [W[0] - E[0], W[1] - E[1], W[2] - E[2]], l = Math.hypot(...d), u = d.map((v) => v / l);
    const at = (t) => [W[0] - u[0] * t, W[1] - u[1] * t, W[2] - u[2] * t];
    prims.push(cone(S, E, 0.135, 0.115, J, 0.05), ell(E, [0.12, 0.12, 0.12], J, 0.05), cone(E, at(0.05), 0.115, 0.098, J, 0.04), cone(at(0.1), at(0.0), 0.106, 0.104, D, 0.004));
  }
  const g = polygonize(prims, h), P = g.attributes.position.array, N = g.attributes.normal.array, fold = new Float32Array(P.length / 3);
  for (let v = 0; v < fold.length; v++) {
    const p = [P[3 * v], P[3 * v + 1], P[3 * v + 2]], n = [N[3 * v], N[3 * v + 1], N[3 * v + 2]];
    fold[v] = Math.min(1, Math.max(creaseField(p[0], p[1], n[2]), sleeveField(p, n, p[0] >= 0 ? 1 : -1)));
  }
  g.setAttribute("aFold", new BufferAttribute(fold, 1));
  return g;
}

export function collarGeometry(look) {
  const O = look.outfit, nT = 120, nV = 9, pos = [], nor = [], col = [], sh = [], idx = [];
  const ringAt = (th, v, wall) => {
    const front = Math.cos(th), hgt = O.collarH * (1 - 0.62 * Math.max(0, front) ** 2) + 0.01 * Math.sin(th * 3);
    const y = 0.5 + hgt * v, flare = 0.022 * v * v + 0.012 * v, inset = wall ? 0.022 : 0;
    const rx = 0.285 + flare - inset, rz = 0.215 + flare * 0.8 - inset;
    return [Math.sin(th) * rx, y, -0.03 + Math.cos(th) * rz * (front > 0 ? 1.04 : 0.9)];
  };
  const push = (p, c, s) => { pos.push(...p); nor.push(0, 1, 0); col.push(...c); sh.push(...s); };
  const cc = paint(O.col, O.shade), ci = paint(O.lining ?? O.shade, O.shade);
  for (const wall of [0, 1]) for (let j = 0; j <= nV; j++) for (let i = 0; i <= nT; i++) {
    const th = (i / nT) * Math.PI * 2 - Math.PI, v = j / nV, p = ringAt(th, v, wall), c = wall ? ci : cc;
    push(p, [c.col.r, c.col.g, c.col.b], [c.shade.r, c.shade.g, c.shade.b]);
  }
  const rowN = nT + 1, wallN = rowN * (nV + 1);
  for (const wall of [0, 1]) for (let j = 0; j < nV; j++) for (let i = 0; i < nT; i++) {
    const a = wall * wallN + j * rowN + i, b = a + 1, c2 = a + rowN, d = c2 + 1;
    if (wall === 0) idx.push(a, c2, b, b, c2, d); else idx.push(a, b, c2, b, d, c2);
  }
  for (let i = 0; i < nT; i++) { const a = nV * rowN + i, b = a + 1, c2 = wallN + nV * rowN + i, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3)); g.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  g.setIndex(idx); g.computeVertexNormals();
  const N = g.attributes.position.count;
  g.setAttribute("aCol", new BufferAttribute(new Float32Array(col), 3)); g.setAttribute("aShade", new BufferAttribute(new Float32Array(sh), 3));
  const X = new Float32Array(N * 3); for (let v = 0; v < N; v++) { X[3 * v] = 0.5; X[3 * v + 1] = 1; X[3 * v + 2] = 0; }
  g.setAttribute("aXrd", new BufferAttribute(X, 3)); g.setAttribute("aBlob", new BufferAttribute(new Float32Array(N * 4), 4)); g.setAttribute("aBlobN", new BufferAttribute(new Float32Array(N * 3), 3));
  const F = new Float32Array(N);
  for (let v = 0; v < N; v++) { const x = g.attributes.position.getX(v), y = g.attributes.position.getY(v); F[v] = Math.max(...[0.1, 0.19, 0.25].map((c) => Math.max(0, 1 - Math.abs(Math.abs(x) - c) / 0.011)), Math.max(0, 1 - Math.abs(x - 0.045 * (y - 0.5) * 6 - 0.02) / 0.01) * 0.0) * (y > 0.52 ? 0.9 : 0) * 0.85; }
  g.setAttribute("aFold", new BufferAttribute(F, 1));
  return g;
}

function handPrims(skin, nailCol, s) {
  const m = paint(skin.col, skin.shade, { id: 0 }), n = paint(nailCol, skin.shade, { id: 0, pri: 0.002 });
  const X = (x) => x * s, P = [ell([X(0.003), 0.095, 0], [0.04, 0.098, 0.082], m, 0.025), ell([X(0.002), 0.012, -0.004], [0.034, 0.036, 0.056], m, 0.03)];
  for (const [z, y0, len, r] of FINGERS) {
    const sp = z * 0.12, seg = [0, 0.42, 0.72, 1], rs = [r, r * 0.93, r * 0.88, r * 0.8];
    for (let k = 0; k < 3; k++) P.push(cone([X(0.004), y0 + len * seg[k], z + sp * seg[k]], [X(0.004), y0 + len * seg[k + 1] - (k === 2 ? 0 : 0.004), z + sp * seg[k + 1]], rs[k], rs[k + 1], m, 0.002));
    P.push(ell([X(0.014), y0 + len * 0.9, z + sp], [0.006, 0.02, 0.0105], n, 0.002));
  }
  P.push(cone([X(-0.004), 0.03, -0.062], [X(0.002), 0.085, -0.1], 0.026, 0.02, m, 0.012), cone([X(0.002), 0.085, -0.1], [X(0.004), 0.138, -0.108], 0.02, 0.016, m, 0.002), ell([X(0.014), 0.134, -0.108], [0.006, 0.016, 0.009], n, 0.002));
  return P;
}
const FINGERS = [[-0.056, 0.172, 0.168, 0.0235], [-0.019, 0.178, 0.186, 0.0235], [0.019, 0.176, 0.172, 0.022], [0.054, 0.168, 0.136, 0.019]];
function handFold(g) {
  const P = g.attributes.position.array, F = new Float32Array(P.length / 3);
  for (let v = 0; v < F.length; v++) {
    const y = P[3 * v + 1], z = P[3 * v + 2];
    for (const [fz, y0, len, r] of FINGERS) {
      if (Math.abs(z - fz * (1 + 0.12 * (y - y0) / len)) > r * 1.5 || y < y0 - 0.012) continue;
      for (const [k, wd] of [[0, 0.0045], [0.42, 0.0032], [0.72, 0.0028]]) F[v] = Math.max(F[v], 1 - Math.min(1, Math.max(0, (Math.abs(y - (y0 + len * k)) - wd * 0.5) / wd)));
    }
  }
  g.setAttribute("aFold", new BufferAttribute(F, 1));
  return g;
}
export function handsGeometry(look, h = 0.0038) {
  const H = look.hands, parts = [];
  for (const s of [1, -1]) {
    const g = handFold(polygonize(handPrims({ col: H.skin, shade: H.shade }, H.nail, s), h)), W = mx(ARM.W, s);
    const M = new Matrix4().makeTranslation(...W).multiply(new Matrix4().makeRotationZ(s * H.lean)).multiply(new Matrix4().makeRotationY(s * H.turn));
    g.applyMatrix4(M.multiply(new Matrix4().makeScale(H.scale ?? 1, H.scale ?? 1, H.scale ?? 1))); parts.push(g);
  }
  return mergeGeometries(parts);
}

const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const CAP = { c: [0, 0.03, -0.012], r: [0.206, 0.2, 0.2] };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hairline = (th) => 0.84 + 1.0 * sm(0.0, 1.5, Math.abs(th)) + 0.1 * sm(2.2, 3.1, Math.abs(th)) - 0.12 * Math.exp(-(th * th) / 0.02);
const capPoint = (th, ph) => [CAP.c[0] + CAP.r[0] * Math.sin(ph) * Math.sin(th), CAP.c[1] + CAP.r[1] * Math.cos(ph), CAP.c[2] + CAP.r[2] * Math.sin(ph) * Math.cos(th)];
const capNormal = (th, ph) => { const n = [Math.sin(ph) * Math.sin(th) / CAP.r[0], Math.cos(ph) / CAP.r[1], Math.sin(ph) * Math.cos(th) / CAP.r[2]], l = Math.hypot(...n); return n.map((v) => v / l); };
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const RS = 8;
function blade(base, dir, len, w0, th0, curl, sweep, S = 6) {
  const pos = [], idx = [], P = (t) => [0, 1, 2].map((a) => base[a] + dir[a] * len * t + sweep[a] * curl * len * t * t);
  for (let i = 0; i < S; i++) {
    const t = i / S, c = P(t), T = norm([0, 1, 2].map((a) => dir[a] + 2 * sweep[a] * curl * t)), W = norm(cross(T, Math.abs(T[2]) > 0.85 ? [1, 0, 0] : [0, 0, 1])), n2 = norm(cross(W, T));
    const w = w0 * Math.min(1, 1.35 * (1 - t) ** 0.8), th = th0 * (1 - t * 0.7);
    for (let k = 0; k < RS; k++) { const an = (k / RS) * Math.PI * 2, cw = Math.cos(an) * w, sn = Math.sin(an) * th; pos.push(c[0] + W[0] * cw + n2[0] * sn, c[1] + W[1] * cw + n2[1] * sn, c[2] + W[2] * cw + n2[2] * sn); }
  }
  pos.push(...P(1));
  for (let i = 0; i < S - 1; i++) for (let k = 0; k < RS; k++) { const a = i * RS + k, b = i * RS + (k + 1) % RS, c = a + RS, d = b + RS; idx.push(a, c, b, b, c, d); }
  const L = (S - 1) * RS, T = S * RS; for (let k = 0; k < RS; k++) idx.push(L + k, T, L + (k + 1) % RS);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx); g.computeVertexNormals();
  g.userData.tv = Float32Array.from({ length: T + 1 }, (_, i) => (i === T ? 1 : Math.floor(i / RS) / S));
  { const T0 = norm([0, 1, 2].map((a) => dir[a])), W0 = norm(cross(T0, Math.abs(T0[2]) > 0.85 ? [1, 0, 0] : [0, 0, 1])); g.userData.n2 = norm(cross(W0, T0)); }
  return g;
}

export function hairGeometry(look) {
  const H = look.hair, r = rng(H.seed ?? 3), tones = H.tones, parts = [], hullParts = [];
  const tone = (k) => { const x = r(); let a = 0; for (let i = 0; i < k.length; i++) { a += k[i]; if (x < a) return tones[i]; } return tones[0]; };
  const nT = 72, nP = 14, cp = [], ci = [];
  for (let i = 0; i < nT; i++) { const th = (i / nT) * Math.PI * 2 - Math.PI; for (let j = 0; j <= nP; j++) { const ph = (j / nP) * hairline(th); cp.push(...capPoint(th, ph)); } }
  for (let i = 0; i < nT; i++) for (let j = 0; j < nP; j++) { const a = i * (nP + 1) + j, b = ((i + 1) % nT) * (nP + 1) + j; ci.push(a, a + 1, b, b, a + 1, b + 1); }
  const cg = new BufferGeometry(); cg.setAttribute("position", new BufferAttribute(new Float32Array(cp), 3)); cg.setIndex(ci); cg.computeVertexNormals();
  const capG = painted(cg, paint(H.cap, H.capShade, { id: 0 }));
  parts.push(capG); hullParts.push(capG.clone());
  for (const row of H.rows) {
    const [ph, n, t0, t1, up, out, fwd, len, wid] = row;
    for (let i = 0; i < n; i++) {
      const th = t0 + (t1 - t0) * ((i + 0.5) / n) + (r() - 0.5) * 0.18 * (t1 - t0) / n, p = ph + (r() - 0.5) * 0.12;
      const base = capPoint(th, p), nrm = capNormal(th, p), side = Math.sign(Math.sin(th)) || 1;
      const hz = [Math.sin(th), 0, Math.cos(th)], rr = [r() - 0.5, r() - 0.5, r() - 0.5];
      const dir = norm([nrm[0] * out + hz[0] * 0.5 + rr[0] * 0.9, nrm[1] * out + up + rr[1] * 0.4, nrm[2] * out + hz[2] * 0.5 + fwd + rr[2] * 0.9]);
      const L = len * (0.75 + 0.5 * r()), sweepDir = norm([side * 0.7 + 0.3 * (r() - 0.5), 0.1, 0.35 * (r() - 0.5)]);
      const t = tone(H.mix ?? [0.5, 0.28, 0.22]);
      const bl = blade(base.map((v, a) => v - nrm[a] * 0.012), dir, L, wid * (0.85 + 0.3 * r()), 0.016, (r() - 0.4) * 0.5, sweepDir, 7);
      const g = painted(bl, paint(t.col, t.shade, { id: 0, bias: 0.5 })), tv = bl.userData.tv, A = g.attributes.aCol, dk = new Color(t.shade).lerp(new Color(t.col), 0.45), lt = new Color(t.col);
      for (let v = 0; v < A.count; v++) { const k = Math.min(1, tv[v] * 1.15), c = dk.clone().lerp(lt, k); A.setXYZ(v, c.r, c.g, c.b); }
      const rad = norm(base.map((v, a) => v - CAP.c[a])), fn = norm(bl.userData.n2.map((v, a) => v + 0.9 * rad[a])), flat = g.clone(), FN = flat.attributes.normal;
      for (let v = 0; v < FN.count; v++) FN.setXYZ(v, fn[0], fn[1], fn[2]);
      parts.push(flat); hullParts.push(g);
    }
  }
  const out = mergeGeometries(parts);
  out.userData.hullGeo = mergeGeometries(hullParts);
  return out;
}
