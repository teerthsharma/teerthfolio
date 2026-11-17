// p-resolvent packet shaders: Frieren E10 (Madhouse) night-violet court, red army sky, silver scale, cyan soul flame, mana pillar, gold cracks.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-resolvent";
const U = (o, d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { value: o[k] ?? v }]));
const mk = (name, doc, glsl, demo, x) => ({ ...M(name, F, doc, glsl, demo), deps: ["cutKit", "rvKit"], suits: [F], ...x });

export const rvKit = {
  name: "rvKit", family: F, deps: ["cutKit"],
  doc: "p-resolvent shared law: ink #1a0e16, mana blue-whites, night-violet court ramp, twos clock, seeded hash, segment distance",
  uniforms: (o = {}) => U(o, { uRvSeed: 0 }),
  glsl: `
const vec3 RV_INK = vec3(0.102, 0.055, 0.086);
const vec3 RV_BLUEW = vec3(0.906, 0.925, 0.980);
const vec3 RV_MANA_O = vec3(0.463, 0.529, 0.757);
const vec3 RV_MANA_M = vec3(0.663, 0.714, 0.863);
const vec3 RV_DUSK = vec3(0.267, 0.192, 0.337);
const vec3 RV_NIGHT = vec3(0.114, 0.110, 0.212);
const vec3 RV_DEEP = vec3(0.051, 0.035, 0.098);
uniform float uRvSeed;
float rvTwos(float t) { return floor(t * 12.0 + 1e-4) / 12.0; }
float rvH(vec2 p) { return cH21(p + vec2(uRvSeed * 7.31, uRvSeed * 3.17)); }
float rvSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
vec3 rvLift(vec3 c) { return mix(RV_INK, c, smoothstep(0.035, 0.08, cLuma(c))); }
vec3 rvCourtBg(vec2 p) {
  vec3 c = mix(RV_NIGHT, mix(RV_NIGHT, RV_DUSK, 0.5), cAA(1.0 - p.y, 0.34));
  c = mix(c, RV_DUSK, cAA(1.0 - p.y, 0.62));
  return mix(c, RV_DEEP, cAA(1.0 - p.y, 0.92));
}`,
};

export const rvArmySky = mk("rvArmySky", "army red sky: six flat bands #d6817d to #3d2729 darkening to the horizon, three wide flat cloud bands",
  `uniform float uRvSwell;
vec3 rvArmySky(vec2 p, float t) {
  float w = cFbm(vec2(p.x * 2.2, p.y * 5.0) + rvTwos(t) * 0.02);
  float f = clamp((1.0 - p.y) + (w - 0.5) * 0.05 - uRvSwell * 0.06, 0.0, 1.0);
  vec3 c = vec3(0.839, 0.506, 0.490);
  c = mix(c, vec3(0.565, 0.278, 0.251), cAA(f, 0.055));
  c = mix(c, vec3(0.392, 0.216, 0.176), cAA(f, 0.165));
  c = mix(c, vec3(0.298, 0.169, 0.133), cAA(f, 0.275));
  c = mix(c, vec3(0.267, 0.173, 0.161), cAA(f, 0.385));
  c = mix(c, vec3(0.239, 0.153, 0.161), cAA(f, 0.495));
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float cy = 0.12 + 0.14 * fk + 0.02 * sin(p.x * 4.0 + fk * 2.3);
    float d = abs(f - cy) - 0.016 * (0.5 + cFbm(vec2(p.x * 2.5 + fk * 7.0, 0.3)));
    c = mix(c, c * 1.22, cFill(d) * 0.8);
  }
  return cCap(c);
}`, "rvArmySky(p, t)",
  { uniforms: (o = {}) => U(o, { uRvSwell: 0 }), use: "plate",
    draws: "A flat red sky in six stepped bands, bright rose at the top sinking to dark brown at the horizon, with three wide pale cloud bands.",
    params: "uRvSwell: 0 to 1 lifts the bands as the sky bubble swells (0 to 2.6 s); t: cloud edge wobbles on twos" });

