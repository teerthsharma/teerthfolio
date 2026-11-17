// pr-polychrom-79 packet shaders: Fate, Gilgamesh Gate of Babylon and Ea, Ufotable (sky, ripple wall, blades, volley, Ea, tear, shards, king, grade).
import { defineCut } from "../kit.glsl.js";

const F = "pr-polychrom-79";
const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
const C = { ink: H("#1a0e16"), nightT: H("#1e2a56"), nightB: H("#284bdf"), redT: H("#7a0c09"), redB: H("#b42b1e"), rbT: H("#270908"), rbB: H("#790b08"), calmT: H("#c8d8e8"), calmB: H("#f4f4f0"),
  city: H("#181312"), gnd0: H("#460808"), gnd1: H("#270908"), post: H("#1a0e16"), stoneM: H("#3a4560"), stoneL: H("#e8f0ff"), stoneD: H("#0e1220"),
  gold: H("#fadf92"), goldM: H("#c89a30"), goldS: H("#6a3a08"), core: H("#fdfbe4"), orange: H("#ed9257"), ringSh: H("#c9a14a"),
  shaft: H("#1a0a10"), circ: H("#d33d49"), edge: H("#d3122e"), glint: H("#ff2a3a"), white: H("#ebebeb"),
  hair: H("#e8c868"), hairL: H("#fadf92"), hairS: H("#8a6a28"), hairInk: H("#5a3a10"), iris: H("#d83a28"), irisL: H("#7a0c09"), bib: H("#2a1a3a"),
  nightSh: H("#16110f"), nightHi: H("#fefdf4"), redSh: H("#460808"), redHi: H("#fdfbcf"), islSh: H("#242322"), islHi: H("#f4f4f0"), shardA: H("#b42b1e"), shardB: H("#7a0c09"), shardC: H("#d3122e"),
  windRed: H("#f20f24"), windCream: H("#ffbf8c"), ink2: H("#1c0618"), gold2: H("#f2c94c") };

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const NUM = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

function T(name, { doc, draws, use, params, uni = {}, deps = [], body, demo }) {
  const m = defineCut(name, F, doc, `${NUM(uni)}\n${body}`, demo);
  return { ...m, deps: ["cutKit", "polyKit", ...deps], draws, use, suits: F, params, uniforms: U(uni) };
}

export const polyKit = {
  name: "polyKit",
  family: F,
  doc: "polychrom helpers: height-unit uv, 12 and 24 fps clocks, seeded hash, ink lift, the Gate portal grid layout and the 35 degree aim line",
  deps: ["cutKit"],
  glsl: `uniform float uPlSeed;
uniform float uPlAsp;
uniform float uPlCloseT;
const vec2 PL_AIM = vec2(-0.81915, -0.57358);
vec2 plU(vec2 p) { return vec2(p.x * uPlAsp, p.y); }
float plTwos(float t) { return floor(t * 12.0 + 1e-3) / 12.0; }
float plOnes(float t) { return floor(t * 24.0 + 1e-3) / 24.0; }
float plH(vec2 p) { return cH21(p + uPlSeed * 0.137); }
vec2 plH2(vec2 p) { return cH22(p + uPlSeed * 0.137); }
vec3 plLift(vec3 c) { return mix(${C.ink}, c, smoothstep(0.035, 0.08, cLuma(c))); }
vec2 plRot(vec2 v, float a) { float s = sin(a), k = cos(a); return vec2(k * v.x - s * v.y, s * v.x + k * v.y); }
vec4 plLayer(float L) {
  if (L < 0.5) return vec4(0.09, 0.055, 0.46, 4.292);
  if (L < 1.5) return vec4(0.14, 0.09, 0.80, 3.292);
  return vec4(0.20, 0.13, 0.85, 2.292);
}
float plSpan(float L) { return L < 0.5 ? 2.52 : (L < 1.5 ? 2.32 : 1.36); }
float plCell(vec2 id, float L, out vec2 ctr, out float dia, out float tOpen, out float tClose) {
  vec4 P = plLayer(L);
  vec2 h = plH2(id + L * 37.0);
  float h3 = plH(id * 1.7 + L * 11.0 + 5.0);
  ctr = (id + 0.5 + (h - 0.5) * 0.5) * P.x;
  dia = P.y * (0.85 + 0.3 * plH(id + L * 5.0 + 9.0));
  tOpen = P.w + h3 * plSpan(L);
  tClose = uPlCloseT + (1.0 - h3) * 3.5;
  float inside = step(ctr.x, 0.66 * uPlAsp) * step(0.26, ctr.y) * step(ctr.y, 0.98);
  return step(plH(id + L * 91.0 + 3.0), P.z) * inside;
}
float plOpenR(float t, float tOpen, float dia, float tClose) {
  float a = clamp((t - tOpen) / 0.5, 0.0, 1.0);
  float b = clamp((t - tClose) / 0.5, 0.0, 1.0);
  return 0.5 * dia * (1.0 - pow(1.0 - a, 3.0)) * (1.0 - b);
}`,
  uniforms: U({ uPlSeed: 7, uPlAsp: 1.6, uPlCloseT: 99 }),
  demo: `vec3 demo(vec2 p, float t) { return cCap(mix(${C.rbT}, ${C.redB}, cAA(plH(floor(plU(p) * 12.0)), 0.5))); }`,
};

