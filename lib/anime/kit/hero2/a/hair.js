// HAIR as drawn locks (head-local metres): a smooth scalp cap in the base tone, and flat blades planted on it, each a four-sided
// tapered shard whose facets carry two or three flat tones (no gloss ring, id 0). The ink hull of a lock is built from a smoothed
// copy of the same mesh, so hard facets do not open cracks in the outline. Look data: tones [light, mid, dark], base, seed, count, length.
import { BufferAttribute, BufferGeometry, Color, Vector3 } from "three";
import { paint } from "../../../sdf.js";
import { mesh, ss } from "./sculpt.js";

const SK = { c: [0, 0.05, -0.02], r: [0.15, 0.146, 0.16] };
const rng = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hairY = (az) => 0.152 - 0.135 * ss(0.3, 1.45, Math.abs(az));

function capGeometry(hair) {
  const r = SK.r.map((v) => v + 0.012), c = SK.c;
  const f = (x, y, z) => {
    const e = Math.hypot((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]) - 1, az = Math.atan2(x, z - c[2]);
    return Math.max(e * Math.min(...r) * 0.9, hairY(az) - y);
  };
  return mesh(f, [-0.18, -0.12, -0.2], [0.18, 0.22, 0.2], 0.0055, [hair.base, hair.tones[2]]);
}

