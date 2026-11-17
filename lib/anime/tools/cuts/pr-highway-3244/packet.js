// pr-highway-3244 packet shaders: Fate/Zero Gordius Wheel, Ufotable night street, bolts, marble dome, desert, army, grade.
import { defineCut } from "../kit.glsl.js";

const F = "pr-highway-3244";
const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
const C = { ink: H("#1a0e16"), top: H("#172e88"), hor: H("#312126"), rim: H("#4085e8"), card: H("#1a2250"), core: H("#bffef8"), body: H("#76d8d6"), purple: H("#8a5aff"),
  gold: H("#ffc926"), bronze: H("#e6b04a"), bronzeSh: H("#a8782a"), bronzeHi: H("#f2c668"), bullSh: H("#1a1424"), bull: H("#2a2036"), bullHi: H("#3c3050"), mask: H("#b02838"), maskSh: H("#7a1a26"), harn: H("#2a4a88"),
  p1: H("#18515d"), p2: H("#5b938c"), wall: H("#4c4f4a"), flash: H("#f2fef9"), skyA: H("#9daaa8"), skyB: H("#a8b4ad"), hi: H("#f7f698"), sand: H("#f3e07f"), dune: H("#e9be65"), wind: H("#f9fb98"),
  army: H("#8c3c30"), cape: H("#c3122e"), dust: H("#7f93b8"), white: H("#ebebeb"), nSh: H("#0b0504"), nHi: H("#95d0d5"), dSh: H("#c9be8d"), dHi: H("#f9fb98") };

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const NUM = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

function T(name, { doc, draws, use, params, uni = {}, deps = [], body, demo }) {
  const m = defineCut(name, F, doc, `${NUM(uni)}\n${body}`, demo);
  return { ...m, deps: ["cutKit", "hwKit", ...deps], draws, use, suits: F, params, uniforms: U(uni) };
}

export const hwKit = {
  name: "hwKit",
  family: F,
  doc: "highway helpers: H-unit uv, frame clock, jagged bolt polyline, bolt paint",
  deps: ["cutKit"],
  glsl: `uniform float uHwSeed;
uniform float uHwAsp;
vec2 hwU(vec2 p) { return vec2(p.x * uHwAsp, p.y); }
float hwFr(float t, float fps) { return floor(t * fps + 0.001); }
float hwSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
vec2 hwBoltPt(vec2 a, vec2 b, float seed, float amp, float fi) {
  vec2 dir = b - a;
  vec2 nrm = normalize(vec2(-dir.y, dir.x) + vec2(1e-5));
  float o = (cH21(vec2(fi, seed)) - 0.5) + 0.55 * (cH21(vec2(fi * 2.0 + 0.5, seed + 9.1)) - 0.5);
  return a + dir * (fi / 10.0) + nrm * o * amp * length(dir) * sin(3.14159265 * fi / 10.0);
}
float hwBoltD(vec2 p, vec2 a, vec2 b, float seed, float amp) {
  float d = 1e3;
  vec2 prev = a;
  for (int i = 1; i <= 10; i++) {
    vec2 q = hwBoltPt(a, b, seed, amp, float(i));
    d = min(d, hwSeg(p, prev, q));
    prev = q;
  }
  return d;
}
vec3 hwBoltPaint(vec3 c, float d, float w) {
  c += ${C.purple} * exp(-max(d, 0.0) / 0.05) * 0.22;
  c = mix(c, ${C.body}, cFill(d - 0.012 * w));
  return mix(c, ${C.core}, cFill(d - 0.004 * w));
}`,
  uniforms: U({ uHwSeed: 3244, uHwAsp: 2.39 }),
  demo: `vec3 demo(vec2 p, float t) { return cCap(hwBoltPaint(${C.card}, hwBoltD(hwU(p), hwU(vec2(0.5, 1.0)), hwU(vec2(0.5, 0.1)), 3.0, 0.18), 1.0)); }`,
};

