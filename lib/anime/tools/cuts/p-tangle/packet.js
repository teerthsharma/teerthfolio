// p-tangle packet shaders: Your Name kataware-doki (Shinkai painted dusk, comet Tiamat, red braided cord, gold dissolve).
import { defineCut as M } from "../kit.glsl.js";

const F = "p-tangle";
const v2 = (x, y) => ({ x, y, isVector2: true });
const v3 = (x, y, z) => ({ x, y, z, isVector3: true });
const U = (o, d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { value: o[k] ?? v }]));
const mk = (name, doc, glsl, demo, x) => ({ ...M(name, F, doc, glsl, demo), deps: ["cutKit", "tgKit"], suits: [F], ...x });

export const tgKit = {
  name: "tgKit", family: F, deps: ["cutKit"],
  doc: "p-tangle shared law: six-stop dusk ramp, comet-night ramp, drain, sun position, twos and threes clocks, hex and segment distance",
  uniforms: (o = {}) => U(o, { uTgNight: 0, uTgDrain: 0, uTgSun: v2(0.5, 0.69) }),
  glsl: `
const vec3 TG_INK = vec3(0.102, 0.055, 0.086);
const vec3 TG_LINE = vec3(0.192, 0.137, 0.231);
const vec3 TG_GOLD = vec3(1.0, 0.839, 0.627);
const vec2 TG_ASP = vec2(1.6, 1.0);
uniform float uTgNight;
uniform float uTgDrain;
uniform vec2 uTgSun;
float tgTwos(float t) { return floor(t * 12.0 + 1e-4) / 12.0; }
float tgThrees(float t) { return floor(t * 8.0 + 1e-4) / 8.0; }
float tgHex(vec2 q, float r) { q = abs(q); return max(q.x * 0.8660254 + q.y * 0.5, q.y) - r; }
float tgSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
vec3 tgSkyRamp(vec2 p) {
  float y = clamp(p.y + 0.012 * (cFbm(vec2(22.0 * p.x, 60.0 * p.y)) - 0.5), 0.0, 0.69);
  vec3 d = vec3(0.149, 0.275, 0.439);
  d = mix(d, vec3(0.180, 0.345, 0.565), clamp(y / 0.15, 0.0, 1.0));
  d = mix(d, vec3(0.329, 0.373, 0.671), clamp((y - 0.15) / 0.15, 0.0, 1.0));
  d = mix(d, vec3(0.565, 0.455, 0.698), clamp((y - 0.30) / 0.15, 0.0, 1.0));
  d = mix(d, vec3(0.804, 0.659, 0.741), clamp((y - 0.45) / 0.15, 0.0, 1.0));
  d = mix(d, vec3(0.941, 0.820, 0.773), clamp((y - 0.60) / 0.09, 0.0, 1.0));
  d = mix(d, vec3(0.941, 0.796, 0.761), 0.5 * exp(-pow((p.y - 0.73) / 0.09, 2.0)) * (1.0 - uTgNight));
  vec3 n = vec3(0.106, 0.180, 0.259);
  n = mix(n, vec3(0.149, 0.259, 0.388), clamp(y / 0.15, 0.0, 1.0));
  n = mix(n, vec3(0.176, 0.337, 0.627), clamp((y - 0.15) / 0.15, 0.0, 1.0));
  n = mix(n, vec3(0.329, 0.467, 0.655), clamp((y - 0.30) / 0.15, 0.0, 1.0));
  n = mix(n, vec3(0.471, 0.655, 0.804), clamp((y - 0.45) / 0.15, 0.0, 1.0));
  n = mix(n, vec3(0.655, 0.890, 0.965), clamp((y - 0.60) / 0.09, 0.0, 1.0));
  vec3 c = mix(d, n, clamp(uTgNight, 0.0, 1.0));
  vec3 dr = mix(vec3(0.047, 0.078, 0.282), vec3(0.078, 0.118, 0.361), clamp(y / 0.69, 0.0, 1.0));
  return mix(c, dr, clamp(uTgDrain, 0.0, 1.0));
}`,
};

