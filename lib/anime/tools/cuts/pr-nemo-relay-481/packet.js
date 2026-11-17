// pr-nemo-relay-481 packet shaders: Dragon Ball Super Ultra Instinct, Toei cel (void, arena, aura, echoes, orbs, impact, grade).
import { defineCut } from "../kit.glsl.js";

const F = "pr-nemo-relay-481";
const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
const C = { ink: H("#0a0a1e"), h1: H("#17100c"), h2: H("#161014"), h3: H("#201a1f"), tile: H("#968376"), hi: H("#d9d3c5"), seam: H("#645655"), deep: H("#43393b"), under: H("#2f262b"), ledL: H("#8a6a52"), ledD: H("#4a3a32"),
  core: H("#f6f9ff"), body: H("#a8d8ff"), edge: H("#6a8ac8"), sign: H("#9aa0b0"), card: H("#c9d4e8"), god: H("#2e497d"), ki: H("#ff8a1f"), kiCore: H("#ffd9a0"), kiRim: H("#ca855a"), red: H("#c00a1f"), sh: H("#130c0a"), hl: H("#e7e8ea"), halo: H("#7ad0f0"), haloD: H("#3a90b8"), ring: H("#38c0e8"), staff: H("#e8ecf8") };

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const NUM = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

function T(name, { doc, draws, use, params, uni = {}, deps = [], body, demo }) {
  const m = defineCut(name, F, doc, `${NUM(uni)}\n${body}`, demo);
  return { ...m, deps: ["cutKit", "nemoKit", ...deps], draws, use, suits: F, params, uniforms: U(uni) };
}

export const nemoKit = {
  name: "nemoKit",
  family: F,
  doc: "nemo-relay helpers: frame-unit uv, 12 fps frame clock, seeded hash",
  deps: ["cutKit"],
  glsl: `uniform float uNemoSeed;
uniform float uNemoAsp;
vec2 nmU(vec2 p) { return p / vec2(max(uNemoAsp, 0.5), 1.0); }
float nmFrame(float t) { return floor(t * 12.0 + 1e-3) / 12.0; }
float nmH(vec2 p) { return cH21(p + uNemoSeed * 0.137); }`,
  uniforms: U({ uNemoSeed: 7, uNemoAsp: 1.6 }),
  demo: `vec3 demo(vec2 p, float t) { return cCap(mix(CUT_INK, vec3(0.6), cAA(nmH(floor(nmU(p) * 12.0)), 0.5))); }`,
};

export const nemoVoidHaze = T("nemoVoidHaze", {
  doc: "Tournament void: ink #0a0a1e with two faint warm haze bands, lift under 6 percent",
  draws: "A near-black blue void with two barely warmer smoky patches drifting in flat bands.",
  use: "plate",
  params: "uNemoHaze: haze drift speed in frames per second; uNemoSeed: moves the patches.",
  uni: { uNemoHaze: 0.02 },
  body: `vec3 nemoVoidHaze(vec2 p, float t) {
  vec2 u = nmU(p);
  float n = cFbm(u * vec2(2.2, 3.1) + vec2(uNemoSeed * 0.31 + nmFrame(t) * uNemoHaze, 0.0));
  vec3 c = mix(${C.ink}, ${C.h1}, cAA(n, 0.54) * 0.85);
  c = mix(c, ${C.h2}, cAA(n, 0.62) * 0.8);
  return mix(c, ${C.h3}, cAA(n, 0.70) * 0.7);
}`,
  demo: "nemoVoidHaze(p, t)",
});

