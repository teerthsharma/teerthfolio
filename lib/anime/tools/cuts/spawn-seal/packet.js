// spawn-seal packet shaders: Tensura 8bit sealed cave, Veldora sphere, Megiddo gold beams, Raphael lattice, Predator swirl.
import { defineCut as M } from "../kit.glsl.js";

const F = "spawn-seal";
const v2 = (x, y) => ({ x, y, isVector2: true });
const v3 = (x, y, z) => ({ x, y, z, isVector3: true });
const U = (o, d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { value: o[k] ?? v }]));
const mk = (name, doc, glsl, demo, x) => ({ ...M(name, F, doc, glsl, demo), deps: ["cutKit", "spwKit"], suits: [F], ...x });

export const spwKit = {
  name: "spwKit", family: F, deps: ["cutKit"],
  doc: "spawn-seal shared law: cave ramp #020915 to #b0e1e9, pool cyan, crystal gold, Veldora gold and storm, Predator pearl and magenta, twos clock, voronoi, segment",
  uniforms: (o = {}) => U(o, { uSpwSeed: 0, uSpwAsp: 1.6 }),
  glsl: `
const vec3 SP_INK = vec3(0.102, 0.055, 0.086);
const vec3 SP_LINE = vec3(0.094, 0.114, 0.161);
const vec3 SP_R0 = vec3(0.008, 0.035, 0.082);
const vec3 SP_R1 = vec3(0.031, 0.098, 0.184);
const vec3 SP_R2 = vec3(0.082, 0.169, 0.286);
const vec3 SP_R3 = vec3(0.137, 0.259, 0.400);
const vec3 SP_R4 = vec3(0.196, 0.361, 0.518);
const vec3 SP_R5 = vec3(0.278, 0.529, 0.659);
const vec3 SP_R6 = vec3(0.427, 0.725, 0.804);
const vec3 SP_R7 = vec3(0.690, 0.882, 0.914);
const vec3 SP_POOLD = vec3(0.051, 0.416, 0.753);
const vec3 SP_POOL = vec3(0.122, 0.722, 1.0);
const vec3 SP_POOLHI = vec3(0.910, 1.0, 1.0);
const vec3 SP_CAUS = vec3(0.498, 0.973, 1.0);
const vec3 SP_EDGE = vec3(0.247, 0.863, 1.0);
const vec3 SP_CRSH = vec3(0.122, 0.627, 0.847);
const vec3 SP_GOLD = vec3(1.0, 0.824, 0.227);
const vec3 SP_GOLDLIT = vec3(1.0, 0.886, 0.478);
const vec3 SP_GOLDSH = vec3(0.784, 0.580, 0.122);
const vec3 SP_CORE = vec3(1.0, 0.949, 0.690);
const vec3 SP_VDARK = vec3(0.078, 0.063, 0.173);
const vec3 SP_VEYE = vec3(1.0, 0.945, 0.659);
const vec3 SP_VSHELL = vec3(1.0, 0.824, 0.353);
const vec3 SP_STORM = vec3(0.227, 0.651, 1.0);
const vec3 SP_BOLT = vec3(0.263, 0.349, 0.973);
const vec3 SP_LENS = vec3(0.498, 0.816, 1.0);
const vec3 SP_PMAG = vec3(0.925, 0.376, 0.988);
const vec3 SP_PSW = vec3(0.784, 0.831, 0.941);
const vec3 SP_PBAND = vec3(0.149, 0.286, 0.910);
const vec3 SP_PDARK = vec3(0.039, 0.078, 0.157);
const vec3 SP_VIOLET = vec3(0.541, 0.247, 1.0);
const vec3 SP_CARD = vec3(0.894, 0.910, 0.933);
const vec3 SP_RIM = vec3(0.796, 0.918, 0.969);
const vec3 SP_BODY = vec3(0.576, 0.725, 0.910);
const vec3 SP_INNER = vec3(0.224, 0.439, 0.651);
uniform float uSpwSeed;
uniform float uSpwAsp;
float spwTwos(float t) { return floor(t * 12.0 + 1e-4) / 12.0; }
float spwH(vec2 p) { return cH21(p + vec2(uSpwSeed * 7.31, uSpwSeed * 3.17)); }
vec3 spwLift(vec3 c) { return mix(SP_INK, c, smoothstep(0.035, 0.08, cLuma(c))); }
vec2 spwQ(vec2 p) { return (p - 0.5) * vec2(uSpwAsp, 1.0); }
float spwSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
vec3 spwVor(vec2 p) {
  vec2 ip = floor(p), fp = fract(p);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = cH22(ip + g);
      float d = length(g + o - fp);
      if (d < d1) { d2 = d1; d1 = d; id = cH21(ip + g + 3.7); } else if (d < d2) { d2 = d; }
    }
  }
  return vec3(d1, d2 - d1, id);
}`,
};

