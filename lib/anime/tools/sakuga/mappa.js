// Family — MAPPA diffusion. Digital milk, cyan-magenta night. Not Ufotable shafts.
import { T } from "./define.js";

const F = "mappa";

export const MAPPA = [
  T("mappaDiffuseSoft", F, "MAPPA milk: lifted highlights, cyan-magenta split, no hard god-rays",
    `vec3 mappaDiffuseSoft(vec2 p, float t) {
      float hold = skTwos(t);
      float h = skNdL(p);
      vec3 shade = mix(SK_MAPPA_SHADE, SK_MAPPA_CYAN * 0.55, 0.35);
      vec3 lit = mix(SK_MAPPA_SKIN, SK_MAPPA_CYAN * 0.9, 0.18);
      vec3 body = mix(shade, lit, skAA(h, 0.48));
      float milk = smoothstep(0.62, 0.92, h);
      body = mix(body, mix(body, SK_PAPER, 0.42), milk * 0.70);
      float edge = 1.0 - skCover(p + vec2(0.006, 0.0)) * skCover(p - vec2(0.006, 0.0));
      vec3 chroma = vec3(body.r * 1.04, body.g, body.b * 1.06);
      vec3 col = mix(skPaper(p) * vec3(0.72, 0.70, 0.76), body, skCover(p));
      col = mix(col, chroma, edge * skCover(p) * 0.35);
      return col * (1.0 + skGrain(p, hold) * 0.016);
    }`, "mappaDiffuseSoft(p, t)"),

  T("mappaNightHaze", F, "MAPPA night: cyan city plate, magenta air as grade, haze is not volume fog",
    `vec3 mappaNightHaze(vec2 p, float t) {
      float hold = skTwos(t);
      vec3 night = mix(SK_FILL, SK_MAPPA_CYAN * 0.7, skAA(p.y, 0.38));
      night = mix(night, SK_MAPPA_MAG * 0.55, smoothstep(0.62, 1.0, p.y) * 0.55);
      float haze = smoothstep(0.15, 0.75, p.y) * 0.28;
      vec3 air = mix(SK_MAPPA_CYAN, SK_MAPPA_MAG, skAA(p.x, 0.55));
      vec3 col = mix(night, air, haze);
      float h = skNdL(p);
      vec3 body = mix(SK_MAPPA_SHADE, SK_MAPPA_SKIN * 0.85, skAA(h, 0.50));
      col = mix(col, body, skCover(p));
      return col * (1.0 + skGrain(p, hold) * 0.02);
    }`, "mappaNightHaze(p, t)"),

  T("mappaSkinLift", F, "MAPPA porcelain: wrap fill too high, skin lifted, terminator almost gone",
    `vec3 mappaSkinLift(vec2 p, float t) {
      float h = skNdL(p);
      float wrap = h * 0.55 + 0.38;
      vec3 deep = SK_MAPPA_SHADE * vec3(1.05, 0.86, 0.90);
      vec3 sss = vec3(0.70, 0.42, 0.42);
      vec3 lit = SK_MAPPA_SKIN;
      vec3 skin = mix(mix(deep, sss, skAA(wrap, 0.42)), lit, skAA(h, 0.78));
      float milk = smoothstep(0.70, 0.95, h);
      skin = mix(skin, mix(skin, vec3(0.88, 0.82, 0.78), 0.5), milk);
      vec3 paper = skPaper(p) * vec3(0.80, 0.76, 0.82);
      return mix(paper, skin, skCover(p));
    }`, "mappaSkinLift(p, t)"),
];
