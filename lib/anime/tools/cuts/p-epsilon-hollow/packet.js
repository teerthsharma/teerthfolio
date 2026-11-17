// p-epsilon-hollow packet shaders: Naruto, Itachi Mangekyo / Tsukuyomi / Amaterasu, Pierrot TV cel (eye card, red sky, negative map, black flame, crows, cast).
import { defineCut } from "../kit.glsl.js";

const F = "p-epsilon-hollow";
const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
const C = {
  skyT: H("#201b1b"), skyH: H("#343134"), ground: H("#1e2520"), tuft: H("#2a342d"), rock: H("#36443b"),
  redT: H("#8e3e29"), redF: H("#692519"), haze: H("#60595a"), lo: H("#60595a"), hi: H("#ebebec"), line: H("#0a0a0a"),
  shLo: H("#020302"), shHi: H("#4c5d54"), neLo: H("#080808"), neHi: H("#8f7a76"), flameEdge: H("#5a2a4a"),
  crow: H("#3f424c"), crowSh: H("#2a2f39"), crowInk: H("#181818"), post: H("#343134"), rope: H("#60595a"),
  cloak: H("#14161e"), cloakSh: H("#0e1015"), cloud: H("#8c1a22"), pale: H("#e8e2d8"),
  hair: H("#14090d"), shard: H("#4a3f4a"), shardN: H("#8c8a8b"), plate: H("#a8afb8"), catch: H("#f8eee0"),
};

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const NUM = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");
const W = "mod(t, 18.0)";

function T(name, { doc, draws, use, params, uni = {}, deps = [], body, demo }) {
  const m = defineCut(name, F, doc, `${NUM(uni)}\n${body}`, demo);
  return { ...m, deps: ["cutKit", "ehKit", ...deps], draws, use, suits: F, params, uniforms: U(uni) };
}

export const ehKit = {
  name: "ehKit",
  family: F,
  doc: "epsilon-hollow helpers: 12 fps frame clock, packet timeline switches, hero-local uv, the studio colours",
  deps: ["cutKit"],
  glsl: `uniform float uEhSeed;
uniform float uEhCastX;
uniform float uEhCastY;
uniform float uEhCastS;
const vec3 EH_INK = ${H("#120a10")};
const vec3 EH_BAR = ${H("#1a0d12")};
const vec3 EH_RED = ${H("#b00000")};
const vec3 EH_GREY = ${H("#a4a3a4")};
const vec3 EH_GLINE = ${C.line};
float ehF(float t) { return floor(t * 12.0 + 1e-3); }
float ehS(float t) { return ehF(t) / 12.0; }
float ehTop(float px) { return 1.0 - px / 800.0; }
float ehH(vec2 p) { return cH21(p + uEhSeed * 0.137); }
float ehEase2(float x) { x = clamp(x, 0.0, 1.0); return 1.0 - (1.0 - x) * (1.0 - x); }
float ehWin(float f, float a, float b) { return step(a - 0.5, f) * step(f, b + 0.5); }
float ehNegAt(float t) { return ehWin(ehF(t), 72.0, 191.0); }
vec2 ehHero(vec2 p) { return (p - vec2(uEhCastX, uEhCastY)) / uEhCastS + vec2(0.5, 0.0); }`,
  uniforms: U({ uEhSeed: 7, uEhCastX: 0.8, uEhCastY: 0.2, uEhCastS: 0.16 }),
  demo: `vec3 demo(vec2 p, float t) { return cCap(mix(EH_BAR, vec3(0.6), cAA(ehH(floor(p * 12.0)), 0.5))); }`,
};