export function locksGeometry(hair) {
  const rnd = rng(hair.seed ?? 1), T = hair.tones.map((h) => new Color(h)), D = T[2].clone().multiplyScalar(0.72);
  const pos = [], nrm = [], col = [], shd = [], smooth = [], idx = [];
  const c = new Vector3(...SK.c), up = new Vector3(0, 1, 0), L0 = hair.length ?? 1, RING = 8;
  const clumps = [];
  for (const [el, cnt, base] of [[0.2, 15, 0.085], [0.5, 13, 0.105], [0.85, 11, 0.12], [1.15, 7, 0.125], [1.42, 4, 0.115]]) for (let ci = 0; ci < cnt; ci++) clumps.push({ az: ((ci + rnd() * 0.5) / cnt) * Math.PI * 2 - Math.PI, el, base });
  for (let i = 0; i < 13; i++) { const az = -1.05 + i * 0.175 + (rnd() - 0.5) * 0.06, y = hairY(az) + 0.008; clumps.push({ az, el: Math.asin(Math.min(0.99, (y - SK.c[1]) / (SK.r[1] + 0.004))), base: 0.05, fringe: true }); }
  for (const { az, el, base, fringe } of clumps) {
    const d = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const root = new Vector3(c.x + d.x * (SK.r[0] + 0.004), c.y + d.y * (SK.r[1] + 0.004), c.z + d.z * (SK.r[2] + 0.004));
    if (root.y < hairY(az) + 0.004) continue;
    const n = new Vector3(d.x / SK.r[0], d.y / SK.r[1], d.z / SK.r[2]).normalize(), crown = ss(0.2, 1.3, el), front = ss(0.7, 0, Math.abs(az)) * (1 - crown);
    const k = fringe ? 0.1 : 0.28 + 0.4 * crown, radial = new Vector3(d.x, 0, d.z).normalize();
    const dir0 = n.clone().multiplyScalar(1 - k).addScaledVector(up, k).addScaledVector(radial, fringe ? 0.35 : 0.5 * crown).normalize();
    const side = new Vector3().crossVectors(dir0, n).normalize();
    for (const [fan, lk, wk] of fringe ? [[0, 1, 1]] : [[-1, 0.7, 0.85], [0, 1, 1], [1, 0.8, 0.9]]) {
      const dir = dir0.clone().addScaledVector(side, fan * (0.34 + 0.2 * rnd())).addScaledVector(up, (rnd() - 0.4) * 0.2).normalize();
      const len = L0 * base * lk * (0.8 + 0.4 * rnd()) * (fringe ? 1 : 1 - 0.3 * front), nn = new Vector3().crossVectors(side, dir).normalize();
      const bend = side.clone().multiplyScalar(fan * 0.3 + (rnd() - 0.5) * 0.5).addScaledVector(up, fringe ? -0.05 : 0.1 + 0.15 * rnd());
      const w0 = (fringe ? 0.03 : 0.042 + 0.016 * rnd()) * wk, th = 0.0055, ring = [], r2 = root.clone().addScaledVector(side, fan * 0.02);
      for (let j = 0; j <= RING; j++) {
        const t = j / RING, p = r2.clone().addScaledVector(dir, len * t).addScaledVector(bend, len * t * t), w = w0 * Math.max(0, 1 - t * t) ** 0.85 * (0.7 + 0.8 * t * (1 - t)) + 0.0004, h = th * (1 - t ** 1.3) + 0.0004;
        ring.push([p.clone().addScaledVector(side, -w), p.clone().addScaledVector(nn, h), p.clone().addScaledVector(side, w), p.clone().addScaledVector(nn, -h), p, side, nn]);
      }
      const tn = rnd(), ti = tn < 0.22 ? 0 : tn < 0.72 ? 1 : 2, A1 = T[ti], A2 = T[Math.min(2, ti + 1)], faces = [[0, 1, [A1, A2]], [1, 2, [A1, A2]], [2, 3, [A2, D]], [3, 0, [A2, D]]];
      for (let j = 0; j < RING; j++) for (const [s, e, [cl, sh]] of faces) {
        const A = ring[j][s], B = ring[j][e], C2 = ring[j + 1][e], D2 = ring[j + 1][s];
        const fn = new Vector3().crossVectors(new Vector3().subVectors(B, A), new Vector3().subVectors(D2, A)).normalize();
        const out = new Vector3().addVectors(ring[j][5].clone().multiplyScalar(s === 0 || s === 3 ? -1 : 1), ring[j][6].clone().multiplyScalar(s === 0 || s === 1 ? 1 : -1));
        if (fn.dot(out) < 0) fn.negate();
        const base0 = pos.length / 3;
        for (const [P, jj, which] of [[A, j, s], [B, j, e], [C2, j + 1, e], [D2, j + 1, s]]) {
          pos.push(P.x, P.y, P.z); nrm.push(fn.x, fn.y, fn.z); col.push(cl.r, cl.g, cl.b); shd.push(sh.r, sh.g, sh.b);
          const sn = which === 0 ? ring[jj][5].clone().negate() : which === 2 ? ring[jj][5].clone() : which === 1 ? ring[jj][6].clone() : ring[jj][6].clone().negate();
          smooth.push(sn.x, sn.y, sn.z);
        }
        if (new Vector3().crossVectors(new Vector3().subVectors(B, A), new Vector3().subVectors(D2, A)).dot(fn) >= 0) idx.push(base0, base0 + 1, base0 + 2, base0, base0 + 2, base0 + 3);
        else idx.push(base0, base0 + 2, base0 + 1, base0, base0 + 3, base0 + 2);
      }
    }
  }
  const mk = (normals) => {
    const g = new BufferGeometry(), n = pos.length / 3;
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    g.setAttribute("aCol", new BufferAttribute(new Float32Array(col), 3));
    g.setAttribute("aShade", new BufferAttribute(new Float32Array(shd), 3));
    const x = new Float32Array(n * 3); for (let i = 0; i < n; i++) { x[3 * i] = 0.5; x[3 * i + 1] = 1; x[3 * i + 2] = 0; }
    g.setAttribute("aXrd", new BufferAttribute(x, 3));
    const bl = new Float32Array(n * 4); for (let i = 0; i < n; i++) { bl[4 * i] = pos[3 * i]; bl[4 * i + 1] = pos[3 * i + 1]; bl[4 * i + 2] = pos[3 * i + 2]; }
    g.setAttribute("aBlob", new BufferAttribute(bl, 4)); g.setAttribute("aBlobN", new BufferAttribute(new Float32Array(normals), 3));
    g.setIndex(idx);
    return g;
  };
  return { lit: mk(nrm), hull: mk(smooth) };
}

export { capGeometry, paint };
