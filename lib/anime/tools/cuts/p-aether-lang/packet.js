// p-aether-lang packet shaders: Gojo Unlimited Void and Hollow Purple, one module per look in the build packet (p in frame-height units, y up, 1.6 x 1).
import { Vector2 } from "three";

const F = "p-aether-lang";
const SUITS = [F];
const v3 = (h) => { const n = parseInt(h.slice(1), 16); return `vec3(${[n >> 16, (n >> 8) & 255, n & 255].map((x) => (x / 255).toFixed(4)).join(", ")})`; };
const V = (x, y) => new Vector2(x, y);

const T = (name, doc, o, glsl, demo, uniforms, deps = ["aethKit"]) => ({
  name, doc, family: F, deps, glsl, demo: `vec3 demo(vec2 p, float t) { ${demo} }`, uniforms,
  draws: o.draws, use: o.use, suits: SUITS, params: o.params, quality: "real",
});

export const aethKit = {
  name: "aethKit", family: F, doc: "p-aether-lang shared ink, palette, luma cap, hole centre and seed", deps: [],
  draws: "nothing alone: the ink, blue-grey palette, luma cap and hole position every p-aether-lang shader reads", use: "helper", suits: SUITS,
  params: "uAethHole hole centre, uAethR hole radius, uAethSeed noise seed", quality: "real",
  uniforms: () => ({ uAethHole: { value: V(0.528, 0.45) }, uAethR: { value: 0.26 }, uAethSeed: { value: 3 } }),
  glsl: /* glsl */ `
uniform vec2 uAethHole; uniform float uAethR; uniform float uAethSeed;
const vec3 AETH_INK = ${v3("#0e0c16")};
const vec3 AETH_FAR = ${v3("#141728")};
const vec3 AETH_MID = ${v3("#2a3044")};
const vec3 AETH_NEAR = ${v3("#464e67")};
const vec3 AETH_RING = ${v3("#838ea6")};
const vec3 AETH_WISP = ${v3("#aeb3b9")};
const vec3 AETH_RIMC = ${v3("#dae0e2")};
const vec3 AETH_SPECK = ${v3("#d7dde1")};
const vec3 AETH_WHITE = ${v3("#ebebeb")};
const vec3 AETH_BLUE = ${v3("#2f7dff")};
const vec3 AETH_PURPLE = ${v3("#7b2cbf")};
const vec3 AETH_VIOLET = ${v3("#e94bff")};
float aethLuma(vec3 c) { return dot(max(c, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722)); }
vec3 aethCap(vec3 c) { return c * min(1.0, 0.92 / max(aethLuma(c), 1e-4)); }
float aethAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float aethFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float aethLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float aethH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float aethVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aethH(i), aethH(i + vec2(1.0, 0.0)), f.x), mix(aethH(i + vec2(0.0, 1.0)), aethH(i + vec2(1.0, 1.0)), f.x), f.y);
}
float aethHold(float t, float fps) { return floor(t * fps + 1e-4) / fps; }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return aethCap(mix(AETH_INK, AETH_RING, aethAA(aethVn(p * 6.0), 0.5))); }`,
};

