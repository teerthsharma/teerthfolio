// pr-tensorflow-128930 packet shaders: Toho kaiju night harbour (Godsealzilla, the fake ranked above the real, nine dorsal plates, a disguise burning off).
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-tensorflow-128930";
const v2 = (x, y) => ({ x, y, isVector2: true });
const U = (o, d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { value: o[k] ?? v }]));
const mk = (name, doc, glsl, demo, x) => ({ ...M(name, F, doc, glsl, demo), deps: ["cutKit", "gzKit"], suits: [F], ...x });

export const gzKit = {
  name: "gzKit", family: F, deps: ["cutKit"],
  doc: "pr-tensorflow-128930 shared law: ink #0a0d12, night and dawn ramps, sea, window pair, hide and metal palettes, glow pair, twos and threes clocks, seeded hash and Worley, fin lock count",
  uniforms: (o = {}) => U(o, { uGzSeed: 0, uGzLock: 0 }),
  glsl: `
const vec3 GZ_INK = vec3(0.0392, 0.0510, 0.0706);
const vec3 GZ_SKYTOP = vec3(0.0235, 0.0353, 0.0588);
const vec3 GZ_SKYLOW = vec3(0.0784, 0.1020, 0.1490);
const vec3 GZ_DAWNLO = vec3(0.2275, 0.2745, 0.3373);
const vec3 GZ_DAWNHI = vec3(0.6588, 0.6902, 0.7216);
const vec3 GZ_SEA = vec3(0.0392, 0.0784, 0.1255);
const vec3 GZ_WARM = vec3(1.0, 0.8471, 0.5412);
const vec3 GZ_COLD = vec3(0.8118, 0.8941, 1.0);
const vec3 GZ_CYAN = vec3(0.2275, 0.7843, 1.0);
const vec3 GZ_CYANHI = vec3(0.7490, 0.9373, 1.0);
const vec3 GZ_AMBER = vec3(1.0, 0.6980, 0.2902);
const vec3 GZ_SCREEN = vec3(0.0549, 0.0863, 0.1255);
const vec3 GZ_TYPE = vec3(0.9098, 0.9333, 0.9569);
uniform float uGzSeed;
uniform float uGzLock;
float gzTwos(float t) { return floor(t * 12.0 + 0.02) / 12.0; }
float gzThrees(float t) { return floor(t * 4.0 + 0.02) / 4.0; }
float gzBand(float v, float lo, float hi) { return cAA(v, lo) * (1.0 - cAA(v, hi)); }
float gzHash(vec2 p) { return cH21(p + vec2(uGzSeed * 7.31, uGzSeed * 3.17)); }
vec3 gzLift(vec3 c) { return mix(GZ_INK, c, smoothstep(0.035, 0.08, cLuma(c))); }
vec3 gzBack(vec2 p) { return mix(GZ_SKYLOW, GZ_SKYTOP, cAA(p.y, 0.55)); }
float gzSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
float gzWorley(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      d = min(d, length(g + cH22(i + g + vec2(uGzSeed)) - f));
    }
  }
  return d;
}`,
};