export const tgDuskSky = mk("tgDuskSky", "Shinkai kataware-doki sky: six measured stops #264670 to #f0d1c5 with brush-dab banding, cream horizon, night and drain lerps, stars",
  `uniform float uTgStars;
vec3 tgDuskSky(vec2 p, float t) {
  vec3 c = tgSkyRamp(p);
  vec2 g = p * vec2(96.0, 60.0);
  vec2 cell = floor(g);
  float h = cH21(cell + 5.3);
  float px = fwidth(g.x);
  float d = length(fract(g) - (cH22(cell + 9.1) * 0.6 + 0.2));
  float star = (1.0 - smoothstep(px * 0.5, px * 1.3, d)) * step(0.985, h);
  float w = 0.55 * smoothstep(0.62, 0.80, 1.0 - p.y) * clamp(uTgStars, 0.0, 1.0);
  c = mix(c, vec3(0.784, 0.847, 1.0), star * w);
  return cCap(c);
}`, "tgDuskSky(p, t)",
  { uniforms: (o = {}) => U(o, { uTgStars: 0 }), use: "plate",
    draws: "A painted twilight sky falling from deep blue at the top through violet and rose to a cream horizon, with brush-dab banding and, at night, small blue-white stars in the upper sky.",
    params: "uTgNight: 0 dusk to 1 comet-night blues (0.35 held from 8.3 s); uTgDrain: 0 to 1 sinks the sky to night blue (12.1 to 14.4 s); uTgStars: 0 to 1 star density (full from 12.1 s)" });

export const tgSunGlare = mk("tgSunGlare", "low sun at the rim notch: cream disc clipped by the horizon, glare e^(-r/0.05) plus long horizontal streak plus cos^16(4a) petals, gold, capped",
  `uniform float uTgGlare;
vec3 tgSunGlare(vec2 p, float t) {
  vec3 c = tgSkyRamp(p);
  vec2 q = (p - uTgSun) * TG_ASP;
  float r = length(q);
  float a = atan(q.y, q.x);
  float c4 = cos(4.0 * a);
  float g = exp(-r / 0.05)
    + 0.5 * exp(-abs(p.y - uTgSun.y) / 0.004) * exp(-abs(p.x - uTgSun.x) / 0.6)
    + 0.25 * pow(c4 * c4, 8.0) * exp(-r / 0.18);
  float disc = cFill(r - 0.014) * cAA(0.69 - p.y, 0.0);
  c = mix(c, vec3(0.941, 0.870, 0.800), disc);
  return cCap(c + TG_GOLD * g * 0.8 * clamp(uTgGlare, 0.0, 1.0));
}`, "tgSunGlare(p, t)",
  { uniforms: (o = {}) => U(o, { uTgGlare: 1 }), use: "screen",
    draws: "A cream sun disc sitting on the horizon notch, wrapped in a big gold glare with a long thin horizontal streak and faint four-petal rays that never grey the sky.",
    params: "uTgSun: sun centre on screen (elevation falls below 0.69 from 6.0 s); uTgGlare: 0 to 1 glare strength (fades with the dusk drain)" });

export const tgHorizonSea = mk("tgHorizonSea", "Itomori horizon: pale violet far ridge with 50 warm town lights, little pink clouds at 0.64 H, a painted sea of clouds with a sun path",
  `uniform float uTgTown;
vec3 tgHorizonSea(vec2 p, float t) {
  vec3 c = tgSkyRamp(p);
  float ry = 0.685 - 0.012 * exp(-pow((p.x - 0.80) / 0.06, 2.0)) + 0.004 * (cFbm(vec2(p.x * 9.0, 1.7)) - 0.5);
  c = mix(c, vec3(0.549, 0.502, 0.753), cAA(p.y, ry) * 0.7);
  vec2 g = vec2(p.x * 90.0, (p.y - ry) * 150.0);
  vec2 cell = floor(g);
  float lamp = cFill(length(fract(g) - (cH22(cell + 11.0) * 0.5 + 0.25)) - 0.14) * step(0.86, cH21(cell + 3.7));
  lamp *= step(0.0, g.y) * step(g.y, 4.0) * clamp(uTgTown, 0.0, 1.0);
  c = mix(c, vec3(1.0, 0.745, 0.400), lamp);
  float cl = exp(-pow((p.y - 0.64) / 0.035, 2.0)) * smoothstep(0.55, 0.70, cFbm(vec2(14.0 * p.x, 40.0 * p.y)));
  c = mix(c, mix(vec3(0.722, 0.482, 0.659), vec3(0.816, 0.627, 0.714), cAA(p.y, 0.64)), cAA(cl, 0.35) * 0.8);
  float top = 1.0 - (0.235 + 0.012 * sin(23.0 * p.x) + 0.014 * exp(-pow((p.x - 0.28) / 0.10, 2.0)) + 0.012 * exp(-pow((p.x - 0.70) / 0.14, 2.0)) + 0.008 * (cFbm(vec2(p.x * 7.0, 2.3)) - 0.5));
  float depth = clamp((p.y - top) / 0.06, 0.0, 1.0);
  vec3 sea = mix(vec3(0.918, 0.698, 0.737), vec3(0.722, 0.482, 0.659), cAA(depth, 0.5));
  float path = 0.25 + 0.40 * exp(-4.0 * abs(p.x - uTgSun.x));
  sea = mix(sea, vec3(0.941, 0.796, 0.761), path * (1.0 - depth) * 0.6);
  c = mix(c, sea, cAA(p.y, top));
  return cCap(c);
}`, "tgHorizonSea(p, t)",
  { uniforms: (o = {}) => U(o, { uTgTown: 1 }), use: "plate",
    draws: "A far violet ridge dotted with warm town lights, a thin row of small pink clouds, and a wavy pink-and-violet sea of clouds with a brighter sun path under the sun.",
    params: "uTgTown: 0 to 1 shows the Itomori lights (on in shot 4 and the coda); uTgSun.x: where the sun path brightens" });

