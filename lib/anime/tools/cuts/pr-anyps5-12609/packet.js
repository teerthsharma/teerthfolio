// Packet shaders for pr-anyps5-12609: Vice Beach storm surge, painted key art (heavy ink, three flat bands, halftone shadow, sunset grade).
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-anyps5-12609";
const SUITS = [F];
const h = (x) => {
  const n = parseInt(x.slice(1), 16);
  const f = (s) => (((n >> s) & 255) / 255).toFixed(3);
  return `vec3(${f(16)}, ${f(8)}, ${f(0)})`;
};
const U = (d) => () => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { value: v }]));

const N = (name, doc, glsl, demoExpr, meta, uni, deps = []) => ({
  ...M(name, F, doc, glsl, demoExpr),
  deps: ["cutKit", "kaKit", ...deps],
  ...(uni ? { uniforms: U(uni) } : {}),
  suits: SUITS,
  ...meta,
});

export const kaKit = {
  name: "kaKit", family: F, deps: ["cutKit"],
  doc: "pr-anyps5-12609 shared law: studio ink #0b0a10, band aspect 2.39, the 23-stall frame-time series, water-to-height map, sun path, twos clock, 45 degree print dots, box and star SDFs",
  uniforms: U({ uKaSeed: 0, uKaDesat: 0, uKaWaterMs: 40, uKaPx: 1 }),
  glsl: `
const vec3 KA_INK = ${h("#0b0a10")};
const float KA_AR = 2.39;
const float KA_PITCH = 0.0390909;
const float KA_SERIES[23] = float[23](16.6, 16.9, 16.7, 18.2, 16.7, 17.1, 36.0, 41.5, 41.5, 38.8, 21.0, 16.8, 16.7, 23.6, 17.0, 29.4, 24.0, 27.1, 21.5, 22.4, 33.2, 17.4, 16.7);
uniform float uKaSeed;
uniform float uKaDesat;
uniform float uKaWaterMs;
uniform float uKaPx;
float kaTwos(float t) { return floor(t * 12.0 + 0.02) / 12.0; }
float kaHash(vec2 p) { return cH21(p + vec2(uKaSeed * 7.31, uKaSeed * 3.17)); }
float kaV(float i) { return KA_SERIES[int(clamp(i, 0.0, 22.0))]; }
float kaMsY(float v) { return 0.80 - (v - 16.0) / 25.5 * 0.60; }
float kaSunYd(float t) { return mix(0.30, 0.64, smoothstep(5.5, 12.0, t)); }
vec3 kaGrey(vec3 c) { return mix(c, vec3(cLuma(c)), uKaDesat); }
float kaBox(vec2 q, vec2 b) { vec2 d = abs(q) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float kaRBox(vec2 q, vec2 b, float r) { return kaBox(q, b - vec2(r)) - r; }
float kaSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * k); }
float kaDots(float pitch, float r) {
  vec2 g = gl_FragCoord.xy / max(uKaPx, 0.01);
  vec2 q = vec2(g.x + g.y, g.x - g.y) * 0.70711 / pitch;
  return cFill(length(fract(q) - 0.5) - r);
}
float kaStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809017, -0.587785);
  const vec2 k2 = vec2(-0.809017, -0.587785);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float k = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * k) * sign(p.y * ba.x - p.x * ba.y);
}`,
};

export const kaBeachDayPlate = N("kaBeachDayPlate",
  "Vice Beach before the storm: three flat sky bands #8ac8e8 to #ffd0a0, a scalloped dark cloud bank on the horizon, turquoise sea in bands with stepped foam lines, wet-edged sand",
  `uniform float uKaBank;
  vec3 kaBeachDayPlate(vec2 p, float t) {
    float tt = kaTwos(t);
    float y = p.y;
    vec3 c = ${h("#8ac8e8")};
    c = mix(c, ${h("#c4d4d8")}, cAA(y, 0.70));
    c = mix(c, ${h("#ffd0a0")}, cAA(y, 0.58));
    float scallop = 0.030 * abs(sin(p.x * 14.0 + tt * 0.6)) + 0.012 * sin(p.x * 41.0);
    float bankTop = 0.575 + 0.060 * uKaBank + scallop;
    vec3 bank = mix(${h("#2e3a5a")}, ${h("#5a6a8a")}, cAA(y, bankTop - 0.020));
    c = mix(c, bank, cAA(bankTop, y) * cAA(y, 0.515));
    float shore = 0.30 + 0.035 * sin(p.x * 5.0 + tt * 2.4) + 0.012 * sin(p.x * 17.0 - tt * 5.0);
    vec3 sea = ${h("#1fb5b0")};
    sea = mix(sea, ${h("#168a98")}, cAA(y, 0.515) * (1.0 - cAA(y, 0.43)));
    sea = mix(sea, ${h("#2ec8c0")}, 1.0 - cAA(y, shore + 0.06));
    float lines = cLine(fract((y - shore) * 9.0 - tt * 0.5) - 0.5, 1.6) * cAA(y, shore + 0.05) * (1.0 - cAA(y, 0.50));
    sea = mix(sea, ${h("#f2f6f6")}, lines * 0.55);
    c = mix(c, sea, cAA(0.515, y) * cAA(y, shore));
    vec3 sand = mix(${h("#d4bc92")}, ${h("#f0dcb4")}, cAA(y, 0.10));
    sand = mix(${h("#d8c09a")}, sand, cAA(y, shore - 0.045));
    c = mix(c, sand, cAA(shore, y));
    float foam = cLine(y - shore, 3.0);
    c = mix(c, ${h("#f2f6f6")}, foam * 0.9);
    return cCap(c);
  }`, "kaBeachDayPlate(p, t)",
  { use: "plate",
    draws: "A calm Vice-style beach in flat bands: a pale blue-to-peach sky with a dark scalloped cloud bank on the horizon, a turquoise sea with stepped white foam lines, and cream sand with a darker wet edge.",
    params: "p = band uv (y up, 0..1 between the letterbox bars); t = pocket seconds, the shoreline moves on twos; uKaBank 0..1 grows the storm bank (0.3 at 0 s)." },
  { uKaBank: 0.3 });

