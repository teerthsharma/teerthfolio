// home packet shaders: Vinland Saga TV cel (Thors, welcome home) - blue snow coast, flat sea bands, hearth and beacons, costumed seals, grade.
import { defineCut as M } from "../kit.glsl.js";

const F = "home";
const U = (o, d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { value: o[k] ?? v }]));
const mk = (name, doc, glsl, demo, x) => ({ ...M(name, F, doc, glsl, demo), deps: ["cutKit", "homeKit"], suits: [F], ...x });

export const homeKit = {
  name: "homeKit", family: F, deps: ["cutKit"],
  doc: "home shared law: ink #221e1c, floor #1a0e16, paper, snow pair, rock, hearth pair, twos and threes clocks, seeded hash, ink-floor lift",
  uniforms: (o = {}) => U(o, { uHmSeed: 0 }),
  glsl: `
const vec3 HM_INK = vec3(0.1333, 0.1176, 0.1098);
const vec3 HM_FLOOR = vec3(0.1020, 0.0549, 0.0863);
const vec3 HM_PAPER = vec3(0.9882, 0.9529, 0.9020);
const vec3 HM_SNOW = vec3(0.8824, 0.9020, 0.9333);
const vec3 HM_SNOWSH = vec3(0.6000, 0.6275, 0.6824);
const vec3 HM_ROCK = vec3(0.0824, 0.1882, 0.2431);
const vec3 HM_HEARTH = vec3(0.7451, 0.4118, 0.1059);
const vec3 HM_CORE = vec3(1.0, 0.7255, 0.4706);
const vec3 HM_HDARK = vec3(0.1137, 0.0784, 0.0235);
const vec3 HM_RIPPLE = vec3(0.9098, 0.9569, 0.9647);
uniform float uHmSeed;
float hmTwos(float t) { return floor(t * 12.0 + 1e-4) / 12.0; }
float hmThrees(float t) { return floor(t * 8.0 + 1e-4) / 8.0; }
float hmBand(float v, float lo, float hi) { return cAA(v, lo) * (1.0 - cAA(v, hi)); }
float hmHash(vec2 p) { return cH21(p + vec2(uHmSeed * 7.31, uHmSeed * 3.17)); }
vec3 hmLift(vec3 c) { return mix(HM_FLOOR, c, smoothstep(0.035, 0.08, cLuma(c))); }`,
};

export const homeSkyRamp = mk("homeSkyRamp", "village sky: five flat steps #bad7e7 to #2f4371, violet-over-teal-grey cloud variant, dawn glow, night plate",
  `uniform float uHmSkyMode;
uniform float uHmSkyDrift;
vec3 homeSkyRamp(vec2 p, float t) {
  float w = cFbm(vec2(p.x * 2.2 + uHmSkyDrift + hmTwos(t) * 0.01, p.y * 5.0));
  float y = p.y + (w - 0.5) * 0.05;
  vec3 c = vec3(0.7294, 0.8431, 0.9059);
  c = mix(c, vec3(0.4706, 0.6588, 0.8039), cAA(y, 0.16));
  c = mix(c, vec3(0.2196, 0.4431, 0.6627), cAA(y, 0.36));
  c = mix(c, vec3(0.1843, 0.3412, 0.5529), cAA(y, 0.58));
  c = mix(c, vec3(0.1843, 0.2627, 0.4431), cAA(y, 0.80));
  if (uHmSkyMode > 0.5 && uHmSkyMode < 1.5) {
    float e = 0.035 * sin(p.x * 6.0 + uHmSkyDrift * 3.0) + (w - 0.5) * 0.06;
    vec3 k = vec3(0.4667, 0.4275, 0.4824);
    k = mix(k, vec3(0.3490, 0.5216, 0.6196), cAA(y + e, 0.14));
    k = mix(k, vec3(0.2784, 0.5020, 0.5608), cAA(y + e, 0.30));
    k = mix(k, vec3(0.2706, 0.4431, 0.5333), cAA(y + e, 0.46));
    c = mix(k, vec3(0.4627, 0.4118, 0.6824), cAA(y + e * 1.4, 0.64));
  } else if (uHmSkyMode > 1.5 && uHmSkyMode < 2.5) {
    c = mix(c, HM_CORE, (1.0 - cAA(y, 0.10)) * 0.65);
    c = mix(c, vec3(1.0, 0.851, 0.627), (1.0 - cAA(y, 0.035)) * 0.8);
  } else if (uHmSkyMode > 2.5) {
    c = mix(vec3(0.1765, 0.2196, 0.3020), vec3(0.0902, 0.1255, 0.2000), cAA(y, 0.30));
    c = mix(c, vec3(0.0431, 0.0627, 0.1098), cAA(y, 0.62));
  }
  return hmLift(cCap(c));
}`, "homeSkyRamp(p, t)",
  { uniforms: (o = {}) => U(o, { uHmSkyMode: 0, uHmSkyDrift: 0 }), use: "plate",
    draws: "A flat sky in five painted steps from pale horizon blue up to deep navy, or a violet cloud sky over teal-grey bands, with no gradient and no sun.",
    params: "uHmSkyMode: 0 daytime ramp (S1 S3 S4 S10), 1 violet cloud sky (S2 S8 S9), 2 dawn with warm horizon steps (S5), 3 night plate (S6 S7); uHmSkyDrift: slides the band wobble sideways" });