export const tgCraterLake = mk("tgCraterLake", "crater lake: deep #08203e to mid #1a4a6c ellipse, mirrored sky reflection, far shore strip, sun glare field, threes glitter, one soft gold ring",
  `uniform vec2 uTgLake;
uniform float uTgRing;
uniform float uTgGlitter;
vec3 tgCraterLake(vec2 p, float t) {
  vec3 base = tgSkyRamp(p);
  vec2 q = (p - uTgLake) / vec2(0.46, 0.095);
  float d = length(q) - 1.0;
  float depth = clamp((p.y - (uTgLake.y - 0.095)) / 0.19, 0.0, 1.0);
  vec3 w = mix(vec3(0.102, 0.290, 0.424), vec3(0.031, 0.125, 0.243), cAA(depth, 0.5));
  vec2 rp = vec2(p.x + 0.004 * sin(p.y * 140.0 + t * 0.8), 1.38 - p.y);
  w = mix(w, tgSkyRamp(rp), 0.55);
  w = mix(w, vec3(0.373, 0.471, 0.565), (1.0 - cAA(depth, 0.12)) * 0.8);
  float gl = exp(-abs(p.x - uTgSun.x) / 0.10) * (1.0 - depth * 0.5);
  w = mix(w, vec3(0.941, 0.840, 0.750), gl * 0.5);
  float gh = cH21(floor(vec2(p.x * 160.0, p.y * 90.0)) + tgThrees(t) * 37.0);
  w += TG_GOLD * step(0.97, gh) * gl * clamp(uTgGlitter, 0.0, 1.0) * 0.5;
  float rr = length((p - uTgLake) * vec2(1.6, 5.0));
  w = mix(w, TG_GOLD, cLine(rr - uTgRing * 0.5, 2.0) * 0.3 * step(0.001, uTgRing) * (1.0 - clamp(uTgRing, 0.0, 1.0)));
  return cCap(mix(base, w, cFill(d)));
}`, "tgCraterLake(p, t)",
  { uniforms: (o = {}) => U(o, { uTgLake: v2(0.5, 0.86), uTgRing: 0, uTgGlitter: 1 }), use: "surface",
    draws: "A dark navy-teal lake ellipse mirroring the sky upside down, with a pale far shore, a bright glare path under the sun, flickering glitter and one faint gold ring when the cords link.",
    params: "uTgLake: ellipse centre; uTgRing: 0 to 1 growth of the gold ring (7.9 s, 30 percent); uTgGlitter: 0 to 1 glitter on threes" });

export const tgRimRock = mk("tgRimRock", "crater rim band at 0.80 H: 14 flat-topped boulders, silhouette #3a2537, lit tops #784554 and #833544, rim edge #d56a6a, two stage boulders",
  `vec3 tgRimRock(vec2 p, float t) {
  vec3 base = tgSkyRamp(p);
  float top = 0.0;
  float par = 0.0;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float h = cH21(vec2(fi, 3.1));
    float stage = (i == 4 || i == 9) ? 1.0 : 0.0;
    float ht = mix(0.04 + 0.05 * h, 0.05, stage);
    float rx = mix(0.05 + 0.03 * h, 0.075, stage);
    float x = (p.x - (fi + 0.5) / 14.0) / rx;
    float prof = min(ht * sqrt(max(1.0 - x * x, 0.0)), ht * 0.7);
    if (prof > top) { top = prof; par = mod(fi, 2.0); }
  }
  float dy = p.y - (0.80 - top);
  vec3 rock = mix(vec3(0.227, 0.145, 0.216), vec3(0.278, 0.231, 0.247), cVn(vec2(p.x * 30.0, p.y * 80.0)) * 0.4);
  rock = mix(rock, mix(vec3(0.471, 0.271, 0.329), vec3(0.514, 0.208, 0.267), par), 1.0 - cAA(dy, 0.014));
  rock = mix(rock, vec3(0.835, 0.416, 0.416), cLine(dy, 1.6) * 0.9);
  return cCap(mix(base, rock, cAA(dy, 0.0)));
}`, "tgRimRock(p, t)",
  { use: "surface",
    draws: "A dark plum rock ridge along the lower fifth of the frame made of fourteen flat-topped boulders, each with a rose-brown lit top and a thin coral edge line facing the sky.",
    params: "none; boulder 4 and 9 are the wider stage rocks the two seals stand on (x about 0.32 and 0.68)" });