export const hwNightSky = T("hwNightSky", {
  doc: "Fate/Zero night plate: indigo #172e88 sky with three lightning-lit cloud bands and warehouse and keep silhouette cards",
  draws: "A deep blue night sky with three flat pale-blue cloud bands and blue-black warehouse and castle silhouettes rimmed in light along the horizon.",
  use: "plate",
  params: "uHwSkyHz: horizon height as a fraction of frame, y up; uHwSkyFlash: 0 to 1, how much the cloud bands light up when a bolt strikes.",
  uni: { uHwSkyHz: 0.42, uHwSkyFlash: 0.0 },
  body: `vec3 hwNightSky(vec2 p, float t) {
  vec2 u = hwU(p);
  float s = clamp((p.y - uHwSkyHz) / max(1.0 - uHwSkyHz, 0.05), 0.0, 1.0);
  vec3 c = ${C.top};
  c = mix(mix(${C.top}, ${C.hor}, 0.4), c, cAA(s, 0.12));
  c = mix(${C.hor}, c, cAA(s, 0.05));
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float wob = 0.025 * sin(u.x * (2.0 + fi) + fi * 2.1 + uHwSeed * 0.01) + 0.012 * sin(u.x * 9.0 + fi);
    float d = abs(p.y - (0.58 + fi * 0.13) - wob) - (0.016 + 0.006 * fi);
    float lit = cAA(cFbm(vec2(u.x * 3.0 + fi * 5.0, fi)), 0.45);
    c = mix(c, ${C.rim}, cFill(d) * mix(0.30, 0.55, lit) * (1.0 + 0.5 * uHwSkyFlash));
  }
  float w1 = max(abs(p.x - 0.14) - 0.12, abs(p.y - uHwSkyHz - 0.045) - 0.045);
  float w2 = max(abs(p.x - 0.46) - 0.10, abs(p.y - uHwSkyHz - 0.035) - 0.035);
  float kp = max(abs(p.x - 0.93) - 0.045, abs(p.y - uHwSkyHz - 0.08) - 0.08 - 0.012 * step(0.5, fract(p.x * 70.0)));
  float dc = min(w1, min(w2, kp));
  c = mix(c, ${C.card}, cFill(dc));
  c = mix(c, ${C.rim}, cLine(dc, 2.0) * 0.8 * cAA(p.y - uHwSkyHz, 0.0));
  return cCap(c);
}`,
  demo: "hwNightSky(p, t)",
});

export const hwWetStreet = T("hwWetStreet", {
  doc: "Fate/Zero night street: hwNightSky above a horizon, ink-dark wet cobbles below with cool highlight streaks",
  draws: "A night street in perspective, near-black cobbles in two dark blues with thin pale-blue wet glints, under the blue night sky.",
  use: "plate",
  params: "uHwSkyHz (from hwNightSky) sets the horizon; uHwSeed moves which stones glint.",
  deps: ["hwNightSky"],
  body: `vec3 hwWetStreet(vec2 p, float t) {
  vec3 c = hwNightSky(p, t);
  float dz = max(uHwSkyHz - p.y, 0.02);
  vec2 q = vec2((p.x - 0.5) * uHwAsp / dz * 0.10 * 4.0, 0.06 / dz);
  vec2 cell = floor(q);
  vec2 f = fract(q) - 0.5;
  float h = cH21(cell + uHwSeed * 0.01);
  vec3 g = mix(${C.ink}, mix(${C.ink}, ${C.card}, 0.45), cAA(h, 0.55));
  g = mix(g, ${C.ink}, cAA(max(abs(f.x), abs(f.y)), 0.46));
  float glint = cAA(h, 0.80) * (1.0 - cAA(abs(f.y), 0.14)) * (1.0 - cAA(max(abs(f.x), abs(f.y)), 0.46));
  g = mix(g, ${C.rim}, glint * 0.20);
  return mix(c, g, 1.0 - cAA(p.y, uHwSkyHz));
}`,
  demo: "hwWetStreet(p, t)",
});

export const hwSkyBolt = T("hwSkyBolt", {
  doc: "F14: three forked cyan bolts with purple glow from the sky to the wheel, re-seeded on every drawn frame",
  draws: "Three jagged white-cyan lightning bolts with a thin purple halo fork down from the top of the night frame to one point.",
  use: "card",
  params: "uHwBlFps: re-seed rate, 12 in the descent; uHwBlX: x of the sky end; uHwBlTx, uHwBlTy: where the bolts land; uHwBlAmp: jag size; uHwBlOn: 1 draws, 0 hides.",
  uni: { uHwBlFps: 12.0, uHwBlX: 0.62, uHwBlTx: 0.78, uHwBlTy: 0.45, uHwBlAmp: 0.18, uHwBlOn: 1.0 },
  deps: ["hwWetStreet"],
  body: `vec3 hwSkyBolt(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwWetStreet(p, t);
  float s = hwFr(t, uHwBlFps) * 3.713 + uHwSeed * 0.01;
  float d = 1e3;
  for (int k = 0; k < 3; k++) {
    float fk = float(k) - 1.0;
    vec2 a = hwU(vec2(uHwBlX + fk * 0.07 + (cH21(vec2(fk + 1.0, s)) - 0.5) * 0.08, 1.02));
    vec2 b = hwU(vec2(uHwBlTx + fk * 0.05, uHwBlTy + fk * 0.02));
    float sk = s + (fk + 1.0) * 7.7;
    d = min(d, hwBoltD(u, a, b, sk, uHwBlAmp));
    vec2 r = hwBoltPt(a, b, sk, uHwBlAmp, 5.0);
    d = min(d, hwBoltD(u, r, r + vec2(fk * 0.12 + 0.05, -0.18), sk + 40.0, uHwBlAmp * 0.8));
  }
  d = mix(1e3, d, step(0.5, uHwBlOn));
  return cCap(hwBoltPaint(c, d, 1.0));
}`,
  demo: "hwSkyBolt(p, t)",
});

