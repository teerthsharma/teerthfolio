import { defineModule as M } from "./kit.glsl.js";

const F = "dio";

export const DIO = [
  M("dioFlesh", F, "DIO flesh: 3-step skin + subsurface vein field",
    `vec3 dioFlesh(vec2 p, float t){
      float ndl = 0.52 + 0.4 * p.y - 0.28 * jCut(p * 1.2, 0.1);
      vec3 c = jCel3(ndl, 0.40, 0.68, vec3(0.659, 0.408, 0.345), vec3(0.878, 0.659, 0.533), vec3(0.965, 0.831, 0.706));
      float vein = jFbm(p * 14.0 + vec2(0.0, p.x * 3.0));
      return mix(c, vec3(0.620, 0.282, 0.353), (1.0 - smoothstep(0.46, 0.52, abs(vein - 0.5))) * 0.28 * (1.0 - jAA(ndl, 0.68)));
    }`, "dioFlesh(p, t)"),
  M("dioVein", F, "Vein SDF: ridged fbm iso, magenta under flesh",
    `vec3 dioVein(vec2 p, float t){
      float d = abs(jFbm(p * 11.0) - 0.5) - 0.03;
      return mix(vec3(0.878, 0.659, 0.533), vec3(0.549, 0.188, 0.314), jFill(d) * 0.85);
    }`, "dioVein(p, t)"),
  M("dioSteam", F, "Breath plates: stacked ellipses, hard rim, rising shear",
    `vec3 dioSteam(vec2 p, float t){
      vec3 c = vec3(0.227, 0.102, 0.227);
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 q = (p - vec2(0.62 + 0.04 * fi, 0.28 + 0.12 * fi)) / vec2(0.18 + 0.03 * fi, 0.07);
        q.x += (jVn(vec2(fi, p.y * 8.0)) - 0.5) * 0.35;
        float d = length(q) - 1.0;
        c = mix(c, mix(vec3(0.784, 0.753, 0.878), vec3(0.941, 0.882, 0.722), fi / 5.0), jFill(d) * 0.45);
        c = mix(c, JOJO_INK, jLine(d, 1.2) * jFill(d));
      }
      return c;
    }`, "dioSteam(p, t)"),
  M("dioClockFace", F, "Clock face: polar saw ticks, bullseye quarters",
    `vec3 dioClockFace(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.55)) * 1.8; float r = length(q), a = atan(q.x, q.y);
      if (r > 1.05) return vec3(0.227, 0.102, 0.227);
      vec3 face = mix(JOJO_CITRUS * 0.72, vec3(1.0, 0.604, 0.165) * 0.7, step(0.5, fract(r * 4.0)) * 0.55);
      float hour = (1.0 - smoothstep(0.03, 0.06, jSaw(a, 12.0))) * step(0.78, r) * step(r, 0.96);
      float minute = (1.0 - smoothstep(0.012, 0.028, jSaw(a, 60.0))) * step(0.88, r) * step(r, 0.96);
      return mix(mix(face, JOJO_INK, max(hour, minute)), JOJO_INK, jLine(r - 1.0, 2.2));
    }`, "dioClockFace(p, t)"),
  M("dioClockHand", F, "Tapered capsule hands, minute one tick short of 12",
    `vec3 dioClockHand(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.55)) * 1.8, dm = vec2(sin(-0.1047), cos(-0.1047));
      float tm = clamp(dot(q, dm) / 0.78, 0.0, 1.0);
      float dMin = length(q - dm * 0.78 * tm) - mix(0.03, 0.012, tm);
      vec2 dh = vec2(sin(-0.02), cos(-0.02));
      float th = clamp(dot(q, dh) / 0.5, 0.0, 1.0);
      float dHr = length(q - dh * 0.5 * th) - mix(0.05, 0.02, th);
      vec3 c = mix(JOJO_CITRUS * 0.65, JOJO_INK, jFill(min(dMin, dHr)));
      return mix(vec3(0.227, 0.102, 0.227), mix(c, JOJO_INK, jFill(length(q) - 0.06)), jFill(length(q) - 1.0));
    }`, "dioClockHand(p, t)"),
  M("dioClockShadow", F, "Clock-hand shadow only: offset umbra, no face",
    `vec3 dioClockShadow(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.55)) * 1.8 + vec2(0.04, -0.03), d = vec2(sin(-0.1047), cos(-0.1047));
      float tm = clamp(dot(q, d) / 0.78, 0.0, 1.0);
      float sh = length(q - d * 0.78 * tm) - mix(0.045, 0.02, tm);
      return mix(vec3(0.353, 0.165, 0.541), JOJO_UMBER, jFill(sh) * 0.75);
    }`, "dioClockShadow(p, t)"),
  M("dioHair", F, "Blonde 3-step hair, hard clump iso",
    `vec3 dioHair(vec2 p, float t){
      float f = jFbm(p * 6.0 + vec2(0.0, 2.0));
      vec3 c = jCel3(0.45 + 0.4 * f - 0.2 * jCut(p, 0.3), 0.38, 0.66, vec3(0.722, 0.502, 0.063), vec3(0.941, 0.753, 0.125), vec3(1.0, 0.941, 0.541));
      return mix(c, JOJO_INK, jLine(f - 0.5, 1.4) * 0.7);
    }`, "dioHair(p, t)"),
  M("dioCape", F, "Red cape folds: saw ridges, violet shade",
    `vec3 dioCape(vec2 p, float t){
      float fold = jSaw(p.x * 6.2831853 * 3.2 + p.y * 1.4, 1.0);
      return jCel3(0.35 + 0.4 * p.y - 0.35 * fold - 0.2 * jCut(p, 0.0), 0.36, 0.64, vec3(0.227, 0.039, 0.078), vec3(0.541, 0.102, 0.165), vec3(0.815, 0.165, 0.227));
    }`, "dioCape(p, t)"),
  M("dioGold", F, "Heart emblem: wavelength gold, not yellow paint",
    `vec3 dioGold(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.55);
      float heart = min(min(length(q - vec2(-0.06, 0.04)) - 0.08, length(q - vec2(0.06, 0.04)) - 0.08), length((q - vec2(0.0, -0.02)) * vec2(1.0, 1.4)) - 0.11);
      return mix(vec3(0.227, 0.102, 0.227), jGold(vec3(0.55, 0.35, 0.12)), jFill(heart));
    }`, "dioGold(p, t)"),
  M("dioSmug", F, "Smug face bands: hard cheek cut, eye slit",
    `vec3 dioSmug(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.58);
      float face = length(q / vec2(0.22, 0.28)) - 1.0;
      vec3 c = jCel3(0.55 - 0.35 * jCut(q, 0.2) + 0.15 * q.y, 0.40, 0.68, vec3(0.659, 0.408, 0.345), vec3(0.878, 0.659, 0.533), vec3(0.965, 0.831, 0.706));
      float eye = abs(q.y - 0.04) - 0.012 + 0.3 * abs(abs(q.x) - 0.07);
      return mix(vec3(0.227, 0.102, 0.227), mix(c, JOJO_INK, jFill(eye) * jFill(face + 0.08)), jFill(face));
    }`, "dioSmug(p, t)"),
  M("dioPose", F, "Contrapposto shade + flipper-across-face band",
    `vec3 dioPose(vec2 p, float t){
      vec3 c = jCel3(0.5 + 0.3 * sin((p.x * 0.8 + p.y * 0.35) * 4.0) - 0.25 * jCut(p, 0.5), 0.38, 0.66, vec3(0.227, 0.125, 0.031), vec3(0.878, 0.627, 0.125), vec3(1.0, 0.824, 0.290));
      return mix(c, JOJO_INK, jFill(abs(p.y - (0.62 - 0.15 * p.x)) - 0.03) * 0.55);
    }`, "dioPose(p, t)"),
  M("dioEmit", F, "Citrus uEmit glow, luma-capped",
    `vec3 dioEmit(vec2 p, float t){
      return vec3(0.227, 0.102, 0.227) + JOJO_CITRUS * jEmit(exp(-dot(p - vec2(0.72, 0.5), p - vec2(0.72, 0.5)) * 18.0));
    }`, "dioEmit(p, t)"),
];
