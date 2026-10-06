// WORLD helpers for pr-topograph-432 (candidates to promote: `part`, `grad`, `joined`).
// Every set piece is a painted geometry (sdf.js painted(): aCol/aShade/aXrd on every vertex) so ONE anime program draws it.
// A flat cartoon fill is a single colour pair; a PAINTED GRADIENT is a per-vertex colour pair (grad) over a segmented mesh.
import { Color } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, painted } from "../../../sdf.js";

// Bible palette (section 2), shadows shift to violet, never grey.
export const C = {
  stoneLit: "#7a6aa0", stoneMid: "#4a3a78", stoneShade: "#241044", deep: "#09030f",
  carpet: "#c82040", carpetShade: "#7a1428",
  goldLit: "#ffd24a", goldMid: "#e6b43a", goldShade: "#a8741a", goldHi: "#fff4c0",
  cloak: "#3a2a5a", cloakShade: "#1a0f30",
  purple: "#b46bff", purpleDeep: "#34205f", crimson: "#c82040",
  guild: ["#f0b429", "#c82040", "#3a8a5a", "#2f6ab0", "#8a3a9a", "#e0e0e0"],
};

const tmp = new Color(), tmp2 = new Color();
export const mix = (a, b, t) => { tmp.set(a); tmp2.set(b); return tmp.lerp(tmp2, Math.min(1, Math.max(0, t))).clone(); };
export const darken = (hex, k) => { const c = new Color(hex); return "#" + c.multiplyScalar(k).getHexString(); };

// strip to what the anime program reads, bake a flat colour pair, return a non-indexed geometry ready to merge
export function part(geo, col, shade = darken(col, 0.55), o = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  return painted(g, paint(col, shade, o), o);
}

// overwrite the per-vertex colours with a function of position: fn(x, y, z) -> [litHex, shadeHex] or [Color, Color]
export function grad(geo, fn) {
  const P = geo.attributes.position, A = geo.attributes.aCol, S = geo.attributes.aShade;
  for (let i = 0; i < P.count; i++) {
    const [c, s] = fn(P.getX(i), P.getY(i), P.getZ(i));
    const cc = c.isColor ? c : tmp.set(c), ss = s.isColor ? s : tmp2.set(s);
    A.setXYZ(i, cc.r, cc.g, cc.b); S.setXYZ(i, ss.r, ss.g, ss.b);
  }
  return geo;
}

export const joined = (list, name = "parts") => {
  const g = mergeGeometries(list);
  if (!g) throw new Error(`pr-topograph-432 world: merge failed for ${name}`);
  return g;
};
