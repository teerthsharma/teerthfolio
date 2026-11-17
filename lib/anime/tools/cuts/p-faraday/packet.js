// p-faraday packet shaders: Railgun J.C.Staff overcast Academy City by day, coin flick, rail beam, car and robber seal.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-faraday";
const v2 = (x, y) => ({ x, y, isVector2: true });
const U = (o, d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { value: o[k] ?? v }]));
const mk = (name, doc, glsl, demo, x) => ({ ...M(name, F, doc, glsl, demo), deps: ["cutKit", "faradKit"], suits: [F], ...x });

export const faradKit = {
  name: "faradKit", family: F, deps: ["cutKit"],
  doc: "p-faraday shared law: ink #0e0d0e, warm line #6d592c, overcast sky pair, gold pair, twos clock, seeded hash, segment distance",
  uniforms: (o = {}) => U(o, { uFdSeed: 0 }),
  glsl: `
const vec3 FD_INK = vec3(0.0549, 0.0510, 0.0549);
const vec3 FD_LINE = vec3(0.4275, 0.3490, 0.1725);
const vec3 FD_SKYLO = vec3(0.745, 0.824, 0.941);
const vec3 FD_SKYHI = vec3(0.851, 0.894, 0.961);
const vec3 FD_GOLD = vec3(0.851, 0.643, 0.255);
const vec3 FD_GOLDSH = vec3(0.541, 0.376, 0.125);
const vec3 FD_CORE = vec3(1.0, 0.949, 0.816);
const vec3 FD_GLOW = vec3(1.0, 0.663, 0.153);
uniform float uFdSeed;
float fdTwos(float t) { return floor(t * 12.0 + 1e-4) / 12.0; }
float fdBand(float v, float lo, float hi) { return cAA(v, lo) * (1.0 - cAA(v, hi)); }
float fdHash(vec2 p) { return cH21(p + vec2(uFdSeed * 7.31, uFdSeed * 3.17)); }
vec3 fdLift(vec3 c) { return mix(FD_INK, c, smoothstep(0.035, 0.08, cLuma(c))); }
vec3 fdBackdrop(vec2 p) { return mix(FD_SKYLO, FD_SKYHI, cAA(p.y, 0.5)); }
float fdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}`,
};

export const faradOvercastSky = mk("faradOvercastSky", "overcast Academy City sky: four painted steps #bed2f0 to #d9e4f5 and two #a9bddc cloud banks",
  `uniform float uFdSkyDrift;
vec3 faradOvercastSky(vec2 p, float t) {
  float w = cFbm(vec2(p.x * 2.4 + uFdSkyDrift + fdTwos(t) * 0.01, p.y * 6.0));
  float y = p.y + (w - 0.5) * 0.06;
  vec3 c = mix(FD_SKYLO, mix(FD_SKYLO, FD_SKYHI, 0.34), cAA(y, 0.25));
  c = mix(c, mix(FD_SKYLO, FD_SKYHI, 0.67), cAA(y, 0.50));
  c = mix(c, FD_SKYHI, cAA(y, 0.75));
  vec3 bank = vec3(0.663, 0.741, 0.863);
  for (int k = 0; k < 2; k++) {
    float cy = 0.40 + 0.26 * float(k);
    float d = abs(y - cy - 0.025 * sin(p.x * 5.0 + float(k) * 2.1)) - 0.030 * (0.5 + cFbm(vec2(p.x * 3.0 + float(k) * 9.0, 0.5)));
    c = mix(c, bank, cFill(d));
  }
  return cCap(c);
}`, "faradOvercastSky(p, t)",
  { uniforms: (o = {}) => U(o, { uFdSkyDrift: 0 }), use: "plate",
    draws: "A flat overcast sky in four painted blue-grey steps with two pale cloud banks and no ink line.",
    params: "uFdSkyDrift: slides the cloud banks sideways (shot to shot); t: wobbles the band edge on twos" });