export const gzHarborSky = mk("gzHarborSky", "harbour sky: night ramp #06090f to #141a26 in four hard steps, three dark rain-cloud banks, stepped three-drawing dissolve to the dawn ramp #3a4656 to #a8b0b8",
  `uniform float uGzDawn;
vec3 gzHarborSky(vec2 p, float t) {
  float w = cFbm(vec2(p.x * 2.2 + gzTwos(t) * 0.015, p.y * 5.0));
  float y = p.y + (w - 0.5) * 0.06;
  float d3 = floor(clamp(uGzDawn, 0.0, 1.0) * 3.0 + 0.02) / 3.0;
  vec3 lo = mix(GZ_SKYLOW, GZ_DAWNLO, d3), hi = mix(GZ_SKYTOP, GZ_DAWNHI, d3);
  vec3 c = mix(lo, mix(lo, hi, 0.34), cAA(y, 0.25));
  c = mix(c, mix(lo, hi, 0.67), cAA(y, 0.50));
  c = mix(c, hi, cAA(y, 0.75));
  vec3 bank = mix(GZ_SKYTOP * 0.9, GZ_DAWNLO * 1.1, d3);
  for (int k = 0; k < 3; k++) {
    float cy = 0.52 + 0.17 * float(k);
    float d = abs(y - cy - 0.02 * sin(p.x * 4.0 + float(k) * 2.3)) - 0.035 * (0.5 + cFbm(vec2(p.x * 2.5 + float(k) * 7.0, 0.3)));
    c = mix(c, bank, cFill(d));
  }
  return cCap(gzLift(c));
}`, "gzHarborSky(p, t)",
  { uniforms: (o = {}) => U(o, { uGzDawn: 0 }), use: "plate",
    draws: "A night sky in four flat blue-black steps with three dark rain-cloud banks, which steps in three drawings to a grey dawn.",
    params: "uGzDawn: 0 night to 1 dawn, quantised to three steps (f110 to f113); t: wobbles the band edge on twos" });

export const gzSkyline = mk("gzSkyline", "far city skyline: three parallax rows of flat blocks, 0.03 W columns, windows lit where hash > 0.6, warm #ffd88a or cold #cfe4ff, 1 px #070a0e silhouette",
  `uniform float uGzShift;
vec3 gzSkyline(vec2 p, float t) {
  vec3 c = gzBack(p);
  for (int k = 2; k >= 0; k--) {
    float fk = float(k);
    float x = p.x + uGzShift * (0.1 + 0.125 * fk);
    float col = floor(x / 0.03);
    float h = 0.20 + 0.16 * gzHash(vec2(col, fk)) - 0.025 * (2.0 - fk);
    vec3 wall = mix(GZ_SKYLOW * 1.1, vec3(0.102, 0.125, 0.157), (fk + 1.0) / 3.0);
    float body = 1.0 - cAA(p.y, h);
    vec2 g = vec2(x / 0.03 * 3.0, p.y * 46.0);
    vec2 cell = floor(g);
    float lit = step(0.6, gzHash(cell + fk * 5.0)) * cFill(max(abs(fract(g.x) - 0.5) - 0.26, abs(fract(g.y) - 0.5) - 0.28));
    vec3 win = mix(GZ_WARM, GZ_COLD, step(0.5, gzHash(cell + 31.0)));
    vec3 b = mix(wall, win * 0.85, lit * cAA(h - p.y, 0.012));
    c = mix(c, b, body);
    c = mix(c, vec3(0.0275, 0.0392, 0.0549), cLine(p.y - h, 1.0) * body);
  }
  return cCap(gzLift(c));
}`, "gzSkyline(p, t)",
  { uniforms: (o = {}) => U(o, { uGzShift: 0 }), use: "plate",
    draws: "A far night skyline of three rows of dark blocks with scattered lit windows in warm yellow and cold white and a thin dark rim along the roofs.",
    params: "uGzShift: parallax slide (rows move 0.1, 0.225, 0.35 of it); uGzSeed: which windows are lit" });