export const polySkyPlate = T("polySkyPlate", {
  doc: "Fate sky plate: four flat steps from night blue #1e2a56 to #284bdf, red #7a0c09 to #b42b1e, red-black #270908 to #790b08, calm #c8d8e8 to #f4f4f0, plus a dark red ground band",
  draws: "A flat four-step sky that is night blue, then saturated red, then red-black, then pale snow, with a dark red ground strip along the bottom once it is red.",
  use: "plate",
  params: "uPlRed, uPlBlack, uPlCalm: 0 to 1 stage mixes (night to red to red-black to calm); uPlGround: height of the ground band in frame units.",
  uni: { uPlRed: 0, uPlBlack: 0, uPlCalm: 0, uPlGround: 0.10 },
  body: `vec3 polySkyPlate(vec2 p, float t) {
  float y = clamp(p.y + (cFbm(vec2(p.x * 2.0, plTwos(t) * 0.05)) - 0.5) * 0.03, 0.0, 1.0);
  float q = (cAA(y, 0.25) + cAA(y, 0.50) + cAA(y, 0.75)) / 3.0;
  vec3 c = mix(${C.nightB}, ${C.nightT}, q);
  c = mix(c, mix(${C.redB}, ${C.redT}, q), uPlRed);
  c = mix(c, mix(${C.rbB}, ${C.rbT}, q), uPlBlack);
  c = mix(c, mix(${C.calmB}, ${C.calmT}, q), uPlCalm);
  float g = (1.0 - cAA(y, uPlGround)) * uPlRed * (1.0 - uPlCalm);
  vec3 gc = mix(${C.gnd0}, ${C.gnd1}, cAA(y, uPlGround * 0.5));
  return cCap(mix(c, gc, g));
}`,
  demo: "polySkyPlate(p, t)",
});

export const polyCityLamp = T("polyCityLamp", {
  doc: "night city silhouette #181312 fading with the red sky, plus the streetlight post and its stone lamp-head ledge in a 3-band ramp",
  draws: "A dark rooftop skyline with a river-bridge line along the bottom that fades out as the sky turns red, and a thin lamp post ending in a flat stone ledge on the right.",
  use: "plate",
  params: "uPlCityFade: 0 to 1 fades the skyline out; uPlLampX: post x in frame units; uPlLampY: ledge top height; uPlLampOn: 1 to show the post and ledge, 0 to hide them.",
  uni: { uPlCityFade: 0, uPlLampX: 0.80, uPlLampY: 0.34, uPlLampOn: 1 },
  deps: ["polySkyPlate"],
  body: `vec3 polyCityLamp(vec3 col, vec2 p, float t) {
  vec2 u = plU(p);
  float roof = 0.035 + 0.035 * step(0.45, plH(vec2(floor(p.x * 34.0), 3.0))) + 0.02 * step(0.8, plH(vec2(floor(p.x * 17.0), 8.0)));
  float bridge = 0.07 + 0.012 * sin(p.x * 9.0);
  float sil = max(1.0 - cAA(p.y, roof), cLine(p.y - bridge, 2.0) * step(0.55, p.x) * step(p.x, 0.95));
  col = mix(col, ${C.city}, sil * (1.0 - uPlCityFade));
  vec2 lc = vec2(uPlLampX * uPlAsp, uPlLampY);
  float post = cFill(max(abs(u.x - lc.x) - 0.025, max(-u.y, u.y - lc.y)));
  vec2 q = u - lc - vec2(0.0, 0.015);
  float d = max(abs(q.x) - 0.10, abs(q.y) - 0.015);
  float v = clamp(0.5 + q.y / 0.03, 0.0, 1.0);
  vec3 slab = cCel3(v, 0.30, 0.86, ${C.stoneD}, ${C.stoneM}, ${C.stoneL});
  slab = mix(slab, ${C.ink}, cLine(d, 2.0));
  col = mix(col, ${C.post}, post * uPlLampOn);
  return cCap(mix(col, slab, cFill(d) * uPlLampOn));
}`,
  demo: "polyCityLamp(polySkyPlate(p, t), p, t)",
});

