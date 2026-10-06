import { defineModule as M } from "./kit.glsl.js";

const F = "colosseum";

export const COLOSSEUM = [
  M("coloStone", F, "Fresco stone: 3-tone + 6-step posterise + craquelure (not Cairo)",
    `vec3 coloStone(vec2 p, float t){
      float pit = jVor(p * 6.2).x, m = jFbm(p * 3.4), lam = 0.5 + 0.22 * (m - 0.5) - 0.18 * pit + 0.25 * p.y;
      vec3 c = jCel3(lam, 0.34, 0.62, vec3(0.353, 0.102, 0.549), vec3(0.659, 0.376, 0.165), vec3(0.910, 0.784, 0.565));
      c *= 0.93 + 0.14 * floor(lam * 6.0) / 6.0;
      vec2 v = jVor(p * 4.4);
      return mix(c, vec3(0.478, 0.133, 0.565), (1.0 - smoothstep(0.0, fwidth(v.y) * 0.8 + 1e-4, v.y)) * 0.2);
    }`, "coloStone(p, t)"),
  M("coloCrowd", F, "Crowd hatch: stacked ovals, sinopia heads",
    `vec3 coloCrowd(vec2 p, float t){
      vec2 id = floor(p * vec2(10.0, 6.0)), f = fract(p * vec2(10.0, 6.0)) - 0.5;
      f.x += (jH21(id) - 0.5) * 0.3;
      vec3 c = mix(vec3(0.227, 0.102, 0.227), JOJO_SINO, jFill(length(f * vec2(1.2, 1.6)) - 0.28));
      return mix(c, JOJO_INK, jHatch(gl_FragCoord.xy, 7.0) * 0.25);
    }`, "coloCrowd(p, t)"),
  M("coloDust", F, "Arena dust motes, gold, lazy flicker",
    `vec3 coloDust(vec2 p, float t){
      vec2 id = floor(p * 22.0), f = fract(p * 22.0) - 0.5; float h = jH21(id);
      return vec3(0.290, 0.188, 0.125) + jGold(vec3(0.55, 0.38, 0.10)) * exp(-dot(f, f) * 18.0) * step(0.72, h) * jEmit(0.7);
    }`, "coloDust(p, t)"),
  M("coloArch", F, "Arch void: slab minus half-ellipse, umber mouth",
    `vec3 coloArch(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.42);
      float slab = max(abs(q.x) - 0.22, abs(q.y) - 0.28);
      float arch = max(length(vec2(q.x, min(q.y, 0.0))) - 0.14, -q.y - 0.18);
      vec3 c = jCel3(0.5 + 0.2 * q.y, 0.34, 0.62, vec3(0.353, 0.102, 0.549), vec3(0.851, 0.643, 0.255), vec3(0.910, 0.784, 0.565));
      c = mix(c, vec3(0.165, 0.102, 0.141), jFill(arch) * (1.0 - jFill(slab)));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(max(slab, -arch)));
    }`, "coloArch(p, t)"),
  M("coloPlaster", F, "Chalk plaster: cream + mottle, never milk",
    `vec3 coloPlaster(vec2 p, float t){
      return mix(JOJO_CREAM * (0.97 + 0.05 * jFbm(p * 30.0)), vec3(0.541, 0.478, 0.541), jFbm(p * 4.0) * 0.12);
    }`, "coloPlaster(p, t)"),
  M("coloSinopia", F, "Sinopia sketch: 1px iso of 2-octave noise",
    `vec3 coloSinopia(vec2 p, float t){
      float f = jFbm(p * 2.2) * 9.0, line = 1.0 - smoothstep(0.0, fwidth(f) * 1.3 + 1e-4, abs(fract(f) - 0.5));
      return mix(JOJO_CREAM * 0.9, JOJO_SINO, line * jAA(jVn(p * 1.3 + 3.0), 0.52) * 0.75);
    }`, "coloSinopia(p, t)"),
  M("coloAttic", F, "Attic window: rect hole, gold cornice",
    `vec3 coloAttic(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.62);
      vec3 c = mix(vec3(0.851, 0.643, 0.255), vec3(0.165, 0.102, 0.141), jFill(max(abs(q.x) - 0.07, abs(q.y) - 0.08)));
      c = mix(c, jGold(vec3(0.6, 0.4, 0.12)), jFill(abs(q.y - 0.14) - 0.015) * jFill(abs(q.x) - 0.21));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(max(abs(q.x) - 0.20, abs(q.y) - 0.16)));
    }`, "coloAttic(p, t)"),
  M("coloRuin", F, "Broken stair: ragged u thresholds, rubble",
    `vec3 coloRuin(vec2 p, float t){
      float u = p.x * 1.4 + (jH21(vec2(floor(p.y * 8.0), 2.0)) - 0.5) * 0.25;
      float tiers = step(0.0, u) + step(0.3, u) + step(0.65, u);
      vec3 c = mix(vec3(0.227, 0.102, 0.227), vec3(0.851, 0.643, 0.255), tiers / 3.0);
      return mix(c, vec3(0.416, 0.227, 0.125), jFill(jVor(p * 7.0).x - 0.18) * step(u, 0.15));
    }`, "coloRuin(p, t)"),
  M("coloSaddle", F, "Hyperbolic saddle: y ~ z^2-x^2, coral ridge",
    `vec3 coloSaddle(vec2 p, float t){
      vec3 c = jCel3(0.5 + 0.4 * (p.y * p.y - p.x * p.x) - 0.2 * jCut(p, 0.2), 0.34, 0.62, vec3(0.353, 0.102, 0.549), vec3(0.851, 0.643, 0.255), vec3(0.910, 0.784, 0.565));
      return mix(c, JOJO_SINO, jFill(abs(p.x - 0.72) - 0.03) * 0.7);
    }`, "coloSaddle(p, t)"),
  M("coloApricot", F, "Apricot haze toward #e8a060, never white",
    `vec3 coloApricot(vec2 p, float t){
      return mix(vec3(0.851, 0.643, 0.255), vec3(0.910, 0.627, 0.376), smoothstep(0.2, 0.9, length(p - vec2(0.72, 0.3))) * 0.8);
    }`, "coloApricot(p, t)"),
];