export const gzNearBlocks = mk("gzNearBlocks", "near quay block face: #1a2028 wall in three tones, #3a4450 lit side, window grid, red #e8303a siren wash alternating on twos, cyan fin light climbing with the lock count",
  `uniform float uGzCols;
uniform float uGzRows;
uniform float uGzSiren;
vec3 gzNearBlocks(vec2 p, float t) {
  vec3 wall = cCel3(p.x, 0.34, 0.72, vec3(0.063, 0.078, 0.102), vec3(0.102, 0.125, 0.157), vec3(0.227, 0.267, 0.314));
  vec2 g = vec2(p.x * uGzCols, p.y * uGzRows);
  vec2 f = fract(g);
  float pane = cFill(max(abs(f.x - 0.5) - 0.30, abs(f.y - 0.5) - 0.30));
  vec2 cell = floor(g);
  float lit = step(0.6, gzHash(cell));
  vec3 win = mix(GZ_WARM, GZ_COLD, step(0.5, gzHash(cell + 17.0)));
  vec3 c = mix(wall, mix(wall * 0.6, win * 0.85, lit), pane);
  float side = mix(p.x, 1.0 - p.x, step(0.0, uGzSiren));
  float flash = step(0.5, fract(gzTwos(t) * 3.0)) * abs(clamp(uGzSiren, -1.0, 1.0));
  c = mix(c, vec3(0.910, 0.188, 0.227) * 0.8, flash * step(0.35, side) * 0.55);
  float glow = floor(clamp(uGzLock / 9.0, 0.0, 1.0) * (1.0 - p.x) * 3.0 + 0.5) / 3.0;
  c = mix(c, GZ_CYAN, glow * 0.45);
  c = mix(c, vec3(0.0275, 0.0392, 0.0549), cLine(p.x - 0.0, 1.0) + cLine(p.y - 0.985, 1.0));
  return cCap(gzLift(c));
}`, "gzNearBlocks(p, t)",
  { uniforms: (o = {}) => U(o, { uGzCols: 8, uGzRows: 22, uGzSiren: 0 }), use: "surface",
    draws: "A dark quay building face in three flat tones with a grid of lit and unlit windows, red wash flicking from one side, then cyan creeping across it from the creature's side.",
    params: "uGzCols/Rows: window grid; uGzSiren: -1 left to 1 right wash side, 0 off; uGzLock: fin lock count 0 to 9 sets the cyan; uGzSeed: which windows are lit" });

export const gzBayWater = mk("gzBayWater", "bay water: #0a1420 in three flat bands, lit windows doubled as vertical streaks, ripple 0.004 sin(40 y + 9 t) on twos, wake foam V behind the hero",
  `uniform float uGzWake;
vec3 gzBayWater(vec2 p, float t) {
  float tt = gzTwos(t);
  float x = p.x + 0.004 * sin(40.0 * p.y + 9.0 * tt);
  vec3 c = cCel3(p.y, 0.30, 0.65, GZ_SEA * 0.8, GZ_SEA, GZ_SEA * 1.5);
  float col = floor(x * 80.0);
  float strand = step(0.62, gzHash(vec2(col, 3.0))) * step(abs(fract(x * 80.0) - 0.5), 0.30);
  float len = 0.12 + 0.35 * gzHash(vec2(col, 9.0));
  float fall = 1.0 - cAA(0.85 - p.y, len);
  vec3 win = mix(GZ_WARM, GZ_COLD, step(0.5, gzHash(vec2(col, 5.0))));
  float lv = step(0.5, fract(p.y * 18.0 + tt)) * 0.5 + 0.5;
  c = mix(c, mix(c, win, 0.35), strand * fall * lv);
  vec2 q = vec2(p.x - uGzWake, p.y - 0.5);
  float v = cLine(abs(q.y) * 1.1 - max(-q.x, 0.0) * 0.36, 2.0) * step(q.x, 0.0) * step(-0.5, q.x);
  c = mix(c, vec3(0.604, 0.659, 0.706), v * 0.5 * step(0.5, uGzWake));
  return cCap(gzLift(c));
}`, "gzBayWater(p, t)",
  { uniforms: (o = {}) => U(o, { uGzWake: 0 }), use: "plate",
    draws: "Dark harbour water in three flat bands with the city windows doubled as wavering vertical streaks, and a pale V of foam behind the wader.",
    params: "uGzWake: x of the wake tip in frame units, 0 off; t: ripple on twos; uGzSeed: which streaks are lit" });

