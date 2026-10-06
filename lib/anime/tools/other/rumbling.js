import { defineModule as M } from "./kit.glsl.js";

const F = "rumbling";

export const RUMBLING = [
  M("rumbleFrescoGround", F, "Early-Renaissance gold-ground plaster: egg-tempera bands, not manga",
    `vec3 rumbleFrescoGround(vec2 p, float t){
      float plaster = oFbm(p * 5.2 + vec2(0.0, t * 0.02));
      float tooth = oRidge(p * 9.0 + 1.7);
      vec3 ground = vec3(0.72, 0.54, 0.22);
      vec3 paper = vec3(0.78, 0.70, 0.58);
      vec3 graphite = vec3(0.22, 0.18, 0.14);
      vec3 c = oMix3(plaster, graphite, paper, ground);
      c = mix(c, paper * 0.88, tooth * 0.22);
      float horizon = oAA(p.y, 0.38);
      return mix(c * 0.78, c, horizon);
    }`, "rumbleFrescoGround(p, t)"),

  M("rumbleTitanSteam", F, "Vertical steam columns: stacked fbm tongues, Giotto weight, no cel speedlines",
    `vec3 rumbleTitanSteam(vec2 p, float t){
      vec2 q = vec2(p.x * 3.4, p.y * 1.1 - t * 0.18);
      float col = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float cx = 0.18 + fi * 0.24 + 0.04 * sin(t * 0.4 + fi);
        float tongue = oFbm(vec2((p.x - cx) * 8.0, q.y + fi * 1.3));
        float mask = exp(-pow((p.x - cx) * 7.0, 2.0)) * smoothstep(0.08, 0.72, p.y);
        col += tongue * mask;
      }
      vec3 dust = vec3(0.62, 0.52, 0.40);
      vec3 steam = vec3(0.80, 0.74, 0.64);
      vec3 earth = vec3(0.28, 0.20, 0.14);
      return mix(earth, mix(dust, steam, oAA(col, 0.42)), clamp(col, 0.0, 1.0));
    }`, "rumbleTitanSteam(p, t)"),

  M("rumbleEarthMarch", F, "Perspective earth-march tiles: u=x/(y+eps), fresco cracks between slabs",
    `vec3 rumbleEarthMarch(vec2 p, float t){
      float y = max(p.y, 0.04), u = (p.x - 0.72) / y, v = 1.0 / y + t * 0.05;
      float slab = abs(fract(u * 2.2) - 0.5);
      float row = abs(fract(v * 1.6) - 0.5);
      float crack = oLine(min(slab, row) - 0.46, 1.6);
      float grain = oFbm(vec2(u * 3.0, v * 2.0));
      vec3 ochre = vec3(0.55, 0.38, 0.20);
      vec3 umber = vec3(0.28, 0.18, 0.12);
      vec3 c = mix(umber, ochre, grain);
      return mix(c, O_UMBER, crack * 0.7);
    }`, "rumbleEarthMarch(p, t)"),

  M("rumbleWallFace", F, "Crowned wall face: large oval + gold-leaf brow, charcoal paper",
    `vec3 rumbleWallFace(vec2 p, float t){
      vec2 c = vec2(0.70, 0.58), q = (p - c) * vec2(1.15, 1.45);
      float face = length(q) - 0.28;
      float brow = abs(q.y + 0.06) - 0.018 + 0.04 * abs(q.x);
      float crown = abs(p.y - 0.78) - 0.035;
      float crownX = abs(p.x - 0.70) - 0.22;
      vec3 paper = vec3(0.76, 0.68, 0.56);
      vec3 stone = vec3(0.42, 0.32, 0.22);
      vec3 leaf = vec3(0.78, 0.58, 0.22);
      vec3 col = mix(paper * 0.55, stone, oFill(face));
      col = mix(col, leaf, oFill(max(crown, crownX)) * oFill(face + 0.08));
      col = mix(col, O_UMBER, oFill(brow) * oFill(face));
      return col;
    }`, "rumbleWallFace(p, t)"),

  M("rumbleFrescoDust", F, "Pigment dust: hashed discs over tempera, gold ground peeking",
    `vec3 rumbleFrescoDust(vec2 p, float t){
      vec2 gv = floor(p * 22.0), f = fract(p * 22.0) - 0.5;
      float keep = step(0.62, oH21(gv + t * 0.0));
      float mag = pow(oH21(gv + 3.0), 2.2);
      float disc = oFill(length(f) - (0.08 + 0.12 * mag)) * keep;
      vec3 plaster = vec3(0.74, 0.66, 0.52);
      vec3 gold = vec3(0.70, 0.52, 0.20);
      vec3 dust = vec3(0.50, 0.38, 0.24);
      vec3 c = mix(plaster, gold, oFbm(p * 3.4) * 0.35);
      return mix(c, dust, disc * 0.75);
    }`, "rumbleFrescoDust(p, t)"),

  M("rumbleGoldLeafScratch", F, "Gold-leaf scratches on the Wall: thin fwidth cuts, graphite lip",
    `vec3 rumbleGoldLeafScratch(vec2 p, float t){
      vec3 plaster = vec3(0.68, 0.56, 0.38);
      vec3 leaf = vec3(0.80, 0.62, 0.24);
      float field = oRidge(p * 4.6);
      vec3 c = mix(plaster, leaf, oAA(field, 0.55));
      float acc = 0.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        vec2 a = vec2(0.12 + 0.16 * fi, 0.22 + 0.08 * oH21(vec2(fi, 1.0)));
        vec2 b = a + vec2(0.18, 0.42 + 0.1 * sin(fi + 0.4));
        acc += oSeg(p, a, b, 0.004);
      }
      return mix(c, O_UMBER * 1.4, acc * 0.85);
    }`, "rumbleGoldLeafScratch(p, t)"),

  M("rumbleCharcoalPaper", F, "Charcoal paper #d4c4b0 with graphite tooth, no black crush",
    `vec3 rumbleCharcoalPaper(vec2 p, float t){
      float fiber = oVn(vec2(p.x * 16.0 + p.y * 2.1, p.y * 3.4));
      float tooth = oFbm(p * 11.0);
      vec3 paper = vec3(0.83, 0.77, 0.69);
      vec3 graphite = vec3(0.23, 0.20, 0.16);
      vec3 c = mix(paper, paper * 0.82, fiber);
      c = mix(c, graphite, (1.0 - tooth) * 0.22);
      float smear = oFbm(p * vec2(2.2, 8.0) + vec2(t * 0.05, 0.0));
      return mix(c, graphite * 1.3, oBand(smear, 0.62, 0.78) * 0.28);
    }`, "rumbleCharcoalPaper(p, t)"),

  M("rumbleTemperaCrack", F, "Egg-tempera craquelure: voronoi lips, umber in the gaps",
    `vec3 rumbleTemperaCrack(vec2 p, float t){
      vec2 v = oVor(p * 6.4);
      float lip = 1.0 - smoothstep(0.0, fwidth(v.y) * 1.1 + 1e-4, v.y);
      float flake = floor(v.x * 5.0) / 5.0;
      vec3 a = vec3(0.62, 0.44, 0.24), b = vec3(0.78, 0.66, 0.46), d = vec3(0.36, 0.26, 0.16);
      vec3 c = mix(d, mix(a, b, flake), 0.85);
      return mix(c, O_UMBER, lip * 0.7);
    }`, "rumbleTemperaCrack(p, t)"),
];