export const hwHoofCrawl = T("hwHoofCrawl", {
  doc: "F15: four short cyan bolts under the bull hooves, straight down before the landing and crawling along the street after",
  draws: "Four short jagged cyan sparks of lightning at the street level, first jabbing down, then lying along the ground.",
  use: "card",
  params: "uHwHfX, uHwHfY: left hoof position; uHwHfCrawl: 0 jabbing down to 1 crawling sideways; uHwHfFps: re-seed rate.",
  uni: { uHwHfX: 0.66, uHwHfY: 0.22, uHwHfCrawl: 0.0, uHwHfFps: 12.0 },
  deps: ["hwWetStreet"],
  body: `vec3 hwHoofCrawl(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwWetStreet(p, t);
  float s = hwFr(t, uHwHfFps) * 5.17 + uHwSeed * 0.01;
  float d = 1e3;
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    vec2 a = hwU(vec2(uHwHfX + fk * 0.045 + floor(fk * 0.5) * 0.03, uHwHfY));
    float len = mix(0.05, 0.12, cH21(vec2(fk, s)));
    vec2 dv = mix(vec2(0.0, -1.0), vec2(mod(fk, 2.0) * 2.0 - 1.0, -0.12), uHwHfCrawl);
    d = min(d, hwBoltD(u, a, a + normalize(dv) * len, s + fk * 2.3, 0.35));
  }
  return cCap(hwBoltPaint(c, d, 0.7));
}`,
  demo: "hwHoofCrawl(p, t)",
});

export const hwWheelGlow = T("hwWheelGlow", {
  doc: "F16: bronze Gordius Wheel with eight spokes and axle scythes, gold emissive only on rim, hubs and scythe edges, plus 24 rim sparks",
  draws: "A flat bronze wheel with eight spokes and two pointed blades off the axle, its rim, hub and blade edges lit gold with a halo and a few gold sparks flying off.",
  use: "card",
  params: "uHwWhX, uHwWhY: wheel centre; uHwWhR: radius in frame heights; uHwWhEmit: 0 to 1 gold glow; uHwWhSpin: spoke turn rate in radians per second, stepped on twos.",
  uni: { uHwWhX: 0.78, uHwWhY: 0.45, uHwWhR: 0.16, uHwWhEmit: 1.0, uHwWhSpin: 1.2 },
  deps: ["hwWetStreet"],
  body: `vec3 hwWheelGlow(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwWetStreet(p, t);
  vec2 q = u - hwU(vec2(uHwWhX, uHwWhY));
  float R = uHwWhR;
  float r = length(q);
  float spin = floor(t * 6.0 + 0.001) / 6.0 * uHwWhSpin;
  float ring = abs(r - R) - R * 0.09;
  float hub = r - R * 0.14;
  float sp = 1e3;
  for (int i = 0; i < 4; i++) {
    float a = spin + float(i) * 0.785398;
    sp = min(sp, abs(dot(q, vec2(-sin(a), cos(a)))) - R * 0.028);
  }
  sp = max(sp, r - R);
  float ax = abs(q.x);
  float half_ = R * 0.07 * clamp(1.0 - (ax - R * 0.85) / (R * 0.6), 0.0, 1.0);
  float scy = max(abs(q.y) - half_, max(ax - R * 1.45, R * 0.85 - ax));
  float body = min(min(ring, sp), min(hub, scy));
  float l = 0.5 + 0.5 * dot(normalize(q + vec2(1e-4)), vec2(0.5, 0.85));
  vec3 col = cCel3(l, 0.35, 0.7, ${C.bronzeSh}, ${C.bronze}, ${C.bronzeHi});
  c = mix(c, col, cFill(body));
  c = mix(c, max(${C.bronze} * 0.32, ${C.ink}), cLine(body, 2.5) * 0.9);
  float em = max(cFill(hub), max(cLine(ring, 3.0), cLine(scy, 3.0)));
  c = mix(c, ${C.gold}, em * uHwWhEmit);
  c += ${C.gold} * exp(-max(body, 0.0) / 0.04) * 0.28 * uHwWhEmit;
  float fr = hwFr(t, 12.0);
  float sparks = 0.0;
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float h = cH21(vec2(fi, uHwSeed * 0.01));
    float ph = fract(fr * 0.11 + h * 7.0);
    vec2 sc = vec2(cos(h * 6.2832), sin(h * 6.2832)) * R * (1.0 + ph * 0.5);
    sparks = max(sparks, cFill(length(q - sc) - 0.005 * (1.0 - ph)));
  }
  c = mix(c, ${C.gold}, sparks * uHwWhEmit);
  return cCap(c);
}`,
  demo: "hwWheelGlow(p, t)",
});