export const gzRainField = mk("gzRainField", "rain: 260 columns of 1 px streaks slanted 80 degrees, length 0.04 to 0.09, alpha 0.28 #cfe4ff, stepping on twos, stops at f126",
  `uniform float uGzRain;
vec3 gzRainField(vec2 p, float t) {
  vec3 base = gzBack(p);
  vec2 q = vec2(p.x + p.y * 0.176, p.y);
  float colf = q.x * 260.0;
  float id = floor(colf);
  float h1 = gzHash(vec2(id, 1.0)), h2 = gzHash(vec2(id, 2.0)), h3 = gzHash(vec2(id, 3.0));
  float yy = fract(q.y + h1 - gzTwos(t) * (0.9 + 0.8 * h2));
  float len = 0.04 + 0.05 * h2;
  float streak = step(yy, len) * step(abs(fract(colf) - 0.5), 0.14) * step(0.45, h3);
  return cCap(gzLift(mix(base, GZ_COLD, streak * 0.28 * clamp(uGzRain, 0.0, 1.0))));
}`, "gzRainField(p, t)",
  { uniforms: (o = {}) => U(o, { uGzRain: 1 }), use: "screen",
    draws: "Thin pale slanted rain streaks falling over a dark night, each stepping down in jumps, none touching its neighbour.",
    params: "uGzRain: 1 steady rain, 0 clean (set 0 from 10.5 s); t: fall on twos; uGzSeed: streak pattern" });

export const gzHidePebble = mk("gzHidePebble", "kaiju hide: three hard bands on #2a2c30 (lit #44484e, deep #16181b), Worley scale pebbling breaking the band edges, rim band toward the window light; uGzFake 1 = smooth #34363a impostor",
  `uniform float uGzFake;
vec3 gzHidePebble(vec2 p, float t) {
  vec2 c0 = cN(p);
  float l = cNdL(p);
  float peb = (gzWorley(p * 24.0) - 0.5) * 0.12 * (1.0 - clamp(uGzFake, 0.0, 1.0));
  l = l + peb;
  float s1 = step(0.32, l), s2 = step(0.74, l);
  vec3 alb = mix(vec3(0.165, 0.173, 0.188), vec3(0.204, 0.212, 0.227), clamp(uGzFake, 0.0, 1.0));
  vec3 c = alb * (0.50 + 0.30 * s1 + 0.20 * s2);
  float nv = sqrt(max(0.0, 0.22 - dot(c0, c0))) / sqrt(0.22);
  float rim = step(0.5, pow(1.0 - max(nv, 0.0), 4.0)) * step(0.0, dot(normalize(c0 + 1e-4), vec2(-0.7, 0.7)));
  c = mix(c, mix(GZ_WARM, GZ_CYAN, clamp(uGzLock / 9.0, 0.0, 1.0)) * 0.7, rim * 0.6);
  return cCap(c);
}`, "mix(gzBack(p), gzHidePebble(p, t), cCover(p))",
  { uniforms: (o = {}) => U(o, { uGzFake: 0 }), use: "surface",
    draws: "A charcoal scaled hide in three flat bands, the band edges broken into scales, with a thin warm or cyan rim along the lit edge; at 1 the same hide smooth and a step lighter.",
    params: "uGzFake: 0 real pebbled hide, 1 smooth impostor skin; uGzLock: fin lock count turns the rim warm to cyan; uGzSeed: scale layout" });