export const polyGateRipple = T("polyGateRipple", {
  doc: "Gate of Babylon wall: up to 90 flat gold ripple discs in three depth layers, 5 rings, hard edges, opening in order, closing in reverse, plus the larger Ea ripple",
  draws: "Flat gold discs of five rings with cream cores and a warm orange lower edge open one after another across the left two thirds of the sky, small ones behind large ones, with no outline.",
  use: "plate",
  params: "t: opens each disc over half a second from its layer start (2.292, 3.292, 4.292 s); uPlCloseT: when the wall starts closing; uPlPulse: 0 to 1 core flare; uPlEaOn: time the Ea ripple opens (a large disc at uPlEaX, uPlEaY).",
  uni: { uPlPulse: 0, uPlEaOn: 14.0, uPlEaX: 0.52, uPlEaY: 0.55 },
  body: `vec3 plDisc(vec3 col, vec2 q, float R, float pulse) {
  float rr = max(R, 1e-4);
  float d = length(q) / rr;
  float m = cFill(length(q) - R) * step(1e-3, R);
  float ring = cAA(fract(d * 5.0), 0.5);
  vec3 g = mix(${C.ringSh}, ${C.gold}, ring);
  g = mix(g, ${C.orange}, cAA(d, 0.84) * cAA(-q.y / rr, 0.0));
  g = mix(g, ${C.core} * (1.0 + 0.4 * pulse), 1.0 - cAA(d, 0.22));
  return mix(col, g, m);
}
vec3 polyGateRipple(vec3 col, vec2 p, float t) {
  vec2 u = plU(p);
  float tt = plTwos(t);
  for (int l = 0; l < 3; l++) {
    float L = float(l);
    float cs = plLayer(L).x;
    vec2 g = floor(u / cs);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 id = g + vec2(float(i), float(j));
        vec2 c; float dia; float to; float tc;
        float on = plCell(id, L, c, dia, to, tc);
        col = plDisc(col, u - c, plOpenR(tt, to, dia, tc) * on, uPlPulse);
      }
    }
  }
  float re = plOpenR(tt, uPlEaOn, 0.16, uPlCloseT);
  col = plDisc(col, u - vec2(uPlEaX * uPlAsp, uPlEaY), re, uPlPulse);
  return cCap(col);
}`,
  demo: "polyGateRipple(polySkyPlate(p, t), p, t)",
  deps: ["polySkyPlate"],
});

export const polyBladeWall = T("polyBladeWall", {
  doc: "weapon cards: a sword, spear or axe slides out of each Gate disc, all within 10 degrees of the 35 degree aim line, plus two large crossing foreground blades, 3-band steel with gold hilts",
  draws: "Steel swords, spears and axes slide out of the gold discs, every one pointing to the lower left, and two big blades cross at the bottom-left edge.",
  use: "card",
  params: "t: each blade starts 0.25 s after its disc and slides over one second; uPlBigOn: time the two large blades appear; uPlBladeGold: how much of the hilt shows gold.",
  uni: { uPlBigOn: 2.292, uPlBladeGold: 1.0 },
  deps: ["polyGateRipple"],
  body: `vec3 plBlade(vec3 col, vec2 q, vec2 dir, float len, float wid, float kind, float gold) {
  vec2 pr = vec2(-dir.y, dir.x);
  float a = dot(q, dir), b = dot(q, pr);
  float x = clamp(a / max(len, 1e-4), 0.0, 1.0);
  float wS = wid * (1.0 - 0.85 * x);
  float wP = max(wid * 0.18, wid * (1.0 - abs((x - 0.86) / 0.14)) * step(0.72, x));
  float dS = abs(b) - mix(wS, wP, step(0.5, kind));
  float wA = wid * 0.9 * sin(3.14159 * clamp((x - 0.55) / 0.35, 0.0, 1.0));
  float dA = min(abs(b) - wid * 0.18, max(-b, b - wA));
  float d = max(mix(dS, dA, step(1.5, kind)), max(-a, a - len));
  float v = clamp(b / (0.5 * wid), -1.0, 1.0);
  vec3 s = cCel3(v, -0.35, 0.35, ${C.stoneD}, ${C.stoneM}, ${C.stoneL});
  s = mix(s, ${C.goldM}, step(x, 0.12) * gold);
  return mix(col, s, cFill(d));
}
vec3 polyBladeWall(vec3 col, vec2 p, float t) {
  vec2 u = plU(p);
  float tt = plTwos(t);
  for (int l = 0; l < 3; l++) {
    float L = float(l);
    float cs = plLayer(L).x;
    vec2 g = floor(u / cs);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 id = g + vec2(float(i), float(j));
        vec2 c; float dia; float to; float tc;
        float on = plCell(id, L, c, dia, to, tc);
        float s = 1.0 - pow(1.0 - clamp((tt - to - 0.25) / 1.0, 0.0, 1.0), 3.0);
        float live = on * step(0.001, s) * (1.0 - step(tc + 0.5, tt));
        vec2 dir = plRot(PL_AIM, (plH(id + L * 13.0 + 1.0) - 0.5) * 0.35);
        float kind = floor(plH(id + L * 17.0 + 2.0) * 3.0);
        vec3 b = plBlade(col, u - c - dir * (dia * 0.9 * s - dia * 0.45), dir, dia * 1.1, dia * 0.14, kind, uPlBladeGold);
        col = mix(col, b, live);
      }
    }
  }
  float big = step(uPlBigOn, tt);
  vec2 dA = plRot(PL_AIM, 0.10), dB = plRot(PL_AIM, -0.14);
  col = mix(col, plBlade(col, u - vec2(0.50, 0.40), dA, 0.50, 0.05, 0.0, uPlBladeGold), big);
  col = mix(col, plBlade(col, u - vec2(0.34, 0.30), dB, 0.50, 0.05, 0.0, uPlBladeGold), big);
  return cCap(col);
}`,
  demo: "polyBladeWall(polyGateRipple(polySkyPlate(p, t), p, t), p, t)",
});

