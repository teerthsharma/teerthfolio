// SCULPT TOOLS for the hero2/a figure: free-form signed distance fields (smooth union and subtraction, so sockets,
// mouth pockets and hollow collars can be carved), surface-net meshing through the engine's polygonize, and a
// per-vertex recolour so regions (nose pad, gums, muzzle) are painted by position after the form exists.
import { Color, BufferAttribute } from "three";
import { cone, ell, paint, polygonize } from "../../../sdf.js";

export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);
export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const E = (c, r, rot = null) => { const p = ell(c, r, null, 0, rot); return (x, y, z) => p.f(x, y, z, p); };
export const C = (a, b, r1, r2) => { const p = cone(a, b, r1, r2, null, 0); return (x, y, z) => p.f(x, y, z, p); };

export function mesh(f, lo, hi, h, base) {
  return polygonize([{ f: (x, y, z) => f(x, y, z), lo, hi, k: 0, m: paint(base[0], base[1]) }], h);
}

const cache = new Map();
const lin = (hex) => cache.get(hex) ?? (cache.set(hex, new Color(hex)), cache.get(hex));
// fn(x, y, z, nx, ny, nz, out) fills out = { col, shade, id?, line? } (hex strings); unset fields keep the meshing default
export function recolor(geo, fn) {
  const P = geo.attributes.position, N = geo.attributes.normal, A = geo.attributes.aCol, S = geo.attributes.aShade, X = geo.attributes.aXrd, out = {};
  for (let i = 0; i < P.count; i++) {
    out.col = out.shade = out.id = out.line = out.bias = undefined;
    fn(P.getX(i), P.getY(i), P.getZ(i), N.getX(i), N.getY(i), N.getZ(i), out);
    if (out.col) { const c = lin(out.col); A.setXYZ(i, c.r, c.g, c.b); }
    if (out.shade) { const c = lin(out.shade); S.setXYZ(i, c.r, c.g, c.b); }
    if (out.id !== undefined) X.setZ(i, out.id);
    if (out.line !== undefined) X.setY(i, out.line);
    if (out.bias !== undefined) X.setX(i, out.bias);
  }
  A.needsUpdate = S.needsUpdate = X.needsUpdate = true;
  return geo;
}
export const mix = (a, b, t) => { const A = lin(a), B = lin(b), c = A.clone().lerp(B, t); return "#" + c.getHexString(); };
export const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
export const gridNoise = (x, y, z, f) => hash(Math.floor(x * f), Math.floor(y * f), Math.floor(z * f));
export { BufferAttribute };

// pull the baked ambient-occlusion bias toward neutral (k < 1): keeps the form shadow, drops the dirty smudge
export function softenBias(geo, k) {
  const X = geo.attributes.aXrd;
  for (let i = 0; i < X.count; i++) X.setX(i, 0.5 + (X.getX(i) - 0.5) * k);
  X.needsUpdate = true;
  return geo;
}
