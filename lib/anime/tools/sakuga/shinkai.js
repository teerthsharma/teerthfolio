// Family — Shinkai dusk split. Orange sky / cyan city. Not basic gradeDusk.
import { T } from "./define.js";

const F = "shinkai";

export const SHINKAI = [
  T("shinkaiDuskSplit", F, "Shinkai split: orange sky against cyan city, hard horizon value, complementary",
    `vec3 shinkaiDuskSplit(vec2 p, float t) {
      float hor = 0.46 + skFbm(vec2(p.x * 3.0, 0.3)) * 0.02;
      float skyT = clamp((p.y - hor) / max(1.0 - hor, 1e-4), 0.0, 1.0);
      vec3 sky = mix(SK_SHINK_ORANGE, SK_SHINK_PINK, skAA(skyT, 0.35));
      sky = mix(sky, vec3(0.28, 0.24, 0.52), skAA(skyT, 0.78));
      vec3 city = mix(SK_SHINK_CYAN * 0.55, SK_SHINK_CYAN, skAA(p.y, 0.18));
      float cut = skAA(p.y, hor);
      vec3 col = mix(city, sky, cut);
      float lip = skLine(p.y - hor, 1.5);
      return mix(col, mix(SK_SHINK_ORANGE, SK_SHINK_CYAN, 0.5), lip * 0.25);
    }`, "shinkaiDuskSplit(p, t)"),

  T("shinkaiGlassCatch", F, "window glass as painted sky rectangles on the cyan plate, not reflections",
    `vec3 shinkaiGlassCatch(vec2 p, float t) {
      float hor = 0.48;
      vec3 sky = mix(SK_SHINK_ORANGE, SK_SHINK_PINK, skAA(p.y, 0.70));
      vec3 city = SK_SHINK_CYAN * 0.72;
      vec3 col = mix(city, sky, skAA(p.y, hor));
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 c = vec2(0.14 + fi * 0.20, 0.22 + 0.06 * mod(fi, 2.0));
        float win = skFill(skBox(p, c, vec2(0.055, 0.08)));
        float pane = skLine(skBox(p, c, vec2(0.055, 0.08)), 1.2);
        vec3 glass = mix(SK_SHINK_ORANGE * 0.85, SK_SHINK_PINK, skAA(c.y, 0.24));
        col = mix(col, glass, win * (1.0 - skAA(p.y, hor)));
        col = mix(col, SK_SHINK_WIRE * 1.4, pane * 0.45);
      }
      return col;
    }`, "shinkaiGlassCatch(p, t)"),

  T("shinkaiRailDusk", F, "rails and wires as thin dark lines across the split sky, silhouette not #000",
    `vec3 shinkaiRailDusk(vec2 p, float t) {
      float hor = 0.44;
      vec3 sky = mix(SK_SHINK_ORANGE, vec3(0.32, 0.28, 0.54), skAA(p.y, 0.78));
      vec3 city = mix(SK_SHINK_CYAN * 0.50, SK_SHINK_CYAN * 0.80, skAA(p.x, 0.4));
      vec3 col = mix(city, sky, skAA(p.y, hor));
      float wires = 0.0;
      wires = max(wires, skLine(p.y - 0.78 - p.x * 0.04, 1.1));
      wires = max(wires, skLine(p.y - 0.74 + p.x * 0.03, 1.0));
      wires = max(wires, skLine(p.y - 0.22, 1.4));
      wires = max(wires, skLine(p.y - 0.18, 1.3));
      float pole = skFill(skBox(p, vec2(0.88, 0.48), vec2(0.012, 0.48)));
      col = mix(col, SK_SHINK_WIRE, wires * 0.75);
      return mix(col, SK_SHINK_WIRE, pole * 0.80);
    }`, "shinkaiRailDusk(p, t)"),
];