export const tgDimensionRing = mk("tgDimensionRing", "dimension ring: gold rim #ffc080 drifting to #ff7a8a and #8da6ff by angle, radius 0.55 to 1.9 H, wobble 0.06, soft inner glow",
  `uniform float uTgRingR;
uniform float uTgRingA;
vec3 tgDimensionRing(vec2 p, float t) {
  vec3 base = tgSkyRamp(p);
  vec2 q = (p - 0.5) * TG_ASP;
  float a = atan(q.y, q.x);
  float R = uTgRingR * (1.0 + 0.06 * sin(3.0 * a + t * 0.9));
  float d = length(q) - R;
  vec3 rim = mix(mix(vec3(1.0, 0.753, 0.502), vec3(1.0, 0.478, 0.541), 0.5 + 0.5 * sin(a)), vec3(0.553, 0.651, 1.0), 0.6 * (0.5 + 0.5 * cos(a)));
  float k = cFill(abs(d) - 0.012) * 0.9 + exp(-abs(d) / 0.05) * 0.25;
  return cCap(base + rim * k * clamp(uTgRingA, 0.0, 1.0));
}`, "tgDimensionRing(p, t)",
  { uniforms: (o = {}) => U(o, { uTgRingR: 0.8, uTgRingA: 1 }), use: "mask",
    draws: "A soft gold-rimmed bubble edge opening from the centre of the frame, its rim sliding from gold to pink to periwinkle around the circle and wobbling slightly.",
    params: "uTgRingR: ring radius in frame heights (0.55 to 1.9 over 2.4 s); uTgRingA: 0.35 to 1.0 opacity" });

export const tgBraidCord = mk("tgBraidCord", "musubi cord: two phase-shifted strands 0.010 sin(120 s), front lit #e0243c, back #752829, glow, slack and flutter, three tie rings, braid steps on threes",
  `uniform vec2 uTgCordA;
uniform vec2 uTgCordB;
uniform float uTgDraw;
uniform float uTgSlack;
uniform float uTgFlutter;
uniform float uTgTie;
uniform float uTgGlow;
vec3 tgBraidCord(vec2 p, float t) {
  vec3 col = tgSkyRamp(p);
  vec2 a = uTgCordA * TG_ASP, b = uTgCordB * TG_ASP, q = p * TG_ASP;
  vec2 ab = b - a;
  float L = max(length(ab), 1e-4);
  vec2 dir = ab / L;
  vec2 nrm = vec2(-dir.y, dir.x);
  float sl = dot(q - a, dir);
  float off = dot(q - a, nrm);
  float s = clamp(sl / L, 0.0, 1.0);
  float T = tgThrees(t);
  float o = uTgSlack * 4.0 * s * (1.0 - s) + uTgFlutter * 4.0 * s * (1.0 - s) * sin(s * 9.0 - T * 6.0);
  float ph = 120.0 * sl + T * 7.0;
  float dA = abs(off - o - 0.010 * sin(ph));
  float dB = abs(off - o + 0.010 * sin(ph));
  float seg = cAA(sl, 0.0) * (1.0 - cAA(sl, L * clamp(uTgDraw, 0.0, 1.0)));
  float aF = step(0.0, cos(ph));
  vec3 lit = vec3(0.878, 0.141, 0.235), mid = vec3(0.698, 0.235, 0.271), sh = vec3(0.459, 0.157, 0.161);
  float mBack = mix(cFill(dA - 0.003), cFill(dB - 0.003), aF) * seg;
  float dF = mix(dB, dA, aF);
  float mFront = cFill(dF - 0.003) * seg;
  col = mix(col, sh, mBack);
  col = mix(col, mix(mid, lit, cAA(0.0016 - dF, 0.0)), mFront);
  col = mix(col, vec3(1.0, 0.706, 0.627), cFill(dF - 0.0006) * seg * 0.5);
  col += lit * 0.12 * exp(-min(dA, dB) / 0.01) * seg * clamp(uTgGlow, 0.0, 1.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec2 r = q - (a + dir * (0.012 + 0.016 * fk));
    float ring = cLine(length(vec2(dot(r, dir) / 0.007, dot(r, nrm) / 0.026)) - 1.0, 1.6) * step((fk + 0.5) / 3.0, uTgTie);
    col = mix(col, mid, ring * 0.9);
  }
  return cCap(col);
}`, "tgBraidCord(p, t)",
  { uniforms: (o = {}) => U(o, { uTgCordA: v2(0.30, 0.60), uTgCordB: v2(0.62, 0.60), uTgDraw: 1, uTgSlack: 0.02, uTgFlutter: 0.01, uTgTie: 1, uTgGlow: 1 }), use: "line",
    draws: "A thin red braided cord with two twisting strands, bright on the front twist and dark behind, glowing slightly, running between two points and wrapped in three small rings at its start.",
    params: "uTgCordA/uTgCordB: cord ends (A flipper to B); uTgDraw: 0 to 1 how much is drawn out; uTgSlack: sag in height units (0.16 m to 0.024 m); uTgFlutter: breeze wave amplitude; uTgTie: 0 to 1 winds the three rings on; uTgGlow: 0 to 1 emissive glow" });

