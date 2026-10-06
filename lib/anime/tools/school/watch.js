// Family 6 — surveillance / CCTV grain / seating-chart overlay (5).
// Held grain, printed. Observational camera, not cyber HUD.
import { T } from "./kit.glsl.js";

const F = "watch";

export const WATCH = [
  T("cctvGrain", F, "CCTV grain: held hash, luma-weighted, printed still, not rolling film",
    `vec3 cctvGrain(vec2 p, float t) {
      float hold = scHold(t, 4.0);
      vec3 c = scClassroom(p, hold);
      float g = scH21(floor(p * 110.0) + hold * 7.0) - 0.5;
      float L = scLuma(c);
      return c + g * 0.07 * (0.22 + 3.6 * L * (1.0 - L));
    }`, "cctvGrain(p, t)"),

  T("cctvStamp", F, "CCTV timestamp plate: quiet corner stamp, 2 fps hold, no scanline punch",
    `vec3 cctvStamp(vec2 p, float t) {
      vec3 c = cctvGrain(p, t);
      float plate = scFill(scBox(p, vec2(0.18, 0.08), vec2(0.14, 0.028)));
      float ticks = 0.0;
      for (int i = 0; i < 6; i++) {
        float x = 0.08 + float(i) * 0.034;
        ticks = max(ticks, scFill(scBox(p, vec2(x, 0.08), vec2(0.010, 0.012))));
      }
      vec3 ink = mix(SC_FLUORO_DIM * 0.7, SC_FLUORO * 0.55, 0.35);
      c = mix(c, SC_CHESS * 1.4, plate * 0.55);
      return mix(c, ink, ticks * plate);
    }`, "cctvStamp(p, t)", ["cctvGrain"]),

  T("seatChart", F, "seating-chart overlay: faint grid of desks, Class 1-D, printed on the still",
    `vec3 seatChart(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      vec2 g = (p - vec2(0.72, 0.48)) * vec2(6.2, 5.0);
      vec2 fw = fwidth(g) + 1e-5;
      vec2 a = abs(fract(g - 0.5) - 0.5) / fw;
      float line = (1.0 - smoothstep(0.5, 1.5, min(a.x, a.y))) * 0.22;
      float field = scBand(p.y, 0.18, 0.82) * scBand(p.x, 0.22, 1.20);
      return mix(c, mix(c, SC_FLUORO_DIM * 0.85, line), field);
    }`, "seatChart(p, t)"),

  T("seatAssign", F, "assigned seat dots: one red-50 mark on the chart, the rest quiet ink",
    `vec3 seatAssign(vec2 p, float t) {
      vec3 c = seatChart(p, t);
      float dots = 0.0;
      vec2 hero = vec2(0.70, 0.36);
      for (int j = 0; j < 4; j++) {
        for (int i = 0; i < 5; i++) {
          vec2 s = vec2(0.36 + float(i) * 0.16, 0.28 + float(j) * 0.12);
          dots = max(dots, scFill(length(p - s) - 0.010));
        }
      }
      float mine = scFill(length(p - hero) - 0.014);
      c = mix(c, SC_INK * 2.6, dots * 0.35);
      return mix(c, SC_RED50, mine * 0.80);
    }`, "seatAssign(p, t)", ["seatChart"]),

  T("lensStill", F, "observational lensAt vignette: still desk, soft falloff, no aisle punch",
    `vec3 lensStill(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      vec2 d = (p - vec2(0.72, 0.48)) * vec2(0.72, 1.0);
      float v = 1.0 - clamp(dot(d, d) * 1.15, 0.0, 1.0);
      vec3 edge = mix(SC_INK * 1.8, c, v);
      return mix(c, edge, 0.55);
    }`, "lensStill(p, t)"),
];