export const ehDarkField = T("ehDarkField", {
  doc: "B0-B2 dark field: four-band night sky, green-grey ground with a cel shade patch, tuft ticks and six low rocks",
  draws: "A dim grey night sky in four flat bands over a dark green-grey field with pale tuft ticks and six low rounded rocks, an ink line round each rock.",
  use: "plate",
  params: "uEhSeed: moves the tufts, the shade patch and the rock positions.",
  body: `vec3 ehDarkField(vec2 p, float t) {
  float hy = ehTop(320.0);
  float kS = min(floor(clamp((p.y - hy) / (1.0 - hy), 0.0, 1.0) * 4.0), 3.0) / 3.0;
  vec3 sky = mix(${C.skyH}, ${C.skyT}, kS);
  vec3 g = ${C.ground};
  g = mix(g, g * 0.86, cAA(cFbm(vec2(p.x * 3.0, p.y * 7.0) + uEhSeed), 0.56));
  vec2 gv = p / vec2(0.07, 0.05);
  vec2 id = floor(gv);
  vec2 f = fract(gv);
  float on = step(ehH(id), 0.42);
  float tuft = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float x0 = 0.2 + 0.3 * fk + (ehH(id + vec2(fk, 9.0)) - 0.5) * 0.12;
    float hk = 0.45 + 0.4 * ehH(id + vec2(fk, 5.0));
    float d = max(abs(f.x - x0) - 0.075 * (1.0 - f.y / hk), f.y - hk);
    tuft = max(tuft, cFill(d));
  }
  g = mix(g, ${C.tuft}, tuft * on);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = vec2(0.1 + 1.4 * ehH(vec2(fi, 1.0)), 0.18 + 0.34 * ehH(vec2(fi, 2.0)));
    float r = 0.025 + 0.03 * ehH(vec2(fi, 3.0));
    vec2 q = (p - c) / vec2(r * 1.5, r);
    float d = max(length(q) - 1.0, -q.y - 0.55);
    vec3 rk = mix(${C.rock}, ${C.rock} * 0.8, cAA(q.x + q.y * 0.4, 0.15));
    g = mix(g, rk, cFill(d));
    g = mix(g, EH_INK, cLine(d, 1.5) * 0.75);
  }
  return cCap(mix(g, sky, cAA(p.y, hy)));
}`,
  demo: `ehDarkField(p, ${W})`,
});

export const ehMangekyoCard = T("ehMangekyoCard", {
  doc: "Itachi Mangekyo card: red #b00000 disc, three sickle ink blades, pupil, outer ring, slit-lid open, stepped 10 degree turn (E5, E6, E8)",
  draws: "A red slit snaps open into a huge red eye disc with three curved black blades round a small black pupil and a thin black rim, the blades jerking round in clear steps.",
  use: "card",
  params: "uEhEyeOpen: 0 slit to 1 disc, -1 follows the packet (f18 to f30); uEhEyeR: radius in frame heights, -1 follows the packet (0.20 to 0.36, f30 to f47); uEhEyePhi: blade turn in radians, -1 follows the packet (12 steps of 10 degrees, f48 to f70).",
  uni: { uEhEyeOpen: -1, uEhEyeR: -1, uEhEyePhi: -1 },
  body: `float ehEyeOpenAt(float t) { return clamp((ehF(t) - 18.0) / 12.0, 0.0, 1.0); }
float ehEyeRadAt(float t) { return 0.2 + 0.16 * ehEase2((ehF(t) - 30.0) / 17.0); }
float ehEyePhiAt(float t) {
  float f = ehF(t);
  float n = (f < 48.0) ? 0.0 : (f <= 57.0) ? f - 48.0 : (f < 62.0) ? 9.0 : (f < 66.0) ? 10.0 : (f < 70.0) ? 11.0 : 12.0;
  return radians(10.0 * n);
}
float ehBladeD(vec2 q, float phi) {
  float r = length(q);
  float a = atan(q.y, q.x) - phi;
  float th = (r - 0.6) * 1.5;
  float hw = 0.32 * sin(3.14159 * clamp((r - 0.2) / 0.77, 0.0, 1.0));
  float da = mod(a - th + 1.0471976, 2.0943951) - 1.0471976;
  return max((abs(da) - hw) * r, max(0.2 - r, r - 0.97));
}
vec3 ehMangekyoCard(vec3 under, vec2 p, float t) {
  float open = uEhEyeOpen < 0.0 ? ehEyeOpenAt(t) : uEhEyeOpen;
  float R = uEhEyeR < 0.0 ? ehEyeRadAt(t) : uEhEyeR;
  float phi = uEhEyePhi < 0.0 ? ehEyePhiAt(t) : uEhEyePhi;
  vec2 q = p - vec2(0.8, 0.62);
  float hh = mix(0.005, R, ehEase2(open));
  float d = max(length(q) - R, abs(q.y) - hh);
  vec2 qn = q / R;
  float r = length(qn);
  vec3 col = EH_RED;
  col = mix(col, EH_INK, cFill(ehBladeD(qn, phi)));
  col = mix(col, EH_INK, cFill(r - 0.16));
  col = mix(col, EH_INK, cAA(r, 0.97));
  col = mix(col, EH_INK, cLine(d, 2.0));
  return mix(under, col, cFill(d) * step(0.001, open));
}`,
  demo: `ehMangekyoCard(ehDarkField(p, t), p, ${W})`,
  deps: ["ehDarkField"],
});