export const nemoArenaTiles = T("nemoArenaTiles", {
  doc: "arena disc: 8 rings of triangle tiles, 23 up-triangles in ring 0, rings fall outside-in on break",
  draws: "A flat disc of beige triangle tiles with dark seams, tiles in two worn shades, and the rim ring dropping away first when it breaks.",
  use: "plate",
  params: "uNemoCx, uNemoCy: disc centre in frame units; uNemoR: disc radius; uNemoSquash: vertical flatten of the disc; uNemoBreak: 0 whole to 1 fallen (13 to 16 s).",
  uni: { uNemoCx: 0.5, uNemoCy: 0.32, uNemoR: 0.5, uNemoSquash: 0.34, uNemoBreak: 0.0 },
  deps: ["nemoVoidHaze"],
  body: `vec3 nemoArenaTiles(vec2 p, float t) {
  vec2 u = nmU(p);
  vec3 c = nemoVoidHaze(p, t);
  float bt = uNemoBreak * 3.0;
  for (int k = 7; k >= 0; k--) {
    float fk = float(k);
    float delay = (1.0 - fk / 7.0) * 0.7 * 3.0 + 0.3 * nmH(vec2(fk, 3.0));
    float tau = floor(max(bt - delay, 0.0) * 12.0) / 12.0;
    vec2 off = vec2((fk - 3.5) * 0.012 * tau, -0.5 * 0.9 * tau * tau);
    vec2 d = (u - vec2(uNemoCx, uNemoCy) - off) / vec2(uNemoR, uNemoR * uNemoSquash);
    float r = length(d) * 8.0;
    if (floor(r) != fk || tau > 1.6) continue;
    float n = 23.0 * (fk + 1.0);
    float a = atan(d.y, d.x) / 6.28318 + 0.5;
    float fa = fract(a * n), fr = fract(r);
    float tri = abs(fa - 0.5) * 2.0 - (1.0 - fr);
    float up = 1.0 - cAA(tri, 0.0);
    float h = nmH(vec2(floor(a * n), fk));
    vec3 tile = mix(${C.tile}, ${C.seam}, cAA(h, 0.55));
    tile = mix(tile, ${C.hi}, cAA(h, 0.88));
    tile = mix(tile, ${C.deep}, cAA(0.12 - h, 0.0));
    if (fk < 0.5) tile = mix(${C.deep}, tile, up);
    float seam = max(cLine(tri, 1.6), max(cLine(fr, 1.6), cLine(fa, 1.6)));
    tile = mix(tile, ${C.under}, seam);
    c = tile;
  }
  vec2 d0 = (u - vec2(uNemoCx, uNemoCy)) / vec2(uNemoR, uNemoR * uNemoSquash);
  float lip = cFill(length(d0 - vec2(0.0, 0.045 / uNemoSquash)) - 1.0) * (1.0 - cFill(length(d0) - 1.0)) * (1.0 - step(0.6, uNemoBreak));
  return mix(c, ${C.under}, lip);
}`,
  demo: "nemoArenaTiles(p, t)",
});

export const nemoLedgeRock = T("nemoLedgeRock", {
  doc: "broken brown ledge: flat top, three broken steps, jagged underside, hard two-tone cel",
  draws: "A brown cliff ledge with a lit flat top, three chipped steps down its side and a ragged dark underside, outlined in dark umber.",
  use: "surface",
  params: "uNemoLx, uNemoLy: ledge top-left corner; uNemoLw, uNemoLh: ledge size in frame units.",
  uni: { uNemoLx: 0.06, uNemoLy: 0.34, uNemoLw: 0.30, uNemoLh: 0.20 },
  deps: ["nemoVoidHaze"],
  body: `vec3 nemoLedgeRock(vec2 p, float t) {
  vec2 u = nmU(p);
  vec2 q = (u - vec2(uNemoLx, uNemoLy)) / vec2(uNemoLw, uNemoLh);
  float jag = 0.18 * abs(sin(q.x * 9.0 + uNemoSeed)) + 0.10 * abs(sin(q.x * 23.0 + 1.7));
  float top = 1.0, bottom = -0.35 - jag;
  float body = max(q.x - 1.0, max(-q.x, max(q.y - top, bottom - q.y)));
  float stepDrop = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float sx = 0.58 + fi * 0.14;
    float sd = step(sx, q.x) * (0.18 + 0.10 * nmH(vec2(fi, 9.0)));
    stepDrop = max(stepDrop, sd);
  }
  body = max(body, q.y - (top - stepDrop));
  float lit = cAA(q.y - (top - stepDrop - 0.16), 0.0);
  vec3 rock = mix(${C.ledD}, ${C.ledL}, lit);
  rock = mix(rock, ${C.ledD}, cAA(nmH(floor(q * vec2(9.0, 5.0))), 0.80) * (1.0 - lit) * 0.6);
  vec3 c = mix(nemoVoidHaze(p, t), rock, cFill(body));
  return mix(c, ${C.under}, cLine(body, 2.8));
}`,
  demo: "nemoLedgeRock(p, t)",
});