export const kaPhoneInset = N("kaPhoneInset",
  "vertical phone clip: 9:16 inset (301 px of 1280) with a 2 px ink frame and 0.04 W corners, handheld wobble from a 24 fps curve per drawing, record dot blinking every 6 drawings, a dark caption pill; the beach outside is held at 0.7",
  `vec2 kaPhoneWobble(float t) {
    float k = floor(t * 12.0 + 0.02) * 2.0;
    return (vec2(cVn(vec2(k, 3.7)), cVn(vec2(k, 9.1))) - 0.5) * 0.010;
  }
  vec3 kaPhoneInset(vec3 inside, vec3 outside, vec2 p, float t) {
    vec2 w = kaPhoneWobble(t);
    vec2 q = vec2((p.x - 0.5 - w.x) * KA_AR, p.y - 0.5 - w.y);
    float d = kaRBox(q, vec2(0.1176 * KA_AR, 0.5), 0.04 * KA_AR);
    vec3 c = mix(outside * 0.7, inside, cFill(d));
    float on = step(mod(floor(t * 12.0 + 0.02), 12.0), 5.5);
    float dot0 = cFill(length(q - vec2(-0.24, 0.43)) - 0.016);
    c = mix(c, ${h("#e8303a")}, dot0 * on * cFill(d + 0.04));
    float pill = cFill(kaRBox(q - vec2(0.0, -0.30), vec2(0.20, 0.034), 0.034));
    c = mix(c, KA_INK, pill * 0.55 * cFill(d + 0.04));
    float ticks = step(0.5, fract(q.x * 22.0)) * cFill(abs(q.y + 0.30) - 0.006) * step(abs(q.x), 0.15);
    c = mix(c, ${h("#f2f2ee")}, ticks * pill * 0.8);
    c = mix(c, KA_INK, cLine(d, 3.0));
    return cCap(c);
  }`, "kaPhoneInset(kaBeachDayPlate(p + kaPhoneWobble(t), t), kaBeachDayPlate(p, t), p, t)",
  { use: "card",
    draws: "A tall phone screen centred in the wide frame with rounded corners and a thin ink border, a red record dot blinking top left and a dark caption pill near the bottom, while the beach around it sits dimmed.",
    params: "inside = sharp clip colour (offset the sampled uv by kaPhoneWobble(t)); outside = the same scene blurred by the caller; p = band uv; t = pocket seconds (wobble re-rolled every drawing, dot blinks 6 on 6 off)." },
  undefined, ["kaBeachDayPlate"]);

export const kaStormStreet = N("kaStormStreet",
  "storm night street: two flat sky bands #1a1a2e to #3a2a4a with hard cloud streaks, two parallax rows of stepped art deco facades with window grids, four palm trees in ink bending with a crown rotation 0.25 sin(1.3 t), wet asphalt with a kerb band",
  `uniform float uKaDark;
  uniform float uKaScroll;
  float kaFacTop(float x, float par, float seed) {
    float cx = (x + uKaScroll * par) / 0.075;
    float i = floor(cx);
    float u = fract(cx);
    float hh = kaHash(vec2(i, seed));
    float top = 0.50 + 0.28 * hh;
    float st = (u < 0.18 || u > 0.82) ? 0.05 : ((u < 0.30 || u > 0.70) ? 0.02 : 0.0);
    return top - st * step(0.5, hh);
  }
  float kaPalm(vec2 p, float bx, float by, float hgt, float sw, float tt) {
    vec2 q = vec2((p.x - bx) * KA_AR, p.y - by);
    float xc = 0.5 * sw * hgt * (q.y / hgt) * (q.y / hgt);
    float trunk = max(abs(q.x - xc) - 0.007 * (1.0 - 0.35 * q.y / hgt), max(-q.y, q.y - hgt));
    vec2 cr = vec2(0.5 * sw * hgt, hgt);
    float rot = 0.25 * sin(1.3 * tt);
    float fr = 1.0;
    for (int k = 0; k < 7; k++) {
      float a = 3.14159 * (0.08 + 0.84 * float(k) / 6.0) + rot;
      vec2 dr = vec2(cos(a), sin(a));
      float ln = 0.085;
      vec2 m1 = cr + dr * ln * 0.6;
      vec2 e1 = m1 + vec2(dr.x * 0.5, -0.55) * ln * 0.55;
      fr = min(fr, min(kaSeg(q, cr, m1), kaSeg(q, m1, e1)) - 0.0065);
    }
    return cFill(min(trunk, fr));
  }
  vec3 kaStormStreet(vec2 p, float t) {
    float tt = kaTwos(t);
    float y = p.y;
    vec3 lo = ${h("#7a6a9a")};
    vec3 s1 = mix(lo, ${h("#1a1a2e")}, uKaDark);
    vec3 s2 = mix(lo * 1.1, ${h("#3a2a4a")}, uKaDark);
    vec3 c = mix(s1, s2, cAA(y, 0.62));
    float cl = step(0.62, cFbm(vec2(p.x * 2.6 + tt * 0.05, y * 11.0)));
    c = mix(c, s1 * 0.78, cl * cAA(y, 0.48));
    float farM = step(p.x, 0.36) + step(0.64, p.x);
    float farT = kaFacTop(p.x, 0.2, 1.0) * 0.82;
    c = mix(c, ${h("#2a2842")}, clamp(farM, 0.0, 1.0) * cAA(farT, y) * cAA(y, 0.38));
    float nearM = step(p.x, 0.27) + step(0.73, p.x);
    float nearT = kaFacTop(p.x, 0.4, 2.0);
    float fu = fract((p.x + uKaScroll * 0.4) / 0.075);
    vec3 fac = mix(${h("#3a2a3a")}, ${h("#8a6a7a")}, step(0.55, fu));
    vec2 wc = vec2((p.x + uKaScroll * 0.4) * 38.0, y * 26.0);
    vec2 wf = fract(wc) - 0.5;
    float lit = step(0.72, kaHash(floor(wc) + floor(tt * 4.0) * 0.17));
    float win = cFill(max(abs(wf.x) - 0.26, abs(wf.y) - 0.30));
    fac = mix(fac, mix(${h("#ffd27a")}, ${h("#ff6aa8")}, step(0.5, kaHash(floor(wc).yx))) * 0.85, win * lit);
    c = mix(c, fac, clamp(nearM, 0.0, 1.0) * cAA(nearT, y) * cAA(y, 0.38));
    c = mix(c, KA_INK, cLine(nearT - y, 2.0) * clamp(nearM, 0.0, 1.0) * cAA(y, 0.38));
    vec3 road = ${h("#1c2030")};
    road = mix(${h("#2a3048")}, road, cAA(y, 0.355));
    float lane = step(0.5, fract((p.x + uKaScroll) * 7.0)) * cLine(y - 0.20, 4.0);
    road = mix(road, ${h("#8a8aa0")}, lane * 0.6);
    c = mix(c, road, cAA(0.38, y));
    float pm = kaPalm(p, 0.13, 0.36, 0.34, 0.9, tt) + kaPalm(p, 0.31, 0.36, 0.28, -0.7, tt + 0.3);
    pm += kaPalm(p, 0.70, 0.36, 0.30, 0.7, tt + 0.6) + kaPalm(p, 0.88, 0.36, 0.36, -0.9, tt + 0.9);
    c = mix(c, ${h("#14101c")}, clamp(pm, 0.0, 1.0));
    return cCap(c);
  }`, "kaStormStreet(p, t)",
  { use: "plate",
    draws: "A stormy night street in flat painted bands: a dark violet sky with hard cloud streaks, two rows of stepped art deco buildings with lit windows, ink-black palm trees leaning with swaying crowns, and wet asphalt with a kerb line.",
    params: "p = band uv (y up); t = pocket seconds (everything on twos); uKaDark 0..1 darkens the sky from dusk blue to storm (6 drawings from f12); uKaScroll slides the two facade rows at 0.2 and 0.4 of its value." },
  { uKaDark: 1, uKaScroll: 0 });