export const ehTsukuyomiSky = T("ehTsukuyomiSky", {
  doc: "Tsukuyomi sky: five flat red bands #8e3e29 to #692519 above y 296, two grey steps to the horizon haze #60595a at y 320",
  draws: "A red sky in five flat painted bands, darkest at the horizon, stepping through two muddy grey-red bands into a flat grey haze below the horizon line.",
  use: "plate",
  params: "uEhSeed: moves the wobble on the band edges; the horizon is fixed at 0.6 of the frame height from the bottom.",
  body: `vec3 ehTsukuyomiSky(vec2 p, float t) {
  float yR = ehTop(296.0);
  float yT = ehTop(132.2);
  float k = clamp((p.y - yR) / (yT - yR), 0.0, 1.0);
  k = clamp(k + (cFbm(vec2(p.x * 2.2, ehS(t) * 0.5 + uEhSeed)) - 0.5) * 0.06, 0.0, 1.0);
  float bk = floor(min(k * 5.0, 4.0)) / 4.0;
  vec3 red = mix(${C.redF}, ${C.redT}, bk);
  vec3 c = ${C.haze};
  c = mix(c, mix(${C.redF}, ${C.haze}, 0.66), cAA(p.y, ehTop(320.0)));
  c = mix(c, mix(${C.redF}, ${C.haze}, 0.33), cAA(p.y, 0.615));
  c = mix(c, red, cAA(p.y, yR));
  return cCap(c);
}`,
  demo: `ehTsukuyomiSky(p, ${W})`,
});

export const ehNegativeMap = T("ehNegativeMap", {
  doc: "region grade (E10): below the horizon luma inverts to four flat greys #60595a to #ebebec, ink stays #0a0a0a, bars and sky pass through",
  draws: "Everything under the horizon turns into a pale grey negative in four flat steps with black line work, while the red sky above is left alone so the sky reads darker than the ground.",
  use: "grade",
  params: "uEhNegMix: 0 identity to 1 full map, -1 follows the packet (on f72, off by f191 with a fade from f180); uEhNegHorizon: horizon height in frame heights. Run it on the world plate under the cast; the cast tools map themselves.",
  uni: { uEhNegMix: -1, uEhNegHorizon: 0.6 },
  body: `float ehNegMixAt(float t) { float f = ehF(t); return step(71.5, f) * (1.0 - ehEase2((f - 180.0) / 11.0) * step(180.0, f)); }
vec3 ehNegativeMap(vec3 col, vec2 p, float t) {
  float k = uEhNegMix < 0.0 ? ehNegMixAt(t) : uEhNegMix;
  float Y = cLuma(col);
  float v = floor(min((1.0 - clamp(Y / 0.8, 0.0, 1.0)) * 4.0, 3.0)) / 3.0;
  vec3 neg = mix(${C.lo}, ${C.hi}, v);
  neg = mix(neg, EH_GLINE, 1.0 - cAA(Y, 0.055));
  float below = cAA(uEhNegHorizon - p.y, 0.0);
  float bars = max(cAA(p.y, ehTop(132.2)), cAA(ehTop(667.8) - p.y, 0.0));
  return mix(col, neg, below * (1.0 - bars) * k);
}`,
  demo: `ehNegativeMap(ehDarkField(p, t), p, ${W}) * step(p.y, 0.6) + ehTsukuyomiSky(p, t) * step(0.6, p.y)`,
  deps: ["ehDarkField", "ehTsukuyomiSky"],
});

export const ehGradeFinal = T("ehGradeFinal", {
  doc: "final grade (E3, E4): split tone dark-green pair then negative pair from f72, luma cap 0.92, ink-floor lift smoothstep(0.035, 0.08)",
  draws: "A faint green-grey cast over the dark field that turns to a warm grey-rose cast from the Tsukuyomi cut, with nothing brighter than 0.92 and no pixel darker than the studio ink floor.",
  use: "grade",
  params: "uEhToneSet: 0 dark-field pair, 1 negative pair, -1 follows the packet (switch at f72); uEhToneAmt: split-tone strength, -1 follows the packet (0.10 then 0.15).",
  uni: { uEhToneSet: -1, uEhToneAmt: -1 },
  body: `vec3 ehGradeFinal(vec3 col, float t) {
  float set = uEhToneSet < 0.0 ? step(71.5, ehF(t)) : uEhToneSet;
  float amt = uEhToneAmt < 0.0 ? mix(0.10, 0.15, set) : uEhToneAmt;
  vec3 sh = mix(${C.shLo}, ${C.neLo}, set);
  vec3 hi = mix(${C.shHi}, ${C.neHi}, set);
  col = mix(col, mix(sh, hi, smoothstep(0.0, 1.0, cLuma(col))), amt);
  col = cCap(col);
  return mix(EH_BAR, col, smoothstep(0.035, 0.08, cLuma(col)));
}`,
  demo: `ehGradeFinal(ehDarkField(p, t), ${W})`,
  deps: ["ehDarkField"],
});