export const homeSnowPeaks = mk("homeSnowPeaks", "six white peaks: lit #e1e6ee, lavender shade #99a0ae on the lee side and in gullies, rock #15303e under the snowline",
  `vec3 homeSnowPeaks(vec2 p, float t) {
  vec3 bg = vec3(0.7294, 0.8431, 0.9059);
  float best = -1.0;
  float side = 0.0;
  float top = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float cx = (fi + 0.5) / 6.0 + (hmHash(vec2(fi, 1.0)) - 0.5) * 0.06;
    float h = 0.50 + 0.30 * hmHash(vec2(fi, 2.0));
    float d = h - abs(p.x - cx) * (1.6 + 0.8 * hmHash(vec2(fi, 3.0))) - p.y + 0.02 * cFbm(p * 14.0);
    if (d > best) { best = d; side = step(cx, p.x); top = h; }
  }
  float gully = cAA(cFbm(p * vec2(10.0, 6.0) + top), 0.64);
  vec3 snow = mix(HM_SNOW, HM_SNOWSH, max(side, gully));
  float line = 0.20 + 0.06 * cFbm(vec2(p.x * 12.0, 3.0));
  vec3 rock = HM_ROCK * mix(1.0, 0.8, side);
  vec3 body = mix(rock, snow, cAA(p.y, line));
  return mix(bg, body, cFill(-best));
}`, "homeSnowPeaks(p, t)",
  { uniforms: (o = {}) => U(o, {}), use: "plate",
    draws: "A ring of six white mountains, bright on one face and blue-lavender on the other, with a band of dark teal rock along their feet.",
    params: "uHmSeed: reshuffles peak heights and the snowline wobble; light comes from the left" });

export const homeSeaBands = mk("homeSeaBands", "inlet sea: three flat bands #3d7174 / mid / #0f373b, drawn #94c4c4 wave-light dashes that shift on twos, flat rain ripple rings",
  `uniform float uHmRipple;
uniform float uHmSeaNight;
vec3 homeSeaBands(vec2 p, float t) {
  float ty = hmTwos(t);
  float y = p.y + 0.012 * sin(p.x * 9.0 + ty * 2.0);
  vec3 c = vec3(0.0588, 0.2157, 0.2314);
  c = mix(c, vec3(0.1176, 0.3255, 0.3412), cAA(y, 0.30));
  c = mix(c, vec3(0.2392, 0.4431, 0.4549), cAA(y, 0.62));
  float n = floor(y * 10.0);
  float cols = 6.0 + n;
  float u = p.x * cols + hmHash(vec2(n, 5.0)) * 4.0 + ty * 0.4;
  vec2 f = vec2(fract(u) - 0.5, fract(y * 10.0) - 0.5);
  float dash = cFill(max(abs(f.x) - 0.20 * (1.4 - y), abs(f.y) - 0.05));
  dash *= step(0.55, hmHash(vec2(floor(u), n)));
  c = mix(c, vec3(0.5804, 0.7686, 0.7686), dash);
  vec2 g = p * vec2(7.0, 5.0);
  vec2 cell = floor(g);
  float age = fract(ty * 1.5 + hmHash(cell));
  vec2 q = (fract(g) - 0.5) * vec2(1.0, 3.0);
  float ring = cLine(length(q) - age * 0.45, 1.4) * (1.0 - age) * step(0.45, hmHash(cell + 7.0));
  c = mix(c, HM_RIPPLE, ring * clamp(uHmRipple, 0.0, 1.0));
  c *= mix(1.0, 0.45, clamp(uHmSeaNight, 0.0, 1.0));
  return hmLift(cCap(c));
}`, "homeSeaBands(p, t)",
  { uniforms: (o = {}) => U(o, { uHmRipple: 0, uHmSeaNight: 0 }), use: "plate",
    draws: "A dark teal sea in three flat horizontal bands with short pale wave-light dashes in rows and, in the rain, thin white ripple rings.",
    params: "uHmRipple: 0 none to 1 rain ripples (24.4 s on); uHmSeaNight: 0 day to 1 night darkening (S6 S7); t: dashes and rings step on twos" });