export const tgLensGhosts = mk("tgLensGhosts", "five hexagon lens ghosts radii .06 .10 .16 .09 .22 strung from the sun through frame centre, #ffb273 to #8da6ff, one pink #f0a0d0",
  `uniform float uTgGhost;
vec3 tgLensGhosts(vec2 p, float t) {
  vec3 col = tgSkyRamp(p);
  vec2 q = p * TG_ASP, s = uTgSun * TG_ASP, c = vec2(0.5) * TG_ASP;
  float R[5] = float[5](0.06, 0.10, 0.16, 0.09, 0.22);
  float K[5] = float[5](0.20, 0.45, 0.85, 1.30, 1.80);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 gc = (i == 1) ? vec3(0.941, 0.627, 0.816) : mix(vec3(1.0, 0.702, 0.451), vec3(0.553, 0.651, 1.0), fi / 4.0);
    float d = tgHex(q - mix(s, c, K[i]), R[i]);
    col = mix(col, gc, cFill(d) * 0.16 * uTgGhost);
    col = mix(col, gc, cLine(d, 1.4) * 0.40 * uTgGhost);
  }
  return cCap(col);
}`, "tgLensGhosts(p, t)",
  { uniforms: (o = {}) => U(o, { uTgGhost: 1 }), use: "screen",
    draws: "Five pale hexagons of different sizes strung in a line from the sun through the middle of the frame, shading from orange to periwinkle with one pink, each a faint fill with a thin edge.",
    params: "uTgSun: where the sun is; uTgGhost: 0 to 1 opacity (held 0.55 from 1.9 s, fades with the sun by 12.4 s)" });

export const tgFlareCross = mk("tgFlareCross", "four-point flare cross: thin horizontal and vertical streaks plus a small hot core, gold or glint-cream, capped at 0.92",
  `uniform vec2 uTgCrossAt;
uniform float uTgCross;
uniform float uTgCrossSize;
uniform vec3 uTgCrossCol;
vec3 tgFlareCross(vec2 p, float t) {
  vec3 base = tgSkyRamp(p);
  vec2 q = (p - uTgCrossAt) * TG_ASP;
  vec2 a = abs(q);
  float s = uTgCrossSize;
  float k = 0.9 * (exp(-a.y / 0.0035) * exp(-a.x / s) + exp(-a.x / 0.0035) * exp(-a.y / (s * 1.2))) + exp(-length(q) / 0.012);
  return cCap(base + uTgCrossCol * k * clamp(uTgCross, 0.0, 1.0));
}`, "tgFlareCross(p, t)",
  { uniforms: (o = {}) => U(o, { uTgCrossAt: v2(0.5, 0.62), uTgCross: 1, uTgCrossSize: 0.12, uTgCrossCol: v3(1.0, 0.839, 0.627) }), use: "screen",
    draws: "A bright four-point star flare with a hot centre and thin horizontal and vertical rays, used between the seals, behind the hero's head and as the small link glint.",
    params: "uTgCrossAt: flare centre; uTgCross: 0 to 1 strength; uTgCrossSize: ray length in frame heights (0.12 flare, 0.03 glint); uTgCrossCol: gold #ffd6a0 or glint cream #fff6e6" });