export const kaNeonFlood = N("kaNeonFlood",
  "neon signs and their flooded mirror: 7 outlined tube signs per street side in #ff3ea0 #2ae6ff #ffd23a flickering on twos, over a rising #12222e flood plane that re-draws them rippled at 0.45 with a red-blue light-bar streak",
  `uniform float uKaFloodY;
  uniform float uKaLightBar;
  uniform float uKaBarX;
  vec4 kaSigns(vec2 p, float t) {
    float tt = floor(t * 12.0 + 0.02);
    vec3 acc = vec3(0.0);
    float a = 0.0;
    for (int s = 0; s < 14; s++) {
      float fs = float(s);
      float side = fs < 7.0 ? 0.0 : 1.0;
      float k = fs - 7.0 * side;
      float hx = kaHash(vec2(fs, 1.0));
      float hy = kaHash(vec2(fs, 2.0));
      float hc = kaHash(vec2(fs, 3.0));
      float x = (side < 0.5 ? 0.03 : 0.71) + 0.26 * (k + hx * 0.8) / 7.0;
      float y = 0.46 + 0.34 * hy;
      vec2 q = vec2((p.x - x) * KA_AR, p.y - y);
      float d = kaRBox(q, vec2(0.022 + 0.020 * hx, 0.045 + 0.050 * hy), 0.014);
      float on = step(0.06, kaHash(vec2(fs, tt)));
      vec3 col = hc < 0.33 ? ${h("#ff3ea0")} : (hc < 0.66 ? ${h("#2ae6ff")} : ${h("#ffd23a")});
      float tube = cLine(d, 2.6) * on;
      float core = cLine(d, 1.0) * on;
      acc += mix(col, vec3(0.92), core * 0.6) * tube;
      a = max(a, tube);
      acc += col * 0.34 * cFill(d) * on;
      a = max(a, cFill(d) * 0.5);
    }
    return vec4(acc, a);
  }
  vec3 kaNeonFlood(vec2 p, float t) {
    float tt = kaTwos(t);
    vec3 c = kaStormStreet(p, t);
    vec4 sg = kaSigns(p, t);
    c = mix(c, KA_INK, sg.a * 0.5);
    c = c + sg.rgb * (1.0 - cAA(0.0, sg.a));
    float wy = uKaFloodY;
    float fl = cAA(wy, p.y);
    vec3 water = ${h("#12222e")};
    water = mix(water, ${h("#1c3444")}, step(0.5, fract(p.y * 26.0 + sin(p.x * 30.0 + tt * 9.0) * 0.25)) * 0.6);
    vec2 pr = vec2(p.x + 0.004 * sin(40.0 * p.y + 9.0 * tt), 2.0 * wy - p.y);
    vec4 mr = kaSigns(pr, t);
    water += 0.45 * mr.rgb;
    float alt = step(0.5, fract(floor(t * 12.0 + 0.02) * 0.5));
    vec3 bar = mix(${h("#e8303a")}, ${h("#2a6aff")}, alt);
    float streak = cFill(abs(pr.x - uKaBarX) - 0.012) * step(0.5, fract(pr.y * 40.0 + tt * 3.0));
    water += bar * streak * 0.5 * uKaLightBar;
    c = mix(c, water, fl);
    c = mix(c, KA_INK, cLine(p.y - wy, 1.4) * 0.35);
    return cCap(c);
  }`, "kaNeonFlood(p, t)",
  { use: "plate",
    draws: "The night street with fourteen flickering neon tube signs in pink, cyan and yellow, and a dark flood across the lower frame that mirrors the signs as wavering smears, with an optional red and blue siren streak in the water.",
    params: "p = band uv (y up); t = pocket seconds, flicker and ripple on twos; uKaFloodY = water surface height in uv (0.12 at 1 s rising to about 0.34); uKaLightBar 0 or 1 turns the siren reflection on; uKaBarX is its x." },
  { uKaFloodY: 0.2, uKaLightBar: 0, uKaBarX: 0.6 }, ["kaStormStreet"]);

