// glow: local glow lights (light slits, lanterns, cursed fire) that wash nearby surfaces through their texture, composited as colour dodge.
//   glowFall(P, N, G) -> 0..1: G = (position xyz, radius w); Gaussian falloff with a wrap-around facing term
//   glowDodge(col, glowCol, amount) -> colour dodge of the glow onto the surface (needs blend)
export default {
  name: "glow", doc: "local glow lights that wash nearby surfaces through their texture, composited as colour dodge",
  deps: ["blend"],
  glsl: /* glsl */ `
  float glowFall(vec3 P, vec3 N, vec4 G) { if (G.w <= 0.0) return 0.0; vec3 d = G.xyz - P; float r = length(d);
    return exp(-r * r / (G.w * G.w)) * (0.35 + 0.65 * max(dot(N, d / max(r, 1e-4)), 0.0)); }
  vec3 glowDodge(vec3 col, vec3 glowCol, float amount) { return bDodge(col, clamp(glowCol * amount, 0.0, 0.97)) + glowCol * amount * 0.15; }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 P = vec3(p * 10.0, 0.0), N = vec3(0.0, 0.0, 1.0);
    vec3 wall = vec3(0.04, 0.16, 0.16) * (0.6 + 0.8 * fract(sin(dot(floor(p * 40.0), vec2(12.9, 78.2))) * 43758.5));
    float g = glowFall(P, N, vec4(7.2, 5.0, 1.0, 3.0));
    return glowDodge(wall, vec3(0.37, 0.84, 1.0), g); }`,
};
