// THE HERO MODELLER: characters are signed distance fields (round cones and
// ellipsoids blended with a polynomial smooth-min), polygonised ONCE at load by
// surface nets into one watertight mesh with exact SDF normals. That is what
// buys the deliberate silhouette: no seams between primitives, so the hull
// line runs round the whole figure instead of every sphere.
//
// Per vertex it also bakes what the anime material reads (see material.js):
//   aCol    lit albedo (linear)         aShade  authored shadow colour (linear)
//   aXrd    x: Xrd shadow bias (0.5 = none), y: line width multiplier, z: material id
//           (0 body, 1 hair with angel ring, 2 face with analytic shadow, 3 unlit)
//   aBlob   xyz: the vertex projected onto a blob (the slime), w: height 0..1
//   aBlobN  the blob normal there
// The Xrd bias is smoothed SDF ambient occlusion (5 taps along the normal,
// then 3 Laplacian passes v += 0.5 (mean(nbrs) - v)): armpits, under the chin
// and the inside of the coat pre-shadow; faces keep their authored bias.
import { BufferAttribute, BufferGeometry, Color, Euler, Matrix3, Matrix4, Vector3 } from "three";

const smin = (a, b, k) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

// iq's round cone: a (radius r1) to b (radius r2)
function roundCone(px, py, pz, p) {
  const { ax, ay, az, bax, bay, baz, l2, rr, a2, il2, r1, r2 } = p;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const xx = pax * l2 - bax * y, xy = pay * l2 - bay * y, xz = paz * l2 - baz * y;
  const x2 = xx * xx + xy * xy + xz * xz;
  const y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

// iq's ellipsoid bound (good near the surface, which is all surface nets reads)
function ellipsoid(px, py, pz, p) {
  let x = px - p.cx, y = py - p.cy, z = pz - p.cz;
  if (p.rot) {
    const e = p.rot.elements;
    const X = e[0] * x + e[3] * y + e[6] * z, Y = e[1] * x + e[4] * y + e[7] * z, Z = e[2] * x + e[5] * y + e[8] * z;
    x = X; y = Y; z = Z;
  }
  const k0 = Math.hypot(x / p.rx, y / p.ry, z / p.rz);
  const k1 = Math.hypot(x / (p.rx * p.rx), y / (p.ry * p.ry), z / (p.rz * p.rz));
  return k1 < 1e-9 ? -Math.min(p.rx, p.ry, p.rz) : (k0 * (k0 - 1)) / k1;
}

// --- primitive constructors; `m` is the paint: { col, shade, bias?, line?, id?, pri? }
export function cone(a, b, r1, r2, m, k = 0.04) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  return { f: roundCone, ax: a[0], ay: a[1], az: a[2], bax, bay, baz, l2, rr, a2: l2 - rr * rr, il2: 1 / l2, r1, r2, m, k, lo: [Math.min(a[0] - r1, b[0] - r2), Math.min(a[1] - r1, b[1] - r2), Math.min(a[2] - r1, b[2] - r2)], hi: [Math.max(a[0] + r1, b[0] + r2), Math.max(a[1] + r1, b[1] + r2), Math.max(a[2] + r1, b[2] + r2)] };
}
export function ell(c, r, m, k = 0.04, rot = null) {
  const R = Math.max(...r);
  const p = { f: ellipsoid, cx: c[0], cy: c[1], cz: c[2], rx: r[0], ry: r[1], rz: r[2], m, k, lo: [c[0] - R, c[1] - R, c[2] - R], hi: [c[0] + R, c[1] + R, c[2] + R] };
  if (rot) p.rot = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...rot)).invert());
  return p;
}
const paintOf = (p) => p.m;

// paint helper: hex albedo + hex shadow (both authored), optional fields
export const paint = (col, shade, o = {}) => ({ col: new Color(col), shade: new Color(shade), bias: o.bias ?? null, line: o.line ?? 1, id: o.id ?? 0, pri: o.pri ?? 0 });

function field(prims) {
  return (x, y, z) => {
    let d = 1e9;
    for (const p of prims) {
      // AABB cull: a primitive whose box is farther than d + k cannot change the blend
      const bx = Math.max(p.lo[0] - x, 0, x - p.hi[0]), by = Math.max(p.lo[1] - y, 0, y - p.hi[1]), bz = Math.max(p.lo[2] - z, 0, z - p.hi[2]);
      if (d < 1e8 && bx * bx + by * by + bz * bz > (d + p.k) * (d + p.k)) continue;
      d = smin(d, p.f(x, y, z, p), p.k);
    }
    return d;
  };
}