export const cometBand = mk("cometBand", "comet Tiamat: analytic parabola arc y = 0.66x^2 - 1.89x + 1.49, width 0.004 + 0.06u, five blue-cyan strip bands, white core, split arcs, red ember, falling specks",
  `uniform float uTgComet;
uniform float uTgGrow;
uniform float uTgSplitK;
uniform float uTgMag;
uniform float uTgEmberT;
uniform float uTgSpecks;
float tgArcY(float x) { return 0.66 * x * x - 1.89 * x + 1.49; }
vec3 cometBand(vec2 p, float t) {
  vec3 col = tgSkyRamp(p);
  float x = p.x * 1.6;
  float u = clamp((x - 0.46) / 0.82, 0.0, 1.0);
  float slope = 1.32 * x - 1.89;
  float inv = 1.0 / sqrt(1.0 + slope * slope);
  float vis = cAA(x, 0.46) * (1.0 - cAA(x, 0.46 + 0.82 * clamp(uTgGrow, 0.0, 1.0)));
  float w = 0.004 + 0.06 * u;
  for (int j = 0; j < 3; j++) {
    int idx = (j == 1) ? 2 : ((j == 2) ? 1 : 0);
    float off = (float(idx) - 1.0) * uTgSplitK * (1.28 - x);
    float dd = (p.y - (tgArcY(x) + off)) * inv;
    float band = floor(clamp(dd / w * 0.5 + 0.5, 0.0, 0.999) * 5.0);
    vec3 cc = band < 0.5 ? vec3(0.180, 0.443, 0.800) : (band < 1.5 ? vec3(0.404, 0.933, 0.988) : (band < 2.5 ? vec3(0.753, 0.996, 0.984) : (band < 3.5 ? vec3(0.733, 0.953, 0.984) : vec3(0.435, 0.694, 0.965))));
    float edge = step(band, 0.5) + step(3.5, band);
    cc = mix(cc, mix(vec3(0.816, 0.290, 0.722), vec3(0.184, 0.878, 0.690), step(3.5, band)), clamp(uTgMag, 0.0, 1.0) * cAA(u, 0.3) * edge);
    float amp = (idx == 1) ? 1.0 : 0.75 * smoothstep(0.0, 0.01, uTgSplitK);
    float m = cFill(abs(dd) - w) * vis * amp * clamp(uTgComet, 0.0, 1.0);
    col = mix(col, cc, m);
    col += vec3(0.753, 0.996, 0.984) * 0.6 * exp(-pow(dd / 0.002, 2.0)) * vis * amp * clamp(uTgComet, 0.0, 1.0);
  }
  float e = tgTwos(uTgEmberT);
  vec2 q = p * TG_ASP;
  vec2 pos = vec2(0.46, tgArcY(0.46)) + normalize(vec2(-1.0, 1.28)) * 0.35 * e + vec2(0.0, 0.5) * e * e;
  float de = length(q - pos) - 0.009;
  float on = step(0.001, uTgEmberT);
  col = mix(col, vec3(1.0, 0.290, 0.227), cFill(de) * on);
  col += vec3(1.0, 0.290, 0.227) * 0.3 * exp(-max(de, 0.0) / 0.02) * on;
  vec2 g = vec2(p.x * 60.0, p.y * 40.0 - t * 2.5);
  vec2 cell = floor(g);
  float sp = cFill(length(fract(g) - (cH22(cell + 3.0) * 0.6 + 0.2)) - 0.07) * step(0.93, cH21(cell + 17.0));
  col = mix(col, vec3(0.784, 0.847, 1.0), sp * clamp(uTgSpecks, 0.0, 1.0) * 0.8);
  return cCap(col);
}`, "cometBand(p, t)",
  { uniforms: (o = {}) => U(o, { uTgComet: 1, uTgGrow: 1, uTgSplitK: 0, uTgMag: 0, uTgEmberT: 0, uTgSpecks: 0 }), use: "plate",
    draws: "A banded blue and cyan comet arc sloping up to the right with a near-white core, a narrow head and a widening tail that splits into two or three tails, trailing a red ember and falling blue-white specks.",
    params: "uTgComet: 0 to 1 opacity (0.3 for the faint dusk tail); uTgGrow: 0 to 1 how much arc is drawn; uTgSplitK: 0 to 0.10 split spread; uTgMag: 0 to 1 turns the tail edges magenta and green; uTgEmberT: seconds since the ember left (steps on twos); uTgSpecks: 0 to 1 falling specks" });