export const polyWallRim = T("polyWallRim", {
  doc: "Gate light on the seal: a hard thin #fadf92 band on the wall-facing edge only, mix 0.55 and 0.80 at the pulse, never a dressing",
  draws: "A thin hard gold edge along the wall-facing side of the seal's silhouette while the rest stays dark.",
  use: "surface",
  params: "uPlRim: 0 to 1 strength of the gold band (0.55 normal, 0.80 on the pulse); uPlRimW: band width as a fraction of the body radius.",
  uni: { uPlRim: 0.55, uPlRimW: 0.14 },
  body: `vec3 polyWallRim(vec3 col, vec2 p, float t) {
  vec2 c = cN(p);
  float r = length(c) / 0.469;
  float side = cAA(dot(c / max(length(c), 1e-4), normalize(vec2(-0.94, -0.34))), 0.25);
  float band = cAA(r, 1.0 - uPlRimW) * (1.0 - cAA(r, 1.0));
  return mix(col, ${C.gold}, band * side * uPlRim * cCover(p));
}`,
  demo: "polyWallRim(mix(vec3(0.12, 0.08, 0.14), vec3(0.34, 0.50, 0.70), cAA(cNdL(p), 0.5)) * cCover(p), p, t)",
});

export const polyVolleyWave = T("polyVolleyWave", {
  doc: "three volley waves at 8.5, 10.4 and 12.3 s: about 30 steel weapons each flying along the 35 degree aim line with a 4-step fading trail and 4-point glints on the tips",
  draws: "Rows of steel blades streak across the frame toward the lower left, each trailing four fading copies, with tiny cream four-point sparkles on the tips at launch.",
  use: "card",
  params: "t: waves start at 8.5, 10.4, 12.3 s and last 1.4 s; uPlSpeed: flight speed in frame heights per second; uPlLane: lane width (blade spacing across the flight).",
  uni: { uPlSpeed: 2.2, uPlLane: 0.04 },
  body: `vec3 polyVolleyWave(vec3 col, vec2 p, float t) {
  vec2 u = plU(p) - vec2(1.05, 0.90);
  vec2 pr = vec2(-PL_AIM.y, PL_AIM.x);
  float a = dot(u, PL_AIM), b = dot(u, pr);
  float lane = floor(b / uPlLane);
  float lb = b - (lane + 0.5) * uPlLane;
  float hh = plH(vec2(lane, 4.0));
  for (int w = 0; w < 3; w++) {
    float ws = 8.5 + 1.9 * float(w);
    float tw = plTwos(t) - ws;
    float act = step(0.0, tw) * step(tw, 1.6);
    float pres = step(0.15, plH(vec2(lane, 11.0 + float(w))));
    float head = -0.3 - plH(vec2(lane, 6.0 + float(w))) * 0.4 + tw * uPlSpeed * (0.85 + 0.3 * hh);
    for (int k = 0; k < 4; k++) {
      float kk = float(k);
      float d = max(abs(lb) - 0.006, abs(a - head + kk * 0.03) - 0.025);
      float al = mix(1.0, 0.5 - 0.15 * kk * (1.0 + 0.2 * kk), step(0.5, kk)) * act * pres;
      vec3 s = mix(${C.stoneM}, ${C.stoneL}, step(0.0, lb));
      col = mix(col, s, cFill(d) * al);
    }
    float gl = step(plH(vec2(lane, 21.0)), 0.07 + 0.015 * float(w)) * step(tw, 0.2) * step(0.0, tw) * pres;
    col = mix(col, ${C.core}, cStar4(vec2(a - head, lb), 0.02) * gl);
  }
  return cCap(col);
}`,
  demo: "polyVolleyWave(polySkyPlate(p, t), p, t + 8.5)",
  deps: ["polySkyPlate"],
});