export const homeWaterRings = mk("homeWaterRings", "drawn rings on the sea bands: plop ring, bloop triple ring, fin wake rings, V wake arms #e8f4f6, 55 percent fade, on twos",
  `uniform float uHmRingX;
uniform float uHmRingY;
uniform float uHmRingAge;
uniform float uHmRingN;
uniform float uHmRingMax;
uniform float uHmWake;
vec3 homeWaterRings(vec2 p, float t) {
  vec3 c = homeSeaBands(p, t);
  float a0 = hmTwos(uHmRingAge);
  vec2 w = p - vec2(uHmRingX, uHmRingY);
  vec2 q = w * vec2(1.0, 2.4);
  float r = length(q);
  float ring = 0.0;
  for (int k = 0; k < 3; k++) {
    float a = a0 - 0.15 * float(k);
    float on = step(0.0, a) * step(float(k) + 0.5, uHmRingN) * (1.0 - clamp(a / 1.2, 0.0, 1.0));
    float R = uHmRingMax * (1.0 - exp(-4.0 * max(a, 0.0)));
    ring = max(ring, cLine(r - R, 1.6) * on);
  }
  c = mix(c, HM_RIPPLE, ring);
  float arm = cLine(abs(abs(w.y) - 0.30 * w.x) * 0.9, 1.5) * step(0.0, w.x) * (1.0 - cAA(w.x, 0.32));
  c = mix(c, HM_RIPPLE, arm * 0.55 * clamp(uHmWake, 0.0, 1.0));
  return cCap(c);
}`, "homeWaterRings(p, t)",
  { deps: ["cutKit", "homeKit", "homeSeaBands"], uniforms: (o = {}) => U(o, { uHmRingX: 0.5, uHmRingY: 0.45, uHmRingAge: 0.3, uHmRingN: 3, uHmRingMax: 0.28, uHmWake: 0 }), use: "plate",
    draws: "Thin white lines drawn on flat sea bands: one to three rings spreading and fading from a point, and optionally a V of wake lines trailing behind it.",
    params: "uHmRingX/Y: ring centre; uHmRingAge: seconds since the splash; uHmRingN: 1 plop, 3 bloop; uHmRingMax: final ring radius; uHmWake: 1 adds the fin wake arms" });

export const homeJettyPlank = mk("homeJettyPlank", "jetty planks: pitch 0.286 m with 1 cm tar gaps, lit #7a5a3c with shade lip, butt joints, two-tone grain, hard snow dust",
  `uniform float uHmPlankRows;
uniform float uHmPlankLen;
uniform float uHmSnowDust;
vec3 homeJettyPlank(vec2 p, float t) {
  float v = p.y * uHmPlankRows;
  float row = floor(v);
  float fy = fract(v);
  float seg = p.x * uHmPlankLen + hmHash(vec2(row, 9.0)) * 3.0;
  float sx = floor(seg);
  float fx = fract(seg);
  float h = hmHash(vec2(row, sx));
  vec3 lit = vec3(0.4784, 0.3529, 0.2353);
  vec3 sh = vec3(0.2275, 0.1843, 0.1647);
  vec3 c = lit * (0.88 + 0.12 * step(0.5, h));
  c = mix(c * 0.72, c, cAA(fy, 0.22));
  c = mix(c, sh, cLine(fract(v * 5.0 + h * 7.0) - 0.5, 1.0) * 0.28);
  float seam = max(cAA(fx, 0.985), 1.0 - cAA(fx, 0.015));
  float gap = cAA(abs(fy - 0.5), 0.4825);
  c = mix(c, sh, max(seam, gap));
  float n = cFbm(vec2(p.x * 9.0, v * 2.0) + row);
  float snow = cAA(n, 0.74 - 0.30 * clamp(uHmSnowDust, 0.0, 1.0));
  vec3 sn = mix(HM_SNOWSH, HM_SNOW, cAA(fy, 0.35));
  c = mix(c, sn, snow * mix(1.0, 0.6, gap));
  return cCap(c);
}`, "homeJettyPlank(p, t)",
  { uniforms: (o = {}) => U(o, { uHmPlankRows: 5.4, uHmPlankLen: 5.0, uHmSnowDust: 0.3 }), use: "surface",
    draws: "Warm brown jetty planks laid side by side with dark gaps and butt joints, each with a darker lower lip, and a few hard-edged patches of blue-white snow.",
    params: "p.x runs along the jetty, p.y across it; uHmPlankRows: planks across (1.55 m / 0.286 m = 5.4); uHmPlankLen: boards along the card; uHmSnowDust: 0 bare to 1 heavy snow patches; uHmSeed: which boards are lighter" });

