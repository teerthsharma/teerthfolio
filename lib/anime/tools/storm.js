// storm: boiling storm-cloud density, a 2D light march through it, cauliflower billow normals and rim-lit light pockets, in (azimuth, elevation) or any 2D plane.
//   uniforms: uStormScale (1) feature size, uStormAspect (1.5, 2.6) stretch
//   stormDens(p) 0..1, stormDensB(p, bias) with a coverage bias; rimBand(p, d, L, r, w) cel rim width facing L; stormLight(p, L) transmittance from L; cauli(q) Worley dome height; billowN(p, d) normal (z to viewer);
//   pocket(p, n, L, r): the light a pocket at L (falloff r) puts on billows facing it, so light lands on rims only
import { Vector2 } from "three";
export default {
  name: "storm", doc: "storm-cloud density, light march, cauliflower billow normals and rim-lit light pockets",
  deps: ["noise"],
  uniforms: (o = {}) => ({ uStormScale: { value: o.scale ?? 1 }, uStormAspect: { value: new Vector2(...(o.aspect ?? [1.5, 2.6])) } }),
  glsl: /* glsl */ `
  uniform float uStormScale; uniform vec2 uStormAspect;
  float stormDensB(vec2 p, float bias) { vec2 q = warp(p * uStormAspect * uStormScale + 2.0, 0.7);
    float d = fbm(q) + 0.4 * ridged(q * 2.2) - 0.24 + 0.06 * (vn(q * 12.0) - 0.5) + bias;
    return smoothstep(0.44, 0.6, d); }
  float stormDens(vec2 p) { return stormDensB(p, 0.0); }
  // cel rim (MAPPA): a flat band inside the silhouette on the side facing a light at L, width w; 0..1 field to threshold
  float rimBand(vec2 p, float d, vec2 L, float r, float w) { float e = 0.003;
    vec2 g = vec2(stormDens(p + vec2(e, 0.0)) - d, stormDens(p + vec2(0.0, e)) - d);
    float face = max(dot(-normalize(g + 1e-6), normalize(L - p)), 0.0) * step(1e-5, length(g));
    return exp(-length(p - L) / r) * sqrt(face) * w; }
  float stormLight(vec2 p, vec2 L) { vec2 dir = L - p; float len = length(dir); dir /= max(len, 1e-4);
    float acc = 0.0; for (int i = 1; i <= 8; i++) acc += stormDens(p + dir * min(float(i) * 0.03 / uStormScale, len)); return exp(-acc * 0.2); }
  float cauli(vec2 q) { float h = 0.0, a = 1.0; for (int i = 0; i < 3; i++) { vec2 v = vor(q); h += a * sqrt(max(0.0, 1.0 - v.x * v.x * 1.3)); q = q * 2.13 + 5.1; a *= 0.42; } return h; }
  vec3 billowN(vec2 p, float d) { float e = 0.003; vec2 q = warp(p * 2.0, 0.6) * 3.2;
    vec2 g1 = vec2(stormDens(p + vec2(e, 0.0)) - d, stormDens(p + vec2(0.0, e)) - d) / e;
    float f = cauli(q), k = 0.02; vec2 g2 = vec2(cauli(q + vec2(k, 0.0)) - f, cauli(q + vec2(0.0, k)) - f) / k;
    return normalize(vec3(-g1 * 0.014 - g2 * 0.45, 1.0)); }
  float pocket(vec2 p, vec3 n, vec2 L, float r) { vec3 dir = normalize(vec3(L - p, 0.06)); float nd = max(dot(n, dir), 0.0);
    return stormLight(p, L) * exp(-length(p - L) / r) * (0.04 + 1.6 * nd * nd * nd); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { // a black storm with one pocket lit from inside: red only on the rims
    p *= 0.6; float d = stormDens(p); vec3 n = billowN(p, d);
    float lit = pocket(p, n, vec2(0.45, 0.35), 0.12) * 3.0;
    vec3 c = mix(vec3(0.004, 0.0, 0.001), mix(vec3(0.3, 0.01, 0.04), vec3(1.0, 0.5, 0.55), smoothstep(0.8, 1.5, lit)), smoothstep(0.2, 0.9, lit));
    return mix(vec3(0.02, 0.0, 0.005), c, d); }`,
};
