// Pulse / claim glow / TBC gold hold — 7 operators.
import { G } from "./kit.glsl.js";

const F = "pulse";

export default [
  G("goldLifePulse", F, "Life pulse: travelling gold ring, magenta echo one beat behind",
    `vec3 goldLifePulse(vec2 p, float t) {
      float r = length(p - vec2(0.72, 0.50));
      float u = fract(t * 0.28);
      float ring = gLine(r - u * 0.40, 2.0);
      float echo = gLine(r - fract(t * 0.28 + 0.18) * 0.40, 1.3);
      vec3 c = mix(G_INK, gGoldBase(), ring);
      return mix(c, G_MAG, echo * 0.55);
    }`, "goldLifePulse(p, t)"),

  G("goldClaimGlow", F, "Claim glow: magenta left / gold right side-bands, GOGOGO hold",
    `vec3 goldClaimGlow(vec2 p, float t) {
      float band = exp(-pow((abs(p.x - 0.72) - 0.52) / 0.08, 2.0));
      float v = fract(p.y * 6.0 + t * 0.15);
      vec3 col = p.x < 0.72 ? G_MAG : gGoldBase();
      float slot = 0.25 + 0.7 * gAA(v, 0.18) * (1.0 - gAA(v, 0.52));
      return mix(G_INK, col, band * slot);
    }`, "goldClaimGlow(p, t)"),

  G("goldTbcHold", F, "TBC gold hold: plate locked on twos, waiting beat, no boil",
    `vec3 goldTbcHold(vec2 p, float t) {
      float hold = floor(t * 12.0 + 1e-5) / 12.0;
      float ndl = 0.50 + 0.28 * p.y - 0.18 * gCut(p, hold * 0.2);
      vec3 c = gCel3(ndl, 0.40, 0.66, G_UMBER, gGold(vec3(0.54, 0.38, 0.10)), gGold(vec3(0.68, 0.48, 0.14)));
      float frame = gFill(abs(length(p - vec2(0.72, 0.50)) - 0.34) - 0.01);
      return mix(c, G_CREAM * 0.9, frame * 0.45);
    }`, "goldTbcHold(p, t)"),

  G("goldPulseClaim", F, "Pulse claim: expanding gold disc that writes a claimed region",
    `vec3 goldPulseClaim(vec2 p, float t) {
      float r = length(p - vec2(0.72, 0.50));
      float R = 0.06 + 0.30 * (0.5 + 0.5 * sin(t * 0.9));
      float claimed = gFill(r - R);
      vec3 field = mix(G_UMBER, G_SINO * 0.45, gFbm(p * 3.4));
      vec3 c = mix(field, gGoldBase() * 0.85, claimed);
      return mix(c, G_MAG, gLine(r - R, 1.8) * 0.55);
    }`, "goldPulseClaim(p, t)"),

  G("goldHoldTick", F, "Hold tick: on-twos stepped pulse, gold flash then cream rest",
    `vec3 goldHoldTick(vec2 p, float t) {
      float stepT = floor(t * 8.0);
      float beat = 1.0 - fract(t * 8.0);
      float r = length(p - vec2(0.72, 0.50));
      float disc = gFill(r - 0.22);
      vec3 rest = G_CREAM * (0.90 + 0.04 * gVn(p * 20.0));
      vec3 flash = gGoldBase();
      float tick = step(0.72, gH21(vec2(stepT, 3.0))) * beat;
      return mix(G_INK, mix(rest, flash, tick), disc);
    }`, "goldHoldTick(p, t)"),

  G("goldGerSeal", F, "GER seal: cream disc, requiem arrow, ladybug flake, gold ring",
    `vec3 goldGerSeal(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q);
      vec3 c = mix(G_INK, G_CREAM * 0.93, gFill(r - 0.28));
      c = mix(c, gGoldBase(), gFill(abs(r - 0.28) - 0.012));
      float shaft = gSeg(p, vec2(0.58, 0.62), vec2(0.86, 0.40), mix(0.018, 0.006, 0.6));
      c = mix(c, gGoldBase(), gFill(shaft) * gFill(r - 0.26));
      c = mix(c, G_PINK, gFill(length(q - vec2(-0.06, -0.04)) - 0.045) * gFill(r - 0.26));
      c = mix(c, gGoldBase(), gFlake((q + vec2(0.06, 0.04)) * 14.0, 0.4) * gFill(r - 0.26) * 0.7);
      return c;
    }`, "goldGerSeal(p, t)"),

  G("goldTruthNever", F, "Truth never: two out-of-phase gold fields that refuse to resolve",
    `vec3 goldTruthNever(vec2 p, float t) {
      float a = gFbm(p * 4.2 + vec2(t * 0.11, 0.0));
      float b = gFbm(p * 4.2 + vec2(0.0, t * 0.11 + 2.7));
      float cancel = abs(a - b);
      vec3 g = gGold(vec3(0.56, 0.38, 0.10) + vec3(0.08, 0.03, 0.0) * a);
      vec3 voidc = mix(G_INK, G_CRIM * 0.45, b * 0.35);
      vec3 c = mix(voidc, g, gAA(cancel, 0.12));
      return mix(c, G_CREAM * 0.86, gFill(length(p - vec2(0.72, 0.50)) - 0.05) * 0.25 * (1.0 - gAA(cancel, 0.08)));
    }`, "goldTruthNever(p, t)"),
];