export const homeHearthDoor = mk("homeHearthDoor", "turf longhouse front: sod courses, snow-capped roof, arched door with #be691b hearth in two bands on #1d1406, 5 percent flicker on twos, warm spill on the snow",
  `uniform float uHmHearth;
vec3 homeHearthDoor(vec2 p, float t) {
  float fl = 1.0 + 0.05 * (hmHash(vec2(floor(t * 12.0 + 1e-4), 7.0)) * 2.0 - 1.0) * clamp(uHmHearth, 0.0, 1.0);
  vec3 turf = vec3(0.2549, 0.2667, 0.1176);
  vec3 c = mix(turf, turf * 0.78, cAA(abs(fract(p.y * 9.0) - 0.5), 0.40) * 0.6);
  vec3 roof = mix(turf * 1.25, turf, cAA(p.y, 0.74));
  c = mix(c, roof, cAA(p.y, 0.70));
  c = mix(c, mix(HM_SNOWSH, HM_SNOW, cAA(p.y, 0.89)), cAA(p.y, 0.84));
  vec2 d = vec2(p.x - 0.5, p.y - 0.46);
  float door = min(max(abs(d.x) - 0.14, d.y), length(d) - 0.14);
  float r = length(vec2(p.x - 0.5, (p.y - 0.22) * 1.2));
  float hl = clamp(uHmHearth, 0.0, 1.0);
  vec3 inside = HM_HDARK;
  inside = mix(inside, mix(HM_HDARK, HM_HEARTH, 0.45), (1.0 - cAA(r, 0.20)) * hl);
  inside = mix(inside, HM_HEARTH, (1.0 - cAA(r, 0.11)) * hl);
  c = mix(c, inside * fl, cFill(door));
  c = mix(c, vec3(0.2275, 0.1843, 0.1647), cLine(door, 2.0));
  float wedge = (1.0 - cAA(abs(p.x - 0.5) - 0.10 - (0.12 - p.y) * 0.8, 0.0)) * (1.0 - cAA(p.y, 0.12)) * hl;
  vec3 ground = mix(HM_SNOWSH, vec3(0.7451, 0.5333, 0.3569), wedge * 0.6);
  c = mix(c, ground, 1.0 - cAA(p.y, 0.12));
  return cCap(c);
}`, "homeHearthDoor(p, t)",
  { uniforms: (o = {}) => U(o, { uHmHearth: 1 }), use: "surface",
    draws: "A dark green turf longhouse with a snow-capped roof and an arched door whose inside glows orange in two flat bands, spilling a warm wedge onto the snow.",
    params: "uHmHearth: 0 door dark to 1 hearth lit (18.8 s on); t: the glow breathes 5 percent on twos" });