export const polyEaRod = T("polyEaRod", {
  doc: "Ea: three cylinder segments in #1a0a10 with #d33d49 circuit lines and a #d3122e edge light, turning in alternate directions, drawn as a flat smear above 6 turns per second",
  draws: "A dark rod of three segments with red circuit lines wrapping round it, the segments turning opposite ways, blurring into flat red bands once it spins fast.",
  use: "card",
  params: "uPlEaCx, uPlEaCy: rod centre; uPlEaLen: rod length in frame heights; uPlEaPhase: turns accumulated so far (the engine integrates omega); uPlEaTurns: current turns per second (smear above 6); uPlEaRise: 0 to 1 how much has risen from the ripple.",
  uni: { uPlEaCx: 0.52, uPlEaCy: 0.50, uPlEaLen: 0.50, uPlEaPhase: 0, uPlEaTurns: 3, uPlEaRise: 1 },
  body: `vec3 polyEaRod(vec3 col, vec2 p, float t) {
  vec2 q = plU(p) - vec2(uPlEaCx * uPlAsp, uPlEaCy);
  vec2 pr = vec2(-PL_AIM.y, PL_AIM.x);
  float a = dot(q, PL_AIM) / uPlEaLen + 0.5, b = dot(q, pr);
  float w = 0.03;
  float seg = clamp(floor(a * 3.0), 0.0, 2.0);
  float sa = fract(a * 3.0);
  float d = max(abs(b) - w, max(-a, a - uPlEaRise));
  d = max(d, abs(sa - 0.5) * uPlEaLen / 3.0 - uPlEaLen / 6.0 + 0.004);
  float v = clamp(b / w, -0.999, 0.999);
  float th = asin(v) / 6.28318;
  float dir = mix(1.0, -1.0, mod(seg, 2.0));
  float sh = abs(fract((th + uPlEaPhase * dir) * 4.0) - 0.5);
  float line = 1.0 - cAA(sh, 0.06);
  float smear = cAA(uPlEaTurns, 6.0);
  vec3 c = mix(${C.shaft}, ${C.circ}, mix(line, 0.55, smear));
  c = mix(c, ${C.edge}, cAA(abs(v), 0.86));
  return cCap(mix(col, c, cFill(d)));
}`,
  demo: "polyEaRod(polySkyPlate(p, t), p, t)",
  deps: ["polySkyPlate"],
});

export const polyEnumaWind = T("polyEnumaWind", {
  doc: "log-spiral wind from the blade tip: hard red arms where 0.5 + 0.5 sin(5 theta + 14 ln r - 20 t) exceeds 0.5, ending at r = 1, each with a thin cream core, on ones at 24 fps",
  draws: "A hard-edged red spiral of five arms blasts outward from the blade tip and stops at a fixed radius, each arm with a thin cream core, or tightens into a coil round the blade.",
  use: "screen",
  params: "uPlWx, uPlWy: blade tip; uPlWt0: start time; uPlWon: 0 or 1; uPlWR: radius scale (1 for the full blast, 0.5 for the coil); uPlWcoil: 1 for the coil (same colours, the caller sets the smaller radius).",
  uni: { uPlWx: 0.40, uPlWy: 0.32, uPlWt0: 21.208, uPlWon: 1, uPlWR: 1, uPlWcoil: 0 },
  body: `vec3 polyEnumaWind(vec3 col, vec2 p, float t) {
  vec2 q = plU(p) - vec2(uPlWx * uPlAsp, uPlWy);
  float r = max(length(q), 1e-3) / max(uPlWR, 0.05);
  float th = atan(q.y, q.x);
  float tp = max(plOnes(t) - uPlWt0, 0.0);
  float a = 0.5 + 0.5 * sin(5.0 * th + 14.0 * log(r) - 20.0 * tp);
  float w = step(0.5, a) * (1.0 - cAA(r, 1.0));
  vec3 wc = mix(${C.windRed}, ${C.windCream}, step(0.86, a));
  return cCap(mix(col, wc, w * uPlWon));
}`,
  demo: "polyEnumaWind(polySkyPlate(p, t), p, t + 21.208)",
  deps: ["polySkyPlate"],
});