// surface nets over the primitives' bounds at voxel size h
export function polygonize(prims, h = 0.02, blob = null) {
  const sdf = field(prims);
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of prims) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p.lo[a]); hi[a] = Math.max(hi[a], p.hi[a]); }
  for (let a = 0; a < 3; a++) { lo[a] -= 2 * h + 0.05; hi[a] += 2 * h + 0.05; }
  const n = [0, 1, 2].map((a) => Math.ceil((hi[a] - lo[a]) / h) + 1);
  const [nx, ny, nz] = n;
  const V = new Float32Array(nx * ny * nz);
  const gi = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[gi(i, j, k)] = sdf(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);

  const cellV = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const ci = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { cv[c] = V[gi(i + C[c][0], j + C[c][1], k + C[c][2])]; if (cv[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of E) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += C[a][0] + t * (C[b][0] - C[a][0]); sy += C[a][1] + t * (C[b][1] - C[a][1]); sz += C[a][2] + t * (C[b][2] - C[a][2]); cnt++;
    }
    cellV[ci(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / cnt) * h, lo[1] + (j + sy / cnt) * h, lo[2] + (k + sz / cnt) * h);
  }
  // quads: every grid edge with a sign change joins the 4 cells around it
  const idx = [];
  const ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = V[gi(i, j, k)];
    const g = [i, j, k];
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3, w = (d + 2) % 3;
      if (g[d] + 1 >= n[d] || g[u] < 1 || g[w] < 1 || g[u] >= n[u] - 1 || g[w] >= n[w] - 1) continue;
      const v1 = V[gi(i + ax[d][0], j + ax[d][1], k + ax[d][2])];
      if ((v0 < 0) === (v1 < 0)) continue;
      const cell = (du, dw) => {
        const c = [i, j, k];
        c[u] -= du; c[w] -= dw;
        return cellV[ci(c[0], c[1], c[2])];
      };
      const a = cell(0, 0), b = cell(1, 0), c = cell(1, 1), e = cell(0, 1);
      if (a < 0 || b < 0 || c < 0 || e < 0) continue;
      if (v0 < 0) idx.push(a, b, c, a, c, e);
      else idx.push(a, c, b, a, e, c);
    }
  }
  const N = pos.length / 3;
  const P = new Float32Array(pos);
  const nrm = new Float32Array(N * 3);
  const e = h * 0.5;
  for (let v = 0; v < N; v++) {
    let x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    let l = Math.hypot(gx, gy, gz) || 1;
    gx /= l; gy /= l; gz /= l;
    const d = sdf(x, y, z); // one Newton step onto the surface: crisper silhouette
    x -= gx * d; y -= gy * d; z -= gz * d;
    P[3 * v] = x; P[3 * v + 1] = y; P[3 * v + 2] = z;
    nrm[3 * v] = gx; nrm[3 * v + 1] = gy; nrm[3 * v + 2] = gz;
  }
  // winding check against the gradient on the first triangle; flip all if inside-out
  if (idx.length) {
    const [a, b, c] = idx;
    const A = new Vector3().fromArray(P, 3 * a), B = new Vector3().fromArray(P, 3 * b), Cc = new Vector3().fromArray(P, 3 * c);
    const fn = B.clone().sub(A).cross(Cc.clone().sub(A));
    if (fn.dot(new Vector3().fromArray(nrm, 3 * a)) < 0) for (let t = 0; t < idx.length; t += 3) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }

  // paint: the nearest primitive (raw distance minus priority) owns the vertex
  const col = new Float32Array(N * 3), shade = new Float32Array(N * 3), xrd = new Float32Array(N * 3);
  const authored = new Float32Array(N).fill(-1);
  for (let v = 0; v < N; v++) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    let best = null, bd = 1e9;
    for (const p of prims) { const d = p.f(x, y, z, p) - (paintOf(p).pri || 0); if (d < bd) { bd = d; best = paintOf(p); } }
    col[3 * v] = best.col.r; col[3 * v + 1] = best.col.g; col[3 * v + 2] = best.col.b;
    shade[3 * v] = best.shade.r; shade[3 * v + 1] = best.shade.g; shade[3 * v + 2] = best.shade.b;
    xrd[3 * v + 1] = best.line; xrd[3 * v + 2] = best.id;
    if (best.bias !== null) authored[v] = best.bias;
  }
  // SDF ambient occlusion, then 3 Laplacian passes over the mesh neighbours
  const scale = h * 3;
  let ao = new Float32Array(N);
  for (let v = 0; v < N; v++) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2], nx_ = nrm[3 * v], ny_ = nrm[3 * v + 1], nz_ = nrm[3 * v + 2];
    let o = 0;
    for (let s = 1; s <= 5; s++) { const t = s * scale; o += (t - sdf(x + nx_ * t, y + ny_ * t, z + nz_ * t)) / 2 ** s; }
    ao[v] = Math.min(1, Math.max(0, 1 - (2.2 * o) / scale));
  }
  const nb = Array.from({ length: N }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(N);
    for (let v = 0; v < N; v++) { let s = 0; for (const u of nb[v]) s += ao[u]; next[v] = nb[v].size ? ao[v] + 0.5 * (s / nb[v].size - ao[v]) : ao[v]; }
    ao = next;
  }
  // bias: 0.5 is neutral; occluded vertices drop toward 0.15 (pre-shadowed)
  for (let v = 0; v < N; v++) xrd[3 * v] = authored[v] >= 0 ? authored[v] : 0.5 - 0.42 * (1 - ao[v]) ** 1.3 + 0.05 * ao[v];

  // the blob (slime) target per vertex: radial projection onto an ellipsoid
  const B = new Float32Array(N * 4), BN = new Float32Array(N * 3);
  let ylo = 1e9, yhi = -1e9;
  for (let v = 0; v < N; v++) { ylo = Math.min(ylo, P[3 * v + 1]); yhi = Math.max(yhi, P[3 * v + 1]); }
  const bc = blob?.c ?? [0, 0.3, 0], br = blob?.r ?? [0.35, 0.3, 0.35];
  for (let v = 0; v < N; v++) {
    let dx = (P[3 * v] - bc[0]) / br[0], dy = (P[3 * v + 1] - bc[1]) / br[1], dz = (P[3 * v + 2] - bc[2]) / br[2];
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l; dy /= l; dz /= l;
    // the slime sits on the ground: squash the bottom hemisphere flat
    const fy = dy < 0 ? dy * 0.35 : dy;
    B[4 * v] = bc[0] + dx * br[0]; B[4 * v + 1] = bc[1] + fy * br[1]; B[4 * v + 2] = bc[2] + dz * br[2];
    B[4 * v + 3] = (P[3 * v + 1] - ylo) / Math.max(1e-6, yhi - ylo);
    const n_ = new Vector3(dx / br[0], (dy < 0 ? fy / 0.35 : dy) / br[1], dz / br[2]).normalize();
    BN[3 * v] = n_.x; BN[3 * v + 1] = n_.y; BN[3 * v + 2] = n_.z;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(P, 3));
  geo.setAttribute("normal", new BufferAttribute(nrm, 3));
  geo.setAttribute("aCol", new BufferAttribute(col, 3));
  geo.setAttribute("aShade", new BufferAttribute(shade, 3));
  geo.setAttribute("aXrd", new BufferAttribute(xrd, 3));
  geo.setAttribute("aBlob", new BufferAttribute(B, 4));
  geo.setAttribute("aBlobN", new BufferAttribute(BN, 3));
  geo.setIndex(N > 65535 ? new BufferAttribute(new Uint32Array(idx), 1) : new BufferAttribute(new Uint16Array(idx), 1));
  geo.computeBoundingSphere();
  return geo;
}

// Give any ordinary geometry (sets, props, fx hosts) the attributes the anime
// program reads, so every mesh shares ONE program. `p` is a paint().
export function painted(geo, p, o = {}) {
  const N = geo.attributes.position.count;
  const fill = (k, v) => { const a = new Float32Array(N * k.length); for (let i = 0; i < N; i++) a.set(k, i * k.length); geo.setAttribute(v, new BufferAttribute(a, k.length)); };
  if (!geo.attributes.normal) geo.computeVertexNormals();
  fill([p.col.r, p.col.g, p.col.b], "aCol");
  fill([p.shade.r, p.shade.g, p.shade.b], "aShade");
  fill([p.bias ?? o.bias ?? 0.5, p.line, p.id], "aXrd");
  fill([0, 0, 0, 0], "aBlob");
  fill([0, 1, 0], "aBlobN");
  return geo;
}