export const homeBeaconRow = mk("homeBeaconRow", "eleven shore cairns with iron baskets, each lit i at 19.0 + 0.3 i s: 3-band flame #be691b / mid / core #ffb978, flicker on twos, far ones smaller",
  `uniform float uHmBeaconStart;
uniform float uHmBeaconStep;
vec3 homeBeaconRow(vec2 p, float t) {
  vec3 c = mix(vec3(0.0431, 0.0667, 0.0784), vec3(0.0784, 0.1176, 0.1373), cAA(p.y, 0.30));
  float ty = floor(t * 12.0 + 1e-4);
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    vec2 pos = vec2(0.94 - 0.085 * fi, 0.12 + 0.035 * fi + 0.01 * hmHash(vec2(fi, 4.0)));
    float sc = 1.0 - 0.055 * fi;
    vec2 q = (p - pos) / (0.05 * sc);
    float stack = max(abs(q.x) - (0.55 - 0.18 * q.y), abs(q.y - 0.5) - 0.5);
    vec3 st = mix(HM_ROCK * 1.6, HM_SNOWSH * 0.8, cAA(q.x, 0.0));
    c = mix(c, st, cFill(stack));
    float bk = max(abs(q.x) - 0.55 - 0.15 * (q.y - 1.0), abs(q.y - 1.25) - 0.22);
    c = mix(c, HM_INK, cFill(bk));
    float g = clamp((t - uHmBeaconStart - uHmBeaconStep * fi) / 0.5, 0.0, 1.0);
    float h = 1.6 * g * (0.9 + 0.2 * hmHash(vec2(fi, ty)));
    float wob = 0.12 * (hmHash(vec2(fi + 11.0, ty)) - 0.5);
    vec2 f = vec2(q.x + wob * (q.y - 1.45), q.y - 1.45);
    float d = max(abs(f.x) - 0.5 * (1.0 - f.y / max(h, 1e-3)), max(-f.y, f.y - h));
    c = mix(c, HM_HEARTH, cFill(d));
    c = mix(c, mix(HM_HEARTH, HM_CORE, 0.5), cFill(d + 0.17));
    c = mix(c, HM_CORE, cFill(d + 0.34));
  }
  return hmLift(cCap(c));
}`, "homeBeaconRow(p, t)",
  { uniforms: (o = {}) => U(o, { uHmBeaconStart: 19.0, uHmBeaconStep: 0.3 }), use: "plate",
    draws: "A dark shore with eleven small stone cairns receding along it, each topped by an iron basket where a three-step orange flame lights up one after another.",
    params: "t: scene seconds, cairn i ignites at uHmBeaconStart + uHmBeaconStep * i and grows for 0.5 s; flames flicker on twos; uHmSeed: flame wobble" });

export const homeFieldsRise = mk("homeFieldsRise", "Vinland headland: land #716e3c / lit #a5a65e / shade #41441e furrow stripes with painted wheat strokes, rising out of #a1b3cd haze in hard steps",
  `uniform float uHmRise;
vec3 homeFieldsRise(vec2 p, float t) {
  vec3 haze = vec3(0.6314, 0.7020, 0.8039);
  vec3 c = mix(haze, vec3(0.4392, 0.5686, 0.7373), cAA(p.y, 0.62));
  float rise = clamp(uHmRise, 0.0, 1.0);
  float yy = p.y + (1.0 - rise) * 0.30;
  float ridge = 0.34 + 0.05 * sin(p.x * 5.0 + 1.0) + 0.04 * cFbm(vec2(p.x * 6.0, 1.0));
  float v = clamp((ridge - yy) / ridge, 0.0, 1.0);
  float u = (p.x - 0.5) / (0.25 + v * 0.9) * 4.0;
  float h = hmHash(vec2(floor(u), 3.0));
  vec3 land = vec3(0.4431, 0.4314, 0.2353);
  vec3 lit = vec3(0.6471, 0.6510, 0.3686);
  vec3 stripe = mix(land, lit, step(0.5, h));
  float stroke = cLine(fract(u * 5.0 + v * 3.0) - 0.5, 1.2) * step(0.45, fract(v * 14.0));
  stripe = mix(stripe, mix(lit, land, step(0.5, h)), stroke * 0.7);
  stripe = mix(stripe, vec3(0.2549, 0.2667, 0.1176), cAA(v, 0.80));
  float hz = floor((1.0 - rise) * 3.0) / 3.0 * 0.7 + 0.25 * (1.0 - cAA(v, 0.18));
  stripe = mix(stripe, haze, clamp(hz, 0.0, 1.0));
  return cCap(mix(c, stripe, cFill(yy - ridge)));
}`, "homeFieldsRise(p, t)",
  { uniforms: (o = {}) => U(o, { uHmRise: 1 }), use: "plate",
    draws: "A far green-gold headland of furrow stripes in olive and yellow-green with short wheat strokes, standing under a pale blue haze that lifts away in steps.",
    params: "uHmRise: 0 sunk in haze to 1 fully risen (12.8 to 14.0 s); uHmSeed: which furrows are the lighter ones" });

