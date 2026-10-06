// Family 7 — starburst 4/6/8/12 + impact rings + ripples (20).
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo, extra) => defineModule({ name, doc, glsl, demo, ...extra });

export const IMPACT = [
  D("starBurst4", "4-point starburst: polar radius vs a 4-lobe star SDF, fwidth fill",
    /* glsl */ `
  vec3 starBurst4(vec2 p, vec3 plate, vec3 ink, vec2 c, float r) {
    float d = ocStarN(p - c, 4.0, r, 0.18);
    return mix(plate, ink, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurst4(p, ocPlate(p, t), vec3(0.90, 0.82, 0.38), vec2(0.72, 0.45), 0.28 + 0.06 * sin(t * 6.0))); }`),

  D("starBurst6", "6-point starburst: hex star, different inner ratio from the 4-point",
    /* glsl */ `
  vec3 starBurst6(vec2 p, vec3 plate, vec3 ink, vec2 c, float r) {
    float d = ocStarN(p - c, 6.0, r, 0.32);
    return mix(plate, ink, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurst6(p, ocPlate(p, t), vec3(0.88, 0.72, 0.28), vec2(0.72, 0.45), 0.26)); }`),

  D("starBurst8", "8-point starburst: octogram, tighter waist than 6",
    /* glsl */ `
  vec3 starBurst8(vec2 p, vec3 plate, vec3 ink, vec2 c, float r) {
    float d = ocStarN(p - c, 8.0, r, 0.22);
    return mix(plate, ink, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurst8(p, ocPlate(p, t), vec3(0.92, 0.86, 0.42), vec2(0.72, 0.45), 0.30)); }`),

  D("starBurst12", "12-point starburst: clock-like burst, thin rays",
    /* glsl */ `
  vec3 starBurst12(vec2 p, vec3 plate, vec3 ink, vec2 c, float r) {
    float d = ocStarN(p - c, 12.0, r, 0.14);
    return mix(plate, ink, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurst12(p, ocPlate(p, t), vec3(0.90, 0.78, 0.30), vec2(0.72, 0.45), 0.32)); }`),

  D("impactRing", "expanding impact ring: gaussian annulus |r-R|, additive, width from fwidth",
    /* glsl */ `
  vec3 impactRing(vec2 p, vec3 plate, vec3 glow, vec2 c, float R, float w) {
    float r = length(p - c);
    float band = exp(-pow((r - R) / max(w, 1e-4), 2.0));
    float aa = ocStroke(r - R, 1.8);
    return ocCap(plate + glow * max(band, aa * 0.6));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return impactRing(p, ocPlate(p, t), vec3(0.92, 0.78, 0.32), vec2(0.72, 0.45), fract(t * 0.6) * 0.7, 0.04); }`),

  D("shockRipple", "shockwave UV ripple: uv += n * A * exp(-((r-R)/w)^2), samples a source plate",
    /* glsl */ `
  vec2 shockRippleUv(vec2 uv, vec2 c, float R, float amp, float w) {
    vec2 asp = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    vec2 d = (uv - c) * asp;
    float r = length(d);
    return uv - normalize(d + 1e-6) / asp * amp * exp(-pow((r - R) / max(w, 1e-4), 2.0));
  }
  vec3 shockRipple(sampler2D src, vec2 uv, vec2 c, float R, float amp) {
    vec2 u2 = shockRippleUv(uv, c, R, amp, 0.045);
    return ocCap(texture2D(src, clamp(u2, 0.0, 1.0)).rgb);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { vec2 uv = vec2(p.x / 1.44, p.y); return shockRipple(tSrc, uv, vec2(0.5, 0.45), fract(t * 0.5), 0.035); }`,
    { demoTex: true }),

  D("starBurstCross", "cross burst: plus-sign arms (axis-aligned), not a polar star",
    /* glsl */ `
  vec3 starBurstCross(vec2 p, vec3 plate, vec3 ink, vec2 c, float arm, float w) {
    vec2 q = p - c;
    float d = min(ocBox(q, vec2(0.0), vec2(arm, w)), ocBox(q, vec2(0.0), vec2(w, arm)));
    return mix(plate, ink, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurstCross(p, ocPlate(p, t), vec3(0.90, 0.84, 0.40), vec2(0.72, 0.45), 0.38, 0.035)); }`),

  D("starBurstAsterisk", "asterisk burst: cross plus diagonals, 8 boxes, distinct from polar starBurst8",
    /* glsl */ `
  vec3 starBurstAsterisk(vec2 p, vec3 plate, vec3 ink, vec2 c, float arm, float w) {
    vec2 q = p - c;
    vec2 r = vec2(q.x + q.y, q.y - q.x) * 0.7071;
    float d = min(min(ocBox(q, vec2(0.0), vec2(arm, w)), ocBox(q, vec2(0.0), vec2(w, arm))),
                  min(ocBox(r, vec2(0.0), vec2(arm, w)), ocBox(r, vec2(0.0), vec2(w, arm))));
    return mix(plate, ink, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurstAsterisk(p, ocPlate(p, t), vec3(0.88, 0.80, 0.36), vec2(0.72, 0.45), 0.34, 0.028)); }`),

  D("ringDouble", "double impact ring: two annuli at R and R*1.35, different widths",
    /* glsl */ `
  vec3 ringDouble(vec2 p, vec3 plate, vec3 glow, vec2 c, float R) {
    float r = length(p - c);
    float a = exp(-pow((r - R) / 0.03, 2.0));
    float b = exp(-pow((r - R * 1.35) / 0.05, 2.0)) * 0.65;
    return ocCap(plate + glow * (a + b));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ringDouble(p, ocPlate(p, t), vec3(0.90, 0.70, 0.28), vec2(0.72, 0.45), 0.18 + 0.12 * fract(t * 0.4)); }`),

  D("ringExpandSoft", "soft expanding ring: wider gaussian, no hard stroke, fades with R",
    /* glsl */ `
  vec3 ringExpandSoft(vec2 p, vec3 plate, vec3 glow, vec2 c, float R) {
    float r = length(p - c);
    float band = exp(-pow((r - R) / 0.10, 2.0)) * (1.0 - R);
    return ocCap(plate + glow * band * 0.8);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ringExpandSoft(p, ocPlate(p, t), vec3(0.86, 0.52, 0.78), vec2(0.72, 0.45), fract(t * 0.35)); }`),

  D("rippleMulti", "multi-ripple: three concentric gaussians at R, R-0.12, R-0.24",
    /* glsl */ `
  vec3 rippleMulti(vec2 p, vec3 plate, vec3 glow, vec2 c, float R) {
    float r = length(p - c), acc = 0.0;
    for (int i = 0; i < 3; i++) {
      float Ri = R - float(i) * 0.12;
      acc += exp(-pow((r - Ri) / 0.028, 2.0)) * (1.0 - float(i) * 0.28);
    }
    return ocCap(plate + glow * acc);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return rippleMulti(p, ocPlate(p, t), vec3(0.72, 0.84, 0.90), vec2(0.72, 0.45), fract(t * 0.45) * 0.7); }`),

  D("starBurstAnamorphic", "anamorphic burst: wide horizontal streak + short vertical spike + core",
    /* glsl */ `
  vec3 starBurstAnamorphic(vec2 p, vec3 plate, vec3 glow, vec2 c) {
    vec2 q = p - c;
    float h = exp(-abs(q.y) * 80.0) * exp(-abs(q.x) * 4.0);
    float v = exp(-abs(q.x) * 90.0) * exp(-abs(q.y) * 12.0);
    float core = exp(-dot(q, q) * 90.0);
    return ocCap(plate + glow * (h * 1.4 + v * 0.8 + core * 2.2) * 0.45);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return starBurstAnamorphic(p, ocPlate(p, t), vec3(0.92, 0.80, 0.88), vec2(0.72, 0.45)); }`),

  D("impactFlashDisc", "impact flash disc: solid AA disc that blooms-cap, the hit's first frame",
    /* glsl */ `
  vec3 impactFlashDisc(vec2 p, vec3 plate, vec3 flash, vec2 c, float r) {
    return mix(plate, ocCap(flash), ocAA(length(p - c) - r));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return impactFlashDisc(p, ocPlate(p, t), vec3(0.90, 0.86, 0.62), vec2(0.72, 0.45), 0.16 + 0.08 * abs(sin(t * 4.0))); }`),

  D("ringStack", "stacked rings: 5 discrete AA annuli, comic impact, not gaussian",
    /* glsl */ `
  vec3 ringStack(vec2 p, vec3 plate, vec3 ink, vec2 c, float r0) {
    float r = length(p - c), m = 0.0;
    for (int i = 0; i < 5; i++) {
      float Ri = r0 + float(i) * 0.055;
      m = max(m, ocStroke(r - Ri, 1.3));
    }
    return mix(plate, ink, m);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(ringStack(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), vec2(0.72, 0.45), 0.12)); }`),

  D("rippleSpiral", "spiral ripple: r - a*theta band, a spinning shock, fwidth",
    /* glsl */ `
  vec3 rippleSpiral(vec2 p, vec3 plate, vec3 glow, vec2 c, float twist) {
    vec2 q = p - c;
    float a = atan(q.y, q.x);
    float d = length(q) - 0.08 * (a + 3.14159 + twist);
    float band = ocStroke(d, 1.8);
    return ocCap(plate + glow * band);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return rippleSpiral(p, ocPlate(p, t), vec3(0.86, 0.62, 0.28), vec2(0.72, 0.45), t); }`),

  D("starBurstTaper", "tapered ray burst: N hashed polar spikes with (1-u)^2 falloff, fwidth width",
    /* glsl */ `
  vec3 starBurstTaper(vec2 p, vec3 plate, vec3 glow, vec2 c, float n, float seed) {
    vec2 q = p - c;
    float a = atan(q.y, q.x) / 6.2831853 + 0.5;
    float cell = floor(a * n), f = abs(fract(a * n) - 0.5) * 2.0;
    float h = ocHash(vec2(cell, seed));
    float w = 0.04 + 0.14 * h;
    float line = ocAA(f - w);
    float tp = pow(1.0 - clamp(length(q) / (0.2 + 0.55 * h), 0.0, 1.0), 2.0);
    return ocCap(plate + glow * line * tp * step(0.28, h));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return starBurstTaper(p, ocPlate(p, t), vec3(0.92, 0.84, 0.40), vec2(0.72, 0.45), 24.0, 3.0); }`),

  D("impactAnnuliPulse", "pulsing annuli: ring radius is a sin of time, two phases, additive",
    /* glsl */ `
  vec3 impactAnnuliPulse(vec2 p, vec3 plate, vec3 a, vec3 b, vec2 c, float t) {
    float r = length(p - c);
    float A = exp(-pow((r - (0.16 + 0.10 * sin(t * 6.0))) / 0.03, 2.0));
    float B = exp(-pow((r - (0.28 + 0.10 * sin(t * 6.0 + 1.7))) / 0.04, 2.0));
    return ocCap(plate + a * A + b * B * 0.7);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return impactAnnuliPulse(p, ocPlate(p, t), vec3(0.92, 0.70, 0.24), vec3(0.72, 0.32, 0.82), vec2(0.72, 0.45), t); }`),

  D("starBurstHollow", "hollow star: AA shell of a star (stroke only), interior is plate",
    /* glsl */ `
  vec3 starBurstHollow(vec2 p, vec3 plate, vec3 ink, vec2 c, float n, float r) {
    float d = ocStarN(p - c, n, r, 0.28);
    return mix(plate, ink, ocStroke(d, 2.2));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurstHollow(p, ocPlate(p, t), vec3(0.90, 0.80, 0.34), vec2(0.72, 0.45), 5.0, 0.30)); }`),

  D("rippleCaustic", "caustic ripple: warped concentric rings via value-noise phase, not a clean shock",
    /* glsl */ `
  vec3 rippleCaustic(vec2 p, vec3 plate, vec3 glow, vec2 c) {
    vec2 q = p - c;
    float r = length(q) + (ocVnoise(q * 6.0) - 0.5) * 0.12;
    float band = ocStroke(sin(r * 28.0), 1.4) * exp(-r * 2.2);
    return ocCap(plate + glow * band * 0.7);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return rippleCaustic(p, ocPlate(p, t), vec3(0.62, 0.84, 0.90), vec2(0.72, 0.45)); }`),

  D("starBurstSpark", "spark burst: hashed cells near a point become tiny AA diamonds",
    /* glsl */ `
  vec3 starBurstSpark(vec2 p, vec3 plate, vec3 spark, vec2 c, float seed) {
    vec2 g = (p - c) * 14.0, id = floor(g), f = fract(g) - 0.5;
    float h = ocHash(id + seed);
    vec2 off = (vec2(ocHash(id + 2.2), ocHash(id + 8.8)) - 0.5) * 0.5;
    float on = step(0.78, h) * step(length((id + 0.5) / 14.0), 0.42);
    float d = abs(f.x - off.x) + abs(f.y - off.y) - (0.08 + 0.10 * h);
    return mix(plate, spark, ocAA(d) * on);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(starBurstSpark(p, ocPlate(p, t), vec3(0.92, 0.86, 0.48), vec2(0.72, 0.45), 5.0)); }`),
];
