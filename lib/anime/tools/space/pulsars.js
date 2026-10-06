// Pulsars / magnetar sheets / supernova remnants — 15 timed-field operators.
import { T } from "./kit.glsl.js";

export const PULSARS = [
  T("pulsar-beam", "pulsar beam sweep: a rotating lighthouse cone",
    `vec4 pulsarBeam(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.52), q = p - c;
      float th = atan(q.y, q.x), r = length(q);
      float sweep = fract(th / 6.28318 - t * 0.35);
      float beam = exp(-pow((sweep - 0.5) / 0.04, 2.0)) * exp(-r * 2.2);
      float core = spDisc(r, 0.02);
      vec3 col = SP_VOID + SP_COLD * 0.55 * beam + SP_HOT * 0.4 * core;
      return vec4(col, spEmit(beam * 0.6 + core));
    }`, "pulsarBeam(p, t).rgb"),

  T("pulsar-cone", "cone cut: two opposite beams, hollow core",
    `vec4 pulsarCone(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.52);
      float th = atan(q.y, q.x) - t * 1.1, r = length(q);
      float cone = pow(abs(cos(th)), 8.0) * exp(-r * 2.5);
      vec3 col = SP_VOID + SP_COLD * 0.5 * cone;
      return vec4(col, spEmit(cone * 0.5));
    }`, "pulsarCone(p, t).rgb"),

  T("pulsar-interpulse", "double pulse: main + interpulse 180° out",
    `vec4 pulsarInterpulse(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.52);
      float th = atan(q.y, q.x) - t * 2.2, r = length(q);
      float main = exp(-pow(sin(th), 2.0) * 40.0);
      float inter = exp(-pow(sin(th + 3.14159), 2.0) * 70.0) * 0.45;
      float beam = (main + inter) * exp(-r * 2.4);
      return vec4(SP_VOID + SP_COLD * 0.5 * beam, spEmit(beam * 0.55));
    }`, "pulsarInterpulse(p, t).rgb"),

  T("magnetar-sheet", "magnetar field sheets: nested dipole loops",
    `vec3 magnetarSheet(vec2 p) {
      vec2 q = p - vec2(0.72, 0.52);
      float r = length(q), th = atan(q.y, q.x);
      float dip = abs(sin(th)) * r;
      float sheet = 0.0;
      for (int i = 0; i < 4; i++) {
        float R = 0.08 + 0.07 * float(i);
        sheet += spRing(dip, R, 0.008);
      }
      return SP_VOID + SP_ORCH * 0.4 * sheet * exp(-r * 1.2);
    }`, "magnetarSheet(p)"),

  T("magnetar-twist", "twisted magnetar sheets: dipole plus a helical offset",
    `vec3 magnetarTwist(vec2 p) {
      vec2 q = p - vec2(0.72, 0.52);
      float r = length(q), th = atan(q.y, q.x) + 1.2 * r;
      float dip = abs(sin(th)) * r;
      float sheet = spRing(dip, 0.14, 0.01) + 0.6 * spRing(dip, 0.22, 0.008);
      return SP_VOID + mix(SP_ORCH, SP_TEAL, r) * 0.4 * sheet;
    }`, "magnetarTwist(p)"),

  T("snr-shell", "supernova remnant: expanding spherical shell, fwidth",
    `vec3 snrShell(vec2 p) {
      float r = length(p - vec2(0.72, 0.52));
      float n = 0.02 * spFbm(p * 8.0);
      float shell = spRing(r, 0.28 + n, 0.018);
      return SP_VOID + mix(SP_TEAL, SP_EMBER, spFbm(p * 3.0)) * 0.45 * shell;
    }`, "snrShell(p)"),

  T("snr-filament", "SNR filaments: ridged noise on a shell mask",
    `vec3 snrFilament(vec2 p) {
      vec2 c = vec2(0.72, 0.52);
      float r = length(p - c);
      float shell = smoothstep(0.22, 0.26, r) * (1.0 - smoothstep(0.34, 0.40, r));
      float fil = smoothstep(0.55, 0.85, spRidge(spWarp(p * 4.0, 0.35)));
      return SP_VOID + SP_COLD * 0.2 * shell + SP_EMBER * 0.4 * fil * shell;
    }`, "snrFilament(p)"),

  T("crab-wisps", "crab-like wisps: swirling ridged filaments about a pulsar",
    `vec3 crabWisps(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.52);
      float th = atan(q.y, q.x), r = length(q);
      vec2 u = vec2(th + 0.4 * t, r * 6.0);
      float w = smoothstep(0.6, 0.88, spRidge(u));
      float fall = exp(-r * 3.0) * smoothstep(0.02, 0.06, r);
      return SP_VOID + SP_EMBER * 0.35 * w * fall + SP_TEAL * 0.15 * fall;
    }`, "crabWisps(p, t)"),

  T("plerion-core", "filled remnant: centre-bright plerion, not a hollow shell",
    `vec3 plerionCore(vec2 p) {
      float r = length(p - vec2(0.72, 0.52));
      float fill = exp(-r * 5.5) * (0.5 + 0.5 * spFbm(p * 5.0));
      float edge = exp(-pow((r - 0.22) / 0.05, 2.0));
      return SP_VOID + SP_GOLD * 0.28 * fill + SP_TEAL * 0.2 * edge;
    }`, "plerionCore(p)"),

  T("pulsar-wind", "pulsar wind nebula: equatorial torus plus polar flow",
    `vec3 pulsarWind(vec2 p) {
      vec2 q = (p - vec2(0.72, 0.52)) / vec2(1.15, 0.55);
      float torus = exp(-pow(abs(length(q) - 0.22) / 0.07, 2.0));
      float polar = exp(-pow(q.x / 0.05, 2.0)) * smoothstep(0.08, 0.2, abs(q.y));
      return SP_VOID + SP_TEAL * 0.3 * torus + SP_COLD * 0.25 * polar;
    }`, "pulsarWind(p)"),

  T("magnetar-flare", "magnetar flare sheet: a sudden bright fan",
    `vec4 magnetarFlare(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.52);
      float th = atan(q.y, q.x), r = length(q);
      float fan = smoothstep(0.35, 0.15, abs(th - 0.4)) * exp(-r * 3.0);
      float pulse = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t * 4.0), 3.0);
      vec3 col = SP_VOID + vec3(0.62, 0.22, 0.38) * fan * pulse;
      return vec4(col, spEmit(fan * pulse));
    }`, "magnetarFlare(p, t).rgb"),

  T("radio-lobe", "radio lobes: two fat bubbles off a core",
    `vec3 radioLobe(vec2 p) {
      float L = exp(-length((p - vec2(0.48, 0.52)) / vec2(0.18, 0.12)) * 2.2);
      float R = exp(-length((p - vec2(0.96, 0.52)) / vec2(0.18, 0.12)) * 2.2);
      float core = exp(-length(p - vec2(0.72, 0.52)) * 16.0);
      return SP_VOID + SP_TEAL * 0.32 * (L + R) + SP_HOT * 0.25 * core;
    }`, "radioLobe(p)"),

  T("bow-shock", "bow shock: parabolic front ahead of a mover",
    `vec3 bowShock(vec2 p) {
      vec2 c = vec2(0.85, 0.55), q = p - c;
      float para = q.x + 2.2 * q.y * q.y;
      float shock = exp(-pow(para / 0.04, 2.0)) * step(-0.15, q.x) * (1.0 - step(0.35, q.x));
      float wind = exp(-length(q) * 3.0) * step(q.x, 0.0);
      return SP_VOID + SP_COLD * 0.4 * shock + SP_TEAL * 0.15 * wind;
    }`, "bowShock(p)"),

  T("pair-cascade", "pair-cascade glow: hashed sparkles in a polar cap",
    `vec4 pairCascade(vec2 p) {
      vec2 c = vec2(0.72, 0.78);
      float cap = exp(-length((p - c) / vec2(0.16, 0.10)) * 2.4);
      vec2 gv = floor(p * 30.0), f = fract(p * 30.0) - 0.5;
      float spark = pow(spH21(gv), 8.0) * spAA(length(f) - 0.04) * cap;
      return vec4(SP_VOID + SP_COLD * 0.2 * cap + SP_HOT * 0.5 * spark, spEmit(spark));
    }`, "pairCascade(p).rgb"),

  T("remnant-ring", "circular remnant: clean ring, slight noise, no filaments",
    `vec3 remnantRing(vec2 p) {
      float r = length(p - vec2(0.72, 0.52));
      float ring = spRing(r, 0.26, 0.014 + 0.006 * spFbm(p * 6.0));
      return SP_VOID + SP_TEAL * 0.4 * ring;
    }`, "remnantRing(p)"),
];
