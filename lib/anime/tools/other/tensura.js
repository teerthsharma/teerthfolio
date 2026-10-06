import { defineModule as M } from "./kit.glsl.js";

const F = "tensura";

export const TENSURA = [
  M("tensuraSlimeLens", F, "Ultra-modern slime: SDF blob + water-lens warp, 2024 TV grade, not fresco",
    `vec3 tensuraSlimeLens(vec2 p, float t){
      vec2 c = vec2(0.72, 0.46);
      vec2 q = p - c;
      q += 0.04 * vec2(oFbm(p * 3.0 + t * 0.2), oFbm(p * 3.0 + 4.1));
      float d = length(q * vec2(1.05, 0.88)) - 0.20;
      float ndv = 1.0 - clamp(length(q) / 0.22, 0.0, 1.0);
      vec3 deep = vec3(0.08, 0.28, 0.36);
      vec3 mid = vec3(0.22, 0.62, 0.58);
      vec3 film = vec3(0.62, 0.84, 0.78);
      vec3 c0 = oMix3(ndv, deep, mid, film);
      float rim = oLine(d, 2.0);
      vec3 cave = vec3(0.10, 0.08, 0.22);
      vec3 col = mix(cave, c0, oFill(d));
      return mix(col, film, rim * oFill(d + 0.02) * 0.55);
    }`, "tensuraSlimeLens(p, t)"),

  M("tensuraPredatorMaw", F, "Predator maw at collapse: stacked tooth SDF, cave-pool fill, film bloom sliver",
    `vec3 tensuraPredatorMaw(vec2 p, float t){
      vec2 c = vec2(0.72, 0.50);
      float jaw = abs(p.y - 0.50) - (0.10 + 0.08 * sin(p.x * 8.0 + t));
      float mouth = oFill(max(abs(p.x - 0.72) - 0.32, jaw));
      float teeth = 0.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float x = 0.46 + fi * 0.08;
        float up = length((p - vec2(x, 0.58)) * vec2(3.2, 1.4)) - 0.05;
        float dn = length((p - vec2(x + 0.03, 0.42)) * vec2(3.2, 1.4)) - 0.045;
        teeth = max(teeth, max(oFill(up), oFill(dn)));
      }
      vec3 pool = vec3(0.10, 0.08, 0.25);
      vec3 gum = vec3(0.42, 0.12, 0.22);
      vec3 ivory = vec3(0.80, 0.76, 0.68);
      vec3 col = mix(pool, gum, mouth);
      return mix(col, ivory, teeth * mouth);
    }`, "tensuraPredatorMaw(p, t)"),

  M("tensuraMegiddoBeam", F, "Megiddo: falling light pillars, clean gradient shafts, not smash burst",
    `vec3 tensuraMegiddoBeam(vec2 p, float t){
      vec3 sky = vec3(0.10, 0.08, 0.22);
      vec3 shaft = vec3(0.72, 0.78, 0.86);
      float acc = 0.0;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float x = 0.18 + fi * 0.20 + 0.03 * sin(t * 0.7 + fi);
        float w = 0.018 + 0.01 * oVn(vec2(fi, 2.0));
        float fall = fract(t * 0.25 + fi * 0.13);
        float head = smoothstep(fall + 0.35, fall, p.y);
        acc = max(acc, oFill(abs(p.x - x) - w) * head);
      }
      vec3 c = mix(sky, shaft, acc * 0.75);
      float bloom = exp(-pow((p.y - 0.12) * 4.0, 2.0)) * acc;
      return mix(c, vec3(0.80, 0.82, 0.78), bloom * 0.35);
    }`, "tensuraMegiddoBeam(p, t)"),

  M("tensuraVeldoraSky", F, "Veldora sky: #6b3fa0 storm sheets, clean film bands, no charcoal tooth",
    `vec3 tensuraVeldoraSky(vec2 p, float t){
      float sheet = oFbm(vec2(p.x * 1.6 + t * 0.08, p.y * 3.4));
      float band = oRidge(vec2(p.x * 0.8, p.y * 2.2 - t * 0.05));
      vec3 deep = vec3(0.10, 0.08, 0.25);
      vec3 veld = vec3(0.42, 0.25, 0.63);
      vec3 lit = vec3(0.62, 0.48, 0.78);
      vec3 c = oMix3(sheet, deep, veld, lit);
      return mix(c, lit, oBand(band, 0.58, 0.72) * 0.28);
    }`, "tensuraVeldoraSky(p, t)"),

  M("tensuraCavePool", F, "Cave pool #1a1440: still water, caustic rings, spawn-statue grade",
    `vec3 tensuraCavePool(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.40);
      float r = length(q * vec2(1.0, 1.55));
      float ring = abs(sin(r * 14.0 - t * 1.6));
      float caust = oLine(ring - 0.15, 1.4) * smoothstep(0.55, 0.08, r);
      vec3 pool = vec3(0.10, 0.08, 0.25);
      vec3 glass = vec3(0.28, 0.42, 0.56);
      vec3 c = mix(pool, glass, oAA(0.42 - r, 0.0) * 0.65);
      return mix(c, vec3(0.55, 0.72, 0.78), caust * 0.55);
    }`, "tensuraCavePool(p, t)"),

  M("tensuraFaceSdf", F, "Face SDF pretty: clean 3-stop skin, film bloom on cheek, 2024 TV not manhwa cut",
    `vec3 tensuraFaceSdf(vec2 p, float t){
      vec2 c = vec2(0.72, 0.54);
      float face = length((p - c) * vec2(1.05, 1.22)) - 0.20;
      vec3 N = normalize(vec3((p - c), sqrt(max(0.02, 0.20 - dot(p - c, p - c)))));
      float h = 0.5 + 0.5 * dot(N, normalize(vec3(-0.35, 0.55, 0.75)));
      vec3 deep = vec3(0.36, 0.20, 0.24);
      vec3 skin = vec3(0.82, 0.66, 0.56);
      vec3 key = vec3(0.88, 0.78, 0.70);
      vec3 col = oCel3(h, 0.42, 0.76, deep, skin, key);
      float cheek = exp(-dot(p - vec2(0.80, 0.50), p - vec2(0.80, 0.50)) * 40.0);
      vec3 cave = vec3(0.10, 0.08, 0.22);
      vec3 outc = mix(cave, col, oFill(face));
      return mix(outc, key, cheek * oFill(face) * 0.28);
    }`, "tensuraFaceSdf(p, t)"),

  M("tensuraWaterFilm", F, "Water-film bloom: thin highlight sheet over slime body, luma-capped",
    `vec3 tensuraWaterFilm(vec2 p, float t){
      vec2 c = vec2(0.70, 0.48);
      float body = length((p - c) * vec2(1.1, 0.9)) - 0.22;
      float film = oFbm(p * 7.0 + vec2(t * 0.3, 0.0));
      float sheet = oBand(film, 0.58, 0.70) * oFill(body);
      vec3 slime = vec3(0.18, 0.48, 0.50);
      vec3 deep = vec3(0.08, 0.22, 0.30);
      vec3 spec = vec3(0.78, 0.86, 0.84);
      vec3 cave = vec3(0.10, 0.08, 0.22);
      vec3 col = mix(cave, mix(deep, slime, oAA(p.y, 0.40)), oFill(body));
      return mix(col, spec, sheet * 0.55);
    }`, "tensuraWaterFilm(p, t)"),

  M("tensuraSpawnPlinth", F, "SEAL SEAL plinth: bronze-toon block + slime puddle at feet, under-igloo spawn",
    `vec3 tensuraSpawnPlinth(vec2 p, float t){
      float block = oBox(p, vec2(0.52, 0.18), vec2(0.92, 0.40));
      float lip = oBox(p, vec2(0.48, 0.38), vec2(0.96, 0.44));
      float puddle = oFill(length((p - vec2(0.72, 0.22)) * vec2(1.0, 2.4)) - 0.18);
      float statue = oFill(length((p - vec2(0.72, 0.58)) * vec2(1.2, 0.85)) - 0.14);
      vec3 snow = vec3(0.78, 0.82, 0.86);
      vec3 bronze = vec3(0.52, 0.36, 0.22);
      vec3 slime = vec3(0.20, 0.56, 0.52);
      vec3 toon = vec3(0.36, 0.28, 0.22);
      vec3 c = mix(snow * 0.55, bronze, block);
      c = mix(c, bronze * 1.15, lip);
      c = mix(c, slime, puddle * (1.0 - block));
      return mix(c, toon, statue);
    }`, "tensuraSpawnPlinth(p, t)"),
];