export const polyTear = T("polyTear", {
  doc: "the frame torn along the 35 degree aim line: a jagged gap with a gold lip, flat ink #1c0618 behind, the gap widening to 6 percent of the width",
  draws: "One jagged diagonal rip across the whole picture, gold at its edges, opening onto flat ink toward the lower left.",
  use: "mask",
  params: "uPlTear: 0 to 1 how far the halves have slid apart (0.06 of the width at 1); uPlTx, uPlTy: a point the tear passes through; uPlSeed: jag pattern.",
  uni: { uPlTear: 1, uPlTx: 0.50, uPlTy: 0.50 },
  body: `vec3 polyTear(vec3 col, vec2 p, float t) {
  vec2 q = plU(p) - vec2(uPlTx * uPlAsp, uPlTy);
  vec2 pr = vec2(-PL_AIM.y, PL_AIM.x);
  float a = dot(q, PL_AIM), s = dot(q, pr);
  float jag = (plH(vec2(floor(a * 22.0), 5.0)) - 0.5) * 0.05 + (cVn(vec2(a * 9.0, uPlSeed)) - 0.5) * 0.04;
  float hw = 0.5 * 0.06 * uPlAsp * clamp(uPlTear, 0.0, 1.0);
  float d = abs(s - jag) - hw;
  vec3 v = ${C.ink2};
  vec3 c = mix(col, v, cFill(d) * step(1e-3, uPlTear));
  return cCap(mix(c, ${C.gold2}, cLine(d, 2.5) * step(1e-3, uPlTear)));
}`,
  demo: "polyTear(polySkyPlate(p, t), p, t)",
  deps: ["polySkyPlate"],
});

export const polyShardFall = T("polyShardFall", {
  doc: "36 flat polygon shards falling from the torn red sky: #b42b1e, #7a0c09, #d3122e fills with a #fadf92 edge glint, gravity, tumble on twos, shrinking away",
  draws: "Three dozen flat red shards of different sizes tumble down the frame in steps and shrink to nothing, each with a thin gold edge.",
  use: "card",
  params: "uPlShT0: time they start to fall (23 s); uPlShG: fall acceleration in frame heights per second squared; t: tumble steps on twos.",
  uni: { uPlShT0: 23.0, uPlShG: 0.22 },
  body: `vec3 polyShardFall(vec3 col, vec2 p, float t) {
  vec2 u = plU(p);
  float s = max(plTwos(t) - uPlShT0, 0.0);
  float colm = floor(p.x * 12.0);
  for (int k = 0; k < 3; k++) {
    float kk = float(k);
    vec2 id = vec2(colm, kk);
    vec2 h = plH2(id + 31.0);
    float h2 = plH(id + 57.0);
    float sz = 0.03 + 0.09 * h2;
    vec2 c = vec2((colm + 0.2 + 0.6 * h.x) / 12.0 * uPlAsp, 0.55 + 0.45 * h.y - 0.5 * uPlShG * s * s * (0.6 + 0.8 * h2));
    float fade = 1.0 - clamp((s - 3.0) / 1.4, 0.0, 1.0);
    vec2 q = plRot(u - c, floor(s * 6.0) / 6.0 * (2.0 + 4.0 * h.x) + h.y * 6.28);
    q.x *= 0.6 + 0.8 * h2;
    float d = max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y)) - sz * 0.5 * fade;
    vec3 f = mix(mix(${C.shardA}, ${C.shardB}, step(0.33, h.x)), ${C.shardC}, step(0.66, h.x));
    f = mix(f, ${C.gold}, cLine(d, 2.0));
    col = mix(col, f, cFill(d) * step(0.001, s));
  }
  return cCap(col);
}`,
  demo: "polyShardFall(polySkyPlate(p, t), p, t + 23.0)",
  deps: ["polySkyPlate"],
});