export const aethVoidPlate = T("aethVoidPlate", "Unlimited Void plate: ink hole with thin hot rim, banded halo, blue-grey field keyed by exp(-3d), log-spiral cloud filaments and one cloud mass",
  { use: "plate", draws: "a black disc ringed by a thin pale-silver line and a banded cold halo, wrapped in posterised blue-grey cloud filaments that spiral in, with one cloud mass at upper right", params: "uAethHole hole centre, uAethR hole radius (0 = no hole), uAethField 0 ink only to 1 full field" },
  /* glsl */ `
uniform float uAethField;
vec3 aethVoidPlate(vec2 p, float t) {
  vec2 q = p - uAethHole;
  float r = max(length(q), 1e-3);
  float d = r - uAethR;
  float e = exp(-3.0 * max(d, 0.0));
  vec3 c = mix(AETH_FAR, AETH_MID, aethAA(e, 0.30));
  c = mix(c, AETH_NEAR, aethAA(e, 0.70));
  float a = atan(q.y, q.x) + 1.6 * log(r);
  float f = aethVn(vec2(cos(a), sin(a)) * 1.9 + vec2(log(r) * 3.2 + uAethSeed, 1.7));
  c = mix(c, AETH_RING, aethAA(f, 0.62) * aethAA(e, 0.22) * 0.55);
  c = mix(c, AETH_WISP, aethAA(f, 0.80) * aethAA(e, 0.55) * 0.55);
  vec2 w = (p - vec2(1.28, 0.66)) / vec2(0.15, 0.09);
  float cd = length(w) - 1.0 + (aethVn(p * 11.0 + uAethSeed) - 0.5) * 0.45;
  float lit = aethAA(w.y * 0.6 - w.x * 0.3 + (aethVn(p * 7.0) - 0.5) * 0.8, 0.15);
  c = mix(c, mix(AETH_NEAR, AETH_RING, lit), aethFill(cd * 0.09));
  float g = exp(-max(d, 0.0) / 0.05);
  float gb = aethAA(g, 0.25) * 0.34 + aethAA(g, 0.50) * 0.33 + aethAA(g, 0.75) * 0.33;
  c += AETH_RING * 0.6 * gb * 0.6 * step(0.002, uAethR);
  c = mix(c, AETH_RIMC, aethAA(exp(-(d / 0.006) * (d / 0.006)), 0.45) * step(0.002, uAethR));
  c = mix(c, AETH_INK, aethFill(d));
  return aethCap(mix(AETH_INK, c, uAethField));
}`, "return aethVoidPlate(p, t);",
  () => ({ uAethField: { value: 1 } }));

export const aethSpeckFlood = T("aethSpeckFlood", "speck stream: pale dust converging on the hole at 0.35 H/s, stepped on twos, with a freeze-and-dim clock",
  { use: "plate", draws: "a flood of tiny pale specks streaming radially into the black hole, or a sparse static dust sprinkle when the flow clock is 0", params: "uAethFlow flow clock in seconds (hold it to freeze), uAethDensity 0 to 1 share of specks kept (0.37 is about 200), uAethDim brightness (0.35 when frozen)" },
  /* glsl */ `
uniform float uAethFlow; uniform float uAethDensity; uniform float uAethDim;
vec3 aethSpeckFlood(vec2 p, float t) {
  vec2 q = p - uAethHole;
  float sec = floor((atan(q.y, q.x) + 3.14159265) / 6.2831853 * 180.0);
  float tf = aethHold(uAethFlow, 12.0);
  float tw = floor(t * 12.0 + 1e-4);
  float m = 0.0;
  for (int k = 0; k < 6; k++) {
    vec2 id = vec2(sec, float(k) + uAethSeed * 7.0);
    float keep = step(aethH(id + 3.1), uAethDensity);
    float ang = (sec + 0.2 + 0.6 * aethH(id + 5.7)) / 180.0 * 6.2831853 - 3.14159265;
    float sp = 0.7 + 0.6 * aethH(id + 9.3);
    float ph = fract(aethH(id + 1.3) - tf * 0.35 * sp / 1.25);
    vec2 pos = uAethHole + vec2(cos(ang), sin(ang)) * (uAethR + ph * 1.25);
    float sz = (0.0018 + 0.0022 * aethH(id + 2.2)) * (1.0 + 0.35 * (aethH(id + tw) - 0.5));
    m = max(m, keep * aethFill(length(p - pos) - sz));
  }
  return AETH_SPECK * m * uAethDim;
}`, "return aethSpeckFlood(p, t) * 0.9 + AETH_FAR;",
  () => ({ uAethFlow: { value: 2 }, uAethDensity: { value: 1 }, uAethDim: { value: 1 } }));

