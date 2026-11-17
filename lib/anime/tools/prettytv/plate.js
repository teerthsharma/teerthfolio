// prettytv plate: banded sky, soft window light, watercolour paper wash, the set half of the studio look.
import { defineModule as D } from "./define.js";

export const PLATE = [
  D({
    name: "ptvSkyBands", doc: "sky kept in bands: a posterised zenith-to-horizon gradient with flat cumulus lit on top and cool underneath",
    uniforms: { uPtvSkyBands: 7, uPtvSkyDusk: 0.35 },
    draws: "A blue sky stepping down in seven flat bands to a pale warm horizon, with flat white clouds drifting, bright on top edges and cool grey underneath.",
    use: "plate", params: "uPtvSkyBands = number of gradient bands (3 to 7); uPtvSkyDusk = 0 midday blue to 1 violet-and-apricot dusk",
    demoExpr: "ptvSkyBands(p, t)",
    glsl: `
float ptvSkyCloud(vec2 q, float y) { return ptvAA(ptvFbm(q) + (y - 0.5) * 0.35, 0.62); }
vec3 ptvSkyBands(vec2 p, float t) {
  float y = clamp(p.y, 0.0, 1.0);
  vec3 zen = mix(vec3(0.20, 0.38, 0.70), vec3(0.28, 0.24, 0.52), uPtvSkyDusk);
  vec3 hor = mix(vec3(0.84, 0.88, 0.90), vec3(0.96, 0.66, 0.46), uPtvSkyDusk);
  vec3 c = mix(hor, zen, ptvPost(y, uPtvSkyBands));
  vec2 q = vec2(p.x * 2.2 + ptvHold(t, 12.0) * 0.05, y * 5.0);
  float cl = ptvSkyCloud(q, y) * ptvAA(y, 0.22);
  float top = cl * (1.0 - ptvSkyCloud(q + vec2(0.0, 0.35), y));
  float bot = cl * (1.0 - ptvSkyCloud(q - vec2(0.0, 0.45), y));
  vec3 cc = vec3(0.86, 0.88, 0.94);
  cc = mix(cc, ptvWarm(vec3(0.97, 0.95, 0.92), 0.9), top);
  cc = mix(cc, ptvCool(cc * 0.78, 0.8), bot);
  return ptvCap(mix(c, cc, cl));
}`,
  }),
  D({
    name: "ptvWindowLight", doc: "soft window light: a sheared cross-barred light patch on a wall with a two-band penumbra and held dust glints",
    uniforms: { uPtvWinSkew: 0.45, uPtvWinCool: 0.5 },
    draws: "A wall in three flat grey-beige bands with a slanted pane of daylight falling on it, split by a window cross, a soft outer edge and a few dust sparkles.",
    use: "plate", params: "uPtvWinSkew = how far the patch slants; uPtvWinCool = 0 warm afternoon to 1 cool overcast light",
    demoExpr: "ptvWindowLight(p, t)",
    glsl: `
vec3 ptvWindowLight(vec2 p, float t) {
  vec3 wall = mix(vec3(0.46, 0.42, 0.44), vec3(0.62, 0.58, 0.56), ptvPost(p.y, 3.0));
  vec2 q = vec2(p.x - p.y * uPtvWinSkew, p.y);
  vec2 c = vec2(0.62, 0.50);
  float pen = ptvFill(ptvBox(q, c, vec2(0.44, 0.36)));
  float box = ptvFill(ptvBox(q, c, vec2(0.40, 0.32)));
  float bars = max(ptvFill(abs(q.x - c.x) - 0.014), ptvFill(abs(q.y - c.y) - 0.014));
  float core = box * (1.0 - bars);
  vec3 lc = mix(vec3(0.95, 0.86, 0.70), vec3(0.82, 0.90, 0.97), uPtvWinCool);
  vec3 col = mix(wall, wall * 0.5 + lc * 0.55, pen * 0.35);
  col = mix(col, wall * 0.4 + lc * 0.60, core);
  float h = ptvHold(t, 6.0);
  float sp = step(0.985, ptvH21(floor(p * 60.0) + vec2(h * 7.0, h * 3.0)));
  col = mix(col, vec3(0.90, 0.90, 0.86), sp * core);
  return ptvCap(col);
}`,
  }),
  D({
    name: "ptvPaperWash", doc: "watercolour on cold-press paper: pooled dark rim, granulation, a backrun bloom, a faint bleed past the edge",
    uniforms: { uPtvPaperWet: 0.6, uPtvPaperTooth: 0.5 },
    draws: "A pale blue-violet watercolour blot on cream paper, its edge pooled darker, specks of pigment caught in the paper tooth, a lighter bloom inside, drying darker over six seconds.",
    use: "plate", params: "uPtvPaperWet = how ragged and bleeding the edge is, 0 to 1; uPtvPaperTooth = granulation strength, 0 to 1",
    demoExpr: "ptvPaperWash(p, t)",
    glsl: `
vec3 ptvPaperWash(vec2 p, float t) {
  float tooth = ptvVn(p * 170.0) * 0.6 + ptvVn(p * 85.0 + 3.1) * 0.4;
  vec3 paper = mix(vec3(0.84, 0.80, 0.74), vec3(0.91, 0.88, 0.82), ptvAA(tooth, 0.45));
  paper *= 1.0 - 0.04 * ptvAA(ptvFbm(p * 3.0), 0.6);
  vec2 c = vec2(0.72, 0.50);
  float wob = ptvFbm(p * 4.0 + uPtvSeed) - 0.5;
  float d = length((p - c) * vec2(1.0, 1.25)) - 0.30 - wob * 0.18 * (0.5 + uPtvPaperWet);
  float inside = ptvFill(d);
  float dry = clamp(t / 6.0, 0.0, 1.0);
  float rim = inside * (1.0 - ptvAA(-d, 0.014));
  vec3 pig = vec3(0.36, 0.46, 0.70);
  float gran = ptvAA(tooth + (ptvFbm(p * 9.0) - 0.5) * 0.3, 0.52);
  vec3 wash = mix(paper, pig, 0.55) * (1.0 - 0.18 * gran * uPtvPaperTooth);
  float d2 = length(p - c - vec2(0.08, 0.06)) - 0.12 - wob * 0.10;
  wash = mix(wash, mix(paper, pig, 0.30), ptvFill(d2));
  wash = mix(wash, pig * 0.72, ptvLine(d2, 2.0) * 0.6);
  wash = mix(wash, pig * 0.78, rim * (0.5 + 0.5 * dry));
  float bleed = (1.0 - inside) * (1.0 - ptvAA(d, 0.03)) * 0.18 * uPtvPaperWet;
  return ptvCap(mix(mix(paper, pig, bleed), wash, inside));
}`,
  }),
  D({
    name: "ptvBokehMotes", doc: "floating bokeh motes: three layers of ring-edged discs drifting up on twos, held in cells so nothing pops",
    uniforms: { uPtvBokehDensity: 0.55, uPtvBokehSize: 0.07 },
    draws: "Soft pale discs with a brighter ring, in warm and cool white, floating slowly upward over a dark teal-violet backdrop in three sizes.",
    use: "screen", params: "uPtvBokehDensity = share of cells holding a disc, 0 to 1; uPtvBokehSize = disc radius in frame heights",
    demoExpr: "ptvBokehMotes(p, t)",
    glsl: `
vec3 ptvBokehMotes(vec2 p, float t) {
  vec3 c = mix(vec3(0.07, 0.10, 0.16), vec3(0.16, 0.20, 0.30), ptvPost(p.y, 4.0));
  float drift = ptvHold(t, 12.0) * 0.03;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float sc = 3.0 + 2.0 * fi;
    vec2 sp = p * sc + vec2(0.17 * fi, -drift * sc * (1.0 + 0.5 * fi));
    vec2 cell = floor(sp);
    float h1 = ptvH21(cell + fi * 17.0);
    float h2 = ptvH21(cell + 31.0 + fi);
    float h3 = ptvH21(cell + 57.0 + fi);
    float h4 = ptvH21(cell + 83.0 + fi);
    float on = step(h1, uPtvBokehDensity);
    vec2 ctr = cell + 0.3 + 0.4 * vec2(h2, h3);
    float rr = clamp(uPtvBokehSize * sc * (0.6 + 0.8 * h4) * (1.0 + 0.3 * fi), 0.05, 0.28);
    float d = length(sp - ctr) - rr;
    vec3 tint = mix(vec3(1.0, 0.92, 0.78), vec3(0.78, 0.90, 1.0), h3);
    c += tint * on * (ptvFill(d) * 0.13 + ptvLine(d, 1.6) * 0.28);
  }
  return ptvCap(c);
}`,
  }),
];