export const ehBlackMoon = T("ehBlackMoon", {
  doc: "the Tsukuyomi black moon (E13): flat ink disc r 56 px climbing from behind the horizon to 0.12 H above it, no rim, no glow",
  draws: "A flat black disc with no halo climbs out of the horizon on the right and is cut off cleanly by the horizon line while it is still below it.",
  use: "card",
  params: "uEhMoonRise: 0 hidden behind the horizon to 1 risen, -1 follows the packet (f108 to f131, ease-out).",
  uni: { uEhMoonRise: -1 },
  body: `vec3 ehBlackMoon(vec3 under, vec2 p, float t) {
  float k = uEhMoonRise < 0.0 ? clamp((ehF(t) - 108.0) / 23.0, 0.0, 1.0) : uEhMoonRise;
  float y = mix(ehTop(376.0), ehTop(224.0), ehEase2(k));
  float d = length(p - vec2(1.0, y)) - 0.07;
  return mix(under, EH_INK, cFill(d) * cAA(p.y, ehTop(320.0)));
}`,
  demo: `ehBlackMoon(ehTsukuyomiSky(p, t), p, ${W})`,
  deps: ["ehTsukuyomiSky"],
});

export const ehAmaterasuWall = T("ehAmaterasuWall", {
  doc: "Amaterasu wall (E15-E17): 24 pointed ink tongues 0.35 to 0.60 H, 4 px #5a2a4a edge, re-seeded on twos, no glow; leaves a scorch strip",
  draws: "A wall of flat black flame tongues with sharp points and a thin dull-purple edge rises across the whole picture behind the hero, flickers in steps, then sinks and leaves a ragged black scar along the ground.",
  use: "card",
  params: "uEhFlameH: wall height in frame heights up to 0.60, -1 follows the packet (rises f132 to f143, sinks f162 to f191); uEhScorch: 0 to 1 scar strip at y 480 to 500, -1 follows the packet (grows as the wall sinks); uEhSeed: re-seeds the tongue heights.",
  uni: { uEhFlameH: -1, uEhScorch: -1 },
  body: `float ehFlameHAt(float t) { float f = ehF(t); return 0.6 * clamp((f - 132.0) / 11.0, 0.0, 1.0) * (1.0 - ehEase2((f - 162.0) / 29.0)); }
float ehScorchAt(float t) { float f = ehF(t); return ehEase2((f - 162.0) / 29.0) * step(131.5, f); }
vec3 ehAmaterasuWall(vec3 under, vec2 p, float t) {
  float sc = (uEhFlameH < 0.0 ? ehFlameHAt(t) : uEhFlameH) / 0.6;
  float sk = uEhScorch < 0.0 ? ehScorchAt(t) : uEhScorch;
  float base = ehTop(500.0);
  float w = 1.6 / 24.0;
  float tt = floor(t * 6.0 + 1e-3) / 6.0;
  float x = p.x + (cFbm(vec2(p.x * 5.0, tt * 1.7 + uEhSeed)) - 0.5) * 0.05;
  float i0 = floor(x / w);
  float top = -1.0;
  for (int k = -1; k <= 1; k++) {
    float i = i0 + float(k);
    float hh = 0.35 + 0.25 * cH21(vec2(i, tt * 0.37 + uEhSeed));
    top = max(top, hh * sc * (1.0 - abs(x - (i + 0.5) * w) / (0.95 * w)));
  }
  float d = max((p.y - base) - top, base - p.y);
  float inner = cFill(d + 4.0 * fwidth(d));
  vec3 fl = mix(${C.flameEdge}, EH_INK, inner);
  vec3 c = mix(under, fl, cFill(d) * step(0.001, sc));
  float jag = (cH21(vec2(floor(p.x * 40.0), 3.0)) - 0.5) * 0.006;
  float ds = max(p.y - (base + 0.025 * sk + jag), base - p.y);
  float dsi = cFill(ds + 3.0 * fwidth(ds));
  vec3 sc3 = mix(${C.flameEdge}, EH_INK, dsi);
  return mix(c, sc3, cFill(ds) * step(0.001, sk));
}`,
  demo: `ehAmaterasuWall(ehTsukuyomiSky(p, t), p, ${W})`,
  deps: ["ehTsukuyomiSky"],
});

