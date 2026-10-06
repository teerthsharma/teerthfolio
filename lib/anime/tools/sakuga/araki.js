// Family — Araki hatch. Print finish: Ben-Day, speed plate, pose cut.
// Distinct from jojo/ characters and basic hatchAraki.
import { T } from "./define.js";

const F = "araki";

export const ARAKI = [
  T("arakiBentone", F, "Araki Ben-Day: toner discs in the core, thick parallel bands, fashion cream field",
    `vec3 arakiBentone(vec2 p, float t) {
      float h = skNdL(p);
      float shadow = 1.0 - h;
      vec3 field = mix(SK_ARAKI_CREAM * 0.55, SK_ARAKI_CREAM, skFbm(p * 3.0) * 0.2 + 0.4);
      vec3 body = mix(SK_ARAKI_INK * 1.4, vec3(0.62, 0.42, 0.38), skAA(h, 0.42));
      body = mix(body, SK_ARAKI_CREAM * 0.92, skAA(h, 0.74));
      float tone = skToner(p, mix(0.12, 0.68, clamp(shadow, 0.0, 1.0)));
      body = mix(body, SK_ARAKI_INK, tone * skAA(shadow, 0.28) * 0.70);
      vec2 q = mat2(0.94, -0.34, 0.34, 0.94) * (p - vec2(0.72, 0.5));
      float band = abs(sin(q.x * 34.0));
      float ink = (1.0 - smoothstep(0.20 - fwidth(band), 0.20 + fwidth(band), band));
      ink *= smoothstep(0.58, 0.08, abs(q.y * 2.0)) * skAA(shadow, 0.32);
      body = mix(body, SK_ARAKI_INK, ink * 0.85);
      return mix(field, body, skCover(p));
    }`, "arakiBentone(p, t)"),

  T("arakiSpeedPlate", F, "radial speed as a printed plate: citrus wedges on indigo, not character lettering",
    `vec3 arakiSpeedPlate(vec2 p, float t) {
      vec2 c = p - vec2(0.72, 0.50);
      float a = atan(c.y, c.x);
      float r = length(c);
      float wedges = abs(fract(a / 6.2831853 * 14.0) - 0.5) * 2.0;
      float w = fwidth(wedges) + 1e-4;
      float plate = smoothstep(0.35 - w, 0.35 + w, wedges);
      float fall = 1.0 - smoothstep(0.08, 0.62, r);
      vec3 field = mix(SK_ARAKI_INK * 1.3, SK_ARAKI_MAG * 0.45, skAA(p.y, 0.4));
      vec3 wedge = mix(SK_ARAKI_CITRUS * 0.72, SK_ARAKI_CREAM, skAA(r, 0.35));
      vec3 col = mix(field, wedge, plate * fall * 0.90);
      return mix(col, skCel3(skNdL(p)), skCover(p) * 0.85);
    }`, "arakiSpeedPlate(p, t)"),

  T("arakiPoseCut", F, "fashion pose cut: one diagonal value slash, cream / indigo, no GOGOGO type",
    `vec3 arakiPoseCut(vec2 p, float t) {
      float h = skNdL(p);
      float slash = dot(p - vec2(0.58, 0.52), normalize(vec2(0.72, -0.70)));
      float side = skAA(slash, 0.0);
      vec3 warm = mix(vec3(0.62, 0.28, 0.32), SK_ARAKI_CREAM, skAA(h, 0.50));
      vec3 cold = mix(SK_ARAKI_INK * 1.5, vec3(0.28, 0.22, 0.48), skAA(h, 0.46));
      vec3 body = mix(warm, cold, side);
      vec3 field = mix(SK_ARAKI_CREAM * 0.7, SK_ARAKI_INK * 1.2, side);
      vec3 col = mix(field, body, skCover(p));
      float seam = skLine(slash, 2.2);
      return mix(col, SK_ARAKI_MAG * 0.7, seam * 0.40);
    }`, "arakiPoseCut(p, t)"),
];