export const polyGrade = T("polyGrade", {
  doc: "Ufotable grade: split tone per stage (night, red, red-black, island), luma cap 0.92, ink lift from #1a0e16, grain 0.02 on twos weighted by 1-Y, one capped white frame",
  draws: "The whole picture takes a stage tone, never goes brighter than 0.92 or darker than ink, carries a fine cel grain that steps twelve times a second, and can show one flat off-white frame.",
  use: "grade",
  params: "uPlGrRed, uPlGrBlack, uPlGrIsland: 0 to 1 stage mixes; uPlGrain: grain amount (0.02); uPlFlash: 1 for the single white frame #ebebeb.",
  uni: { uPlGrRed: 0, uPlGrBlack: 0, uPlGrIsland: 0, uPlGrain: 0.02, uPlFlash: 0 },
  body: `vec3 polyGrade(vec3 col, vec2 p, float t) {
  vec3 sh = mix(${C.nightSh}, ${C.redSh}, uPlGrRed);
  vec3 hi = mix(${C.nightHi}, ${C.redHi}, uPlGrRed);
  sh = mix(sh, ${C.rbT}, uPlGrBlack);
  sh = mix(sh, ${C.islSh}, uPlGrIsland);
  hi = mix(hi, ${C.islHi}, uPlGrIsland);
  float y = cLuma(col);
  vec3 c = mix(col, mix(sh, hi, clamp(y, 0.0, 1.0)), 0.28);
  float gn = (plH(floor(p * vec2(640.0, 400.0)) + plTwos(t) * 17.0) - 0.5) * uPlGrain * (1.0 - y);
  c = plLift(cCap(c + gn));
  return mix(c, ${C.white}, uPlFlash);
}`,
  demo: "polyGrade(polyGateRipple(polySkyPlate(p, t), p, t + 5.0), p, t)",
  deps: ["polySkyPlate", "polyGateRipple"],
});

export const polyKingHair = T("polyKingHair", {
  doc: "Gilgamesh hair on the seal: seven chunky flame-shaped blond spikes and a short forelock, 3 bands #8a6a28 / #e8c868 / #fadf92, ink line #5a3a10",
  draws: "A crown of seven pointed blond flame spikes on top of the seal's head with a small forelock curl, in three flat tones with a brown outline.",
  use: "surface",
  params: "uPlHairH: spike height as a fraction of the body radius (0.26 gives 12 percent of body length); uPlHairLean: how far the spikes sweep back.",
  uni: { uPlHairH: 0.26, uPlHairLean: 0.35 },
  body: `vec3 polyKingHair(vec3 col, vec2 p, float t) {
  vec2 c = cN(p);
  float R0 = 0.40;
  float r = length(c);
  float ph = atan(c.y, c.x);
  float dd = 1.0;
  float sd = 0.0;
  for (int k = 0; k < 8; k++) {
    float kk = float(k);
    float fl = step(6.5, kk);
    float h = uPlHairH * mix(0.7 + 0.3 * plH(vec2(kk, 2.0)) + 0.25 * (1.0 - abs(kk - 3.0) / 3.0), 0.55, fl);
    float pk = 1.5708 + (kk - 3.0) * 0.17 + fl * 0.42 - uPlHairLean * 0.1;
    float dp = ph - pk - uPlHairLean * (r - R0);
    float x = clamp((r - R0 + 0.02) / (h + 0.02), 0.0, 1.0);
    float e = max(abs(dp) * r - 0.055 * (1.0 - x), max(R0 - 0.02 - r, r - R0 - h));
    sd = mix(sd, dp, step(e, dd));
    dd = min(dd, e);
  }
  float v = clamp(0.5 - sd * 4.0 + (r - R0 - 0.12) * 2.0, 0.0, 1.0);
  vec3 hc = cCel3(v, 0.30, 0.72, ${C.hairS}, ${C.hair}, ${C.hairL});
  hc = mix(hc, ${C.hairInk}, cLine(dd, 2.0));
  return mix(col, hc, cFill(dd));
}`,
  demo: "polyKingHair(mix(vec3(0.34, 0.50, 0.70), vec3(0.12, 0.08, 0.14), cAA(cNdL(p), 0.5)) * cCover(p), p, t)",
});

