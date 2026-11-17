// Pierrot plates and accents: night sky, dune contours, crescent moon, stepped glow, ink-brush stroke.
import { Color, Vector2 } from "three";
import { defineModule } from "./define.js";

export const PLATE = [
  defineModule({
    name: "pierrotNightPlate",
    doc: "painted night sky in five flat value bands with two flat smoke wisps stepping on twos",
    draws: "A night sky cut into five flat horizontal bands, darkest at the top, with two dark smoke wisps drifting sideways in twelve-frame steps.",
    use: "plate",
    params: "uPrrSkyTop and uPrrSkyLow are the colours of the top and bottom band; uPrrSkySteps is the band count; uPrrWisp is the smoke colour",
    uniforms: () => ({ uPrrSkyTop: { value: new Color(0.125, 0.106, 0.106) }, uPrrSkyLow: { value: new Color(0.204, 0.192, 0.204) }, uPrrSkySteps: { value: 5 }, uPrrWisp: { value: new Color(0.094, 0.086, 0.090) } }),
    glsl: /* glsl */ `
    uniform vec3 uPrrSkyTop;
    uniform vec3 uPrrSkyLow;
    uniform float uPrrSkySteps;
    uniform vec3 uPrrWisp;
    vec3 pierrotNightPlate(vec2 p, float t) {
      float v = clamp(floor((1.0 - p.y) * uPrrSkySteps) / max(uPrrSkySteps - 1.0, 1.0), 0.0, 1.0);
      vec3 c = mix(uPrrSkyTop, uPrrSkyLow, v);
      float x = prrHold(t, 12.0) * 0.06;
      float w1 = prrAA(prrVn(vec2(p.x * 1.8 - x, p.y * 6.0)), 0.66) * prrAA(0.62 - abs(p.y - 0.55), 0.0);
      float w2 = prrAA(prrVn(vec2(p.x * 2.6 - x * 1.7 + 5.0, p.y * 7.0 + 3.0)), 0.70) * prrAA(0.40 - abs(p.y - 0.78), 0.0);
      return mix(c, uPrrWisp, max(w1, w2) * 0.9);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prrOut(pierrotNightPlate(p, t)); }`,
  }),

  defineModule({
    name: "pierrotDuneContours",
    doc: "dunes drawn as cream contour lines over a near-black ground, hatched on the shadow side, drawn far to near",
    draws: "Rolling dunes made only of thin cream contour lines on near-black ground under a flat dark sky, with grey hatching on each shadowed slope, appearing from the horizon forward.",
    use: "plate",
    params: "uPrrHorizon is the horizon height (0 bottom, 1 top); uPrrDraw reveals the contours from the horizon (0 none, 1 all); uPrrDuneAmp is the dune swell",
    uniforms: () => ({ uPrrHorizon: { value: 0.42 }, uPrrDraw: { value: 1 }, uPrrDuneAmp: { value: 2.2 } }),
    glsl: /* glsl */ `
    uniform float uPrrHorizon;
    uniform float uPrrDraw;
    uniform float uPrrDuneAmp;
    vec3 pierrotDuneContours(vec2 p) {
      float depth = (uPrrHorizon - p.y) / max(uPrrHorizon, 1e-3);
      float g = depth * 38.0 + uPrrDuneAmp * sin(p.x * 2.7 + depth * 5.0) + 0.5 * uPrrDuneAmp * sin(p.x * 6.3 - 1.0);
      float slope = uPrrDuneAmp * (2.7 * cos(p.x * 2.7 + depth * 5.0) + 3.15 * cos(p.x * 6.3 - 1.0));
      float shown = prrAA(uPrrDraw - depth, 0.0) * prrAA(depth, 0.0);
      float ln = prrLine(fract(g) - 0.5, 1.4);
      float hatch = prrLine(fract((p.x + p.y) * 70.0) - 0.5, 1.2) * prrAA(slope, 0.0);
      vec3 c = vec3(0.094, 0.086, 0.082);
      c = mix(c, vec3(0.388, 0.435, 0.412), hatch * shown * 0.8);
      c = mix(c, vec3(0.957, 0.910, 0.784), ln * shown);
      return mix(vec3(0.039, 0.024, 0.078), c, prrAA(depth, 0.0));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prrOut(pierrotDuneContours(p)); }`,
  }),

  defineModule({
    name: "pierrotMoon",
    doc: "crescent moon as one flat white shape with a hard halo ring and one flat glow disc, no gradient",
    draws: "A thin white crescent with a hairline pale-blue ring around it and a faint flat disc of glow behind, over whatever sits under it.",
    use: "card",
    params: "uPrrMoonBite is how far the cut-out disc slides across (0 full moon, 0.5 thin crescent); uPrrMoonGlow is the strength of the flat glow disc",
    uniforms: () => ({ uPrrMoonBite: { value: 0.42 }, uPrrMoonGlow: { value: 0.12 } }),
    glsl: /* glsl */ `
    uniform float uPrrMoonBite;
    uniform float uPrrMoonGlow;
    vec3 pierrotMoon(vec3 bg, vec2 q) {
      float disc = length(q) - 1.0;
      float cres = max(disc, -(length(q - vec2(uPrrMoonBite * 2.0, 0.12)) - 0.92));
      vec3 c = mix(bg, vec3(0.847, 0.925, 1.0), prrFill(length(q) - 2.4) * uPrrMoonGlow);
      c = mix(c, vec3(0.847, 0.925, 1.0), prrLine(length(q) - 1.35, 1.6));
      return mix(c, vec3(0.957, 0.957, 0.941), prrFill(cres));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prrOut(pierrotMoon(vec3(0.04, 0.024, 0.078), (p - vec2(0.8, 0.5)) * 7.0)); }`,
  }),

  defineModule({
    name: "pierrotStepGlow",
    doc: "fire glow as four posterised steps rising off a wavering horizon band, with a thin hot core line",
    draws: "A band of orange firelight along a wavy horizon, fading upward in four flat steps from deep brown-red to amber, with one thin yellow line at the ridge that steps sideways on twos.",
    use: "mask",
    params: "uPrrGlowY is the band peak height (0 bottom, 1 top); uPrrGlowK is how far the glow reaches above it; the four step colours are the dark-red to amber fire palette",
    uniforms: () => ({ uPrrGlowY: { value: 0.32 }, uPrrGlowK: { value: 0.09 } }),
    glsl: /* glsl */ `
    uniform float uPrrGlowY;
    uniform float uPrrGlowK;
    vec3 pierrotStepGlow(vec3 bg, vec2 p, float t) {
      float x = p.x / 1.6;
      float yb = uPrrGlowY + 0.022 * sin(17.0 * x) + 0.012 * sin(49.0 * x) + 0.004 * sin(prrHold(t, 12.0) * 7.0 + p.x * 20.0);
      float d = max(p.y - yb, 0.0);
      float lvl = floor(4.99 * exp(-d / uPrrGlowK));
      vec3 c = bg;
      c = mix(c, vec3(0.271, 0.122, 0.098), step(0.5, lvl));
      c = mix(c, vec3(0.529, 0.235, 0.133), step(1.5, lvl));
      c = mix(c, vec3(0.761, 0.376, 0.176), step(2.5, lvl));
      c = mix(c, vec3(0.898, 0.573, 0.157), step(3.5, lvl));
      c = mix(bg, c, prrAA(p.y - yb, 0.0));
      return mix(c, vec3(0.984, 0.765, 0.349), prrLine(p.y - yb, 2.0));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prrOut(pierrotStepGlow(mix(vec3(0.043, 0.012, 0.012), vec3(0.125, 0.047, 0.039), p.y), p, t)); }`,
  }),

  defineModule({
    name: "pierrotInkBrush",
    doc: "one tapered ink-brush stroke with dry-bristle gaps toward its tail, drawn on from its start",
    draws: "A single bowed black brush stroke that is thick and solid at the start and thins to a split, dry-bristle tail, sweeping on from left to right.",
    use: "line",
    params: "uPrrBrushA and uPrrBrushB are the stroke ends; uPrrBrushBow bends it sideways; uPrrBrushW is the root width; uPrrBrushDraw is how much of the stroke is drawn (0 to 1)",
    uniforms: () => ({ uPrrBrushA: { value: new Vector2(0.45, 0.30) }, uPrrBrushB: { value: new Vector2(1.15, 0.62) }, uPrrBrushBow: { value: 0.12 }, uPrrBrushW: { value: 0.035 }, uPrrBrushDraw: { value: 1 } }),
    glsl: /* glsl */ `
    uniform vec2 uPrrBrushA;
    uniform vec2 uPrrBrushB;
    uniform float uPrrBrushBow;
    uniform float uPrrBrushW;
    uniform float uPrrBrushDraw;
    float pierrotInkBrush(vec2 p) {
      vec2 ab = uPrrBrushB - uPrrBrushA;
      vec2 nrm = normalize(vec2(-ab.y, ab.x));
      float best = 1e3;
      float bs = 0.0;
      float bw = 0.01;
      for (int i = 0; i < 16; i++) {
        float s0 = float(i) / 16.0;
        float s1 = float(i + 1) / 16.0;
        vec2 pa = uPrrBrushA + ab * s0 + nrm * uPrrBrushBow * sin(3.14159 * s0);
        vec2 pb = uPrrBrushA + ab * s1 + nrm * uPrrBrushBow * sin(3.14159 * s1);
        vec2 e = pb - pa;
        float h = clamp(dot(p - pa, e) / dot(e, e), 0.0, 1.0);
        float s = mix(s0, s1, h);
        float w = uPrrBrushW * pow(max(1.0 - s, 0.02), 0.8) * (0.8 + 0.2 * sin(s * 9.0));
        float d = length(p - pa - e * h) - w;
        if (d < best) { best = d; bs = s; bw = w; }
      }
      float dry = prrAA(prrVn(vec2(bs * 28.0, best / bw * 5.0)), 0.30 + 0.45 * bs);
      return prrFill(best) * mix(1.0, dry, smoothstep(0.35, 0.7, bs)) * prrAA(uPrrBrushDraw - bs, 0.0);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prrOut(mix(vec3(0.88, 0.84, 0.74), PRR_INK, pierrotInkBrush(p))); }`,
  }),
];
