// Family 5 — clock / time-stop / polar ticks / shatter (15).
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo) => defineModule({ name, doc, glsl, demo });

export const TIMESTOP = [
  D("clockFaceTicks", "clock-face polar ticks: 12 hour ridges + 60 minute ticks, fwidth, screen polar",
    /* glsl */ `
  vec3 clockFaceTicks(vec2 p, vec3 face, vec3 ink, vec2 c, float R) {
    vec2 q = (p - c) / max(R, 1e-4);
    float r = length(q), a = atan(q.x, q.y);
    float hour = ocStroke(abs(sin(a * 6.0)) * r, 1.3) * step(0.78, r) * step(r, 0.96);
    float minute = ocStroke(abs(sin(a * 30.0)) * r * 0.45, 0.9) * step(0.88, r) * step(r, 0.96);
    vec3 col = mix(face, ink, max(hour, minute));
    float disc = ocAA(r - 1.05);
    return mix(OC_INK, col, disc);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(clockFaceTicks(p, vec3(0.90, 0.78, 0.22), vec3(0.10, 0.07, 0.12), vec2(0.72, 0.48), 0.38)); }`),

  D("clockHands", "tapered clock hands: SDF segments for minute/hour, AA, hub disc",
    /* glsl */ `
  float ocHand(vec2 q, float ang, float len, float w0, float w1) {
    vec2 d = vec2(sin(ang), cos(ang));
    float t = clamp(dot(q, d) / max(len, 1e-4), 0.0, 1.0);
    return length(q - d * len * t) - mix(w0, w1, t);
  }
  vec3 clockHands(vec2 p, vec3 face, vec3 ink, vec2 c, float R, float minA, float hourA) {
    vec2 q = (p - c) / max(R, 1e-4);
    float dm = ocHand(q, minA, 0.78, 0.03, 0.012), dh = ocHand(q, hourA, 0.50, 0.055, 0.02);
    float hub = length(q) - 0.06;
    float disc = ocAA(length(q) - 1.02);
    vec3 col = mix(face, ink, max(ocAA(min(dm, dh)), ocAA(hub)));
    return mix(OC_INK, col, disc);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(clockHands(p, vec3(0.88, 0.76, 0.24), vec3(0.10, 0.07, 0.12), vec2(0.72, 0.48), 0.36, t * 0.4, t * 0.03)); }`),

  D("polarHourMarks", "12 thick hour marks only: |sin(6a)| ridges, no minute ticks",
    /* glsl */ `
  vec3 polarHourMarks(vec2 p, vec3 plate, vec3 ink, vec2 c, float R) {
    vec2 q = (p - c) / max(R, 1e-4);
    float r = length(q), a = atan(q.x, q.y);
    float mark = ocStroke(abs(sin(a * 6.0)) * r, 2.0) * step(0.70, r) * step(r, 0.98);
    return mix(plate, ink, mark);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(polarHourMarks(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), vec2(0.72, 0.48), 0.40)); }`),

  D("polarMinuteRidge", "60 thin minute ridges: denser than hour marks, shorter radial span",
    /* glsl */ `
  vec3 polarMinuteRidge(vec2 p, vec3 plate, vec3 ink, vec2 c, float R) {
    vec2 q = (p - c) / max(R, 1e-4);
    float r = length(q), a = atan(q.x, q.y);
    float mark = ocStroke(abs(sin(a * 30.0)) * r * 0.5, 0.8) * step(0.86, r) * step(r, 0.98);
    return mix(plate, ink, mark);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(polarMinuteRidge(p, ocPlate(p, t), vec3(0.14, 0.09, 0.12), vec2(0.72, 0.48), 0.40)); }`),

  D("timeStopFlash", "time-stop flash: invert+tint hold, luma-capped, strength as a hard cut",
    /* glsl */ `
  vec3 timeStopFlash(vec3 plate, vec3 tint, float on) {
    vec3 inv = ocInvert(plate);
    vec3 washed = inv * mix(vec3(1.0), tint, 0.4);
    return mix(plate, ocCap(washed), step(0.5, on));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return timeStopFlash(ocPlate(p, t), vec3(0.86, 0.82, 0.98), step(0.0, sin(t * 2.2))); }`),

  D("shatterWedges", "shatter wedges: polar sectors offset by hash, inked cracks at sector edges",
    /* glsl */ `
  vec3 shatterWedges(vec2 p, vec3 plate, vec3 under, vec2 c, float n, float kick) {
    vec2 q = p - c;
    float a = atan(q.y, q.x) / 6.2831853 + 0.5;
    float cell = floor(a * n);
    float h = ocHash(vec2(cell, 3.1));
    vec2 off = (vec2(ocHash(vec2(cell, 1.2)), ocHash(vec2(cell, 7.7))) - 0.5) * kick;
    float seam = ocStroke(abs(fract(a * n) - 0.5) * 2.0 - 0.0, 1.4);
    vec3 shard = mix(under, plate, 0.35 + 0.65 * h);
    vec2 pq = q - off * step(0.4, h);
    float cover = ocAA(length(pq) - 0.62);
    return mix(mix(plate, shard, cover), vec3(0.12, 0.08, 0.14), seam * cover);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(shatterWedges(p, ocPlate(p, t), vec3(0.62, 0.22, 0.28), vec2(0.72, 0.45), 11.0, 0.08 + 0.04 * sin(t))); }`),

  D("clockBullseye", "bullseye rings: fract(4r) alternate bands on a disc, AA isolines",
    /* glsl */ `
  vec3 clockBullseye(vec2 p, vec3 face, vec3 ring, vec2 c, float R) {
    vec2 q = (p - c) / max(R, 1e-4);
    float r = length(q);
    float band = step(0.5, fract(r * 4.0)) * step(r, 0.96);
    float iso = ocStroke(fract(r * 4.0) - 0.5, 0.7);
    vec3 col = mix(face, ring, band * 0.55);
    col = mix(col, vec3(0.12, 0.08, 0.10), iso * 0.4);
    return mix(OC_INK, col, ocAA(r - 1.04));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(clockBullseye(p, vec3(0.90, 0.78, 0.22), vec3(0.86, 0.48, 0.16), vec2(0.72, 0.48), 0.38)); }`),

  D("tickSweep", "rotating highlight that sweeps clock ticks: a polar window, not a hand",
    /* glsl */ `
  vec3 tickSweep(vec2 p, vec3 plate, vec3 glow, vec2 c, float ang) {
    vec2 q = p - c;
    float a = atan(q.x, q.y);
    float d = abs(atan(sin(a - ang), cos(a - ang)));
    float wedge = ocAA(0.18 - d) * smoothstep(0.12, 0.45, length(q));
    return ocCap(plate + glow * wedge * 0.55);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return tickSweep(p, ocPlate(p, t), vec3(0.92, 0.82, 0.32), vec2(0.72, 0.48), t); }`),

  D("frozenSpray", "frozen spray: hashed beads around a rim, held (no fall), time-stop droplets",
    /* glsl */ `
  vec3 frozenSpray(vec2 p, vec3 plate, vec3 bead, vec2 c, float R, float seed) {
    vec2 q = (p - c) * 9.0;
    vec2 id = floor(q), f = fract(q) - 0.5;
    float h = ocHash(id + seed);
    vec2 off = (vec2(ocHash(id + 3.1), ocHash(id + 7.7)) - 0.5) * 0.45;
    float on = step(0.72, h) * step(abs(length((id + 0.5) / 9.0) - R), 0.08);
    float s = ocAA(length(f - off) - (0.10 + 0.12 * h));
    return mix(plate, bead, s * on);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(frozenSpray(p, ocPlate(p, t), vec3(0.78, 0.86, 0.92), vec2(0.72, 0.45), 0.34, 2.0)); }`),

  D("wedgeCrack", "single growing crack: a polar half-plane plus a noisy SDF cut, inked",
    /* glsl */ `
  vec3 wedgeCrack(vec2 p, vec3 plate, vec3 ink, vec2 c, float ang, float open) {
    vec2 q = p - c;
    float a = atan(q.y, q.x) - ang;
    float n = (ocVnoise(q * 8.0) - 0.5) * 0.08;
    float d = abs(a) - open - n;
    float crack = ocAA(0.04 - abs(d)) * smoothstep(0.02, 0.35, length(q));
    return mix(plate, ink, crack);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(wedgeCrack(p, ocPlate(p, t), vec3(0.12, 0.08, 0.14), vec2(0.72, 0.42), 0.4, 0.08 + 0.12 * abs(sin(t)))); }`),

  D("polarGrid", "polar grid: concentric rings + angular spokes, fwidth isolines",
    /* glsl */ `
  vec3 polarGrid(vec2 p, vec3 plate, vec3 ink, vec2 c, float rings, float spokes) {
    vec2 q = p - c;
    float r = length(q), a = atan(q.y, q.x) / 6.2831853 + 0.5;
    float isoR = ocStroke(fract(r * rings) - 0.5, 0.8);
    float isoA = ocStroke(fract(a * spokes) - 0.5, 0.8);
    return mix(plate, ink, max(isoR, isoA) * 0.7);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(polarGrid(p, ocPlate(p, t), vec3(0.14, 0.09, 0.16), vec2(0.72, 0.45), 6.0, 16.0)); }`),

  D("clockRimInk", "clock rim only: a thick AA annulus, no face, no hands",
    /* glsl */ `
  vec3 clockRimInk(vec2 p, vec3 plate, vec3 ink, vec2 c, float R) {
    float r = length(p - c) / max(R, 1e-4);
    float rim = ocStroke(r - 1.0, 2.8);
    return mix(plate, ink, rim);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(clockRimInk(p, ocPlate(p, t), vec3(0.12, 0.08, 0.12), vec2(0.72, 0.48), 0.36)); }`),

  D("shatterStar", "broken-glass star: radial fracture from a point, hashed spoke lengths, inked",
    /* glsl */ `
  vec3 shatterStar(vec2 p, vec3 plate, vec3 ink, vec2 c, float n) {
    vec2 q = p - c;
    float a = atan(q.y, q.x) / 6.2831853 + 0.5;
    float cell = floor(a * n);
    float h = ocHash(vec2(cell, 9.2));
    float spoke = ocStroke(abs(fract(a * n) - 0.5) * 2.0, 1.1);
    float len = 0.18 + 0.55 * h;
    float vis = step(length(q), len);
    return mix(plate, ink, spoke * vis);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(shatterStar(p, ocPlate(p, t), vec3(0.86, 0.82, 0.90), vec2(0.72, 0.45), 18.0)); }`),

  D("timeHoldBand", "horizontal freeze band: a screen strip holds a posterized invert, rest is live",
    /* glsl */ `
  vec3 freezePosterish(vec3 c) { return ocInvert(floor(c * 4.0 + 0.5) / 4.0); }
  vec3 timeHoldBand(vec2 p, vec3 live, float y0, float h) {
    float d = abs(p.y - y0) - h;
    return mix(live, freezePosterish(live), ocAA(-d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(timeHoldBand(p, ocPlate(p, t), 0.48, 0.12)); }`),

  D("polarSecondTicks", "120 half-second marks: denser than minutes, very short radial ticks",
    /* glsl */ `
  vec3 polarSecondTicks(vec2 p, vec3 plate, vec3 ink, vec2 c, float R) {
    vec2 q = (p - c) / max(R, 1e-4);
    float r = length(q), a = atan(q.x, q.y);
    float mark = ocStroke(abs(sin(a * 60.0)) * r * 0.35, 0.6) * step(0.92, r) * step(r, 0.99);
    return mix(plate, ink, mark);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(polarSecondTicks(p, ocPlate(p, t), vec3(0.16, 0.10, 0.12), vec2(0.72, 0.48), 0.40)); }`),
];