export const aethInfinityPile = T("aethInfinityPile", "Infinity halt: specks arrive and stop on a shell around the hero, thicker on the hole side",
  { use: "card", draws: "a ragged ring of stopped pale specks around the hero's chest, densest toward the hole, no glow", params: "uAethChest shell centre, uAethShell shell radius, uAethGrow 0 to 1 share of specks that have arrived" },
  /* glsl */ `
uniform vec2 uAethChest; uniform float uAethShell; uniform float uAethGrow;
vec3 aethInfinityPile(vec2 p, float t) {
  vec2 q = p - uAethChest;
  float sec = floor((atan(q.y, q.x) + 3.14159265) / 6.2831853 * 96.0);
  float m = 0.0;
  for (int k = 0; k < 4; k++) {
    vec2 id = vec2(sec, float(k) + uAethSeed * 5.0 + 40.0);
    float ang = (sec + 0.25 + 0.5 * aethH(id + 6.1)) / 96.0 * 6.2831853 - 3.14159265;
    float face = 0.5 - 0.5 * cos(ang);
    float arrived = step(aethH(id + 1.7), uAethGrow * (0.4 + 0.6 * face));
    float dep = aethH(id + 4.2);
    float pr = uAethShell + 0.06 * dep * dep + 0.01 * (aethH(id + 8.0) - 0.5);
    float sz = 0.0022 + 0.0020 * aethH(id + 2.9);
    m = max(m, arrived * aethFill(length(p - (uAethChest + vec2(cos(ang), sin(ang)) * pr)) - sz));
  }
  return AETH_SPECK * m;
}`, "return aethInfinityPile(p, t) + AETH_FAR;",
  () => ({ uAethChest: { value: V(1.067, 0.40) }, uAethShell: { value: 0.2 }, uAethGrow: { value: 1 } }));

export const aethBlueOrb = T("aethBlueOrb", "Blue (Lapse): black core, thin pale-blue rim, three-band swirling accretion ring, banded halo",
  { use: "card", draws: "a black-hole orb with a thin light-blue rim, a banded swirling dark-to-bright blue ring and a stepped cold halo", params: "uAethBC orb centre, uAethBI intensity 0 to 1 (size and light), t drives the ring swirl" },
  /* glsl */ `
uniform vec2 uAethBC; uniform float uAethBI;
vec3 aethBlueOrb(vec3 col, vec2 p, float t) {
  vec2 q = p - uAethBC;
  float r = length(q), I = uAethBI, R0 = 0.034 * I + 1e-4;
  float u = clamp((r - R0 * 1.1) / (R0 * 1.8), 0.0, 1.0);
  float ring = aethFill(abs(r - R0 * 2.0) - R0 * 0.9);
  float sw = sin(atan(q.y, q.x) * 2.0 + u * 9.0 - t * 3.0);
  vec3 rc = mix(mix(${v3("#1c3a5c")}, AETH_BLUE, aethAA(u, 0.33)), ${v3("#6fa6d6")}, aethAA(sw * 0.5 + u * 0.4, 0.55));
  float g = exp(-r / 0.13);
  vec3 c = col + AETH_BLUE * 0.18 * (aethAA(g, 0.20) + aethAA(g, 0.45)) * I;
  c = mix(c, rc, ring * step(0.01, I));
  c = mix(c, AETH_INK, aethFill(r - R0) * step(0.01, I));
  c = mix(c, ${v3("#6fa6d6")}, aethLine(r - R0, 2.0) * step(0.01, I));
  return aethCap(c);
}`, "return aethBlueOrb(mix(vec3(0.08, 0.09, 0.16), vec3(0.27, 0.31, 0.40), p.x / 1.6), p, t);",
  () => ({ uAethBC: { value: V(0.99, 0.34) }, uAethBI: { value: 1 } }));

