// Class 1-D grammar. Every school/ module prepends this and ends colour with scOut.
// Cold fluorescent key, winter-west fill, desk bounce. Printed anime still, not CGI grain.
// luma ≤ 0.92. fwidth AA. Ink is warm-black, never #000.

export const KIT_GLSL = /* glsl */ `
  const vec3 SC_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float SC_CAP = 0.92;
  const vec3 SC_INK = vec3(0.070, 0.048, 0.052);
  const vec3 SC_FLUORO = vec3(0.78, 0.84, 0.80);
  const vec3 SC_FLUORO_DIM = vec3(0.40, 0.48, 0.50);
  const vec3 SC_BOARD = vec3(0.165, 0.290, 0.196);
  const vec3 SC_RED50 = vec3(0.82, 0.10, 0.16);
  const vec3 SC_BEECH = vec3(0.70, 0.56, 0.36);
  const vec3 SC_BEECH_DARK = vec3(0.40, 0.28, 0.18);
  const vec3 SC_BLAZER = vec3(0.56, 0.10, 0.14);
  const vec3 SC_BLAZER_SHADE = vec3(0.26, 0.06, 0.10);
  const vec3 SC_BLAZER_LIT = vec3(0.70, 0.22, 0.24);
  const vec3 SC_GOLD = vec3(0.78, 0.62, 0.28);
  const vec3 SC_GOLD_BODY = vec3(0.40, 0.26, 0.10);
  const vec3 SC_PAPER = vec3(0.84, 0.80, 0.74);
  const vec3 SC_PAPER_TOOTH = vec3(0.76, 0.72, 0.66);
  const vec3 SC_DUSK = vec3(0.86, 0.64, 0.38);
  const vec3 SC_DUSK_PINK = vec3(0.74, 0.34, 0.50);
  const vec3 SC_WINTER = vec3(0.60, 0.72, 0.80);
  const vec3 SC_SKIN = vec3(0.80, 0.60, 0.54);
  const vec3 SC_SKIN_SHADE = vec3(0.40, 0.24, 0.30);
  const vec3 SC_SKIN_SSS = vec3(0.62, 0.34, 0.36);
  const vec3 SC_FRINGE = vec3(0.15, 0.10, 0.09);
  const vec3 SC_FRINGE_HI = vec3(0.34, 0.22, 0.16);
  const vec3 SC_CHABA = vec3(0.22, 0.16, 0.38);
  const vec3 SC_CHESS = vec3(0.12, 0.10, 0.14);
  const vec3 SC_RIBBON = vec3(0.68, 0.12, 0.18);
  const vec3 SC_COLLAR = vec3(0.84, 0.82, 0.78);
  const vec3 SC_CREAM = vec3(0.70, 0.66, 0.64);
  const vec3 SC_WALL = vec3(0.58, 0.56, 0.54);
  const vec3 SC_PENCIL = vec3(0.22, 0.20, 0.18);
  const vec3 SC_ERASER = vec3(0.76, 0.46, 0.50);
  const vec3 SC_IRIS = vec3(0.22, 0.16, 0.14);
  const vec3 SC_SCLERA = vec3(0.82, 0.78, 0.74);

  float scLuma(vec3 c) { return dot(max(c, vec3(0.0)), SC_LUMA); }
  vec3 scFloor(vec3 c) { return max(c, SC_INK); }
  vec3 scCap(vec3 c) { float L = scLuma(c); return scFloor(c * min(1.0, SC_CAP / max(L, 1e-4))); }
  vec3 scOut(vec3 c) { return scCap(scFloor(c)); }

  float scAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float scFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float scLine(float d, float px) { float w = fwidth(d) + 1e-6; return 1.0 - smoothstep(px * w * 0.5, w * (px * 0.5 + 0.9), abs(d)); }
  float scBand(float v, float a, float b) { return scAA(v, a) * (1.0 - scAA(v, b)); }
  float scHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1e-4); }

  float scH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2 scH22(vec2 p) { float a = scH21(p); return vec2(a, scH21(p + a + 17.0)); }
  float scVn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(scH21(i), scH21(i + vec2(1.0, 0.0)), f.x), mix(scH21(i + vec2(0.0, 1.0)), scH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float scFbm(vec2 p) { return scVn(p) * 0.55 + scVn(p * 2.07 + 1.3) * 0.30 + scVn(p * 4.13 + 4.1) * 0.15; }

  vec3 scCel3(float h, vec3 dark, vec3 mid, vec3 lit) {
    return mix(mix(dark, mid, scAA(h, 0.38)), lit, scAA(h, 0.72));
  }

  vec3 scSphereN(vec2 p) {
    vec2 c = p - vec2(0.72, 0.50);
    float z = sqrt(max(0.0, 0.22 - dot(c, c)));
    return normalize(vec3(c, z + 1e-4));
  }
  float scCover(vec2 p) {
    vec2 c = p - vec2(0.72, 0.50);
    return scFill(dot(c, c) - 0.22);
  }
  float scEllipse(vec2 p, vec2 c, vec2 rad) {
    return length((p - c) / max(rad, vec2(1e-4))) - 1.0;
  }
  float scBox(vec2 p, vec2 c, vec2 b) {
    vec2 d = abs(p - c) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  vec3 scLdir() { return normalize(vec3(-0.15, 0.82, 0.55)); }
  vec3 scWdir() { return normalize(vec3(-0.85, 0.12, 0.28)); }
  float scNdL(vec2 p) {
    vec3 N = scSphereN(p);
    float fluoro = 0.5 + 0.5 * dot(N, scLdir());
    float win = 0.5 + 0.5 * dot(N, scWdir());
    return clamp(fluoro * 0.68 + win * 0.32, 0.0, 1.0);
  }

  float scVenetian(vec2 p, float n) {
    float s = p.y * n;
    float g = abs(fract(s) - 0.5);
    float w = fwidth(s) + 1e-5;
    return 1.0 - smoothstep(0.16 - w, 0.16 + w, g);
  }

  float scSeg(vec2 p, vec2 a, vec2 b, float w) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h) - w;
  }
  float scDigitFive(vec2 p) {
    float d = scSeg(p, vec2(-0.06, 0.10), vec2(0.06, 0.10), 0.018);
    d = min(d, scSeg(p, vec2(-0.06, 0.10), vec2(-0.06, 0.01), 0.018));
    d = min(d, scSeg(p, vec2(-0.06, 0.01), vec2(0.05, 0.00), 0.018));
    d = min(d, scSeg(p, vec2(0.05, 0.00), vec2(0.05, -0.09), 0.018));
    d = min(d, scSeg(p, vec2(0.05, -0.09), vec2(-0.06, -0.10), 0.018));
    return d;
  }
  float scDigitZero(vec2 p) {
    return abs(length(p / vec2(0.07, 0.11)) - 1.0) * 0.07 - 0.016;
  }
  float scFifty(vec2 p, vec2 c, float s) {
    vec2 q = (p - c) / max(s, 1e-4);
    return min(scDigitFive(q + vec2(0.10, 0.0)), scDigitZero(q - vec2(0.10, 0.0)));
  }
  float scRing50(vec2 p, vec2 c, float s) {
    return abs(length((p - c) / max(s, 1e-4)) - 0.22) - 0.012;
  }

  vec3 scPaper(vec2 p) {
    float fiber = scVn(vec2(p.x * 22.0 + p.y * 1.8, p.y * 4.0)) * 0.45 + scVn(p * 36.0) * 0.18;
    float tooth = smoothstep(0.32, 0.70, scFbm(p * 8.0));
    return mix(SC_PAPER_TOOTH, SC_PAPER, fiber) * mix(0.94, 1.0, tooth);
  }
  vec3 scWood(vec2 p) {
    float ring = scFbm(vec2(p.x * 3.2, p.y * 14.0 + p.x * 0.4));
    float pore = scVn(p * 28.0) * 0.07;
    return mix(SC_BEECH_DARK, SC_BEECH, scAA(ring, 0.46) * 0.85 + 0.15) * (1.0 - pore);
  }
  vec3 scWool(vec2 p, float h) {
    float nap = scVn(p * 42.0) * 0.05;
    return scCel3(h + nap, SC_BLAZER_SHADE, SC_BLAZER, SC_BLAZER_LIT);
  }
  vec3 scGoldCatch(float spec) {
    return mix(SC_GOLD_BODY, SC_GOLD, scAA(spec, 0.70));
  }
  vec3 scSkin(float h) {
    float wrap = h * 0.72 + 0.14;
    return mix(mix(SC_SKIN_SHADE, SC_SKIN_SSS, scAA(wrap, 0.40)), SC_SKIN, scAA(h, 0.74));
  }

  // Class 1-D observational still: west glass, board, fluoro ceiling, beech desk.
  vec3 scRoom(vec2 p, float t) {
    float hold = scHold(t, 2.0);
    vec3 wall = mix(SC_WALL * 0.82, SC_CREAM, scAA(p.y, 0.40));
    float ceil = scAA(p.y, 0.86);
    wall = mix(wall, SC_FLUORO_DIM, ceil * 0.55);
    float board = scBand(p.y, 0.56, 0.86) * scAA(p.x, 0.34);
    wall = mix(wall, SC_BOARD, board * 0.92);
    float win = (1.0 - scAA(p.x, 0.30)) * scBand(p.y, 0.28, 0.88);
    vec3 glass = mix(SC_WINTER, SC_DUSK, scAA(p.y, 0.55));
    float slat = scVenetian(p, 16.0);
    glass = mix(glass, glass * 0.42 + SC_FLUORO_DIM * 0.18, slat * 0.72);
    wall = mix(wall, glass, win * 0.88);
    float desk = 1.0 - scAA(p.y, 0.40);
    wall = mix(wall, scWood(p), desk * 0.95);
    vec2 pc = (p - vec2(0.70, 0.22)) * vec2(1.15, 1.6);
    float paper = scFill(max(abs(pc.x) - 0.22, abs(pc.y) - 0.16));
    wall = mix(wall, scPaper(p), paper * desk);
    float tubes = 0.0;
    for (int i = 0; i < 3; i++) {
      float x = 0.28 + float(i) * 0.32;
      tubes = max(tubes, scLine(p.x - x, 2.4) * scBand(p.y, 0.90, 0.98));
    }
    wall = mix(wall, SC_FLUORO * 0.78, tubes * 0.50);
    float tea = scFill(scEllipse(p, vec2(1.16, 0.54), vec2(0.10, 0.24)));
    wall = mix(wall, SC_CHABA, tea * 0.50 * scAA(p.x, 1.02));
    wall += (scH21(floor(p * 86.0 + hold * 3.0)) - 0.5) * 0.016;
    return scOut(wall);
  }

  // Pretty core still: fluoro + venetian + desk + paper 50 + red blazer + fringe + half-lid.
  vec3 scClassroom(vec2 p, float t) {
    vec3 c = scRoom(p, t);
    vec2 o = vec2(0.70, 0.22);
    float desk = 1.0 - scAA(p.y, 0.40);
    float sheet = scFill(scBox(p, o, vec2(0.20, 0.11)));
    vec3 paper = scPaper(p);
    paper = mix(paper, SC_RED50, max(scFill(scFifty(p, o + vec2(0.01, 0.01), 0.38)), scFill(scRing50(p, o + vec2(0.01, 0.01), 0.55))) * 0.88);
    c = mix(c, paper, sheet * desk);
    float cov = scCover(p);
    float h = scNdL(p);
    vec3 body = scWool(p, h);
    float collar = scFill(scEllipse(p, vec2(0.72, 0.62), vec2(0.16, 0.08))) * scAA(p.y, 0.54);
    body = mix(body, mix(SC_COLLAR * 0.78, SC_COLLAR, scAA(h, 0.55)), collar);
    body = mix(body, scSkin(h), scFill(scEllipse(p, vec2(0.72, 0.64), vec2(0.14, 0.12))) * scAA(p.y, 0.50));
    vec2 eye = vec2(0.78, 0.54);
    body = mix(body, SC_SCLERA, scFill(scEllipse(p, eye, vec2(0.055, 0.028))));
    body = mix(body, SC_IRIS, scFill(scEllipse(p, eye + vec2(0.004, -0.004), vec2(0.018, 0.016))));
    body = mix(body, scSkin(h * 0.7), scFill(scEllipse(p, eye + vec2(0.0, 0.012), vec2(0.058, 0.018))) * 0.92);
    body = mix(body, SC_FLUORO * 0.78, scFill(scEllipse(p, vec2(0.790, 0.548), vec2(0.007, 0.004))) * 0.88);
    float fringe = scFill(scEllipse(p, vec2(0.70, 0.70), vec2(0.22, 0.12))) * scAA(p.y, 0.58);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      fringe = max(fringe, scFill(scSeg(p, vec2(0.58 + fi * 0.05, 0.72), vec2(0.60 + fi * 0.05, 0.50), 0.015)));
    }
    body = mix(body, mix(SC_FRINGE, SC_FRINGE_HI, scAA(h, 0.78) * 0.40), fringe);
    body = mix(body, scGoldCatch(0.58), scFill(length(p - vec2(0.78, 0.38)) - 0.028));
    float knot = scFill(scEllipse(p, vec2(0.72, 0.56), vec2(0.034, 0.022)));
    body = mix(body, mix(SC_RIBBON * 0.7, SC_RIBBON, scAA(h, 0.50)), knot);
    return mix(c, body, cov);
  }

  vec3 scPaperFifty(vec2 p, float t) {
    vec3 c = scRoom(p, t);
    vec2 o = vec2(0.70, 0.22);
    float sheet = scFill(scBox(p, o, vec2(0.20, 0.11)));
    float edge = scLine(scBox(p, o, vec2(0.20, 0.11)), 1.3);
    vec3 paper = scPaper(p);
    paper = mix(paper, SC_RED50, max(scFill(scFifty(p, o + vec2(0.01, 0.01), 0.38)), scFill(scRing50(p, o + vec2(0.01, 0.01), 0.55))) * 0.88);
    c = mix(c, paper, sheet);
    return mix(c, SC_INK * 2.8, edge * 0.35);
  }
`;

export function defineModule({ name, family, doc, glsl, demo, uniforms }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`school module incomplete: ${name ?? "?"}`);
  return {
    name,
    family,
    doc,
    deps: name === "classroom-kit" ? [] : ["classroom-kit"],
    glsl,
    demo,
    uniforms,
  };
}

export function T(name, family, doc, glsl, demoCall, extraDeps = []) {
  const mod = defineModule({
    name,
    family,
    doc,
    glsl: /* glsl */ `\n${glsl}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return scOut(${demoCall}); }`,
  });
  if (extraDeps.length) mod.deps = ["classroom-kit", ...extraDeps];
  return mod;
}

export const classroomKit = defineModule({
  name: "classroom-kit",
  family: "kit",
  doc: "pretty Class 1-D core: cold fluoro, soft venetian, still desk, paper 50, red blazer, fringe, half-lid, luma 0.92",
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return scClassroom(p, t); }`,
});

export const schoolKit = classroomKit;