export const spwCavePlate = mk("spwCavePlate", "sealed cave far plate: faceted rock in four posterised blues, 75 percent in #08192f, stalactite teeth along the top, no ink line",
  `vec3 spwCavePlate(vec2 p, float t) {
  vec2 q = spwQ(p) + vec2(spwTwos(t) * 0.01, 0.0);
  vec3 v = spwVor(q * 3.2 + vec2(0.0, 1.7));
  float h = 0.55 * cFbm(q * vec2(2.2, 3.4) + 4.0) + 0.45 * v.z + 0.22 * p.y;
  vec3 c = SP_R1;
  c = mix(c, SP_R2, cAA(h, 0.70));
  c = mix(c, SP_R3, cAA(h, 0.82));
  c = mix(c, SP_R4, cAA(h, 0.92));
  c = mix(c, SP_R3, (1.0 - cAA(v.y, 0.05)) * 0.8);
  float tooth = abs(fract(q.x * 5.0 + spwH(vec2(floor(q.x * 5.0), 4.0))) * 2.0 - 1.0);
  float edge = 0.93 - 0.16 * tooth * (0.4 + spwH(vec2(floor(q.x * 5.0), 9.0)));
  c = mix(c, SP_R0, cAA(p.y, edge));
  c = mix(c, SP_R2, (1.0 - cAA(abs(p.y - edge), 0.004)) * 0.5);
  return cCap(spwLift(c));
}`, "spwCavePlate(p, t)",
  { uniforms: (o = {}) => U(o, {}), use: "plate",
    draws: "A dark blue chiselled cave wall in flat faceted steps with pointed stalactite teeth hanging from the top edge and no outline.",
    params: "uSpwSeed: which facets and teeth; uSpwAsp: frame aspect for the facet scale; t: drifts the facets on twos" });

export const spwMouthSky = mk("spwMouthSky", "cave mouth panorama: five hard steps #234266 to #b0e1e9 to the horizon, one cloud band, distant burning battlefield strip",
  `uniform float uSpwBurn;
vec3 spwMouthSky(vec2 p, float t) {
  float y = p.y + (cFbm(vec2(p.x * 2.6 + spwTwos(t) * 0.01, p.y * 7.0)) - 0.5) * 0.05;
  vec3 c = SP_R7;
  c = mix(c, SP_R6, cAA(y, 0.20));
  c = mix(c, SP_R5, cAA(y, 0.36));
  c = mix(c, SP_R4, cAA(y, 0.54));
  c = mix(c, SP_R3, cAA(y, 0.74));
  float band = abs(y - 0.46 - 0.02 * sin(p.x * 6.0)) - 0.016;
  c = mix(c, SP_R6, cFill(band) * 0.8);
  float ridge = 0.15 + 0.03 * cVn(vec2(p.x * 9.0, 2.0));
  float col = floor(p.x * 60.0);
  float tri = abs(fract(p.x * 60.0) - 0.5) * 2.0;
  float lit = step(0.55, spwH(vec2(col, 1.0)));
  float top = ridge + (0.012 + 0.05 * spwH(vec2(col, 2.0))) * clamp(uSpwBurn, 0.0, 1.0) * (1.0 - tri) * lit;
  vec3 fire = mix(vec3(1.0, 0.541, 0.165), SP_GOLD, step(0.5, spwH(vec2(col, 3.0))));
  c = mix(c, fire, (1.0 - cAA(p.y, top)) * cAA(p.y, ridge));
  c = mix(c, SP_R2, 1.0 - cAA(p.y, ridge));
  return cCap(c);
}`, "spwMouthSky(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwBurn: 1 }), use: "plate",
    draws: "A blue-hour sky in five hard bands from dusk blue at the top to a pale horizon, with one cloud band and a dark ridge of small burning flames along the bottom.",
    params: "uSpwBurn: 0 cold ridge to 1 full flame teeth; t: wobbles band edges on twos" });