export const rvCourtSky = mk("rvCourtSky", "court night sky: four flat violet steps #1d1c36 to #443156 to #0d0919, one low flat cloud bank, thin crack seam when uRvSkyCrack rises",
  `uniform float uRvSkyCrack;
vec3 rvCourtSky(vec2 p, float t) {
  vec3 c = rvCourtBg(p + vec2(0.0, (cFbm(vec2(p.x * 2.0, rvTwos(t) * 0.05)) - 0.5) * 0.03));
  float bank = abs(p.y - 0.30 - 0.02 * sin(p.x * 5.0)) - 0.03 * (0.5 + cFbm(vec2(p.x * 3.0, 1.7)));
  c = mix(c, c * 1.25 + vec3(0.02, 0.0, 0.04), cFill(bank) * 0.7);
  float seam = abs(p.x - 0.5 - (p.y - 0.4) * 0.35 + 0.04 * sin(p.y * 24.0)) - 0.004;
  float vis = 1.0 - cAA(p.y, 0.3 + 0.7 * clamp(uRvSkyCrack, 0.0, 1.0));
  c = mix(c, vec3(0.851, 0.663, 0.227), cLine(seam, 2.4) * vis * step(0.01, uRvSkyCrack));
  return cCap(c);
}`, "rvCourtSky(p, t)",
  { uniforms: (o = {}) => U(o, { uRvSkyCrack: 0 }), use: "plate",
    draws: "A night sky in four flat violet steps, darkest at the foot, with one pale low cloud bank and, when raised, a thin gold crack climbing the sky.",
    params: "uRvSkyCrack: 0 none to 1 gold seam reaches the top (11.4 s on); t: sky wobbles on twos" });

export const rvFlagstones = mk("rvFlagstones", "flagstone court: running-bond stones tone per stone from #51537e / #2b3248, seams as value drops to #1c242f, no line",
  `uniform float uRvStoneCols;
uniform float uRvStoneRows;
vec3 rvFlagstones(vec2 p, float t) {
  float row = floor(p.y * uRvStoneRows);
  vec2 g = vec2(p.x * uRvStoneCols + mod(row, 2.0) * 0.5, p.y * uRvStoneRows);
  vec2 id = floor(g), f = fract(g);
  float h = rvH(id + vec2(0.0, row * 0.37));
  vec3 stone = vec3(0.318, 0.325, 0.494), shade = vec3(0.169, 0.196, 0.282);
  vec3 c = cCel3(h, 0.30, 0.72, mix(shade, stone, 0.35), mix(shade, stone, 0.70), stone);
  float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  c = mix(c, vec3(0.110, 0.141, 0.184), 1.0 - cAA(edge, 0.05));
  c = mix(c, c * 0.78, cAA(f.y, 0.0) * (1.0 - cAA(f.y, 0.16)) * 0.5);
  return cCap(mix(c, vec3(0.267, 0.239, 0.353), 0.18));
}`, "rvFlagstones(p, t)",
  { uniforms: (o = {}) => U(o, { uRvStoneCols: 8, uRvStoneRows: 19 }), use: "surface",
    draws: "A floor of blue-violet stone slabs laid in running bond, each slab one of three flat tones, divided by dark seams.",
    params: "uRvStoneCols/Rows: slabs across and down (0.85 x 0.36 m ratio is 8 x 19 on a square); uRvSeed: which slabs are light" });

export const rvScaleBeam = mk("rvScaleBeam", "Scales of Obedience: thin silver line #9ab2b4 with hot core #e6f3f8, tight exp halo, two chained pans with twos glints",
  `uniform float uRvTilt;
uniform float uRvHalo;
uniform float uRvGlint;
vec3 rvScaleBeam(vec2 p, float t) {
  vec3 c = rvCourtBg(p);
  vec2 c0 = vec2(0.5, 0.62);
  float s = sin(uRvTilt), co = cos(uRvTilt);
  vec2 q = p - c0;
  vec2 r = vec2(co * q.x + s * q.y, -s * q.x + co * q.y);
  float L = 0.36;
  float d = length(vec2(max(abs(r.x) - L, 0.0), r.y));
  vec3 halo = mix(vec3(0.235, 0.259, 0.278), vec3(0.659, 0.706, 0.851), clamp(uRvHalo, 0.0, 1.0));
  c = mix(c, halo, 0.6 * exp(-(d / 0.02) * (d / 0.02)));
  float tw = rvTwos(t);
  for (int k = 0; k < 2; k++) {
    float sg = float(k) * 2.0 - 1.0;
    vec2 e = c0 + vec2(co * sg * L, s * sg * L);
    vec2 pc = e + vec2(0.0, -0.24);
    float dc = min(rvSeg(p, e, pc + vec2(-0.07, 0.02)), rvSeg(p, e, pc + vec2(0.07, 0.02)));
    c = mix(c, vec3(0.604, 0.698, 0.706), cLine(dc, 1.4) * 0.8);
    vec2 b = (p - pc) / vec2(0.085, 0.04);
    c = mix(c, vec3(0.235, 0.259, 0.278), cFill(max(length(b) - 1.0, b.y)));
    float rim = cFill(max(abs(p.y - pc.y) - 0.004, abs(p.x - pc.x) - 0.085));
    c = mix(c, vec3(0.569, 0.651, 0.663), rim);
    float on = step(0.5, fract(tw * 3.0 + float(k) * 0.5)) * clamp(uRvGlint, 0.0, 1.0);
    c = mix(c, vec3(0.902, 0.953, 0.973), cFill(length(p - (pc + vec2(0.05 * sg, 0.0))) - 0.008) * on);
  }
  c = mix(c, vec3(0.604, 0.698, 0.706), cLine(d, 2.4));
  c = mix(c, vec3(0.902, 0.953, 0.973), cLine(d, 1.0) * 0.9);
  return cCap(c);
}`, "rvScaleBeam(p, t)",
  { uniforms: (o = {}) => U(o, { uRvTilt: 0.31, uRvHalo: 1, uRvGlint: 1 }), use: "card",
    draws: "A thin silver balance beam tipped about 18 degrees with a hot white core and a tight halo, a chain hanging from each end to a small dark pan with a silver rim.",
    params: "uRvTilt: beam angle in radians (0.34 e^(-1.6 tau) cos(2 pi 1.1 tau) from 3.0 s); uRvHalo: 0 dim grey to 1 lifted lilac (weigh, 5.0 s); uRvGlint: 1 shows twos glints on the pan rims" });