export const kaSeawallSurge = N("kaSeawallSurge",
  "seawall surge: a concrete wall with a lit top, a dark water mass rising behind it in steps of 3 drawings per surge, and a white foam crest drawn as a field of broken horizontal strokes with spill foam on the wall top",
  `uniform float uKaSurge;
  vec3 kaSeawallSurge(vec2 p, float t) {
    float tt = kaTwos(t);
    float idx = floor(clamp(t - 1.0, 0.0, 1.0) * 4.0 + 0.02);
    float lvl = uKaSurge < 0.0 ? 0.30 + 0.70 * idx / 3.0 : uKaSurge;
    vec3 c = kaStormStreet(p, t);
    float wallTop = 0.30;
    float crest = wallTop + 0.04 + 0.26 * lvl + 0.022 * sin(p.x * 18.0 + idx * 2.1);
    vec3 sea = ${h("#12222e")};
    sea = mix(sea, ${h("#1f3a4c")}, cAA(p.y, wallTop + 0.10));
    c = mix(c, sea, cAA(crest, p.y) * cAA(p.y, wallTop));
    float cell = floor(p.x / 0.035);
    float on = step(0.22, kaHash(vec2(cell, idx))) * cFill(abs(fract(p.x / 0.035) - 0.5) - 0.40);
    float top = crest + 0.030 - 0.012 * kaHash(vec2(cell, 5.0 + idx));
    float bot = crest - 0.030 + 0.010 * kaHash(vec2(cell, 9.0 + idx));
    float slab = max(bot - p.y, p.y - top);
    c = mix(c, KA_INK, cLine(slab, 2.0) * on);
    c = mix(c, ${h("#f2f6f6")}, cFill(slab + fwidth(slab)) * on);
    vec3 wall = mix(${h("#2e3048")}, ${h("#3a3a52")}, cAA(p.y, 0.14));
    wall = mix(wall, ${h("#6a6a8a")}, cAA(p.y, wallTop - 0.035));
    c = mix(c, wall, cAA(wallTop, p.y));
    float spill = cFill(abs(p.y - wallTop + 0.012) - 0.010) * step(0.5, lvl) * step(0.4, kaHash(vec2(cell, idx + 9.0)));
    c = mix(c, ${h("#f2f6f6")}, spill);
    c = mix(c, KA_INK, cLine(p.y - wallTop, 3.0) + cLine(p.y - 0.14, 1.4) * 0.5);
    return cCap(c);
  }`, "kaSeawallSurge(p, t)",
  { use: "plate",
    draws: "A storm wave heaving over a low concrete seawall at night: a dark water mass with a ragged white foam crest of broken strokes, foam spilling across the wall top, ink-edged concrete in front.",
    params: "p = band uv (y up); t = pocket seconds (the surge steps up every 3 drawings between 1.0 and 2.0 s); uKaSurge 0..1 sets the level by hand, -1 follows the clock." },
  { uKaSurge: -1 }, ["kaStormStreet"]);

export const kaRainStreaks = N("kaRainStreaks",
  "hard rain: about 360 pale streaks 10 to 26 px long, 74 degrees off horizontal, alpha 0.30, re-rolled on twos",
  `vec3 kaRainStreaks(vec3 c, vec2 p, float t) {
    float tt = floor(t * 12.0 + 0.02);
    vec2 fc = gl_FragCoord.xy / max(uKaPx, 0.01);
    vec2 dr = vec2(cos(1.29154), sin(1.29154));
    vec2 pr = vec2(-dr.y, dr.x);
    vec2 g = vec2(dot(fc, dr) / 48.0, dot(fc, pr) / 14.0);
    vec2 id = floor(g);
    vec2 f = fract(g);
    float h1 = kaHash(id + tt * 13.1);
    float h2 = kaHash(id.yx + 7.7 + tt);
    float h3 = kaHash(id + 3.3 + tt * 5.0);
    float len = (10.0 + 16.0 * h2) / 48.0;
    float s0 = 0.05 + (0.90 - len) * h3;
    float along = step(s0, f.x) * step(f.x, s0 + len);
    float wide = 1.0 - smoothstep(0.35, 0.85, abs(f.y - 0.5) * 14.0);
    float a = step(0.76, h1) * along * wide * 0.30;
    return mix(c, ${h("#cfd8e6")}, a);
  }`, "kaRainStreaks(kaSeawallSurge(p, t), p, t)",
  { use: "screen",
    draws: "Thin pale diagonal rain streaks scattered across the frame, steep and short, that jump to new places every other frame.",
    params: "c = colour under the rain; p = band uv; t = pocket seconds (re-hashed on twos); streak count about 360 at 1280 x 800; uKaPx scales the pixel sizes for other resolutions." });

