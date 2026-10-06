// lightning: a thin branching bolt between two 2D points, a displaced filament plus a soft glow (additive; scale the colour to dim it).
//   bolt2(p, a, b, seed, col): a the top, b the strike; it branches below 55% of the length
export default {
  name: "lightning", doc: "a thin branching bolt between two points: displaced filament plus soft glow, additive",
  deps: ["noise"],
  glsl: /* glsl */ `
  vec3 bolt2(vec2 p, vec2 a, vec2 b, float seed, vec3 col) {
    float u = (p.y - a.y) / (b.y - a.y);
    if (u < 0.0 || u > 1.0) return vec3(0.0);
    float x = mix(a.x, b.x, u) + (fbm(vec2(u * 9.0, seed)) - 0.5) * 0.06 + (vn(vec2(u * 60.0, seed)) - 0.5) * 0.012 + (vn(vec2(u * 180.0, seed)) - 0.5) * 0.004;
    float d = abs(p.x - x);
    float br = step(0.55, u) * abs(p.x - (x + (u - 0.55) * 0.25 + (vn(vec2(u * 50.0, seed + 3.0)) - 0.5) * 0.01));
    float e = min(d, u > 0.55 ? br : 9.0);
    return col * ((1.0 - smoothstep(0.0005, 0.0016, e)) * 1.6 + exp(-e / 0.006) * 0.25 * (1.0 - u * 0.5));
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return vec3(0.01, 0.0, 0.02) + bolt2(p * 0.5, vec2(0.33, 0.48), vec2(0.38, 0.03), floor(t * 8.0), vec3(1.0, 0.35, 0.5)) * 0.6; }`,
};