export const nemoInstinctAura = T("nemoInstinctAura", {
  doc: "Ultra Instinct aura: elliptic flame, core #f6f9ff, body #a8d8ff, 2px edge #6a8ac8, grey Sign state, steps on twos",
  draws: "A tall oval silver flame with a white core, a blue outer edge and rising tongues that redraw in steps; it begins thin and grey and turns silver.",
  use: "card",
  params: "uNemoAx, uNemoAy: aura centre; uNemoSa, uNemoSb: semi-width and semi-height; uNemoAura: strength 0 to 1 (quantised to six steps); uNemoWhite: 0 grey Sign to 1 silver.",
  uni: { uNemoAx: 0.5, uNemoAy: 0.46, uNemoSa: 0.24, uNemoSb: 0.48, uNemoAura: 1.0, uNemoWhite: 1.0 },
  deps: ["nemoVoidHaze"],
  body: `vec3 nemoInstinctAura(vec2 p, float t) {
  vec2 u = nmU(p);
  float s = floor(uNemoAura * 6.0 + 0.5) / 6.0;
  vec2 q = u - vec2(uNemoAx, uNemoAy);
  float px = q.y * 800.0;
  float th = atan(q.y, q.x);
  float tp = floor(t * 12.0 + 1e-3) / 12.0;
  float r = length(q / (vec2(uNemoSa, uNemoSb) * max(s, 1e-3)));
  float e = 1.0 + 0.18 * sin(9.0 * th + px / 23.0 + 6.0 * tp) + 0.10 * sin(17.0 * th - px / 11.0) + 0.35 * max(-q.y / uNemoSb, 0.0);
  vec3 body = mix(${C.sign}, ${C.body}, uNemoWhite);
  vec3 core = mix(${C.sign}, ${C.core}, uNemoWhite);
  vec3 c = nemoVoidHaze(p, t);
  float on = step(0.01, s);
  c = mix(c, ${C.edge}, cFill(r - (e + 0.06)) * on);
  c = mix(c, body, cFill(r - e) * on);
  c = mix(c, core, cFill(r - 0.85 * e) * on);
  return c;
}`,
  demo: "nemoInstinctAura(p, t)",
});

export const nemoSilverRim = T("nemoSilverRim", {
  doc: "aura rim light on a round body: (1 - N.V)^2 stepped at 0.4, silver on the hero, deep blue on witnesses",
  draws: "A round cel-shaded body with a hard silver crescent rim around its edge and a dark warm shade side.",
  use: "surface",
  params: "uNemoRx, uNemoRy: body centre; uNemoRr: body radius; uNemoGod: 0 silver rim for the hero, 1 deep blue rim for the gods and ledge.",
  uni: { uNemoRx: 0.5, uNemoRy: 0.48, uNemoRr: 0.22, uNemoGod: 0.0 },
  deps: ["nemoVoidHaze"],
  body: `vec3 nemoSilverRim(vec2 p, float t) {
  vec2 q = (nmU(p) - vec2(uNemoRx, uNemoRy)) / uNemoRr;
  float z = sqrt(max(1.0 - dot(q, q), 0.0));
  vec3 n = normalize(vec3(q, z + 1e-4));
  float ndl = 0.5 + 0.5 * dot(n, normalize(vec3(-0.45, 0.80, 0.40)));
  vec3 base = cCel3(ndl, 0.40, 0.72, vec3(0.455, 0.471, 0.631), vec3(0.525, 0.667, 0.839), vec3(0.827, 0.886, 0.945));
  float rim = (1.0 - z) * (1.0 - z);
  vec3 rc = mix(${C.body}, ${C.god}, uNemoGod);
  vec3 c = mix(base, rc, cAA(rim, 0.4));
  c = mix(nemoVoidHaze(p, t), c, cFill(length(q) - 1.0));
  return mix(c, ${C.ink}, cLine(length(q) - 1.0, 2.8));
}`,
  demo: "nemoSilverRim(p, t)",
});

