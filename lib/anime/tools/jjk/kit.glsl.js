// Reusable MAPPA Limitless / Unlimited Void grammar.
// Any dock may import jjkKit. Aether is a consumer, not the owner.
// Laws: luma ≤ 0.92, indigo ink never #000, fwidth AA, glow via mix not bloom.

export const KIT_GLSL = /* glsl */ `
#ifndef JJK_KIT
#define JJK_KIT
const vec3 JJK_LUMA = vec3(0.2126, 0.7152, 0.0722);
const float JJK_CAP = 0.92;
const vec3 JJK_INK = vec3(0.055, 0.072, 0.110);
const vec3 JJK_VOID = vec3(0.035, 0.055, 0.095);
const vec3 JJK_DEEP = vec3(0.022, 0.038, 0.070);
const vec3 JJK_BLUE = vec3(0.184, 0.490, 1.000);
const vec3 JJK_CYAN = vec3(0.494, 0.784, 1.000);
const vec3 JJK_RED = vec3(1.000, 0.169, 0.227);
const vec3 JJK_FLARE = vec3(1.000, 0.353, 0.431);
const vec3 JJK_PURPLE = vec3(0.482, 0.173, 0.749);
const vec3 JJK_VIOLET = vec3(0.914, 0.294, 1.000);
const vec3 JJK_GLASS = vec3(0.86, 0.90, 0.96);
const vec3 JJK_PATCH = vec3(0.90, 0.92, 0.96);
const vec3 JJK_CLOTH = vec3(0.098, 0.102, 0.125);
const vec3 JJK_SKIN_D = vec3(0.227, 0.145, 0.165);
const vec3 JJK_SKIN_M = vec3(0.720, 0.560, 0.500);
const vec3 JJK_SKIN_L = vec3(0.900, 0.800, 0.740);
const vec2 JJK_C = vec2(0.84, 0.30);
const vec2 JJK_EYE = vec2(0.48, 0.54);

float jjkLuma(vec3 c) { return dot(max(c, vec3(0.0)), JJK_LUMA); }
vec3 jjkLift(vec3 c) { return max(c, JJK_INK); }
vec3 jjkCap(vec3 c) { float L = jjkLuma(c); return c * min(1.0, JJK_CAP / max(L, 1e-4)); }
vec3 jjkOut(vec3 c) { return jjkCap(jjkLift(c)); }
float jjkAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float jjkFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float jjkLine(float d, float px) {
  float f = fwidth(d) + 1e-6;
  return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d));
}
float jjkH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float jjkVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(jjkH21(i), jjkH21(i + vec2(1.0, 0.0)), f.x),
             mix(jjkH21(i + vec2(0.0, 1.0)), jjkH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float jjkFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * jjkVn(p); p *= 2.03; a *= 0.5; } return s; }
float jjkHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1.0); }
vec2 jjkN(vec2 p) { return p - JJK_C; }
float jjkCover(vec2 p) { vec2 q = jjkN(p); return jjkAA(0.13 - dot(q, q), 0.0); }
float jjkNdL(vec2 p) {
  vec2 c = jjkN(p); float z = sqrt(max(0.0, 0.13 - dot(c, c)));
  return 0.5 + 0.5 * dot(normalize(vec3(c, z + 1e-4)), normalize(vec3(-0.45, 0.55, 0.7)));
}
vec3 jjkCel3(float v, float t1, float t2, vec3 dark, vec3 mid, vec3 lit) {
  return mix(mix(dark, mid, jjkAA(v, t1)), lit, jjkAA(v, t2));
}

// Ethereal black-blue. White dots. No purple hall.
vec3 jjkSpace(vec2 p, float t) {
  float lift = 0.04 + 0.06 * smoothstep(0.15, 0.85, p.y);
  vec3 c = mix(JJK_DEEP, JJK_VOID, lift);
  float cell = jjkH21(floor(p * vec2(140.0, 80.0)));
  float star = step(0.993, cell);
  float big = step(0.9982, cell);
  c = mix(c, JJK_PATCH, star);
  c = mix(c, JJK_GLASS, big);
  return c;
}

// Distant galaxy: one soft spiral disc, hue 256.
float jjkGalaxy(vec2 p, vec2 c, float s) {
  vec2 q = (p - c) / max(s, 1e-4);
  float r = length(q);
  float a = atan(q.y, q.x);
  float arm = 0.5 + 0.5 * sin(a * 2.0 + r * 9.0);
  return exp(-r * r * 6.0) * mix(0.25, 1.0, arm);
}

// White information frames recede toward the eye. Hollow cards, not stickers.
float jjkPatch(vec2 p, vec2 c, vec2 rad) {
  vec2 q = abs(p - c) / max(rad, vec2(1e-4));
  return jjkFill(max(q.x, q.y) - 1.0);
}
float jjkFrame(vec2 p, vec2 c, vec2 rad) {
  float box = max(abs((p - c) / max(rad, vec2(1e-4))).x, abs((p - c) / max(rad, vec2(1e-4))).y) - 1.0;
  float fill = jjkFill(box) * (1.0 - jjkFill(box + 0.22));
  return max(jjkLine(box, 1.8), fill * 0.35);
}
float jjkPatches(vec2 p, float t) {
  float m = 0.0;
  m = max(m, jjkFrame(p, mix(vec2(1.12, 0.82), JJK_EYE, 0.04), vec2(0.12, 0.16)));
  m = max(m, jjkFrame(p, mix(vec2(1.06, 0.58), JJK_EYE, 0.16), vec2(0.09, 0.12)));
  m = max(m, jjkFrame(p, mix(vec2(1.14, 0.16), JJK_EYE, 0.26), vec2(0.08, 0.11)));
  m = max(m, jjkFrame(p, mix(vec2(0.06, 0.88), JJK_EYE, 0.18), vec2(0.09, 0.12)));
  m = max(m, jjkFrame(p, mix(vec2(0.98, 0.92), JJK_EYE, 0.40), vec2(0.06, 0.08)));
  m = max(m, jjkFrame(p, mix(vec2(0.90, 0.68), JJK_EYE, 0.58), vec2(0.045, 0.055)));
  m = max(m, jjkFrame(p, mix(vec2(0.68, 0.80), JJK_EYE, 0.78), vec2(0.028, 0.036)));
  return m;
}

// Black hole. Thin white accretion. Core ≥ 40% of frame. No purple.
float jjkEyeD(vec2 p) {
  vec2 q = (p - JJK_EYE) / vec2(0.56, 0.66);
  return length(q) - 1.0;
}
vec3 jjkEye(vec2 p, float t) {
  float d = jjkEyeD(p);
  float r = length((p - JJK_EYE) / vec2(0.56, 0.66));
  float well = jjkFill(d);
  vec3 c = mix(JJK_VOID, JJK_DEEP, smoothstep(0.15, 0.92, r));
  c = mix(c, JJK_INK, jjkFill(r - 0.20) * well);
  float photon = jjkLine(r - 0.60, 4.4) + jjkLine(r - 0.78, 2.2);
  c = mix(c, JJK_GLASS, photon * well * 0.95);
  c = mix(c, JJK_CYAN * 0.62, jjkLine(r - 0.60, 1.5) * well * 0.55);
  c = mix(c, JJK_DEEP, jjkFill(r - 0.16) * well);
  return jjkOut(c);
}

// Set: ethereal blue-black + white dots + black hole. Frames stay faint glass.
vec3 jjkDomain(vec2 p, float t) {
  vec3 c = jjkSpace(p, t);
  c = mix(c, JJK_VOID * 1.4, jjkGalaxy(p, vec2(0.10, 0.86), 0.12) * 0.35);
  c = mix(c, JJK_CYAN * 0.25, jjkGalaxy(p, vec2(1.24, 0.14), 0.09) * 0.30);
  c = mix(c, jjkEye(p, t), jjkFill(jjkEyeD(p)));
  c = mix(c, JJK_GLASS, jjkPatches(p, t) * 0.72);
  return jjkOut(c);
}

// Infinity halt: particles stop at a sphere. Not a Fresnel wash.
float jjkHalt(vec2 p, vec2 c, float rad) {
  float r = length(p - c);
  return jjkLine(r - rad, 2.2) + jjkLine(r - rad * 0.72, 1.2) * 0.45;
}
vec3 jjkAura(vec3 col, vec2 p, float t, vec2 c) {
  float r = length(p - c);
  float rad = 0.26;
  float shell = jjkHalt(p, c, rad);
  float outside = 1.0 - jjkFill(r - rad);
  float dust = step(0.88, jjkH21(floor(p * 56.0 + jjkHold(t, 12.0) * 2.0))) * outside * jjkFill(r - 0.40);
  vec3 glow = mix(JJK_BLUE, JJK_CYAN, 0.55);
  col = mix(col, glow, shell * 0.70);
  col = mix(col, glow, dust * 0.55);
  return jjkOut(col);
}

vec3 jjkBlue(vec2 p, vec2 c) {
  float r = length(p - c);
  vec3 col = mix(JJK_DEEP, JJK_BLUE, jjkFill(r - 0.07));
  col = mix(col, JJK_CYAN, exp(-r * r * 70.0) * 0.65);
  return jjkOut(col);
}
vec3 jjkRed(vec2 p, vec2 c) {
  float r = length(p - c);
  vec3 col = mix(JJK_DEEP, JJK_RED, jjkFill(r - 0.07));
  col = mix(col, JJK_FLARE, exp(-r * r * 70.0) * 0.65);
  return jjkOut(col);
}
vec3 jjkPurple(vec2 p, float t, vec2 c) {
  vec2 q = p - c;
  float ndv = clamp(1.0 - length(q) * 2.6, 0.0, 1.0);
  float band = floor(ndv * 4.0) / 4.0;
  vec3 col = band < 0.25 ? JJK_PURPLE * 0.45 : (band < 0.50 ? JJK_PURPLE : (band < 0.75 ? JJK_VIOLET : JJK_FLARE));
  float ang = atan(q.y, q.x);
  float swirl = sin(4.0 * ang + 16.0 * (1.0 - ndv) - 5.0 * t);
  col = mix(col, JJK_INK, jjkAA(swirl, 0.55) * 0.32);
  return jjkOut(mix(JJK_DEEP, col, jjkAA(ndv, 0.04)));
}

// Six Eyes: luminous cyan, glass spark, still a seal oval. Beautiful, not a tick.
vec3 jjkSixOne(vec3 col, vec2 p, vec2 c) {
  float e = length((p - c) / vec2(0.048, 0.028)) - 1.0;
  float iris = length((p - c) / vec2(0.028, 0.018)) - 1.0;
  float pupil = length((p - (c + vec2(0.005, 0.002))) / vec2(0.012, 0.010)) - 1.0;
  float spark = length((p - (c + vec2(-0.012, 0.010))) / vec2(0.010, 0.007)) - 1.0;
  float halo = exp(-dot((p - c) / vec2(0.070, 0.045), (p - c) / vec2(0.070, 0.045)) * 2.8);
  col = mix(col, JJK_CYAN, halo * 0.40);
  col = mix(col, vec3(0.10, 0.16, 0.22), jjkFill(e));
  col = mix(col, JJK_CYAN, jjkFill(iris));
  col = mix(col, mix(JJK_CYAN, JJK_GLASS, 0.45), jjkFill(iris + 0.20) * 0.60);
  col = mix(col, JJK_DEEP, jjkFill(pupil));
  col = mix(col, JJK_GLASS, jjkFill(spark));
  col = mix(col, JJK_INK, jjkLine(e, 1.3) * 0.65);
  return col;
}
vec3 jjkSix(vec3 col, vec2 p, vec2 a, vec2 b) {
  return jjkOut(jjkSixOne(jjkSixOne(col, p, a), p, b));
}

// Gojo domain mudra: two flippers meet at the chest, diamond gap.
vec3 jjkSignGojo(vec3 col, vec2 p) {
  vec2 chest = JJK_C + vec2(0.0, -0.04);
  vec2 L = chest + vec2(-0.045, 0.0);
  vec2 R = chest + vec2(0.045, 0.0);
  float fl = length((p - L) / vec2(0.055, 0.028)) - 1.0;
  float fr = length((p - R) / vec2(0.055, 0.028)) - 1.0;
  float pads = max(jjkFill(fl), jjkFill(fr));
  float gap = jjkFill(length((p - chest) / vec2(0.018, 0.022)) - 1.0);
  col = mix(col, JJK_SKIN_M, pads * jjkCover(p));
  col = mix(col, JJK_CYAN * 0.45, gap * pads);
  col = mix(col, JJK_INK, (jjkLine(fl, 1.3) + jjkLine(fr, 1.3)) * 0.55);
  return jjkOut(col);
}

// Mura belly clap: flippers slap the belly on the hold.
vec3 jjkSignClap(vec3 col, vec2 p, float t) {
  float ht = jjkHold(t, 8.0);
  float slap = abs(fract(ht * 2.0) * 2.0 - 1.0);
  vec2 belly = JJK_C + vec2(0.0, -0.06);
  vec2 L = belly + vec2(-0.05 - 0.02 * slap, 0.0);
  vec2 R = belly + vec2(0.05 + 0.02 * slap, 0.0);
  float fl = length((p - L) / vec2(0.05, 0.026)) - 1.0;
  float fr = length((p - R) / vec2(0.05, 0.026)) - 1.0;
  col = mix(col, JJK_SKIN_L, max(jjkFill(fl), jjkFill(fr)) * jjkCover(p));
  return jjkOut(col);
}

vec3 jjkCloth(float h) {
  vec3 c = jjkCel3(h, 0.28, 0.64, JJK_CLOTH * 0.7, JJK_CLOTH, vec3(0.290, 0.322, 0.400));
  return mix(c, JJK_CYAN, jjkAA(1.0 - h, 0.74) * 0.40);
}
vec3 jjkSkin(float h) {
  return jjkCel3(h, 0.44, 0.78, JJK_SKIN_D, JJK_SKIN_M, JJK_SKIN_L);
}

// Exterior barrier: dark sphere. Interior is jjkDomain.
float jjkBarrierD(vec2 p) {
  return length((p - vec2(0.50, 0.48)) / vec2(0.62, 0.70)) - 1.0;
}
vec3 jjkFloor(vec2 p) {
  vec2 foot = vec2(JJK_C.x, JJK_C.y - 0.16);
  float disc = jjkFill(length((p - foot) / vec2(0.12, 0.04)) - 1.0);
  vec3 c = mix(JJK_VOID, JJK_CYAN * 0.18, disc * 0.55);
  c = mix(c, JJK_GLASS, jjkLine(length((p - foot) / vec2(0.12, 0.04)) - 1.0, 1.8) * 0.65);
  return jjkOut(c);
}
vec3 jjkWorm(vec2 p, float t) {
  vec2 q = p - vec2(0.50, 0.50);
  float rr = length(q) * 8.0 - t * 2.2;
  float f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
  return jjkOut(mix(JJK_DEEP, JJK_GLASS, smoothstep(0.0, w * 1.2, f)));
}

// Hero pear on the set. Call after jjkDomain. Cover-gated so the eye stays back.
vec3 jjkHeroOn(vec3 col, vec2 p, float t) {
  vec2 q = jjkN(p);
  float cover = jjkCover(p);
  float ndl = jjkNdL(p);
  float head = jjkAA(q.y, 0.00);
  col = mix(col, jjkFloor(p), jjkFill(length((p - vec2(JJK_C.x, JJK_C.y - 0.16)) / vec2(0.12, 0.04)) - 1.0) * (1.0 - cover));
  col = mix(col, jjkCloth(ndl), cover);
  col = mix(col, jjkSkin(ndl), cover * head);
  float hair = cover * jjkAA(q.y, 0.06);
  float spike = jjkLine(q.x + 0.10, 1.3) + jjkLine(q.x, 1.3) + jjkLine(q.x - 0.10, 1.3);
  col = mix(col, vec3(0.88, 0.90, 0.93), hair * 0.88);
  col = mix(col, vec3(0.90, 0.92, 0.95), hair * clamp(spike, 0.0, 1.0) * 0.55);
  float collar = cover * jjkAA(0.06 - q.y, 0.0) * jjkAA(q.y + 0.16, 0.0);
  col = mix(col, mix(JJK_CLOTH * 0.40, JJK_INK, 0.55), collar);
  col = mix(col, JJK_INK, collar * jjkLine(q.y - 0.01, 1.5) * 0.75);
  col = jjkSix(col, p, JJK_C + vec2(-0.055, 0.035), JJK_C + vec2(0.055, 0.035));
  col = mix(col, JJK_INK, jjkLine(length(q) - sqrt(0.13), 2.0));
  col = jjkSignGojo(col, p);
  return jjkAura(jjkOut(col), p, t, JJK_C);
}
vec3 jjkHero(vec2 p, float t) { return jjkHeroOn(jjkDomain(p, t), p, t); }

// Kill sits LEFT of the hero so the pear stays. Blue and Red still parent the collide.
vec3 jjkKillOn(vec3 col, vec2 p, float t) {
  vec2 mid = vec2(0.22, 0.24);
  vec2 bl = mid + vec2(-0.058, 0.014);
  vec2 rd = mid + vec2(0.058, -0.014);
  float keep = 1.0 - jjkCover(p);
  col = mix(col, jjkBlue(p, bl), jjkFill(length(p - bl) - 0.050) * keep);
  col = mix(col, jjkRed(p, rd), jjkFill(length(p - rd) - 0.050) * keep);
  float pinch = jjkFill(length((p - mid) / vec2(0.038, 0.032)) - 1.0) * keep;
  col = mix(col, jjkPurple(p, t, mid), pinch * 0.82);
  col = mix(col, JJK_FLARE, jjkLine(length(p - mid) - 0.018, 1.6) * pinch * 0.55);
  return jjkOut(col);
}
vec3 jjkKill(vec2 p, float t) { return jjkKillOn(jjkHero(p, t), p, t); }

// beat 0 flood, 1 domain+hero, 2 kill. Timed stitch uses hold(t)/8.2.
vec3 jjkStitch(vec2 p, float t, float beat) {
  vec3 c = jjkDomain(p, t);
  if (beat < 0.5) return jjkOut(c);
  c = jjkHeroOn(c, p, t);
  if (beat < 1.5) return c;
  return jjkKillOn(c, p, t);
}
vec3 jjkStitchTimed(vec2 p, float t) {
  float ht = jjkHold(t, 12.0);
  float beat = ht < 3.0 ? 0.0 : (ht < 6.4 ? 1.0 : 2.0);
  return jjkStitch(p, t, beat);
}
#endif
`;

export const jjkKit = {
  name: "jjkKit",
  family: "jjk",
  doc: "Limitless grammar: black-blue void, black hole, white dots, Six Eyes, Gojo sign, Blue/Red/Purple kill",
  deps: [],
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return jjkStitchTimed(p, t); }`,
};
