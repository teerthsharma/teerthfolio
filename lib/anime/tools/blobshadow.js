// blobshadow: soft cast shadows from up to 48 sphere occluders along the key light, for painted ground that has no
// shadow map (stones cast a lavender shadow shape onto the grass beside them, the way a BG painter grounds a rock).
//   uniforms: uOcc[48] (centre xyz, radius w, metres), uOccN; blobShadow(P, L) -> 0 lit .. 1 fully shadowed
//   occluders(list) -> uniforms; list items [x, y, z, r]
import { Vector4 } from "three";
export const occluders = (list) => ({ uOcc: { value: Array.from({ length: 48 }, (_, i) => new Vector4(...(list[i] ?? [0, -999, 0, 0]))) }, uOccN: { value: Math.min(48, list.length) } });
export default {
  name: "blobshadow", doc: "soft cast shadows from sphere occluders along the light, for painted ground without a shadow map",
  uniforms: (o = {}) => occluders(o.list ?? [[0.72, 0.5, 0.0, 0.25]]),
  glsl: /* glsl */ `
  uniform vec4 uOcc[48]; uniform float uOccN;
  float blobShadow(vec3 P, vec3 L) {
    float s = 0.0;
    for (int i = 0; i < 48; i++) { if (float(i) >= uOccN) break; vec4 o = uOcc[i]; vec3 d = o.xyz - P;
      float t = dot(d, L); if (t <= 0.0) continue;
      float e = length(d - L * t) / o.w;                       // ray miss distance in radii
      s = max(s, 1.0 - smoothstep(0.75, 1.05, e)); }
    return s;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 P = vec3(p.x, 0.0, p.y); vec3 L = normalize(vec3(-0.6 + 0.3 * sin(t), 0.6, 0.2));
    float sh = blobShadow(vec3(p.x, 0.0, p.y - 0.5) + vec3(0.0, 0.0, 0.0), L);
    float body = 1.0 - smoothstep(0.24, 0.25, length(vec2(p.x - 0.72, p.y - 0.5)));
    return mix(mix(vec3(0.55, 0.62, 0.3), vec3(0.42, 0.36, 0.55), sh), vec3(0.95, 0.85, 0.8), body); }`,
};