export const faradGlassTower = mk("faradGlassTower", "glass tower slab: 3-tone steel blue face, window grid with sky-catching panes, no line",
  `uniform float uFdTowerHaze;
uniform float uFdTowerCols;
uniform float uFdTowerRows;
vec3 faradGlassTower(vec2 p, float t) {
  vec3 slab = cCel3(p.x, 0.34, 0.70, vec3(0.243, 0.337, 0.478), vec3(0.373, 0.482, 0.647), vec3(0.588, 0.675, 0.804));
  vec2 g = vec2(p.x * uFdTowerCols, p.y * uFdTowerRows);
  vec2 f = fract(g);
  float pane = cFill(max(abs(f.x - 0.5) - 0.40, abs(f.y - 0.5) - 0.28));
  float glint = step(0.84, fdHash(floor(g)));
  vec3 glass = mix(slab * 0.80, FD_SKYLO, glint * 0.55);
  vec3 c = mix(slab, glass, pane);
  c = mix(c, slab * 0.72, cAA(p.y, 0.985));
  return cCap(mix(c, FD_SKYLO, clamp(uFdTowerHaze, 0.0, 1.0) * 0.55));
}`, "faradGlassTower(p, t)",
  { uniforms: (o = {}) => U(o, { uFdTowerHaze: 0, uFdTowerCols: 9, uFdTowerRows: 36 }), use: "surface",
    draws: "A tall steel-blue glass tower face in three flat tones with a grid of window panes, a few catching the sky.",
    params: "uFdTowerHaze: 0 near tower to 1 far hazy tower; uFdTowerCols/Rows: window grid; uFdSeed: which panes glint" });

export const faradSkybridge = mk("faradSkybridge", "glass skybridge: lit deck, glazed band with mullions, truss underside, #8896b4 body",
  `uniform float uFdBridgeBays;
vec3 faradSkybridge(vec2 p, float t) {
  vec3 deep = vec3(0.243, 0.337, 0.478), body = vec3(0.533, 0.588, 0.706);
  vec3 c = cCel3(p.y, 0.30, 0.86, deep, body, vec3(0.588, 0.675, 0.804));
  float bay = abs(fract(p.x * uFdBridgeBays) - 0.5);
  float band = fdBand(p.y, 0.40, 0.82);
  vec3 glass = mix(FD_SKYLO, body, 0.45);
  glass = mix(glass, FD_SKYLO, step(0.86, fdHash(vec2(floor(p.x * uFdBridgeBays), 3.0))) * 0.6);
  c = mix(c, glass, band);
  c = mix(c, deep, band * cAA(bay, 0.46));
  float truss = cAA(abs(fract(p.x * uFdBridgeBays * 2.0 + p.y * 3.0) - 0.5), 0.40);
  c = mix(c, deep, (1.0 - cAA(p.y, 0.30)) * truss * 0.8);
  return cCap(c);
}`, "faradSkybridge(p, t)",
  { uniforms: (o = {}) => U(o, { uFdBridgeBays: 26 }), use: "surface",
    draws: "A long horizontal glass skybridge: a pale glazed band with mullions over a dark diagonal truss underside.",
    params: "uFdBridgeBays: number of glazing bays along the span; uFdSeed: which bays catch the sky" });

export const faradStreetPlate = mk("faradStreetPlate", "street plan card: #6e7378 road with wear, kerb, dashed centre line, edge lines, planter row",
  `uniform float uFdLaneDash;
uniform float uFdPlanters;
vec3 faradStreetPlate(vec2 p, float t) {
  vec3 road = vec3(0.431, 0.451, 0.471), roadLo = vec3(0.337, 0.357, 0.388);
  vec3 curb = vec3(0.588, 0.675, 0.804), pave = vec3(0.533, 0.588, 0.706), line = vec3(0.784, 0.831, 0.894);
  vec3 c = mix(road, roadLo, cAA(cFbm(vec2(p.x * 7.0, p.y * 3.0)), 0.58) * 0.8);
  c = mix(pave, c, cAA(p.y, 0.12) * (1.0 - cAA(p.y, 0.88)));
  c = mix(c, curb, (1.0 - cAA(abs(p.y - 0.115), 0.012)) + (1.0 - cAA(abs(p.y - 0.885), 0.012)));
  c = mix(c, line, (1.0 - cAA(abs(p.y - 0.17), 0.006)) + (1.0 - cAA(abs(p.y - 0.83), 0.006)));
  float dash = 1.0 - cAA(abs(fract(p.x * uFdLaneDash) - 0.5), 0.28);
  c = mix(c, line, dash * (1.0 - cAA(abs(p.y - 0.5), 0.007)));
  float block = 1.0 - cAA(abs(fract(p.x * uFdPlanters) - 0.5), 0.34);
  c = mix(c, vec3(0.243, 0.337, 0.478), block * fdBand(p.y, 0.93, 0.965));
  c = mix(c, vec3(0.310, 0.450, 0.420), block * fdBand(p.y, 0.965, 0.99));
  return cCap(c);
}`, "faradStreetPlate(p, t)",
  { uniforms: (o = {}) => U(o, { uFdLaneDash: 14, uFdPlanters: 10 }), use: "plate",
    draws: "A grey city road seen flat from above with kerbs, solid edge lines, a dashed centre line and a row of planters on the far pavement.",
    params: "p.x runs along the road, p.y across it; uFdLaneDash: dashes along the card; uFdPlanters: planter blocks along the card" });

