// Family 6 — poster tear / rip / underlayer / wedge (15).
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo) => defineModule({ name, doc, glsl, demo });

export const TEAR = [
  D("posterTear", "poster tear: torn-edge SDF (sine + noise) revealing an under-layer colour",
    /* glsl */ `
  vec3 posterTear(vec2 p, vec3 plate, vec3 under, float x0) {
    float n = (ocVnoise(vec2(p.y * 14.0, 3.0)) - 0.5) * 0.10 + 0.03 * sin(p.y * 28.0);
    float d = p.x - x0 - n;
    float edge = ocStroke(d, 1.6);
    vec3 col = mix(under, plate, ocAA(d));
    return mix(col, vec3(0.14, 0.09, 0.10), edge * 0.7);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(posterTear(p, ocPlate(p, t), vec3(0.72, 0.18, 0.22), 0.70 + 0.12 * sin(t))); }`),

  D("tornEdgeSdf", "torn-edge SDF only: a 1-px ink of the rip, plate otherwise",
    /* glsl */ `
  vec3 tornEdgeSdf(vec2 p, vec3 plate, vec3 ink, float x0) {
    float n = (ocVnoise(p * vec2(2.0, 18.0)) - 0.5) * 0.12;
    float d = p.x - x0 - n;
    return mix(plate, ink, ocStroke(d, 2.0));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(tornEdgeSdf(p, ocPlate(p, t), vec3(0.12, 0.08, 0.10), 0.72)); }`),

  D("underlayerPeek", "under-layer peek: a noisy blob hole showing a second colour, AA",
    /* glsl */ `
  vec3 underlayerPeek(vec2 p, vec3 plate, vec3 under, vec2 c, vec2 rad) {
    float n = (ocVnoise(p * 9.0) - 0.5) * 0.16;
    float d = ocEllipse(p, c, rad) + n;
    return mix(under, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(underlayerPeek(p, ocPlate(p, t), vec3(0.22, 0.48, 0.62), vec2(0.70, 0.42), vec2(0.24, 0.18))); }`),

  D("ripJagged", "jagged rip: domain-warped vertical cut, high-frequency saw, underlayer",
    /* glsl */ `
  vec3 ripJagged(vec2 p, vec3 plate, vec3 under, float x0) {
    float n = ocVnoise(vec2(p.y * 22.0, 1.0)) * 0.14 + ocVnoise(vec2(p.y * 70.0, 8.0)) * 0.04;
    n = n - 0.09;
    float d = p.x - x0 - n;
    return mix(under, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(ripJagged(p, ocPlate(p, t), vec3(0.80, 0.62, 0.22), 0.68)); }`),

  D("tearPerforation", "perforation tear: dashed holes along a line, then a peel past the dots",
    /* glsl */ `
  vec3 tearPerforation(vec2 p, vec3 plate, vec3 under, float x0) {
    float d = p.x - x0;
    float dash = ocAA(length(vec2(d, fract(p.y * 28.0) - 0.5) * vec2(1.0, 0.035)) - 0.012);
    vec3 col = mix(under, plate, ocAA(d + 0.02));
    return mix(col, vec3(0.12, 0.08, 0.10), dash);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(tearPerforation(p, ocPlate(p, t), vec3(0.58, 0.22, 0.42), 0.72)); }`),

  D("peelCorner", "corner peel: a quadratic fold from a screen corner, underlayer + fold shade",
    /* glsl */ `
  vec3 peelCorner(vec2 p, vec3 plate, vec3 under, float k) {
    vec2 n = ocUV();
    float d = (n.x + n.y) - k;
    float fold = ocStroke(d, 2.4);
    vec3 col = mix(under, plate, ocAA(d));
    col = mix(col, col * vec3(0.55, 0.48, 0.40), ocAA(0.06 - abs(d)) * 0.5);
    return mix(col, vec3(0.78, 0.70, 0.52), fold * 0.35);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(peelCorner(p, ocPlate(p, t), vec3(0.28, 0.16, 0.22), 0.55 + 0.2 * sin(t))); }`),

  D("paperFiberRip", "paper-fiber rip: stretched noise along the tear, fibrous edge, underlayer",
    /* glsl */ `
  vec3 paperFiberRip(vec2 p, vec3 plate, vec3 under, float x0) {
    float fib = ocVnoise(vec2(p.x * 4.0, p.y * 40.0));
    float d = p.x - x0 - (fib - 0.5) * 0.18;
    float fringe = ocAA(0.03 - abs(d)) * fib;
    vec3 col = mix(under, plate, ocAA(d));
    return mix(col, vec3(0.80, 0.74, 0.62), fringe * 0.65);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(paperFiberRip(p, ocPlate(p, t), vec3(0.18, 0.22, 0.38), 0.70)); }`),

  D("underColorSlash", "slash peek: a diagonal band of under-colour, AA sides, no torn noise",
    /* glsl */ `
  vec3 underColorSlash(vec2 p, vec3 plate, vec3 under, float mid, float w) {
    float d = abs((p.x - p.y) * 0.7071 - mid) - w;
    return mix(plate, under, ocAA(-d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(underColorSlash(p, ocPlate(p, t), vec3(0.86, 0.22, 0.28), 0.15, 0.08)); }`),

  D("zipTear", "zip tear: a travelling head plus a finished cut behind it, hashed teeth",
    /* glsl */ `
  vec3 zipTear(vec2 p, vec3 plate, vec3 under, float head) {
    float n = (ocVnoise(vec2(p.y * 30.0, 2.0)) - 0.5) * 0.05;
    float d = p.x - 0.72 - n;
    float opened = step(p.y, head);
    float tooth = step(0.55, fract(p.y * 40.0));
    vec3 col = mix(plate, under, ocAA(d) * opened);
    return mix(col, vec3(0.12, 0.08, 0.10), ocStroke(d, 1.4) * opened * tooth);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(zipTear(p, ocPlate(p, t), vec3(0.42, 0.16, 0.22), fract(t * 0.25))); }`),

  D("wedgeTear", "wedge tear: a triangular bite from the edge revealing under-colour",
    /* glsl */ `
  vec3 wedgeTear(vec2 p, vec3 plate, vec3 under, vec2 tip, float open) {
    vec2 q = p - tip;
    float a = abs(atan(q.y, q.x));
    float d = max(a - open, -q.x);
    return mix(under, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(wedgeTear(p, ocPlate(p, t), vec3(0.70, 0.18, 0.24), vec2(0.20, 0.50), 0.35)); }`),

  D("doubleRip", "two parallel rips: a torn strip of under-colour between two noisy edges",
    /* glsl */ `
  vec3 doubleRip(vec2 p, vec3 plate, vec3 under, float x0, float w) {
    float n = (ocVnoise(vec2(p.y * 16.0, 4.0)) - 0.5) * 0.08;
    float d = abs(p.x - x0 - n) - w;
    return mix(plate, under, ocAA(-d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(doubleRip(p, ocPlate(p, t), vec3(0.22, 0.16, 0.38), 0.72, 0.07)); }`),

  D("tornHole", "torn hole: a noisy disc punched through the poster, fibrous rim",
    /* glsl */ `
  vec3 tornHole(vec2 p, vec3 plate, vec3 under, vec2 c, float r) {
    float n = (ocVnoise(p * 12.0) - 0.5) * 0.12;
    float d = length(p - c) - r - n;
    float rim = ocStroke(d, 2.0);
    vec3 col = mix(under, plate, ocAA(d));
    return mix(col, vec3(0.14, 0.09, 0.10), rim * 0.75);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(tornHole(p, ocPlate(p, t), vec3(0.16, 0.28, 0.42), vec2(0.72, 0.45), 0.18)); }`),

  D("serratedTear", "serrated tear: triangle-wave edge (not noise), underlayer, AA",
    /* glsl */ `
  vec3 serratedTear(vec2 p, vec3 plate, vec3 under, float x0, float teeth) {
    float saw = abs(fract(p.y * teeth) - 0.5) * 0.16;
    float d = p.x - x0 - saw;
    return mix(under, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(serratedTear(p, ocPlate(p, t), vec3(0.82, 0.32, 0.18), 0.68, 14.0)); }`),

  D("underlayerBleed", "under-layer bleed: torn edge plus a multiply stain leaking toward the plate",
    /* glsl */ `
  vec3 underlayerBleed(vec2 p, vec3 plate, vec3 under, float x0) {
    float n = (ocVnoise(vec2(p.y * 12.0, 5.0)) - 0.5) * 0.10;
    float d = p.x - x0 - n;
    float bleed = ocAA(0.18 - (d - 0.02)) * (1.0 - ocAA(-d));
    vec3 col = mix(under, plate, ocAA(d));
    return mix(col, col * under, bleed * 0.55);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(underlayerBleed(p, ocPlate(p, t), vec3(0.72, 0.14, 0.22), 0.70)); }`),

  D("foldTear", "fold tear: a crease line plus a lifted flap (skewed half-plane), shade in the fold",
    /* glsl */ `
  vec3 foldTear(vec2 p, vec3 plate, vec3 under, float x0) {
    float crease = p.x - x0;
    float flap = crease - 0.12 * (p.y - 0.5);
    vec3 col = mix(under, plate, ocAA(flap));
    col *= mix(vec3(1.0), vec3(0.48, 0.42, 0.36), ocAA(0.05 - abs(crease)) * 0.7);
    return mix(col, vec3(0.14, 0.10, 0.10), ocStroke(crease, 1.2) * 0.5);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(foldTear(p, ocPlate(p, t), vec3(0.32, 0.18, 0.42), 0.70)); }`),
];