export const polyGoldArmour = T("polyGoldArmour", {
  doc: "Gilgamesh gold on the seal: broad collar, small chest plate with 3 ridge lines over a violet bib #2a1a3a, two fore-flipper bracers and two ear studs, gold #c89a30 with #fadf92 lit and #6a3a08 shade",
  draws: "A gold neck collar, a small gold chest plate with three ridges over a dark violet bib, a gold band on each flipper root and a gold stud on each side of the head.",
  use: "surface",
  params: "t: unused; the armour sits in the seal's local frame around the body centre (0.72, 0.50) so it moves with the seal.",
  body: `float plGoldV(vec2 c) { return clamp(0.5 - c.x * 1.1 + c.y * 0.35, 0.0, 1.0); }
vec3 polyGoldArmour(vec3 col, vec2 p, float t) {
  vec2 c = cN(p);
  vec3 gl = cCel3(plGoldV(c), 0.38, 0.74, ${C.goldS}, ${C.goldM}, ${C.gold});
  float bib = length((c - vec2(0.0, -0.12)) / vec2(0.21, 0.16)) - 1.0;
  col = mix(col, ${C.bib}, cFill(bib));
  float plate = length((c - vec2(0.0, -0.12)) / vec2(0.16, 0.12)) - 1.0;
  vec3 pl = gl;
  for (int k = 0; k < 3; k++) { pl = mix(pl, ${C.goldS}, cLine(c.y + 0.16 - 0.04 * float(k), 1.6)); }
  pl = mix(pl, ${C.core}, cLine(c.x * 0.7 + c.y + 0.02, 1.6) * 0.8);
  col = mix(col, pl, cFill(plate));
  float collar = abs(length((c - vec2(0.0, 0.14)) * vec2(1.0, 2.2)) - 0.30) - 0.035;
  col = mix(col, gl, cFill(collar) * cCover(p));
  float br = min(length((c - vec2(-0.30, -0.10)) / vec2(0.035, 0.07)) - 1.0, length((c - vec2(0.30, -0.10)) / vec2(0.035, 0.07)) - 1.0);
  col = mix(col, gl, cFill(br));
  float stud = min(length(c - vec2(-0.20, 0.30)), length(c - vec2(0.20, 0.30))) - 0.018;
  return mix(col, ${C.gold}, cFill(stud));
}`,
  demo: "polyGoldArmour(mix(vec3(0.34, 0.50, 0.70), vec3(0.12, 0.08, 0.14), cAA(cNdL(p), 0.5)) * cCover(p), p, t)",
});

export const polyKingEye = T("polyKingEye", {
  doc: "Gilgamesh eyes on the seal: narrow half-lidded smirk eyes, crimson iris #d83a28 with a #7a0c09 lower band, slit pupil, two highlights that go #ff2a3a when Ea levels",
  draws: "Two narrow sloped red eyes with dark slit pupils and one hard cream highlight each, the lids cut flat across the top; later the highlight and iris turn bright red.",
  use: "surface",
  params: "uPlEyeLevel: 0 to 1 how far the catch-light and iris have turned red; uPlEyeOpen: 0 to 1 lid opening (0.5 half-lid, 1 wide).",
  uni: { uPlEyeLevel: 0, uPlEyeOpen: 0.5 },
  body: `vec3 plEye(vec3 col, vec2 e, float sx, float lv, float op) {
  float d = length(e / vec2(0.075, 0.04 * (0.5 + op))) - 1.0;
  d = max(d, e.y - 0.004 - sx * e.x * 0.25 - 0.012 * op);
  vec3 ir = mix(mix(${C.iris}, ${C.irisL}, cAA(-e.y, 0.012)), ${C.glint}, lv);
  float pup = cFill(max(abs(e.x - sx * 0.008) - 0.007, abs(e.y) - 0.026));
  vec3 c = mix(ir, ${C.ink}, pup);
  c = mix(c, mix(${C.core}, ${C.glint}, lv), cFill(length(e - vec2(-0.02, 0.012)) - 0.009));
  c = mix(c, ${C.core}, cFill(length(e - vec2(0.022, -0.012)) - 0.004));
  c = mix(c, ${C.ink}, cLine(d, 1.6));
  return mix(col, c, cFill(d));
}
vec3 polyKingEye(vec3 col, vec2 p, float t) {
  vec2 c = cN(p);
  col = plEye(col, c - vec2(-0.13, 0.25), -1.0, uPlEyeLevel, uPlEyeOpen);
  return plEye(col, c - vec2(0.13, 0.25), 1.0, uPlEyeLevel, uPlEyeOpen);
}`,
  demo: "polyKingEye(mix(vec3(0.34, 0.50, 0.70), vec3(0.12, 0.08, 0.14), cAA(cNdL(p), 0.5)) * cCover(p), p, t)",
});

export const CUT_SHADERS = [
  polyKit, polySkyPlate, polyCityLamp, polyGateRipple, polyBladeWall, polyWallRim, polyVolleyWave,
  polyEaRod, polyEnumaWind, polyTear, polyShardFall, polyGrade, polyKingHair, polyGoldArmour, polyKingEye,
];
export const CUT_SHADER_COUNT = 15;
export default CUT_SHADERS;
