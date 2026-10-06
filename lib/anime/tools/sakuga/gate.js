// Family — analog gate weave. Telecine registration, not digital shake.
import { T } from "./define.js";

const F = "gate";

export const GATE = [
  T("gateWeave", F, "telecine weave: two-axis analog registration, slow drift plus gate chatter",
    `vec3 gateWeave(vec2 p, float t) {
      vec2 q = p + skWeave(t);
      vec3 col = skFigure(q, skTwos(t));
      float g = skGrain(q, skTwos(t)) * 0.022;
      return col + vec3(g, g * 0.9, g * 0.75);
    }`, "gateWeave(p, t)"),

  T("gateBounce", F, "vertical gate bounce on the cut: decays in a few frames, analog not elastic",
    `vec3 gateBounce(vec2 p, float t) {
      float cut = fract(t * 0.18);
      float bounce = exp(-cut * 14.0) * sin(cut * 42.0) * 0.014;
      vec2 q = p + vec2(skWeave(t).x, bounce);
      vec3 col = skFigure(q, skTwos(t));
      float bar = skBand(q.y, 0.0, 0.03) + skBand(q.y, 0.97, 1.0);
      return mix(col, SK_UMBER * 1.3, bar * 0.35);
    }`, "gateBounce(p, t)"),

  T("gatePerf", F, "sprocket perf flicker: edge value pulse, frame remains registered",
    `vec3 gatePerf(vec2 p, float t) {
      float hold = skTwos(t);
      vec2 q = p + skWeave(t) * 0.6;
      vec3 col = skFigure(q, hold);
      float edge = max(1.0 - skAA(p.x, 0.045), skAA(p.x, 0.97));
      float hole = 0.0;
      for (int i = 0; i < 8; i++) {
        float y = 0.08 + float(i) * 0.12;
        hole = max(hole, skFill(skEllipse(p, vec2(mix(0.02, 0.98, step(0.5, p.x)), y), vec2(0.012, 0.018))));
      }
      float pulse = 0.85 + 0.15 * step(0.5, fract(hold * 0.5 + 0.2));
      vec3 perf = mix(SK_UMBER, SK_PAPER * 0.7, pulse);
      col = mix(col, col * vec3(0.96, 0.94, 0.90), edge * 0.4);
      return mix(col, perf, hole * edge);
    }`, "gatePerf(p, t)"),
];