export const faradSedanPaint = mk("faradSedanPaint", "victim sedan paint: body #34456b in two tones, glass #a9b8d4 with hard highlight, painted taillights #d8412f",
  `uniform float uFdCarView;
vec3 faradSedanPaint(vec2 p, float t) {
  vec3 body = vec3(0.204, 0.271, 0.420), glass = vec3(0.663, 0.722, 0.831), tail = vec3(0.847, 0.255, 0.184);
  vec3 c = mix(body, body * 0.72, 1.0 - cAA(p.y, 0.30));
  vec3 gl = mix(glass * 0.80, glass, cAA(p.x + p.y * 0.6, 0.78));
  gl = mix(gl, FD_SKYHI, fdBand(p.x - p.y * 0.8, 0.30, 0.38) * 0.7);
  if (uFdCarView < 0.5) {
    float win = max(abs(p.x - 0.52) - 0.30, abs(p.y - 0.70) - 0.14);
    c = mix(c, gl, cFill(win));
    vec2 w = vec2(min(abs(p.x - 0.22), abs(p.x - 0.80)), p.y - 0.24);
    c = mix(c, vec3(0.169, 0.208, 0.314), cFill(length(w * vec2(1.0, 1.9)) - 0.13));
    c = mix(c, tail, cFill(max(abs(p.x - 0.97) - 0.03, abs(p.y - 0.46) - 0.05)));
  } else {
    float win = max(abs(p.x - 0.50) - 0.30, abs(p.y - 0.70) - 0.15);
    c = mix(c, gl, cFill(win));
    c = mix(c, vec3(0.169, 0.208, 0.314), 1.0 - cAA(p.y, 0.17));
    vec2 l = vec2(abs(p.x - 0.50) - 0.38, p.y - 0.40);
    float lamp = max(abs(l.x) - 0.08, abs(l.y) - 0.05);
    c = mix(c, tail, cFill(lamp));
    c = mix(c, FD_SKYHI, cFill(max(abs(l.x + 0.045) - 0.025, abs(l.y - 0.025) - 0.012)) * 0.8);
    c = mix(c, FD_SKYHI, cFill(max(abs(p.x - 0.50) - 0.12, abs(p.y - 0.28) - 0.05)));
  }
  return cCap(c);
}`, "faradSedanPaint(p, t)",
  { uniforms: (o = {}) => U(o, { uFdCarView: 1 }), use: "surface",
    draws: "A navy flat-shaded sedan panel with a pale glass window, a hard diagonal glint and red painted taillights.",
    params: "uFdCarView: 0 side panel with wheel arches, 1 rear panel with two taillights and a plate" });

