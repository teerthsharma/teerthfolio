import { defineModule as M } from "./kit.glsl.js";

const F = "overlord";

export const OVERLORD = [
  M("overlordThroneKey", F, "American-show throne key: #a23cff key / #1a0c24 fill, not clay, not manga",
    `vec3 overlordThroneKey(vec2 p, float t){
      float ndl = 0.5 + 0.5 * dot(normalize(vec3(p - vec2(0.72, 0.5), 0.35)), normalize(vec3(-0.4, 0.7, 0.55)));
      vec3 fill = vec3(0.10, 0.05, 0.14);
      vec3 key = vec3(0.64, 0.24, 1.00);
      vec3 mid = vec3(0.28, 0.10, 0.36);
      vec3 c = oCel3(ndl, 0.40, 0.72, fill, mid, key);
      float stair = abs(p.y - 0.22 - 0.06 * floor(p.x * 5.0)) - 0.018;
      return mix(c, fill * 1.4, oFill(stair) * 0.45);
    }`, "overlordThroneKey(p, t)"),

  M("overlordBoneFloor", F, "Nazarick bone floor: rib tiles, ivory on violet fill, TV contact",
    `vec3 overlordBoneFloor(vec2 p, float t){
      float y = max(p.y, 0.05), u = (p.x - 0.72) / y, v = 1.0 / y;
      vec2 gv = floor(vec2(u, v) * vec2(3.0, 2.2));
      float rib = abs(fract(u * 3.0) - 0.5);
      float bone = oLine(rib - 0.18, 1.8) * smoothstep(0.06, 0.4, y);
      float knurl = oVn(gv);
      vec3 fill = vec3(0.10, 0.05, 0.14);
      vec3 ivory = vec3(0.78, 0.72, 0.62);
      vec3 c = mix(fill, ivory * (0.7 + 0.25 * knurl), bone);
      return mix(c, fill, (1.0 - smoothstep(0.08, 0.55, y)) * 0.4);
    }`, "overlordBoneFloor(p, t)"),

  M("overlordGuardianSil", F, "Floor-guardian silhouettes: tall blobs, key-rim only, English staging",
    `vec3 overlordGuardianSil(vec2 p, float t){
      vec3 hall = vec3(0.12, 0.06, 0.16);
      vec3 rim = vec3(0.78, 0.62, 0.28);
      vec3 sil = vec3(0.08, 0.05, 0.12);
      float acc = 0.0, edge = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 c = vec2(0.22 + fi * 0.24, 0.38);
        float d = length((p - c) * vec2(2.1, 0.85)) - 0.16;
        acc = max(acc, oFill(d));
        edge = max(edge, oLine(d, 1.6));
      }
      vec3 c = mix(hall, sil, acc);
      return mix(c, rim, edge * 0.75);
    }`, "overlordGuardianSil(p, t)"),

  M("overlordHallFill", F, "Throne-hall fill: up-the-stair value ladder, purple bounce, no screentone",
    `vec3 overlordHallFill(vec2 p, float t){
      float stair = floor((0.85 - p.y) * 7.0) / 7.0;
      float wall = oFbm(p * vec2(2.0, 5.5));
      vec3 fill = vec3(0.10, 0.05, 0.14);
      vec3 bounce = vec3(0.36, 0.12, 0.48);
      vec3 stepc = vec3(0.18, 0.08, 0.22);
      vec3 c = mix(fill, stepc, stair);
      c = mix(c, bounce, oBand(wall, 0.55, 0.72) * (1.0 - p.y) * 0.4);
      float rail = oLine(abs(p.x - 0.36) - 0.01, 1.5) + oLine(abs(p.x - 1.08) - 0.01, 1.5);
      return mix(c, vec3(0.70, 0.54, 0.24), rail * 0.35 * oAA(p.y, 0.18));
    }`, "overlordHallFill(p, t)"),

  M("overlordRimGold", F, "TV rim gold: thin backlight plate on a dark-op body, wavelength-warm",
    `vec3 overlordRimGold(vec2 p, float t){
      vec2 q = p - vec2(0.70, 0.50);
      float body = length(q * vec2(1.05, 1.35)) - 0.20;
      vec3 N = normalize(vec3(q, sqrt(max(0.04, 0.20 - dot(q, q)))));
      float rim = pow(1.0 - clamp(dot(N, vec3(0.0, 0.1, 1.0)), 0.0, 1.0), 2.4);
      float rw = fwidth(rim) + 1e-4;
      float plate = smoothstep(0.62 - rw, 0.62 + rw, rim);
      vec3 fill = vec3(0.10, 0.05, 0.14);
      vec3 gold = vec3(0.78, 0.60, 0.26);
      vec3 c = mix(fill, vec3(0.22, 0.10, 0.28), oFill(body));
      return mix(c, gold, plate * oFill(body) * 0.7);
    }`, "overlordRimGold(p, t)"),

  M("overlordLashSpan", F, "Lash / span-break: hard TV impact bars, one gold spark, Castlevania key",
    `vec3 overlordLashSpan(vec2 p, float t){
      float beat = fract(t * 0.7);
      float bar = 0.0;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float y = 0.30 + fi * 0.12 + 0.03 * sin(beat * 6.28 + fi);
        bar = max(bar, oLine(p.y - y, 2.4) * step(0.15 + fi * 0.05, p.x) * step(p.x, 1.15));
      }
      float spark = oFill(length(p - vec2(0.78, 0.52)) - 0.025);
      vec3 fill = vec3(0.10, 0.05, 0.14);
      vec3 lash = vec3(0.62, 0.22, 0.90);
      vec3 gold = vec3(0.80, 0.64, 0.28);
      vec3 c = mix(fill, lash, bar * 0.75);
      return mix(c, gold, spark * 0.8);
    }`, "overlordLashSpan(p, t)"),
];
