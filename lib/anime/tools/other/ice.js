import { defineModule as M } from "./kit.glsl.js";

const F = "ice";

export const ICE = [
  M("iceIglooBlock", F, "Igloo blocks: stacked snow bricks, blue-violet shadow, Vinland home",
    `vec3 iceIglooBlock(vec2 p, float t){
      vec2 c = vec2(0.70, 0.42);
      float dome = length((p - c) * vec2(1.0, 1.15)) - 0.28;
      float door = oBox(p, vec2(0.62, 0.18), vec2(0.78, 0.36));
      vec2 gv = floor((p - vec2(0.42, 0.18)) * vec2(6.0, 4.0));
      float joint = oLine(abs(fract(p.x * 6.0) - 0.5) - 0.46, 1.3)
                 + oLine(abs(fract(p.y * 4.0 + 0.5 * mod(gv.x, 2.0)) - 0.5) - 0.46, 1.3);
      vec3 snow = vec3(0.86, 0.84, 0.80);
      vec3 shade = vec3(0.42, 0.48, 0.62);
      vec3 c0 = mix(shade, snow, 0.45 + 0.4 * (p.y - 0.2));
      vec3 col = mix(vec3(0.55, 0.68, 0.78), c0, oFill(dome) * (1.0 - door));
      return mix(col, shade, joint * oFill(dome) * (1.0 - door) * 0.45);
    }`, "iceIglooBlock(p, t)"),

  M("iceFjordDawn", F, "Fjord dawn: #7fc8f8 to #f3c98a, watercolor paper, no fight",
    `vec3 iceFjordDawn(vec2 p, float t){
      float el = p.y - 0.40;
      float w = fwidth(el) + 1e-4;
      vec3 dawn = mix(vec3(0.50, 0.78, 0.90), vec3(0.86, 0.72, 0.48), clamp(p.x * 0.4 + 0.3, 0.0, 1.0));
      vec3 water = mix(vec3(0.22, 0.40, 0.52), vec3(0.40, 0.62, 0.70), oFbm(p * vec2(4.0, 10.0)));
      vec3 paper = vec3(0.86, 0.82, 0.72);
      vec3 c = mix(water, dawn, smoothstep(-w, w, el));
      float fiber = oVn(vec2(p.x * 14.0, p.y * 3.0));
      return mix(c, paper, fiber * 0.12);
    }`, "iceFjordDawn(p, t)"),

  M("iceSealPlinth", F, "Seal-statue plinth under the igloo: bronze block, pup mass, snow contact",
    `vec3 iceSealPlinth(vec2 p, float t){
      float base = oBox(p, vec2(0.54, 0.16), vec2(0.90, 0.34));
      float body = oFill(length((p - vec2(0.72, 0.46)) * vec2(1.15, 0.85)) - 0.13);
      float head = oFill(length((p - vec2(0.72, 0.60)) * vec2(1.1, 1.0)) - 0.07);
      vec3 snow = vec3(0.82, 0.84, 0.86);
      vec3 bronze = vec3(0.50, 0.36, 0.22);
      vec3 seal = vec3(0.28, 0.26, 0.32);
      vec3 c = mix(snow * 0.62, bronze, base);
      c = mix(c, seal, max(body, head));
      float contact = exp(-pow((p.y - 0.16) * 18.0, 2.0)) * exp(-pow((p.x - 0.72) * 4.0, 2.0));
      return mix(c, vec3(0.36, 0.40, 0.50), contact * 0.35);
    }`, "iceSealPlinth(p, t)"),

  M("icePaperWash", F, "Yukimura watercolor wash: paper #e8dcc8, pigment bloom, no impact lines",
    `vec3 icePaperWash(vec2 p, float t){
      float bloom = oFbm(p * 3.2);
      float bleed = oRidge(p * 2.4 + 1.3);
      vec3 paper = vec3(0.91, 0.86, 0.78);
      vec3 pigment = vec3(0.52, 0.62, 0.70);
      vec3 ink = vec3(0.14, 0.12, 0.16);
      vec3 c = mix(paper, pigment, bloom * 0.35);
      c = mix(c, ink, oBand(bleed, 0.62, 0.74) * 0.12);
      float runoff = oFbm(vec2(p.x * 2.0, p.y * 8.0));
      return mix(c, pigment, oBand(runoff, 0.58, 0.70) * 0.18);
    }`, "icePaperWash(p, t)"),

  M("iceBeaconGold", F, "Eleven beacons: small gold flames on snow, home dock, no switch",
    `vec3 iceBeaconGold(vec2 p, float t){
      vec3 snow = vec3(0.80, 0.82, 0.84);
      vec3 shade = vec3(0.40, 0.48, 0.60);
      vec3 gold = vec3(0.86, 0.68, 0.30);
      vec3 c = mix(shade, snow, 0.4 + 0.45 * p.y);
      for (int i = 0; i < 11; i++) {
        float fi = float(i);
        vec2 s = vec2(0.16 + fi * 0.10, 0.22 + 0.04 * sin(fi * 1.7));
        float d = length(p - s);
        float flame = oFill(d - 0.018) + 0.45 * oFill(length((p - s - vec2(0.0, 0.02)) * vec2(1.6, 0.7)) - 0.016);
        float flicker = 0.7 + 0.3 * sin(t * 6.0 + fi);
        c = mix(c, gold, flame * flicker * 0.75);
      }
      return c;
    }`, "iceBeaconGold(p, t)"),
];
