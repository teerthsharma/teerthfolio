// Family — on-twos hold grain. Grain and tooth lock to the drawing, never swim.
import { T } from "./define.js";

const F = "hold";

export const HOLD = [
  T("holdTwosGrain", F, "12fps hold with organic grain that only updates on a new drawing",
    `vec3 holdTwosGrain(vec2 p, float t) {
      float hold = skTwos(t);
      vec3 col = skFigure(p, hold);
      float g = skGrain(p, hold);
      return col * (1.0 + g * 0.055) + SK_INK * (g * 0.02);
    }`, "holdTwosGrain(p, t)"),

  T("holdExposureBreath", F, "exposure steps per drawing: ±3% value, ballast not flicker",
    `vec3 holdExposureBreath(vec2 p, float t) {
      float hold = skTwos(t);
      float breath = 0.97 + 0.06 * skH21(vec2(hold * 17.0, 3.2));
      vec3 col = skFigure(p, hold) * breath;
      float g = skGrain(p, hold) * 0.028;
      return col + vec3(g * 0.9, g * 0.85, g * 0.7);
    }`, "holdExposureBreath(p, t)"),

  T("holdToothPrint", F, "paper tooth locked to the held cel: fiber does not swim under the drawing",
    `vec3 holdToothPrint(vec2 p, float t) {
      float hold = skTwos(t);
      vec2 q = p + (skH22(vec2(hold, 8.1)) - 0.5) * 0.004;
      vec3 paper = skPaper(q);
      float h = skNdL(p);
      vec3 body = skCel3(h);
      float tooth = skFbm(q * 22.0 + hold * 0.0);
      body *= mix(0.94, 1.02, tooth);
      paper *= mix(0.90, 1.0, tooth);
      vec3 col = mix(paper, body, skCover(p));
      return col * (1.0 + skGrain(q, hold) * 0.03);
    }`, "holdToothPrint(p, t)"),
];
