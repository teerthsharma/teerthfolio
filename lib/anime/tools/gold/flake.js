// Ladybug flake / gold dust / gild ring — 8 operators.
import { G } from "./kit.glsl.js";

const F = "flake";

export default [
  G("goldLadybugFlake", F, "Ladybug flake: hash-gated gold discs on a pink field, not yellow paint",
    `vec3 goldLadybugFlake(vec2 p, float t) {
      vec2 id = floor(p * 9.0), f = fract(p * 9.0) - 0.5;
      float h = gH21(id + floor(t * 0.15));
      float spot = gFill(length(f) - 0.16 * step(0.62, h)) * step(0.62, h);
      return mix(G_PINK * (0.92 + 0.08 * gVn(p * 14.0)), gGoldBase(), spot);
    }`, "goldLadybugFlake(p, t)"),

  G("goldDustMote", F, "Gold dust motes: sparse exp cores, lazy hash flicker",
    `vec3 goldDustMote(vec2 p, float t) {
      vec2 id = floor(p * 22.0), f = fract(p * 22.0) - 0.5;
      float h = gH21(id);
      float flick = 0.55 + 0.45 * step(0.35, fract(h * 17.0 + t * 0.7));
      float mote = exp(-dot(f, f) * 18.0) * step(0.72, h) * flick;
      return G_UMBER + gGoldBase() * mote * gEmit(0.75);
    }`, "goldDustMote(p, t)"),

  G("goldGildRing", F, "Gild ring: annular wavelength grade, angular flake noise",
    `vec3 goldGildRing(vec2 p, float t) {
      vec2 pol = gPolar(p, vec2(0.72, 0.50));
      float ang = pol.y, r = pol.x;
      float dd = r - 0.28 - (gFbm(vec2(ang * 2.4, 2.0)) - 0.5) * 0.04;
      float ring = exp(-dd * dd / 0.0018);
      vec3 g = gGold(vec3(0.55, 0.38, 0.10) + vec3(0.10, 0.04, 0.0) * (0.5 + 0.5 * sin(ang * 3.0 + t)));
      return mix(G_INK, g, ring);
    }`, "goldGildRing(p, t)"),

  G("goldFlakeVoronoi", F, "Voronoi flake: gold only in cell cores, pink walls",
    `vec3 goldFlakeVoronoi(vec2 p, float t) {
      vec2 v = gVor(p * 7.2 + vec2(t * 0.04, 0.0));
      float core = gFill(v.x - 0.12);
      vec3 field = mix(G_PINK * 0.88, G_UMBER, gAA(v.y, 0.18) * 0.35);
      return mix(field, gGoldBase(), core * (1.0 - gAA(v.x, 0.20)));
    }`, "goldFlakeVoronoi(p, t)"),

  G("goldDustDrift", F, "Drifting gold dust along a sine current, hash cells",
    `vec3 goldDustDrift(vec2 p, float t) {
      vec2 q = p + vec2(t * 0.07, 0.04 * sin(p.x * 6.0 + t * 0.8));
      vec2 id = floor(q * 18.0), f = fract(q * 18.0) - 0.5;
      float h = gH21(id);
      float mote = exp(-dot(f - (gH22(id) - 0.5) * 0.3, f - (gH22(id) - 0.5) * 0.3) * 22.0);
      return G_UMBER + gGoldBase() * mote * step(0.68, h) * gEmit(0.7);
    }`, "goldDustDrift(p, t)"),

  G("goldGildCrest", F, "Gild crest: four concentric rings, hash-modulated half-width",
    `vec3 goldGildCrest(vec2 p, float t) {
      float r = length(p - vec2(0.72, 0.50));
      vec3 c = G_INK;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float r0 = 0.10 + 0.08 * fi;
        float hw = 0.008 + 0.006 * gH21(vec2(fi, 2.0));
        c = mix(c, gGold(vec3(0.52 + 0.06 * fi, 0.36, 0.10)), gFill(abs(r - r0) - hw));
      }
      return c;
    }`, "goldGildCrest(p, t)"),

  G("goldLadybugSplit", F, "Split ladybug: ellipse, magenta seam, seven gold dots",
    `vec3 goldLadybugSplit(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.48);
      float body = length(q / vec2(0.11, 0.085)) - 1.0;
      vec3 c = mix(G_PINK, G_MAG, gLine(q.x, 1.5) * gFill(body));
      for (int i = 0; i < 7; i++) {
        float a = float(i) * 0.9 - 0.3;
        c = mix(c, gGoldBase(), gFill(length(q - 0.048 * vec2(cos(a), sin(a) * 0.8)) - 0.012) * gFill(body));
      }
      return mix(G_INK, c, gFill(body));
    }`, "goldLadybugSplit(p, t)"),

  G("goldLeafScatter", F, "Gold-leaf scraps: hash-rotated diamonds, wavelength grade",
    `vec3 goldLeafScatter(vec2 p, float t) {
      vec2 id = floor(p * 8.0), f = fract(p * 8.0) - 0.5;
      float h = gH21(id), a = h * 6.28318;
      vec2 r = vec2(f.x * cos(a) - f.y * sin(a), f.x * sin(a) + f.y * cos(a));
      float d = abs(r.x) + abs(r.y) * 1.6 - 0.18 * step(0.55, h);
      vec3 leaf = gGold(vec3(0.56, 0.38, 0.10) + vec3(0.08, 0.03, 0.0) * h);
      return mix(G_UMBER, leaf, gFill(d) * step(0.55, h));
    }`, "goldLeafScatter(p, t)"),
];
