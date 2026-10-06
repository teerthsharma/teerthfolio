import { defineModule } from "./define.js";

export default defineModule({
  name: "time-stop-invert",
  doc: "DIO hold: 4-bin posterize then luma-safe invert of a citrus/purple split, cream ZA-WARUDO bar, five frozen beads — complementary still, not a noisy invert",
  glsl: /* glsl */ `
  vec3 timeStopInvert(vec2 p, float t) {
    float cut = sAA(p.x + p.y * 0.38, 0.70);
    vec3 src = mix(vec3(0.353, 0.165, 0.541), S_CITRUS, cut);
    src = mix(src, S_MAG, sAA(p.y, 0.58) * 0.32);
    vec3 bins = floor(src * 4.0 + 0.5) / 4.0;
    vec3 inv = sInvert(bins);
    vec2 q = p - vec2(0.72, 0.62);
    float bar = sBox(q, vec2(0.36, 0.052));
    vec3 cream = mix(S_CREAM, S_INK, sLine(bar, 2.0));
    inv = mix(inv, cream, sFill(bar));
    vec2 c = p - S_C;
    float rim = sLine(length(c) - 0.34, 1.6) * sBand(length(c), 0.30, 0.38);
    inv = mix(inv, S_CITRUS * 0.85, rim * 0.55);
    float drop = 8.0;
    drop = min(drop, length((p - vec2(0.26, 0.74)) * vec2(1.0, 1.35)) - 0.032);
    drop = min(drop, length((p - vec2(0.88, 0.36)) * vec2(1.0, 1.40)) - 0.026);
    drop = min(drop, length((p - vec2(0.18, 0.42)) * vec2(1.0, 1.28)) - 0.022);
    drop = min(drop, length((p - vec2(0.80, 0.78)) * vec2(1.0, 1.32)) - 0.020);
    drop = min(drop, length((p - vec2(0.48, 0.22)) * vec2(1.0, 1.38)) - 0.018);
    vec3 bead = mix(vec3(0.10, 0.78, 0.92), S_CREAM, sAA(p.x + p.y, 0.9));
    inv = mix(inv, bead, sFill(drop));
    inv = mix(inv, S_INK, sLine(drop, 1.4));
    return sOut(inv);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return timeStopInvert(p, t); }`,
});