export const aethRedOrb = T("aethRedOrb", "Red (Reversal): small hot red core with a pink-white centre and five thin spiralling tendrils",
  { use: "card", draws: "a small hot red core with a pale-pink centre, five thin red tendrils curling out of it and a stepped red halo", params: "uAethRC orb centre, uAethRI intensity 0 to 1 (size, tendril length and light)" },
  /* glsl */ `
uniform vec2 uAethRC; uniform float uAethRI;
vec3 aethRedOrb(vec3 col, vec2 p, float t) {
  vec2 q = p - uAethRC;
  float r = length(q), I = uAethRI, R0 = 0.02 * I + 1e-4, a = atan(q.y, q.x);
  float g = exp(-r / 0.13);
  vec3 c = col + ${v3("#ff2b3a")} * 0.16 * (aethAA(g, 0.20) + aethAA(g, 0.45)) * I;
  float tn = 0.0;
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    float ak = fk * 1.2566 + 0.35 * fk + 7.0 * r;
    float d = abs(atan(sin(a - ak), cos(a - ak))) * r;
    float len = (0.07 + 0.03 * fract(fk * 0.37)) * I;
    tn = max(tn, aethLine(d, 2.0) * step(R0 * 0.8, r) * step(r, len));
  }
  c = mix(c, mix(${v3("#dc5a65")}, ${v3("#f6cfd8")}, aethAA(-r, -R0 * 2.4)), tn);
  c = mix(c, ${v3("#ff2b3a")}, aethFill(r - R0) * step(0.01, I));
  c = mix(c, ${v3("#f6cfd8")}, aethFill(r - R0 * 0.4) * step(0.01, I));
  return aethCap(c);
}`, "return aethRedOrb(mix(vec3(0.08, 0.09, 0.16), vec3(0.27, 0.31, 0.40), p.x / 1.6), p, t);",
  () => ({ uAethRC: { value: V(1.14, 0.34) }, uAethRI: { value: 1 } }));

export const aethPurpleCore = T("aethPurpleCore", "Hollow Purple: violet orb in flat bands from dark halo to pink-white centre",
  { use: "card", draws: "a violet sphere in four hard rings, dark violet halo, purple body, magenta heart and a pink-white dot, with a stepped violet glow", params: "uAethPC orb centre (the merge point), uAethPI intensity 0 to 1 (scales every ring)" },
  /* glsl */ `
uniform vec2 uAethPC; uniform float uAethPI;
vec3 aethPurpleCore(vec3 col, vec2 p, float t) {
  float r = length(p - uAethPC), I = uAethPI;
  float g = exp(-r / 0.16);
  vec3 c = col + AETH_PURPLE * 0.25 * (aethAA(g, 0.25) + aethAA(g, 0.50)) * I;
  c = mix(c, AETH_PURPLE * 0.55, aethFill(r - 0.10 * I) * 0.6);
  c = mix(c, AETH_PURPLE, aethFill(r - 0.062 * I));
  c = mix(c, AETH_VIOLET, aethFill(r - 0.026 * I));
  c = mix(c, ${v3("#f6cfd8")}, aethFill(r - 0.010 * I));
  return aethCap(c);
}`, "return aethPurpleCore(mix(vec3(0.08, 0.09, 0.16), vec3(0.27, 0.31, 0.40), p.x / 1.6), p, t);",
  () => ({ uAethPC: { value: V(0.944, 0.50) }, uAethPI: { value: 1 } }));

export const aethEraseBand = T("aethEraseBand", "erase path: a straight hard-edged band from the merge point to the left edge replaced by ink",
  { use: "mask", draws: "a straight dark channel with square ends running from the merge point to the left edge and cutting the hole's ring in two chords", params: "uAethBandOn 0 or 1, uAethM merge point (right end x), uAethBandY centre height, uAethBandH half height (0.15 = 0.30 H wide)" },
  /* glsl */ `
uniform float uAethBandOn; uniform vec2 uAethM; uniform float uAethBandY; uniform float uAethBandH;
float aethBandD(vec2 p) { return max(p.x - uAethM.x, abs(p.y - uAethBandY) - uAethBandH); }
vec3 aethEraseBand(vec3 col, vec2 p, float t) { return mix(col, AETH_INK, aethFill(aethBandD(p)) * uAethBandOn); }`,
  "return aethEraseBand(aethSpeckFlood(p, t) + AETH_FAR * 3.0, p, t);",
  () => ({ uAethBandOn: { value: 1 }, uAethM: { value: V(0.944, 0.5) }, uAethBandY: { value: 0.45 }, uAethBandH: { value: 0.15 } }),
  ["aethKit", "aethSpeckFlood"]);