export const tgStrokeLight = mk("tgStrokeLight", "stroke light: three warm gold strokes written on B's flipper plus B's one half-drawn line, drawn in quarter steps, emissive, never a letter",
  `uniform vec2 uTgStrokeAt;
uniform float uTgStroke;
uniform float uTgEmit;
vec3 tgStrokeLight(vec2 p, float t) {
  vec3 col = tgSkyRamp(p);
  vec2 q = p * TG_ASP, c = uTgStrokeAt * TG_ASP;
  float m = 0.0, gl = 0.0;
  for (int i = 0; i < 4; i++) {
    float fk = float(i);
    vec2 a = c + vec2(-0.045, -0.022 + 0.022 * fk);
    vec2 b = c + vec2(0.045, -0.012 + 0.022 * fk);
    if (i == 3) { a = c + vec2(0.070, 0.050); b = c + vec2(0.020, 0.040); }
    float pr = floor(clamp(uTgStroke - fk, 0.0, 1.0) * 4.0 + 1e-4) / 4.0;
    float d = tgSeg(q, a, mix(a, b, pr));
    float on = step(0.001, pr);
    m = max(m, cFill(d - 0.004) * on);
    gl = max(gl, exp(-d / 0.012) * on);
  }
  col = mix(col, TG_GOLD, m * 0.9);
  return cCap(col + TG_GOLD * gl * 0.25 * clamp(uTgEmit, 0.0, 1.0));
}`, "tgStrokeLight(p, t)",
  { uniforms: (o = {}) => U(o, { uTgStrokeAt: v2(0.62, 0.58), uTgStroke: 3, uTgEmit: 0.6 }), use: "line",
    draws: "Three short parallel strokes of warm gold light drawn one after another across a flipper, with a soft glow, and a fourth shorter line coming back from the other side.",
    params: "uTgStrokeAt: centre of B's flipper; uTgStroke: 0 to 4 progress (0 to 3 are A's three strokes, 3 to 4 is B's line); uTgEmit: 0 to 0.6 glow strength" });

export const tgGoldDissolve = mk("tgGoldDissolve", "gold dissolve: ring eating the night plate with a #ffd6a0 edge and gold dust on the dissolved side, plus one short gold wipe band with a cream tail",
  `uniform vec2 uTgDissAt;
uniform float uTgDiss;
uniform float uTgWipe;
uniform vec3 uTgNext;
vec3 tgGoldDissolve(vec2 p, float t) {
  vec3 night = tgSkyRamp(p);
  vec3 next = mix(uTgNext, uTgNext * vec3(1.0, 0.92, 0.85), cAA(p.y, 0.5));
  float R = uTgDiss * (1.0 + 0.22 * (cFbm(p * 5.0 + 1.3) - 0.5));
  float d = length((p - uTgDissAt) * TG_ASP) - R;
  float inside = cFill(d) * step(0.001, uTgDiss);
  vec3 col = mix(night, next, inside);
  float dust = step(0.90, cH21(floor(p * vec2(120.0, 75.0)) + tgTwos(t) * 13.0)) * exp(min(d, 0.0) / 0.05) * inside;
  col = mix(col, TG_GOLD, cLine(d, 2.4) * step(0.001, uTgDiss) * 0.95);
  col += TG_GOLD * dust * 0.8;
  float on = step(-0.5, uTgWipe);
  col = mix(col, vec3(0.95, 0.88, 0.78), exp(-max(uTgWipe - p.x, 0.0) / 0.25) * step(p.x, uTgWipe) * 0.5 * on);
  col = mix(col, TG_GOLD * 0.95, exp(-pow((p.x - uTgWipe) / 0.05, 2.0)) * 0.9 * on);
  return cCap(col);
}`, "tgGoldDissolve(p, t)",
  { uniforms: (o = {}) => U(o, { uTgDissAt: v2(0.5, 0.5), uTgDiss: 0.8, uTgWipe: -1, uTgNext: v3(0.62, 0.55, 0.46) }), use: "mask",
    draws: "A ragged ring of bright gold growing from one point, eating the dark night picture and revealing a pale island colour behind it with gold dust speckled on the opened side, or one thin gold band sweeping sideways with a cream tail.",
    params: "uTgDissAt: ring centre; uTgDiss: ring radius in frame heights (0.14 to 2.3 over 0.7 s from 17.7 s); uTgWipe: x of the gold wipe band (-1 off, sweeps over 0.2 s at 18.4 s); uTgNext: colour of the island plate shown inside the ring" });