export const hwBullHide = T("hwBullHide", {
  doc: "Divine Bull side view: three-value dark body with clump-fur contour, blue harness, red face mask and a cold slit eye",
  draws: "A heavy dark bull in profile with a red graphic face mask, a blue harness band across the shoulders, bronze horns, and a cyan slit eye that can switch on.",
  use: "card",
  params: "uHwBuX, uHwBuY: bull centre; uHwBuS: body scale in frame heights; uHwBuEye: 0 to 1 eye slit; uHwBuDesert: 1 draws on the desert plate, 0 on the night street.",
  uni: { uHwBuX: 0.35, uHwBuY: 0.30, uHwBuS: 0.11, uHwBuEye: 0.0, uHwBuDesert: 0.0 },
  deps: ["hwWetStreet", "hwDesertPlate"],
  body: `vec3 hwBullHide(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = uHwBuDesert > 0.5 ? hwDesertPlate(p, t) : hwWetStreet(p, t);
  float S = uHwBuS;
  vec2 q = (u - hwU(vec2(uHwBuX, uHwBuY))) / S;
  float a = atan(q.y, q.x);
  float db = (length(q / vec2(1.3, 0.75)) - 1.0) * 0.75 - 0.05 * abs(fract(a * 1.9) - 0.5);
  float dh = (length((q - vec2(1.5, -0.05)) / vec2(0.62, 0.5)) - 1.0) * 0.5;
  float dm = (length((q - vec2(1.82, -0.08)) / vec2(0.42, 0.4)) - 1.0) * 0.4;
  float horn = min(hwSeg(q, vec2(1.5, 0.3), vec2(1.25, 0.78)), hwSeg(q, vec2(1.62, 0.3), vec2(1.55, 0.85))) - 0.05;
  float bull = min(min(db, dh), horn) * S;
  float l = 0.5 + 0.5 * dot(normalize(q - vec2(0.5, 0.0) + vec2(1e-3)), vec2(0.55, 0.83));
  vec3 col = cCel3(l, 0.4, 0.78, ${C.bullSh}, ${C.bull}, ${C.bullHi});
  vec3 hs = cCel3(l, 0.4, 0.78, ${C.harn} * 0.55, ${C.harn}, ${C.harn} * 1.35);
  col = mix(col, hs, cFill(abs(q.x - 0.35) - 0.09) * cFill(db));
  col = mix(col, cCel3(l, 0.4, 0.78, ${C.maskSh}, ${C.mask}, ${C.mask} * 1.2), cFill(dm) * cFill(dh));
  col = mix(col, ${C.mask} * 0.35, cLine(dm, 2.0) * cFill(dh));
  col = mix(col, ${C.bronze}, cFill(horn) * cAA(q.y, 0.55));
  float eye = length((q - vec2(1.78, 0.02)) / vec2(0.13, 0.035)) - 1.0;
  col = mix(col, ${C.body}, cFill(eye) * uHwBuEye);
  c = mix(c, col, cFill(bull));
  c = mix(c, ${C.ink}, cLine(bull, 2.5) * 0.9);
  c += ${C.body} * exp(-max(eye, 0.0) * 2.0) * 0.10 * uHwBuEye * cFill(dm);
  return cCap(c);
}`,
  demo: "hwBullHide(p, t)",
});

