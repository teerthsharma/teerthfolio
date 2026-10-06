// Family 1 — seals / NDC plates / vignettes / letterbox (15).
// Maths: screen-space SDF holes and mattes from gl_FragCoord/uRes; coverage via fwidth.
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo) => defineModule({ name, doc, glsl, demo });

export const SEALS = [
  D("sealEllipse", "screen-ellipse hero seal: glued plate with an AA ellipse hole so the hero is never covered",
    /* glsl */ `
  vec3 sealEllipse(vec2 p, vec3 plate, vec3 glue, vec2 c, vec2 rad) {
    float d = ocEllipse(p, c, rad);
    return mix(glue, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(sealEllipse(p, ocPlate(p, t), vec3(0.16, 0.10, 0.22), vec2(0.72, 0.40), vec2(0.20 + 0.02 * sin(t), 0.26))); }`),

  D("ndcPlate", "NDC fullscreen glued plate: colour from gl_FragCoord, clip-space quad covering the frame",
    /* glsl */ `
  vec3 ndcPlate(vec3 glue) {
    vec2 n = ocNdc();
    float frame = ocAA(ocBox(n, vec2(0.0), vec2(0.98, 0.98)));
    vec3 wash = glue * (0.82 + 0.12 * ocUV().y);
    return mix(OC_INK, wash, frame);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(mix(ndcPlate(vec3(0.22, 0.14, 0.32)), ocPlate(p, t), 0.35 + 0.15 * sin(t))); }`),

  D("softOccludeVig", "soft occlude vignette: quadratic screen falloff multiplied onto the plate, never a hard cut",
    /* glsl */ `
  vec3 softOccludeVig(vec3 plate, float k) {
    vec2 d = ocUV() - 0.5;
    float v = 1.0 - k * dot(d, d) * 3.2;
    return plate * mix(OC_INK * 3.4, vec3(1.0), clamp(v, 0.0, 1.0));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(softOccludeVig(ocPlate(p, t), 0.7 + 0.25 * sin(t))); }`),

  D("letterboxBars", "cinematic letterbox: horizontal bars from |ndc.y|, fwidth on the bar edge",
    /* glsl */ `
  vec3 letterboxBars(vec3 plate, float halfH) {
    float d = abs(ocNdc().y) - halfH;
    return mix(plate, OC_INK, ocAA(-d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(letterboxBars(ocPlate(p, t), 0.62 + 0.08 * sin(t * 0.7))); }`),

  D("pillarboxBars", "pillarbox: vertical side bars from |ndc.x|, fwidth on the bar edge",
    /* glsl */ `
  vec3 pillarboxBars(vec3 plate, float halfW) {
    float d = abs(ocNdc().x) - halfW;
    return mix(plate, OC_INK, ocAA(-d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(pillarboxBars(ocPlate(p, t), 0.70 + 0.08 * cos(t))); }`),

  D("sealQuad", "rounded-quad hero seal: axis-aligned screen box hole with fwidth, glued plate around it",
    /* glsl */ `
  vec3 sealQuad(vec2 p, vec3 plate, vec3 glue, vec2 c, vec2 b) {
    return mix(glue, plate, ocAA(ocBox(p, c, b)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(sealQuad(p, ocPlate(p, t), vec3(0.14, 0.11, 0.20), vec2(0.72, 0.40), vec2(0.22, 0.28))); }`),

  D("sealCapsule", "stadium/capsule hero seal: two discs + a box, AA union, glued plate",
    /* glsl */ `
  float ocCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }
  vec3 sealCapsule(vec2 p, vec3 plate, vec3 glue, vec2 a, vec2 b, float r) {
    return mix(glue, plate, ocAA(ocCapsule(p, a, b, r)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(sealCapsule(p, ocPlate(p, t), vec3(0.15, 0.09, 0.20), vec2(0.62, 0.36), vec2(0.84, 0.48), 0.16)); }`),

  D("cornerPlates", "four corner hold cards: screen-space L-plates that pin the frame, AA on each card",
    /* glsl */ `
  vec3 cornerPlates(vec3 plate, vec3 card, float s) {
    vec2 n = abs(ocNdc());
    float d = min(ocBox(n, vec2(1.0 - s * 0.5, 1.0 - s * 0.18), vec2(s * 0.5, s * 0.18)),
                  ocBox(n, vec2(1.0 - s * 0.18, 1.0 - s * 0.5), vec2(s * 0.18, s * 0.5)));
    return mix(plate, card, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(cornerPlates(ocPlate(p, t), vec3(0.20, 0.12, 0.10), 0.42)); }`),

  D("safeAction", "action-safe inner frame: thin AA rule at a screen inset, plate dimmed outside",
    /* glsl */ `
  vec3 safeAction(vec3 plate, float inset) {
    vec2 n = ocNdc();
    float d = ocBox(n, vec2(0.0), vec2(1.0 - inset, 1.0 - inset));
    float rule = ocStroke(d, 1.1);
    vec3 dim = plate * vec3(0.55, 0.50, 0.62);
    return mix(mix(dim, plate, ocAA(d)), vec3(0.78, 0.62, 0.28), rule);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(safeAction(ocPlate(p, t), 0.12)); }`),

  D("irisGate", "iris wipe: circular aperture from screen centre, noisy edge, fwidth cover",
    /* glsl */ `
  vec3 irisGate(vec2 p, vec3 plate, vec3 glue, float k) {
    vec2 q = ocP();
    float n = (ocVnoise(vec2(atan(q.y, q.x) * 3.0, 4.0)) - 0.5) * 0.08;
    float d = length(q) - k * 1.35 - n;
    return mix(glue, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(irisGate(p, ocPlate(p, t), vec3(0.12, 0.08, 0.16), 0.45 + 0.35 * sin(t))); }`),

  D("ndcSplitPlate", "left/right NDC glued plates: two screen halves with an AA seam",
    /* glsl */ `
  vec3 ndcSplitPlate(vec3 left, vec3 right, float seam) {
    float d = ocNdc().x - seam;
    return mix(left, right, ocAA(-d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(ndcSplitPlate(vec3(0.18, 0.12, 0.28), ocPlate(p, t), 0.15 * sin(t))); }`),

  D("sweepMatte", "horizontal wipe matte: a moving x-bar that reveals the plate, AA on the head",
    /* glsl */ `
  vec3 sweepMatte(vec2 p, vec3 plate, vec3 glue, float u) {
    float A = 1.5, ex = mix(-A, A, u);
    float d = p.x - ex;
    return mix(glue, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(sweepMatte(p, ocPlate(p, t), vec3(0.14, 0.10, 0.18), fract(t * 0.18))); }`),

  D("diagonalMatte", "diagonal hold: a 45-degree half-plane matte with fwidth, glued vs plate",
    /* glsl */ `
  vec3 diagonalMatte(vec2 p, vec3 plate, vec3 glue, float k) {
    float d = (p.x + p.y) * 0.7071 - k;
    return mix(glue, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(diagonalMatte(p, ocPlate(p, t), vec3(0.16, 0.09, 0.14), 0.6 + 0.4 * sin(t * 0.6))); }`),

  D("keyholeSeal", "keyhole hero seal: circle over a tapered slot, AA union, glued plate",
    /* glsl */ `
  vec3 keyholeSeal(vec2 p, vec3 plate, vec3 glue, vec2 c) {
    float head = ocEllipse(p, c + vec2(0.0, 0.10), vec2(0.16, 0.16));
    float slot = ocBox(p, c + vec2(0.0, -0.10), vec2(0.07, 0.18));
    return mix(glue, plate, ocAA(min(head, slot)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(keyholeSeal(p, ocPlate(p, t), vec3(0.13, 0.08, 0.18), vec2(0.72, 0.42))); }`),

  D("scallopFrame", "scalloped oval frame: sine-modulated ellipse rim, fwidth fill outside",
    /* glsl */ `
  vec3 scallopFrame(vec2 p, vec3 plate, vec3 glue, vec2 c, vec2 rad, float lobes) {
    vec2 q = (p - c) / max(rad, vec2(1e-4));
    float a = atan(q.y, q.x);
    float d = length(q) - 1.0 - 0.08 * sin(a * lobes);
    return mix(glue, plate, ocAA(d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(scallopFrame(p, ocPlate(p, t), vec3(0.17, 0.10, 0.14), vec2(0.72, 0.42), vec2(0.42, 0.36), 10.0)); }`),
];
