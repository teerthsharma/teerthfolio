// Surface tools for the hero2/c figure: an SDF field sampler (project a face-plane point onto the head), painted cards that
// lie on it (eyes, marks, mouth), and flat drawn blades (hair locks, fur flicks, teeth). Output geometry carries the anime program's attributes.
import { BufferAttribute, BufferGeometry, Color, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const fieldOf = (prims) => (x, y, z) => { let d = 1e9; for (const p of prims) d = smin(d, p.f(x, y, z, p), p.k); return d; };
export const C = (h) => (h instanceof Color ? h : new Color(h));
export const mix = (a, b, t) => C(a).clone().lerp(C(b), Math.min(1, Math.max(0, t)));
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function sampler(prims) {
  const f = fieldOf(prims), e = 0.0012;
  const hit = (x, y, z0 = 0.35) => {
    let z = z0, d = f(x, y, z), prev = z;
    for (let i = 0; i < 400 && d > 0.0004; i++) { prev = z; z -= Math.min(0.012, Math.max(0.0008, d * 0.6)); d = f(x, y, z); if (z < -0.35) return null; }
    let lo = z, hi = prev;
    for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (f(x, y, m) < 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const normal = (x, y, z) => new Vector3(f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)).normalize();
  const at = (x, y, off = 0.0012) => { const z = hit(x, y); if (z === null) return null; const n = normal(x, y, z); return { p: new Vector3(x, y, z).addScaledVector(n, off), n }; };
  return { f, hit, normal, at };
}

// finish a geometry: per-vertex albedo and shadow colours (arrays of Color), the engine's neutral line, bias and blob attributes
export function finish(geo, cols, shades, o = {}) {
  const N = geo.attributes.position.count, fa = (n) => new Float32Array(N * n);
  const c = fa(3), s = fa(3), x = fa(3), b = fa(4), bn = fa(3);
  for (let i = 0; i < N; i++) {
    const a = cols[i], d = shades?.[i] ?? a.clone().multiplyScalar(0.55);
    c.set([a.r, a.g, a.b], 3 * i); s.set([d.r, d.g, d.b], 3 * i); x.set([o.bias ?? 0.5, o.line ?? 1, o.id ?? 0], 3 * i); bn.set([0, 1, 0], 3 * i);
  }
  for (const [k, v, n] of [["aCol", c, 3], ["aShade", s, 3], ["aXrd", x, 3], ["aBlob", b, 4], ["aBlobN", bn, 3]]) geo.setAttribute(k, new BufferAttribute(v, n));
  geo.computeBoundingSphere();
  return geo;
}

const facing = (P, N, [a, b, c]) => {
  const A = new Vector3().fromArray(P, 3 * a), B = new Vector3().fromArray(P, 3 * b), D = new Vector3().fromArray(P, 3 * c);
  return B.sub(A).cross(D.sub(A)).dot(new Vector3().fromArray(N, 3 * a)) >= 0;
};

// a grid card on the head surface: map(u,v) -> [x,y] in the face plane (u, v in 0..1), colour(u,v) -> Color (or [Color, shade])
export function sheet(S, nu, nv, map, colour, off = 0.0012) {
  const pos = [], nor = [], cols = [], shs = [], idx = [], ok = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv, [x, y] = map(u, v), h = S.at(x, y, off);
    ok.push(!!h);
    const q = h ?? { p: new Vector3(x, y, 0), n: new Vector3(0, 0, 1) };
    pos.push(q.p.x, q.p.y, q.p.z); nor.push(q.n.x, q.n.y, q.n.z);
    const c = colour(u, v); cols.push(Array.isArray(c) ? c[0] : C(c)); shs.push(Array.isArray(c) ? c[1] : null);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (!(ok[a] && ok[b] && ok[c] && ok[d])) continue;
    for (const t of [[a, b, c], [b, d, c]]) idx.push(...(facing(pos, nor, t) ? t : [t[0], t[2], t[1]]));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  g.setIndex(idx);
  return finish(g, cols, shs.map((s, i) => s ?? cols[i].clone().multiplyScalar(0.55)));
}

// a tapered ribbon along a polyline of face-plane points; w(t) the width in metres
export function stroke(S, pts, w, col, shade, off = 0.0014, step = 0.0025) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  dense.push(pts[pts.length - 1]);
  const m = dense.length;
  const dir = (i) => { const a = dense[Math.max(0, i - 1)], b = dense[Math.min(m - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  return sheet(S, m - 1, 1, (u, v) => {
    const i = Math.round(u * (m - 1)), [dx, dy] = dir(i), t = i / (m - 1), hw = (typeof w === "function" ? w(t) : w) / 2, s = (v - 0.5) * 2 * hw;
    return [dense[i][0] - dy * s, dense[i][1] + dx * s];
  }, () => [C(col), C(shade ?? col)], off);
}

// a flat drawn blade (hair lock, fur flick, tooth): root, direction, length, base width, thickness; face = the flat side's normal.
// Colour runs from `base` at the root to `tip`; `side` tints the two edges.
export function blade({ root, dir, face = [0, 0, 1], wide = null, len, w, th = 0.003, bend = [0, 0, 0], segs = 5, base, tip, side, sharp = 0.8 }) {
  const D = new Vector3(...dir).normalize(), Nf = new Vector3(...face), W = wide ? new Vector3(...wide).addScaledVector(D, -D.dot(new Vector3(...wide))).normalize() : new Vector3().crossVectors(D, Nf).normalize(), N = new Vector3().crossVectors(W, D).normalize();
  const R = new Vector3(...root), bd = new Vector3(...bend), pos = [], cols = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs, c = R.clone().addScaledVector(D, len * s).addScaledVector(bd, s * s), k = 1 - s ** (1 / sharp), hw = (w / 2) * Math.max(0, k), ht = th * Math.max(0, 1 - s * s);
    const tone = mix(base, tip, s), edge = mix(side ?? base, tip, s * 0.7);
    for (const [p, col] of [[c.clone().addScaledVector(W, -hw), edge], [c.clone().addScaledVector(N, ht), tone], [c.clone().addScaledVector(W, hw), edge], [c.clone().addScaledVector(N, -ht), mix(base, edge, 0.5)]]) { pos.push(p.x, p.y, p.z); cols.push(col); }
  }
  for (let i = 0; i < segs; i++) for (let q = 0; q < 4; q++) {
    const a = i * 4 + q, b = i * 4 + ((q + 1) % 4), c = a + 4, d = b + 4;
    for (const t of [[a, c, b], [b, c, d]]) {
      const P = t.map((v) => new Vector3().fromArray(pos, 3 * v)), mid = new Vector3();
      for (let r = 0; r < 4; r++) mid.add(new Vector3().fromArray(pos, 3 * (i * 4 + r)));
      mid.multiplyScalar(0.25);
      const n = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0])), g3 = P[0].clone().add(P[1]).add(P[2]).multiplyScalar(1 / 3).sub(mid);
      idx.push(...(n.dot(g3) >= 0 ? t : [t[0], t[2], t[1]]));
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return finish(g, cols, cols.map((c) => c.clone().multiplyScalar(0.62)));
}

export const merge = (list) => (list.length ? mergeGeometries(list.map((g) => (g.index ? g : g))) : null);