export const nemoAfterimage = T("nemoAfterimage", {
  doc: "dodge afterimage echoes: three flat silver seal cards at 0.75, 0.50, 0.25 alpha, two-frame holds",
  draws: "Three flat pale-silver cutouts of the seal trailing behind it after each sidestep, each fainter than the last, with no glow.",
  use: "card",
  params: "uNemoD1..uNemoD4: dodge times in seconds; uNemoEx, uNemoEy: seal rest position; uNemoAmp: sidestep distance; uNemoEs: seal body radius.",
  uni: { uNemoD1: 8.5, uNemoD2: 9.5, uNemoD3: 10.333, uNemoD4: 11.0, uNemoEx: 0.5, uNemoEy: 0.40, uNemoAmp: 0.09, uNemoEs: 0.07 },
  deps: ["nemoVoidHaze"],
  body: `float nemoAfterimageX(float tt) {
  float x = 0.0;
  x += step(0.0, tt - uNemoD1) * (1.0 - step(0.5, tt - uNemoD1)) * (1.0 - 0.5 * step(0.25, tt - uNemoD1)) * 1.0;
  x -= step(0.0, tt - uNemoD2) * (1.0 - step(0.5, tt - uNemoD2)) * (1.0 - 0.5 * step(0.25, tt - uNemoD2)) * 1.0;
  x += step(0.0, tt - uNemoD3) * (1.0 - step(0.5, tt - uNemoD3)) * (1.0 - 0.5 * step(0.25, tt - uNemoD3)) * 1.0;
  x -= step(0.0, tt - uNemoD4) * (1.0 - step(0.5, tt - uNemoD4)) * (1.0 - 0.5 * step(0.25, tt - uNemoD4)) * 1.0;
  return x * uNemoAmp;
}
vec3 nemoAfterimage(vec2 p, float t) {
  vec2 u = nmU(p);
  vec3 c = nemoVoidHaze(p, t);
  for (int i = 3; i >= 1; i--) {
    float fi = float(i);
    float tt = floor((nmFrame(t) - 2.0 * fi / 12.0) * 6.0 + 1e-3) / 6.0;
    vec2 q = u - vec2(uNemoEx + nemoAfterimageX(tt), uNemoEy);
    float body = length(q / vec2(uNemoEs * 1.1, uNemoEs * 0.8)) - 1.0;
    float head = length((q - vec2(0.0, uNemoEs * 0.95)) / vec2(uNemoEs * 0.75)) - 1.0;
    float m = cFill(min(body, head));
    c = mix(c, mix(c, ${C.card}, 1.0 - 0.25 * fi), m);
  }
  return c;
}`,
  demo: "nemoAfterimage(p, 8.75 + 0.0 * t)",
});