export const spwPoolWater = mk("spwPoolWater", "cave pool: three posterised cyan levels, scrolling voronoi caustic polygons, three hard ripple rings 4 frames apart to r 3 m",
  `uniform float uSpwRingAge;
uniform float uSpwRingR;
uniform float uSpwFlare;
vec3 spwPoolWater(vec2 p, float t) {
  float tw = spwTwos(t);
  float h = cFbm(p * 3.0 + vec2(tw * 0.15, tw * 0.10));
  vec3 c = mix(SP_POOLD, SP_POOL, cAA(h, 0.42));
  c = mix(c, SP_EDGE, cAA(h, 0.64));
  vec3 vr = spwVor(p * 7.0 + vec2(t * 0.35, t * 0.22));
  c = mix(c, SP_CAUS, (1.0 - cAA(vr.y, 0.10)) * 0.9);
  vec2 q = p - 0.5;
  for (int k = 0; k < 3; k++) {
    float a = floor((uSpwRingAge - float(k) * 0.3333) * 12.0 + 1e-4) / 12.0;
    float on = step(0.0, a) * (1.0 - cAA(a, 0.9));
    float R = uSpwRingR * clamp(a / 0.9, 0.0, 1.0);
    float r = length(q);
    c = mix(c, SP_CAUS, cFill(abs(r - R + 0.018) - 0.008) * on);
    c = mix(c, SP_POOLHI, cFill(abs(r - R) - 0.010) * on);
  }
  c = mix(c, SP_CAUS, clamp(uSpwFlare, 0.0, 1.0) * 0.5 * (1.0 - cAA(length(p - 0.5), 0.45)));
  return cCap(c);
}`, "spwPoolWater(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwRingAge: 0.4, uSpwRingR: 0.45, uSpwFlare: 0 }), use: "surface",
    draws: "Bright cyan pool water in three flat levels with a net of pale caustic lines sliding across it and up to three crisp white ripple rings spreading from the middle.",
    params: "uSpwRingAge: seconds since the PLOP (negative hides the rings); uSpwRingR: final ring radius in card units; uSpwFlare: 0 to 1 pool uplight lift" });

export const spwCrystalNode = mk("spwCrystalNode", "crystal cluster: five hex prisms tilted 5 to 25 degrees with pyramid tips, 3 flat tones, #3fdcff to #ffd23a on ignite, 2 px line",
  `uniform float uSpwIgnite;
vec3 spwCrystalNode(vec2 p, float t) {
  float g = cAA(uSpwIgnite, 0.5);
  vec3 lit = mix(SP_CAUS, SP_GOLDLIT, g), mid = mix(SP_EDGE, SP_GOLD, g), sh = mix(SP_CRSH, SP_GOLDSH, g);
  vec3 c = mix(SP_R1, SP_R2, cAA(p.y, 0.07));
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    float h1 = spwH(vec2(fk, 1.0)), h2 = spwH(vec2(fk, 2.0)), h3 = spwH(vec2(fk, 3.0));
    float tilt = (0.09 + 0.35 * h1) * (h2 < 0.5 ? -1.0 : 1.0);
    vec2 v = p - vec2(0.18 + 0.16 * fk + 0.03 * (h3 - 0.5), 0.07);
    vec2 r = vec2(cos(tilt) * v.x + sin(tilt) * v.y, -sin(tilt) * v.x + cos(tilt) * v.y);
    float w = 0.05 + 0.03 * h1, hg = 0.40 + 0.40 * h3, tip = w * 1.3;
    float hw = w * (1.0 - clamp((r.y - (hg - tip)) / tip, 0.0, 1.0));
    float d = max(abs(r.x) - hw, max(-r.y, r.y - hg));
    vec3 fc = mix(mid, sh, cAA(r.x, 0.0));
    fc = mix(fc, mix(lit, mid, cAA(r.x, 0.0)), cAA(r.y, hg - tip));
    c = mix(c, fc, cFill(d));
    c = mix(c, SP_LINE, cLine(d, 2.0));
  }
  c += mix(SP_EDGE, SP_GOLD, g) * 0.22 * exp(-length(p - vec2(0.5, 0.45)) * 4.0);
  return cCap(c);
}`, "spwCrystalNode(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwIgnite: 0 }), use: "surface",
    draws: "A cluster of five tilted hexagonal crystal spikes in three flat tones with pointed tips and a thin dark outline, cyan at rest and turning gold when lit.",
    params: "uSpwIgnite: 0 cyan ore to 1 gold, hard switch at 0.5; uSpwSeed: which heights and tilts" });