export const rvSoulFlame = mk("rvSoulFlame", "soul flame: three nested flat bands edge #64a0a2, body #c0f3ed, core #f7f3ed from an ellipse SDF bent by sin, faint #7ff0e4 halo ring",
  `uniform float uRvFlameSize;
uniform float uRvFlameHalo;
float rvFlameF(vec2 p, float t) {
  vec2 q = (p - vec2(0.5, 0.34)) / max(uRvFlameSize, 0.05);
  q.x += 0.02 * sin(9.0 * q.y - 6.0 * rvTwos(t));
  q.x *= 1.0 + 0.8 * clamp(q.y / 0.10, 0.0, 1.0);
  return length(vec2(q.x / 0.06, (q.y - 0.05) / 0.10));
}
float rvFlameMask(vec2 p, float t) { return 1.0 - cAA(rvFlameF(p, t), 1.0); }
vec3 rvSoulFlame(vec2 p, float t) {
  float f = rvFlameF(p, t);
  vec3 c = rvCourtBg(p);
  c = mix(c, vec3(0.498, 0.941, 0.894), (1.0 - cAA(f, 1.7)) * clamp(uRvFlameHalo, 0.0, 1.0) * 0.28);
  c = mix(c, vec3(0.392, 0.627, 0.635), 1.0 - cAA(f, 1.0));
  c = mix(c, vec3(0.753, 0.953, 0.929), 1.0 - cAA(f, 0.7));
  c = mix(c, vec3(0.969, 0.953, 0.929), 1.0 - cAA(f, 0.4));
  return cCap(c);
}`, "rvSoulFlame(p, t)",
  { uniforms: (o = {}) => U(o, { uRvFlameSize: 1, uRvFlameHalo: 1 }), use: "card",
    draws: "A teardrop flame in three flat cyan-white bands with a white-hot core, wavering a little each drawing, inside a faint cyan ring.",
    params: "uRvFlameSize: 0.5 at flame.on, swelling to 1.3 (7.0 to 7.7 s); uRvFlameHalo: 0 off to 1 soulglow ring; t: bend redrawn on twos; rvFlameMask gives alpha" });

export const rvBlackMass = mk("rvBlackMass", "Aura's black mass #0d0718: boiling blob redrawn on twos, violet rim #4b2d5a, darkest shape in frame",
  `uniform float uRvMassScale;
float rvMassD(vec2 p, float t) {
  vec2 q = p - vec2(0.5, 0.34);
  float tt = rvTwos(t);
  vec2 dir = q / max(length(q), 1e-4);
  float wob = (cFbm(dir * 1.6 + vec2(tt * 3.0, tt * 5.0 + uRvSeed)) - 0.5) * 0.35;
  return length(q) - 0.10 * uRvMassScale * (1.0 + wob);
}
float rvMassMask(vec2 p, float t) { return cFill(rvMassD(p, t)); }
vec3 rvBlackMass(vec2 p, float t) {
  float d = rvMassD(p, t);
  vec3 c = mix(rvCourtBg(p), vec3(0.294, 0.176, 0.353), cFill(d));
  return cCap(mix(c, vec3(0.051, 0.027, 0.094), cFill(d + 0.012)));
}`, "rvBlackMass(p, t)",
  { uniforms: (o = {}) => U(o, { uRvMassScale: 1 }), use: "card",
    draws: "A near-black blob with a thin violet rim whose outline boils differently every drawing.",
    params: "uRvMassScale: blob size (0 to 1.4; pops to 0 at mass.pop 8.5 s); uRvSeed: lobe pattern; rvMassMask gives alpha" });