export const kaWantedStars = N("kaWantedStars",
  "five-star HUD row at 0.816 to 0.944 W, 0.08 H from the top: white 5-point SDFs with a 1.5 px ink rim, unlit at alpha 0.25, lighting one per 3 drawings from f24 with a 2-drawing off-on flash, hard off at 5.5 s",
  `uniform float uKaStars;
  vec3 kaWantedStars(vec3 c, vec2 p, float t) {
    float f = floor(t * 12.0 + 0.02);
    float acc = 0.0;
    vec3 out0 = c;
    for (int k = 0; k < 5; k++) {
      float fk = float(k);
      float fl = 24.0 + 3.0 * fk;
      float j = f - fl;
      float vis = j < 0.0 ? 0.0 : (j < 1.0 ? 1.0 : (j < 2.0 ? 0.0 : 1.0));
      if (uKaStars >= 0.0) vis = step(fk + 0.5, uKaStars);
      if (uKaStars < 0.0 && t >= 5.5) vis = 0.0;
      vec2 q = vec2((p.x - (0.816 + 0.032 * fk)) * KA_AR, p.y - 0.92);
      float d = kaStar5(q, 0.0311, 0.42);
      vec3 fill = mix(c, ${h("#f2f2ee")}, mix(0.25, 1.0, vis));
      out0 = mix(out0, fill, cFill(d));
      out0 = mix(out0, KA_INK, cLine(d, 1.5) * mix(0.5, 1.0, vis));
    }
    return kaGrey(out0);
  }`, "kaWantedStars(kaSeawallSurge(p, t), p, t)",
  { use: "card",
    draws: "A row of five small white stars at the top right of the frame, thinly ringed in ink, that light up one after another, each blinking off and on once as it comes alive.",
    params: "c = colour under the HUD; p = band uv; t = pocket seconds (f24, 27, 30, 33, 36 light the stars, hard off at 5.5 s); uKaStars -1 follows the clock, 0..5 sets the number lit." },
  { uKaStars: -1 });

export const kaKelvinWake = N("kaKelvinWake",
  "Kelvin wake and spray: a V of broken white foam with half-angle 19.5 degrees and length 0.25 W fading with distance, a paler turquoise wedge between the arms, and 30 ballistic droplets re-thrown every 2 drawings",
  `uniform float uKaWakeX;
  uniform float uKaWakeY;
  uniform float uKaWakeLen;
  uniform float uKaWakeDir;
  vec3 kaKelvinWake(vec3 under, vec2 p, float t) {
    float s = (p.x - uKaWakeX) * uKaWakeDir;
    float lat = p.y - uKaWakeY;
    float k = clamp(s / uKaWakeLen, 0.0, 1.0);
    float arm = tan(0.3403) * s * KA_AR * 0.45;
    float inV = step(0.0, s) * step(s, uKaWakeLen);
    float wedge = inV * step(abs(lat), arm) * (1.0 - k);
    vec3 c = mix(under, mix(under, ${h("#2ec8c0")}, 0.45), wedge * 0.55);
    float broken = step(0.30, kaHash(vec2(floor(s * 70.0), floor(t * 12.0 + 0.02) * 0.5)));
    float armLine = cFill(abs(abs(lat) - arm) - 0.0085 * (1.0 - 0.6 * k)) * inV * broken;
    c = mix(c, ${h("#f2f6f6")}, armLine * (1.0 - 0.8 * k));
    float n = floor(t * 6.0 + 0.02);
    float j = floor(t * 12.0 + 0.02) - 2.0 * n;
    float tau = 0.25 + 0.5 * j;
    float dp = 0.0;
    for (int i = 0; i < 30; i++) {
      float fi = float(i);
      float h1 = kaHash(vec2(fi, n));
      float h2 = kaHash(vec2(fi + 40.0, n));
      vec2 q = vec2((p.x - uKaWakeX) * KA_AR - uKaWakeDir * (0.01 + 0.07 * h1) * tau * 3.0, p.y - uKaWakeY - (0.15 * (0.4 + h2) * tau - 0.12 * tau * tau));
      dp = max(dp, cFill(length(q) - 0.0065));
    }
    c = mix(c, ${h("#f2f6f6")}, dp);
    return cCap(c);
  }`, "kaKelvinWake(kaNeonFlood(p, t), p, t)",
  { use: "screen",
    draws: "A foamy V-shaped wake trailing behind a fast boat, two broken white lines opening at a shallow angle with a pale teal wedge between them, plus a spray of small white droplets thrown up at the hull.",
    params: "under = water colour; p = band uv; t = pocket seconds (foam breaks on twos, droplets re-thrown every 2 drawings); uKaWakeX, uKaWakeY = hull in uv; uKaWakeLen = 0.25 for the jet ski, 0.18 for the cruiser bow wave; uKaWakeDir = +1 wake runs right, -1 left." },
  { uKaWakeX: 0.4, uKaWakeY: 0.22, uKaWakeLen: 0.25, uKaWakeDir: -1 });

export const kaSunSky = N("kaSunSky",
  "sunset sky and sun: three flat bands #4a2a6a, #ff3e7f, #ff8a3d, hard violet cloud streaks, an orange halo ring and a #fff0c8 disc on x = 0.80 W descending 0.30 H to 0.64 H over 5.5 to 12 s; kaGlitter lays the stepped glitter column over the water",
  `vec3 kaSunSky(vec2 p, float t) {
    float yd = 1.0 - p.y;
    float off = clamp(0.59 - kaMsY(uKaWaterMs), 0.0, 0.35);
    float yb = yd + off;
    float tt = kaTwos(t);
    vec3 c = ${h("#4a2a6a")};
    c = mix(c, ${h("#ff3e7f")}, cAA(yb, 0.30));
    c = mix(c, ${h("#ff8a3d")}, cAA(yb, 0.54));
    float cl = step(0.64, cFbm(vec2(p.x * 3.0 + tt * 0.04, yd * 15.0)));
    c = mix(c, ${h("#7a2a5a")}, cl * (1.0 - cAA(yb, 0.50)) * cAA(yb, 0.10));
    float sy = kaSunYd(t);
    float d = length(vec2((p.x - 0.80) * KA_AR, yd - sy)) - 0.07;
    c = mix(c, ${h("#ffb070")}, (1.0 - cAA(d, 0.04)) * 0.9);
    c = mix(c, ${h("#fff0c8")}, cFill(d));
    return cCap(c);
  }
  vec3 kaGlitter(vec3 c, vec2 p, float t, float mask) {
    float yd = 1.0 - p.y;
    float row = floor(yd / (3.0 / 535.6));
    float hh = kaHash(vec2(row, floor(6.0 * t + 0.02)));
    float x = (p.x - 0.80) / 0.06;
    float g = step(0.80, hh) * exp(-x * x) * step(kaSunYd(t) + 0.07, yd);
    return mix(c, ${h("#fff0c8")}, g * 0.6 * (1.0 - uKaDesat) * mask);
  }`, "kaGlitter(kaSunSky(p, t), p, t, step(0.55, 1.0 - p.y))",
  { use: "plate",
    draws: "A flat-banded sunset sky of purple, hot pink and orange with violet cloud streaks and a cream sun disc in an orange ring low on the right, sinking over the half minute; a column of short bright glints under the sun that re-rolls six times a second.",
    params: "p = band uv (y up); t = pocket seconds (sun y = lerp(0.30, 0.64, smoothstep(5.5, 12, t)) H); kaGlitter(colour, p, t, mask): mask 1 on water pixels, 0 elsewhere; fades out with uKaDesat." });