export const homeWashBloom = mk("homeWashBloom", "wet pigment bloom on snow: #99a0ae ring at 40 percent, wobbling pooled rim, inner wash and second ring, radius 0 to 2.2 m in 0.5 s",
  `uniform float uHmBloomAge;
uniform float uHmBloomX;
uniform float uHmBloomY;
vec3 homeWashBloom(vec2 p, float t) {
  float a = clamp(uHmBloomAge / 0.5, 0.0, 1.0);
  vec2 q = p - vec2(uHmBloomX, uHmBloomY);
  float r = length(q * vec2(1.0, 1.8)) + (cFbm(q * 7.0 + 3.0) - 0.5) * 0.10;
  float R = 0.46 * (1.0 - exp(-5.0 * a)) / (1.0 - exp(-5.0));
  float fade = 1.0 - a * a;
  float disc = cFill(r - R);
  float rim = cLine(r - R, 3.0);
  float inner = cLine(r - R * 0.7, 2.0);
  float k = 0.4 * fade * clamp(rim + 0.35 * disc + 0.45 * inner, 0.0, 1.0);
  return mix(HM_SNOW, HM_SNOWSH, k);
}`, "homeWashBloom(p, t)",
  { uniforms: (o = {}) => U(o, { uHmBloomAge: 0.25, uHmBloomX: 0.5, uHmBloomY: 0.4 }), use: "card",
    draws: "A pale snow ground with a wobbling lavender-grey wet ring spreading outward from a point, a faint wash inside it and a second thinner ring.",
    params: "uHmBloomAge: seconds since Thors steps out (0 to 0.5); uHmBloomX/Y: ring centre" });

export const homeThorsCoat = mk("homeThorsCoat", "Thors seal coat: lit #5c6876 / shade #353f4a with one hard step, spotted cheek, ragged cream belly #d9d0bc",
  `vec3 homeThorsCoat(vec2 p, float t) {
  vec2 n = cN(p);
  float h = cNdL(p);
  vec3 lit = vec3(0.3608, 0.4078, 0.4627);
  vec3 sh = vec3(0.2078, 0.2471, 0.2902);
  vec3 belly = vec3(0.8510, 0.8157, 0.7373);
  vec3 c = mix(sh, lit, cAA(h, 0.52));
  vec2 cheek = n - vec2(-0.17, 0.05);
  vec2 g = cheek * 16.0;
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;
  float on = step(0.45, hmHash(cell)) * (1.0 - cAA(length(cheek), 0.12));
  float spot = cFill(length(f - (vec2(hmHash(cell + 3.0), hmHash(cell + 9.0)) - 0.5) * 0.35) - 0.20) * on;
  c = mix(c, sh, spot);
  float edge = -0.10 + 0.025 * sin(n.x * 30.0) + 0.04 * (cFbm(n * 9.0) - 0.5);
  vec3 bc = mix(belly * 0.78, belly, cAA(h, 0.52));
  c = mix(c, bc, 1.0 - cAA(n.y, edge));
  return cCap(c);
}`, "mix(vec3(0.74, 0.84, 0.91), homeThorsCoat(p, t), cCover(p))",
  { uniforms: (o = {}) => U(o, {}), use: "surface",
    draws: "A big blue-grey seal body in two flat tones with a patch of dark spots on one cheek and a cream underside with a ragged edge.",
    params: "uHmSeed: moves the spots; cheek spots sit on the left of the head disc" });