export const faradRoadScar = mk("faradRoadScar", "rail road scar: #3a3330 burnt line, #ffa927 glowing edge fading to umber, tapering with length",
  `uniform float uFdScarGrow;
uniform float uFdScarAge;
float faradScarParts(vec2 p, float t, out float rim) {
  float wob = (cFbm(vec2(p.x * 22.0, fdTwos(t) * 3.0 + uFdSeed)) - 0.5) * 0.18;
  float d = abs(p.y - 0.5) * 2.0;
  float reach = 1.0 - cAA(p.x, clamp(uFdScarGrow, 0.0, 1.0));
  float taper = 0.80 - 0.25 * p.x + wob;
  rim = cFill(abs(d - (taper + 0.10)) - 0.09) * reach;
  return cFill(d - taper) * reach;
}
float faradScarMask(vec2 p, float t) { float rim; return max(faradScarParts(p, t, rim), rim); }
vec3 faradRoadScar(vec2 p, float t) {
  vec3 road = vec3(0.431, 0.451, 0.471), burnt = vec3(0.227, 0.200, 0.188);
  float rim;
  float core = faradScarParts(p, t, rim);
  float fade = clamp(uFdScarAge / 1.5, 0.0, 1.0);
  vec3 c = mix(road, mix(FD_GLOW, burnt, fade), rim * (1.0 - fade * 0.6));
  return cCap(mix(c, burnt, core));
}`, "mix(vec3(0.431, 0.451, 0.471), faradRoadScar(p, t), faradScarMask(p, t))",
  { uniforms: (o = {}) => U(o, { uFdScarGrow: 1, uFdScarAge: 0 }), use: "mask",
    draws: "A burnt dark line on the road with a glowing orange edge that cools to umber, growing out from the muzzle end.",
    params: "p.x runs from the muzzle to the impact; uFdScarGrow: 0 to 1 length revealed (from k6); uFdScarAge: seconds since 8.5 (glow cools over 1.5 s); faradScarMask gives the decal alpha" });

export const faradSmokePuff = mk("faradSmokePuff", "cel smoke puff: two bands #c8d0d8 lit and #9aa4b4 shade on a lumpy disc, radius grows 0.4 to 1.4",
  `uniform float uFdPuffGrow;
float faradSmokeShape(vec2 p, float t, out float shade) {
  vec2 q = (p - 0.5) * 2.0;
  float lump = 0.9 + 0.25 * cFbm(q * 1.6 + uFdSeed * 5.0 + fdTwos(t) * 0.3);
  float r = mix(0.28, 1.0, clamp(uFdPuffGrow, 0.0, 1.0)) * 0.86;
  shade = cAA(length(q - vec2(0.16, 0.16) * r) / lump - r * 0.92, 0.0);
  return length(q) / lump - r;
}
float faradSmokeMask(vec2 p, float t) { float s; return cFill(faradSmokeShape(p, t, s)); }
vec3 faradSmokePuff(vec2 p, float t) {
  float s;
  faradSmokeShape(p, t, s);
  return cCap(mix(vec3(0.784, 0.816, 0.847), vec3(0.604, 0.643, 0.706), s));
}`, "mix(fdBackdrop(p), faradSmokePuff(p, t), faradSmokeMask(p, t))",
  { uniforms: (o = {}) => U(o, { uFdPuffGrow: 0.6 }), use: "card",
    draws: "A round lumpy cloud of smoke in two flat grey-blue bands, lit from the upper right.",
    params: "uFdPuffGrow: 0 small to 1 full radius; uFdSeed: lump shape per puff; t: lumps shift on twos; faradSmokeMask gives alpha" });

export const faradCoinFace = mk("faradCoinFace", "held coin: disc #d9a441, rim #8a6020, line #6d592c 1.5 px, one catchlight, edge-on slab, #fff2d0 flare",
  `uniform float uFdCoinTurn;
uniform float uFdCoinFlare;
float faradCoinMask(vec2 p) {
  vec2 q = (p - 0.5) * 2.0;
  return cFill(length(vec2(q.x / (0.9 * max(abs(cos(uFdCoinTurn)), 0.14)), q.y / 0.9)) - 1.0);
}
vec3 faradCoinFace(vec2 p, float t) {
  vec2 q = (p - 0.5) * 2.0;
  float w = max(abs(cos(uFdCoinTurn)), 0.14);
  vec2 s = vec2(q.x / (0.9 * w), q.y / 0.9);
  float r = length(s);
  vec3 c = mix(FD_GOLD, FD_GOLDSH, max(cAA(r, 0.80), 1.0 - cAA(w, 0.16)));
  c = mix(c, FD_CORE, cFill(length((s - vec2(-0.30, 0.34)) / vec2(0.22, 0.10)) - 1.0) * cAA(w, 0.30) * 0.9);
  c = mix(c, FD_LINE, cLine(r - 1.0, 1.5));
  return cCap(mix(c, FD_CORE, clamp(uFdCoinFlare, 0.0, 1.0)));
}`, "mix(fdBackdrop(p), faradCoinFace(p, t), faradCoinMask(p))",
  { uniforms: (o = {}) => U(o, { uFdCoinTurn: 0.3, uFdCoinFlare: 0 }), use: "card",
    draws: "A gold coin with a darker rim, a thin warm outline and one cream glint; it narrows to a slab edge-on and flares white at the shot.",
    params: "uFdCoinTurn: spin angle in radians (set per drawing, edge-on at pi/2); uFdCoinFlare: 0 to 1 white flare (k0 only); faradCoinMask gives the disc alpha" });

