import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "emit",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const EMIT = [
  M("blackbody", "Blackbody-ish: Planck temperature, glow only via uEmit",
    `vec3 blackbody(vec3 N, vec3 L, vec2 p, float kelvin) {
      float ndl = phNdL(N, L);
      vec3 body = vec3(0.14, 0.10, 0.12) * (ndl * 0.45 + 0.22);
      vec3 bb = phPlanck(kelvin);
      float core = exp(-dot(p - vec2(0.72, 0.5), p - vec2(0.72, 0.5)) * 14.0);
      float glow = phEmit(core * (0.55 + 0.45 * ndl));
      return phOut(body + bb * glow * 0.72);
    }`, "blackbody(N, L, p, 2400.0 + 800.0 * sin(t * 0.6))"),

  M("heatHaze", "Heat haze: uv warp + blackbody, emit channel only for bloom",
    `vec3 heatHaze(vec3 N, vec3 L, vec2 p, float t) {
      float n = phVn(p * 10.0 + vec2(0.0, t * 1.4));
      vec2 uv = p + vec2(n - 0.5, 0.0) * 0.04 * (1.0 - p.y);
      vec3 bg = phBg(uv) * 0.55;
      float kelvin = mix(1400.0, 3200.0, clamp(1.0 - length(p - vec2(0.72, 0.42)), 0.0, 1.0));
      vec3 bb = phPlanck(kelvin);
      float core = exp(-length(p - vec2(0.72, 0.42)) * 6.0);
      float glow = phEmit(core);
      vec3 body = mix(vec3(0.12, 0.08, 0.10), bg, 0.65);
      return phOut(body + bb * glow * 0.68);
    }`, "heatHaze(N, L, p, t)"),

  M("emitCore", "Radial uEmit core: albedo stays under cap, glow is the emit channel",
    `vec3 emitCore(vec3 N, vec3 L, vec2 p) {
      float ndl = phNdL(N, L);
      vec3 body = vec3(0.16, 0.10, 0.12) * (ndl * 0.5 + 0.2);
      float r = length(p - vec2(0.72, 0.5));
      float core = exp(-r * r * 22.0);
      float ring = phBand(r, 0.10, 0.16) * 0.35;
      float glow = phEmit(core + ring);
      return phOut(body + vec3(0.86, 0.52, 0.22) * glow * 0.7);
    }`, "emitCore(N, L, p)"),

  M("emberFade", "Cooling ember: T drops with radius, uEmit fade, cel coals",
    `vec3 emberFade(vec3 N, vec3 L, vec2 p) {
      float r = length(p - vec2(0.72, 0.5));
      float kelvin = mix(2200.0, 900.0, clamp(r * 3.2, 0.0, 1.0));
      vec3 bb = phPlanck(kelvin);
      float ndl = phNdL(N, L);
      vec3 coal = vec3(0.14, 0.08, 0.08) * (ndl * 0.4 + 0.22);
      float h = phCel(1.0 - r * 2.4, 4.0);
      float glow = phEmit(exp(-r * 8.0) * (0.4 + 0.6 * h));
      return phOut(coal + bb * glow * 0.65);
    }`, "emberFade(N, L, p)"),

  M("fireCel", "Fire cel: blackbody then 4-step plates, glow via uEmit",
    `vec3 fireCel(vec3 N, vec3 L, vec2 p, float t) {
      float n = phVn(p * 6.0 + vec2(0.0, -t * 1.2));
      float hgt = clamp(0.72 - (p.y - 0.28) * 1.4 + n * 0.18, 0.0, 1.0);
      float kelvin = mix(1100.0, 2800.0, hgt);
      vec3 bb = phPlanck(kelvin);
      float bands = phCel(hgt, 4.0);
      vec3 plate = mix(vec3(0.42, 0.10, 0.08), mix(vec3(0.72, 0.28, 0.08), vec3(0.86, 0.62, 0.22), bands), bands);
      float glow = phEmit(hgt * 0.85);
      vec3 body = vec3(0.12, 0.08, 0.10) * (phNdL(N, L) * 0.35 + 0.2);
      return phOut(mix(body, plate, 0.75) + bb * glow * 0.28);
    }`, "fireCel(N, L, p, t)"),
];

export default EMIT;
