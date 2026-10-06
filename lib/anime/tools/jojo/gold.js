import { defineModule as M } from "./kit.glsl.js";

const F = "gold";

export const GOLD = [
  M("goldDust", F, "Gold dust motes: flicker, wavelength grade",
    `vec3 goldDust(vec2 p, float t){
      vec2 id = floor(p * 20.0), f = fract(p * 20.0) - 0.5; float h = jH21(id);
      float mote = exp(-dot(f, f) * 16.0) * step(0.68, h) * (0.5 + 0.5 * sin(h * 20.0));
      return vec3(0.165, 0.102, 0.078) + jGold(vec3(0.55, 0.38, 0.10)) * mote * jEmit(0.65);
    }`, "goldDust(p, t)"),
  M("goldRing", F, "Gaussian gold ring, noisy radius",
    `vec3 goldRing(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float ang = atan(q.y, q.x);
      float R = 0.28 + 0.04 * (jFbm(vec2(ang * 3.0, 2.0)) - 0.5);
      return vec3(0.165, 0.094, 0.078) + jGold(vec3(0.58, 0.40, 0.10)) * exp(-pow(length(q) - R, 2.0) / 0.0018) * jEmit(0.7);
    }`, "goldRing(p, t)"),
  M("goldBloom", F, "Radial gold lift only, luma-capped",
    `vec3 goldBloom(vec2 p, float t){
      return vec3(0.141, 0.086, 0.071) + jGold(vec3(0.55, 0.38, 0.10)) * exp(-dot(p - vec2(0.72, 0.5), p - vec2(0.72, 0.5)) * 5.5) * 0.5;
    }`, "goldBloom(p, t)"),
  M("goldGrade", F, "Wavelength-biased gold: lift R, hold G, kill B",
    `vec3 goldGrade(vec2 p, float t){
      return jGold(mix(vec3(0.4, 0.35, 0.3), vec3(0.8, 0.75, 0.7), p.y));
    }`, "goldGrade(p, t)"),
  M("goldLeaf", F, "Gold leaf flake: polar blob, sinopia rim",
    `vec3 goldLeaf(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float ang = atan(q.y, q.x);
      float edge = 0.18 + 0.06 * (jVn(vec2(ang * 2.1, 5.0)) - 0.5) * 2.0;
      vec3 c = mix(jGold(vec3(0.58, 0.40, 0.10)), JOJO_SINO, jAA(length(q), edge - 0.02) * 0.55);
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(length(q) - edge));
    }`, "goldLeaf(p, t)"),
  M("goldChime", F, "Chime ring: expanding gaussian",
    `vec3 goldChime(vec2 p, float t){
      float k = 0.55, dd = length(p - vec2(0.72, 0.5)) - k * 0.7;
      return vec3(0.165, 0.094, 0.078) + jGold(vec3(0.58, 0.40, 0.10)) * exp(-dd * dd / 0.003) * pow(1.0 - k, 0.7) * jEmit(0.6);
    }`, "goldChime(p, t)"),
  M("goldBevel", F, "Lettering bevel: light UL + dark LR",
    `vec3 goldBevel(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float d = max(abs(q.x) - 0.28, abs(q.y) - 0.12);
      vec3 g = mix(jGold(vec3(0.58, 0.40, 0.10)), vec3(0.92, 0.88, 0.62), jAA(-q.x - q.y, 0.05) * 0.45);
      g = mix(g, vec3(0.416, 0.227, 0.063), jAA(q.x + q.y, 0.08) * 0.4);
      return mix(vec3(0.227, 0.102, 0.227), mix(g, JOJO_INK, jLine(d, 2.0)), jFill(d));
    }`, "goldBevel(p, t)"),
  M("goldTrail", F, "Gild trail: exp(-(R-d)/6) inside ring",
    `vec3 goldTrail(vec2 p, float t){
      float R = 0.45, dist = length(p - vec2(0.72, 0.5));
      float a = exp(-pow(dist - R, 2.0) / 0.004) + (dist < R ? exp(-(R - dist) / 0.18) * 0.25 : 0.0);
      return vec3(0.165, 0.094, 0.078) + jGold(vec3(0.58, 0.40, 0.10)) * a * jEmit(0.65);
    }`, "goldTrail(p, t)"),
  M("goldShell", F, "Cylinder shell: ray stripes, height fade",
    `vec3 goldShell(vec2 p, float t){
      float ang = (p.x - 0.72) * 8.0, n = jVn(vec2(ang * 6.0, p.y * 3.0));
      float a = (1.0 - p.y) * 0.5 * (0.6 + 0.4 * n) * (0.55 + 0.45 * step(0.5, fract(ang * 40.0 + n)));
      return vec3(0.165, 0.094, 0.078) + jGold(vec3(0.58, 0.40, 0.10)) * a * jEmit(0.7);
    }`, "goldShell(p, t)"),
  M("goldRim", F, "Sun-side 1px gold rim on a disc",
    `vec3 goldRim(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float d = length(q) - 0.22;
      float rim = jLine(d, 1.2) * jAA(dot(normalize(q + 1e-4), vec2(0.5, 0.2)), 0.15);
      return mix(vec3(0.353, 0.227, 0.165), jGold(vec3(0.6, 0.42, 0.12)), rim);
    }`, "goldRim(p, t)"),
];
