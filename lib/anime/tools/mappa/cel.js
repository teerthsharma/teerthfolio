// MAPPA figure shading: two-tone cel, variable ink line, fur scratches, half-lidded eye with one catchlight.
import { defineModule } from "./define.js";

const SUITS = "p-aether-lang, pr-triton-kernels-22, pr-mujoco-3396";

export const CEL = [
  defineModule({
    name: "mappaCel2", suits: SUITS, use: "surface",
    doc: "two-tone cel with one hard cut per material and a cool hue-shifted shade",
    draws: "A seal-grey sphere cut by one hard shadow edge, a paler belly cut by a second edge, shade tinted cool blue.",
    params: "uMpCelR: sphere radius; uMpCelCutA/uMpCelKA: back cut level and shade multiplier; uMpCelCutB/uMpCelKB: belly cut level and shade multiplier",
    uni: { uMpCelR: 0.3, uMpCelCutA: 0.64, uMpCelKA: 0.3, uMpCelCutB: 0.53, uMpCelKB: 0.72 },
    glsl: /* glsl */ `
    vec3 mpCel2(vec3 lit, float nl, float cut, float k) { return mix(mpShade(lit, k), lit, mpAA(nl, cut)); }
    vec3 mappaCel2(vec2 p, float t) {
      vec2 q = (p - vec2(0.8, 0.5)) / uMpCelR;
      float z = sqrt(max(1.0 - dot(q, q), 0.0));
      float nl = 0.5 + 0.5 * dot(vec3(q, z), normalize(vec3(-0.45, 0.65, 0.62)));
      vec3 back = mpCel2(vec3(0.518, 0.557, 0.616), nl, uMpCelCutA, uMpCelKA);
      vec3 belly = mpCel2(vec3(0.835, 0.824, 0.804), nl, uMpCelCutB, uMpCelKB);
      vec3 body = mix(back, belly, mpAA(-q.y - 0.1, 0.0));
      return mpOut(mix(MP_FAR, body, mpFill(length(q) - 1.0)));
    }`,
  }),

  defineModule({
    name: "mappaInkLine", suits: SUITS, use: "line",
    doc: "thin contour whose width wanders along the outline, ink never black",
    draws: "A thin dark ink outline round a grey blob, thicker in some stretches and thinner in others.",
    params: "uMpInkPx: mean width in screen pixels; uMpInkVary: how far the width wanders (1.1 gives a width CV near 0.45)",
    uni: { uMpInkPx: 3.3, uMpInkVary: 1.1 },
    glsl: /* glsl */ `
    float mpInkLine(float d, float ang, float px, float vary) {
      float n = mpVn(vec2(cos(ang), sin(ang)) * 2.5 + 11.0);
      return mpLine(d, max(px * (1.0 + vary * (n - 0.5) * 2.0), 0.4));
    }
    vec3 mappaInkLine(vec2 p, float t) {
      vec2 q = p - vec2(0.8, 0.5);
      float d = length(q * vec2(1.0, 1.25)) - 0.28;
      vec3 c = mix(MP_FAR, vec3(0.518, 0.557, 0.616), mpFill(d));
      c = mix(c, MP_INK, mpInkLine(d, atan(q.y, q.x), uMpInkPx, uMpInkVary));
      return mpOut(c);
    }`,
  }),

  defineModule({
    name: "mappaFurScratch", suits: SUITS, use: "mask",
    doc: "short hard fur strokes scattered on a grid, light on the dark back only",
    draws: "Two dozen short pale tapered scratches lying along the upper half of a dark grey body.",
    params: "uMpFurCell: grid cells per frame height; uMpFurLen: stroke half-length in cells; uMpFurDens: share of cells carrying a stroke",
    uni: { uMpFurCell: 11.0, uMpFurLen: 0.32, uMpFurDens: 0.7 },
    glsl: /* glsl */ `
    float mpFur(vec2 p, float cell, float len, float dens) {
      vec2 q = p * cell; vec2 id = floor(q); vec2 f = fract(q) - 0.5;
      float a = -0.9 + (mpH(id + 7.3) - 0.5) * 0.9;
      vec2 dir = vec2(cos(a), sin(a));
      vec2 r = f - (vec2(mpH(id + 3.1), mpH(id + 5.7)) - 0.5) * 0.4;
      float s = clamp(dot(r, dir), -len, len);
      float w = 0.055 * (1.0 - 0.7 * abs(s) / len);
      return step(mpH(id), dens) * mpAA(w - length(r - dir * s), 0.0);
    }
    vec3 mappaFurScratch(vec2 p, float t) {
      vec2 q = (p - vec2(0.8, 0.5)) / 0.3;
      vec3 back = mpShade(vec3(0.518, 0.557, 0.616), 0.4);
      vec3 c = mix(MP_FAR, back, mpFill(length(q) - 1.0));
      float f = mpFur(p, uMpFurCell, uMpFurLen, uMpFurDens) * mpAA(q.y, 0.0) * mpFill(length(q) - 0.94);
      return mpOut(mix(c, vec3(0.72, 0.76, 0.82), f));
    }`,
  }),

  defineModule({
    name: "mappaEyeHalfLid", suits: SUITS, use: "card",
    doc: "half-lidded almond eye with a brow-shelf shadow, flat pale iris and one catchlight on the light side",
    draws: "A calm half-closed eye in grey skin: heavy dark lid line, flat shadow band above it, flat sky-blue iris, one white dot, a blink every few seconds.",
    params: "uMpEyeW: eye half-width; uMpEyeOpen: lid opening 0 shut to 1 wide; uMpEyeIris: iris radius in eye half-widths; uMpEyeSide: -1 catchlight left, +1 right",
    uni: { uMpEyeW: 0.2, uMpEyeOpen: 0.7, uMpEyeIris: 0.46, uMpEyeSide: -1.0 },
    glsl: /* glsl */ `
    vec3 mpEye(vec2 q, vec3 skin, float open, float side, float ir) {
      float low = 0.5 * max(1.0 - q.x * q.x, 0.0);
      float top = mix(-1.0, 1.0, open) * low;
      float inX = 1.0 - mpAA(abs(q.x), 1.0);
      float eye = inX * mpFill(max(q.y - top, -q.y - low));
      float shelf = (1.0 - mpAA(abs(q.x), 1.08)) * mpFill(max(q.y - top - 0.3, top - q.y));
      float lid = (1.0 - mpAA(abs(q.x), 1.04)) * mpFill(abs(q.y - top) - 0.05);
      vec2 ic = vec2(0.0, -0.05);
      vec3 c = mix(skin, mpShade(skin, 0.55), shelf);
      c = mix(c, vec3(0.80, 0.82, 0.84), eye);
      c = mix(c, vec3(0.537, 0.839, 0.953), eye * mpFill(length(q - ic) - ir));
      c = mix(c, vec3(0.055, 0.059, 0.075), eye * mpFill(length(q - ic) - ir * 0.42));
      c = mix(c, mpShade(c, 0.6), eye * mpAA(q.y - (top - 0.16), 0.0) * 0.8);
      c = mix(c, MP_RIM, eye * mpFill(length(q - ic - vec2(0.22 * side, 0.2) * ir * 2.0) - 0.11));
      return mix(c, vec3(0.102, 0.071, 0.047), lid);
    }
    vec3 mappaEyeHalfLid(vec2 p, float t) {
      float blink = step(mod(mpTwos(t, 12.0), 4.0), 0.34);
      vec3 c = mpEye((p - vec2(0.8, 0.5)) / uMpEyeW, vec3(0.518, 0.557, 0.616), uMpEyeOpen * (1.0 - blink), uMpEyeSide, uMpEyeIris);
      return mpOut(c);
    }`,
  }),
];
