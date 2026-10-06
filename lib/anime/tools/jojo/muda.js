import { defineModule as M } from "./kit.glsl.js";

const F = "muda";

export const MUDA = [
  M("mudaGlyph", F, "MUDA letterform: block SDF, citrus fill, magenta shadow",
    `vec3 mudaGlyph(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * vec2(2.4, 3.0);
      float d = min(max(abs(q.x) - 0.55, abs(q.y) - 0.35) + 0.15, max(abs(q.x) - 0.55, abs(q.y) - 0.08));
      vec3 c = mix(JOJO_MAG, JOJO_CITRUS * 0.8, jFill(d + 0.04));
      return mix(vec3(0.227, 0.102, 0.227), mix(c, JOJO_INK, jLine(d, 2.2)), jFill(d + 0.08));
    }`, "mudaGlyph(p, t)"),
  M("mudaBarrage", F, "Radial fist field: 124-period hash cells",
    `vec3 mudaBarrage(vec2 p, float t){
      vec2 q = p - vec2(0.55, 0.5);
      float ang = atan(q.y, q.x), r = length(q), cell = floor(ang * 19.735 + 62.0), h = jH21(vec2(cell, floor(r * 8.0)));
      float fist = length(vec2(fract(ang * 19.735) - 0.5, fract(r * 8.0) - 0.5)) - 0.18 * h;
      vec3 plate = mix(vec3(0.910, 0.831, 0.604), vec3(0.353, 0.165, 0.541), step(0.5, h));
      return mix(vec3(0.227, 0.102, 0.227), plate, jFill(fist) * step(0.35, h) * smoothstep(0.08, 0.55, r));
    }`, "mudaBarrage(p, t)"),
  M("mudaSpark", F, "Landing spark: 4-point star, rotated drawing",
    `vec3 mudaSpark(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 2.2; q = vec2(0.7071 * (q.x - q.y), 0.7071 * (q.x + q.y));
      vec3 col = mix(JOJO_CITRUS * 0.75, vec3(1.0, 0.98, 0.85) * 0.82, jFill(length(q) - 0.15));
      return mix(vec3(0.227, 0.102, 0.227), col, max(jStar4(q, 1.0), jLine(length(q) - 0.62, 1.4)));
    }`, "mudaSpark(p, t)"),
  M("mudaCrack", F, "6-ray jagged coral fissure",
    `vec3 mudaCrack(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 2.0; float best = 1.0;
      for (int i = 0; i < 6; i++) {
        float fi = float(i), a = fi * 1.047; vec2 d = vec2(cos(a), sin(a));
        float tt = dot(q, d), n = dot(q, vec2(-d.y, d.x));
        best = min(best, abs(n - (jVn(vec2(tt * 9.0, fi)) - 0.5) * 0.22 * (0.3 + tt)) - 0.03 * (1.0 - clamp(tt, 0.0, 1.0)));
      }
      return mix(vec3(0.227, 0.102, 0.227), mix(JOJO_INK, vec3(1.0, 0.416, 0.353), jFill(best)), jFill(best + 0.02));
    }`, "mudaCrack(p, t)"),
  M("mudaVolley", F, "Stepped volley stripes from 124-count law",
    `vec3 mudaVolley(vec2 p, float t){
      float S = 15.0, s = floor(p.x * S), n = floor(124.0 * (s + 1.0) / S) - floor(124.0 * s / S);
      vec3 c = jCel3(n / 12.0, 0.35, 0.7, vec3(0.227, 0.102, 0.227), JOJO_MAG, JOJO_CITRUS * 0.75);
      return mix(c, JOJO_INK, jLine(fract(p.x * S) - 0.5, 1.2) * 0.4);
    }`, "mudaVolley(p, t)"),
  M("mudaGhost", F, "Afterimage tint toward panel violet",
    `vec3 mudaGhost(vec2 p, float t){
      return mix(vec3(0.910, 0.831, 0.604), vec3(0.353, 0.165, 0.541), smoothstep(0.3, 0.8, p.x) * 0.55);
    }`, "mudaGhost(p, t)"),
  M("mudaImpact", F, "Impact shock: concentric hard rings",
    `vec3 mudaImpact(vec2 p, float t){
      float r = length(p - vec2(0.72, 0.5)), ring = 0.0;
      for (int i = 0; i < 3; i++) ring = max(ring, jLine(r - 0.12 * float(i + 1), 1.6));
      return mix(vec3(0.227, 0.102, 0.227), JOJO_CITRUS * 0.7, ring);
    }`, "mudaImpact(p, t)"),
  M("mudaSpeed", F, "Speedlines: 64 hashed rows, taper (1-u/len)^2",
    `vec3 mudaSpeed(vec2 p, float t){
      float row = floor(p.y * 64.0), fr = fract(p.y * 64.0) - 0.5, r1 = jH21(vec2(row, 5.1)), r3 = jH21(vec2(row, 7.0));
      float ln = 1.0 - smoothstep(0.12, 0.22, abs(fr)), u = fract(p.x * 0.9 + r3 * 3.0), len = 0.25 + 0.9 * r1;
      float tp = u < len ? pow(1.0 - u / len, 2.0) : 0.0;
      return mix(vec3(0.227, 0.102, 0.227), vec3(0.92, 0.88, 0.72) * 0.7, ln * tp * step(0.45, r1) * 0.85);
    }`, "mudaSpeed(p, t)"),
  M("mudaArc", F, "Lettering arc: 7 pulses on a 160-degree sweep",
    `vec3 mudaArc(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.42);
      float k = (atan(q.y, q.x) + 2.4) / 2.8, slot = abs(fract(k * 7.0) - 0.5);
      float on = (1.0 - smoothstep(0.08, 0.14, slot)) * jLine(length(q) - 0.28, 8.0);
      return mix(vec3(0.227, 0.102, 0.227), JOJO_CITRUS * 0.75, on);
    }`, "mudaArc(p, t)"),
  M("mudaCoral", F, "Coral edge hit: #ff6a5a core, ink outline",
    `vec3 mudaCoral(vec2 p, float t){
      float d = abs(p.y - 0.55) - 0.04 + 0.02 * sin(p.x * 22.0);
      return mix(vec3(0.227, 0.102, 0.227), mix(JOJO_INK, vec3(1.0, 0.416, 0.353), jFill(d)), jFill(d + 0.015));
    }`, "mudaCoral(p, t)"),
  M("mudaDutch", F, "Diagonal dutch roll: sheared grid",
    `vec3 mudaDutch(vec2 p, float t){
      vec2 q = vec2(p.x + p.y * 0.25, p.y - p.x * 0.18);
      return jCel3(0.5 + 0.3 * sin(q.x * 8.0) - 0.25 * jCut(q, 0.0), 0.38, 0.66, vec3(0.227, 0.102, 0.227), JOJO_MAG, JOJO_CITRUS * 0.7);
    }`, "mudaDutch(p, t)"),
  M("mudaKnuckle", F, "Fist closeup: plate cream + seam brown",
    `vec3 mudaKnuckle(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      vec3 c = jCel3(0.55 + 0.3 * q.y - 0.2 * jCut(q, 0.0), 0.40, 0.68, vec3(0.722, 0.455, 0.165), vec3(0.910, 0.831, 0.604), vec3(0.965, 0.910, 0.690));
      return mix(vec3(0.165, 0.078, 0.165), mix(c, vec3(0.416, 0.227, 0.125), jPanel(q * 6.0, 1.5) * 0.4), jFill(length(q) - 0.22));
    }`, "mudaKnuckle(p, t)"),
  M("mudaSmear", F, "Crescent smear: disc minus shifted disc",
    `vec3 mudaSmear(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 2.0;
      float lens = jFill(length(q) - 1.0) * (1.0 - jFill(length(q - vec2(-0.45, 0.0)) - 1.0));
      return mix(vec3(0.227, 0.102, 0.227), jGold(vec3(0.6, 0.4, 0.12)), lens * (0.4 + 0.5 * jAA(q.x, 0.0)));
    }`, "mudaSmear(p, t)"),
  M("mudaPulse", F, "Seven pulses: last is the blow",
    `vec3 mudaPulse(vec2 p, float t){
      float r = length(p - vec2(0.72, 0.5)), hit = 0.0;
      for (int i = 0; i < 7; i++) hit = max(hit, jLine(r - 0.08 - 0.05 * float(i), i == 6 ? 2.4 : 1.3) * (i == 6 ? 1.0 : 0.65));
      return mix(vec3(0.227, 0.102, 0.227), mix(JOJO_MAG, JOJO_CITRUS * 0.75, step(0.22, r)), hit);
    }`, "mudaPulse(p, t)"),
  M("mudaInkBurst", F, "Ink splash: voronoi blot, umber not black",
    `vec3 mudaInkBurst(vec2 p, float t){
      vec2 v = jVor(p * 5.5);
      return mix(vec3(0.353, 0.165, 0.541), mix(JOJO_INK, JOJO_UMBER, jFbm(p * 4.0)), jFill(v.x - 0.35 * jFbm(p * 8.0) - 0.22));
    }`, "mudaInkBurst(p, t)"),
];