export const spwVeldoraSphere = mk("spwVeldoraSphere", "Veldora sphere: dark interior, pale pearl shell with white water polygons, gold rim and zigzag storm lightning on pulse, gold eye card opening",
  `uniform float uSpwPulse;
uniform float uSpwEyeOpen;
uniform float uSpwGlint;
vec3 spwVeldoraSphere(vec2 p, float t) {
  vec2 q = spwQ(p);
  float tw = spwTwos(t);
  float r = length(q) / 0.42;
  float a = atan(q.y, q.x);
  float d = r - 1.0;
  float pu = clamp(uSpwPulse, 0.0, 1.0);
  vec3 vr = spwVor(q * 6.0);
  vec3 pearl = mix(vec3(0.72, 0.77, 0.85), vec3(0.90, 0.92, 0.95), step(0.5, vr.z));
  pearl = mix(pearl, vec3(0.60, 0.66, 0.77), 1.0 - cAA(vr.y, 0.07));
  vec3 c = mix(SP_VDARK, pearl, cAA(r, 0.78));
  vec2 e = (q - vec2(-0.06, 0.08)) / 0.13;
  float lid = uSpwEyeOpen * 0.55 * max(1.0 - e.x * e.x, 0.0);
  float ed = max(abs(e.x) - 1.0, abs(e.y) - lid);
  float eye = cFill(ed) * step(0.01, uSpwEyeOpen) * (1.0 - cAA(r, 0.78));
  c = mix(c, SP_VEYE, eye);
  c = mix(c, SP_VDARK, cFill(max(abs(e.x) - 0.12, abs(e.y) - lid * 0.9)) * eye);
  c = mix(c, SP_VEYE, cStar4(vec2(e.x + 0.35, e.y - 0.15) * 0.5, 0.5) * clamp(uSpwGlint, 0.0, 1.0));
  c = mix(SP_R1, c, cFill(d));
  c = mix(c, SP_LINE, cLine(d, 2.0));
  c = mix(c, SP_VSHELL, cFill(abs(d) - 0.03) * pu);
  c = mix(c, SP_STORM, cFill(abs(r - 1.07) - 0.012) * pu);
  float zig = abs(fract(a / 6.2832 * 14.0 + floor(tw * 5.0) * 0.37) * 2.0 - 1.0);
  c = mix(c, SP_BOLT, cLine((r - 1.03 - 0.05 * zig) * 0.42, 1.6) * pu);
  c += SP_VEYE * 0.2 * uSpwEyeOpen * exp(-length(e) * 1.6) * (1.0 - cAA(r, 0.78));
  return cCap(c);
}`, "spwVeldoraSphere(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwPulse: 0, uSpwEyeOpen: 1, uSpwGlint: 0 }), use: "surface",
    draws: "A round pearl-white shell patched with white water polygons around a dark inside, a huge gold slit eye opening on the inner wall, and gold and blue lightning flexing around its rim.",
    params: "uSpwPulse: 0 to 1 gold rim, storm band and contour lightning (2.79 s pulse); uSpwEyeOpen: 0 closed to 1 open (4 frames); uSpwGlint: 0 to 1 star twinkle in the eye (2 frames at 6.7 s)" });

export const spwLensArc = mk("spwLensArc", "Megiddo lenses: seven glass ellipses on a gentle arc, body 40 percent toward #e8ffff, posterised ring highlight, 1.12 overshoot pop",
  `uniform float uSpwLensK;
uniform float uSpwLensRx;
uniform float uSpwLensRy;
vec3 spwLensArc(vec2 p, float t) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 c = vec2(0.25 + fi * 0.0833, 1.0 - (0.18 + 0.05 * sin(3.14159265 * fi / 6.0)));
    float pk = clamp(uSpwLensK - fi, 0.0, 1.0);
    float s = pk * (1.0 + 0.12 * (1.0 - cAA(pk, 0.999)));
    vec2 e = (p - c) / (vec2(uSpwLensRx, uSpwLensRy) * max(s, 1e-3));
    float rho = length(e);
    float u = (rho - 1.0) / 0.08;
    float body = cFill(rho - 1.0) * step(0.001, s);
    acc = max(acc, mix(SP_LENS, SP_POOLHI, 0.4) * body);
    acc = max(acc, SP_POOLHI * 0.8 * step(0.25, 0.5 * exp(-u * u)) * step(0.001, s));
  }
  return cCap(acc);
}`, "mix(SP_R2, SP_R5, p.y) + spwLensArc(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwLensK: 8, uSpwLensRx: 0.04, uSpwLensRy: 0.025 }), use: "card",
    draws: "Seven pale glass ellipses in a shallow arch, each with a bright rim ring, popping in one by one.",
    params: "uSpwLensK: 0 to 8, lens i pops when K passes i (about 1.17 s total); uSpwLensRx/Ry: half-axes in frame fractions; black where there is no lens" });