export const aethPathGlow = T("aethPathGlow", "Purple path light: violet edge lines and a stepped glow outside the erased band, decaying as exp(-t/0.6)",
  { use: "card", draws: "thin hot violet lines along the edges of the dark channel with a stepped violet glow outside it that dies out", params: "uAethT0 time the path appears (8.458), t sets the decay; shares the band uniforms of aethEraseBand" },
  /* glsl */ `
uniform float uAethT0;
vec3 aethPathGlow(vec3 col, vec2 p, float t) {
  float I = step(uAethT0, t) * exp(-max(t - uAethT0, 0.0) / 0.6) * uAethBandOn;
  float d = aethBandD(p);
  float g = exp(-max(d, 0.0) / 0.02);
  float gb = aethAA(g, 0.30) * 0.5 + aethAA(g, 0.60) * 0.5;
  vec3 c = col + AETH_PURPLE * 0.7 * gb * (1.0 - aethFill(d)) * I;
  c += AETH_VIOLET * aethLine(d, 2.5) * I;
  return aethCap(c);
}`, "return aethPathGlow(aethEraseBand(vec3(0.15, 0.17, 0.26), p, t), p, t);",
  () => ({ uAethT0: { value: 0 } }),
  ["aethKit", "aethEraseBand"]);

export const aethKillFrame = T("aethKillFrame", "two kill frames: the 0.92 negative at k9 and the flat #ebebeb frame at k10",
  { use: "screen", draws: "one frame of the whole image turned to its negative, or one flat off-white frame, and nothing otherwise", params: "uAethK drawn kill-frame index (9 = negative, 10 = flat white, any other = unchanged)" },
  /* glsl */ `
uniform float uAethK;
vec3 aethKillFrame(vec3 col) {
  float inv = step(abs(uAethK - 9.0), 0.5), wh = step(abs(uAethK - 10.0), 0.5);
  vec3 c = mix(col, max(vec3(0.92) - min(col, vec3(0.92)), AETH_INK), inv);
  return mix(c, AETH_WHITE, wh);
}`, "return aethKillFrame(mix(vec3(0.10, 0.12, 0.20), vec3(0.80, 0.72, 0.52), p.x / 1.6));",
  () => ({ uAethK: { value: 9 } }));

export const aethGrade = T("aethGrade", "final grade: 0.92 luma cap, ink-floor lift, cool-shadow pale-highlight split-tone, grain re-seeded 12 times a second",
  { use: "grade", draws: "the whole frame held between ink and 0.92, cool blue in the shadows and pale silver in the highlights, with film grain heavier in the darks that changes 12 times a second", params: "uAethRes frame size in pixels (grain cell), t drives the grain seed" },
  /* glsl */ `
uniform vec2 uAethRes;
vec3 aethGrade(vec3 col, vec2 p, float t) {
  vec3 c = aethCap(col);
  float Y = aethLuma(c);
  c = mix(AETH_INK, c, smoothstep(0.035, 0.08, Y));
  Y = aethLuma(c);
  vec3 ts = AETH_FAR / aethLuma(AETH_FAR), th = AETH_RIMC / aethLuma(AETH_RIMC);
  c *= mix(mix(vec3(1.0), ts, 0.35), mix(vec3(1.0), th, 0.35), smoothstep(0.2, 0.8, Y));
  c += 0.035 * (1.0 - aethLuma(c)) * (aethH(floor(p * uAethRes.y) + 17.0 * floor(t * 12.0 + 1e-4)) - 0.5);
  c *= max(1.0, 0.036 / max(aethLuma(c), 1e-4));
  return aethCap(c);
}`, "return aethGrade(mix(vec3(0.0), vec3(0.8, 0.82, 0.86), smoothstep(0.0, 1.4, p.x)), p, t);",
  () => ({ uAethRes: { value: V(1280, 800) } }));

export const aethFrameMask = T("aethFrameMask", "frame: 2.39:1 ink bars and a hard-edged iris about a chosen centre",
  { use: "mask", draws: "ink letterbox bars top and bottom and a hard circle that opens from the hero outward or closes on it", params: "uAethIris iris radius in frame heights (9 = fully open), uAethIrisC iris centre" },
  /* glsl */ `
uniform float uAethIris; uniform vec2 uAethIrisC;
vec3 aethFrameMask(vec3 col, vec2 p, float t) {
  float bars = aethFill(min(p.y, 1.0 - p.y) - 0.1653);
  float out_ = 1.0 - aethFill(length(p - uAethIrisC) - uAethIris);
  return mix(col, AETH_INK, max(bars, out_));
}`, "return aethFrameMask(mix(vec3(0.15, 0.17, 0.26), vec3(0.60, 0.65, 0.75), p.y), p, t);",
  () => ({ uAethIris: { value: 0.6 }, uAethIrisC: { value: V(1.067, 0.45) } }));

