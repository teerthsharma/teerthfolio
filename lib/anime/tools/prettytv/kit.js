// ptvKit: shared helpers of the pretty-TV family: ink floor, luma cap 0.92, AA edges, banding, hashes, hue-shifted shade and light.
export const ptvKit = {
  name: "ptvKit",
  family: "prettytv",
  doc: "pretty-TV helpers: ptvCap luma cap 0.92 with ink floor, fwidth edges, ptvPost banding, held hashes, cool shade and warm light",
  deps: [],
  draws: "A shared helper with no picture of its own; the other prettytv tools call it.",
  use: "noise",
  suits: "spawn-seal, the-loop, p-asmodeus, p-planimeter, home, p-monodromy, p-caustic",
  params: "uPtvSeed shifts every hash; constants PTV_INK, PTV_PAPER",
  uniforms: () => ({ uPtvSeed: { value: 0 } }),
  glsl: `
uniform float uPtvSeed;
const vec3 PTV_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 PTV_INK = vec3(0.075, 0.055, 0.090);
const vec3 PTV_PAPER = vec3(0.90, 0.86, 0.80);
float ptvLuma(vec3 c) { return dot(max(c, vec3(0.0)), PTV_LUMA); }
vec3 ptvCap(vec3 c) { float L = ptvLuma(c); c *= min(1.0, 0.92 / max(L, 1e-4)); return max(c, PTV_INK); }
float ptvAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float ptvFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float ptvLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.9), abs(d)); }
float ptvH21(vec2 p) { p = fract(p * vec2(123.34, 456.21) + uPtvSeed * 0.013); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float ptvVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ptvH21(i), ptvH21(i + vec2(1.0, 0.0)), f.x), mix(ptvH21(i + vec2(0.0, 1.0)), ptvH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float ptvFbm(vec2 p) { return ptvVn(p) * 0.55 + ptvVn(p * 2.07 + 1.3) * 0.30 + ptvVn(p * 4.13 + 4.1) * 0.15; }
float ptvHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1e-4); }
float ptvPost(float x, float n) {
  float acc = 0.0;
  for (int i = 1; i < 8; i++) { float k = float(i); acc += step(k, n - 0.5) * ptvAA(x, k / n); }
  return acc / max(n - 1.0, 1.0);
}
float ptvEll(vec2 p, vec2 c, vec2 r) { return length((p - c) / max(r, vec2(1e-4))) - 1.0; }
float ptvBox(vec2 p, vec2 c, vec2 b) { vec2 d = abs(p - c) - b; return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0); }
vec3 ptvCool(vec3 c, float k) { return mix(c, vec3(c.r * 0.68, c.g * 0.78, min(c.b * 1.05 + 0.06, 1.0)), k); }
vec3 ptvWarm(vec3 c, float k) { return mix(c, vec3(min(c.r * 1.07 + 0.05, 1.0), c.g * 1.03 + 0.03, c.b * 0.86), k); }
`,
};
