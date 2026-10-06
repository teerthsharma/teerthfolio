import { defineModule } from "./define.js";

export const FACE = [
  defineModule({
    name: "anime-eye-decal",
    family: "cast",
    doc: "printed anime eye decal: cream sclera, spoke iris, indigo pupil, two chips, wet lid, limbus — not CGI glass",
    glsl: /* glsl */ `
  vec3 animeEyeDecalAt(vec2 p, vec2 c, vec2 rad, vec3 dye, float gaze) {
    vec2 q = (p - c) / max(rad, vec2(1e-4));
    float lid = ixEllipse(q, vec2(0.0, 0.0), vec2(1.0, 0.72));
    float cover = ixFill(lid);
    vec3 sclera = mix(vec3(0.62, 0.56, 0.54), vec3(0.84, 0.80, 0.74), ixAA(0.35 - q.y, 0.0));
    vec2 ic = vec2(gaze * 0.18, -0.06);
    float iris = ixFill(ixDisc(q, ic, 0.58));
    float r = length(q - ic);
    float spoke = abs(fract(atan(q.y - ic.y, q.x - ic.x) * 5.5) - 0.5);
    vec3 irisC = mix(dye * 0.55, dye, ixAA(0.7 - r, 0.0));
    irisC = mix(irisC, dye * 0.72, ixFill(spoke - 0.28) * 0.45);
    float limbus = ixBand(r, 0.48, 0.60);
    irisC = mix(irisC, IX_INK * 1.6, limbus * 0.7);
    float pupil = ixFill(ixDisc(q, ic, 0.22));
    irisC = mix(irisC, IX_INK, pupil);
    float chip0 = ixFill(ixDisc(q, ic + vec2(0.16, 0.20), 0.10));
    float chip1 = ixFill(ixDisc(q, ic + vec2(-0.12, 0.08), 0.045));
    irisC = mix(irisC, IX_CREAM * 0.90, chip0);
    irisC = mix(irisC, IX_CREAM * 0.78, chip1);
    vec3 col = mix(sclera, irisC, iris);
    float wet = ixLine(q.y + 0.52 + 0.18 * q.x * q.x, 1.5) * cover;
    col = mix(col, IX_CREAM * 0.88, wet * 0.55);
    float upper = ixFill(ixEllipse(q, vec2(0.0, 0.42), vec2(1.05, 0.42))) * cover;
    col = mix(col, mix(IX_FUR_S, IX_FUR_M, 0.4), upper * 0.82);
    float lash = ixLine(lid, 1.8) * cover;
    col = mix(col, IX_INK, lash);
    return col;
  }
  vec3 animeEyeDecal(vec2 p, float t) {
    vec3 plate = mix(ixPaper(p) * 0.48, IX_FUR_M, ixFill(ixEllipse(p, vec2(0.72, 0.50), vec2(0.38, 0.28))));
    float gaze = 0.22 * sin(ixHold(t, 6.0) * 0.7);
    vec3 dye = vec3(0.22, 0.28, 0.42);
    vec2 cL = vec2(0.58, 0.52), rL = vec2(0.16, 0.12);
    vec2 cR = vec2(0.88, 0.54), rR = vec2(0.15, 0.11);
    float mL = ixFill(ixEllipse((p - cL) / rL, vec2(0.0), vec2(1.0, 0.72)));
    float mR = ixFill(ixEllipse((p - cR) / rR, vec2(0.0), vec2(1.0, 0.72)));
    vec3 col = plate;
    col = mix(col, animeEyeDecalAt(p, cL, rL, dye, gaze), mL);
    col = mix(col, animeEyeDecalAt(p, cR, rR, dye, gaze), mR);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return animeEyeDecal(p, t); }`,
  }),

  defineModule({
    name: "hair-clump-kit",
    family: "cast",
    doc: "anime hair clump cards: tapered capsules from a scalp, dark mass, one broken highlight cut",
    glsl: /* glsl */ `
  float ixHairCard(vec2 p, vec2 a, vec2 b, float w0, float w1) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float w = mix(w0, w1, h);
    return length(pa - ba * h) - w;
  }
  vec3 hairClumpKit(vec2 p, float t) {
    vec2 scalp = vec2(0.70, 0.62);
    vec3 plate = mix(ixSky(p) * 0.85, ixPaper(p) * 0.5, ixFill(p.y - 0.28));
    vec3 mass = vec3(0.12, 0.09, 0.14);
    vec3 mid = vec3(0.28, 0.16, 0.12);
    vec3 cutC = vec3(0.72, 0.56, 0.40);
    float acc = 0.0;
    float hi = 0.0;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float ang = -1.15 + fi * 0.38;
      vec2 dir = vec2(sin(ang), cos(ang));
      vec2 tip = scalp + dir * mix(0.28, 0.40, ixH21(vec2(fi, 2.0)));
      float w0 = 0.055;
      float w1 = 0.012;
      float d = ixHairCard(p, scalp + dir * 0.02, tip, w0, w1);
      acc = max(acc, ixFill(d));
      float along = dot(p - scalp, dir);
      float cut = ixBand(along, 0.10, 0.20) * ixFill(d);
      float zig = step(0.45, ixH21(vec2(floor((p.x + p.y) * 28.0), fi)));
      hi = max(hi, cut * zig);
    }
    float fringe = 0.0;
    for (int j = 0; j < 5; j++) {
      float fj = float(j);
      vec2 a = scalp + vec2(-0.10 + fj * 0.05, -0.02);
      vec2 b = a + vec2(0.01, -0.16);
      fringe = max(fringe, ixFill(ixHairCard(p, a, b, 0.018, 0.008)));
    }
    acc = max(acc, fringe);
    float h = ixAA(0.55 + 0.35 * (p.x - scalp.x), 0.5);
    vec3 col = mix(plate, mix(mass, mid, h), acc);
    col = mix(col, cutC, hi * 0.72);
    col = mix(col, IX_INK, ixLine(ixDisc(p, scalp, 0.06), 1.4) * acc * 0.25);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return hairClumpKit(p, t); }`,
  }),
];