export const hwCourtyard = T("hwCourtyard", {
  doc: "E11 courtyard: nine by nine cool cyan tile floor in two panels, ink joints, a cyan ring inlay, four corner walls, ink surround",
  draws: "A top-down floor of teal and grey-green square tiles with dark joints, a pale cyan ring inlaid at its centre, low stone blocks at the four corners and darkness beyond.",
  use: "plate",
  params: "uHwCyX, uHwCyY: floor centre; uHwCyTile: tile size in frame heights.",
  uni: { uHwCyX: 0.5, uHwCyY: 0.5, uHwCyTile: 0.07 },
  body: `vec3 hwCourtyard(vec2 p, float t) {
  vec2 u = hwU(p);
  vec2 q = (u - hwU(vec2(uHwCyX, uHwCyY))) / uHwCyTile;
  vec2 cell = floor(q + 4.5);
  vec2 f = fract(q + 4.5) - 0.5;
  vec3 g = mix(${C.p1}, ${C.p2}, mod(cell.x + cell.y, 2.0));
  g = mix(g, g * 1.12, cAA(cH21(cell + uHwSeed * 0.01), 0.7));
  g = mix(g, ${C.ink}, cAA(max(abs(f.x), abs(f.y)), 0.46));
  g = mix(g, ${C.body}, cFill(abs(length(q) - 1.667) - 0.07));
  vec2 qa = abs(q);
  float dw = max(abs(qa.x - 4.0), abs(qa.y - 4.0)) - 0.5;
  g = mix(g, mix(${C.wall} * 0.75, ${C.wall}, cAA(f.x + f.y, 0.0)), cFill(dw));
  return mix(${C.ink}, g, cFill(max(abs(q.x), abs(q.y)) - 4.5));
}`,
  demo: "hwCourtyard(p, t)",
});

export const hwMarbleDome = T("hwMarbleDome", {
  doc: "F19: Ionioi Hetairoi dome, a white-cyan flash growing from the seal in four hard bands with a bright rim, sampled at 12 fps",
  draws: "A pale cyan-white dome of light swells outward from one point over the courtyard in flat bands, the tile floor showing only past its bright edge.",
  use: "mask",
  params: "uHwDmX, uHwDmY: dome centre, the seal on screen; uHwDm0: start time in seconds; uHwDmDur: grow time in seconds.",
  uni: { uHwDmX: 0.5, uHwDmY: 0.5, uHwDm0: 3.5, uHwDmDur: 1.0 },
  deps: ["hwCourtyard"],
  body: `vec3 hwMarbleDome(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwCourtyard(p, t);
  float tau = clamp((floor(t * 12.0 + 0.001) / 12.0 - uHwDm0) / max(uHwDmDur, 0.1), 0.0, 1.0);
  float e = 1.0 - tau;
  float r = 1.4 * (1.0 - e * e * e);
  float d = length(u - hwU(vec2(uHwDmX, uHwDmY)));
  float on = step(0.001, r);
  float k = clamp(pow(max(1.0 - d / max(r, 1e-3), 0.0), 0.6) * 1.5, 0.0, 1.0);
  k = floor(k * 4.0 + 0.5) / 4.0;
  c = mix(c, ${C.flash}, k * cFill(d - r) * on);
  c = mix(c, ${C.flash}, cFill(abs(d - r) - 0.014) * 0.5 * on);
  return cCap(c);
}`,
  demo: "hwMarbleDome(p, t)",
});

export const hwDesertPlate = T("hwDesertPlate", {
  doc: "E11 desert: thin grey-blue sky band over bleached sand dunes in three flat values, scrolling with distance",
  draws: "A pale gold desert in perspective, dunes cut in three flat sand tones with jagged orange shadow edges, under a thin blue-grey sky band at the top.",
  use: "plate",
  params: "uHwDsHz: horizon depth from the top in frame heights, 0.13 then 0.18; uHwDsDist: world scroll offset, raises with the platform ride.",
  uni: { uHwDsHz: 0.18, uHwDsDist: 0.0 },
  body: `vec3 hwDesertPlate(vec2 p, float t) {
  vec2 u = hwU(p);
  float py = 1.0 - p.y;
  vec3 sky = mix(${C.skyB}, ${C.skyA}, cAA(py, uHwDsHz * 0.5));
  float dep = 0.12 / max(py - uHwDsHz, 0.004);
  float x = (u.x - uHwAsp * 0.5) * dep + uHwDsDist;
  float w = sin(dep * 6.0 + sin(x * 2.3) * 1.4 + cFbm(vec2(x * 1.7, dep * 2.0)) * 2.2);
  vec3 sand = mix(${C.sand}, ${C.dune}, cAA(w, 0.35));
  sand = mix(${C.hi}, sand, cAA(w, -0.55));
  sand = mix(sand, ${C.sand}, smoothstep(8.0, 24.0, dep));
  return cCap(mix(sky, sand, cAA(py, uHwDsHz)));
}`,
  demo: "hwDesertPlate(p, t)",
});