export const ehCrowFlock = T("ehCrowFlock", {
  doc: "eight flat cel crows (E20): body #3f424c, shade step #2a2f39, notched ink wing, big beak, red eye dot, wing beat on twos, lift f162 to f170",
  draws: "Eight grey-blue crows with a darker belly, a jagged-edged wing, a heavy beak and a tiny red eye lift off behind the hero, flap in a four-frame cycle, shrink as they climb and scatter up and out.",
  use: "card",
  params: "uEhSeed: reshuffles launch frames, start points and headings. Time t is the cutscene clock in seconds; the first crow leaves at 13.5 s.",
  body: `float ehSdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
vec3 ehCrowFlock(vec3 under, vec2 p, float t) {
  vec3 c = under;
  float f = ehF(t);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float age = (f - (162.0 + floor(ehH(vec2(fi, 11.0)) * 9.0))) / 12.0;
    vec2 p0 = vec2(0.8 + (ehH(vec2(fi, 12.0)) - 0.5) * 0.5, 0.30 + 0.04 * ehH(vec2(fi, 13.0)));
    float dx = (ehH(vec2(fi, 14.0)) - 0.5) * 1.1;
    vec2 pos = p0 + vec2(dx, 0.28 + 0.3 * ehH(vec2(fi, 15.0))) * max(age, 0.0);
    float s = mix(0.05, 0.03, clamp(age / 2.5, 0.0, 1.0));
    vec2 q = (p - pos) / s;
    q.x *= dx < 0.0 ? -1.0 : 1.0;
    float vis = step(0.0, age) * step(dot(q, q), 24.0);
    float fl = mix(1.0, -0.5, step(2.0, mod(floor(age * 12.0 + 1e-3), 4.0)));
    float dBody = min(min(length(q / vec2(1.0, 0.42)) * 0.42 - 0.42, length(q - vec2(0.95, 0.12)) - 0.3),
      min(ehSdTri(q, vec2(1.15, 0.22), vec2(1.15, -0.02), vec2(1.8, 0.1)), ehSdTri(q, vec2(-0.8, 0.08), vec2(-1.7, 0.3), vec2(-1.7, -0.22))));
    float dWf = ehSdTri(q, vec2(0.7, 0.1), vec2(-0.3, 0.1), vec2(0.0, 0.1 + 1.2 * fl));
    float dWn = ehSdTri(q, vec2(0.55, 0.12), vec2(-0.7, 0.12), vec2(-0.55, 0.15 + 1.5 * fl)) + 0.07 * (1.0 - abs(fract(q.x * 2.6) * 2.0 - 1.0));
    c = mix(c, ${C.crowSh}, cFill(dWf) * vis);
    c = mix(c, ${C.crowInk}, cLine(dWf, 1.4) * vis);
    c = mix(c, mix(${C.crow}, ${C.crowSh}, cAA(-q.y - 0.05, 0.0)), cFill(dBody) * vis);
    c = mix(c, ${C.crowInk}, cLine(dBody, 1.4) * vis);
    c = mix(c, ${C.crow}, cFill(dWn) * vis);
    c = mix(c, ${C.crowInk}, cLine(dWn, 1.4) * vis);
    c = mix(c, EH_RED, cFill(length(q - vec2(1.0, 0.17)) - 0.09) * vis);
  }
  return c;
}`,
  demo: `ehCrowFlock(ehTsukuyomiSky(p, t), p, ${W})`,
  deps: ["ehTsukuyomiSky"],
});

export const ehCrucifixPost = T("ehCrucifixPost", {
  doc: "crucifix post: boxy upright and crossbar #343134, one shade step, ink edge, three #60595a rope bands where the victim is tied",
  draws: "A plain grey wooden post with a short crossbar standing on the ground at the left third, with three pale grey rope bands wrapped round it, every edge inked.",
  use: "card",
  params: "uEhPostX: post centre in frame heights (0.4125); uEhPostBase: ground foot height (0.28); uEhPostH: post height (0.192, 1.6 hero heights at the wide).",
  uni: { uEhPostX: 0.4125, uEhPostBase: 0.28, uEhPostH: 0.192 },
  body: `vec3 ehCrucifixPost(vec3 under, vec2 p, float t) {
  vec2 q = p - vec2(uEhPostX, uEhPostBase);
  float hw = 0.009;
  float dP = max(abs(q.x) - hw, max(-q.y, q.y - uEhPostH));
  float dX = max(abs(q.x) - 0.045, abs(q.y - uEhPostH * 0.78) - 0.007);
  float d = min(dP, dX);
  vec3 c = mix(under, mix(${C.post}, ${C.post} * 0.78, cAA(q.x, hw * 0.3)), cFill(d));
  c = mix(c, EH_INK, cLine(d, 2.0));
  for (int k = 0; k < 3; k++) {
    float dR = max(abs(q.x) - hw - 0.007, abs(q.y - uEhPostH * (0.40 + 0.09 * float(k))) - 0.0035);
    c = mix(c, ${C.rope}, cFill(dR));
    c = mix(c, EH_INK, cLine(dR, 1.4));
  }
  return c;
}`,
  demo: `ehCrucifixPost(ehDarkField(p, t), p, ${W})`,
  deps: ["ehDarkField"],
});

