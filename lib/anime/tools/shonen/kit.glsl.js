// Shonen kit: Toei and Bones ink floor, 0.92 luma cap, hard fills, twos clock, seeded hash and fbm shared by every sho shader.
export const KIT_GLSL = /* glsl */ `
uniform float uShoSeed;
const vec3 SHO_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 SHO_INK = vec3(0.039, 0.039, 0.118);
const vec3 SHO_COAT = vec3(0.525, 0.667, 0.839);
const vec3 SHO_BLUE = vec3(0.659, 0.847, 1.0);
const vec3 SHO_GOLD = vec3(1.0, 0.824, 0.235);
const vec3 SHO_FIRE = vec3(1.0, 0.541, 0.122);

float shoLuma(vec3 c) { return dot(max(c, vec3(0.0)), SHO_LUMA); }
vec3 shoOut(vec3 c) {
  c *= min(1.0, 0.92 / max(shoLuma(c), 1e-4));
  return mix(SHO_INK, c, smoothstep(0.035, 0.08, shoLuma(c)));
}
float shoAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float shoFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float shoLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float shoH21(vec2 p) { p = fract(p * vec2(127.1, 311.7) + uShoSeed * 0.137); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float shoVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(shoH21(i), shoH21(i + vec2(1.0, 0.0)), f.x), mix(shoH21(i + vec2(0.0, 1.0)), shoH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float shoFbm(vec2 p) { return shoVn(p) * 0.5 + shoVn(p * 2.03 + 1.7) * 0.3 + shoVn(p * 4.1 + 5.3) * 0.2; }
float shoTwos(float t) { return floor(t * 12.0 + 1e-5) / 12.0; }
vec3 shoDemoBg(vec2 p) { return mix(SHO_INK * 2.6, SHO_INK * 1.4, shoAA(p.y, 0.5)); }
`;
export const shoKit = {
  name: "shoKit",
  doc: "Shonen shared law: ink #0a0a1e floor, 0.92 luma cap, hard fills, twos clock, seeded hash and fbm; every sho shader needs it",
  draws: "nothing on screen by itself; it supplies the Toei and Bones ink colour, luma cap, hard-edge fills, the 12 fps clock and seeded noise",
  use: "noise", suits: ["pr-nemo-relay-481", "pr-openxla-46539"],
  params: "uShoSeed: integer-valued seed that shifts every hash and noise",
  family: "shonen", glsl: KIT_GLSL,
  uniforms: () => ({ uShoSeed: { value: 7 } }),
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { float n = shoFbm(p * 6.0); return shoOut(mix(SHO_INK * 1.5, SHO_COAT, shoAA(n, 0.5))); }`,
};