export const spwGoldBeams = mk("spwGoldBeams", "Megiddo beams: seven hard gold tapered cones lens to crystal node, 0.153 s apart, 0.5 s each, cream core #fff2b0 with 0.9 exp(-d/0.006) falloff",
  `uniform float uSpwBeamAge;
uniform float uSpwNodeY;
vec3 spwGoldBeams(vec2 p, float t) {
  vec2 q = spwQ(p);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float lx = 0.25 + fi * 0.0833;
    vec2 A = spwQ(vec2(lx, 1.0 - (0.18 + 0.05 * sin(3.14159265 * fi / 6.0))));
    vec2 B = spwQ(vec2(0.5 + (lx - 0.5) * 1.3, uSpwNodeY + 0.10 * cos(fi * 0.8976)));
    float a = floor((uSpwBeamAge - fi * 0.153) * 12.0 + 1e-4) / 12.0;
    float on = step(0.0, a) * (1.0 - cAA(a, 0.5));
    vec2 pa = q - A, ba = B - A;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float d = length(pa - ba * h);
    float w = mix(0.004, 0.016, h);
    vec3 e = SP_GOLD * (1.0 - cAA(d, w)) + SP_CORE * (1.0 - cAA(d, w * 0.35)) + SP_CORE * 0.9 * exp(-d / 0.006) * 0.25;
    acc += e * on;
  }
  return cCap(acc);
}`, "mix(SP_R1, SP_R3, p.y) + spwGoldBeams(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwBeamAge: 0.3, uSpwNodeY: 0.34 }), use: "card",
    draws: "Seven hard-edged gold beams stab down one after another from a row of lenses to crystals below, each with a pale cream core and a brief flash.",
    params: "uSpwBeamAge: seconds since 10.0 (beam i starts at i x 0.153 and lasts 0.5); uSpwNodeY: screen height of the crystal row; additive, black where no beam" });

export const spwRaphaelLattice = mk("spwRaphaelLattice", "Raphael lattice: 7 ring nodes, 7 ring edges then 7 skip-one chords drawn on, 7 low-alpha triangles, breathing loop, gold #ffd23a at 0.42",
  `uniform vec2 uSpwLatC;
uniform float uSpwLatR;
uniform float uSpwLatSquash;
uniform float uSpwNodeK;
uniform float uSpwEdgeK;
uniform float uSpwTriK;
uniform float uSpwLoopK;
vec2 spwLatNode(float k) {
  float a = 6.2831853 * mod(k, 7.0) / 7.0;
  return spwQ(uSpwLatC) + vec2(cos(a), sin(a) * uSpwLatSquash) * uSpwLatR;
}
float spwLatSide(vec2 p, vec2 a, vec2 b) { return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); }
vec3 spwRaphaelLattice(vec2 p, float t) {
  vec2 q = spwQ(p);
  float tw = spwTwos(t);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 A = spwLatNode(fi), B = spwLatNode(fi + 1.0), C = spwLatNode(fi + 2.0);
    float s1 = spwLatSide(q, A, B), s2 = spwLatSide(q, B, C), s3 = spwLatSide(q, C, A);
    float inside = step(0.0, min(s1, min(s2, s3))) + step(0.0, min(-s1, min(-s2, -s3)));
    acc += SP_GOLD * 0.42 * 0.5 * inside * clamp(uSpwTriK, 0.0, 1.0);
  }
  float breathe = 1.0 + clamp(uSpwLoopK, 0.0, 1.0) * (0.5 + 0.5 * sin(6.2832 * tw / 1.5));
  for (int e = 0; e < 14; e++) {
    float fe = float(e);
    float ring = 1.0 - step(6.5, fe);
    float i0 = mod(fe, 7.0);
    vec2 A = spwLatNode(i0);
    vec2 B = spwLatNode(i0 + 1.0 + (1.0 - ring));
    float g = clamp(uSpwEdgeK - fe, 0.0, 1.0);
    float d = spwSeg(q, A, mix(A, B, g));
    float w = 0.0035 * mix(1.0, breathe, ring);
    acc += SP_GOLD * 0.42 * (1.0 - cAA(d, w)) * step(0.001, g);
  }
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float nk = clamp(uSpwNodeK * 7.0 - fi, 0.0, 1.0);
    float d = length(q - spwLatNode(fi));
    acc += SP_GOLD * (1.0 - cAA(d, 0.014 * nk)) + SP_CORE * (1.0 - cAA(d, 0.006 * nk));
  }
  return cCap(acc);
}`, "mix(SP_POOLD, SP_POOL, p.y) * 0.6 + spwRaphaelLattice(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwLatC: v2(0.5, 0.5), uSpwLatR: 0.30, uSpwLatSquash: 0.55, uSpwNodeK: 1, uSpwEdgeK: 14, uSpwTriK: 1, uSpwLoopK: 1 }), use: "card",
    draws: "A thin gold net over the ground: seven glowing nodes on an oval, joined by a ring and by star chords, with faint gold triangles filled between them and the outer ring breathing.",
    params: "uSpwLatC: centre in frame fractions; uSpwLatR/Squash: ring radius and floor squash; uSpwNodeK: 0 to 1 nodes ignite in order; uSpwEdgeK: 0 to 14 edges drawn on (ring first, then chords); uSpwTriK: 0 to 1 triangle fill; uSpwLoopK: 0 to 1 ring breathing; additive" });

