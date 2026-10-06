import { defineModule } from "./define.js";

export default defineModule({
  name: "seal-script-glow",
  doc: "ofuda plate: paper card, cinnabar seal square, five ink strokes with a red corona — fuin still, not a glyph hash",
  glsl: /* glsl */ `
  vec3 sealScriptGlow(vec2 p, float t) {
    vec2 q = p - vec2(0.72, 0.50);
    float card = sBox(q, vec2(0.18, 0.34));
    vec3 field = mix(S_INDIGO, S_VOID, 0.45);
    vec3 paper = mix(S_PAPER, vec3(0.820, 0.740, 0.620), sAA(q.y, 0.10));
    vec3 col = mix(field, paper, sFill(card));
    col = mix(col, S_INK, sLine(card, 1.8));
    float seal = sBox(q - vec2(0.0, 0.20), vec2(0.055, 0.055));
    col = mix(col, S_SEAL, sFill(seal));
    col = mix(col, vec3(0.860, 0.220, 0.180), sLine(seal, 1.4));
    float stroke = 8.0;
    stroke = min(stroke, sSeg(q, vec2(-0.04, 0.06), vec2(0.05, 0.08)) - 0.012);
    stroke = min(stroke, sSeg(q, vec2(0.00, 0.10), vec2(0.00, -0.16)) - 0.010);
    stroke = min(stroke, sSeg(q, vec2(-0.07, -0.04), vec2(0.08, -0.02)) - 0.011);
    stroke = min(stroke, sSeg(q, vec2(-0.06, -0.12), vec2(0.02, -0.18)) - 0.009);
    stroke = min(stroke, sSeg(q, vec2(0.04, -0.08), vec2(0.09, -0.16)) - 0.008);
    float glow = sFill(stroke - 0.018);
    col = mix(col, S_SEAL, glow * sFill(card) * 0.55);
    col = mix(col, S_INK, sFill(stroke) * sFill(card));
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return sealScriptGlow(p, t); }`,
});
