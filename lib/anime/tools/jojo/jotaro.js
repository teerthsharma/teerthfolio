import { defineModule as M } from "./kit.glsl.js";

const F = "jotaro";

export const JOTARO = [
  M("jotaroCoat", F, "Jotaro coat: near-ink body, hatch in shadow",
    `vec3 jotaroCoat(vec2 p, float t){
      float ndl = 0.48 + 0.25 * p.y - 0.35 * jCut(p, 0.15);
      vec3 c = jCel3(ndl, 0.36, 0.62, vec3(0.039, 0.039, 0.071), vec3(0.102, 0.102, 0.165), vec3(0.227, 0.227, 0.353));
      return mix(c, c * 0.55, jHatch(gl_FragCoord.xy, 6.0) * (1.0 - jAA(ndl, 0.36)) * 0.65);
    }`, "jotaroCoat(p, t)"),
  M("jotaroHat", F, "Hat brim disc + crown box, umber rim",
    `vec3 jotaroHat(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.72);
      float d = min(length(q / vec2(0.28, 0.06)) - 1.0, max(abs(q.x) - 0.12, abs(q.y + 0.08) - 0.10));
      vec3 c = jCel3(0.4 - 0.3 * jCut(q, 0.0), 0.34, 0.58, vec3(0.039, 0.039, 0.071), vec3(0.086, 0.086, 0.141), vec3(0.188, 0.188, 0.282));
      return mix(vec3(0.227, 0.102, 0.227), mix(c, JOJO_INK, jLine(d, 1.6)), jFill(d));
    }`, "jotaroHat(p, t)"),
  M("jotaroStare", F, "Stare: slit iris, star highlight, no milk",
    `vec3 jotaroStare(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.55);
      vec3 c = vec3(0.125, 0.141, 0.196);
      c = mix(c, vec3(0.227, 0.345, 0.282), jFill(length(q - vec2(0.02, 0.0)) - 0.045));
      c = mix(c, JOJO_INK, jFill(length(q - vec2(0.025, 0.0)) - 0.018));
      c = mix(c, vec3(0.85, 0.82, 0.72), jFill(length(q - vec2(0.055, 0.02)) - 0.008));
      return mix(vec3(0.165, 0.094, 0.141), c, jFill(length(q / vec2(0.16, 0.07)) - 1.0));
    }`, "jotaroStare(p, t)"),
  M("jotaroGold", F, "Coat emblems: wavelength gold chevrons",
    `vec3 jotaroGold(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.48);
      float chev = abs(q.x) + q.y * 0.7 - 0.12;
      return mix(vec3(0.071, 0.071, 0.125), jGold(vec3(0.55, 0.38, 0.10)), jFill(chev) * jFill(0.16 - abs(q.y)));
    }`, "jotaroGold(p, t)"),
  M("jotaroChain", F, "Chain links: repeating capsule rings",
    `vec3 jotaroChain(vec2 p, float t){
      vec2 q = vec2(p.x, fract(p.y * 8.0) - 0.5);
      float link = abs(length(q * vec2(14.0, 6.0)) - 0.55) - 0.08;
      vec3 c = jCel3(0.5 - 0.2 * jCut(p, 0.2), 0.4, 0.65, vec3(0.227, 0.157, 0.063), vec3(0.690, 0.533, 0.188), jGold(vec3(0.7, 0.5, 0.15)));
      return mix(vec3(0.071, 0.071, 0.125), c, jFill(link));
    }`, "jotaroChain(p, t)"),
  M("jotaroCollar", F, "Green collar: 3-step, complementary red shade",
    `vec3 jotaroCollar(vec2 p, float t){
      vec3 c = jCel3(0.5 + 0.2 * p.x - 0.25 * jCut(p, 0.4), 0.38, 0.64, vec3(0.063, 0.188, 0.125), vec3(0.165, 0.420, 0.282), vec3(0.353, 0.690, 0.439));
      return mix(vec3(0.071, 0.071, 0.125), c, jFill(abs(p.y - 0.58) - 0.06));
    }`, "jotaroCollar(p, t)"),
  M("jotaroWalk", F, "Walk smear: 2-3 frame crescent",
    `vec3 jotaroWalk(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      vec3 c = mix(vec3(0.071, 0.071, 0.125), vec3(0.165, 0.165, 0.251), jFill(length((q - vec2(-0.08, 0.0)) / vec2(0.16, 0.26)) - 1.0) * 0.45);
      return mix(c, vec3(0.102, 0.102, 0.188), jFill(length(q / vec2(0.12, 0.28)) - 1.0));
    }`, "jotaroWalk(p, t)"),
  M("jotaroFreeze", F, "Time-stop freeze: invert + luma clamp",
    `vec3 jotaroFreeze(vec2 p, float t){
      return jInvert(jCel3(0.48 + 0.25 * p.y, 0.36, 0.62, vec3(0.039, 0.039, 0.071), vec3(0.102, 0.102, 0.165), vec3(0.227, 0.227, 0.353)));
    }`, "jotaroFreeze(p, t)"),
  M("jotaroBrim", F, "Hat brim shadow over eyes",
    `vec3 jotaroBrim(vec2 p, float t){
      vec3 face = vec3(0.722, 0.549, 0.439);
      return mix(face, face * vec3(0.35, 0.32, 0.45), jFill(length((p - vec2(0.72, 0.64)) / vec2(0.30, 0.08)) - 1.0) * 0.75);
    }`, "jotaroBrim(p, t)"),
  M("jotaroInk", F, "Thick coat ink wash, 3px hull feel",
    `vec3 jotaroInk(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.48); float d = length(q / vec2(0.18, 0.38)) - 1.0;
      return mix(vec3(0.227, 0.102, 0.227), mix(vec3(0.086, 0.086, 0.141), JOJO_INK, jLine(d, 3.0)), jFill(d + 0.02));
    }`, "jotaroInk(p, t)"),
];
