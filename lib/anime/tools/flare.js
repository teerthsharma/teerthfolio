// flare: an anamorphic lens flare at a 2D point: horizontal streak, vertical spike, diagonal star, hot core (additive; values above 1 bloom).
//   lensFlare(q) -> intensity, q = p - flare centre (same units as p; tuned for a frame ~1 unit tall)
export default {
  name: "flare", doc: "anamorphic lens flare: streak, spike, star and hot core, additive",
  glsl: /* glsl */ `
  float lensFlare(vec2 q) {
    return exp(-abs(q.y) * 600.0) * exp(-abs(q.x) * 3.5) * 2.0 + exp(-abs(q.x) * 800.0) * exp(-abs(q.y) * 10.0) * 1.2
      + (exp(-abs(q.x + q.y) * 700.0) + exp(-abs(q.x - q.y) * 700.0)) * exp(-length(q) * 25.0) * 0.8 + exp(-length(q) * 90.0) * 6.0; }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(vec3(0.05, 0.15, 0.45), vec3(0.4, 0.65, 0.9), 1.0 - p.y) + vec3(1.0, 0.77, 0.92) * lensFlare((p - vec2(0.72, 0.45)) * 0.5); }`,
};