export const hwArmyBand = T("hwArmyBand", {
  doc: "F22 and F31: 220 brick-red specks along the desert horizon shimmering on twos, 40 as red-caped micro seals, widening into diagonal charge bands",
  draws: "A thin line of dark red specks along the horizon, a few with tiny red capes and bronze helmets, that thickens and grows toward the lens under diagonal red speed bands.",
  use: "card",
  params: "uHwArY: band centre height, y up; uHwArH: band thickness; uHwArCharge: 0 standing to 1 charging, widens the band, enlarges specks and fades in the speed bands.",
  uni: { uHwArY: 0.83, uHwArH: 0.03, uHwArCharge: 0.0 },
  deps: ["hwDesertPlate"],
  body: `vec3 hwArmyBand(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwDesertPlate(p, t);
  float ch = uHwArCharge;
  vec2 vp = vec2(uHwAsp * 0.5, 1.0 - uHwDsHz);
  for (int i = 0; i < 8; i++) {
    float a = (float(i) - 3.5) * 0.0698;
    vec2 dir = vec2(sin(a), -cos(a));
    vec2 w = u - vp;
    float along = dot(w, dir);
    float across = abs(w.x * dir.y - w.y * dir.x);
    c = mix(c, ${C.army} * 0.55, cFill(across - 0.015 * clamp(along * 1.2, 0.0, 1.0)) * step(0.0, along) * 0.4 * ch);
  }
  float fr = hwFr(t, 12.0);
  float cx = floor(p.x * 220.0);
  float h = cH21(vec2(cx, uHwSeed * 0.01));
  float big = step(0.82, cH21(vec2(cx, 41.0)));
  float sc = 1.0 + ch * 1.6 + big * 0.9;
  float yc = uHwArY - ch * 0.05 + (h - 0.5) * uHwArH * (1.0 + ch * 3.0);
  float dx = (fract(p.x * 220.0) - 0.5) * (uHwAsp / 220.0);
  float dy = p.y - yc;
  vec3 sp = ${C.army} * 0.55 * mix(1.0, 1.35, step(0.5, cH21(vec2(cx, floor(fr * 0.5)))));
  float body = max(abs(dx) - 0.0030 * sc, abs(dy) - 0.0040 * sc);
  c = mix(c, sp, cFill(body));
  float cape = max(abs(dx) - 0.0026 * sc, abs(dy + 0.0042 * sc) - 0.0035 * sc);
  c = mix(c, ${C.cape}, cFill(cape) * big);
  float helm = length(vec2(dx, dy - 0.0045 * sc)) - 0.0016 * sc;
  c = mix(c, ${C.bronze}, cFill(helm) * big);
  return cCap(c);
}`,
  demo: "hwArmyBand(p, t)",
});

export const hwSandStreaks = T("hwSandStreaks", {
  doc: "F21 and F30: tapered pale-gold and orange sand streaks over the desert, flat wind or a 12 degree ride, fading as exp(-t/0.6)",
  draws: "Thin straight streaks of pale yellow and orange sand slide across the dunes, long and level in the wind, slanted and fading out when riding.",
  use: "screen",
  params: "uHwSsCount: streaks drawn, up to 60; uHwSsAng: slant in radians; uHwSsLen, uHwSsSpan: shortest length and extra random length; uHwSsT0: fade start time; uHwSsDecay: 0 constant, 1 fades with exp(-t/0.6); uHwSsDist: world offset that slides the streaks.",
  uni: { uHwSsCount: 40.0, uHwSsAng: 0.0, uHwSsLen: 0.2, uHwSsSpan: 0.3, uHwSsT0: 0.0, uHwSsDecay: 0.0, uHwSsDist: 0.0 },
  deps: ["hwDesertPlate"],
  body: `vec3 hwSandStreaks(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwDesertPlate(p, t);
  float inten = mix(1.0, exp(-max(t - uHwSsT0, 0.0) / 0.6), step(0.001, uHwSsDecay));
  vec2 dir = vec2(cos(uHwSsAng), sin(uHwSsAng));
  for (int i = 0; i < 60; i++) {
    float fi = float(i);
    float on = step(fi + 0.5, uHwSsCount);
    float h1 = cH21(vec2(fi, uHwSeed * 0.01));
    float h2 = cH21(vec2(fi, 13.7));
    float len = uHwSsLen + h2 * uHwSsSpan;
    float wd = uHwAsp + len;
    float xs = mod(h2 * wd + uHwSsDist * (0.6 + 0.8 * h1), wd) - len * 0.5;
    vec2 a = vec2(xs, h1);
    float d = hwSeg(u, a, a + dir * len);
    c = mix(c, mix(${C.wind}, ${C.dune}, step(0.5, h1)), cFill(d - 0.002) * inten * on * 0.85);
  }
  return cCap(c);
}`,
  demo: "hwSandStreaks(p, t)",
});

