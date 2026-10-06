import { defineModule as M } from "./kit.glsl.js";

const F = "diavolo";

export const DIAVOLO = [
  M("diaSplit", F, "Split afterimage: two offset silhouettes",
    `vec3 diaSplit(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      vec3 c = mix(vec3(0.165, 0.078, 0.125), vec3(0.910, 0.333, 0.604), jFill(length((q - vec2(-0.05, 0.0)) / vec2(0.10, 0.26)) - 1.0) * 0.7);
      return mix(c, vec3(0.627, 0.165, 0.753), jFill(length((q - vec2(0.05, 0.0)) / vec2(0.10, 0.26)) - 1.0) * 0.7);
    }`, "diaSplit(p, t)"),
  M("kcErase", F, "King Crimson erase wipe: plaster threshold on fbm",
    `vec3 kcErase(vec2 p, float t){
      float f = jFbm(p * 7.0 + 3.0);
      vec3 pigment = mix(vec3(0.851, 0.643, 0.255), vec3(0.227, 0.102, 0.549), p.y);
      vec3 pl = mix(vec3(0.541, 0.478, 0.541), JOJO_SINO, 0.35 + 0.4 * jFbm(p * 4.0));
      pl = mix(pl, mix(JOJO_SINO, JOJO_INK, 0.45), (1.0 - smoothstep(0.0, 0.014, abs(f - 0.52))) * 0.85);
      return mix(pigment, pl, 1.0 - step(0.52, f));
    }`, "kcErase(p, t)"),
  M("kcGreyHole", F, "Cold wash with hole: Diavolo+KC keep colour",
    `vec3 kcGreyHole(vec2 p, float t){
      float hole = smoothstep(0.85, 1.35, length((p - vec2(0.72, 0.48)) / vec2(0.14, 0.28)));
      vec3 keep = vec3(0.910, 0.333, 0.604);
      return mix(keep, mix(keep, JOJO_COLD, 0.72), hole);
    }`, "kcGreyHole(p, t)"),
  M("kcLattice", F, "Crimson lattice: striped body, brow ridge",
    `vec3 kcLattice(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      vec3 c = mix(vec3(0.910, 0.847, 0.941), vec3(0.753, 0.165, 0.290), jFill(abs(fract((q.x + q.y) * 7.0) - 0.5) - 0.18));
      c = mix(c, vec3(0.816, 0.439, 0.690), jFill(abs(q.y - 0.16) - 0.02));
      return mix(vec3(0.043, 0.024, 0.071), c, jFill(length(q / vec2(0.14, 0.28)) - 1.0));
    }`, "kcLattice(p, t)"),
  M("kcHalo", F, "Chromatic fringe halo: R/G/B bands offset on SDF",
    `vec3 kcHalo(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      float d = length(q / vec2(0.12, 0.24)) - 1.0 + (jFbm(q * 8.0) - 0.5) * 0.07;
      float bR = smoothstep(-0.03, 0.02, d + 0.014) * exp(-max(d + 0.014, 0.0) * 10.0);
      float bG = smoothstep(-0.03, 0.02, d) * exp(-max(d, 0.0) * 10.0);
      float bB = smoothstep(-0.03, 0.02, d - 0.014) * exp(-max(d - 0.014, 0.0) * 10.0);
      return vec3(bR, bG * 0.165 + bB * 0.08, bB * 0.353);
    }`, "kcHalo(p, t)"),
  M("diaHair", F, "Diavolo hair: pink + dark spots, 3-step",
    `vec3 diaHair(vec2 p, float t){
      vec3 c = jCel3(0.45 + 0.35 * jFbm(p * 5.0) - 0.2 * jCut(p, 0.3), 0.38, 0.64, vec3(0.627, 0.165, 0.416), vec3(0.910, 0.333, 0.604), vec3(0.941, 0.565, 0.753));
      vec2 id = floor(p * 14.0), f = fract(p * 14.0) - 0.5;
      return mix(c, vec3(0.102, 0.063, 0.125), jFill(length(f) - 0.18) * step(0.7, jH21(id)));
    }`, "diaHair(p, t)"),
  M("diaMesh", F, "Gold mesh shirt: lattice, wavelength gold",
    `vec3 diaMesh(vec2 p, float t){
      vec2 q = p * vec2(18.0, 10.0);
      float mesh = min(abs(fract(q.x) - 0.5), abs(fract(q.y) - 0.5));
      return mix(vec3(0.910, 0.722, 0.471), jGold(vec3(0.55, 0.38, 0.10)), 1.0 - smoothstep(0.04, 0.10, mesh));
    }`, "diaMesh(p, t)"),
  M("cosmosStar", F, "Magenta cosmos stars: grid hash, 4-point glint",
    `vec3 cosmosStar(vec2 p, float t){
      vec3 c = vec3(0.043, 0.024, 0.071);
      vec2 g = p * 7.5, id = floor(g), f = fract(g) - 0.5; float pr = jH21(id);
      if (pr > 0.52) {
        vec2 off = (jH22(id + 3.0) - 0.5) * 0.7;
        float hh = jH21(id + 1.7), r = 0.08 + 0.10 * hh, d = length(f - off);
        float s = (1.0 - smoothstep(r, r * 0.35, d)) + 0.18 * exp(-d / (r * 1.8));
        c += mix(vec3(1.0, 0.608, 0.878), vec3(0.92, 0.90, 0.82), step(0.7, jH21(id + 9.2))) * s * (0.65 + 0.35 * sin(hh * 30.0)) * 0.85;
      }
      return c;
    }`, "cosmosStar(p, t)"),
  M("cosmosWisp", F, "Magenta wisps on black cosmos",
    `vec3 cosmosWisp(vec2 p, float t){
      return vec3(0.043, 0.024, 0.071) + vec3(0.23, 0.05, 0.20) * pow(jFbm(p * 1.1 + vec2(0.0, 3.0)), 2.2) * 0.55;
    }`, "cosmosWisp(p, t)"),
  M("kcSkip", F, "Time-skip magenta streaks, edge-weighted",
    `vec3 kcSkip(vec2 p, float t){
      float row = floor(p.y * 48.0), fr = fract(p.y * 48.0) - 0.5, r1 = jH21(vec2(row, 1.3)), r3 = jH21(vec2(row, 0.77));
      float u = fract(p.x * 0.55 + r3 * 3.0), tp = u < 0.7 ? pow(1.0 - u / 0.7, 2.0) : 0.0;
      return mix(vec3(0.043, 0.024, 0.071), JOJO_MAG, (1.0 - smoothstep(0.10, 0.20, abs(fr))) * tp * step(0.45, r1) * smoothstep(0.3, 0.95, abs(p.x - 0.72) * 2.0));
    }`, "kcSkip(p, t)"),
  M("diaLaunch", F, "Launch smear: stretched body, open-mouth wedge",
    `vec3 diaLaunch(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.55);
      vec3 c = mix(vec3(0.910, 0.333, 0.604), vec3(0.125, 0.063, 0.102), jFill(length((q - vec2(0.0, 0.06)) / vec2(0.04, 0.03)) - 1.0));
      return mix(vec3(0.165, 0.078, 0.125), c, jFill(length(q / vec2(0.08, 0.32)) - 1.0));
    }`, "diaLaunch(p, t)"),
  M("diaCoin", F, "Heads coin: disc, profile notch, gold grade",
    `vec3 diaCoin(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float d = length(q) - 0.16;
      vec3 c = jCel3(0.55 + 0.3 * q.y - 0.15 * jCut(q, 0.0), 0.40, 0.66, vec3(0.416, 0.227, 0.063), jGold(vec3(0.55, 0.38, 0.10)), jGold(vec3(0.72, 0.52, 0.16)));
      c = mix(c, JOJO_INK, jLine(d, 1.6));
      return mix(vec3(0.227, 0.102, 0.227), mix(c, vec3(0.416, 0.227, 0.125), jFill(length(q - vec2(0.02, 0.02)) - 0.05) * 0.35), jFill(d));
    }`, "diaCoin(p, t)"),
];
