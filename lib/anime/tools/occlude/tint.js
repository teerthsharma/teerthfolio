// Family 4 — tint / wash / grey-hole / freeze grain (15).
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo) => defineModule({ name, doc, glsl, demo });

export const TINT = [
  D("multiplyTint", "multiply tint wash: plate * mix(white, hue, k), JoJo palette-swap style",
    /* glsl */ `
  vec3 multiplyTint(vec3 plate, vec3 hue, float k) {
    return ocCap(plate * mix(vec3(1.0), hue, clamp(k, 0.0, 1.0)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return multiplyTint(ocPlate(p, t), vec3(0.72, 0.42, 0.92), 0.55); }`),

  D("freezeGrain", "freeze-frame grain: IGN-ish hash held on a stepped clock, luma-weighted, not rolling film",
    /* glsl */ `
  vec3 freezeGrain(vec3 plate, float seed, float amt) {
    float hold = floor(seed);
    float g = (ocHash(gl_FragCoord.xy + hold * 5.588) - 0.5);
    float L = ocLuma(plate);
    return ocCap(plate + g * amt * (0.25 + 4.0 * L * (1.0 - L)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return freezeGrain(ocPlate(p, t), floor(t * 2.0), 0.22); }`),

  D("greyHole", "grey hole: desaturate a screen disc (all-but-hero / all-but-foe), plate elsewhere",
    /* glsl */ `
  vec3 greyHole(vec2 p, vec3 plate, vec2 c, vec2 rad, float k) {
    float m = ocAA(-ocEllipse(p, c, rad));
    float L = ocLuma(plate);
    return mix(plate, mix(plate, vec3(L), k), m);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(greyHole(p, ocPlate(p, t), vec2(0.72, 0.40), vec2(0.28, 0.32), 0.92)); }`),

  D("washComplement", "complement flash: 2-frame style mix toward 1-hue, then cap",
    /* glsl */ `
  vec3 washComplement(vec3 plate, vec3 hue, float k) {
    vec3 comp = ocInvert(hue);
    return ocCap(mix(plate, plate * comp, clamp(k, 0.0, 1.0)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return washComplement(ocPlate(p, t), vec3(0.95, 0.82, 0.28), step(0.0, sin(t * 8.0))); }`),

  D("freezeHold", "held-frame: quantize time inside the hash so the plate is a still with a locked grain",
    /* glsl */ `
  vec3 freezeHold(vec3 plate, float t, float fps) {
    float hold = floor(t * fps);
    float g = ocHash(gl_FragCoord.xy + hold) - 0.5;
    return ocCap(plate + g * 0.10);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return freezeHold(ocPlate(p, 1.7), t, 2.0); }`),

  D("tintRamp", "3-stop tint ramp by luma, multiply onto the plate",
    /* glsl */ `
  vec3 tintRamp(vec3 plate, vec3 a, vec3 b, vec3 c) {
    float L = ocLuma(plate);
    vec3 r = L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0);
    return ocCap(plate * r);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return tintRamp(ocPlate(p, t), vec3(0.28, 0.16, 0.42), vec3(0.82, 0.32, 0.55), vec3(0.90, 0.82, 0.48)); }`),

  D("greyExceptSeal", "desaturate the whole frame except an ellipse seat (hero keeps chroma)",
    /* glsl */ `
  vec3 greyExceptSeal(vec2 p, vec3 plate, vec2 c, vec2 rad) {
    float m = ocAA(ocEllipse(p, c, rad));
    return mix(vec3(ocLuma(plate)), plate, m);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(greyExceptSeal(p, ocPlate(p, t), vec2(0.72, 0.40), vec2(0.22, 0.28))); }`),

  D("freezePoster", "held poster: freeze-step the plate into N bins so a time-stop reads as a print",
    /* glsl */ `
  vec3 freezePoster(vec3 plate, float bins) {
    return ocCap(floor(plate * bins + 0.5) / max(bins, 1.0));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return freezePoster(ocPlate(p, t), 5.0); }`),

  D("washDuotone", "duotone wash: replace chroma with a two-ink mix by luma, multiply amount",
    /* glsl */ `
  vec3 washDuotone(vec3 plate, vec3 ink, vec3 paper, float k) {
    vec3 duo = mix(ink, paper, ocLuma(plate));
    return ocCap(mix(plate, duo, k));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return washDuotone(ocPlate(p, t), vec3(0.16, 0.08, 0.28), vec3(0.88, 0.76, 0.42), 0.75); }`),

  D("grainHoldFrame", "coarse clumped grain locked to a seed, two scales, mid-weighted",
    /* glsl */ `
  vec3 grainHoldFrame(vec3 plate, float seed, float amt) {
    vec2 fc = gl_FragCoord.xy;
    float g = (ocHash(fc + seed) - 0.5) * 0.65 + (ocHash(floor(fc / 3.0) + seed * 1.7) - 0.5) * 0.35;
    float L = ocLuma(plate);
    return ocCap(plate + g * amt * (0.2 + 3.6 * L * (1.0 - L)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return grainHoldFrame(ocPlate(p, t), 11.0, 0.28); }`),

  D("tintSplitWash", "split-tone: shadows multiply cool, lights multiply warm, mid crossover",
    /* glsl */ `
  vec3 tintSplitWash(vec3 plate, vec3 cool, vec3 warm) {
    float L = ocLuma(plate);
    vec3 t = mix(cool, warm, smoothstep(0.28, 0.72, L));
    return ocCap(plate * t);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return tintSplitWash(ocPlate(p, t), vec3(0.55, 0.62, 0.92), vec3(0.95, 0.72, 0.42)); }`),

  D("washEdgeBleed", "tint stronger at the frame edge (screen radial), a colour-script border wash",
    /* glsl */ `
  vec3 washEdgeBleed(vec3 plate, vec3 hue, float k) {
    vec2 n = ocNdc();
    float edge = smoothstep(0.35, 0.98, length(n));
    return ocCap(plate * mix(vec3(1.0), hue, edge * k));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return washEdgeBleed(ocPlate(p, t), vec3(0.92, 0.28, 0.55), 0.7); }`),

  D("freezeScan", "held scanlines: locked horizontal bars + grain, time-stop TV, AA via fwidth on the bar field",
    /* glsl */ `
  vec3 freezeScan(vec3 plate, float seed, float n) {
    float y = ocUV().y * n;
    float bar = ocStroke(fract(y) - 0.5, 0.8);
    float g = ocHash(vec2(floor(y), seed)) - 0.5;
    return ocCap(plate * (1.0 - bar * 0.18) + g * 0.06);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return freezeScan(ocPlate(p, t), 4.0, 90.0); }`),

  D("tintMultiplySoft", "soft multiply: mix(plate, plate*hue, smooth luma window) so brights keep air",
    /* glsl */ `
  vec3 tintMultiplySoft(vec3 plate, vec3 hue, float k) {
    float w = smoothstep(0.15, 0.75, ocLuma(plate));
    return ocCap(mix(plate, plate * hue, k * w));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return tintMultiplySoft(ocPlate(p, t), vec3(0.42, 0.78, 0.86), 0.7); }`),

  D("greyHoleIris", "iris-shaped grey hole: desaturate outside a growing disc, noisy rim",
    /* glsl */ `
  vec3 greyHoleIris(vec2 p, vec3 plate, float k) {
    vec2 q = ocP();
    float n = (ocVnoise(vec2(atan(q.y, q.x) * 4.0, 2.0)) - 0.5) * 0.07;
    float d = length(q) - k - n;
    float m = ocAA(d);
    return mix(plate, vec3(ocLuma(plate)), m);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(greyHoleIris(p, ocPlate(p, t), 0.4 + 0.25 * sin(t))); }`),
];