export const kaSkylineSurge = N("kaSkylineSurge",
  "drowned skyline, the naming shader: 23 towers whose heights are the 23 frame times (step map, no interpolation), art deco steps above 30 ms, flat condos, low-rise with a neon sign below 20 ms, 18% setback gaps at the lower roof, sunlit right 35%, halftone shade band, lit windows by hash, two-band water at the falling threshold with roofs showing through at 0.40",
  `vec3 kaTowerCol(float ub, float yd, float roof, float i, float v) {
    vec3 c = mix(${h("#8a6a7a")}, ${h("#f2d6c0")}, step(0.65, ub));
    float low = step(roof + 0.55 * (0.80 - roof), yd) * (1.0 - step(0.65, ub));
    c = mix(c, ${h("#3a2a3a")}, kaDots(6.0, 0.30) * low);
    float ry = (yd - roof) / 0.024;
    vec2 wf = vec2(fract(ub * 3.0), fract(ry)) - 0.5;
    float wd = max(abs(wf.x) - 0.28, abs(wf.y) - 0.30);
    float lit = step(0.60, kaHash(vec2(i * 7.0 + floor(ub * 3.0), floor(ry))));
    float on = step(0.5, ry);
    c = mix(c, mix(c * 0.62, ${h("#ffd27a")}, lit), cFill(wd) * on);
    c = mix(c, KA_INK, cLine(wd, 1.0) * 0.55 * on);
    return c;
  }
  vec3 kaSkylineSurge(vec2 p, float t) {
    float tt = kaTwos(t);
    float yd = 1.0 - p.y;
    float wy = kaMsY(uKaWaterMs) + 0.003 * sin(p.x * 70.0 + tt * 9.0);
    float fx = (p.x - 0.08) / KA_PITCH + 0.5;
    float fi = floor(fx);
    float u = fx - fi;
    float i = clamp(fi, 0.0, 22.0);
    float inC = step(0.0, fx) * step(fx, 23.0);
    float v = kaV(i);
    float roof = kaMsY(v);
    float inset = v > 30.0 ? (yd < roof + 0.022 ? 0.21 : (yd < roof + 0.045 ? 0.11 : 0.0)) : 0.0;
    float lo = 0.09 + inset;
    float hi = 0.91 - inset;
    float body = step(lo, u) * step(u, hi) * step(roof, yd) * inC;
    float nb = u < 0.5 ? i - 1.0 : i + 1.0;
    float gapRoof = max(roof, kaMsY(kaV(nb)));
    float gap = (1.0 - step(0.09, u) + step(0.91, u)) * step(gapRoof, yd) * inC;
    float ub = (u - lo) / (hi - lo);
    vec3 tc = kaTowerCol(ub, yd, roof, i, v);
    tc = mix(tc * 0.75, tc, step(0.5, body));
    float m = clamp(body + gap, 0.0, 1.0);
    float ed = max((abs(ub - 0.5) - 0.5) * (hi - lo) * KA_PITCH * KA_AR, roof - yd);
    vec3 c = kaSunSky(p, t);
    float sgn = step(v, 20.0) * step(0.5, kaHash(vec2(i, 11.0)));
    vec2 sq = vec2((u - 0.5) * KA_PITCH * KA_AR, yd - roof + 0.026);
    float sd = kaBox(sq, vec2(0.016, 0.011));
    vec3 sc = mix(${h("#ff3ea0")}, ${h("#2ae6ff")}, step(0.5, kaHash(vec2(i, 12.0))));
    c = mix(c, sc, cFill(sd) * sgn * inC * (1.0 - cAA(roof, wy)));
    c = mix(c, KA_INK, cLine(sd, 1.0) * sgn * inC * 0.8);
    float dry = 1.0 - cAA(wy, yd);
    c = mix(c, tc, m * (1.0 - step(wy, yd)));
    c = mix(c, KA_INK, cLine(ed, 2.0) * body * dry);
    float dd = roof - wy;
    vec3 wc = mix(${h("#1fb5b0")}, ${h("#0f6a86")}, smoothstep(0.05 - 0.0028, 0.05 + 0.0028, dd));
    wc = mix(wc * 1.22, wc, cAA(yd - wy, 0.012));
    wc = mix(wc, wc * 0.82, cAA(yd - wy, 0.14));
    float show = step(0.0, dd) * mix(0.55, 0.22, smoothstep(0.0, 0.5, dd));
    wc = mix(wc, tc, m * show);
    float w = step(wy, yd) * step(yd, 0.80);
    c = mix(c, wc, w);
    vec3 st = mix(${h("#4a3454")}, ${h("#2a1f33")}, cAA(yd, 0.815));
    c = mix(c, st, step(0.80, yd));
    c = kaGlitter(c, p, t, w);
    return cCap(c);
  }`, "kaSkylineSurge(p, t)",
  { use: "plate",
    draws: "A sunset city of 23 flat-topped towers whose heights are the stalls of a frame-time trace, sunlit on the right and shaded with print dots on the left, with a turquoise tide that drops from the roofs and drowns the low blocks, which still glow faintly under the water.",
    params: "p = band uv (y up); t = pocket seconds (sun and glints); uKaWaterMs = water threshold in ms, 40 at 5.5 s falling to 16.6 (the water map is y = 0.80 H - (v - 16)/25.5 x 0.60 H); uKaDesat 0..1 dims the glitter; uKaPx scales the dot pitch." },
  undefined, ["kaSunSky"]);