export const spwTerritory = mk("spwTerritory", "three territories: 120 degree sectors on a floor disc, cyan #3fdcff, gold #ffc83a, pink #ff4fa0, alpha 0.25, hard edges, no text",
  `uniform vec2 uSpwTerrC;
uniform float uSpwTerrK;
uniform float uSpwTerrA;
vec3 spwTerritory(vec2 p, float t) {
  vec2 q = (p - uSpwTerrC) * vec2(uSpwAsp, 1.0) / vec2(1.0, 0.55);
  float a = atan(q.y, q.x) + 3.14159265;
  float sec = floor(a / 2.0943951);
  vec3 col = sec < 0.5 ? vec3(0.247, 0.863, 1.0) : (sec < 1.5 ? vec3(1.0, 0.784, 0.227) : vec3(1.0, 0.310, 0.627));
  float disc = cFill(length(q) - 0.5 * clamp(uSpwTerrK, 0.0, 1.0));
  float seam = cLine(fract(a / 2.0943951 + 0.5) - 0.5, 1.6) * disc;
  vec3 c = col * uSpwTerrA * disc + vec3(0.9) * uSpwTerrA * 0.5 * seam;
  return cCap(c);
}`, "mix(SP_R1, SP_R3, p.y) + spwTerritory(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwTerrC: v2(0.5, 0.45), uSpwTerrK: 1, uSpwTerrA: 0.25 }), use: "card",
    draws: "A flat oval of floor split into three equal wedges tinted cyan, gold and pink, with thin pale seams between them and no lettering.",
    params: "uSpwTerrC: centre in frame fractions; uSpwTerrK: 0 to 1 radius grow-in; uSpwTerrA: tint strength (0.25); additive, black outside the disc" });

export const spwPredatorSwirl = mk("spwPredatorSwirl", "Predator sphere: pearl #c8d4f0 spiral from f = 1/2 + 1/2 sin(10a + 18r - 2 pi t), white sin(6a+25r) bands, magenta rim at the edge only, 24 fps",
  `uniform float uSpwOpen;
uniform float uSpwSpin;
uniform float uSpwSwirlR;
vec3 spwPredatorSwirl(vec2 p, float t) {
  vec2 q = spwQ(p);
  float tq = floor(t * 24.0 + 1e-4) / 24.0;
  float R = uSpwSwirlR * clamp(uSpwOpen, 0.0, 1.0);
  float r = length(q);
  float a = atan(q.y, q.x) + uSpwSpin * 6.2831853 * tq;
  float f = 0.5 + 0.5 * sin(10.0 * a + 18.0 * r - 6.2831853 * tq);
  f = floor(f * 3.0) / 3.0;
  float b = 1.0 - cAA(abs(sin(6.0 * a + 25.0 * r)), 0.25);
  vec3 c = mix(0.55, 1.0, f) * SP_PSW + vec3(b) * 0.25;
  float u = (r - R) / 0.012;
  vec3 e = mix(SP_PDARK, c, cFill(r - R));
  e = mix(e, vec3(1.0, 0.251, 0.753), clamp(0.8 * exp(-u * u), 0.0, 1.0) * step(0.01, uSpwOpen));
  return cCap(e);
}`, "spwPredatorSwirl(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwOpen: 1, uSpwSpin: 1, uSpwSwirlR: 0.5 }), use: "plate",
    draws: "A round pearl-white sphere wound with a three-step spiral and thin white bands, ringed by a hard magenta edge on a dark navy ground.",
    params: "uSpwOpen: 0 to 1 sphere opening radius (10 frames); uSpwSpin: revolutions per second after 27.21 s; uSpwSwirlR: full radius in frame heights" });