export const aethSixEyes = T("aethSixEyes", "Gojo's Six Eyes on the seal: half-lidded almond, flat ice-blue iris, ink pupil, brow-shelf shadow, one catchlight on the hole side",
  { use: "card", draws: "a calm half-lidded almond eye with a flat ice-blue iris, a dark pupil, a flat shadow under the brow and one white dot on the left", params: "uAethEye eye centre, uAethEyeW eye width, uAethBlink 0 open to 1 shut, uAethLid 0 wide to 1 heavy lid" },
  /* glsl */ `
uniform vec2 uAethEye; uniform float uAethEyeW; uniform float uAethBlink; uniform float uAethLid;
vec3 aethSixEyes(vec3 col, vec2 p, float t) {
  float a = uAethEyeW * 0.5;
  vec2 q = (p - uAethEye) / a;
  float arch = 1.0 - min(q.x * q.x, 1.0), open = 1.0 - uAethBlink;
  float ht = 0.34 * (1.0 - 0.55 * uAethLid) * open * arch, hb = 0.20 * open * arch;
  float d = max(max(q.y - ht, -q.y - hb), abs(q.x) - 1.0);
  float eye = aethFill(d * a);
  float ir = length(q - vec2(-0.10, 0.02));
  vec3 c = mix(col, vec3(0.84, 0.87, 0.90), eye);
  c = mix(c, ${v3("#89d6f3")}, eye * aethFill((ir - 0.42) * a));
  c = mix(c, ${v3("#0e0f13")}, eye * aethFill((ir - 0.19) * a));
  c = mix(c, c * vec3(0.55, 0.58, 0.72), eye * aethAA(q.y, ht * 0.45));
  c = mix(c, AETH_RIMC, eye * aethFill((length(q - vec2(-0.25, 0.15)) - 0.10) * a));
  c = mix(c, AETH_INK, aethLine(d * a, 2.2) * step(0.001, ht));
  return aethCap(c);
}`, "return aethSixEyes(mix(vec3(0.45, 0.45, 0.50), vec3(0.58, 0.60, 0.66), p.y), p, t);",
  () => ({ uAethEye: { value: V(1.0, 0.5) }, uAethEyeW: { value: 0.16 }, uAethBlink: { value: 0 }, uAethLid: { value: 0.5 } }));

export const aethGojoHair = T("aethGojoHair", "Gojo's hair on the seal: a crown dome with six cone locks swept up and back, one hard shade step, and the blindfold band pushed up under it",
  { use: "card", draws: "a white spiky crown of six cone-shaped locks with a cool blue-grey shaded side and an ink outline, over a black band across the hairline", params: "uAethHead head centre, uAethHeadW head width, uAethSway 0 or 1 (1 px lock shift on the head turn)" },
  /* glsl */ `
uniform vec2 uAethHead; uniform float uAethHeadW; uniform float uAethSway;
vec3 aethGojoHair(vec3 col, vec2 p, float t) {
  float R = uAethHeadW * 0.5;
  vec2 C = uAethHead, pl = p + vec2(uAethSway * 0.00125, 0.0);
  float band = max(abs(p.y - (C.y + 0.12 * R)) - 0.11 * R, length(p - C) - 1.02 * R);
  vec3 c = mix(col, ${v3("#1a120c")}, aethFill(band));
  float dm = 1e3, lit = 1.0;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float th = mix(0.28, 0.82, fk / 5.0) * 3.14159265;
    vec2 rad = vec2(cos(th), sin(th));
    vec2 ax = normalize(rad + vec2(0.35, 0.0));
    float len = R * (0.8 + 0.5 * aethH(vec2(fk, 2.0))), w0 = R * 0.34;
    vec2 v = pl - (C + rad * R * 0.88);
    float a = dot(v, ax), b = dot(v, vec2(-ax.y, ax.x));
    float wid = w0 * clamp(1.0 - a / len, 0.0, 1.0);
    float d = max(abs(b) - wid, max(-a, a - len));
    if (d < dm) { dm = d; lit = aethAA(b / max(wid, 1e-4), -0.2); }
  }
  float dd = max(length(pl - C) - R, C.y + 0.15 * R - pl.y);
  if (dd < dm) { dm = dd; lit = aethAA((pl.y - C.y) * 0.6 - (pl.x - C.x) * 0.8, -0.1 * R); }
  vec3 hair = mix(${v3("#9aa6bd")}, ${v3("#fbf4ea")}, lit);
  c = mix(c, hair, aethFill(dm));
  c = mix(c, AETH_INK, aethLine(dm, 2.2));
  return aethCap(c);
}`, "return aethGojoHair(mix(vec3(0.20, 0.22, 0.30), vec3(0.45, 0.48, 0.58), p.y), p, t);",
  () => ({ uAethHead: { value: V(1.0, 0.55) }, uAethHeadW: { value: 0.14 }, uAethSway: { value: 0 } }));