export const ehAkatsukiCloak = T("ehAkatsukiCloak", {
  doc: "Akatsuki cloak surface: #14161e with one shade step, notched hem, red-lined high collar, four red clouds with a pale edge, hem flutter on twos; ink-outline negative from f72",
  draws: "A black cloak with a high red-lined collar, a jagged hem and four red clouds edged in cream, the hem snapping sideways in steps; in the Tsukuyomi cut it turns pale grey with the clouds shown as black outlines only.",
  use: "surface",
  params: "uEhCastX, uEhCastY, uEhCastS: hero foot centre and size in frame heights; uEhCloakNeg: 0 colour, 1 grey negative, -1 follows the packet (f72 to f191). Flutter amplitude is 6 px during f144 to f185.",
  uni: { uEhCloakNeg: -1 },
  body: `vec3 ehAkatsukiCloak(vec3 under, vec2 p, float t) {
  float neg = uEhCloakNeg < 0.0 ? ehNegAt(t) : uEhCloakNeg;
  vec2 u = ehHero(p);
  float amp = ehWin(ehF(t), 144.0, 185.0) * 0.0075 / uEhCastS;
  float xs = u.x + amp * sin(ehS(t) * 21.0 + u.y * 7.0) * (1.0 - u.y);
  float ax = abs(xs - 0.5);
  float hem = 0.03 + 0.07 * abs(fract(xs * 4.0) * 2.0 - 1.0);
  float dB = max(ax - (0.40 - 0.10 * u.y), max(hem - u.y, u.y - 0.80));
  float dC = max(max(0.13 - ax, ax - 0.24), max(0.66 - u.y, u.y - 0.92));
  float d = min(dB, dC);
  vec3 base = mix(${C.cloak}, EH_GREY, neg);
  vec3 col = mix(base, mix(${C.cloakSh}, EH_GREY * 0.8, neg), cAA(xs + 0.09 * sin(u.y * 5.0), 0.62));
  col = mix(col, mix(${C.cloud}, base, neg), cFill(dC) * cAA(0.17 - ax, 0.0));
  float cd = 1.0;
  for (int k = 0; k < 4; k++) {
    vec2 cc = vec2(0.24, 0.20);
    if (k == 1) cc = vec2(0.74, 0.17);
    if (k == 2) cc = vec2(0.20, 0.46);
    if (k == 3) cc = vec2(0.80, 0.50);
    vec2 q = u - cc;
    float dc = min(min(length(q) - 0.065, length(q - vec2(-0.065, -0.012)) - 0.045), min(length(q - vec2(0.065, -0.012)) - 0.045, length(q - vec2(0.0, 0.045)) - 0.05));
    cd = min(cd, max(dc, -(q.y + 0.05)));
  }
  col = mix(col, mix(${C.cloud}, base, neg), cFill(cd));
  col = mix(col, mix(${C.pale}, EH_GLINE, neg), cLine(cd, 1.8));
  float edge = cLine(d, 2.8);
  col = mix(col, mix(EH_INK, EH_GLINE, neg), edge);
  return mix(under, col, max(cFill(d), edge));
}`,
  demo: `ehAkatsukiCloak(ehDarkField(p, t), p, ${W})`,
  deps: ["ehDarkField"],
});

