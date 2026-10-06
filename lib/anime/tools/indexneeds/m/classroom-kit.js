import { defineModule } from "./define.js";

export const CLASSROOM_KIT = defineModule({
  name: "classroom-kit",
  doc: "Class 1-D still: cold fluoro troffers, venetian winter pane, beech desk, paper 50, red-blazer grade",
  glsl: /* glsl */ `
  vec3 classroomKit(vec2 p, float t) {
    float hold = imHold(t, 2.0);
    vec3 wall = mix(IM_WALL * 0.82, IM_CREAM, imAA(p.y, 0.40));
    float ceil = imAA(p.y, 0.86);
    wall = mix(wall, IM_FLUORO_DIM, ceil * 0.55);
    float board = imBand(p.y, 0.54, 0.86) * imAA(p.x, 0.34);
    float tooth = imFbm(p * 18.0) * 0.10 + imVn(p * 40.0) * 0.04;
    wall = mix(wall, IM_BOARD * (0.92 + tooth), board * 0.94);
    float rail = imLine(p.y - 0.55, 1.8) * imAA(p.x, 0.34);
    wall = mix(wall, IM_BEECH_DARK, rail * 0.55);
    float win = (1.0 - imAA(p.x, 0.30)) * imBand(p.y, 0.26, 0.90);
    vec3 glass = mix(IM_WINTER, IM_DUSK, imAA(p.y, 0.55));
    float slat = imVenetian(p + vec2(0.0, 0.01), 16.0);
    glass = mix(glass, glass * 0.42 + IM_FLUORO_DIM * 0.18, slat * 0.72);
    float mullion = imLine(p.x - 0.15, 1.8) + imLine(p.y - 0.58, 1.6);
    glass = mix(glass, IM_INK * 2.4, mullion * 0.28);
    wall = mix(wall, glass, win * 0.90);
    float desk = 1.0 - imAA(p.y, 0.40);
    vec3 wood = imWood(p);
    float sheen = imAA(p.y, 0.18) * 0.08;
    wood = mix(wood, IM_FLUORO * 0.55, sheen * desk);
    float slatFloor = imVenetian(vec2(p.x * 0.35 + p.y * 0.2, p.x * 0.15 + p.y), 11.0);
    wood = mix(wood * vec3(1.04, 1.02, 0.96), wood * vec3(0.72, 0.74, 0.80), slatFloor);
    wall = mix(wall, wood, desk * 0.96);
    vec2 po = vec2(0.62, 0.22);
    float sheet = imFill(imBox(p, po, vec2(0.20, 0.11)));
    vec3 paper = imPaper(p);
    float mark = imFill(imFifty(p, po + vec2(0.01, 0.01), 0.38));
    float ring = imFill(abs(length((p - po - vec2(0.01, 0.01)) / 0.55) - 0.22) - 0.012);
    paper = mix(paper, IM_RED50, max(mark, ring) * 0.88);
    wall = mix(wall, paper, sheet * desk);
    wall = mix(wall, IM_INK * 2.6, imLine(imBox(p, po, vec2(0.20, 0.11)), 1.3) * desk * 0.30);
    for (int i = 0; i < 3; i++) {
      float x = 0.28 + float(i) * 0.32;
      float box = imBox(p, vec2(x, 0.935), vec2(0.14, 0.028));
      wall = mix(wall, IM_FLUORO_DIM * 0.85, imFill(box) * 0.55);
      wall = mix(wall, IM_FLUORO * 0.80, imFill(imBox(p, vec2(x, 0.935), vec2(0.11, 0.012))) * 0.70);
      wall = mix(wall, IM_INK * 3.0, imLine(box, 1.6) * 0.32);
    }
    float hum = 0.92 + 0.08 * step(0.5, fract(hold * 0.5 + 0.17));
    wall = mix(wall, wall * vec3(0.96, 1.02, 1.00) * hum, ceil * 0.35);
    vec2 bc = vec2(1.02, 0.48);
    float cover = imFill(imEll(p, bc, vec2(0.16, 0.28)));
    vec3 N = normalize(vec3(p - bc, 0.22));
    float fluoro = 0.5 + 0.5 * dot(N, normalize(vec3(-0.15, 0.82, 0.55)));
    float winf = 0.5 + 0.5 * dot(N, normalize(vec3(-0.85, 0.12, 0.28)));
    float h = clamp(fluoro * 0.68 + winf * 0.32, 0.0, 1.0);
    vec3 wool = imWool(p, h);
    wall = mix(wall, wool, cover * (1.0 - desk * 0.15));
    float collar = imFill(imEll(p, bc + vec2(0.0, 0.10), vec2(0.08, 0.05))) * imAA(p.y, 0.50);
    wall = mix(wall, mix(IM_COLLAR * 0.78, IM_COLLAR, imAA(h, 0.55)), collar * cover);
    float ribbon = imFill(imEll(p, bc + vec2(0.0, 0.05), vec2(0.028, 0.018)));
    ribbon = max(ribbon, imFill(imSeg(p, bc + vec2(0.0, 0.04), bc + vec2(-0.06, -0.06), 0.010)));
    ribbon = max(ribbon, imFill(imSeg(p, bc + vec2(0.0, 0.04), bc + vec2(0.06, -0.06), 0.010)));
    wall = mix(wall, mix(IM_RIBBON * 0.7, IM_RIBBON, imAA(h, 0.50)), ribbon * cover);
    float head = imFill(imEll(p, bc + vec2(0.0, 0.22), vec2(0.075, 0.085)));
    wall = mix(wall, imSkin(h), head * cover);
    float fringe = imFill(imEll(p, bc + vec2(0.0, 0.26), vec2(0.080, 0.040)));
    wall = mix(wall, mix(IM_FRINGE, vec3(0.34, 0.22, 0.16), imAA(h, 0.70)), fringe * cover);
    float lid = imFill(imEll(p, bc + vec2(-0.022, 0.215), vec2(0.018, 0.007))) + imFill(imEll(p, bc + vec2(0.024, 0.215), vec2(0.018, 0.007)));
    wall = mix(wall, IM_INK * 2.2, lid * head * 0.70);
    float tea = imFill(imEll(p, vec2(1.22, 0.56), vec2(0.08, 0.22)));
    wall = mix(wall, IM_CHABA, tea * 0.45 * imAA(p.x, 1.10));
    wall += (imH21(floor(p * 86.0 + hold * 3.0)) - 0.5) * 0.014;
    return wall;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(classroomKit(p, t)); }`,
});
