// puffs: cumulus / cumulonimbus / smoke masses as a union of spheres seen from the front; per-pixel normal and coverage, so a sky shades real billows.
//   puffBanks(seed, banks, extra, max) builds the puffs on the CPU from banks [x0, x1, base y, peak y, columns, depth, root radius];
//   puffUniforms(P) -> { uPuff[96], uN }; GLSL puffs(p, erode) -> vec4(normal xyz, coverage w)
import { Vector4 } from "three";

export function puffBanks(seed, banks, extra = 0, max = 96) {
  let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = [];
  for (const [a0, a1, base, peak, cols, z0, r0 = 0.06] of banks) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols, x = a0 + (a1 - a0) * u, H = peak * (0.35 + 0.65 * Math.sin(Math.PI * u)) * (0.7 + 0.6 * R());
      let y = base, r = r0 + r0 * 0.6 * R();
      for (let k = 0; k < 8 && y < base + H && P.length < max; k++) { P.push([x + (R() - 0.5) * r0, y, r, z0 + (1 - (y - base) / Math.max(H, 0.01)) * r0 + R() * r0 * 0.3]); y += r * 0.8; r *= 0.9; }
    }
  }
  for (let i = 0; i < extra && P.length < max; i++) P.push([-0.6 + 1.2 * R(), 0.3 + 0.2 * R(), 0.025 + 0.02 * R(), 0.2]);
  return P;
}
export const puffUniforms = (P) => ({ uPuff: { value: Array.from({ length: 96 }, (_, i) => new Vector4(...(P[i] ?? [0, 0, 0, 0]))) }, uN: { value: P.length } });

export default {
  name: "puffs", doc: "cumulus masses as a union of spheres seen from the front: per-pixel normal and coverage for billow shading",
  deps: ["noise"],
  uniforms: (o = {}) => puffUniforms(o.puffs ?? puffBanks(7, [[0.15, 1.3, 0.08, 0.7, 7, 0.1, 0.1]])),
  glsl: /* glsl */ `
  uniform vec4 uPuff[96]; uniform float uN;
  vec4 puffs(vec2 p, float erode) {
    vec2 pe = p + (vec2(fbm(p * 38.0), fbm(p * 38.0 + 7.0)) - 0.5) * erode;
    float bz = -1.0; vec3 bn = vec3(0.0);
    for (int i = 0; i < 96; i++) { if (float(i) >= uN) break; vec4 P = uPuff[i]; vec2 q = pe - P.xy;
      float r = P.z * (1.0 + 0.1 * (vn(vec2(atan(q.y, q.x) * 2.5, float(i) * 3.7)) - 0.5));
      float r2 = dot(q, q) / (r * r);
      if (r2 < 1.0) { float z = P.w + sqrt(1.0 - r2) * r; if (z > bz) { bz = z; bn = normalize(vec3(q / r, sqrt(1.0 - r2))); } } }
    return bz > -0.5 ? vec4(bn, smoothstep(0.0, 0.12, bn.z)) : vec4(0.0);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec4 f = puffs(p, 0.02); vec3 L = normalize(vec3(-0.5, 0.7, 0.55));
    float lam = dot(f.xyz, L); vec3 c = mix(vec3(0.45, 0.55, 0.85), vec3(1.0, 0.98, 0.94), smoothstep(0.1, 0.4, lam));
    return mix(mix(vec3(0.6, 0.78, 0.95), vec3(0.1, 0.25, 0.7), p.y), c, f.w); }`,
};