export const faradRailCapsule = mk("faradRailCapsule", "railBeam: capsule SDF a to b(k), core #fff2d0, glow #ffa927, grows (1-(1-k/5)^3), decays exp(-age/0.4)",
  `uniform vec2 uFdRailA;
uniform vec2 uFdRailB;
uniform float uFdRailK;
uniform float uFdRailAge;
vec3 faradRailCapsule(vec2 p, float t) {
  float g = 1.0 - pow(1.0 - clamp(uFdRailK / 5.0, 0.0, 1.0), 3.0);
  float d = fdSeg(p, uFdRailA, uFdRailA + (uFdRailB - uFdRailA) * g);
  float live = step(0.5, uFdRailK) * exp(-uFdRailAge / 0.4);
  vec3 e = FD_GLOW * 0.81 * exp(-d / 0.05) + vec3(1.0, 0.82, 0.45) * (1.0 - cAA(d, 0.028)) * 0.55 + FD_CORE * (1.0 - cAA(d, 0.010));
  return cCap(e * live);
}`, "fdBackdrop(p) * 0.8 + faradRailCapsule(p, t)",
  { uniforms: (o = {}) => U(o, { uFdRailA: v2(0.25, 0.62), uFdRailB: v2(1.55, 0.30), uFdRailK: 11, uFdRailAge: 0 }), use: "card",
    draws: "One straight orange-white rail on a diagonal with a hard cream core, an amber body and a soft glow, growing out from the coin and then thinning away.",
    params: "uFdRailA/B: muzzle point and frame-edge point in frame units; uFdRailK: drawing index 0 to 11 (1 to 5 growth, 6 to 11 full); uFdRailAge: seconds after 8.5 for the decay; additive, zero where no beam" });

export const faradImpactFlat = mk("faradImpactFlat", "railgun impact frame: flat #ffd23a on #1a0a00, disc at the coin, tapered slash along the beam axis, ring",
  `uniform vec2 uFdImpactAt;
uniform float uFdImpactAng;
uniform float uFdImpactK;
vec3 faradImpactFlat(vec2 p, float t) {
  vec2 q = p - uFdImpactAt;
  vec2 ax = vec2(cos(uFdImpactAng), sin(uFdImpactAng));
  float along = dot(q, ax);
  float across = abs(dot(q, vec2(-ax.y, ax.x)));
  float disc = cFill(length(q) - 0.07 - 0.03 * uFdImpactK);
  float slash = cFill(across - (0.012 + 0.020 * uFdImpactK) * (1.0 - clamp(abs(along) / 1.4, 0.0, 1.0)));
  float ring = cLine(length(q) - 0.16 - 0.05 * uFdImpactK, 3.0);
  return mix(vec3(0.102, 0.039, 0.0), vec3(1.0, 0.824, 0.227), max(max(disc, slash), ring));
}`, "faradImpactFlat(p, t)",
  { uniforms: (o = {}) => U(o, { uFdImpactAt: v2(0.45, 0.42), uFdImpactAng: -0.4, uFdImpactK: 0 }), use: "screen",
    draws: "A flat two-colour flash: a yellow disc, ring and tapered diagonal slash on dark brown, with no shading.",
    params: "uFdImpactAt: coin position in frame units; uFdImpactAng: beam axis angle; uFdImpactK: 0 first drawing, 1 second (bigger)" });

