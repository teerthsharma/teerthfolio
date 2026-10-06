import { defineModule as M } from "./kit.glsl.js";

const F = "ger";

export const GER = [
  M("gerArrow", F, "Gold arrow streak: taper u^1.6, white head",
    `vec3 gerArrow(vec2 p, float t){
      vec2 a = vec2(0.25, 0.72), b = vec2(1.05, 0.38), pa = p - a, ba = b - a;
      float u = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      vec3 c = mix(jGold(vec3(0.58, 0.40, 0.10)), vec3(0.92, 0.88, 0.72), jAA(u, 0.85));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(length(pa - ba * u) - mix(0.04, 0.008, pow(u, 1.6))));
    }`, "gerArrow(p, t)"),
  M("gerGlint", F, "Requiem arrow glint: long-armed star + ring",
    `vec3 gerGlint(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 2.0;
      float f = pow(abs(q.x) + 1e-4, 0.4) + pow(abs(q.y) + 1e-4, 0.4);
      float star = pow(clamp(1.0 - f * 0.9, 0.0, 1.0), 1.4);
      return vec3(0.227, 0.102, 0.227) + jGold(vec3(0.6, 0.42, 0.12)) * (star + exp(-pow((length(q) - 0.6) / 0.04, 2.0)) * 0.6) * jEmit(0.8);
    }`, "gerGlint(p, t)"),
  M("gerZero", F, "Return-to-zero cream disc: noisy edge, gold rim",
    `vec3 gerZero(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float ang = atan(q.y, q.x);
      float dd = length(q) - 0.32 - (jFbm(vec2(ang * 3.0, 3.0)) - 0.5) * 0.16;
      vec3 c = mix(vec3(0.227, 0.102, 0.227), JOJO_CREAM * (0.97 + 0.05 * jVn(p * 40.0)), jFill(dd));
      return mix(c, jGold(vec3(0.58, 0.40, 0.10)), exp(-dd * dd / 0.0016) * 0.55);
    }`, "gerZero(p, t)"),
  M("gerRing", F, "Gold ring wipe: gaussian band, angular noise",
    `vec3 gerRing(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float ang = atan(q.y, q.x);
      float dd = length(q) - 0.42 - (jFbm(vec2(ang * 2.5, 3.0)) - 0.5) * 0.09;
      return vec3(0.227, 0.102, 0.227) + jGold(vec3(0.58, 0.40, 0.10)) * exp(-dd * dd / 0.0025) * jEmit(0.7);
    }`, "gerRing(p, t)"),
  M("gerBloom", F, "Gold-only bloom: exp(-|p|^2), no other hues",
    `vec3 gerBloom(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      return vec3(0.165, 0.094, 0.141) + jGold(vec3(0.55, 0.38, 0.10)) * exp(-dot(q, q) * 5.4) * 0.42;
    }`, "gerBloom(p, t)"),
  M("gerSpoke", F, "Radial MUDA spokes: 84 cells, gold/magenta alt",
    `vec3 gerSpoke(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      float ang = atan(q.y, q.x) / 6.28318 + 0.5, cell = floor(ang * 84.0), f = abs(fract(ang * 84.0) - 0.5) * 2.0;
      vec3 col = mod(cell, 3.0) < 1.0 ? jGold(vec3(0.58, 0.40, 0.10)) : JOJO_MAG;
      return mix(vec3(0.227, 0.102, 0.227), col, (1.0 - smoothstep(0.08, 0.22, f)) * smoothstep(0.12, 0.20, length(q)) * 0.85);
    }`, "gerSpoke(p, t)"),
  M("gerPlate", F, "GER gold armor: metallic cel + ladybug pits",
    `vec3 gerPlate(vec2 p, float t){
      vec3 c = jCel3(0.5 + 0.3 * p.y - 0.22 * jCut(p, 0.2), 0.40, 0.68, vec3(0.416, 0.227, 0.063), jGold(vec3(0.55, 0.38, 0.10)), jGold(vec3(0.7, 0.5, 0.16)));
      return mix(c, vec3(0.251, 0.102, 0.125), jFill(jVor(p * 8.0).x - 0.12) * 0.55);
    }`, "gerPlate(p, t)"),
  M("gerWing", F, "Ladybug wing: split ellipse, gold veins",
    `vec3 gerWing(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); q.x = abs(q.x);
      vec3 c = mix(vec3(0.851, 0.522, 0.741), jGold(vec3(0.55, 0.38, 0.10)), jFill(abs(q.y - 0.3 * q.x) - 0.008));
      c = mix(c, JOJO_INK, jLine(q.x, 1.3) * 0.5);
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(length(q / vec2(0.22, 0.14)) - 1.0));
    }`, "gerWing(p, t)"),
  M("gerRise", F, "GER rise glow: vertical emit ramp",
    `vec3 gerRise(vec2 p, float t){
      return vec3(0.165, 0.094, 0.141) + jGold(vec3(0.55, 0.38, 0.10)) * smoothstep(0.15, 0.85, p.y) * exp(-abs(p.x - 0.72) * 8.0) * jEmit(0.75);
    }`, "gerRise(p, t)"),
  M("gerPulse", F, "Seven requiem pulses: last blow heavier",
    `vec3 gerPulse(vec2 p, float t){
      float r = length(p - vec2(0.72, 0.5)), hit = 0.0;
      for (int i = 0; i < 7; i++) hit = max(hit, jLine(r - 0.06 - 0.04 * float(i), i == 6 ? 2.6 : 1.2));
      return mix(vec3(0.227, 0.102, 0.227), jGold(vec3(0.6, 0.42, 0.12)), hit);
    }`, "gerPulse(p, t)"),
  M("gerSepia", F, "Sepia hold: single-hue grade, gold accent kept",
    `vec3 gerSepia(vec2 p, float t){
      vec3 src = mix(vec3(0.227, 0.102, 0.227), vec3(0.851, 0.643, 0.255), p.y);
      float L = jLuma(src);
      vec3 g = L < 0.5 ? mix(vec3(0.125, 0.078, 0.047), vec3(0.541, 0.416, 0.227), L * 2.0) : mix(vec3(0.541, 0.416, 0.227), vec3(0.851, 0.690, 0.439), L * 2.0 - 1.0);
      return mix(src, g, 0.72 * (1.0 - smoothstep(0.15, 0.08, abs(src.r - src.b))));
    }`, "gerSepia(p, t)"),
  M("gerClaim", F, "GOGOGO claim glow: magenta left / gold right",
    `vec3 gerClaim(vec2 p, float t){
      float band = exp(-pow((abs(p.x - 0.72) - 0.55) / 0.08, 2.0)), v = fract(p.y * 6.0);
      vec3 col = p.x < 0.72 ? JOJO_MAG : jGold(vec3(0.58, 0.40, 0.10));
      return mix(vec3(0.227, 0.102, 0.227), col, band * (0.25 + 0.7 * jAA(v, 0.2) * (1.0 - jAA(v, 0.55))));
    }`, "gerClaim(p, t)"),
];
