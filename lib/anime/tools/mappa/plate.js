// MAPPA plates: black-hole sky, converging speck flow with the halt shell, red-vein sky, erased band.
import { defineModule } from "./define.js";

export const PLATE = [
  defineModule({
    name: "mappaHoleSky", suits: "p-aether-lang", use: "plate",
    doc: "ink disc with a thin hot rim over a cool banded cloud field with log-spiral filaments",
    draws: "A black disc with a hairline pale rim, three flat blue-grey bands of field around it, thin pale spiral wisps and a stepped glow.",
    params: "uMpHoleX/uMpHoleY: disc centre in frame heights; uMpHoleR: disc radius; uMpHoleRimPx: rim width in pixels",
    uni: { uMpHoleX: 0.53, uMpHoleY: 0.55, uMpHoleR: 0.26, uMpHoleRimPx: 2.0 },
    glsl: /* glsl */ `
    vec3 mpHole(vec2 p, vec2 c, float R, float rimPx, float t) {
      vec2 q = p - c; float r = length(q); float d = r - R;
      float v = exp(-3.0 * max(d, 0.0));
      float fil = 0.5 + 0.5 * sin(atan(q.y, q.x) * 6.0 - log(max(r, 1e-3) / R) * 9.0 + 2.5 * mpFbm(q * 3.5) + t * 0.2);
      vec3 col = mix(MP_FAR, MP_MID, mpAA(v, 0.18));
      col = mix(col, MP_NEAR, mpAA(v, 0.4));
      col = mix(col, MP_WISP * 0.9, mpAA(fil, 0.88) * smoothstep(0.1, 0.4, v));
      col = mix(col, MP_GLOW, mpBand(0.6 * exp(-max(d, 0.0) / 0.05), 3.0) * 0.6);
      col = mix(col, MP_INK, mpFill(d));
      return mix(col, MP_RIM, mpLine(d, rimPx));
    }
    vec3 mappaHoleSky(vec2 p, float t) {
      return mpOut(mpHole(p, vec2(uMpHoleX, uMpHoleY), uMpHoleR, uMpHoleRimPx, t));
    }`,
  }),

  defineModule({
    name: "mappaSpeckInfinity", suits: "p-aether-lang", use: "plate",
    doc: "dust specks streaming into a point on a twos clock, stopped and piled on a ragged shell round a figure",
    draws: "Small pale specks drawn inward along radial lanes, vanishing at a ring round the hero where a ragged row of stopped specks sits.",
    params: "uMpSpkX/uMpSpkY: sink centre; uMpShX/uMpShY/uMpShR: shell centre and radius; uMpHalt: 0 hides the piled ring, 1 shows it; uMpFlowStop: second at which the flow clock freezes; uMpDim: speck brightness",
    uni: { uMpSpkX: 0.53, uMpSpkY: 0.55, uMpShX: 1.07, uMpShY: 0.42, uMpShR: 0.2, uMpHalt: 1.0, uMpFlowStop: 99.0, uMpDim: 1.0 },
    glsl: /* glsl */ `
    float mpSpecks(vec2 p, vec2 c, float th) {
      vec2 q = p - c; float r = length(q);
      float lane = (atan(q.y, q.x) / 6.2831853 + 0.5) * 96.0;
      float li = floor(lane);
      float lh = mpH(vec2(li, 3.0));
      float u = (r + th * (0.2 + 0.25 * lh)) / 0.07 + lh * 9.0;
      float h = mpH(vec2(li, floor(u)));
      float d = length(vec2((fract(lane) - 0.5) * r * 6.2831853 / 96.0, (fract(u) - 0.5) * 0.07));
      return step(0.6, h) * mpFill(d - (0.0016 + 0.0012 * h));
    }
    float mpShellPile(vec2 p, vec2 s, float R) {
      vec2 q = p - s; float r = length(q);
      float af = (atan(q.y, q.x) / 6.2831853 + 0.5) * 64.0;
      float ai = floor(af);
      float hr = mpH(vec2(ai, 11.0));
      float d = length(vec2((fract(af) - 0.5) * r * 6.2831853 / 64.0, r - (R + 0.012 + 0.05 * hr * hr)));
      return step(0.35, mpH(vec2(ai, 13.0))) * mpFill(d - 0.0022);
    }
    vec3 mappaSpeckInfinity(vec2 p, float t) {
      vec2 s = vec2(uMpShX, uMpShY);
      float th = mpTwos(min(t, uMpFlowStop), 12.0);
      float moving = mpSpecks(p, vec2(uMpSpkX, uMpSpkY), th) * smoothstep(uMpShR, uMpShR + 0.06, length(p - s));
      float pile = mpShellPile(p, s, uMpShR) * uMpHalt;
      vec3 c = mix(MP_FAR * 0.8, vec3(0.843, 0.867, 0.882) * uMpDim, max(moving, pile));
      return mpOut(c);
    }`,
  }),

  defineModule({
    name: "mappaVeinSky", suits: "pr-triton-kernels-22", use: "plate",
    doc: "teal banded sky cracked by thin ridged red veins that grow from the frame edges inward",
    draws: "A flat teal sky with hairline red cracks, thick at the left and right edges and thin in the middle, each crack with a dim halo and a hot core.",
    params: "uMpVeinGrow: 0 no veins to 1 fully grown; uMpVeinScale: noise scale of the vein net; uMpVeinDrift: drift speed in frame widths per second",
    uni: { uMpVeinGrow: 1.0, uMpVeinScale: 2.6, uMpVeinDrift: 0.005 },
    glsl: /* glsl */ `
    float mpVein(vec2 p, float scale, float drift, float th) {
      vec2 q = p * scale + vec2(drift * 1.6 * th * scale, 0.0);
      float r1 = 1.0 - abs(2.0 * mpFbm(q) - 1.0);
      float r2 = 1.0 - abs(2.0 * mpVn(q * 2.1 + 5.0) - 1.0);
      float x01 = p.x / 1.6;
      return max(pow(max(r1, 0.0), 14.0), 0.8 * pow(max(r2, 0.0), 14.0)) * mix(0.35, 1.0, smoothstep(0.1, 0.45, abs(x01 - 0.5)));
    }
    vec3 mappaVeinSky(vec2 p, float t) {
      float v = mpVein(p, uMpVeinScale, uMpVeinDrift, mpTwos(t, 12.0));
      float thr = mix(0.9, 0.12, uMpVeinGrow);
      vec3 c = mix(vec3(0.09, 0.20, 0.22), vec3(0.14, 0.30, 0.32), mpBand(p.y, 4.0));
      c = mix(c, vec3(0.55, 0.10, 0.13), mpAA(v, thr));
      c = mix(c, vec3(0.86, 0.24, 0.22), mpAA(v, thr * 3.2));
      return mpOut(c);
    }`,
  }),

  defineModule({
    name: "mappaEraseBand", suits: "p-aether-lang", use: "mask",
    doc: "a straight band of the plate snaps to ink from a point to the frame edge, violet light along its edges dying out",
    draws: "A dark rectangular channel cut through a ringed blue plate, hard violet lines along its top and bottom edges and a stepped violet glow that fades over about a second.",
    params: "uMpErY0/uMpErY1: band bottom and top in frame heights; uMpErX: where the band starts (it runs to the left edge); uMpErT0: second the band appears (demo loops every 3 s)",
    uni: { uMpErY0: 0.3, uMpErY1: 0.6, uMpErX: 0.94, uMpErT0: 0.5 },
    glsl: /* glsl */ `
    vec3 mpErase(vec3 base, vec2 p, float t, float y0, float y1, float xm, float t0) {
      float on = step(t0, t);
      float e = max(max(y0 - p.y, p.y - y1), p.x - xm);
      float I = exp(-max(t - t0, 0.0) / 0.6) * on;
      vec3 col = mix(base, MP_INK, mpFill(e) * on);
      col += MP_PURPLE * (mpBand(exp(-max(e, 0.0) / 0.03), 3.0) * 0.55 * I);
      return mix(col, MP_VIOLET, mpLine(e, 2.5) * I);
    }
    vec3 mappaEraseBand(vec2 p, float t) {
      vec3 base = mix(MP_FAR, MP_NEAR, mpBand(0.5 + 0.5 * sin(length(p - vec2(0.53, 0.55)) * 11.0), 3.0));
      return mpOut(mpErase(base, p, mod(t, 3.0), uMpErY0, uMpErY1, uMpErX, uMpErT0));
    }`,
  }),
];