export const tgGrade = mk("tgGrade", "twilight grade: split tone shadow #363852 to high #f1cdc2, haze #c389b8, ink floor lift smoothstep(0.035,0.08), luma cap 0.92, grain 0.02 on twos, 2.39:1 ink bars",
  `uniform float uTgBars;
uniform float uTgHaze;
uniform float uTgGrain;
vec3 tgGrade(vec3 col, vec2 p, float t) {
  float L = cLuma(col);
  col = mix(col, mix(col, vec3(0.212, 0.220, 0.322) * 1.5, 0.35), 1.0 - smoothstep(0.08, 0.40, L));
  col = mix(col, mix(col, vec3(0.945, 0.804, 0.761), 0.22), smoothstep(0.55, 0.85, L));
  col = mix(col, vec3(0.765, 0.537, 0.722), uTgHaze * 0.5 * exp(-pow((p.y - 0.72) / 0.12, 2.0)));
  L = cLuma(col);
  col = mix(TG_INK, col, smoothstep(0.035, 0.08, L));
  col += (cH21(floor(gl_FragCoord.xy) + tgTwos(t) * 91.7) - 0.5) * 0.04 * (1.0 - L) * uTgGrain;
  col = cCap(col);
  float bar = clamp((1.0 - cAA(p.y, 0.1653)) + cAA(p.y, 0.8347), 0.0, 1.0);
  return mix(col, TG_INK, bar * uTgBars);
}`, "tgGrade(tgSkyRamp(p), p, t)",
  { uniforms: (o = {}) => U(o, { uTgBars: 1, uTgHaze: 0.5, uTgGrain: 1 }), use: "grade",
    draws: "The whole frame leaning violet in the shadows and cream in the highlights, with a faint rose haze near the horizon, fine grain that steps with the drawings, no pure black, and dark plum letterbox bars top and bottom.",
    params: "uTgBars: 0 or 1 letterbox; uTgHaze: 0 to 1 horizon haze (0.5); uTgGrain: 0 to 1 grain on twos" });

export const tgSealCoat = mk("tgSealCoat", "Shinkai seal coat: two-value shade with soft step, #6a78d8 cool shade, #ffc08a rim on the sun side, pale belly, fur clump notches, thin #31233b hull line",
  `uniform vec3 uTgCoat;
vec3 tgSealCoat(vec2 p, float t) {
  vec2 n = cN(p);
  float nz = sqrt(max(0.22 - dot(n, n), 0.0)) / 0.4690;
  float s = cNdL(p) * 2.0 - 1.0;
  float fur = (cVn(p * vec2(22.0, 26.0)) - 0.5) * 0.10 * (1.0 - nz);
  float st = smoothstep(-0.05, 0.05, s + fur);
  vec3 sh = min(vec3(0.416, 0.471, 0.847) * 1.23, vec3(1.2));
  vec3 base = mix(uTgCoat, vec3(0.91, 0.88, 0.86), cFill(length((n - vec2(0.0, 0.17)) / vec2(0.20, 0.16)) - 1.0));
  vec3 c = base * (0.70 + 0.30 * st + 0.10 * max(s, 0.0)) * mix(sh, vec3(1.0), st);
  c = mix(c, vec3(1.0, 0.753, 0.541), 0.5 * cAA(pow(1.0 - nz, 5.0), 0.5) * cAA(s, 0.0));
  vec3 col = mix(tgSkyRamp(p), c, cCover(p));
  col = mix(col, TG_LINE, cLine(length(n) - 0.4690, 1.6) * 0.9);
  return cCap(col);
}`, "tgSealCoat(p, t)",
  { uniforms: (o = {}) => U(o, { uTgCoat: v3(0.486, 0.576, 0.741) }), use: "surface",
    draws: "A round blue-grey seal body lit from the low sun, a soft two-value shade that turns periwinkle in shadow, a pale belly oval, a peach rim light on the sun side and a thin plum outline.",
    params: "uTgCoat: coat colour (hero A #7c93bd, second seal B #a4bce0, one step lighter)" });

export const PACKET_SHADERS = [
  tgKit, tgDuskSky, tgSunGlare, tgHorizonSea, tgCraterLake, tgRimRock, tgDimensionRing, tgBraidCord,
  tgLensGhosts, tgFlareCross, cometBand, tgStrokeLight, tgGoldDissolve, tgGrade, tgSealCoat,
];
export default PACKET_SHADERS;
