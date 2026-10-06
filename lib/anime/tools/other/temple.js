import { defineModule as M } from "./kit.glsl.js";

const F = "temple";

export const TEMPLE = [
  M("templeStoneInterior", F, "Stone temple interior: ashlar blocks, cool bounce, not a mountain",
    `vec3 templeStoneInterior(vec2 p, float t){
      vec2 gv = floor(p * vec2(5.0, 3.5));
      float mortarX = abs(fract(p.x * 5.0) - 0.5);
      float mortarY = abs(fract(p.y * 3.5 + 0.5 * mod(gv.x, 2.0)) - 0.5);
      float joint = oLine(min(mortarX, mortarY) - 0.46, 1.6);
      float facet = oVn(gv);
      vec3 stone = mix(vec3(0.36, 0.30, 0.26), vec3(0.58, 0.50, 0.42), facet);
      vec3 shade = vec3(0.18, 0.16, 0.20);
      vec3 c = mix(shade, stone, 0.55 + 0.35 * p.y);
      return mix(c, vec3(0.14, 0.12, 0.16), joint * 0.7);
    }`, "templeStoneInterior(p, t)"),

  M("fountainBasin", F, "Immortality fountain basin: circular water, stone lip, interior temple",
    `vec3 fountainBasin(vec2 p, float t){
      vec2 c = vec2(0.72, 0.38);
      float r = length((p - c) * vec2(1.0, 1.65));
      float water = oFill(r - 0.22);
      float lip = oLine(r - 0.24, 2.4);
      float ripple = oLine(abs(sin(r * 16.0 - t * 1.4)) - 0.2, 1.2) * water;
      vec3 floorc = vec3(0.28, 0.24, 0.22);
      vec3 stone = vec3(0.52, 0.44, 0.36);
      vec3 pool = vec3(0.18, 0.36, 0.44);
      vec3 col = mix(floorc, pool, water);
      col = mix(col, stone, lip);
      return mix(col, vec3(0.55, 0.72, 0.74), ripple * 0.45);
    }`, "fountainBasin(p, t)"),

  M("plateauDoorLight", F, "Door to plateau light: bright rectangle in stone hall, value-split not hue-split",
    `vec3 plateauDoorLight(vec2 p, float t){
      float door = oBox(p, vec2(0.56, 0.22), vec2(0.88, 0.78));
      float arch = oFill(length((p - vec2(0.72, 0.72)) * vec2(1.4, 1.0)) - 0.20);
      float open = max(door, arch * oAA(p.y, 0.58));
      vec3 hall = vec3(0.18, 0.16, 0.20);
      vec3 stone = mix(hall, vec3(0.40, 0.34, 0.28), oFbm(p * 4.0) * 0.4);
      vec3 light = vec3(0.82, 0.74, 0.58);
      vec3 c = mix(stone, light, open * 0.85);
      float dust = oFbm(p * vec2(2.0, 8.0));
      return mix(c, light, oBand(dust, 0.60, 0.74) * open * 0.2);
    }`, "plateauDoorLight(p, t)"),

  M("waterVeil", F, "Water veil: vertical sheets over basin, fwidth lips, temple interior",
    `vec3 waterVeil(vec2 p, float t){
      float veil = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float x = 0.48 + fi * 0.10 + 0.02 * sin(t * 1.2 + fi * 1.7);
        float n = oFbm(vec2(p.y * 6.0 + t * 0.4, fi));
        veil = max(veil, oFill(abs(p.x - x) - (0.012 + 0.01 * n)) * smoothstep(0.18, 0.70, p.y));
      }
      vec3 stone = vec3(0.32, 0.28, 0.26);
      vec3 water = vec3(0.40, 0.62, 0.66);
      vec3 c = mix(stone, vec3(0.22, 0.20, 0.24), oFbm(p * 3.0) * 0.3);
      return mix(c, water, veil * 0.7);
    }`, "waterVeil(p, t)"),

  M("templeGateRing", F, "Gate rings in the temple room: concentric gold hoops, not a magenta plate",
    `vec3 templeGateRing(vec2 p, float t){
      vec2 c = vec2(0.72, 0.52);
      float r = length((p - c) * vec2(1.0, 1.15));
      float rings = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        rings = max(rings, oLine(r - (0.08 + fi * 0.07), 1.8));
      }
      vec3 hall = vec3(0.22, 0.12, 0.16);
      vec3 gold = vec3(0.78, 0.60, 0.26);
      vec3 stone = vec3(0.36, 0.28, 0.24);
      vec3 col = mix(hall, stone, oFbm(p * 2.4) * 0.4);
      return mix(col, gold, rings * 0.8);
    }`, "templeGateRing(p, t)"),
];