export const gzFinRow = mk("gzFinRow", "nine dorsal plates tail to head: dormant #3a4048, lock n lights column n-1 three-banded #3ac8ff to #bfefff with a 12 percent overshoot for one drawing, all snap shut on fire",
  `uniform float uGzFired;
uniform float uGzDecay;
vec3 gzFinRow(vec2 p, float t) {
  float cx = p.x * 9.0;
  float j = clamp(floor(cx), 0.0, 8.0);
  float u = fract(cx) - 0.5;
  float hj = 0.07 + 0.11 * sin(3.14159265 * (j + 0.5) / 9.0);
  float since = uGzLock - (j + 1.0);
  float locked = step(0.0, since) * (1.0 - clamp(uGzFired, 0.0, 1.0));
  float pulse = locked * step(since, 0.5);
  float tall = (0.20 + hj * 3.0) * (1.0 + 0.12 * pulse) * (1.0 + 0.08 * locked);
  float ht = (p.y - 0.12) / tall;
  float d = max(abs(u) - 0.40 * (1.0 - ht * ht), max(-ht, ht - 1.0) * 0.2);
  float e = locked * (0.85 + 0.15 * pulse) * clamp(uGzDecay, 0.0, 1.0);
  vec3 glow = cCel3(ht, 0.30, 0.70, GZ_CYAN * 0.55, GZ_CYAN, GZ_CYANHI);
  vec3 c = mix(vec3(0.227, 0.251, 0.282), glow, step(0.5, e));
  c = mix(c, vec3(0.102, 0.114, 0.129), step(abs(u), 0.04) * step(0.1, ht) * (1.0 - step(0.5, e) * 0.6));
  c = mix(gzBack(p), c, cFill(d));
  c = mix(c, GZ_INK, cLine(d, 2.2));
  return cCap(c);
}`, "gzFinRow(p, t)",
  { uniforms: (o = {}) => U(o, { uGzFired: 0, uGzDecay: 1 }), use: "surface",
    draws: "A row of nine rounded crystal flipper-fins, largest mid-row, grey and dark until each in turn shoots up a little and lights cyan with a white tip.",
    params: "uGzLock: lock count 0 to 9 (n(f)), the fractional part under 0.5 is the overshoot drawing; uGzFired: 1 snaps every fin shut dark; uGzDecay: 1 to 0 fades the glow after the breath" });

export const gzMechaMetal = mk("gzMechaMetal", "riveted mecha plates on the pup body: lit #b8c0c8 / shade #6a727c, #2a3038 seams, rivets, hard spec band #e8f0f8, red #ff3a2a visor band",
  `uniform float uGzVisor;
vec3 gzMechaMetal(vec2 p, float t) {
  vec2 c0 = cN(p);
  float h = cNdL(p);
  vec2 g = p * vec2(7.0, 6.0);
  vec2 id = floor(g), f = fract(g);
  float tilt = (gzHash(id) - 0.5) * 0.18;
  float l = h + tilt;
  vec3 c = cCel3(l, 0.34, 0.72, vec3(0.416, 0.447, 0.486) * 0.8, vec3(0.416, 0.447, 0.486), vec3(0.722, 0.753, 0.784));
  c = mix(c, vec3(0.910, 0.941, 0.973), step(0.90, pow(clamp(l, 0.0, 1.0), 4.0)) * 0.9);
  float seam = cLine(min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)), 2.0);
  c = mix(c, vec3(0.165, 0.188, 0.220), seam);
  vec2 rv = abs(f - 0.5) - vec2(0.38);
  c = mix(c, vec3(0.165, 0.188, 0.220), cFill(length(rv) - 0.05) * 0.8);
  float vis = cFill(max(abs(c0.y - 0.06) - 0.035, abs(c0.x) - 0.30));
  c = mix(c, vec3(1.0, 0.227, 0.165) * clamp(uGzVisor, 0.0, 1.0), vis * step(0.02, uGzVisor));
  c = mix(c, vec3(0.165, 0.188, 0.220), cLine(max(abs(c0.y - 0.06) - 0.035, abs(c0.x) - 0.30), 1.6) * 0.8);
  return cCap(c);
}`, "mix(gzBack(p), gzMechaMetal(p, t), cCover(p))",
  { uniforms: (o = {}) => U(o, { uGzVisor: 0.9 }), use: "surface",
    draws: "Silver riveted armour plates in three flat tones with dark seams and a hard white highlight, and a red glowing visor band across the eyes.",
    params: "uGzVisor: 0 dark to 1 full red (flare 0.9, steady 0.5, gutter 0.5 to 0.1); uGzSeed: which plates tilt" });