export const hwKillStrike = T("hwKillStrike", {
  doc: "F24, F27 and F28: bolts strike down to two bull masks on the desert, merge into one column with a colour fringe, then one flat white frame",
  draws: "Two cyan-white lightning trunks with forks stab down onto two points over a dimmed desert, then join into one wide column, then the whole picture goes flat pale grey.",
  use: "card",
  params: "uHwKlBolt: 0 to 1 how far down the bolts have reached; uHwKlMerge: 1 for the merged column and fringe; uHwKlWhite: 1 for the flat replace frame; uHwKlX0, uHwKlX1, uHwKlY: where the two bolts land.",
  uni: { uHwKlBolt: 0.0, uHwKlMerge: 0.0, uHwKlWhite: 0.0, uHwKlX0: 0.18, uHwKlX1: 0.32, uHwKlY: 0.38 },
  deps: ["hwDesertPlate"],
  body: `vec3 hwKillStrike(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwDesertPlate(p, t);
  float s = hwFr(t, 24.0) * 2.917 + uHwSeed * 0.01;
  float prog = clamp(uHwKlBolt, 0.0, 1.0);
  float d = 1e3;
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float tx = mix(uHwKlX0, uHwKlX1, fk);
    vec2 a = hwU(vec2(tx + (cH21(vec2(fk, s)) - 0.5) * 0.10, 1.02));
    vec2 b = mix(a, hwU(vec2(tx, uHwKlY)), prog);
    float sk = s + fk * 7.7;
    d = min(d, hwBoltD(u, a, b, sk, 0.16));
    vec2 r1 = hwBoltPt(a, b, sk, 0.16, 6.0);
    vec2 r2 = hwBoltPt(a, b, sk, 0.16, 3.0);
    d = min(d, hwBoltD(u, r1, r1 + vec2(0.11, -0.14), sk + 40.0, 0.2));
    d = min(d, hwBoltD(u, r2, r2 + vec2(-0.10, -0.12), sk + 80.0, 0.2));
  }
  d = mix(1e3, d, step(0.001, prog));
  c *= 1.0 - 0.30 * exp(-max(d, 0.0) / 0.12) * step(0.001, prog);
  c = hwBoltPaint(c, d, 1.0);
  float xm = hwU(vec2(0.5 * (uHwKlX0 + uHwKlX1), 0.0)).x;
  float low = step(uHwKlY - 0.02, p.y);
  float m = uHwKlMerge;
  c.r = mix(c.r, ${C.core}.r, cFill(abs(u.x - xm + 0.003) - 0.025) * low * m);
  c.g = mix(c.g, ${C.core}.g, cFill(abs(u.x - xm) - 0.025) * low * m);
  c.b = mix(c.b, ${C.core}.b, cFill(abs(u.x - xm - 0.003) - 0.025) * low * m);
  c = mix(c, ${C.white}, step(0.5, uHwKlWhite));
  return cCap(c);
}`,
  demo: "hwKillStrike(p, t)",
});

export const hwDustRing = T("hwDustRing", {
  doc: "F13 and F17: a ring of flat cel dust puffs bursting from a point and drifting out, two bands lit from the upper right, inked",
  draws: "Round grey-blue dust puffs with a dark outline fly outward from one spot along the ground in a flattened ring, fading to pale blue as they spread.",
  use: "card",
  params: "uHwDuX, uHwDuY: burst centre on the ground; uHwDuR: 0 to 1 how far the burst has spread; uHwDuMax: ring radius at 1 in frame heights; uHwDuN: puffs, up to 14.",
  uni: { uHwDuX: 0.74, uHwDuY: 0.20, uHwDuR: 0.0, uHwDuMax: 0.3, uHwDuN: 14.0 },
  deps: ["hwWetStreet"],
  body: `vec3 hwDustRing(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwWetStreet(p, t);
  float pr = clamp(uHwDuR, 0.0, 1.0);
  vec2 o = hwU(vec2(uHwDuX, uHwDuY));
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float on = step(fi + 0.5, uHwDuN) * step(0.001, pr);
    float h = cH21(vec2(fi, uHwSeed * 0.01));
    float ang = (fi / max(uHwDuN, 1.0) + (h - 0.5) * 0.2) * 6.28318;
    float R = uHwDuMax * (1.0 - (1.0 - pr) * (1.0 - pr)) * (0.8 + 0.4 * h);
    vec2 cc = o + vec2(cos(ang), sin(ang) * 0.32) * R;
    float d = length(u - cc) - (0.012 + 0.02 * h) * (0.6 + 0.8 * pr);
    vec3 b = mix(${C.dust}, ${C.rim}, pr);
    vec3 col = mix(b * 0.6, b, cAA(u.y - cc.y + 0.4 * (u.x - cc.x), 0.0));
    c = mix(c, col, cFill(d) * on * (1.0 - pr * pr * 0.6));
    c = mix(c, ${C.ink}, cLine(d, 2.0) * on * 0.6);
  }
  return cCap(c);
}`,
  demo: "hwDustRing(p, t)",
});