export const ehItachiHair = T("ehItachiHair", {
  doc: "Itachi seal hair: black #14090d cap, jagged forehead bangs, two long fringe curtains past the cheeks, low tail with #8c1a22 tie swinging on twos, three glossy shards",
  draws: "Long black hair with a sharp zigzag fringe, two strands hanging down either side of the face, a tail tied with a red band that swings in steps, and three thin grey gloss shards on the crown; grey in the Tsukuyomi cut.",
  use: "surface",
  params: "uEhCastX, uEhCastY, uEhCastS: hero foot centre and size in frame heights; uEhHairNeg: 0 black hair, 1 grey negative, -1 follows the packet (f72 to f191).",
  uni: { uEhHairNeg: -1 },
  body: `vec3 ehItachiHair(vec3 under, vec2 p, float t) {
  float neg = uEhHairNeg < 0.0 ? ehNegAt(t) : uEhHairNeg;
  vec2 u = ehHero(p);
  float dCap = max(length(u - vec2(0.5, 0.74)) - 0.25, 0.70 - u.y);
  float dBang = max(max(abs(u.x - 0.5) - 0.2, u.y - 0.74), 0.62 + 0.07 * abs(fract((u.x - 0.5) * 7.0 + 0.5) * 2.0 - 1.0) - u.y);
  float dCur = 1.0;
  for (int k = 0; k < 2; k++) {
    float x0 = 0.5 + (k == 0 ? -0.215 : 0.215);
    float yb = 0.40 + 0.08 * abs(fract((u.x - x0) * 9.0) * 2.0 - 1.0);
    dCur = min(dCur, max(abs(u.x - x0) - 0.06, max(yb - u.y, u.y - 0.76)));
  }
  float sw = (mod(floor(ehF(t) / 2.0), 2.0) - 0.5) * 0.04;
  float k01 = clamp((0.56 - u.y) / 0.44, 0.0, 1.0);
  float cx = 0.74 + 0.06 * k01 + sw * k01;
  float wd = 0.04 * (u.y - 0.10) / 0.46 + 0.006;
  float dTail = max(abs(u.x - cx) - wd, max(0.12 - u.y, u.y - 0.58));
  float dTie = max(abs(u.x - cx) - wd - 0.006, abs(u.y - 0.50) - 0.016);
  float dH = min(min(dCap, dBang), min(dCur, dTail));
  vec3 col = mix(${C.hair}, ${C.lo}, neg);
  float sh = 1.0;
  for (int k = 0; k < 3; k++) {
    vec2 q = u - vec2(0.40 + 0.08 * float(k), 0.88 - 0.015 * float(k));
    q = vec2(q.x * 0.9 + q.y * 0.44, -q.x * 0.44 + q.y * 0.9);
    sh = min(sh, max(abs(q.x) - 0.05, abs(q.y) - 0.008));
  }
  col = mix(col, mix(${C.shard}, ${C.shardN}, neg), cFill(sh) * cFill(dCap + 0.01));
  col = mix(col, mix(${C.cloud}, EH_GREY, neg), cFill(dTie));
  return mix(under, col, max(cFill(dH), cFill(dTie)));
}`,
  demo: `ehItachiHair(ehDarkField(p, t), p, ${W})`,
  deps: ["ehDarkField"],
});

export const ehLeafPlate = T("ehLeafPlate", {
  doc: "forehead protector: curved cloth band #14161e, steel plate #a8afb8 with one horizontal ink scratch, inked edges; grey in the Tsukuyomi cut",
  draws: "A dark cloth band across the forehead with a square steel plate in the middle crossed by a single slanted scratch, all edges inked.",
  use: "surface",
  params: "uEhCastX, uEhCastY, uEhCastS: hero foot centre and size in frame heights; uEhPlateNeg: 0 colour, 1 grey negative, -1 follows the packet (f72 to f191). Draw it under the hair so the fringes fall over it.",
  uni: { uEhPlateNeg: -1 },
  body: `vec3 ehLeafPlate(vec3 under, vec2 p, float t) {
  float neg = uEhPlateNeg < 0.0 ? ehNegAt(t) : uEhPlateNeg;
  vec2 u = ehHero(p);
  float yc = 0.69 - 0.9 * (u.x - 0.5) * (u.x - 0.5);
  float dBand = max(abs(u.x - 0.5) - 0.23, abs(u.y - yc) - 0.028);
  float dPlate = max(abs(u.x - 0.5) - 0.085, abs(u.y - 0.69) - 0.04);
  float dSc = max(abs(u.y - 0.688 - 0.05 * (u.x - 0.5)) - 0.003, abs(u.x - 0.5) - 0.06);
  vec3 col = mix(${C.cloak}, ${C.lo}, neg);
  col = mix(col, EH_INK, cLine(dBand, 2.0));
  col = mix(col, mix(${C.plate}, ${C.hi}, neg), cFill(dPlate));
  col = mix(col, mix(EH_INK, EH_GLINE, neg), max(cLine(dPlate, 2.0), cFill(dSc) * cFill(dPlate + 0.006)));
  return mix(under, col, max(cFill(dBand), cLine(dBand, 2.0)));
}`,
  demo: `ehLeafPlate(ehDarkField(p, t), p, ${W})`,
  deps: ["ehDarkField"],
});