export const gzDisguiseBurn = mk("gzDisguiseBurn", "disguise burning off: smooth #34363a skin over gzMechaMetal, a_skin = step(tau, 0.35 n + |p - i|/R), ember edge #ff5a1a / #ffb24a, tau = 1.4 clamp((t - 8.333) / 0.5)",
  `uniform float uGzTau;
uniform float uGzImpX;
uniform float uGzImpY;
vec3 gzDisguiseBurn(vec2 p, float t) {
  float h = cNdL(p);
  vec3 skin = vec3(0.204, 0.212, 0.227) * (0.50 + 0.30 * step(0.32, h) + 0.20 * step(0.74, h));
  vec3 metal = gzMechaMetal(p, t);
  float field = 0.35 * cVn(p * 14.0) + length(p - vec2(uGzImpX, uGzImpY)) / 0.28;
  float a = step(uGzTau, field);
  float e = smoothstep(0.06, 0.0, abs(field - uGzTau)) * step(0.01, uGzTau);
  vec3 ember = mix(vec3(1.0, 0.353, 0.102), GZ_AMBER, step(0.5, e));
  vec3 c = mix(metal, skin, a);
  c = mix(c, ember, step(0.15, e));
  return cCap(c);
}`, "mix(gzBack(p), gzDisguiseBurn(p, t), cCover(p))",
  { deps: ["cutKit", "gzKit", "gzMechaMetal"], uniforms: (o = {}) => U(o, { uGzTau: 0.7, uGzImpX: 0.72, uGzImpY: 0.52 }), use: "surface",
    draws: "A smooth dark grey skin eaten away from one impact point by a ragged orange-and-amber burning edge, silver riveted armour showing in the burnt gap.",
    params: "uGzTau: burn progress 0 to 1.4; uGzImpX/uGzImpY: impact point in frame units; uGzSeed: plate tilts" });

export const gzRankBoard = mk("gzRankBoard", "ranked board card: #0e1620 screen, block-type header and three rows (real, real, padding) whose heights ease by rank, rows fade by smoothstep(K, K-0.5, rank), padding row dashed and typeset like the others, #ffb24a stamp",
  `uniform float uGzRankA;
uniform float uGzRankB;
uniform float uGzRankP;
uniform float uGzK;
uniform float uGzStamp;
float gzRow(vec2 p, float rank, float seed) {
  float y = 0.76 - 0.20 * rank;
  float d = max(abs(p.x - 0.5) - 0.42, abs(p.y - y) - 0.075);
  return d;
}
vec3 gzRankBoard(vec2 p, float t) {
  vec3 c = GZ_SCREEN;
  float hd = max(abs(p.x - 0.28) - 0.22, abs(p.y - 0.93) - 0.025);
  float hx = step(0.3, gzHash(vec2(floor(p.x * 34.0), 1.0))) * step(abs(fract(p.x * 34.0) - 0.5), 0.34);
  c = mix(c, GZ_TYPE, cFill(hd) * hx);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float rank = fk < 0.5 ? uGzRankA : (fk < 1.5 ? uGzRankB : uGzRankP);
    float al = smoothstep(uGzK, uGzK - 0.5, rank) * (fk > 1.5 ? 0.35 : 1.0);
    float d = gzRow(p, rank, fk);
    vec3 row = vec3(0.110, 0.165, 0.227);
    float dash = fk > 1.5 ? step(0.5, fract(p.x * 80.0)) : 1.0;
    float gx = floor(p.x * 30.0);
    float glyph = step(0.3, gzHash(vec2(gx, fk + 4.0))) * step(abs(fract(p.x * 30.0) - 0.5), 0.34) * step(abs(p.y - (0.76 - 0.20 * rank)), 0.035);
    vec3 r = mix(row, GZ_TYPE, glyph);
    c = mix(c, r, cFill(d) * al * mix(1.0, dash, step(1.5, fk)));
    float stamp = step(0.5, uGzStamp) * step(1.5, fk);
    c = mix(c, GZ_AMBER, cLine(d - 0.01, 2.4) * stamp);
  }
  return cCap(c);
}`, "gzRankBoard(p, t)",
  { uniforms: (o = {}) => U(o, { uGzRankA: 1, uGzRankB: 2, uGzRankP: 0, uGzK: 2, uGzStamp: 0 }), use: "card",
    draws: "A dark screen with a block-lettered title and three ranked bars with chunky white text, one dashed and faint; bars slide up and down as the ranking changes and the dashed one can wear an amber stamp box.",
    params: "uGzRankA/B/P: slot of each row (0 top); uGzK: visible slots (2 main, 4 inset); uGzStamp: 1 draws the amber stamp on the padding row; uGzSeed: glyph layout" });