export const rvManaColumn = mk("rvManaColumn", "mana pillar: three hard tones core #e7ecfa, mid #a9b6dc, outer #7687c1, ink streaks #4d5068 climbing on twos",
  `uniform float uRvGrow;
uniform float uRvFade;
vec3 rvManaColumn(vec2 p, float t) {
  vec3 bg = rvCourtBg(p) * 0.8;
  float x = abs(p.x - 0.5);
  float inside = (1.0 - cAA(x, 0.34)) * (1.0 - cAA(p.y, clamp(uRvGrow, 0.0, 1.0)));
  vec3 col = mix(RV_MANA_O, RV_MANA_M, 1.0 - cAA(x, 0.22));
  col = mix(col, RV_BLUEW, 1.0 - cAA(x, 0.11));
  float id = floor(p.x * 14.0);
  float h = rvH(vec2(id, 1.0));
  float ph = p.y * 6.0 - rvTwos(t) * 2.5 * (0.6 + h);
  float streak = (1.0 - cAA(abs(fract(ph) - 0.5), 0.18)) * step(0.55, h) * cAA(x, 0.11);
  col = mix(col, vec3(0.302, 0.314, 0.408), streak * 0.85);
  return cCap(mix(bg, col, inside * (1.0 - clamp(uRvFade, 0.0, 1.0))));
}`, "rvManaColumn(p, t)",
  { uniforms: (o = {}) => U(o, { uRvGrow: 1, uRvFade: 0 }), use: "card",
    draws: "A tall blue-white pillar of light in three hard tones, brightest down the middle, with dark streaks climbing it in steps.",
    params: "uRvGrow: 0 to 1 height from the floor (13 frames at 24 from 7.7 s); uRvFade: 0 to 1 fades it out (9.3 to 10.3 s); t: streaks climb on twos" });

export const rvManaRing = mk("rvManaRing", "mana ring on the flagstones: hard rim #a9b6dc and trail #7687c1 on a flattened ellipse, alpha 0.55",
  `uniform float uRvRingR;
uniform float uRvRingA;
vec3 rvManaRing(vec2 p, float t) {
  vec3 bg = rvCourtBg(p);
  float r = length((p - vec2(0.5, 0.30)) / vec2(1.0, 0.35));
  float R = max(uRvRingR, 0.02);
  float rim = (1.0 - cAA(abs(r - R), 0.012));
  float trail = (1.0 - cAA(abs(r - R + 0.03), 0.018)) * (1.0 - rim);
  vec3 c = mix(bg, RV_MANA_O, trail * uRvRingA);
  return cCap(mix(c, RV_MANA_M, rim * uRvRingA));
}`, "rvManaRing(p, t)",
  { uniforms: (o = {}) => U(o, { uRvRingR: 0.3, uRvRingA: 0.55 }), use: "plate",
    draws: "A flattened pale-blue ring on the floor with one hard bright rim and a darker blue band trailing inside it.",
    params: "uRvRingR: ring radius in frame heights (0.6 to 26 m mapped 0 to 1); uRvRingA: alpha (0.55); use two copies 5 frames apart for rings.scale" });

export const rvDapple = mk("rvDapple", "komorebi dapple: 80 flat ellipses, log10(r) ~ N(-1.7, 0.35), 1.6:1 stretch, spot #cbc5bf on ground #5a4d4b, drifting 0.01 H per s",
  `uniform float uRvDappleDrift;
vec3 rvDapple(vec2 p, float t) {
  vec3 ground = vec3(0.353, 0.302, 0.294), spot = vec3(0.796, 0.773, 0.749);
  vec2 q = p + vec2(0.0, uRvDappleDrift * 0.01 * t);
  float m = 0.0;
  for (int k = 0; k < 80; k++) {
    float fk = float(k);
    vec2 h = cH22(vec2(fk * 1.7 + uRvSeed, fk * 0.37 + 3.1));
    float n = (cH21(h * 91.0 + fk) + cH21(h.yx * 57.0 + fk * 2.0) + cH21(h + fk * 0.11) - 1.5) * 2.0;
    float r = pow(10.0, -1.7 + 0.35 * n);
    vec2 d = (fract(q - h + 0.5) - 0.5) * vec2(1.0 / 1.6, 1.0);
    m = max(m, cFill(length(d) - r));
  }
  return cCap(mix(ground, spot, m));
}`, "rvDapple(p, t)",
  { uniforms: (o = {}) => U(o, { uRvDappleDrift: 1 }), use: "plate",
    draws: "Pale warm light spots of many sizes scattered over a brown-grey floor, each a flat oval a little wider than tall.",
    params: "uRvDappleDrift: 1 drifts the spots 0.01 frame heights per second, 0 holds them; uRvSeed: placement" });