export const ehMangekyoEyes = T("ehMangekyoEyes", {
  doc: "the seal's Mangekyo eyes: narrow drooping-lid eyes filled by the red iris with three ink blades, pupil, ring, one catchlight before f72, two tear-trough lines each; pale iris in Tsukuyomi",
  draws: "Two narrow, sad, drooping eyes filled with red irises that carry three black curved blades round a small black pupil, with two curved black tear lines under each; in the grey world the irises are pale with only ink blades.",
  use: "surface",
  params: "uEhCastX, uEhCastY, uEhCastS: hero foot centre and size in frame heights; uEhEyeNeg: 0 red, 1 pale iris, -1 follows the packet (f72 to f191); uEhBlink: 0 open to 1 closed, -1 follows the packet (one blink at f196); uEhEyeLit: 1 catchlight on, -1 follows the packet (on before f72).",
  uni: { uEhEyeNeg: -1, uEhBlink: -1, uEhEyeLit: -1 },
  body: `vec3 ehMangekyoEyes(vec3 under, vec2 p, float t) {
  float neg = uEhEyeNeg < 0.0 ? ehNegAt(t) : uEhEyeNeg;
  float blink = uEhBlink < 0.0 ? ehWin(ehF(t), 196.0, 197.0) : uEhBlink;
  float lit = uEhEyeLit < 0.0 ? 1.0 - step(71.5, ehF(t)) : uEhEyeLit;
  vec2 u = ehHero(p);
  vec2 q = vec2(abs(u.x - 0.5), u.y) - vec2(0.13, 0.60);
  q.y += 0.30 * q.x;
  float hs = max(0.04 * (1.0 - 0.92 * blink), 0.003);
  float dE = max(length(vec2(q.x / 0.065, q.y / hs)) - 1.0, (q.y - 0.018) * 25.0);
  vec2 qn = q / 0.055;
  float r = length(qn);
  vec3 ink = mix(EH_INK, EH_GLINE, neg);
  vec3 col = mix(EH_RED, ${C.hi}, neg);
  col = mix(col, ink, cFill(ehBladeD(qn, 0.35)));
  col = mix(col, ink, cFill(r - 0.16));
  col = mix(col, ink, cAA(r, 0.97));
  col = mix(col, ${C.catch}, cFill(length(qn - vec2(0.35, 0.35)) - 0.14) * lit * (1.0 - neg));
  col = mix(col, ink, cLine(dE, 2.2));
  float tear = 0.0;
  for (int k = 0; k < 2; k++) {
    float yo = q.y + 0.07 + 0.022 * float(k);
    float dT = max(abs(length(vec2(q.x, yo * 2.5)) - 0.085), yo);
    tear = max(tear, cLine(dT, 3.0) * step(abs(q.x), 0.075));
  }
  col = mix(col, ink, tear);
  return mix(under, col, max(cFill(dE), max(cLine(dE, 2.2), tear)));
}`,
  demo: `ehMangekyoEyes(ehDarkField(p, t), p, ${W})`,
  deps: ["ehMangekyoCard", "ehDarkField"],
});

export const ehIrisLetterbox = T("ehIrisLetterbox", {
  doc: "OCCLUDE layer (E1, E2, E22): 2.39:1 bars of 132.2 px in #1a0d12 and a hard circular iris on the hero chest, in on f0 to f11, out on f204 to f215, stepped on twos",
  draws: "Two flat cinema bars top and bottom, and a studio-ink curtain that opens as a growing circle from the hero's chest at the start and closes back onto it at the end, moving in two-frame steps.",
  use: "screen",
  params: "uEhIrisR: iris radius as a fraction of frame width, -1 follows the packet (0 to 0.9 by f12, back to 0 from f204); uEhIrisCx, uEhIrisCy: iris centre in frame heights (0.8, 0.28 on the hero chest).",
  uni: { uEhIrisR: -1, uEhIrisCx: 0.8, uEhIrisCy: 0.28 },
  body: `float ehIrisAt(float t) {
  float fe = floor(ehF(t) / 2.0) * 2.0;
  return 0.9 * (fe < 204.0 ? clamp(fe / 12.0, 0.0, 1.0) : 1.0 - clamp((fe - 204.0) / 12.0, 0.0, 1.0));
}
vec3 ehIrisLetterbox(vec3 under, vec2 p, float t) {
  float r = (uEhIrisR < 0.0 ? ehIrisAt(t) : uEhIrisR) * 1.6;
  vec3 c = mix(EH_BAR, under, cFill(length(p - vec2(uEhIrisCx, uEhIrisCy)) - r));
  float bars = max(cAA(p.y, ehTop(132.2)), cAA(ehTop(667.8) - p.y, 0.0));
  return mix(c, EH_BAR, bars);
}`,
  demo: `ehIrisLetterbox(ehDarkField(p, t), p, ${W})`,
  deps: ["ehDarkField"],
});

export const EH_PACKET = [
  ehKit, ehDarkField, ehMangekyoCard, ehTsukuyomiSky, ehNegativeMap, ehGradeFinal, ehBlackMoon,
  ehAmaterasuWall, ehCrowFlock, ehCrucifixPost, ehAkatsukiCloak, ehItachiHair, ehLeafPlate, ehMangekyoEyes, ehIrisLetterbox,
];
export const EH_PACKET_COUNT = 15;
if (EH_PACKET.length !== EH_PACKET_COUNT) throw new Error(`p-epsilon-hollow packet: ${EH_PACKET.length} != ${EH_PACKET_COUNT}`);
export default EH_PACKET;