export const faradGrade = mk("faradGrade", "p-faraday grade: split tone #3d3c47 to #e6e9eb at 0.35, luma cap 0.92, ink floor lift to #0e0d0e",
  `vec3 faradGrade(vec3 col) {
  float y = cLuma(col);
  vec3 tone = mix(vec3(0.239, 0.235, 0.278), vec3(0.902, 0.914, 0.922), smoothstep(0.2, 0.8, y));
  return fdLift(cCap(mix(col, col * (tone / max(cLuma(tone), 1e-3)), 0.35)));
}`, "faradGrade(fdBackdrop(p) * (0.2 + 0.9 * p.x))",
  { use: "grade",
    draws: "The whole frame in cool blue-grey shadows and clean pale highlights, nothing brighter than 0.92 and nothing blacker than ink.",
    params: "input colour only; fixed strength 0.35, cap 0.92, lift from Y 0.035 to 0.08" });

export const faradEyeMascot = mk("faradEyeMascot", "mascot eye: lens 1.15x, brown iris #5a3626, pupil #1a1210, two catchlights, 30 percent lid drop",
  `uniform float uFdLid;
uniform float uFdGaze;
vec3 faradEyeMascot(vec2 p, float t) {
  vec3 fur = vec3(0.525, 0.667, 0.839);
  vec2 q = (p - 0.5) * 2.0;
  vec2 lens = vec2(0.575, 0.71);
  float d = length(q / lens) - 1.0;
  vec2 e = q - vec2(0.10 * clamp(uFdGaze, -1.0, 1.0), 0.0);
  vec3 c = vec3(0.953, 0.933, 0.906);
  c = mix(c, vec3(0.353, 0.212, 0.149), cFill(length(e / vec2(0.46, 0.58)) - 1.0));
  c = mix(c, vec3(0.102, 0.071, 0.063), cFill(length(e / vec2(0.22, 0.30)) - 1.0));
  c = mix(c, FD_SKYHI, cFill(length((e - vec2(-0.17, 0.20)) / vec2(0.11, 0.13)) - 1.0));
  c = mix(c, FD_SKYHI, cFill(length((e - vec2(0.14, -0.22)) / vec2(0.045, 0.045)) - 1.0));
  float top = lens.y * (1.0 - 2.0 * clamp(uFdLid, 0.0, 0.5));
  c = mix(c, fur * 0.82, cAA(q.y, top));
  c = mix(c, FD_LINE, cLine(q.y - top, 2.0) * cFill(d));
  c = mix(fur, c, cFill(d));
  return cCap(mix(c, FD_LINE, cLine(d, 2.0)));
}`, "faradEyeMascot(p, t)",
  { uniforms: (o = {}) => U(o, { uFdLid: 0, uFdGaze: 0 }), use: "card",
    draws: "One big dark-brown seal eye with a near-black pupil, two white glints, a warm outline and an upper lid that can drop.",
    params: "uFdLid: 0 open to 0.3 narrowed (f78 to f83); uFdGaze: -1 to 1 iris shift; fur colour is the dorsal blue" });

export const faradHairClip = mk("faradHairClip", "flower hairpin: five pale petals #f4e8f0, gold centre #d9a441, warm line, on chestnut #c4805e",
  `vec3 faradHairClip(vec2 p, float t) {
  vec2 q = (p - 0.5) * 2.0;
  float d = 1e3;
  for (int k = 0; k < 5; k++) {
    float a = 1.2566 * float(k) + 0.3;
    d = min(d, length(q - 0.50 * vec2(cos(a), sin(a))) - 0.36);
  }
  vec3 c = mix(vec3(0.769, 0.502, 0.369), mix(vec3(0.82, 0.76, 0.82), vec3(0.957, 0.910, 0.941), cAA(dot(q, vec2(0.6, 0.8)), -0.15)), cFill(d));
  c = mix(c, FD_LINE, cLine(d, 1.5));
  c = mix(c, FD_GOLD, cFill(length(q) - 0.20));
  return cCap(mix(c, FD_LINE, cLine(length(q) - 0.20, 1.5)));
}`, "faradHairClip(p, t)",
  { use: "card",
    draws: "A small five-petal pale flower clip with a gold centre, lit from the upper right, sitting on chestnut hair.",
    params: "none; scale it with the card (0.04 m radius on the head)" });

