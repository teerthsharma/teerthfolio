import { defineModule as M } from "./kit.glsl.js";

const F = "timestop";

export const TIMESTOP = [
  M("tsInvert", F, "Invert: 1.0-rgb then luma clamp 0.92",
    `vec3 tsInvert(vec2 p, float t){
      vec3 src = mix(mix(vec3(0.353, 0.165, 0.541), JOJO_CITRUS * 0.7, jAA(p.x, 0.5)), JOJO_MAG, jFbm(p * 3.0) * 0.4);
      return jInvert(src);
    }`, "tsInvert(p, t)"),
  M("tsTint", F, "Multiply wash: mix(white, hue, 0.55)",
    `vec3 tsTint(vec2 p, float t){
      vec3 hue = mix(vec3(0.722, 0.565, 1.0), vec3(0.439, 1.0, 0.878), step(0.5, p.x));
      return vec3(0.55, 0.42, 0.62) * mix(vec3(1.0), hue, 0.55);
    }`, "tsTint(p, t)"),
  M("tsDroplet", F, "Hanging bead: 2-tone diagonal cut, ink ring",
    `vec3 tsDroplet(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.55)) * 3.2; float d = length(q);
      vec3 c = (q.x + q.y * 0.8 > 0.15) ? vec3(0.098, 0.827, 1.0) : vec3(0.957, 0.984, 1.0) * 0.82;
      c = mix(c, JOJO_INK, jAA(d, 0.74));
      c = mix(c, vec3(0.90, 0.88, 0.72), jFill(length(q - vec2(-0.38, 0.38)) - 0.16));
      return mix(vec3(0.125, 0.078, 0.227), c, jFill(d - 1.0));
    }`, "tsDroplet(p, t)"),
  M("tsFreeze", F, "Freeze grain: mid-weighted, locked",
    `vec3 tsFreeze(vec2 p, float t){
      vec3 c = vec3(0.722, 0.627, 0.878);
      float g = (jH21(floor(gl_FragCoord.xy)) - 0.5) * 0.7 + (jH21(floor(gl_FragCoord.xy / 2.0)) - 0.5) * 0.3;
      float L = jLuma(c);
      return max(c + g * 0.12 * (0.25 + 4.0 * L * (1.0 - L)), 0.0);
    }`, "tsFreeze(p, t)"),
  M("tsClockPolar", F, "Polar-saw clock ticks",
    `vec3 tsClockPolar(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.55)) * 1.7; float r = length(q), a = atan(q.x, q.y);
      vec3 face = mix(JOJO_CITRUS * 0.68, JOJO_INK, (1.0 - smoothstep(0.02, 0.05, jSaw(a, 12.0))) * step(0.8, r) * step(r, 0.96));
      return mix(vec3(0.227, 0.102, 0.227), mix(face, JOJO_INK, jLine(r - 1.0, 2.0)), jFill(r - 1.08));
    }`, "tsClockPolar(p, t)"),
  M("tsTick", F, "Tick flash: citrus burst at 12",
    `vec3 tsTick(vec2 p, float t){
      return vec3(0.227, 0.102, 0.227) + JOJO_CITRUS * exp(-dot(p - vec2(0.72, 0.82), p - vec2(0.72, 0.82)) * 40.0) * jEmit(0.9);
    }`, "tsTick(p, t)"),
  M("tsComplement", F, "2-frame complement flash on shot cut",
    `vec3 tsComplement(vec2 p, float t){
      vec3 src = mix(vec3(1.0, 0.878, 0.376), vec3(0.604, 0.439, 1.0), jAA(p.x, 0.5));
      return mix(src, jInvert(src), step(0.35, fract(p.y * 2.0)));
    }`, "tsComplement(p, t)"),
  M("tsSprayHang", F, "Frozen spray cloud: hashed beads, zero gravity",
    `vec3 tsSprayHang(vec2 p, float t){
      vec2 id = floor(p * 18.0), f = fract(p * 18.0) - 0.5; float h = jH21(id);
      vec3 c = mix(vec3(0.098, 0.827, 1.0), vec3(0.90, 0.88, 0.72), step(0.0, f.x + f.y));
      return mix(vec3(0.165, 0.094, 0.282), c, jFill(length(f) - 0.18 * step(0.55, h)) * step(0.55, h));
    }`, "tsSprayHang(p, t)"),
  M("tsResume", F, "Unfreeze fall: y -= 4.9 age^2 streaks",
    `vec3 tsResume(vec2 p, float t){
      float age = clamp(p.x, 0.0, 1.0), y = p.y + 0.35 * age * age;
      return mix(vec3(0.125, 0.188, 0.353), vec3(0.098, 0.627, 0.878), jFill(abs(fract(y * 10.0) - 0.5) - 0.08) * (1.0 - age));
    }`, "tsResume(p, t)"),
  M("tsDepthGlue", F, "Depth-glued mask: screen ellipse, seal hole",
    `vec3 tsDepthGlue(vec2 p, float t){
      float m = smoothstep(0.85, 1.35, length((p - vec2(0.72, 0.5)) / vec2(0.16, 0.28)));
      return mix(vec3(0.965, 0.831, 0.706), jInvert(vec3(0.353, 0.165, 0.541)), m);
    }`, "tsDepthGlue(p, t)"),
  M("tsBanana", F, "Banana easter egg: curved tube cel",
    `vec3 tsBanana(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.42); float u = clamp(q.x / 0.28 + 0.5, 0.0, 1.0);
      float d = length(vec2(q.x, q.y + 0.08 * sin(u * 3.14159))) - mix(0.02, 0.06, sin(u * 3.14159));
      vec3 c = jCel3(0.55 + 0.3 * q.y, 0.40, 0.68, vec3(0.722, 0.502, 0.063), vec3(0.941, 0.753, 0.125), vec3(1.0, 0.941, 0.541));
      return mix(vec3(0.122, 0.373, 0.878), c, jFill(d));
    }`, "tsBanana(p, t)"),
  M("tsHold", F, "Locked frame: hard palette, no drift",
    `vec3 tsHold(vec2 p, float t){
      vec3 c = mix(vec3(0.875, 0.820, 1.0), vec3(0.980, 0.604, 0.192), jAA(p.x, 0.5));
      return mix(c, vec3(0.184, 0.835, 0.757), jAA(p.y, 0.55));
    }`, "tsHold(p, t)"),
];
