// grunge: multi-scale mottled stain (concrete, plaster, weathered stone) with pits and run-down streaks, no tiling; 2D and 3D (world-space) forms.
//   grunge2(p, contrast, streak) / grunge3(P, contrast, streak) -> value multiplier around 1 (P already scaled by the caller)
export default {
  name: "grunge", doc: "multi-scale mottled stain with pits and run-down streaks (concrete, plaster); value multiplier, 2D and 3D",
  glsl: /* glsl */ `
  float gHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float gNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(gHash(i), gHash(i + vec3(1, 0, 0)), f.x), mix(gHash(i + vec3(0, 1, 0)), gHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(gHash(i + vec3(0, 0, 1)), gHash(i + vec3(1, 0, 1)), f.x), mix(gHash(i + vec3(0, 1, 1)), gHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  float grunge3(vec3 Q, float contrast, float streak) {
    float m = 0.5 * gNoise(Q * 0.25) + 0.3 * gNoise(Q * 0.8 + 3.0) + 0.14 * gNoise(Q * 2.6 + 7.0) + 0.06 * gNoise(Q * 9.0);
    float blot = smoothstep(0.42, 0.72, m), pit = gNoise(Q * 21.0);
    float run = gNoise(vec3(Q.x * 3.0, Q.y * 0.25, Q.z * 3.0));
    return max(0.05, mix(1.0, 0.25 + 1.5 * blot, contrast) * (0.8 + 0.4 * pit) * (1.0 - streak * smoothstep(0.5, 0.85, run)));
  }
  float grunge2(vec2 p, float contrast, float streak) { return grunge3(vec3(p, 0.37), contrast, streak); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return vec3(0.05, 0.25, 0.25) * grunge2(p * 8.0, 0.9, 0.4); }`,
};