export const nemoKiOrbs = T("nemoKiOrbs", {
  doc: "23 ki orbs, 19 small and 4 big, hard two-tone orange flying left to right past the hero in 0.5 s",
  draws: "Hard-edged orange balls with a pale yolk and a brown rim flying across the frame one after another, four of them larger.",
  use: "card",
  params: "uNemoOt0: first orb spawn time; uNemoOspan: window the 23 spawns are spread over; uNemoOy: hero line height; uNemoOr: small orb radius (big is double).",
  uni: { uNemoOt0: 8.0, uNemoOspan: 3.0, uNemoOy: 0.42, uNemoOr: 0.022 },
  deps: ["nemoVoidHaze"],
  body: `vec3 nemoKiOrbs(vec2 p, float t) {
  vec2 u = nmU(p);
  float asp = max(uNemoAsp, 0.5);
  vec3 c = nemoVoidHaze(p, t);
  float tf = nmFrame(t);
  for (int i = 0; i < 23; i++) {
    float fi = float(i);
    float s = uNemoOt0 + uNemoOspan * fi / 22.0;
    float f = (tf - s) / 0.5;
    if (f < 0.0 || f > 1.0) continue;
    float big = step(0.5, float(i == 1 || i == 8 || i == 14 || i == 19));
    float side = nmH(vec2(fi, 1.0)) < 0.5 ? -1.0 : 1.0;
    float lane = uNemoOy + side * (0.12 + 0.12 * nmH(vec2(fi, 2.0)));
    float rad = uNemoOr * (1.0 + big) * (0.6 + 0.9 * f);
    vec2 pos = vec2(mix(-0.1, 1.1, f), lane);
    vec2 q = u - pos;
    float d = length(q) - rad;
    vec3 o = mix(${C.ki}, ${C.kiCore}, cFill(length(q - rad * vec2(-0.25, 0.25)) - rad * 0.45));
    c = mix(c, ${C.kiRim}, cFill(d));
    c = mix(c, o, cFill(d + rad * 0.14));
  }
  return c;
}`,
  demo: "nemoKiOrbs(p, 9.0 + 0.0 * t)",
});

export const nemoImpactTwoTone = T("nemoImpactTwoTone", {
  doc: "impact frame: exactly two tones, red #c00a1f on ink where edge or luma is high, bypasses split-tone and bloom",
  draws: "The whole picture turns into red line art and red aura shapes on a near-black blue ground, with nothing in between.",
  use: "grade",
  params: "uNemoIk: 0 normal to 1 two-tone (the one frame at 11.5 s); uNemoEdgeGain: edge sensitivity.",
  uni: { uNemoIk: 1.0, uNemoEdgeGain: 22.0 },
  deps: ["nemoVoidHaze", "nemoInstinctAura"],
  body: `vec3 nemoImpactTwoTone(vec3 col) {
  float L = cLuma(col);
  float edge = clamp(fwidth(L) * uNemoEdgeGain, 0.0, 1.0);
  float on = max(step(0.3, edge), step(0.6, L));
  return mix(col, mix(${C.ink}, ${C.red}, on), uNemoIk);
}`,
  demo: "nemoImpactTwoTone(nemoInstinctAura(p, t))",
});

export const nemoGrade = T("nemoGrade", {
  doc: "Toei grade: luma cap 0.92, ink lift so no pixel is below Y 0.035, split-tone shadows #130c0a and highs #e7e8ea",
  draws: "The finished picture with warm-black shadows, neutral silver highlights, no pure black and nothing brighter than 0.92.",
  use: "grade",
  params: "uNemoSplit: split-tone strength; uNemoSat: saturation multiplier.",
  uni: { uNemoSplit: 0.12, uNemoSat: 1.08 },
  body: `vec3 nemoGrade(vec3 col) {
  float L0 = cLuma(col);
  col = mix(vec3(L0), col, uNemoSat);
  col = mix(col, mix(${C.sh}, ${C.hl}, smoothstep(0.0, 1.0, cLuma(col))), uNemoSplit);
  col = cCap(col);
  return mix(${C.ink}, col, smoothstep(0.035, 0.08, cLuma(col)));
}`,
  demo: "nemoGrade(nemoInstinctAura(p, t))",
  deps: ["nemoVoidHaze", "nemoInstinctAura"],
});

export const nemoLetterbox = T("nemoLetterbox", {
  doc: "2.39:1 letterbox bars in studio ink #0a0a1e, 132.2 px each at 1280x800",
  draws: "Solid dark-blue bars across the top and bottom of the frame, leaving a wide cinema window.",
  use: "mask",
  params: "uNemoAsp: frame aspect (1.6 for 1280x800); uNemoBar: target aspect 2.39.",
  uni: { uNemoBar: 2.39 },
  body: `vec3 nemoLetterbox(vec3 col, vec2 p) {
  float h = min(uNemoAsp / uNemoBar, 1.0) * 0.5;
  float d = abs(p.y - 0.5) - h;
  return mix(col, ${C.ink}, 1.0 - cFill(-d));
}`,
  demo: "nemoLetterbox(nemoInstinctAura(p, t), p)",
  deps: ["nemoVoidHaze", "nemoInstinctAura"],
});