export const gzBrackets = mk("gzBrackets", "targeting brackets on a map screen: five boxes, four corner strokes each drawing on one corner per 1.5 drawings from f24 + 3i, two dashed at 0.35, candidate 2 sliding into 1 over f38 to f42",
  `uniform float uGzFrame;
vec3 gzBrackets(vec2 p, float t) {
  vec3 c = mix(GZ_SCREEN, GZ_SCREEN * 1.5, step(0.5, fract(p.x * 12.0)) * step(0.5, fract(p.y * 9.0)) * 0.5);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 cen = vec2(0.17 + 0.17 * fi, 0.34 + 0.32 * gzHash(vec2(fi, 7.0)));
    float s = 0.065 + 0.02 * gzHash(vec2(fi, 8.0));
    float al = fi > 2.5 ? 0.35 : 1.0;
    float u = clamp((uGzFrame - 38.0) / 4.0, 0.0, 1.0);
    if (i == 2) {
      vec2 w = vec2(0.17 + 0.17, 0.34 + 0.32 * gzHash(vec2(1.0, 7.0)));
      cen = mix(cen, w, u * u * u);
      al = al * (1.0 - u) * (1.0 - u);
    }
    float prog = clamp((uGzFrame - (24.0 + 3.0 * fi)) / 6.0, 0.0, 1.0);
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float on = step(fk + 1.0, floor(4.0 * prog));
      vec2 sg = vec2(mod(fk, 2.0) * 2.0 - 1.0, floor(fk * 0.5) * 2.0 - 1.0);
      vec2 cp = cen + sg * s;
      float d = min(gzSeg(p, cp, cp - vec2(sg.x * 0.44 * s, 0.0)), gzSeg(p, cp, cp - vec2(0.0, sg.y * 0.44 * s)));
      float dash = fi > 2.5 ? step(0.5, fract(dot(p, vec2(60.0, 60.0)))) : 1.0;
      c = mix(c, GZ_TYPE, cLine(d - 0.002, 1.6) * on * al * dash);
    }
  }
  return cCap(c);
}`, "gzBrackets(p, t)",
  { uniforms: (o = {}) => U(o, { uGzFrame: 40 }), use: "card",
    draws: "A dark grid map with five square target brackets drawn corner by corner in white, the last two dashed and faint, one bracket sliding into its neighbour and fading.",
    params: "uGzFrame: drawing index f (24 to 53); uGzSeed: not used" });