export const faradVestCollar = mk("faradVestCollar", "Tokiwadai vest on the pup: beige #d8c0a8 two tone, white collar and cuffs, brown crest #8a5a3f on the left chest",
  `vec3 faradVestCollar(vec2 p, float t) {
  float h = cNdL(p);
  vec2 n = cN(p);
  float lit = cAA(h, 0.46);
  vec3 c = mix(vec3(0.690, 0.596, 0.502), vec3(0.847, 0.753, 0.659), lit);
  vec3 white = mix(vec3(0.812, 0.839, 0.894), vec3(1.0), lit);
  c = mix(c, white, cAA(n.y, 0.30));
  c = mix(c, FD_LINE, cLine(n.y - 0.30, 1.5) * 0.7);
  vec2 cuff = vec2(abs(n.x) - 0.40, n.y + 0.05) / vec2(0.05, 0.07);
  c = mix(c, white, cFill(length(cuff) - 1.0));
  vec2 s = n - vec2(-0.15, 0.02);
  c = mix(c, vec3(0.541, 0.353, 0.247), cFill(max(abs(s.x) + 0.8 * max(-s.y, 0.0) - 0.06, abs(s.y) - 0.08)));
  return cCap(c);
}`, "mix(fdBackdrop(p), faradVestCollar(p, t), cCover(p))",
  { use: "surface",
    draws: "A beige sleeveless vest in two flat tones with a white collar, white cuffs at the flipper bases and a small brown crest on the left chest.",
    params: "none; uses the cutKit sphere frame (centre 0.72, 0.50) for the light side" });

export const faradRobberGear = mk("faradRobberGear", "robber seal costume: grey knit cap #6b6f7a, yellow-green bandana #c8b84a, dark jacket #3e3a46, eyes wide with shock",
  `uniform float uFdShock;
vec3 faradRobberGear(vec2 p, float t) {
  float h = cNdL(p);
  vec2 n = cN(p);
  float lit = cAA(h, 0.46);
  vec3 c = mix(vec3(0.302, 0.266, 0.232), vec3(0.420, 0.369, 0.322), lit);
  c = mix(c, mix(vec3(0.190, 0.177, 0.215), vec3(0.243, 0.227, 0.275), lit), 1.0 - cAA(n.y, -0.24));
  vec3 cap = mix(vec3(0.336, 0.348, 0.382), vec3(0.420, 0.435, 0.478), lit);
  cap = mix(cap, cap * 0.78, cAA(abs(fract(n.x * 28.0) - 0.5), 0.30));
  cap = mix(cap, cap * 1.12, fdBand(n.y, 0.14, 0.20));
  c = mix(c, cap, cAA(n.y, 0.14));
  vec3 band = mix(vec3(0.60, 0.55, 0.22), vec3(0.784, 0.722, 0.290), lit);
  c = mix(c, band, cFill(max(abs(n.y + 0.12) - 0.07, abs(n.x) - 0.34)));
  float sh = clamp(uFdShock, 0.0, 1.0);
  for (int k = 0; k < 2; k++) {
    vec2 e = n - vec2(0.14 * (float(k) * 2.0 - 1.0), 0.06);
    c = mix(c, vec3(0.953, 0.933, 0.906), cFill(length(e) - 0.05) * sh);
    c = mix(c, vec3(0.102, 0.071, 0.063), cFill(length(e) - 0.03 * (1.0 + 0.5 * sh)));
  }
  return cCap(c);
}`, "mix(fdBackdrop(p), faradRobberGear(p, t), cCover(p))",
  { uniforms: (o = {}) => U(o, { uFdShock: 1 }), use: "surface",
    draws: "A grey-brown seal in a ribbed grey knit cap, a yellow-green bandana across the muzzle and a dark jacket, eyes small or wide with shock.",
    params: "uFdShock: 0 calm small eyes to 1 wide white-ringed eyes (from 8.0 s)" });

export const PACKET_SHADERS = [
  faradKit, faradOvercastSky, faradGlassTower, faradSkybridge, faradStreetPlate, faradSedanPaint, faradRoadScar, faradSmokePuff,
  faradCoinFace, faradRailCapsule, faradImpactFlat, faradGrade, faradEyeMascot, faradHairClip, faradVestCollar, faradRobberGear,
];
export default PACKET_SHADERS;
