// WORLD shared bits for p-aether-lang: timeline, cue helpers, palette, GLSL snippets. Local to this folder (promote later).
// Rig frame: the seal's feet at the rig origin (the rig group sits at seal.at); the core is at CORE in that frame (bible 3, world.js:20).
import { AddEquation, CustomBlending, OneFactor, SrcAlphaFactor, ZeroFactor } from "three";

export const CORE = [0, 1.7, -15];
export const SHELL_R = 140;

// bible timeline (s). A direction cue of the same name overrides the fallback time: see startOf().
export const TL = { bloom: 1.45, bloomEnd: 2.15, floodA: 1.45, floodB: 6.6, freeze: 8.6, ringA: 8.7, ringB: 9.5, still: 10.4, collide: 17.8, purple: 17.9, voidEnd: 19.5, clearEnd: 20.2 };

// start time of a named cue beat (cue.t - cue.since), or the bible fallback when the scene has no such beat
export function startOf(cue, name, fb) { const s = cue.since(name); return Number.isFinite(s) ? cue.t - s : fb; }

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export { sm as smooth };

// the flow clock: runs at 1 until the freeze, brakes over 0.3 s, then stays still.
//   speed(u) = 1 - smoothstep(u), u = (t - (f - 0.3)) / 0.3;  flow = (f-0.3) + 0.3 * INT_0^u speed = (f-0.3) + 0.3 (u - (u^3 - u^4/2))
export function flowAt(t, f = TL.freeze) {
  const a = f - 0.3, u = Math.min(1, Math.max(0, (t - a) / 0.3));
  return t < a ? t : a + 0.3 * (u - (u * u * u - u * u * u * u * 0.5));
}

// the void's presence: it opens with the bloom bubble (the camera is inside it by ~1.65 s) and is gone at the return (19.5 s).
export function presence(t, delay = 0.2, voidEnd = TL.voidEnd) { return sm((t - TL.bloom - delay) / 0.5) * (1 - sm((t - (voidEnd - 0.5)) / 0.5)); }

// sRGB hex -> GLSL literal kept in sRGB (the shaders write pow(c, 2.2) like the kit's)
export const hxArr = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
export const hx = (h) => `vec3(${hxArr(h).map((v) => v.toFixed(4)).join(", ")})`;
export const u = (v) => ({ value: v });
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// additive light that leaves the target's alpha alone (the post stack reads it)
export const ADD = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: SrcAlphaFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor };

// palette (bible 2 and 3): all sRGB
export const PAL = { black: "#030208", ink: "#07051f", indigo: "#0f0a36", violet: "#4d26b3", orchid: "#9942c2", wisp: "#6190ff", white: "#ede0ff", lilac: "#a98cff", ring: "#d9b8ff", edge: "#7a5cff", shard: "#04030a" };

export const NOISE = /* glsl */ `
  float sq(float x) { return x * x; }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
  float ridged(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(2.0 * vnoise(p) - 1.0)); p *= 2.03; a *= 0.5; } return s; }
  // 4-point sparkle (astroid): < 1 inside. s = |x|^0.6 + |y|^0.6
  float star4(vec2 p) { return pow(abs(p.x) + 1e-4, 0.6) + pow(abs(p.y) + 1e-4, 0.6); }`;

// every fragment ends through this: finite, capped at 1.4 (the seal is never milky), pow 2.2
export const OUT = /* glsl */ `
  void emit(vec3 srgb, float a) {
    gl_FragColor = vec4(pow(max(srgb, vec3(0.0)), vec3(2.2)), a);
    if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
    gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
  }`;

// SEAL GUARD (vertex): fades anything that sits between the lens and the seal and would cover it.
//   chest c in clip space; r_ndc = P11 * 0.9 / c.w (a 0.9 m radius); front = vertex nearer than the chest;
//   guard = 1 - front * (1 - smoothstep(1.0, 1.8, |ndc - c_ndc|_aspect / r_ndc))
export const GUARD_V = /* glsl */ `
  uniform vec3 uSeal; uniform vec2 uRes; uniform float uSealS;
  float sealGuard(vec4 clip) {
    vec4 c = projectionMatrix * viewMatrix * vec4(uSeal, 1.0);
    if (c.w < 0.01 || clip.w < 0.01) return 1.0;
    float r = projectionMatrix[1][1] * 0.9 * uSealS / c.w;
    vec2 d = (clip.xy / clip.w - c.xy / c.w) * vec2(uRes.x / uRes.y, 1.0);
    float front = step(clip.w, c.w);
    return 1.0 - front * (1.0 - smoothstep(1.0, 1.8, length(d) / r));
  }`;