export const nemoSignFlecks = T("nemoSignFlecks", {
  doc: "Sign flecks: 32 grey #9aa0b0 specks 3 to 6 px lifting off the crouching seal on twos",
  draws: "Small grey dust squares rising around a point, each drifting upward in steps and fading at the top.",
  use: "card",
  params: "uNemoFx, uNemoFy: seal feet; uNemoFt0: start time; uNemoFdur: how long they rise.",
  uni: { uNemoFx: 0.5, uNemoFy: 0.30, uNemoFt0: 3.5, uNemoFdur: 2.5 },
  deps: ["nemoVoidHaze"],
  body: `vec3 nemoSignFlecks(vec2 p, float t) {
  vec2 u = nmU(p);
  vec3 c = nemoVoidHaze(p, t);
  float age = max(nmFrame(t) - uNemoFt0, 0.0);
  float on = step(0.0, uNemoFt0 + uNemoFdur - t);
  for (int i = 0; i < 32; i++) {
    float fi = float(i);
    vec2 h = vec2(nmH(vec2(fi, 4.0)), nmH(vec2(fi, 5.0)));
    float life = fract(age * 0.4 + h.y);
    vec2 pos = vec2(uNemoFx + (h.x - 0.5) * 0.22, uNemoFy + life * 0.35 * (0.6 + 0.8 * h.y));
    float sz = (3.0 + 3.0 * nmH(vec2(fi, 6.0))) / 800.0;
    vec2 d = abs(u - pos) - vec2(sz * 0.5);
    float m = cFill(max(d.x, d.y)) * (1.0 - cAA(life, 0.8)) * on * step(0.0, age);
    c = mix(c, ${C.sign}, m);
  }
  return c;
}`,
  demo: "nemoSignFlecks(p, 4.5 + 0.0 * t)",
});

export const nemoWhisHalo = T("nemoWhisHalo", {
  doc: "Whis staff: black orb in a cyan ring #38c0e8 with a turning halo #7ad0f0, ticks step on twos",
  draws: "A black ball held in a bright cyan ring, circled by a pale-blue halo whose tick marks turn in steps.",
  use: "card",
  params: "uNemoWx, uNemoWy: orb centre; uNemoWr: orb radius; uNemoWturn: halo turn rate in turns per second.",
  uni: { uNemoWx: 0.80, uNemoWy: 0.40, uNemoWr: 0.025, uNemoWturn: 0.25 },
  deps: ["nemoVoidHaze"],
  body: `vec3 nemoWhisHalo(vec2 p, float t) {
  vec2 q = nmU(p) - vec2(uNemoWx, uNemoWy);
  float r = length(q);
  float a = atan(q.y, q.x) / 6.28318 + nmFrame(t) * uNemoWturn;
  vec3 c = nemoVoidHaze(p, t);
  float ticks = cAA(fract(a * 14.0), 0.5);
  float haloRing = cLine(r - uNemoWr * 3.2, 3.0);
  c = mix(c, mix(${C.haloD}, ${C.halo}, ticks), haloRing);
  c = mix(c, ${C.ring}, cLine(r - uNemoWr * 1.35, 3.0));
  return mix(c, ${C.ink}, cFill(r - uNemoWr));
}`,
  demo: "nemoWhisHalo(p, t)",
});

export const CUT_SHADERS = [
  nemoKit, nemoVoidHaze, nemoArenaTiles, nemoLedgeRock, nemoInstinctAura, nemoSilverRim,
  nemoAfterimage, nemoKiOrbs, nemoImpactTwoTone, nemoGrade, nemoLetterbox, nemoSignFlecks, nemoWhisHalo,
];
export const CUT_SHADER_COUNT = 13;
export default CUT_SHADERS;