export const spwEatenFront = mk("spwEatenFront", "eaten front: a cone from the apex swallows the frame to ink floor #1a0e16 behind a hard magenta band then a #2649e8 band, with blue slashes; a hero ellipse stays whole",
  `uniform float uSpwEatK;
uniform vec2 uSpwEatApex;
uniform float uSpwEatAng;
uniform vec3 uSpwKeep;
vec3 spwEatenFront(vec3 col, vec2 p, float t) {
  vec2 q = spwQ(p), dv = q - spwQ(uSpwEatApex);
  float tw = spwTwos(t);
  float dist = length(dv);
  float ang = atan(abs(dv.x), max(-dv.y, 1e-4));
  float wob = (cFbm(vec2(ang * 6.0, tw * 0.5)) - 0.5) * 0.06 + 0.012 * sign(sin(ang * 40.0));
  float e = (uSpwEatK + wob - dist) * (1.0 - cAA(ang, uSpwEatAng));
  vec3 c = mix(col, SP_PMAG, cAA(e, 0.0));
  c = mix(c, SP_PBAND, cAA(e, 0.022));
  c = mix(c, SP_INK, cAA(e, 0.05));
  float slash = cLine(fract((q.x + q.y * 0.8) * 9.0) - 0.5, 1.5) * cAA(e, 0.06);
  c = mix(c, SP_PBAND * 0.5, slash * 0.8);
  float keep = cFill(length((q - spwQ(uSpwKeep.xy)) / vec2(1.0, 0.6)) - uSpwKeep.z);
  return cCap(mix(c, col, keep));
}`, "spwEatenFront(mix(SP_R3, SP_R6, p.y), p, t)",
  { uniforms: (o = {}) => U(o, { uSpwEatK: 0.6, uSpwEatApex: v2(0.5, 1.1), uSpwEatAng: 0.9, uSpwKeep: v3(0.5, 0.4, 0.15) }), use: "screen",
    draws: "The picture is swallowed from the top by a widening wedge: a bright magenta line, a deep blue line, then flat dark ink scratched with blue slashes, leaving a small oval around the hero untouched.",
    params: "input colour; uSpwEatK: 0 to about 1.7 front reach from the apex; uSpwEatApex: wedge tip in frame fractions; uSpwEatAng: half-angle in radians; uSpwKeep: x, y centre and radius of the protected hero oval" });

export const spwSlimeGloss = mk("spwSlimeGloss", "slimeGloss: fresnel (1-v)^2 mixes body #93b9e8 to rim #cbeaf7 in 3 flat steps, inner blob #3970a6, two hard specular ellipses, height wipe h < 1.55 k",
  `uniform float uSpwGlossK;
uniform float uSpwGlossMix;
vec3 spwSlimeGloss(vec3 col, vec2 p, float t) {
  vec2 q = (p - 0.5) * 2.0;
  float v = sqrt(max(1.0 - dot(q, q), 0.0));
  float F = (1.0 - v) * (1.0 - v);
  vec3 g = mix(SP_BODY, SP_RIM, cAA(F, 0.40));
  g = mix(g, SP_RIM, cAA(F, 0.75));
  g = mix(SP_INNER, g, cAA(F, 0.08));
  vec2 b = (q - vec2(-0.1, 0.15)) / vec2(0.7, 0.5);
  g = mix(g, SP_INNER, cFill(length(b) - 1.0) * 0.9 * (1.0 - cAA(F, 0.55)));
  g = mix(g, vec3(1.0), cFill(length((q - vec2(-0.45, 0.55)) / vec2(0.14, 0.08)) - 1.0));
  g = mix(g, vec3(1.0), cFill(length((q - vec2(-0.15, 0.62)) / vec2(0.06, 0.05)) - 1.0));
  float wipe = 1.0 - cAA(p.y, 1.55 * clamp(uSpwGlossK, 0.0, 1.0));
  float body = cFill(length(q) - 1.0);
  return cCap(mix(col, g, body * wipe * uSpwGlossMix));
}`, "spwSlimeGloss(mix(SP_R1, vec3(0.435, 0.545, 0.682), cCover(p)), p, t)",
  { uniforms: (o = {}) => U(o, { uSpwGlossK: 1, uSpwGlossMix: 0.9 }), use: "surface",
    draws: "A glossy blue slime look over a round body: bright pale rim, flat blue middle, a darker blue pool inside and two crisp white highlights at the upper left, rising up from the bottom.",
    params: "input colour; uSpwGlossK: 0 to 1 how far the gloss has run up (wipe h < 1.55 k); uSpwGlossMix: 0.6 on the hero, 0.9 to 1.0 on the slime pup" });

