// The upper figure: a jacket (wide shoulders, sleeves with fold ridges, wrist bands, a lofted stand collar with a trim and a button)
// and two five-finger hands in the sign. SDF parts for the cloth and hands, a parametric loft for the collar. Metres, chin at the origin.
import { BufferAttribute, BufferGeometry, Euler, Matrix4, Vector3 } from "three";
import { cone, ell, paint, polygonize } from "../../../sdf.js";
import { PRO } from "./proportions.js";
import { C, finish, merge, mix, sampler, sstep, stroke } from "./surface.js";

const V = (a) => new Vector3(...a);
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const FOLDS = [[[[0.13, -0.11], [0.2, -0.15], [0.27, -0.21], [0.315, -0.3]], 0.011], [[[0.34, -0.2], [0.37, -0.28], [0.385, -0.37]], 0.009], [[[0.21, -0.24], [0.17, -0.3], [0.18, -0.38]], 0.009], [[[0.25, -0.33], [0.2, -0.31], [0.16, -0.3]], 0.008], [[[0.1, -0.13], [0.15, -0.19], [0.17, -0.25]], 0.007]];
const SH = [0.285, -0.16, -0.01], EL = [0.4, -0.46, 0.03], WR = [0.1, -0.285, 0.19];

function ridges(A, B, rA, rB, m, phis, t0, t1, tw = 0.5, r = 0.011) {
  const ax = V(B).sub(V(A)).normalize(), f = new Vector3(0, 0.3, 1).addScaledVector(ax, -ax.y * 0.3 - ax.z).normalize(), v = new Vector3().crossVectors(ax, f).normalize(), P = [];
  for (const phi of phis) {
    const at = (t) => { const k = phi + tw * (t - 0.5), rr = (rA + (rB - rA) * t) * 0.94; return V(lerp3(A, B, t)).addScaledVector(f, Math.cos(k) * rr).addScaledVector(v, Math.sin(k) * rr).toArray(); };
    P.push(cone(at(t0), at(t1), r, r * 0.7, m, 0.03));
  }
  return P;
}

export function cloth(O, h) {
  const J = paint(O.col, O.shade), K = paint(O.band, "#0a070f", { pri: 0.02 }), P = [];
  const arm = (s) => { const m = (p) => [p[0] * s, p[1], p[2]]; return [m(SH), m(EL), [WR[0] * s, WR[1], WR[2] + (s < 0 ? 0.035 : 0)]]; };
  P.push(cone([-0.27, -0.14, -0.015], [0.27, -0.14, -0.015], 0.078, 0.078, J, 0.08), ell([0, -0.27, 0], [0.29, 0.2, 0.165], J, 0.1), ell([0, -0.5, 0], [0.27, 0.2, 0.16], J, 0.1), ell([0, -0.1, -0.01], [0.15, 0.05, 0.13], J, 0.06));
  for (const s of [1, -1]) {
    const [S, E, W] = arm(s);
    const ax0 = V(W).sub(V(E)).normalize(), Wc = W.map((v, i) => v - ax0.getComponent(i) * 0.06), rW = 0.08 - 0.022 * 0.78;
    P.push(ell([S[0], S[1] + 0.005, S[2]], [0.088, 0.082, 0.082], J, 0.05), cone(S, E, 0.088, 0.08, J, 0.05), ell(E, [0.082, 0.082, 0.082], J, 0.04), cone(E, Wc, 0.08, 0.06, J, 0.04));
    const We = Wc, wb = lerp3(E, We, 0.78);
    P.push(cone(wb, We, rW + 0.004, 0.06, K, 0.004));
    P.push(...ridges(S, E, 0.088, 0.08, J, [-1.0, -0.2, 0.7, 1.4].map((p) => p * s), 0.15, 0.8, 0.7 * s, 0.009));
  }
  const S2 = sampler(P), folds = [], dk = mix(O.shade, "#000", 0.55), lt = mix(O.col, "#8a7ab8", 0.45);
  for (const s of [1, -1]) for (const [pts, w] of FOLDS) { const q = pts.map(([x, y]) => [x * s, y]); folds.push(stroke(S2, q, (t) => w * (1 - 0.85 * t) + 0.0015, dk, dk, 0.0016, 0.004), stroke(S2, q.map(([x, y]) => [x + 0.009 * s, y + 0.004]), (t) => 0.55 * w * (1 - t) + 0.001, lt, lt, 0.0014, 0.004)); }
  const g = [polygonize(P, 0.0065 * h), collar(O), merge(folds)];
  const btn = polygonize([cone([0.0966 * 0.99, -0.047, 0.104], [0.0966 * 1.06, -0.047, 0.12], 0.0115, 0.0105, paint(O.trim, mix(O.trim, "#000", 0.5), { pri: 0.01 }), 0.004)], 0.0022);
  return merge([...g, btn]);
}

