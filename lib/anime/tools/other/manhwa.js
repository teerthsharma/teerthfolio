import { defineModule as M } from "./kit.glsl.js";

const F = "manhwa";

export const MANHWA = [
  M("manhwaAshBleed", F, "Korean manhwa: full-bleed #e5142e on ash #2a241f, hard value cut, no screentone",
    `vec3 manhwaAshBleed(vec2 p, float t){
      float cut = oFbm(p * 2.2) * 0.35 + p.y * 0.55;
      vec3 ash = vec3(0.16, 0.14, 0.12);
      vec3 blood = vec3(0.90, 0.08, 0.18);
      float w = fwidth(cut) + 1e-4;
      return mix(ash, blood, smoothstep(0.48 - w, 0.48 + w, cut));
    }`, "manhwaAshBleed(p, t)"),

  M("manhwaGreywash", F, "Greywash plates: 4 hard value steps, cool ash, one red sliver only",
    `vec3 manhwaGreywash(vec2 p, float t){
      float h = clamp(p.y * 0.7 + oFbm(p * 3.1) * 0.3, 0.0, 1.0);
      float q = floor(h * 4.0) / 4.0;
      float fw = fwidth(h * 4.0) + 1e-4;
      float u = (floor(h * 4.0) + smoothstep(0.5 - fw, 0.5 + fw, fract(h * 4.0))) / 4.0;
      vec3 a = vec3(0.12, 0.11, 0.12), b = vec3(0.28, 0.26, 0.26);
      vec3 c = vec3(0.48, 0.46, 0.44), d = vec3(0.70, 0.68, 0.64);
      vec3 col = u < 0.25 ? mix(a, b, u * 4.0) : u < 0.5 ? mix(b, c, u * 4.0 - 1.0) : u < 0.75 ? mix(c, d, u * 4.0 - 2.0) : d;
      float sliver = oSeg(p, vec2(0.20, 0.62), vec2(1.10, 0.48), 0.008);
      return mix(col, vec3(0.90, 0.08, 0.18), sliver * 0.85);
    }`, "manhwaGreywash(p, t)"),

  M("manhwaShrineJaw", F, "Malevolent shrine jaws: causal triangle, ink #1c1824, blood lip",
    `vec3 manhwaShrineJaw(vec2 p, float t){
      vec2 c = vec2(0.72, 0.58);
      vec2 q = p - c;
      float tri = max(abs(q.x) * 1.15 + q.y * 0.65 - 0.28, -q.y - 0.08);
      float mouth = max(abs(q.x) * 1.4 + (q.y + 0.04) * 0.8 - 0.12, -(q.y + 0.04) - 0.02);
      vec3 ink = vec3(0.11, 0.09, 0.14);
      vec3 ash = vec3(0.22, 0.18, 0.16);
      vec3 blood = vec3(0.90, 0.08, 0.18);
      vec3 col = mix(ash, ink, oFill(tri));
      col = mix(col, vec3(0.10, 0.08, 0.12), oFill(mouth));
      return mix(col, blood, oLine(tri, 1.8) * 0.7);
    }`, "manhwaShrineJaw(p, t)"),

  M("manhwaFingerCut", F, "Two-finger dismantle: paired slash SDFs, glass crack, ash hall",
    `vec3 manhwaFingerCut(vec2 p, float t){
      vec2 a1 = vec2(0.10, 0.72), b1 = vec2(1.20, 0.28);
      vec2 a2 = a1 + vec2(0.0, -0.06), b2 = b1 + vec2(0.0, -0.06);
      float s1 = oSeg(p, a1, b1, 0.010);
      float s2 = oSeg(p, a2, b2, 0.008);
      float jag = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 o = mix(a1, b1, 0.15 + fi * 0.16);
        jag = max(jag, oSeg(p, o, o + vec2(0.04, -0.10), 0.004));
      }
      vec3 ash = vec3(0.16, 0.14, 0.12);
      vec3 glass = vec3(0.42, 0.40, 0.44);
      vec3 blood = vec3(0.90, 0.08, 0.18);
      vec3 c = mix(ash, glass, oFbm(p * 4.0) * 0.25);
      c = mix(c, blood, max(s1, s2));
      return mix(c, vec3(0.12, 0.10, 0.14), jag * 0.7);
    }`, "manhwaFingerCut(p, t)"),

  M("manhwaBlockShear", F, "Unscheduled city blocks shear: hard rects sliding off, one blood seam",
    `vec3 manhwaBlockShear(vec2 p, float t){
      float col = floor(p.x * 6.0);
      float row = floor(p.y * 4.0);
      float shear = (oH21(vec2(col, row)) - 0.5) * 0.18 * sin(t * 0.8 + col);
      vec2 q = vec2(p.x, p.y - shear);
      float gx = abs(fract(q.x * 6.0) - 0.5);
      float gy = abs(fract(q.y * 4.0) - 0.5);
      float mortar = oLine(min(gx, gy) - 0.46, 1.5);
      float keep = step(0.35, oH21(vec2(col, row + 2.0)));
      vec3 ash = vec3(0.20, 0.18, 0.16);
      vec3 voidc = vec3(0.10, 0.08, 0.12);
      vec3 blood = vec3(0.90, 0.08, 0.18);
      vec3 c = mix(voidc, ash, keep);
      c = mix(c, vec3(0.12, 0.10, 0.14), mortar * keep);
      return mix(c, blood, mortar * (1.0 - keep) * 0.65);
    }`, "manhwaBlockShear(p, t)"),
];