export const hwSlashArc = T("hwSlashArc", {
  doc: "F12: one hard white smear arc, 0.02 H thick tapering to points at both ends, sweeping about 0.35 H of arc",
  draws: "A single curved white slash, thick in the middle and sharp at both tips, drawn over the dark night street.",
  use: "card",
  params: "uHwSlX, uHwSlY: arc centre; uHwSlR: arc radius in frame heights; uHwSlP: 0 hidden, then 0 to 1 sweep progress.",
  uni: { uHwSlX: 0.30, uHwSlY: 0.40, uHwSlR: 0.17, uHwSlP: 1.0 },
  deps: ["hwWetStreet"],
  body: `vec3 hwSlashArc(vec2 p, float t) {
  vec2 u = hwU(p);
  vec3 c = hwWetStreet(p, t);
  vec2 q = u - hwU(vec2(uHwSlX, uHwSlY));
  float a = atan(q.y, q.x);
  float a0 = -2.2;
  float a1 = a0 + 2.05 * clamp(uHwSlP, 0.0, 1.0);
  float s = clamp((a - a0) / max(a1 - a0, 1e-3), 0.0, 1.0);
  float d = abs(length(q) - uHwSlR) - 0.01 * sin(3.14159265 * s);
  float inA = cAA(a, a0) * (1.0 - cAA(a, a1));
  return cCap(mix(c, ${C.white}, cFill(d) * inA * step(0.001, uHwSlP)));
}`,
  demo: "hwSlashArc(p, t)",
});

export const hwGrade = T("hwGrade", {
  doc: "F03 to F06: Ufotable compositing grade, split tone, cool or warm gradient, grain on twos, luma cap 0.92 and ink-floor lift",
  draws: "The whole frame pulled to cold blue-teal at night or bleached warm gold in the desert, with fine shadow grain, nothing pure black and nothing blown white.",
  use: "grade",
  params: "uHwGrDesert: 0 night pair, 1 desert pair; uHwGrWhite: 1 replaces the frame with the flat #ebebeb kill frame.",
  uni: { uHwGrDesert: 0.0, uHwGrWhite: 0.0 },
  deps: ["hwWetStreet"],
  body: `vec3 hwGrade(vec3 col, vec2 p, float t) {
  float k = uHwGrDesert;
  float w = smoothstep(0.2, 0.8, cLuma(col));
  col = mix(col, mix(mix(${C.nSh}, ${C.dSh}, k), mix(${C.nHi}, ${C.dHi}, k), w), 0.35);
  col *= mix(vec3(1.0), mix(vec3(0.96, 1.0, 1.02), vec3(1.03, 1.0, 0.95), k), smoothstep(0.0, 0.6, 1.0 - p.y));
  float Y = cLuma(col);
  float g = (cH21(floor(p * vec2(640.0, 400.0)) + floor(t * 6.0 + 0.001) * 17.0) - 0.5) * 2.0;
  col += g * 0.025 * (1.0 - Y) * smoothstep(0.06, 0.12, Y);
  col = cCap(col);
  col = mix(${C.ink}, col, smoothstep(0.035, 0.08, cLuma(col)));
  return mix(col, ${C.white}, step(0.5, uHwGrWhite));
}`,
  demo: "hwGrade(hwWetStreet(p, t), p, t)",
});

export const HW_SHADERS = [
  hwKit, hwNightSky, hwWetStreet, hwSkyBolt, hwHoofCrawl, hwWheelGlow, hwBullHide, hwCourtyard, hwMarbleDome,
  hwDesertPlate, hwArmyBand, hwSandStreaks, hwKillStrike, hwDustRing, hwSlashArc, hwGrade,
];
export const HW_SHADER_COUNT = 16;
export default HW_SHADERS;
