import { defineModule } from "./define.js";

export const CAMERA_LAW_DIRECTOR = defineModule({
  name: "camera-law-director",
  doc: "director camera law: thirds, action-safe, hold tick, luma bar, L6b silhouette floor",
  glsl: /* glsl */ `
  vec3 cameraLawDirector(vec2 p, float t) {
    float hold = imHold(t, 4.0);
    vec3 scene = mix(IM_FILL, IM_KEY, imAA(p.y, 0.42));
    float fig = imFill(imEll(p, vec2(0.70, 0.40), vec2(0.12, 0.22)));
    scene = mix(scene, imWool(p, 0.55), fig * 0.80);
    float floorY = 0.16;
    scene = mix(scene, IM_UMBER, (1.0 - imAA(p.y, floorY)) * 0.55);
    vec3 col = scene;
    float thirdV = imLine(p.x - 0.333, 1.2) + imLine(p.x - 0.666, 1.2);
    float thirdH = imLine(p.y - 0.333, 1.2) + imLine(p.y - 0.666, 1.2);
    col = mix(col, vec3(0.72, 0.78, 0.70), (thirdV + thirdH) * 0.35);
    float safe = imLine(imBox(p, vec2(0.72, 0.50), vec2(0.58, 0.40)), 1.4);
    col = mix(col, IM_GOLD, safe * 0.40);
    float frame = imLine(imBox(p, vec2(0.72, 0.50), vec2(0.70, 0.48)), 2.0);
    col = mix(col, IM_INK, frame * 0.55);
    float silFloor = imLine(p.y - floorY, 1.8);
    col = mix(col, IM_RED50, silFloor * 0.55);
    float bar = imFill(imBox(p, vec2(0.12, 0.50), vec2(0.018, 0.36)));
    float luma = imLuma(scene);
    float fill = imFill(imBox(p, vec2(0.12, 0.14 + luma * 0.72 * 0.5), vec2(0.014, luma * 0.36)));
    col = mix(col, IM_INK * 2.2, bar * 0.50);
    col = mix(col, mix(IM_WINTER, IM_RED50, step(0.90, luma)), fill);
    float tick = imFill(imBox(p, vec2(1.22, 0.88), vec2(0.10, 0.03)));
    vec3 holdCol = mix(IM_GOLD, IM_RED50, step(0.5, fract(hold)));
    col = mix(col, holdCol, tick * 0.80);
    return col;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(cameraLawDirector(p, t)); }`,
});