export const spwSkillCard = mk("spwSkillCard", "skill card: #e4e8ee frame and wordless white triangle on ink #1a0e16, 4-step pop-in; kind 1 bites a tooth notch into the triangle for Predator",
  `uniform float uSpwCardK;
uniform float uSpwCardKind;
vec3 spwSkillCard(vec2 p, float t) {
  float k = floor(clamp(uSpwCardK, 0.0, 1.0) * 4.0 + 1e-4) / 4.0;
  vec2 q = (p - 0.5) / max(k, 1e-3);
  float d = max(abs(q.x) - 0.47, abs(q.y) - 0.40);
  vec3 c = mix(SP_R1, SP_INK, cFill(d));
  c = mix(c, SP_CARD, cLine(d + 0.05, 1.6) * cFill(d));
  vec2 tq = q - vec2(uSpwCardKind < 0.5 ? 0.0 : -0.20, 0.0);
  float tri = max(abs(tq.x) * 0.8660254 + tq.y * 0.5 - 0.13, -tq.y - 0.13);
  float bite = uSpwCardKind < 0.5 ? 0.0 : cFill(tq.y + 0.13 - 0.07 * abs(fract(tq.x * 6.0) * 2.0 - 1.0));
  c = mix(c, SP_CARD, cFill(tri) * (1.0 - bite * step(0.5, uSpwCardKind)) * step(0.01, k));
  return cCap(c);
}`, "spwSkillCard(p, t)",
  { uniforms: (o = {}) => U(o, { uSpwCardK: 1, uSpwCardKind: 0 }), use: "card",
    draws: "A dark ink card with a thin pale border and one pale triangle in the middle, or in the Predator form a triangle with a toothed bite at its base.",
    params: "uSpwCardK: 0 to 1 pop-in in four steps (scale 0.25 to 1); uSpwCardKind: 0 Raphael triangle, 1 Predator bitten triangle; lettering is drawn separately" });

export const spwGrade = mk("spwGrade", "spawn-seal frame: split tone #010814 to #74b1c6 at 0.30, violet #8a3fff edge cooling, optional inverted two-tone #e4e8ee/#1a0e16, 2.39:1 ink bars, ink lift, luma cap 0.92",
  `uniform vec3 uSpwShadow;
uniform vec3 uSpwHigh;
uniform float uSpwViolet;
uniform float uSpwInvert;
uniform float uSpwBars;
vec3 spwGrade(vec3 col, vec2 p, float t) {
  float y = cLuma(col);
  vec3 c = mix(col, mix(uSpwShadow, uSpwHigh, smoothstep(0.0, 1.0, y)), 0.30);
  float edge = length(spwQ(p)) * 2.0;
  c = mix(c, SP_VIOLET * 0.8, clamp(uSpwViolet, 0.0, 1.0) * 0.28 * smoothstep(0.55, 1.25, edge));
  c = mix(c, mix(SP_CARD, SP_INK, cAA(y, 0.30)), step(0.5, uSpwInvert));
  c = spwLift(cCap(c));
  float bar = cAA(abs(p.y - 0.5), 0.5 * uSpwAsp / 2.39) * step(0.5, uSpwBars);
  return mix(c, SP_INK, bar);
}`, "spwGrade(mix(SP_R3, SP_R7, p.y), p, t)",
  { uniforms: (o = {}) => U(o, { uSpwShadow: v3(0.004, 0.031, 0.078), uSpwHigh: v3(0.455, 0.694, 0.776), uSpwViolet: 0, uSpwInvert: 0, uSpwBars: 1 }), use: "grade",
    draws: "The whole frame in cool deep-blue shadows and pale cyan highlights between two flat dark letterbox bars, optionally cooling to violet at the edges or flipping to one inverted two-tone flash.",
    params: "input colour; uSpwShadow/High: split-tone ends; uSpwViolet: 0 to 1 violet edge cooling (22.58 to 26.79 s); uSpwInvert: 1 for the two-frame inverted flash; uSpwBars: 1 draws the 2.39:1 bars" });

export const PACKET_SHADERS = [
  spwKit, spwCavePlate, spwMouthSky, spwPoolWater, spwCrystalNode, spwVeldoraSphere, spwLensArc, spwGoldBeams,
  spwRaphaelLattice, spwTerritory, spwPredatorSwirl, spwEatenFront, spwSlimeGloss, spwSkillCard, spwGrade,
];
export default PACKET_SHADERS;
