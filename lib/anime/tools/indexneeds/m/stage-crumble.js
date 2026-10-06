import { defineModule } from "./define.js";

export const STAGE_CRUMBLE = defineModule({
  name: "stage-crumble",
  doc: "stage floor tiles crack and drop: hashed slabs, fwidth lips, dust between joints",
  glsl: /* glsl */ `
  vec3 stageCrumble(vec2 p, float t) {
    float hold = imHold(t, 6.0);
    vec3 sky = mix(vec3(0.42, 0.36, 0.32), vec3(0.22, 0.20, 0.28), imAA(p.y, 0.55));
    float drop = 0.04 + 0.06 * fract(hold * 0.37);
    vec2 gp = vec2(p.x * 5.2, (p.y + drop * step(p.y, 0.42)) * 3.4);
    vec2 id = floor(gp);
    vec2 f = fract(gp);
    float n = imH21(id);
    float fall = step(0.62, n) * imAA(fract(hold * 0.5 + n), 0.35) * 0.08;
    vec2 q = f - 0.5;
    q.y -= fall;
    float tile = imBox(q, vec2(0.0), vec2(0.42, 0.38));
    vec3 stone = mix(vec3(0.42, 0.34, 0.28), vec3(0.58, 0.48, 0.38), imAA(imFbm(id + f * 3.0), 0.5));
    stone = mix(stone, IM_UMBER, n * 0.22);
    vec3 col = mix(sky, stone, imFill(tile) * (1.0 - imAA(p.y, 0.58)));
    float joint = imLine(min(abs(f.x - 0.5), abs(f.y - 0.5)) - 0.46, 1.4);
    col = mix(col, IM_INK, joint * (1.0 - imAA(p.y, 0.56)) * 0.45);
    vec2 o = vec2(0.68, 0.28);
    float crack = 1e2;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float a = 0.35 + fi * 0.42 + n * 0.2;
      vec2 dir = vec2(cos(a), sin(a) * 0.45);
      crack = min(crack, imSeg(p, o, o + dir * (0.18 + 0.12 * imH21(vec2(fi, 2.0))), 0.004));
    }
    col = mix(col, IM_INK, imFill(crack) * (1.0 - imAA(p.y, 0.50)) * 0.75);
    float grit = imVn(p * 40.0 + hold) * (1.0 - imAA(p.y, 0.36));
    return mix(col, IM_UMBER, grit * 0.12);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(stageCrumble(p, t)); }`,
});
