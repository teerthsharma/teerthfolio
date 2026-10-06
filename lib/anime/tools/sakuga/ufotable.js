// Family — Ufotable shaft. Painted god-rays as geometry. Not MAPPA milk.
import { T } from "./define.js";

const F = "ufotable";

export const UFOTABLE = [
  T("ufotableShaft", F, "Ufotable shafts: hard-edged painted bands, warm gold, fwidth lips",
    `vec3 ufotableShaft(vec2 p, float t) {
      float hold = skTwos(t);
      vec3 col = mix(SK_UFO_COOL * 1.1, SK_UFO_COOL * 0.7, skAA(p.y, 0.55));
      col = mix(col, skCel3(skNdL(p)), skCover(p));
      float shafts = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float ang = -0.55 + fi * 0.22 + (skH21(vec2(fi, hold)) - 0.5) * 0.03;
        vec2 d = normalize(vec2(cos(ang), sin(ang) * 0.35 + 0.85));
        vec2 o = vec2(0.18 + fi * 0.16, 0.02);
        float across = abs(dot(p - o, vec2(-d.y, d.x)));
        float along = dot(p - o, d);
        float w = mix(0.034, 0.012, clamp(along * 0.7, 0.0, 1.0));
        shafts = max(shafts, skFill(across - w) * skAA(along, 0.0) * (1.0 - skAA(along, 1.15)));
      }
      vec3 beam = mix(col, SK_UFO_SHAFT, 0.55);
      return mix(col, beam, shafts * 0.80);
    }`, "ufotableShaft(p, t)"),

  T("ufotableMote", F, "dust motes only inside the shaft: sparse printed specks, no particle field",
    `vec3 ufotableMote(vec2 p, float t) {
      float hold = skTwos(t);
      vec3 col = mix(SK_UFO_COOL * 1.05, skCel3(skNdL(p)), skCover(p));
      vec2 d = normalize(vec2(0.28, 0.96));
      vec2 o = vec2(0.30, 0.0);
      float across = abs(dot(p - o, vec2(-d.y, d.x)));
      float along = dot(p - o, d);
      float shaft = skFill(across - 0.08) * skAA(along, 0.02) * (1.0 - skAA(along, 1.1));
      col = mix(col, mix(col, SK_UFO_SHAFT, 0.48), shaft);
      float motes = 0.0;
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        vec2 s = vec2(0.28 + 0.22 * skH21(vec2(fi, 2.4)), 0.18 + 0.70 * skH21(vec2(fi, 7.1)));
        s += (skH22(vec2(fi, hold)) - 0.5) * 0.01;
        motes = max(motes, skFill(length(p - s) - 0.004) * step(0.35, skH21(vec2(fi, 9.0))));
      }
      return mix(col, SK_PAPER * 0.95, motes * shaft * 0.70);
    }`, "ufotableMote(p, t)"),

  T("ufotableRimFire", F, "Ufotable night fight: warm rim, indigo fill, no shafts — the other two own the beam",
    `vec3 ufotableRimFire(vec2 p, float t) {
      vec3 N = skSphereN(p);
      vec3 L = normalize(vec3(-0.65, 0.20, 0.35));
      float h = 0.5 + 0.5 * dot(N, L);
      float nv = 1.0 - clamp(dot(N, vec3(0.0, 0.1, 1.0)), 0.0, 1.0);
      float rw = fwidth(nv) + 1e-4;
      float rim = smoothstep(0.72 - rw, 0.72 + rw, nv) * skAA(h, 0.12);
      vec3 body = mix(SK_UFO_COOL, SK_MID * vec3(0.9, 0.7, 0.6), skAA(h, 0.42));
      body = mix(body, SK_UFO_WARM, rim * 0.85);
      vec3 paper = mix(SK_UFO_COOL * 0.7, SK_UMBER, skFbm(p * 4.0) * 0.25);
      return mix(paper, body, skCover(p));
    }`, "ufotableRimFire(p, t)"),
];
