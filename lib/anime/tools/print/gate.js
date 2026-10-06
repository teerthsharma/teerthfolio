// Family — analog gate. Telecine registration. Held dirt, not digital shake.
import { P } from "./kit.glsl.js";

const F = "gate";

export default [
  P("printGateWeave", F, "24fps lateral weave: hold-locked chroma shear, density chatter",
    `vec3 printGateWeave(vec3 col, vec2 p, float t) {
      vec2 j = prGateJ(t);
      float h = prHold(t, 24.0);
      float dens = 0.965 + 0.035 * prH21(vec2(h, 8.1));
      vec3 shear = vec3(col.r * (1.0 + j.x * 8.0), col.g, col.b * (1.0 - j.x * 6.0));
      float bar = prBand(p.y, 0.0, 0.018) + prBand(p.y, 0.982, 1.0);
      vec3 ink = shear * dens;
      ink = mix(ink, PR_UMBER * 1.35, bar * 0.40);
      return prOut(prKeepL(col, ink));
    }`),

  P("printGateDirt", F, "gate dirt: held specks as drawings, indigo, never animated snow",
    `vec3 printGateDirt(vec3 col, vec2 p, float t) {
      float h = prHold(t, 24.0);
      vec2 cell = floor(p * vec2(92.0, 70.0));
      float speck = step(0.991, prH21(cell + vec2(h, 0.4)));
      vec2 f = fract(p * vec2(92.0, 70.0)) - 0.5;
      float blob = prFill(length(f - (prH22(cell) - 0.5) * 0.18) - 0.16);
      float flake = step(0.997, prH21(cell + vec2(h, 11.0))) * prFill(abs(f.x) - 0.08);
      return prOut(mix(col, PR_INK * 1.7, max(speck * blob, flake) * 0.55));
    }`),

  P("printSprocket", F, "sprocket perfs: rounded 35mm holes, hold-pulse, paper through the punch",
    `vec3 printSprocket(vec3 col, vec2 p, float t) {
      float h = prHold(t, 24.0);
      float pulse = 0.82 + 0.18 * step(0.5, fract(h * 0.5 + 0.15));
      float hole = 0.0;
      for (int i = 0; i < 9; i++) {
        float y = 0.055 + float(i) * 0.105;
        vec2 c = vec2(mix(0.020, 1.418, step(0.72, p.x)), y);
        vec2 b = abs(p - c) - vec2(0.011, 0.017);
        float d = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - 0.003;
        hole = max(hole, prFill(d));
      }
      float rail = prBand(p.x, 0.0, 0.048) + prBand(p.x, 1.392, 1.44);
      vec3 stock = mix(PR_VERSO, PR_PAPER, pulse);
      vec3 ink = mix(col, col * vec3(0.94, 0.92, 0.88), rail * 0.35);
      return prOut(mix(ink, stock, hole));
    }`),

  P("printGateHair", F, "hair in the gate: vertical held strands, one drawing per frame",
    `vec3 printGateHair(vec3 col, vec2 p, float t) {
      float h = prHold(t, 24.0);
      float colx = floor(p.x * 118.0);
      float on = step(0.994, prH21(vec2(colx, h)));
      float d = abs(fract(p.x * 118.0) - 0.5);
      float w = fwidth(p.x * 118.0) + 1e-5;
      float strand = on * (1.0 - smoothstep(0.0, w * 0.9, d));
      float fade = 0.45 + 0.55 * prVn(vec2(colx, p.y * 8.0 + h));
      return prOut(mix(col, PR_INK * 1.65, strand * fade * 0.60));
    }`),

  P("printTelecine", F, "telecine chatter: two-axis hold wander plus a density flash on the cut",
    `vec3 printTelecine(vec3 col, vec2 p, float t) {
      float h = prHold(t, 24.0);
      vec2 j = prGateJ(t);
      float cut = fract(t * 0.16);
      float flash = exp(-cut * 16.0) * 0.12;
      float wander = 0.97 + j.x * 4.0 + j.y * 2.0;
      vec3 ink = col * vec3(wander + flash, wander, wander - flash * 0.4);
      float tick = prLine(p.x - (0.02 + j.x * 8.0), 1.3);
      ink = mix(ink, PR_UMBER * 1.4, tick * 0.22);
      return prOut(prKeepL(col, ink));
    }`),
];
