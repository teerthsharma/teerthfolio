// prettytv look: cel ramp, fur shading, coloured line, glossy eye and hair ring, the character half of the studio look.
import { defineModule as D } from "./define.js";

export const LOOK = [
  D({
    name: "ptvCelRamp", doc: "four-tone cel ramp whose shade is hue-shifted cool and whose light is warmed, bands held hard",
    uniforms: { uPtvRampBands: 4, uPtvRampShift: 0.6 },
    draws: "A pale-blue ball on a banded blue-grey wall, lit in four flat tones: cool violet-blue shade, base, base, warm light.",
    use: "surface", params: "uPtvRampBands = number of tones (2 to 7); uPtvRampShift = how far the shade turns cool, 0 to 1; ptvRampMix(h, base, bands, shift) is the reusable call",
    demoExpr: "ptvCelRamp(p, t)",
    glsl: `
vec3 ptvRampMix(float h, vec3 base, float bands, float shift) {
  float q = ptvPost(clamp(h, 0.0, 1.0), bands);
  vec3 shade = ptvCool(base * 0.60, shift);
  vec3 lit = ptvWarm(base * 1.08, 0.8);
  vec3 c = mix(shade, base, clamp(q * 1.8, 0.0, 1.0));
  return mix(c, lit, clamp((q - 0.55) * 2.4, 0.0, 1.0));
}
vec3 ptvCelRamp(vec2 p, float t) {
  vec3 bg = mix(vec3(0.62, 0.70, 0.80), vec3(0.80, 0.84, 0.88), ptvPost(p.y, 3.0));
  vec2 q = (p - vec2(0.72, 0.50)) / 0.30;
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  vec3 L = normalize(vec3(-0.45 + 0.10 * sin(ptvHold(t, 12.0) * 0.5), 0.60, 0.65));
  float h = smoothstep(-0.35, 0.85, dot(normalize(vec3(q, z + 1e-3)), L));
  vec3 body = ptvRampMix(h, vec3(0.42, 0.58, 0.78), uPtvRampBands, uPtvRampShift);
  return ptvCap(mix(bg, body, ptvFill(length(q) - 1.0)));
}`,
  }),
  D({
    name: "ptvFurShade", doc: "fur-and-skin cel: terminator broken by fur tufts, a warm blush band at the shade edge, a cool rim",
    uniforms: { uPtvFurFluff: 38, uPtvFurBlush: 0.7 },
    draws: "A chubby blue-grey seal-shaped body with a cream belly and rose cheek, shaded in three flat tones with a ragged furry shadow edge and a cool rim.",
    use: "surface", params: "uPtvFurFluff = tuft frequency on the shadow edge; uPtvFurBlush = strength of the warm band and cheek blush; ptvFurMix(h, p, base, fluff, blush) is the reusable call",
    demoExpr: "ptvFurShade(p, t)",
    glsl: `
vec3 ptvFurMix(float h, vec2 p, vec3 base, float fluff, float blush) {
  float hh = h + (ptvVn(p * fluff) - 0.5) * 0.22 * (1.0 - abs(h * 2.0 - 1.0));
  vec3 c = mix(ptvCool(base * 0.62, 0.7), base, ptvAA(hh, 0.40));
  c = mix(c, vec3(0.86, 0.50, 0.54) * (0.5 + 0.5 * base), (ptvAA(hh, 0.40) - ptvAA(hh, 0.50)) * blush * 0.7);
  return mix(c, ptvWarm(base * 1.10, 0.8), ptvAA(hh, 0.74));
}
vec3 ptvFurShade(vec2 p, float t) {
  vec3 bg = mix(vec3(0.70, 0.78, 0.84), vec3(0.84, 0.86, 0.88), ptvPost(p.y, 3.0));
  vec2 q = (p - vec2(0.72, 0.48)) / vec2(0.36, 0.27);
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  float h = smoothstep(-0.30, 0.90, dot(normalize(vec3(q, z + 1e-3)), normalize(vec3(-0.5, 0.6, 0.6))));
  vec3 body = ptvFurMix(h, p, vec3(0.52, 0.60, 0.72), uPtvFurFluff, uPtvFurBlush);
  float belly = ptvFill(ptvEll(p, vec2(0.74, 0.40), vec2(0.20, 0.17)));
  body = mix(body, ptvFurMix(h, p, vec3(0.92, 0.88, 0.80), uPtvFurFluff, uPtvFurBlush), belly);
  float cheek = ptvFill(ptvEll(p, vec2(0.52, 0.52), vec2(0.045, 0.028)));
  body = mix(body, vec3(0.92, 0.52, 0.58), cheek * uPtvFurBlush);
  body = mix(body, vec3(0.66, 0.86, 1.0), ptvAA(1.0 - z, 0.80) * 0.65);
  return ptvCap(mix(bg, body, ptvFill(length(q) - 1.0)));
}`,
  }),
  D({
    name: "ptvLineTint", doc: "coloured line: a darkened hue-shifted copy of the fill, width swelling and thinning round the shape",
    uniforms: { uPtvLinePx: 2.2, uPtvLineTaper: 0.55 },
    draws: "Three flat shapes, coral, teal and gold, each outlined in a deep tint of its own colour that thickens on one side and thins on the other, never black.",
    use: "line", params: "uPtvLinePx = line width in pixels; uPtvLineTaper = how much the width swells and thins, 0 to 1; ptvLineCol(fill) and ptvLineW(p, centre, px, taper) are the reusable calls",
    demoExpr: "ptvLineTint(p, t)",
    glsl: `
vec3 ptvLineCol(vec3 fill) { return max(ptvCool(fill * 0.30, 0.6), PTV_INK); }
float ptvLineW(vec2 p, vec2 c, float px, float taper) {
  vec2 d = p - c;
  return px * (1.0 + taper * (0.5 * sin(atan(d.y, d.x) + 0.8) - 0.1));
}
vec3 ptvLineTint(vec2 p, float t) {
  vec3 c = mix(vec3(0.88, 0.84, 0.78), vec3(0.92, 0.89, 0.84), ptvAA(ptvVn(p * 90.0), 0.5));
  vec2 c1 = vec2(0.28, 0.50), c2 = vec2(0.72, 0.50), c3 = vec2(1.14, 0.50);
  vec3 f1 = vec3(0.90, 0.46, 0.40), f2 = vec3(0.30, 0.62, 0.62), f3 = vec3(0.86, 0.68, 0.30);
  float d1 = length(p - c1) - 0.17;
  float d2 = ptvBox(p, c2, vec2(0.13, 0.14)) - 0.04;
  float d3 = ptvEll(p, c3, vec2(0.18, 0.12)) * 0.12;
  c = mix(c, f1, ptvFill(d1)); c = mix(c, ptvLineCol(f1), ptvLine(d1, ptvLineW(p, c1, uPtvLinePx, uPtvLineTaper)));
  c = mix(c, f2, ptvFill(d2)); c = mix(c, ptvLineCol(f2), ptvLine(d2, ptvLineW(p, c2, uPtvLinePx, uPtvLineTaper)));
  c = mix(c, f3, ptvFill(d3)); c = mix(c, ptvLineCol(f3), ptvLine(d3, ptvLineW(p, c3, uPtvLinePx, uPtvLineTaper)));
  return ptvCap(c);
}`,
  }),
  D({
    name: "ptvEyeGloss", doc: "glossy eye: banded iris dark at the top, a big and a small catch-light, lid shadow, heavy upper lash, blink",
    uniforms: { uPtvEyeHue: 0.58, uPtvEyeLid: 0.0 },
    draws: "One big glossy anime eye on a skin-tone cheek: a three-band iris, a large white catch-light, a small spark, a heavy upper lash, blinking every few seconds.",
    use: "card", params: "uPtvEyeHue = iris colour round the hue wheel, 0 to 1; uPtvEyeLid = lid closure, 0 open to 1 shut; ptvEyeAt(p, centre, size, iris, lid, t) gives rgb and coverage",
    demoExpr: "ptvEyeGloss(p, t)",
    glsl: `
vec4 ptvEyeAt(vec2 p, vec2 c, float s, vec3 iris, float lid, float t) {
  vec2 q = (p - c) / s;
  float open = clamp(1.0 - lid, 0.04, 1.0);
  float eyeD = ptvEll(q, vec2(0.0), vec2(1.0, 0.62 * open));
  float irisD = length(q) - 0.52;
  vec3 col = mix(vec3(0.90, 0.88, 0.90), vec3(0.70, 0.66, 0.76), ptvAA(q.y, 0.26) * 0.8);
  float g = ptvPost(0.5 - clamp(q.y, -0.52, 0.52) / 1.04, 3.0);
  vec3 ic = mix(ptvCool(iris * 0.42, 0.8), iris, clamp(g * 2.0, 0.0, 1.0));
  ic = mix(ic, ptvWarm(iris * 1.30, 0.8), clamp(g * 2.0 - 1.0, 0.0, 1.0));
  ic = mix(ic, ic * 0.55, ptvLine(irisD + 0.03, 3.0));
  ic = mix(ic, PTV_INK, ptvFill(length(q * vec2(1.0, 0.9)) - 0.22));
  col = mix(col, ic, ptvFill(irisD));
  float h = ptvHold(t, 12.0);
  float spark = 0.07 * (1.0 + 0.15 * sin(h * 3.0));
  col = mix(col, vec3(0.92), ptvFill(length(q - vec2(-0.20, 0.20)) - 0.17));
  col = mix(col, vec3(0.92), ptvFill(length(q - vec2(0.22, -0.18)) - spark));
  float lash = ptvLine(eyeD, 3.4) * mix(0.35, 1.0, ptvAA(q.y, -0.05));
  col = mix(col, PTV_INK, lash);
  return vec4(col, max(ptvFill(eyeD), lash));
}
vec3 ptvEyeGloss(vec2 p, float t) {
  vec3 skin = mix(vec3(0.74, 0.54, 0.50), vec3(0.88, 0.72, 0.64), ptvPost(p.y, 3.0));
  float ph = fract(ptvHold(t, 24.0) / 3.2);
  float blink = ph > 0.94 ? 1.0 - abs((ph - 0.97) / 0.03) : 0.0;
  vec3 iris = 0.18 + 0.62 * (0.5 + 0.5 * cos(6.2832 * (uPtvEyeHue + vec3(0.0, 0.33, 0.67))));
  vec4 e = ptvEyeAt(p, vec2(0.72, 0.50), 0.30, iris, max(uPtvEyeLid, blink), t);
  return ptvCap(mix(skin, e.rgb, e.a));
}`,
  }),
  D({
    name: "ptvHairRing", doc: "hair mass with a broken angel-ring highlight band, a bang cut along the brow and a bounce rim",
    uniforms: { uPtvHairWarm: 0.0, uPtvHairRing: 1.0 },
    draws: "A dark hair dome with a curved pale highlight ring across it, broken into strands, a zigzag bang edge above a skin forehead and a faint cool rim at the bottom.",
    use: "surface", params: "uPtvHairWarm = 0 blue-black to 1 brown-black; uPtvHairRing = strength of the highlight ring, 0 to 1",
    demoExpr: "ptvHairRing(p, t)",
    glsl: `
vec3 ptvHairRing(vec2 p, float t) {
  vec3 bg = mix(vec3(0.62, 0.70, 0.80), vec3(0.80, 0.84, 0.88), ptvPost(p.y, 3.0));
  vec3 skin = mix(vec3(0.74, 0.54, 0.50), vec3(0.90, 0.74, 0.66), ptvAA(p.y, 0.33));
  vec3 c = mix(bg, skin, ptvFill(ptvEll(p, vec2(0.72, 0.30), vec2(0.30, 0.30))));
  float bang = 0.44 + 0.05 * abs(fract(p.x * 9.0) - 0.5) * 2.0;
  float dome = ptvFill(ptvEll(p, vec2(0.72, 0.50), vec2(0.30, 0.34))) * ptvAA(p.y, bang);
  vec3 hair = mix(vec3(0.10, 0.11, 0.22), vec3(0.20, 0.13, 0.12), uPtvHairWarm);
  vec3 body = mix(ptvCool(hair * 0.6, 0.8), hair, ptvAA(p.y, 0.52));
  float cy = 0.60 + 0.004 * sin(ptvHold(t, 12.0) * 2.0);
  float rd = length((p - vec2(0.72, cy - 0.12)) / vec2(0.27, 0.17)) - 1.0;
  float strand = 1.0 - 0.85 * ptvAA(sin((p.x + p.y * 0.5) * 52.0), 0.82);
  float ring = ptvFill(abs(rd) - 0.10) * strand * ptvAA(p.y, 0.55);
  float thin = ptvFill(abs(rd + 0.30) - 0.03) * strand * ptvAA(p.y, 0.55);
  body = mix(body, ptvWarm(hair * 3.2 + vec3(0.12, 0.14, 0.26), 0.3), max(ring, thin * 0.7) * uPtvHairRing);
  body = mix(body, vec3(0.34, 0.44, 0.66), (1.0 - ptvAA(p.y, 0.46)) * 0.5);
  return ptvCap(mix(c, body, dome));
}`,
  }),
];