export const gzBreathBeam = mk("gzBreathBeam", "atomic breath: capsule m to c, white core #f4fdff, cyan halo #3ac8ff in two hard bands, spiral sheath step(0.6, sin(6 theta + 40 along - 30 t)), thin-line mode for the last drawing",
  `uniform vec2 uGzMouth;
uniform vec2 uGzTarget;
uniform float uGzThin;
vec3 gzBreathBeam(vec2 p, float t) {
  vec3 base = gzBack(p);
  vec2 ba = uGzTarget - uGzMouth;
  float L = max(length(ba), 1e-4);
  vec2 dir = ba / L;
  float along = dot(p - uGzMouth, dir);
  float perp = dot(p - uGzMouth, vec2(-dir.y, dir.x));
  float d = gzSeg(p, uGzMouth, uGzTarget);
  float w = mix(0.035, 0.004, clamp(uGzThin, 0.0, 1.0));
  float tt = floor(t * 24.0 + 0.02) / 24.0;
  float theta = asin(clamp(perp / max(w, 1e-4), -1.0, 1.0));
  float sheath = step(0.6, 0.5 + 0.5 * sin(6.0 * theta + 40.0 * along - 30.0 * tt)) * smoothstep(0.02, 0.0, abs(d - 0.5 * w)) * 0.5;
  vec3 c = mix(base, GZ_CYAN * 0.7, (1.0 - cAA(d, w)) * 0.8);
  c = mix(c, GZ_CYAN, 1.0 - cAA(d, w * 0.5));
  c = mix(c, GZ_CYANHI, sheath);
  c = mix(c, vec3(0.957, 0.992, 1.0), (1.0 - cAA(d, w * 0.23)) * (1.0 - clamp(uGzThin, 0.0, 1.0) * 0.4));
  return cCap(c);
}`, "gzBreathBeam(p, t)",
  { uniforms: (o = {}) => U(o, { uGzMouth: v2(0.28, 0.72), uGzTarget: v2(0.78, 0.60), uGzThin: 0 }), use: "line",
    draws: "One straight cyan beam with a white core and a wound spiral of pale stripes round it, crossing the frame from the creature's mouth to the target; at 1 it thins to a hairline.",
    params: "uGzMouth/uGzTarget: endpoints in frame units; uGzThin: 0 full beam, 1 thin thread; t: spiral turns on the 24 fps clock" });

export const gzChargeGrade = mk("gzChargeGrade", "charge grade: split tone with shadow tint #06090f and a highlight tint stepping #cfe4ff to #3ac8ff (charge) to #a8b0b8 (dawn), uCrush darkening, luma cap 0.92, ink-floor lift",
  `uniform float uGzGradeK;
uniform float uGzCrush;
vec3 gzChargeGrade(vec3 col) {
  float y = max(cLuma(col), 1e-3);
  col = col * (1.0 - 0.25 * clamp(uGzCrush, 0.0, 1.0));
  vec3 ts = vec3(0.0235, 0.0353, 0.0588) / max(cLuma(vec3(0.0235, 0.0353, 0.0588)), 1e-3);
  float k = clamp(uGzGradeK, 0.0, 2.0);
  vec3 hi = mix(mix(GZ_COLD, GZ_CYAN, clamp(k, 0.0, 1.0)), vec3(0.659, 0.690, 0.722), clamp(k - 1.0, 0.0, 1.0));
  vec3 th = hi / max(cLuma(hi), 1e-3);
  float w = floor(smoothstep(0.2, 0.8, y) * 4.0 + 0.5) / 4.0;
  vec3 g = col * mix(mix(vec3(1.0), ts, 0.30), mix(vec3(1.0), th, 0.30), w);
  return gzLift(cCap(g));
}`, "gzChargeGrade(gzBack(p) * (0.4 + 1.6 * p.x))",
  { uniforms: (o = {}) => U(o, { uGzGradeK: 1, uGzCrush: 0 }), use: "grade",
    draws: "The whole frame in blue-black shadows and highlights that run cold white, then cyan as the plates charge, then dull grey at dawn, with an optional darkening and no pixel brighter than 0.92 or blacker than ink.",
    params: "input colour only; uGzGradeK: 0 night, 1 charge and breath, 2 dawn; uGzCrush: 0 to 0.35 darkens the frame (the broken-sort beat)" });

export const PACKET_SHADERS = [
  gzKit, gzHarborSky, gzSkyline, gzNearBlocks, gzBayWater, gzRainField, gzHidePebble, gzFinRow, gzMechaMetal,
  gzDisguiseBurn, gzRankBoard, gzBrackets, gzBreathBeam, gzChargeGrade,
];
export default PACKET_SHADERS;