export const aethJogoCloak = T("aethJogoCloak", "Jogo as a small costumed seal: stone-grey head, pale spotted cloak with one shade step, dark trousers and an orange crown glow that gutters to ember",
  { use: "card", draws: "a small stone-grey figure in a pale cloak dotted with black round spots, dark trousers and an orange glow on its head that fades to dull ember", params: "uAethJ figure centre, uAethJS scale (1 = 0.14 H tall), uAethEmber 0 lit orange to 1 ember" },
  /* glsl */ `
uniform vec2 uAethJ; uniform float uAethJS; uniform float uAethEmber;
vec3 aethJogoCloak(vec3 col, vec2 p, float t) {
  vec2 q = (p - uAethJ) / uAethJS;
  float s = uAethJS;
  vec3 cloak = ${v3("#cfcbc6")}, dark = ${v3("#1e1c26")};
  vec3 c = mix(col, dark, aethFill(max(abs(q.x) - 0.024, abs(q.y + 0.066) - 0.016) * s));
  c = mix(c, ${v3("#3a3436")}, aethFill((length(q - vec2(0.0, 0.075)) - 0.026) * s));
  float hw = 0.030 + 0.016 * clamp(-q.y / 0.05, 0.0, 1.0);
  float d = max(abs(q.x) - hw, abs(q.y) - 0.05);
  vec3 cl = mix(cloak * 0.72, cloak, aethAA(-q.x, 0.012 + 0.15 * q.y));
  vec2 cell = floor(q / 0.022);
  vec2 sc = (cell + 0.5 + (vec2(aethH(cell + 1.1), aethH(cell + 2.3)) - 0.5) * 0.25) * 0.022;
  float spot = step(0.45, aethH(cell + uAethSeed)) * aethFill((length(q - sc) - (0.005 + 0.004 * aethH(cell + 7.7))) * s) * step(d, -0.004);
  c = mix(c, mix(cl, dark, spot), aethFill(d * s));
  float gs = length(q - vec2(0.0, 0.098)) / 0.03;
  vec3 gc = mix(${v3("#ff7a1a")}, ${v3("#5a2a14")}, uAethEmber);
  float core = aethFill(gs - 1.0);
  c = mix(c + gc * 0.25 * aethFill(gs - 1.9) * (1.0 - core), gc, core * 0.9);
  return aethCap(c);
}`, "return aethJogoCloak(mix(vec3(0.16, 0.19, 0.30), vec3(0.27, 0.31, 0.45), p.y), p, t);",
  () => ({ uAethJ: { value: V(0.856, 0.36) }, uAethJS: { value: 3 }, uAethEmber: { value: 0 } }));

export const PACKET_SHADERS = [
  aethKit, aethVoidPlate, aethSpeckFlood, aethInfinityPile, aethBlueOrb, aethRedOrb, aethPurpleCore,
  aethEraseBand, aethPathGlow, aethKillFrame, aethGrade, aethFrameMask, aethSixEyes, aethGojoHair, aethJogoCloak,
];
export default PACKET_SHADERS;