export const homeThorsCloak = mk("homeThorsCloak", "torn cream cloak #d9d0bc / shade #99a0ae over the coat with a ragged hem and fold bands, two studded belts #4a3a2e with iron studs #8a8e92",
  `vec3 homeThorsCloak(vec2 p, float t) {
  vec2 n = cN(p);
  float h = cNdL(p);
  vec3 c = homeThorsCoat(p, t);
  float tri = abs(fract(n.x * 7.0) - 0.5);
  float hem = -0.02 - 0.09 * tri - 0.05 * cFbm(vec2(n.x * 8.0, 2.0));
  float cloak = (1.0 - cAA(hem - n.y, 0.0)) * (1.0 - cAA(abs(n.x), 0.40));
  float fold = cAA(abs(fract(n.x * 5.0 + 0.2 * sin(n.y * 6.0)) - 0.5), 0.36);
  vec3 cl = mix(vec3(0.5999, 0.6275, 0.6824), vec3(0.8510, 0.8157, 0.7373), cAA(h, 0.52) * (1.0 - fold * 0.7));
  c = mix(c, cl, cloak);
  for (int k = 0; k < 2; k++) {
    float by = -0.16 - 0.08 * float(k);
    float belt = cFill(abs(n.y - by) - 0.028 + 0.008 * float(k));
    vec2 sg = vec2(fract(n.x * 14.0) - 0.5, (n.y - by) * 14.0);
    float stud = cFill(length(sg) - 0.22) * (1.0 - float(k));
    c = mix(c, vec3(0.2902, 0.2275, 0.1804), belt);
    c = mix(c, vec3(0.5412, 0.5569, 0.5725), stud * belt);
  }
  return cCap(c);
}`, "mix(vec3(0.74, 0.84, 0.91), homeThorsCloak(p, t), cCover(p))",
  { deps: ["cutKit", "homeKit", "homeThorsCoat"], uniforms: (o = {}) => U(o, {}), use: "surface",
    draws: "A cream cloak with a torn zig-zag lower edge and vertical fold shadows draped over a grey seal, with two brown belts below it, the upper one studded with metal dots.",
    params: "uHmSeed: reshuffles the cheek spots of the coat underneath" });

export const homeThorfinnTunic = mk("homeThorfinnTunic", "hero seal: back #86aad6 with hard shade step, flank #d3e2f1, wool tunic #b9ab92 / #8d8068, belt #4a3226 and buckle, freckled muzzle pads",
  `vec3 homeThorfinnTunic(vec2 p, float t) {
  vec2 n = cN(p);
  float h = cNdL(p);
  vec3 c = mix(vec3(0.4902, 0.6157, 0.7804), vec3(0.5255, 0.6667, 0.8392), cAA(h, 0.52));
  c = mix(c, vec3(0.8275, 0.8863, 0.9451), 1.0 - cAA(n.y, 0.06));
  c = mix(c, vec3(0.9725, 0.9333, 0.8784), cFill(length((n - vec2(0.0, 0.10)) / vec2(0.2, 0.12)) - 1.0));
  vec2 m = n - vec2(0.0, 0.26);
  float pad = min(cFill(length(m - vec2(-0.05, 0.0)) - 0.045), cFill(length(m - vec2(0.05, 0.0)) - 0.045));
  c = mix(c, vec3(0.9529, 0.8902, 0.8392), pad);
  vec2 fg = m * 60.0;
  float fr = cFill(length(fract(fg) - 0.5 - (vec2(hmHash(floor(fg)), hmHash(floor(fg) + 5.0)) - 0.5) * 0.4) - 0.14) * step(0.55, hmHash(floor(fg) + 2.0));
  c = mix(c, vec3(0.4196, 0.3529, 0.3529), fr * pad);
  c = mix(c, vec3(0.1647, 0.1255, 0.1882), cFill(length(m - vec2(0.0, 0.03)) - 0.014));
  float hem = -0.02 + 0.012 * sin(n.x * 22.0);
  vec3 tun = mix(vec3(0.5529, 0.5020, 0.4078), vec3(0.7255, 0.6706, 0.5725), cAA(h, 0.52));
  tun = mix(tun, tun * 0.85, cAA(abs(fract(n.x * 6.0) - 0.5), 0.40) * 0.5);
  c = mix(c, tun, 1.0 - cAA(n.y, hem));
  c = mix(c, vec3(0.2902, 0.1961, 0.1490), cFill(abs(n.y + 0.08) - 0.025));
  c = mix(c, vec3(0.5529, 0.5020, 0.4078), cFill(max(abs(n.x + 0.04) - 0.03, abs(n.y + 0.08) - 0.032)));
  return cCap(c);
}`, "mix(vec3(0.74, 0.84, 0.91), homeThorfinnTunic(p, t), cCover(p))",
  { uniforms: (o = {}) => U(o, {}), use: "surface",
    draws: "A small blue-backed seal with a pale flank and cream chest, a pale freckled muzzle with a dark nose, and a straw-coloured wool tunic with a brown belt and a square buckle.",
    params: "the head front sits at the top of the disc; uHmSeed: moves the freckles" });

