// jcsKit: shared J.C.Staff vocabulary (palette, luma cap, fills, hashes, two-tone cel step, tapered capsule).
import { defineModule } from "./define.js";

const hx = (s) => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(", "); };
const PAL = {
  INK: "#0e0d0e", LINE: "#6d592c", SKY_B0: "#dfeaf7", SKY_B1: "#bcd6f2", SKY_B2: "#96bfec", SKY_B3: "#78a8e0",
  CLOUD: "#f2f6fb", CLOUD_S: "#b4c6e0", ARC: "#c8ebff", ARC_W: "#f4f8ff", RIM: "#c8d4e4",
  COAT: "#86aad6", FLANK: "#d3e2f1", BELLY: "#f8eee0", TIP: "#5a7aa8", PAD: "#f0d9bd", FRECKLE: "#76614f", NOSE: "#2a2326",
  GL_LIT: "#96accd", GL_MID: "#5f7ba5", GL_SHADE: "#3e567a", BR_ROOF: "#8896b4", DEEP: "#2b3550",
  GLOW_O: "#ffa927", CORE: "#fff2d0", SMOKE_L: "#c8d0d8", SMOKE_S: "#9aa4b4",
  SCLERA: "#e4e8f2", IRIS: "#5a3626", IRIS_S: "#3a2418", PUPIL: "#1a1210", CATCH: "#f4f6fa",
  TONE_SA: "#202935", TONE_HA: "#d8d5d6", TONE_SB: "#3d3c47", TONE_HB: "#e6e9eb",
};
const consts = Object.entries(PAL).map(([k, v]) => `const vec3 JCS_${k} = vec3(${hx(v)});`).join("\n");

export const KIT_GLSL = /* glsl */ `
#ifndef JCS_KIT
#define JCS_KIT
uniform float uJcsSeed;
uniform float uJcsTau;
uniform float uJcsW;
const vec3 JCS_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 JCS_SHADE = vec3(0.70, 0.75, 0.88);
const vec3 JCS_KEY = vec3(0.505, 0.808, 0.303);
${consts}
float jcsLuma(vec3 c) { return dot(max(c, vec3(0.0)), JCS_LUMA); }
vec3 jcsOut(vec3 c) { c = max(c, JCS_INK); return c * min(1.0, 0.92 / max(jcsLuma(c), 1e-4)); }
float jcsAA(float v, float e) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(e - w, e + w, v); }
float jcsFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float jcsLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float jcsH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float jcsVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(jcsH21(i), jcsH21(i + vec2(1.0, 0.0)), f.x), mix(jcsH21(i + vec2(0.0, 1.0)), jcsH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float jcsHold(float t, float fps) { return floor(t * fps + 1e-5) / fps; }
float jcsEll(vec2 q, vec2 r) { return (length(q / r) - 1.0) * min(r.x, r.y); }
float jcsTaper(vec2 p, vec2 a, vec2 b, float r0, float r1) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  return length(pa - ba * h) - mix(r0, r1, h);
}
vec3 jcsNormal(vec2 q) { return vec3(q, sqrt(max(1.0 - dot(q, q), 0.0))); }
vec3 jcsCel(float v, float tau, float w, vec3 base) {
  float f = fwidth(v);
  return mix(base * JCS_SHADE, base, smoothstep(tau - w - f, tau + w + f, v));
}
#endif
`;

export const jcsKit = defineModule({
  name: "jcsKit", doc: "J.C.Staff family kit: palette, luma cap 0.92, ink floor, fills, hashes, two-tone cel step with a cool shade shift",
  draws: "A seal-blue sphere in two flat tones, warm key above and a cooler shade below, on a pale blue ground.",
  use: "surface", params: "uJcsSeed reseeds every random pattern; uJcsTau is the cel threshold (-0.18 Railgun, 0.11 Index); uJcsW is its width (0.015).",
  deps: [], uniforms: { uJcsSeed: 0, uJcsTau: -0.18, uJcsW: 0.015 }, glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    vec2 q = (p - vec2(0.89, 0.5)) / 0.34;
    float v = dot(jcsNormal(q), JCS_KEY);
    return jcsOut(mix(JCS_SKY_B1, jcsCel(v, uJcsTau, uJcsW, JCS_COAT), jcsFill(length(q) - 1.0)));
  }`,
});