export const kaSunFlare = N("kaSunFlare",
  "trailer sun flare: three #ffb070 ghost discs (0.03, 0.05, 0.02 W at alpha 0.12, 0.08, 0.10) strung on the line from the sun through frame centre, and a 0.4 W horizontal streak 2 px thick at alpha 0.25",
  `uniform float uKaFlare;
  vec3 kaSunFlare(vec3 c, vec2 p, float t) {
    vec2 s = vec2(0.80, 1.0 - kaSunYd(t));
    vec2 cn = vec2(0.5, 0.5);
    vec3 fc = ${h("#ffb070")};
    vec3 o = c;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float m = 0.55 + 0.45 * fk;
      float r = fk < 0.5 ? 0.03 : (fk < 1.5 ? 0.05 : 0.02);
      float al = fk < 0.5 ? 0.12 : (fk < 1.5 ? 0.08 : 0.10);
      vec2 g = s + (cn - s) * m;
      float d = length((p - g) * vec2(KA_AR, 1.0)) - r * KA_AR;
      o = mix(o, fc, cFill(d) * al * step(1.0 - p.y, kaMsY(uKaWaterMs)));
    }
    float dx = abs(p.x - s.x);
    float streak = cLine(p.y - s.y, 2.0) * step(dx, 0.20) * (1.0 - dx / 0.20);
    o = mix(o, fc, streak * 0.5);
    return cCap(mix(c, o, uKaFlare));
  }`, "kaSunFlare(kaSkylineSurge(p, t), p, t)",
  { use: "screen",
    draws: "A warm orange lens flare from the low sun: three faint round discs spaced along a line toward the middle of the frame and one thin horizontal streak through the sun.",
    params: "c = colour under the flare; p = band uv; t = pocket seconds (follows the sun path); uKaFlare 0..1 fades it (1 in the skyline shots, fades with the iris in the drive)." },
  { uKaFlare: 1 });

export const kaPersistHud = N("kaPersistHud",
  "persistence HUD: a rounded minimap strip of the 23 towers (dark under the tide, lit above it) and the barcode above it, one 6 px bar per stall born at its peak and growing as the tide falls, stopped bars at 0.6 with a 1 px tick, colours by birth rank, re-rank and fade of the two smallest at the end",
  `uniform float uKaRank;
  const float KA_B[7] = float[7](41.5, 33.2, 29.4, 27.1, 23.6, 18.2, 16.9);
  const float KA_D[7] = float[7](16.6, 16.7, 21.5, 24.0, 17.0, 16.7, 16.7);
  vec3 kaBarCol(int k) {
    if (k == 0) return ${h("#5ad06a")};
    if (k == 1) return ${h("#4aa8f0")};
    if (k == 2) return ${h("#f2c14e")};
    if (k == 3) return ${h("#e85a5a")};
    if (k == 4) return ${h("#b07af0")};
    return ${h("#9a9a9a")};
  }
  vec3 kaPersistHud(vec3 c, vec2 p, float t) {
    float yd = 1.0 - p.y;
    float W = uKaWaterMs;
    vec2 mq = vec2((p.x - 0.115) * KA_AR, yd - 0.70);
    float md = kaRBox(mq, vec2(0.085 * KA_AR, 0.08), 0.02);
    vec3 o = mix(c, ${h("#1a1626")}, 0.80 * cFill(md));
    float u = (p.x - 0.03) / 0.17;
    float cf = fract(u * 23.0);
    float colI = floor(u * 23.0);
    float lv = kaV(colI);
    float hb = 0.12 + 0.80 * (lv - 16.0) / 25.5;
    float hw = 0.12 + 0.80 * (W - 16.0) / 25.5;
    float vl = (0.78 - yd) / 0.16;
    float bar = step(0.0, vl) * step(vl, hb) * step(0.12, cf) * step(cf, 0.88) * step(0.0, u) * step(u, 1.0) * step(vl, 1.0);
    vec3 bc = vl < hw ? ${h("#26405a")} : ${h("#f2d6c0")};
    o = mix(o, bc, bar * cFill(md + 0.004));
    o = mix(o, KA_INK, cLine(md, 1.0) * 0.8);
    float q = floor(clamp(uKaRank, 0.0, 1.0) * 6.0 + 0.01) / 6.0;
    float fade = 1.0 - clamp(uKaRank * 2.0, 0.0, 1.0);
    for (int k = 0; k < 7; k++) {
      float b = KA_B[k];
      float d = KA_D[k];
      float row = float(k);
      if (k == 3) row = mix(3.0, 4.0, q);
      if (k == 4) row = mix(4.0, 3.0, q);
      float len = max(b - max(d, W), 0.0) * 0.17 / 25.5 * KA_AR;
      float born = step(W, b);
      float stopped = step(W, d);
      float al = born * mix(1.0, 1.0, stopped) * (k >= 5 ? fade : 1.0);
      vec2 bq = vec2(p.x * KA_AR - 0.03 * KA_AR - len * 0.5, yd - (0.61 - 0.0187 * (row + 0.5)));
      float bd = kaBox(bq, vec2(len * 0.5, 0.0056));
      vec3 col = mix(kaBarCol(k), vec3(cLuma(kaBarCol(k))), uKaDesat);
      float inBar = cFill(bd) * step(0.001, len);
      o = mix(o, col, inBar * al);
      o = mix(o, col * 0.55, cLine(bd, 1.0) * inBar * al);
      vec2 tq = vec2(p.x * KA_AR - 0.03 * KA_AR - len, yd - (0.61 - 0.0187 * (row + 0.5)));
      float tk = cFill(kaBox(tq, vec2(0.5 / 535.6, 0.0095))) * stopped * born * (k >= 5 ? fade : 1.0);
      o = mix(o, KA_INK, tk * 0.9);
    }
    return o;
  }`, "kaPersistHud(kaSkylineSurge(p, t), p, t)",
  { use: "card",
    draws: "A small rounded map strip at the lower left showing the 23 towers as lit or drowned columns, with a stack of thin coloured bars above it, one per stall, that lengthen as the tide falls and halt with a tiny tick, then re-order and thin out to five.",
    params: "c = colour under the HUD; p = band uv; uKaWaterMs = tide in ms (bars grow as b - max(d, W) at 0.17 W per 25.5 ms, born when W <= b); uKaRank 0..1 over f126 to f131 swaps rows of frames 17 and 13 and fades the two smallest; uKaDesat greys the bars." },
  { uKaRank: 0 });

