// Family — fresco plaster. Mineral wall, not paper grain and not cel.
import { T } from "./define.js";

const F = "fresco";

export const FRESCO = [
  T("frescoLimeWash", F, "lime plaster wash: mineral white-green, tooth from the wall not the print",
    `vec3 frescoLimeWash(vec2 p, float t) {
      float tooth = skFbm(p * 7.0) * 0.55 + skVn(p * 28.0) * 0.20;
      vec3 lime = mix(SK_FRESCO_LIME * 0.82, SK_FRESCO_LIME, tooth);
      float stain = skFbm(p * 2.2 + vec2(0.4, 0.1));
      lime = mix(lime, mix(lime, SK_FRESCO_TERRE, 0.22), smoothstep(0.55, 0.85, stain));
      float pit = skVn(p * 40.0);
      lime = mix(lime, SK_FRESCO_UMBER * 1.1, (1.0 - smoothstep(0.12, 0.22, pit)) * 0.08);
      return lime;
    }`, "frescoLimeWash(p, t)"),

  T("frescoCrackle", F, "age crackle as value lines: fwidth veins, lime field, not dirty noise",
    `vec3 frescoCrackle(vec2 p, float t) {
      vec3 wall = mix(SK_FRESCO_LIME * 0.88, SK_FRESCO_LIME, skFbm(p * 5.0));
      float n = skFbm(p * 9.0);
      float n2 = skFbm(p * 18.0 + 3.1);
      float vein = abs(n - 0.5) * abs(n2 - 0.48);
      float w = fwidth(vein) + 1e-5;
      float crack = 1.0 - smoothstep(0.012 - w, 0.012 + w, vein);
      vec3 col = mix(wall, SK_FRESCO_UMBER * 1.15, crack * 0.55);
      float flake = skFill(skEllipse(p, vec2(0.42, 0.62), vec2(0.08, 0.04))) * 0.25;
      return mix(col, SK_FRESCO_LIME * 1.05, flake);
    }`, "frescoCrackle(p, t)"),

  T("frescoPigment", F, "earth pigment plates: ochre, terre verte, raw umber meeting in plaster edges",
    `vec3 frescoPigment(vec2 p, float t) {
      float a = skFbm(p * 2.0);
      float b = skFbm(p * 2.4 + 8.0);
      float wa = fwidth(a) + 1e-4;
      float wb = fwidth(b) + 1e-4;
      float ochre = smoothstep(0.46 - wa, 0.46 + wa, a);
      float terre = smoothstep(0.50 - wb, 0.50 + wb, b) * (1.0 - ochre * 0.35);
      vec3 col = SK_FRESCO_LIME;
      col = mix(col, SK_FRESCO_OCHRE, ochre * 0.88);
      col = mix(col, SK_FRESCO_TERRE, terre * 0.80);
      float umber = skFill(skBox(p, vec2(0.78, 0.22), vec2(0.22, 0.10)));
      col = mix(col, SK_FRESCO_UMBER, umber * 0.75);
      float tooth = skVn(p * 22.0) * 0.06;
      return col * (0.96 + tooth);
    }`, "frescoPigment(p, t)"),
];
