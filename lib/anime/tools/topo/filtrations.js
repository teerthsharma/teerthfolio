// Filtrations / isolines: sublevel, superlevel, interlevel, stars, offsets, density.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoSublevelBands",
    doc: "sublevel sets {x : f(x) ≤ α} as stacked bands; the moving isoline is component birth",
    glsl: /* glsl */ `
    vec3 topoSublevelBands(vec2 p, float t) {
      float f = tMorse(p), a = 0.12 + 0.62 * (0.5 + 0.5 * sin(t * 0.45));
      float q = floor(f * 9.0) / 9.0;
      vec3 col = mix(tInk(), tBirth(), clamp(q * 1.15, 0.0, 1.0));
      float below = 1.0 - smoothstep(a - fwidth(f), a + fwidth(f), f);
      col = mix(tPaper(), col, below);
      return tTone(mix(col, tSaddle(), tIso(f, a, 1.7)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSublevelBands(p, t); }`,
  }),
  defineModule({
    name: "topoSuperlevelBands",
    doc: "superlevel sets {x : f(x) ≥ α} swept high-to-low; peaks born first, elder rule implied",
    glsl: /* glsl */ `
    vec3 topoSuperlevelBands(vec2 p, float t) {
      float f = tMorse(p), a = 0.72 - 0.58 * (0.5 + 0.5 * sin(t * 0.4));
      float q = floor((1.0 - f) * 8.0) / 8.0;
      vec3 col = mix(tAmber(), tDeath(), clamp(q, 0.0, 1.0));
      float above = smoothstep(a - fwidth(f), a + fwidth(f), f);
      col = mix(tPaper(), col, above);
      return tTone(mix(col, tInk(), tIso(f, a, 1.6)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSuperlevelBands(p, t); }`,
  }),
  defineModule({
    name: "topoInterlevelWindow",
    doc: "interlevel set {x : a ≤ f(x) ≤ b} — the window whose persistence is death−birth",
    glsl: /* glsl */ `
    vec3 topoInterlevelWindow(vec2 p, float t) {
      float f = tMorse(p), mid = 0.38 + 0.12 * sin(t * 0.5), w = 0.14 + 0.06 * cos(t * 0.33);
      float win = tBand(f, mid - w, mid + w);
      vec3 col = mix(tPaper(), tMint(), win);
      return tTone(mix(mix(col, tBirth(), tIso(f, mid - w, 1.4)), tDeath(), tIso(f, mid + w, 1.4)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoInterlevelWindow(p, t); }`,
  }),
  defineModule({
    name: "topoIsolineBirth",
    doc: "isolines f=α appear at critical values; ink only at regular levels, rust at births",
    glsl: /* glsl */ `
    vec3 topoIsolineBirth(vec2 p, float t) {
      float f = tMorse(p);
      vec3 col = tFieldPaper(f * 0.85 + 0.1);
      for (int i = 1; i <= 7; i++) {
        float lvl = float(i) / 8.0 + 0.02 * sin(t * 0.2);
        float ink = tIso(f, lvl, 1.15);
        float nearCrit = tCrit(p) * (1.0 - smoothstep(0.04, 0.12, abs(f - lvl)));
        col = mix(col, mix(tInk(), tSaddle(), nearCrit), ink);
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoIsolineBirth(p, t); }`,
  }),
  defineModule({
    name: "topoOffsetFiltration",
    doc: "offset filtration of a curve: {x : dist(x,γ) ≤ r} growing tubular neighborhoods",
    glsl: /* glsl */ `
    vec3 topoOffsetFiltration(vec2 p, float t) {
      vec2 c = p - vec2(0.72, 0.5);
      float ang = atan(c.y, c.x);
      float rad = 0.22 + 0.06 * sin(3.0 * ang + t * 0.3) + 0.03 * sin(5.0 * ang);
      float d = abs(length(c) - rad);
      float r = 0.02 + 0.11 * (0.5 + 0.5 * sin(t * 0.55));
      float tube = 1.0 - smoothstep(r - fwidth(d), r + fwidth(d), d);
      vec3 col = mix(tPaper(), tBirth(), tube * (1.0 - d / max(r, 1e-4)));
      return tTone(mix(col, tInk(), tLine(d, 1.3)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoOffsetFiltration(p, t); }`,
  }),
  defineModule({
    name: "topoExcursionSet",
    doc: "excursion set of a Gaussian-like field {x : fbm(x) ≥ u} with isoline boundary",
    glsl: /* glsl */ `
    vec3 topoExcursionSet(vec2 p, float t) {
      float f = tFbm(p * 4.2 + t * 0.05);
      float u = 0.42 + 0.12 * sin(t * 0.35);
      float ex = smoothstep(u - fwidth(f), u + fwidth(f), f);
      vec3 col = mix(tPaper(), mix(tInk(), tVoid(), clamp((f - u) * 3.0, 0.0, 1.0)), ex);
      return tTone(mix(col, tSaddle(), tIso(f, u, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoExcursionSet(p, t); }`,
  }),
  defineModule({
    name: "topoLowerStar",
    doc: "lower-star filtration of a grid: a cell enters when its highest vertex does",
    glsl: /* glsl */ `
    vec3 topoLowerStar(vec2 p, float t) {
      vec2 g = p * vec2(10.0, 7.0);
      vec2 i = floor(g), f = fract(g);
      float v00 = tMorse((i + vec2(0.0, 0.0)) / vec2(10.0, 7.0));
      float v10 = tMorse((i + vec2(1.0, 0.0)) / vec2(10.0, 7.0));
      float v01 = tMorse((i + vec2(0.0, 1.0)) / vec2(10.0, 7.0));
      float v11 = tMorse((i + vec2(1.0, 1.0)) / vec2(10.0, 7.0));
      float star = max(max(v00, v10), max(v01, v11));
      float a = 0.2 + 0.55 * (0.5 + 0.5 * sin(t * 0.42));
      float inF = 1.0 - smoothstep(a - 0.03, a + 0.03, star);
      vec3 col = mix(tPaper(), mix(tInk(), tBirth(), star), inF);
      float grid = max(tLine(f.x, 1.1), tLine(f.y, 1.1));
      return tTone(mix(col, tSaddle(), grid * 0.35));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLowerStar(p, t); }`,
  }),
  defineModule({
    name: "topoUpperStar",
    doc: "upper-star filtration: a cell enters when its lowest vertex does (dual of lower-star)",
    glsl: /* glsl */ `
    vec3 topoUpperStar(vec2 p, float t) {
      vec2 g = p * vec2(10.0, 7.0);
      vec2 i = floor(g), f = fract(g);
      float v00 = tMorse((i + vec2(0.0, 0.0)) / vec2(10.0, 7.0));
      float v10 = tMorse((i + vec2(1.0, 0.0)) / vec2(10.0, 7.0));
      float v01 = tMorse((i + vec2(0.0, 1.0)) / vec2(10.0, 7.0));
      float v11 = tMorse((i + vec2(1.0, 1.0)) / vec2(10.0, 7.0));
      float star = min(min(v00, v10), min(v01, v11));
      float a = 0.65 - 0.5 * (0.5 + 0.5 * sin(t * 0.4));
      float inF = smoothstep(a - 0.03, a + 0.03, star);
      vec3 col = mix(tPaper(), mix(tDeath(), tAmber(), star), inF);
      return tTone(mix(col, tInk(), max(tLine(f.x, 1.05), tLine(f.y, 1.05)) * 0.32));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoUpperStar(p, t); }`,
  }),
  defineModule({
    name: "topoExtendedPersistence",
    doc: "extended persistence: ordinary sublevel bars plus relative/superlevel bars on one scale",
    glsl: /* glsl */ `
    vec3 topoExtendedPersistence(vec2 p, float t) {
      float f = tMorse(p);
      float a = 0.5 + 0.4 * sin(t * 0.38);
      float ord = 1.0 - smoothstep(a - fwidth(f), a + fwidth(f), f);
      float rel = smoothstep((1.0 - a) - fwidth(f), (1.0 - a) + fwidth(f), f);
      vec3 col = mix(tPaper(), tBirth(), ord * 0.85);
      col = mix(col, tDeath(), rel * 0.7);
      col = mix(col, tSaddle(), tIso(f, a, 1.3) + tIso(f, 1.0 - a, 1.3));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoExtendedPersistence(p, t); }`,
  }),
  defineModule({
    name: "topoDensityFiltration",
    doc: "density filtration: sublevel of a kernel density estimate over landmarks",
    glsl: /* glsl */ `
    vec3 topoDensityFiltration(vec2 p, float t) {
      float dens = 0.0, h = 0.11 + 0.03 * sin(t * 0.25);
      for (int i = 0; i < 9; i++) {
        vec2 d = p - tSite(i, t);
        dens += exp(-dot(d, d) / (2.0 * h * h));
      }
      dens /= 9.0;
      float a = 0.18 + 0.22 * (0.5 + 0.5 * sin(t * 0.5));
      float band = floor(dens * 7.0) / 7.0;
      vec3 col = mix(tPaper(), tMint(), clamp(band * 1.2, 0.0, 1.0));
      col = mix(col, tPaper(), 1.0 - smoothstep(a - 0.02, a + 0.02, dens));
      return tTone(mix(col, tInk(), tIso(dens, a, 1.6)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoDensityFiltration(p, t); }`,
  }),
  defineModule({
    name: "topoDistanceFiltration",
    doc: "distance-to-set filtration {x : d(x,S) ≤ r} of a landmark set S",
    glsl: /* glsl */ `
    vec3 topoDistanceFiltration(vec2 p, float t) {
      float d = tMinSite(p, t);
      float r = 0.06 + 0.16 * (0.5 + 0.5 * sin(t * 0.48));
      float q = floor(d * 12.0) / 12.0;
      vec3 col = mix(tBirth(), tPaper(), clamp(q * 1.4, 0.0, 1.0));
      col = mix(col, tPaper(), smoothstep(r - fwidth(d), r + fwidth(d), d));
      return tTone(mix(col, tInk(), tIso(d, r, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoDistanceFiltration(p, t); }`,
  }),
  defineModule({
    name: "topoAlphaFiltration",
    doc: "alpha-complex radius: faces whose circumradius is ≤ α, drawn as growing disks",
    glsl: /* glsl */ `
    vec3 topoAlphaFiltration(vec2 p, float t) {
      float d1 = tMinSite(p, t), d2 = tSecondSite(p, t);
      float alpha = 0.08 + 0.14 * (0.5 + 0.5 * sin(t * 0.44));
      float inBall = 1.0 - smoothstep(alpha - fwidth(d1), alpha + fwidth(d1), d1);
      float mid = abs(d2 - d1);
      float face = inBall * (1.0 - smoothstep(0.04, 0.1, mid));
      vec3 col = mix(tPaper(), tAmber(), inBall * 0.55);
      col = mix(col, tSaddle(), face * 0.65);
      return tTone(mix(col, tInk(), tIso(d1, alpha, 1.4)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoAlphaFiltration(p, t); }`,
  }),
  defineModule({
    name: "topoSublevelGradientFlow",
    doc: "gradient flow of the filtration function: streamlines into minima of the sublevel",
    glsl: /* glsl */ `
    vec3 topoSublevelGradientFlow(vec2 p, float t) {
      vec2 g = tGrad(p);
      float f = tMorse(p);
      vec2 dir = normalize(-g + 1e-5);
      float flow = abs(sin((p.x * dir.y - p.y * dir.x) * 28.0 + t * 0.8));
      float stripe = 1.0 - smoothstep(0.15, 0.45, flow);
      vec3 col = tFieldPaper(f);
      col = mix(col, tBirth(), stripe * 0.55 * (1.0 - tCrit(p)));
      return tTone(mix(col, tSaddle(), tCrit(p) * 0.8));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSublevelGradientFlow(p, t); }`,
  }),
  defineModule({
    name: "topoLevelsetSweep",
    doc: "continuous level-set sweep: α(t) paints only the current regular level as a traveling front",
    glsl: /* glsl */ `
    vec3 topoLevelsetSweep(vec2 p, float t) {
      float f = tMorse(p);
      float a = fract(t * 0.12);
      float prox = abs(f - a);
      float front = 1.0 - smoothstep(0.0, 0.045 + fwidth(f) * 2.0, prox);
      vec3 col = tFieldPaper(f * 0.7);
      col = mix(col, tBirth(), front);
      col = mix(col, tDeath(), tIso(f, a, 1.8));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLevelsetSweep(p, t); }`,
  }),
  defineModule({
    name: "topoSublevelComponents",
    doc: "color sublevel components by which peak owns them (union-find / elder labels)",
    glsl: /* glsl */ `
    vec3 topoSublevelComponents(vec2 p, float t) {
      float f = tMorse(p), a = 0.18 + 0.55 * (0.5 + 0.5 * sin(t * 0.36));
      float below = 1.0 - smoothstep(a - fwidth(f), a + fwidth(f), f);
      float dA = length(p - vec2(0.55, 0.64)), dB = length(p - vec2(1.05, 0.46));
      vec3 lab = dA < dB ? tBirth() : tDeath();
      float merged = 1.0 - smoothstep(0.22, 0.38, abs(dA - dB));
      lab = mix(lab, tSaddle(), merged * step(a, 0.42));
      vec3 col = mix(tPaper(), lab, below);
      return tTone(mix(col, tInk(), tIso(f, a, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSublevelComponents(p, t); }`,
  }),
];