export const homeOrcaSuit = mk("homeOrcaSuit", "orca-suited seal: back #221e1c in two steps, belly #f7f3ea / #cfc9d8 with wavy edge, white eye patch, one #fcf3e6 catchlight gated by uniform",
  `uniform float uHmCatch;
vec3 homeOrcaSuit(vec2 p, float t) {
  vec2 n = cN(p);
  float h = cNdL(p);
  vec3 white = vec3(0.9686, 0.9529, 0.9176);
  vec3 c = mix(HM_INK, vec3(0.2000, 0.1800, 0.1700), cAA(h, 0.60));
  float edge = -0.02 + 0.04 * sin(n.x * 11.0) + 0.02 * (cFbm(n * 6.0) - 0.5);
  c = mix(c, mix(vec3(0.8118, 0.7882, 0.8471), white, cAA(h, 0.52)), 1.0 - cAA(n.y, edge));
  vec2 e = n - vec2(-0.20, 0.16);
  c = mix(c, white, cFill(length(e * vec2(1.0, 2.4)) - 0.18));
  c = mix(c, HM_INK, cFill(length(e - vec2(-0.02, 0.0)) - 0.025));
  c = mix(c, HM_PAPER, cFill(length(e - vec2(-0.013, 0.012)) - 0.0065) * clamp(uHmCatch, 0.0, 1.0));
  return cCap(c);
}`, "mix(vec3(0.74, 0.84, 0.91), homeOrcaSuit(p, t), cCover(p))",
  { uniforms: (o = {}) => U(o, { uHmCatch: 1 }), use: "surface",
    draws: "A near-black seal body with a white wavy underside and a white oval patch over a small dark eye, with a single tiny white glint in the eye.",
    params: "uHmCatch: 1 shows the single catchlight (10.0 to 10.7 s), 0 hides it" });

export const homeGrade = mk("homeGrade", "per-shot split tone (village #1f394e/#f3f3f3, fields #4c544c/#eee7e1, fjord #05090b/#8f979d), luma cap 0.92, ink-floor lift #1a0e16, grain 0.02 on twos, vignette 0.10",
  `uniform float uHmShot;
vec3 homeGrade(vec3 col, vec2 p, float t) {
  vec3 sh = vec3(0.1216, 0.2235, 0.3059);
  vec3 hi = vec3(0.9529, 0.9529, 0.9529);
  if (uHmShot > 0.5 && uHmShot < 1.5) { sh = vec3(0.2980, 0.3294, 0.2980); hi = vec3(0.9333, 0.9059, 0.8824); }
  else if (uHmShot > 1.5) { sh = vec3(0.0196, 0.0353, 0.0431); hi = vec3(0.5608, 0.5922, 0.6157); }
  float L = cLuma(col);
  vec3 tone = mix(sh, hi, smoothstep(0.08, 0.92, L));
  vec3 g = mix(col, tone * (L / max(cLuma(tone), 1e-3)), 0.30);
  g += (hmHash(floor(gl_FragCoord.xy * 0.5) + floor(t * 12.0 + 1e-4) * 17.0) - 0.5) * 0.02;
  g *= cVig(p, 0.10);
  return hmLift(cCap(g));
}`, "homeGrade(homeSkyRamp(p, t), p, t)",
  { deps: ["cutKit", "homeKit", "homeSkyRamp"], uniforms: (o = {}) => U(o, { uHmShot: 0 }), use: "grade",
    draws: "The whole frame tinted cool blue in the shadows and pale in the highlights, kept off pure black and pure white, with faint grain and slightly darker corners.",
    params: "uHmShot: 0 village (S1 to S4, S8, S9), 1 fields at dawn (S5), 2 fjord night (S6, S7); t: grain steps on twos" });

export const PACKET_SHADERS = [
  homeKit, homeSkyRamp, homeSnowPeaks, homeSeaBands, homeWaterRings, homeJettyPlank, homeHearthDoor,
  homeBeaconRow, homeFieldsRise, homeWashBloom, homeThorsCoat, homeThorsCloak, homeThorfinnTunic, homeOrcaSuit, homeGrade,
];
export default PACKET_SHADERS;
