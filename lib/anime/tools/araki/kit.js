// arakiKit: shared palette, luma cap with ink-floor lift, anti-aliased edges, hashes and a flat demo plate for every araki tool.
export const arakiKit = {
  name: "arakiKit",
  family: "araki",
  doc: "araki helpers: studio palette, arkCap luma cap 0.92 with ink floor, hard-edge AA, hue rotation, segment distance, demo plate",
  deps: [],
  draws: "A shared helper with no picture of its own; the other araki tools call it.",
  use: "noise",
  suits: "p-separatrix, pr-tensorflow-124410",
  params: "no uniforms; constants ARK_INK, ARK_PLASTER, ARK_GOLD, ARK_SINOPIA, ARK_ORANGE",
  uniforms: () => ({}),
  glsl: `
const vec3 ARK_INK = vec3(0.071, 0.047, 0.051);
const vec3 ARK_PLASTER = vec3(0.957, 0.910, 0.784);
const vec3 ARK_GOLD = vec3(0.851, 0.643, 0.255);
const vec3 ARK_SINOPIA = vec3(0.702, 0.071, 0.165);
const vec3 ARK_ORANGE = vec3(0.812, 0.412, 0.016);
const vec3 ARK_W = vec3(0.2126, 0.7152, 0.0722);
float arkLuma(vec3 c) { return dot(max(c, 0.0), ARK_W); }
vec3 arkCap(vec3 c) {
  float L = arkLuma(c);
  c *= min(1.0, 0.92 / max(L, 1e-4));
  return mix(ARK_INK, c, smoothstep(0.035, 0.08, arkLuma(c)));
}
float arkAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float arkFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float arkLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float arkH21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float arkVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(arkH21(i), arkH21(i + vec2(1.0, 0.0)), f.x), mix(arkH21(i + vec2(0.0, 1.0)), arkH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float arkFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * arkVn(p); p *= 2.03; a *= 0.5; } return s; }
float arkSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
vec3 arkHue(vec3 c, float a) {
  vec3 k = vec3(0.57735);
  return c * cos(a) + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - cos(a));
}
vec3 arkDemoPlate(vec2 p) {
  vec3 sky = mix(mix(vec3(1.0, 0.541, 0.227), vec3(0.851, 0.294, 0.816), arkAA(p.y, 0.38)), vec3(0.753, 0.149, 0.827), arkAA(p.y, 0.66));
  vec3 slab = mix(vec3(0.349, 0.282, 0.212), vec3(0.490, 0.404, 0.314), arkAA(sin(p.x * 14.0), 0.0));
  vec3 c = mix(sky, slab, 1.0 - arkAA(p.y, 0.30));
  return mix(c, vec3(0.953, 0.722, 0.188), arkFill(length(p - vec2(0.8, 0.52)) - 0.13));
}
`,
};