export const rvGoldCracks = mk("rvGoldCracks", "gold crack tree: 5 trunk links, two children per link at +/-(0.4+0.4u), grandchildren x0.72, diamond nodes, core #ffd488 edge #d9a93a",
  `uniform float uRvCrackGrow;
float rvCrackSeg(vec2 p, vec2 a, vec2 b, float vis) { return rvSeg(p, a, mix(a, b, clamp(vis, 0.0, 1.0))); }
float rvCrackD(vec2 p, out float node) {
  float g = clamp(uRvCrackGrow, 0.0, 1.0) * 3.6;
  vec2 a = vec2(0.5, 0.08);
  float ang = 1.5708 + (rvH(vec2(1.0, 2.0)) - 0.5) * 0.4;
  float dmin = 10.0;
  node = 10.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    ang += (rvH(vec2(fi, 7.0)) - 0.5) * 0.5;
    vec2 b = a + vec2(cos(ang), sin(ang)) * 0.14;
    float v0 = g - fi * 0.4;
    dmin = min(dmin, rvCrackSeg(p, a, b, v0));
    node = min(node, mix(10.0, abs(p.x - b.x) + abs(p.y - b.y), step(1.0, v0)));
    for (int c = 0; c < 2; c++) {
      float sg = float(c) * 2.0 - 1.0;
      float ca = ang + sg * (0.4 + 0.4 * rvH(vec2(fi, float(c) + 11.0)));
      vec2 b2 = b + vec2(cos(ca), sin(ca)) * 0.10;
      float v1 = v0 - 1.0;
      dmin = min(dmin, rvCrackSeg(p, b, b2, v1));
      for (int e = 0; e < 2; e++) {
        float sg2 = float(e) * 2.0 - 1.0;
        float ga = ca + sg2 * (0.4 + 0.4 * rvH(vec2(fi + 3.0 * float(c), float(e) + 21.0)));
        dmin = min(dmin, rvCrackSeg(p, b2, b2 + vec2(cos(ga), sin(ga)) * 0.072, v1 - 0.4));
      }
    }
    a = b;
  }
  return dmin;
}
float rvCrackMask(vec2 p, float t) { float n; float d = rvCrackD(p, n); return max(cLine(d, 3.2), cFill(n - 0.014)); }
vec3 rvGoldCracks(vec2 p, float t) {
  float n;
  float d = rvCrackD(p, n);
  vec3 c = mix(rvCourtBg(p), vec3(0.851, 0.663, 0.227), max(cLine(d, 3.2), cFill(n - 0.014)));
  return cCap(mix(c, vec3(1.0, 0.831, 0.533), max(cLine(d, 1.2), cFill(n - 0.006))));
}`, "rvGoldCracks(p, t)",
  { uniforms: (o = {}) => U(o, { uRvCrackGrow: 1 }), use: "mask",
    draws: "A branching gold crack climbing from the floor, forking into thinner and thinner twigs with a small diamond at each fork.",
    params: "uRvCrackGrow: 0 to 1 growth from the root outward (11.4 to 13.2 s); uRvSeed: branch angles; rvCrackMask gives alpha" });

