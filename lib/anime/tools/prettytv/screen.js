// prettytv screen: banded film bloom, held film grain, TV grade, the whole-frame half of the studio look.
import { defineModule as D } from "./define.js";

export const SCREEN = [
  D({
    name: "ptvBloomHalo", doc: "film bloom in bands: a hot core and three stepped halo rings round each light, capped under 0.92",
    uniforms: { uPtvBloomRadius: 0.16, uPtvBloomBands: 4, uPtvBloomGain: 0.85 },
    draws: "Two lights in a dark blue room, a warm orb and a cool slit, each wrapped in a few stepped rings of glow around a bright core, breathing slightly.",
    use: "screen", params: "uPtvBloomRadius = halo radius in frame heights; uPtvBloomBands = number of glow steps (2 to 7); uPtvBloomGain = glow strength; ptvBloomAdd(p, centre, r, colour, bands, gain) is the reusable call",
    demoExpr: "ptvBloomHalo(p, t)",
    glsl: `
vec3 ptvBloomAdd(vec2 p, vec2 c, float r, vec3 col, float bands, float gain) {
  float d = length(p - c) / max(r, 1e-4);
  float q = ptvPost(exp(-d * d * 1.6), bands);
  return col * (q * gain * 0.6 + ptvFill(d - 0.12) * 0.4);
}
vec3 ptvBloomHalo(vec2 p, float t) {
  vec3 c = mix(vec3(0.10, 0.14, 0.24), vec3(0.20, 0.26, 0.38), ptvPost(p.y, 4.0));
  float pulse = 0.95 + 0.05 * sin(6.2832 * ptvHold(t, 12.0) * 0.5);
  float g = uPtvBloomGain * pulse;
  c += ptvBloomAdd(p, vec2(0.50, 0.56), uPtvBloomRadius, vec3(1.0, 0.82, 0.55), uPtvBloomBands, g);
  c += ptvBloomAdd(p, vec2(1.02, 0.40), uPtvBloomRadius * 0.8, vec3(0.62, 0.86, 1.0), uPtvBloomBands, g);
  return ptvCap(c / (1.0 + 0.25 * c) * 1.2);
}`,
  }),
  D({
    name: "ptvGrainHold", doc: "film grain redrawn per drawing, strongest in the darks, never above the luma cap",
    uniforms: { uPtvGrainAmt: 0.05, uPtvGrainFps: 12 },
    draws: "A six-step violet-grey value ramp, plain on the left half and grained on the right half, the grain changing twelve times a second and heavier in the darker steps.",
    use: "noise", params: "uPtvGrainAmt = grain strength; uPtvGrainFps = how often the grain redraws; ptvGrainAdd(c, p, t, amt) is the reusable call",
    demoExpr: "ptvGrainHold(p, t)",
    glsl: `
vec3 ptvGrainAdd(vec3 c, vec2 p, float t, float amt) {
  float h = ptvHold(t, uPtvGrainFps);
  float g = ptvH21(floor(p * 700.0) + vec2(h * 37.0, h * 11.0)) - 0.5;
  return ptvCap(c + g * amt * (0.4 + 0.6 * (1.0 - ptvLuma(c))));
}
vec3 ptvGrainHold(vec2 p, float t) {
  vec3 c = vec3(0.12 + 0.12 * floor(p.y * 6.0)) * vec3(0.92, 0.96, 1.06);
  vec3 g = ptvGrainAdd(c, p, t, uPtvGrainAmt);
  float rule = ptvLine(p.x - 0.72, 2.0);
  return ptvCap(mix(mix(c, g, ptvAA(p.x, 0.72)), PTV_INK, rule * 0.8));
}`,
  }),
  D({
    name: "ptvGradeTv", doc: "TV grade: ink-floor lift, soft shoulder, teal-blue shadows and warm highlights, capped at 0.92",
    uniforms: { uPtvGradeSplit: 0.7, uPtvGradeLift: 0.04 },
    draws: "A grid of six hues in four values, raw on the left half and graded on the right: blacks lifted off ink, highlights softened, shadows cooler, lights warmer.",
    use: "grade", params: "uPtvGradeSplit = strength of the cool-shadow warm-light split, 0 to 1; uPtvGradeLift = how far the blacks rise; ptvGradeApply(c, split, lift) is the reusable call",
    demoExpr: "ptvGradeTv(p, t)",
    glsl: `
vec3 ptvGradeApply(vec3 c, float split, float lift) {
  float L = ptvLuma(c);
  c = max(c, vec3(0.0)) * (1.0 - lift) + vec3(0.07, 0.075, 0.10) * lift * 2.0;
  c = c / (1.0 + 0.35 * c) * 1.35;
  c *= mix(vec3(1.0), mix(vec3(0.88, 0.98, 1.12), vec3(1.08, 1.02, 0.90), smoothstep(0.15, 0.80, L)), split);
  float Lg = ptvLuma(c);
  return ptvCap(mix(vec3(Lg), c, 1.08));
}
vec3 ptvGradeTv(vec2 p, float t) {
  float cx = floor(fract(p.x / 0.72) * 6.0);
  float cy = floor(clamp(p.y, 0.0, 0.999) * 4.0);
  vec3 c = (0.18 + 0.22 * cy) * (0.55 + 0.45 * cos(6.2832 * (cx / 6.0 + vec3(0.0, 0.33, 0.67))));
  vec3 g = ptvGradeApply(c, uPtvGradeSplit, uPtvGradeLift);
  return ptvCap(mix(c, g, ptvAA(p.x, 0.72)));
}`,
  }),
];
