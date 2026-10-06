// stones: varied, grounded rocks (never floating pebbles): each is a lumpy icosphere with a cut base, a flattened
// sunlit top plane, its own aspect and yaw, sunk into the ground; plus the painted stone material.
//   stone({ size: [x, y, z] m, at: [x, y, z], seed, flat 0..1 (top plane), sink 0..1 (fraction buried), yaw }) -> geometry
//     with aH (0 base .. 1 crown) for contact shading; detail 1 gives chunky planes, 3 smooth boulders
//   stones(list, facet 0..1) -> one merged geometry; facet blends the welded smooth normal toward the flat face normal (cut planes)
//   stoneMaterial(shared, palette) palette (hex): { top, light, mid, shadow, crack, bounce }, plus { mottle, crack: width }
import { BufferAttribute, IcosahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../kit3d.js";
import { surface } from "./surface.js";
import { smoothNormals } from "./inkline.js";
import { V } from "../paint.js";

const lump = (x, y, z, s) => Math.sin(x * 2.1 + s) * Math.sin(y * 2.7 + s * 1.3) * Math.sin(z * 2.3 + s * 0.7);
export function stone({ size = [1, 0.6, 0.8], at = [0, 0, 0], seed = 1, flat = 0.4, sink = 0.25, yaw, detail = 3 }) {
  const R = rng(seed * 131 + 7), g = new IcosahedronGeometry(1, detail), P = g.attributes.position, s = seed * 1.7;
  const yw = yaw ?? R() * 6.283, cy = Math.cos(yw), sy = Math.sin(yw), cut = -1 + 2 * sink, topY = 1 - flat * 0.55;
  const H = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = 1 + 0.22 * lump(x, y, z, s) + 0.09 * lump(x * 2.3, y * 2.1, z * 2.6, s + 4);
    x *= k; y *= k; z *= k;
    if (y > topY) y = topY + (y - topY) * 0.25;                 // the sunlit top plane
    y = Math.max(y, cut);                                     // the cut base sits in the ground
    H[i] = (y - cut) / (topY - cut + 1e-3);
    const X = x * size[0], Z = z * size[2];
    P.setXYZ(i, at[0] + X * cy - Z * sy, at[1] + (y - cut) * size[1] * 0.5, at[2] + X * sy + Z * cy);
  }
  g.deleteAttribute("uv"); g.computeVertexNormals();
  g.setAttribute("aH", new BufferAttribute(H, 1));
  return g;
}
// smooth shading: normals welded across the icosphere's split vertices (the hull reuses them)
// occluderList(list) -> [[x, y, z, r]] sphere stand-ins for blobshadow (tools/blobshadow.js)
export const occluderList = (list) => list.map(({ size, at, sink = 0.25 }) => [at[0], at[1] + size[1] * 0.35, at[2], Math.max(size[0], size[2]) * 0.8]);
export const stones = (list, facet = 0) => {
  const m = mergeGeometries(list.map(stone)); smoothNormals(m);
  const N = m.attributes.normal, S = m.attributes.aSmooth;
  for (let i = 0; i < N.count; i++) { const x = S.getX(i) + (N.getX(i) - S.getX(i)) * facet, y = S.getY(i) + (N.getY(i) - S.getY(i)) * facet, z = S.getZ(i) + (N.getZ(i) - S.getZ(i)) * facet, l = Math.hypot(x, y, z) || 1; N.setXYZ(i, x / l, y / l, z / l); }
  return m;
};

export function stoneMaterial(shared, pal = {}) {
  const p = { top: "#ffe0c4", light: "#f2dfe2", mid: "#c9b6d8", shadow: "#9486b8", crack: "#7a5a6e", bounce: "#8a9a50", ...pal };
  return surface(shared, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec3 L = normalize(uLightDir);
      float m = fbm(P.xz * 3.1 + P.y * 2.0), m2 = fbm(P.xy * 7.0 + P.z * 5.0);
      float lam = dot(N, L) * 0.5 + 0.5 + (m - 0.5) * 0.3 + (m2 - 0.5) * 0.12;
      lam *= mix(0.55, 1.0, smoothstep(0.0, 0.35, vAh));                                // occluded toward the ground
      vec3 c = mix(${V(p.shadow)}, ${V(p.mid)}, smoothstep(0.4, 0.44, lam));         // values in a few hard-edged groups
      c = mix(c, ${V(p.light)}, smoothstep(0.6, 0.64, lam));
      c = mix(c, ${V(p.top)}, smoothstep(0.7, 0.76, N.y + (m - 0.5) * 0.35) * smoothstep(0.5, 0.56, lam));
      c *= 0.94 + 0.12 * fbm(P.xz * 18.0 + P.y * 9.0);                             // brush grain
      vec2 vv = vor(vec2(P.x + P.z * 0.7, P.y) * ${(pal.crackScale ?? 2.4).toFixed(2)});
      c = mix(c, ${V(p.crack)}, (1.0 - smoothstep(0.0, 0.04, vv.y)) * 0.45 * step(0.5, h21(floor(P.xz * 2.0))));
      c = mix(c, ${V(p.bounce)} * 0.8, (1.0 - smoothstep(0.0, 0.22, vAh)) * 0.55);    // grass bounce and contact at the base
      return c;
    }`, { varyings: "varying float vAh;", attrs: "attribute float aH; varying float vAh;", vert: "vAh = aH;", id: pal.id ?? 0.5 });
}

export default { name: "stones", doc: "varied grounded rocks (cut base, flat sunlit top, yaw, sink) and the painted stone material" };