export const rvKnightHelm = mk("rvKnightHelm", "knight seal great-helm: closed steel dome #cfc8c0 to #231621 in 3 tones, hollow visor slit, red-brown rim #9a4e3f, halberd blade, optional red cape band",
  `uniform float uRvCape;
vec3 rvKnightHelm(vec2 p, float t) {
  vec2 v = cN(p);
  float h = cNdL(p);
  vec3 c = cCel3(h, 0.34, 0.70, vec3(0.137, 0.086, 0.129), vec3(0.450, 0.412, 0.400), vec3(0.812, 0.784, 0.753));
  float e = 0.22 - dot(v, v);
  c = mix(c, vec3(0.604, 0.306, 0.247), (1.0 - cAA(e, 0.03)) * (1.0 - cAA(h, 0.45)));
  c = mix(c, c * 0.72, 1.0 - cAA(abs(v.x), 0.012));
  float slit = max(abs(v.x) - 0.17, abs(v.y - 0.02) - 0.028);
  c = mix(c, vec3(0.137, 0.086, 0.129), cFill(slit));
  c = mix(c, vec3(0.478, 0.102, 0.102), step(0.5, uRvCape) * cAA(-v.y, 0.28));
  c = mix(c, c * 0.8, cLine(slit, 1.5) * 0.5);
  vec3 bg = mix(rvCourtBg(p), vec3(0.749, 0.765, 0.831), cFill(max(abs(p.x - 0.28) - 0.012, abs(p.y - 0.5) - 0.40)));
  return cCap(mix(bg, c, cCover(p)));
}`, "rvKnightHelm(p, t)",
  { uniforms: (o = {}) => U(o, { uRvCape: 0 }), use: "card",
    draws: "A round steel great-helm lit from the upper left in three tones, a dark slit where the face should be, a red-brown rim on the shadow side and a pale halberd blade beside it.",
    params: "uRvCape: 1 adds the red cape band under the helm (one knight in nine)" });

export const rvFrierenHair = mk("rvFrierenHair", "Frieren seal hair: two tapered twin tails in clumps lit #bfc2dc shade #8d92b6, thin #e7ecfa sheen strokes, short fringe, wind lifts the tails",
  `uniform float uRvWind;
vec4 rvHairTail(vec2 n, float sg) {
  float tt = (0.28 - n.y) / 0.63;
  float cx = sg * (0.18 + 0.04 * tt + uRvWind * 0.22 * tt * tt);
  float w = mix(0.07, 0.012, clamp(tt, 0.0, 1.0));
  float lx = (n.x - cx) / w;
  float ins = cFill(max(abs(lx) - 1.0, abs(tt - 0.5) - 0.5));
  float band = fract(lx * 1.5 + 0.5 + 0.2 * sin(tt * 9.0));
  float lit = cAA(band, 0.40);
  float sheen = cFill(abs(band - 0.52) - 0.012) * step(0.3, tt) * (1.0 - cAA(tt, 0.7));
  return vec4(lit, sheen, ins, 0.0);
}
float rvHairMask(vec2 p, float t) {
  vec2 n = cN(p);
  float fr = cFill(max(abs(n.x) - 0.17, abs(n.y - 0.30) - 0.03 - 0.012 * sin(n.x * 90.0)));
  return max(max(rvHairTail(n, -1.0).z, rvHairTail(n, 1.0).z), fr);
}
vec3 rvFrierenHair(vec2 p, float t) {
  vec2 n = cN(p);
  vec3 c = rvCourtBg(p);
  vec3 lo = vec3(0.553, 0.573, 0.714), hi = vec3(0.749, 0.761, 0.863);
  for (int k = 0; k < 2; k++) {
    vec4 h = rvHairTail(n, float(k) * 2.0 - 1.0);
    c = mix(c, mix(lo, hi, h.x), h.z);
    c = mix(c, RV_BLUEW, h.y * h.z);
  }
  float fr = cFill(max(abs(n.x) - 0.17, abs(n.y - 0.30) - 0.03 - 0.012 * sin(n.x * 90.0)));
  c = mix(c, mix(lo, hi, cAA(fract(n.x * 8.0), 0.45)), fr);
  return cCap(c);
}`, "rvFrierenHair(p, t)",
  { uniforms: (o = {}) => U(o, { uRvWind: 0 }), use: "surface",
    draws: "Two long white-lilac tails hanging from a short straight fringe, split into lit and shaded clumps with a few thin bright sheen strokes.",
    params: "uRvWind: 0 hanging to 1 streaming out and up (6.2 to 7.7 s); rvHairMask gives alpha for the cut-out" });

