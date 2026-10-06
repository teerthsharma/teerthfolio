import { defineModule as M } from "./kit.glsl.js";

const F = "manga";

export const MANGA = [
  M("mangaScreentone", F, "Pierrot 2000s screentone: hex-dot plate, monochrome + one purple, not manhwa cut",
    `vec3 mangaScreentone(vec2 p, float t){
      float v = clamp(p.y * 0.65 + oFbm(p * 2.6) * 0.35, 0.0, 1.0);
      float dots = oTone(p, 1.0 - v);
      vec3 paper = vec3(0.86, 0.82, 0.74);
      vec3 ink = vec3(0.12, 0.10, 0.16);
      vec3 purple = vec3(0.42, 0.22, 0.56);
      vec3 c = mix(paper, ink, dots * 0.75);
      return mix(c, purple, oBand(v, 0.62, 0.78) * 0.35);
    }`, "mangaScreentone(p, t)"),

  M("aizenStillDesert", F, "Las Noches still: desert #f4e8c8, sky #0a0614, hard horizon, no motion boil",
    `vec3 aizenStillDesert(vec2 p, float t){
      float el = p.y - 0.36;
      float w = fwidth(el) + 1e-4;
      vec3 sand = vec3(0.86, 0.80, 0.70);
      vec3 dune = mix(sand, vec3(0.62, 0.52, 0.40), oFbm(p * vec2(3.0, 1.2)) * 0.45);
      vec3 sky = mix(vec3(0.06, 0.04, 0.10), vec3(0.16, 0.10, 0.22), clamp(p.y, 0.0, 1.0));
      vec3 c = mix(dune, sky, smoothstep(-w, w, el));
      float throne = oBox(p, vec2(0.58, 0.22), vec2(0.86, 0.40));
      return mix(c, vec3(0.72, 0.66, 0.54), throne * (1.0 - oAA(el, 0.0)));
    }`, "aizenStillDesert(p, t)"),

  M("kyokaSmear", F, "Kyoka Suigetsu smear: offset still + missing-step gap, illusion snap",
    `vec3 kyokaSmear(vec2 p, float t){
      float snap = step(0.5, fract(t * 0.35));
      vec2 off = vec2(0.018, -0.008) * snap;
      float v = oFbm((p + off) * 3.2);
      vec3 paper = vec3(0.84, 0.78, 0.68);
      vec3 ink = vec3(0.12, 0.08, 0.16);
      vec3 c = mix(ink, paper, oAA(v, 0.48));
      float gap = oBox(p, vec2(0.62, 0.30), vec2(0.82, 0.36));
      vec3 sky = vec3(0.06, 0.04, 0.10);
      return mix(c, sky, gap);
    }`, "kyokaSmear(p, t)"),

  M("mangaPanelGap", F, "Leading-gap as missing throne step: panel lattice + one absent tread",
    `vec3 mangaPanelGap(vec2 p, float t){
      vec2 q = p * vec2(3.2, 2.4);
      vec2 fw = fwidth(q) + 1e-6;
      vec2 g = abs(fract(q - 0.5) - 0.5) / fw;
      float lattice = (1.0 - smoothstep(0.5, 1.5, min(g.x, g.y))) * (1.0 - smoothstep(0.25, 0.5, max(fw.x, fw.y)));
      float stepn = floor((0.70 - p.y) * 6.0);
      float missing = step(abs(stepn - 2.0), 0.1) * oBox(p, vec2(0.48, 0.34), vec2(0.96, 0.44));
      vec3 paper = vec3(0.84, 0.80, 0.72);
      vec3 ink = vec3(0.12, 0.10, 0.16);
      vec3 c = mix(paper, ink, lattice * 0.55);
      return mix(c, vec3(0.06, 0.04, 0.10), missing);
    }`, "mangaPanelGap(p, t)"),

  M("mangaMonoPurple", F, "Ainz-cameo manga: grey plates, one purple panel, screentone grain",
    `vec3 mangaMonoPurple(vec2 p, float t){
      float panel = oBox(p, vec2(0.18, 0.22), vec2(1.22, 0.82));
      float split = oAA(p.x, 0.72);
      float tone = oTone(p, 0.55);
      vec3 paper = vec3(0.82, 0.80, 0.76);
      vec3 ink = vec3(0.14, 0.12, 0.16);
      vec3 purple = vec3(0.46, 0.20, 0.58);
      vec3 left = mix(paper, ink, tone * 0.7);
      vec3 right = mix(purple * 0.45, purple, tone * 0.5);
      vec3 c = mix(left, right, split);
      return mix(vec3(0.10, 0.08, 0.12), c, panel);
    }`, "mangaMonoPurple(p, t)"),
];