export const kaHalftoneShadow = N("kaHalftoneShadow",
  "printed shadow dots: in the darkest value band (Y below 0.30) a 45 degree grid of 6 px dots with radius 0.5 clamp((0.30 - Y)/0.20, 0, 1) multiplies the colour by 0.55; world and cast only",
  `vec3 kaHalftoneShadow(vec3 c, vec2 p) {
    float Y = cLuma(c);
    float band = clamp((0.30 - Y) / 0.20, 0.0, 1.0);
    float g = 1.0 - cAA(Y, 0.30);
    float dots = kaDots(6.0, 0.5 * band);
    return mix(c, c * 0.55, dots * g);
  }`, "kaHalftoneShadow(kaStormStreet(p, t), p)",
  { use: "screen",
    draws: "Small darker dots printed on a diagonal grid inside the darkest shadows, bigger the deeper the dark, like offset-print shadow on a poster; lit areas are left clean.",
    params: "c = world or cast colour before the grade (never HUD or cards); p = band uv; uKaPx = pixel scale of the 6 px pitch." });

export const kaGradeKeyArt = N("kaGradeKeyArt",
  "trailer grade last: storm multiplier 0.82, teal #0f3a4a shadow and #ff9a4a hot highlight split tone at 0.30 by smoothstep(0.2, 0.8, Y), grey card desaturation to 0.92 luma with corner vignette, grain on twos weighted by 1 - Y, luma cap 0.92 and ink-floor lift to #0b0a10",
  `uniform float uKaStorm;
  uniform float uKaB5;
  vec3 kaGradeKeyArt(vec3 c, vec2 p, float t) {
    c *= mix(1.0, 0.82, uKaStorm);
    float Y = max(cLuma(c), 1e-4);
    vec3 ts = ${h("#0f3a4a")} / 0.1962;
    vec3 th = ${h("#ff9a4a")} / 0.6655;
    float w = smoothstep(0.2, 0.8, Y);
    c *= mix(mix(vec3(1.0), ts, 0.30), mix(vec3(1.0), th, 0.30), w);
    c = mix(c, vec3(cLuma(c)) * 0.92, 0.85 * uKaDesat);
    vec2 d = p - 0.5;
    c *= 1.0 - 0.15 * uKaDesat * clamp(dot(d, d) * 3.2, 0.0, 1.0);
    Y = cLuma(c);
    float rate = mix(12.0, 24.0, uKaB5);
    float gr = cH21(floor(gl_FragCoord.xy) + 17.0 * floor(rate * t + 0.02));
    c += 0.025 * (1.0 - Y) * (gr - 0.5);
    c = cCap(c);
    Y = cLuma(c);
    return mix(KA_INK, c, smoothstep(0.035, 0.08, Y));
  }`, "kaGradeKeyArt(kaSkylineSurge(p, t), p, t)",
  { use: "grade",
    draws: "The whole frame pulled to a cinema trailer look: teal in the shadows, hot orange in the lights, fine grain re-rolled twelve times a second, a grey drained card with dark corners on demand, and nothing pure black or blown white.",
    params: "c = frame colour; p = band uv; t = pocket seconds (grain seed 17 floor(12 t), 24 Hz when uKaB5 = 1); uKaStorm 1 in the storm shots (x0.82 before the tone); uKaDesat 0..1 for the grey merge card." },
  { uKaStorm: 0, uKaB5: 0 });

export const CUT_SHADERS = [
  kaKit, kaBeachDayPlate, kaPhoneInset, kaStormStreet, kaNeonFlood, kaSeawallSurge, kaRainStreaks, kaWantedStars,
  kaKelvinWake, kaSunSky, kaSkylineSurge, kaSunFlare, kaPersistHud, kaHalftoneShadow, kaGradeKeyArt,
];
const owner = new Map();
for (const t of CUT_SHADERS) for (const m of t.glsl.matchAll(/^\s*(?:float|vec[234]|void)\s+(ka\w+)\s*\(/gm)) owner.set(m[1], t);
for (const t of CUT_SHADERS) for (const m of (t.glsl + t.demo).matchAll(/(ka\w+)\s*\(/g)) {
  const o = owner.get(m[1]);
  if (o && o !== t && !t.deps.includes(o.name)) t.deps.push(o.name);
}

export const CUT_SHADER_COUNT = CUT_SHADERS.length;
export default CUT_SHADERS;