export const rvFrierenEye = mk("rvFrierenEye", "Frieren seal eye: half-lidded almond, iris #4f9a72 with #1a0e16 upper rim, one soft highlight, lid line 1.5 px, blink closes the almond",
  `uniform float uRvBlink;
vec3 rvFrierenEye(vec2 p, float t) {
  vec2 q = cN(p) / 0.18;
  float k = 1.0 - clamp(uRvBlink, 0.0, 1.0);
  float ax = max(1.0 - q.x * q.x, 0.0);
  float up = 0.32 * ax * k, lo = -0.50 * ax * k;
  float dEye = max(max(q.y - up, lo - q.y), abs(q.x) - 1.0);
  vec3 c = vec3(0.404, 0.349, 0.349);
  c = mix(c, vec3(0.941, 0.902, 0.902), cFill(dEye));
  float iris = cFill(length(q - vec2(0.0, -0.02)) - 0.46) * cFill(dEye);
  vec3 ic = mix(vec3(0.310, 0.604, 0.447), RV_INK, cAA(q.y, up - 0.14));
  c = mix(c, ic, iris);
  c = mix(c, RV_INK, cFill(length(q - vec2(0.0, -0.02)) - 0.20) * iris);
  c = mix(c, vec3(0.953, 0.949, 0.969), cFill(length(q - vec2(-0.15, 0.10)) - 0.09) * iris * k);
  c = mix(c, RV_INK, cLine(q.y - up, 2.0) * cFill(abs(q.x) - 1.0));
  return cCap(c);
}`, "rvFrierenEye(p, t)",
  { uniforms: (o = {}) => U(o, { uRvBlink: 0 }), use: "card",
    draws: "A calm half-lidded almond eye with a green iris shadowed under a dark upper lid, one small highlight and a thin lid line.",
    params: "uRvBlink: 0 open to 1 closed (one blink at 12.4 s, 0.15 s)" });

export const rvScaleBreak = mk("rvScaleBreak", "scale break: silver beam snapped into 5 pieces, 12 gold-edged shards on p0 + v tau + g tau^2/2 stepped on fours, star glint, optional two-tone ink #1a0e16 / #e7ecfa",
  `uniform float uRvBreak;
uniform float uRvTwoTone;
vec3 rvScaleBreak(vec2 p, float t) {
  vec3 c = rvCourtBg(p);
  c = mix(c, RV_MANA_M, (1.0 - cAA(abs(p.x - 0.5), 0.14)) * 0.55);
  float b = clamp(uRvBreak, 0.0, 1.0);
  float tau = 0.45 * floor(b * 5.0) / 5.0 * 2.0;
  float dmin = 10.0;
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    vec2 mid = vec2(0.22 + 0.14 * fk, 0.58);
    float hh = rvH(vec2(fk, 31.0));
    vec2 off = vec2((hh - 0.5) * 0.10, (rvH(vec2(fk, 32.0)) - 0.9) * 0.14) * tau * 3.0;
    float a = (hh - 0.5) * 1.6 * tau;
    vec2 dir = vec2(cos(a), sin(a)) * 0.055;
    dmin = min(dmin, rvSeg(p, mid + off - dir, mid + off + dir));
  }
  vec3 line = mix(vec3(0.604, 0.698, 0.706), vec3(0.902, 0.953, 0.973), cLine(dmin, 1.0));
  c = mix(c, line, cLine(dmin, 2.4));
  for (int s = 0; s < 12; s++) {
    float fs = float(s);
    vec2 p0 = vec2(0.50 + (rvH(vec2(fs, 41.0)) - 0.5) * 0.5, 0.58);
    vec2 v = vec2((rvH(vec2(fs, 42.0)) - 0.5) * 0.5, rvH(vec2(fs, 43.0)) * 0.3);
    vec2 sp = p0 + v * tau - vec2(0.0, 0.5 * 0.9 * tau * tau);
    vec2 d = p - sp;
    float sh = abs(d.x) + abs(d.y) * 1.6 - 0.018;
    c = mix(c, vec3(0.851, 0.663, 0.227), cFill(sh - 0.005) * step(0.001, tau));
    c = mix(c, vec3(0.961, 0.984, 0.949), cFill(sh) * step(0.001, tau));
    c += vec3(0.9) * cStar4(d, 0.05) * step(0.75, rvH(vec2(fs, 44.0))) * step(0.001, tau);
  }
  vec3 two = mix(RV_INK, RV_BLUEW, step(0.30, cLuma(c)));
  return cCap(mix(c, two, step(0.5, uRvTwoTone)));
}`, "rvScaleBreak(p, t)",
  { uniforms: (o = {}) => U(o, { uRvBreak: 0.6, uRvTwoTone: 0 }), use: "card",
    draws: "A silver beam broken into five tumbling pieces with small white shards edged in gold falling past, a pale pillar behind; or the same drawn only in ink and blue-white.",
    params: "uRvBreak: 0 whole to 1 end of the slow fours window (8.5 to 9.3 s), steps in 5 holds; uRvTwoTone: 1 gives the single impact frame (frame 204); uRvSeed: piece and shard layout" });

