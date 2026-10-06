// GER eyes / mitre / ladybug pattern tiling — 7 operators.
import { G } from "./kit.glsl.js";

const F = "eyes";

export default [
  G("goldGerIris", F, "GER iris: green 12-spoke saw, gold ring, indigo pupil",
    `vec3 goldGerIris(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.55);
      float r = length(q), spoke = gSaw(atan(q.y, q.x) + t * 0.05, 12.0);
      vec3 c = mix(G_IRIS * 0.7, vec3(0.247, 0.749, 0.541), gAA(1.0 - r * 4.0, 0.4));
      c = mix(c, G_IRIS * 0.5, 1.0 - smoothstep(0.04, 0.08, spoke));
      c = mix(c, G_INK, gFill(r - 0.024));
      c = mix(c, gGoldBase(), gFill(abs(r - 0.118) - 0.006));
      return mix(G_UMBER, c, gFill(r - 0.13));
    }`, "goldGerIris(p, t)"),

  G("goldGerMitre", F, "GER mitre: stacked gold chevrons, magenta inlay, cream gap",
    `vec3 goldGerMitre(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.42);
      vec3 c = G_INK;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float y0 = 0.02 + 0.07 * fi;
        float chev = abs(q.x) + (q.y - y0) * 0.85 - 0.10 - 0.02 * fi;
        c = mix(c, gGold(vec3(0.54 + 0.03 * fi, 0.38, 0.10)), gFill(abs(chev) - 0.012) * gFill(0.16 - abs(q.x)));
      }
      return mix(c, G_MAG, gLine(q.x, 1.3) * 0.4);
    }`, "goldGerMitre(p, t)"),

  G("goldLadybugTile", F, "Ladybug tile: repeating split-ellipse motif with gold spots",
    `vec3 goldLadybugTile(vec2 p, float t) {
      vec2 cell = vec2(0.22, 0.18);
      vec2 id = floor(p / cell), f = (fract(p / cell) - 0.5) * cell;
      f.x += (gH21(id) - 0.5) * 0.02;
      float body = length(f / vec2(0.08, 0.06)) - 1.0;
      vec3 c = mix(G_PINK, G_MAG, gLine(f.x, 1.2));
      c = mix(c, gGoldBase(), gFill(length(f - vec2(0.025, 0.012)) - 0.012) + gFill(length(f + vec2(0.022, -0.01)) - 0.010));
      return mix(G_UMBER, c, gFill(body));
    }`, "goldLadybugTile(p, t)"),

  G("goldArrowPupil", F, "Arrow pupil: gold iris disc, requiem-arrow diamond pupil",
    `vec3 goldArrowPupil(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.52);
      float r = length(q);
      vec3 c = mix(gGold(vec3(0.52, 0.36, 0.10)), G_IRIS, gAA(0.10 - r, 0.0));
      float arrow = abs(q.x) * 1.4 + max(q.y, -q.y * 0.35) - 0.034;
      c = mix(c, G_INK, gFill(arrow));
      c = mix(c, G_CREAM * 0.88, gStar4(q * 7.0, 0.35) * 0.55);
      return mix(G_UMBER, c, gFill(r - 0.14));
    }`, "goldArrowPupil(p, t)"),

  G("goldMitreInlay", F, "Mitre inlay: mitre silhouette with gold hairline inlay",
    `vec3 goldMitreInlay(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.40);
      float mitre = max(abs(q.x) + q.y * 0.55 - 0.16, -q.y - 0.02);
      mitre = max(mitre, q.y - 0.38);
      vec3 c = gCel3(0.5 + 0.25 * q.y, 0.38, 0.64, G_UMBER, gGold(vec3(0.52, 0.36, 0.10)), gGold(vec3(0.68, 0.48, 0.14)));
      float inlay = gLine(q.y - 0.10, 1.2) + gLine(q.y - 0.20, 1.2) + gLine(abs(q.x) - 0.04, 1.1);
      c = mix(c, G_CREAM * 0.9, inlay * 0.7);
      return mix(G_INK, c, gFill(mitre));
    }`, "goldMitreInlay(p, t)"),

  G("goldSpotLattice", F, "Spot lattice: hexagonal ladybug-spot tiling, gold on pink",
    `vec3 goldSpotLattice(vec2 p, float t) {
      vec2 q = p * 7.2;
      q.x += step(0.5, fract(q.y * 0.5)) * 0.5;
      vec2 id = floor(q), f = fract(q) - 0.5;
      float h = gH21(id);
      float spot = gFill(length(f) - mix(0.12, 0.22, h));
      return mix(G_PINK * 0.9, gGoldBase(), spot * step(0.4, h));
    }`, "goldSpotLattice(p, t)"),

  G("goldGerGaze", F, "GER gaze: paired irises, gold highlights, shared magenta streak",
    `vec3 goldGerGaze(vec2 p, float t) {
      vec3 c = G_INK;
      for (int i = 0; i < 2; i++) {
        vec2 o = vec2(0.56 + 0.32 * float(i), 0.54);
        vec2 q = p - o;
        float r = length(q);
        vec3 eye = mix(G_IRIS, vec3(0.247, 0.749, 0.541), gAA(0.08 - r, 0.0));
        eye = mix(eye, G_INK, gFill(r - 0.018));
        eye = mix(eye, gGoldBase(), gFill(length(q - vec2(0.018, 0.016)) - 0.008));
        c = mix(c, eye, gFill(r - 0.09));
      }
      return mix(c, G_MAG, gFill(abs(p.y - 0.54) - 0.004) * gFill(abs(p.x - 0.72) - 0.10) * 0.55);
    }`, "goldGerGaze(p, t)"),
];