function collar(O) {
  const N = 64, rows = [], yb = -0.105, z0 = -0.012, th = 0.013;
  const yt = (t) => PRO.collarTop + 0.012 * Math.max(0, -Math.cos(t)) - 0.072 * Math.max(0, Math.cos(t)) ** 1.5;
  const prof = [];
  for (let i = 0; i <= 8; i++) prof.push({ h: i / 8, out: 0, kind: 0 });
  for (let i = 1; i <= 4; i++) { const a = (Math.PI * i) / 5; prof.push({ h: 1 + 0.004 * Math.sin(a), out: -th * (1 - Math.cos(a)) / 2, kind: 1 }); }
  for (let i = 8; i >= 0; i--) prof.push({ h: 0.1 + 0.9 * (i / 8) ** 1.0, out: -th, kind: 2 });
  const pos = [], cols = [];
  for (let j = 0; j < N; j++) for (const p of prof) {
    const t = (j / N) * Math.PI * 2, top = yt(t), y = yb + (top - yb) * Math.min(p.h, 1.0) + (p.h > 1 ? (p.h - 1) * 1 : 0);
    const fl = Math.min(p.h, 1) ** 2, rx = 0.152 + 0.03 * fl + p.out, rz = 0.14 + 0.026 * fl + p.out;
    pos.push(rx * Math.sin(t), y, z0 + rz * Math.cos(t));
    const rim = sstep(0.9, 1, p.h) * (p.kind === 2 ? 0.4 : 1), base = p.kind === 2 ? mix(O.shade, "#000", 0.35) : mix(O.col, O.shade, 0.2 + 0.25 * (1 - p.h));
    cols.push(mix(base, O.rim ?? O.col, rim * 0.85));
  }
  const M = prof.length, idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < M - 1; i++) { const a = j * M + i, b = ((j + 1) % N) * M + i; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx); g.computeVertexNormals();
  const P = g.attributes.position, Nn = g.attributes.normal, a = idx[0], jm = Math.floor(N / 4) * M + 4, pa = new Vector3().fromArray(P.array, 3 * jm), nn = new Vector3().fromArray(Nn.array, 3 * jm);
  if (nn.x * pa.x + nn.z * (pa.z - z0) < 0) { for (let k = 0; k < idx.length; k += 3) { const s = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = s; } g.setIndex(idx); g.computeVertexNormals(); }
  return finish(g, cols, cols.map((c) => mix(c, O.shade, 0.5)));
}

// one hand in a local frame (y along the fingers, palm faces -z, thumb at -x), mapped by scale, roll, tilt and wrist
export function hand(Hd, side, tilt, roll, wrist, h) {
  const HS = 1.18, M = new Matrix4().makeTranslation(...wrist).multiply(new Matrix4().makeRotationZ(tilt)).multiply(new Matrix4().makeRotationY(roll)).multiply(new Matrix4().makeScale(HS, HS, HS));
  const T = (p) => { const q = V(p).applyMatrix4(M); return [q.x * side, q.y, q.z]; };
  const m = paint(Hd.skin, Hd.shade), tip = paint(Hd.nail, Hd.shade, { pri: 0.004 }), P = [];
  for (const y of [0.012, 0.045, 0.08, 0.108]) P.push(cone(T([-0.028, y, 0]), T([0.028, y, 0]), 0.019, 0.019, m, 0.012));
  P.push(cone(T([0, -0.08, 0]), T([0, 0.01, 0]), 0.03, 0.036, m, 0.02));
  const F = [[-0.031, 0.105, 0, -0.01, 0.015], [-0.01, 0.118, 0, 0, 0.02], [0.011, 0.108, 0, 0.015, 0.03], [0.031, 0.087, 0, 0.04, 0.06]];
  F.forEach(([x, L, , fan, flex], i) => {
    let a = [x, 0.112, 0.0], ang = fan, bend = flex;
    const r = [0.0112, 0.0108, 0.0102, 0.0092][i];
    [0.46, 0.3, 0.24].forEach((fr, j) => {
      ang += 0; bend += j * 0.12;
      const d = [Math.sin(ang), Math.cos(ang) * Math.cos(bend), -Math.cos(ang) * Math.sin(bend)], b = [a[0] + d[0] * L * fr, a[1] + d[1] * L * fr, a[2] + d[2] * L * fr];
      P.push(cone(T(a), T(b), r * (1 - j * 0.12), r * (1 - (j + 1) * 0.14), j === 2 ? tip : m, 0.003));
      a = b;
    });
  });
  let a = [-0.034, 0.03, -0.012];
  [[0.04, -0.3, 0.3], [0.034, -0.08, 0.45]].forEach(([len, ang, bend], j) => {
    const d = [Math.sin(ang), Math.cos(ang) * Math.cos(bend), -Math.sin(bend) * 0.8], b = [a[0] + d[0] * len, a[1] + d[1] * len, a[2] + d[2] * len];
    P.push(cone(T(a), T(b), 0.0125 - j * 0.0025, 0.0108 - j * 0.0025, j ? tip : m, 0.004)); a = b;
  });
  return polygonize(P, 0.0034 * h);
}
