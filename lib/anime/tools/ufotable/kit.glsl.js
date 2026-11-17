// ufotable kit: Fate/Zero compositing palette, luma cap, ink floor, hold on twos, seeded hash and noise.
import { H, FAMILY, U, DECL } from "./define.js";

const UNI = { uUfoSeed: 3 };
const P = { ink: "#1a0e16", gold: "#fadf92", core: "#fdfbe4", nightTop: "#172e88", nightLow: "#312126", rim: "#4085e8", cyan: "#76d8d6", bolt: "#bffef8", purple: "#8a5aff",
  steelMid: "#3a4560", steelLit: "#e8f0ff", steelDeep: "#0e1220", red: "#d33d49", redHot: "#d3122e", orange: "#ed9257", sandHi: "#f7f698", sand: "#f3e07f", sandSh: "#e9be65" };

export const KIT_GLSL = `${DECL(UNI)}
${Object.entries(P).map(([k, v]) => `const vec3 UFO_${k.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()} = ${H(v)};`).join("\n")}
float ufoLuma(vec3 c) { return dot(max(c, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722)); }
vec3 ufoOut(vec3 c) { c = max(c, UFO_INK); return max(c * min(1.0, 0.92 / max(ufoLuma(c), 1e-4)), UFO_INK); }
float ufoAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
float ufoFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float ufoStroke(float d, float px) { float w = fwidth(d) + 1e-6; return 1.0 - smoothstep(px * w * 0.5, px * w * 0.5 + w, abs(d)); }
float ufoHold(float t, float fps) { return floor(t * fps + 1e-4) / fps; }
float ufoH(vec2 p) { p = fract(p * vec2(127.1, 311.7) + uUfoSeed * 0.137); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float ufoVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ufoH(i), ufoH(i + vec2(1.0, 0.0)), f.x), mix(ufoH(i + vec2(0.0, 1.0)), ufoH(i + vec2(1.0, 1.0)), f.x), f.y);
}
float ufoFbm(vec2 p) { return ufoVn(p) * 0.55 + ufoVn(p * 2.07 + 1.3) * 0.30 + ufoVn(p * 4.13 + 4.1) * 0.15; }
vec3 ufoSphN(vec2 q) { return normalize(vec3(q, sqrt(max(0.0, 1.0 - dot(q, q))) + 1e-3)); }`;

export const ufoKit = {
  name: "ufoKit", family: FAMILY, deps: [],
  doc: "ufotable kit: Fate/Zero palette constants, 0.92 luma cap with ink floor (ufoOut), AA helpers, hold on twos, seeded hash and fbm",
  draws: "A noise-checkered night-blue and gold test pattern under the ink floor and the 0.92 luma cap.",
  use: "noise", suits: "pr-highway-3244, pr-polychrom-79",
  params: "uUfoSeed: integer seed for every ufo hash; p: aspect-corrected uv, y up; t: seconds, held to 12 fps by ufoHold.",
  glsl: KIT_GLSL, uniforms: U(UNI),
  demo: `vec3 demo(vec2 p, float t) { return ufoOut(mix(UFO_NIGHT_TOP, UFO_GOLD, ufoAA(ufoH(floor(p * 12.0)), 0.5)) * (0.6 + 0.4 * ufoFbm(p * 3.0))); }`,
};