export const rvButterfly = mk("rvButterfly", "flat blue butterfly #3a6ad8 with a pale inner band, wing width abs(cos phase) on twos, small dark body",
  `uniform float uRvFlap;
vec3 rvButterfly(vec2 p, float t) {
  vec2 n = p - 0.5;
  float w = max(abs(cos(uRvFlap + rvTwos(t) * 9.0)), 0.12);
  float x = abs(n.x);
  float up = length(vec2((x - 0.12 * w) / (0.14 * w), (n.y - 0.05) / 0.13)) - 1.0;
  float lo = length(vec2((x - 0.09 * w) / (0.10 * w), (n.y + 0.07) / 0.09)) - 1.0;
  float wing = min(up, lo);
  vec3 c = rvCourtBg(p);
  c = mix(c, vec3(0.227, 0.416, 0.847), cFill(wing));
  c = mix(c, vec3(0.659, 0.769, 0.941), cFill(wing + 0.35) * (1.0 - cFill(wing + 0.6)));
  c = mix(c, RV_INK, cFill(max(abs(n.x) - 0.008, abs(n.y) - 0.10)));
  return cCap(c);
}`, "rvButterfly(p, t)",
  { uniforms: (o = {}) => U(o, { uRvFlap: 0 }), use: "card",
    draws: "A small flat blue butterfly seen from above with a pale band inside each wing, the wings opening and closing in steps.",
    params: "uRvFlap: wing phase offset in radians; t: wings flap on twos" });

export const rvGrade = mk("rvGrade", "frame grade: split tone army / scales / forest by phase, blue-white lift in mana, luma cap 0.92, ink lift, twos grain 0.025, vignette 0.10, 2.39:1 bars #1a0e16",
  `uniform float uRvPhase;
uniform float uRvMana;
uniform float uRvAspect;
vec3 rvGrade(vec3 col, vec2 p, float t) {
  float a = clamp(1.0 - uRvPhase, 0.0, 1.0), b = clamp(1.0 - abs(uRvPhase - 1.0), 0.0, 1.0), d = clamp(uRvPhase - 1.0, 0.0, 1.0);
  vec3 sh = a * vec3(0.173, 0.102, 0.122) + b * vec3(0.082, 0.078, 0.165) + d * vec3(0.227, 0.216, 0.204);
  vec3 hi = a * vec3(0.855, 0.498, 0.447) + b * vec3(0.698, 0.773, 0.835) + d * vec3(0.769, 0.753, 0.741);
  hi = mix(hi, RV_BLUEW, clamp(uRvMana, 0.0, 1.0) * 0.5);
  float L = cLuma(col);
  vec3 tint = mix(sh, hi, smoothstep(0.1, 0.8, L));
  vec3 c = mix(col, tint * clamp(L * 1.6 + 0.1, 0.0, 1.0), 0.30);
  c = cCap(c);
  c = mix(RV_INK, c, smoothstep(0.035, 0.08, cLuma(c)));
  float g = (cH21(floor(gl_FragCoord.xy) + rvTwos(t) * 37.0) - 0.5) * 0.025 * (1.0 - L) * step(0.06, L);
  c = max(c + g, vec3(0.0)) * cVig(p, 0.0625);
  float bar = (1.0 - uRvAspect / 2.39) * 0.5;
  return mix(c, RV_INK, (1.0 - cAA(p.y, bar)) + cAA(p.y, 1.0 - bar));
}`, "rvGrade(mix(rvCourtBg(p), vec3(0.8, 0.7, 0.6), 0.3 * cFbm(p * 3.0)), p, t)",
  { uniforms: (o = {}) => U(o, { uRvPhase: 1, uRvMana: 0, uRvAspect: 1.6 }), use: "grade",
    draws: "The whole frame tinted warm rose in the army sky, cool blue-grey in the night court or grey-green in the afterglow, with ink-coloured bars top and bottom and no pixel below ink.",
    params: "uRvPhase: 0 army, 1 scales (court night), 2 forest afterglow, blends between; uRvMana: 0 to 1 pulls highlights to blue-white while the pillar stands; uRvAspect: frame width over height (1.6 gives 132 px bars at 1280 x 800); t: grain on twos" });

export const PACKET_SHADERS = [
  rvKit, rvArmySky, rvCourtSky, rvFlagstones, rvScaleBeam, rvSoulFlame, rvBlackMass, rvManaColumn, rvManaRing, rvDapple,
  rvGoldCracks, rvKnightHelm, rvFrierenHair, rvFrierenEye, rvScaleBreak, rvButterfly, rvGrade,
];
export default PACKET_SHADERS;
