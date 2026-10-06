function D(name, doc, deps, glsl, demo) {
  if (!name || !doc || !glsl || !demo) throw new Error(`graphic preview incomplete: ${name ?? "?"}`);
  return { name, doc, deps, glsl, demo };
}

export const GRAPHIC_PASSES = [
  D("gPaintWash", "paint wash over the plate — wet pigment, not a noise wallpaper",
    ["layerKit"],
    /* glsl */ `
  vec3 gPaintWash(vec2 p, float t) {
    vec3 plate = mix(lyPaper(p) * 0.5, mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72)), lyCover(p));
    float wet = lyVn(p * 6.0 + vec2(t * 0.02, 0.0));
    vec3 pigment = mix(plate, plate * vec3(0.92, 0.86, 0.80), wet * 0.22);
    return lyPolice(mix(pigment, LY_INK, lyLine(lyFigD(p), 1.8) * 0.7));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gPaintWash(p, t); }`),

  D("gPrintDot", "offset-print rosette — CMY angles, shadow only, key plates stay clean",
    ["layerKit"],
    /* glsl */ `
  vec3 gPrintDot(vec2 p, float t) {
    vec3 plate = mix(lyPaper(p) * 0.52, mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.5)), lyCover(p));
    float a = 0.26;
    vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * (p * 42.0);
    float dots = step(0.55, fract(sin(dot(floor(q), vec2(12.9, 78.2))) * 43758.5));
    float sh = 1.0 - lyAA(lyNdL(p), 0.42);
    return lyPolice(mix(plate, plate * vec3(0.78, 0.72, 0.80), dots * sh * 0.45));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gPrintDot(p, t); }`),

  D("gSakugaHold", "on-twos hold grain — boil phase steps, never interpolates",
    ["layerKit"],
    /* glsl */ `
  vec3 gSakugaHold(vec2 p, float t) {
    float ht = lyHold(t, 12.0);
    vec2 q = p + (vec2(lyHash(vec2(ht, 3.1)), lyHash(vec2(ht + 2.2, 8.4))) - 0.5) * 0.008;
    float h = lyNdL(q);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    return mix(lyPaper(p) * 0.5, body, lyCover(q));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gSakugaHold(p, t); }`),

  D("gPaperTooth", "laid paper tooth — long fiber, not speckle CGI grain",
    ["layerKit"],
    /* glsl */ `
  vec3 gPaperTooth(vec2 p, float t) {
    vec3 plate = mix(lyPaper(p) * 0.5, mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.5)), lyCover(p));
    float fiber = lyVn(vec2(p.x * 22.0 + p.y * 1.8, p.y * 3.4));
    return lyPolice(mix(plate, plate * vec3(0.90, 0.86, 0.80), fiber * 0.16));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gPaperTooth(p, t); }`),

  D("gFilmGate", "analog gate weave + dirt — frame-locked, luma-capped",
    ["layerKit"],
    /* glsl */ `
  vec3 gFilmGate(vec2 p, float t) {
    float ht = lyHold(t, 24.0);
    vec2 q = p + vec2(lyHash(vec2(ht, 1.1)) - 0.5, 0.0) * 0.003;
    vec3 plate = mix(lyPaper(q) * 0.48, mix(LY_FILL, LY_KEY, lyAA(lyNdL(q), 0.5)), lyCover(q));
    float dirt = step(0.992, lyHash(floor(q * 80.0) + ht));
    float vig = smoothstep(0.92, 0.55, length(p - vec2(0.72, 0.50)));
    return lyPolice(mix(plate * vig, LY_INK, dirt * 0.35));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gFilmGate(p, t); }`),

  D("gMultiplane", "multiplane cards — near wash, far cooler, parallax on hold",
    ["layerKit"],
    /* glsl */ `
  vec3 gMultiplane(vec2 p, float t) {
    float ht = lyHold(t, 12.0);
    vec2 near = p + vec2(ht * 0.012, 0.0);
    vec2 far = p + vec2(ht * 0.003, 0.0);
    vec3 back = mix(vec3(0.18, 0.22, 0.36), vec3(0.42, 0.34, 0.40), clamp(far.y, 0.0, 1.0));
    vec3 fore = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(near), 0.38)), LY_KEY, lyAA(lyNdL(near), 0.72));
    return lyPolice(mix(back * 0.85, fore, lyCover(near)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gMultiplane(p, t); }`),

  D("gHoldTwos", "12 fps hold lock — same silhouette, new drawing",
    ["layerKit"],
    /* glsl */ `
  vec3 gHoldTwos(vec2 p, float t) {
    float ht = lyHold(t, 12.0);
    vec2 q = p + vec2(0.0, (lyHash(vec2(ht, 5.5)) - 0.5) * 0.006);
    return mix(lyPaper(p) * 0.5, mix(LY_FILL, LY_KEY, lyAA(lyNdL(q), 0.5)), lyCover(q));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gHoldTwos(p, t); }`),

  D("gBookIn", "book-in wipe — hinge from the left, paper tooth on the turning leaf",
    ["layerKit"],
    /* glsl */ `
  vec3 gBookIn(vec2 p, float t) {
    vec3 plate = mix(lyPaper(p) * 0.5, mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.5)), lyCover(p));
    float u = fract(t * 0.15);
    float leaf = lyAA(p.x, 0.18 + u * 1.1);
    vec3 verso = lyPaper(p) * vec3(0.86, 0.80, 0.72);
    return lyPolice(mix(verso, plate, leaf));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gBookIn(p, t); }`),

  D("gBookOut", "book-out wipe — hinge from the right, verso takes the still",
    ["layerKit"],
    /* glsl */ `
  vec3 gBookOut(vec2 p, float t) {
    vec3 plate = mix(lyPaper(p) * 0.5, mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.5)), lyCover(p));
    float u = fract(t * 0.15);
    float leaf = 1.0 - lyAA(p.x, 1.26 - u * 1.1);
    vec3 verso = lyPaper(p) * vec3(0.86, 0.80, 0.72);
    return lyPolice(mix(plate, verso, leaf));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gBookOut(p, t); }`),

  D("gCelBoil", "cel shadow boil — 8 fps, shadow plate crawls, key stays",
    ["layerKit"],
    /* glsl */ `
  vec3 gCelBoil(vec2 p, float t) {
    float ht = lyHold(t, 8.0);
    vec2 q = p + (vec2(lyHash(vec2(ht, 9.0)), lyHash(vec2(ht, 4.2))) - 0.5) * 0.01;
    float h = lyNdL(q);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    return mix(lyPaper(p) * 0.5, body, lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gCelBoil(p, t); }`),

  D("gShaftUfo", "Ufotable shaft — dusted beams ride uEmit, albedo stays a plate",
    ["layerKit"],
    /* glsl */ `
  vec3 gShaftUfo(vec2 p, float t) {
    vec3 albedo = mix(lyPaper(p) * 0.48, mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.5)), lyCover(p));
    float shaft = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float a = 0.55 + fi * 0.08;
      float d = abs((p.x - 0.40) * 0.35 - (p.y - 0.90) * a);
      shaft = max(shaft, exp(-d * d * 180.0) * (0.55 + 0.2 * sin(t * 0.7 + fi)));
    }
    vec3 glow = vec3(0.90, 0.74, 0.48) * shaft * 0.55;
    return lyEmit(albedo, glow);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gShaftUfo(p, t); }`),

  D("gFluoroLerche", "Lerche classroom fluoro — cold tube key, winter-west fill",
    ["layerKit"],
    /* glsl */ `
  vec3 gFluoroLerche(vec2 p, float t) {
    vec3 fluoro = vec3(0.78, 0.84, 0.80);
    vec3 winter = vec3(0.60, 0.72, 0.80);
    vec3 room = mix(winter * 0.35, fluoro * 0.55, clamp(p.y, 0.0, 1.0));
    float h = lyNdL(p);
    vec3 skin = mix(vec3(0.40, 0.24, 0.30), vec3(0.80, 0.60, 0.54), lyAA(h, 0.46));
    return lyPolice(mix(room, skin, lyCover(p)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gFluoroLerche(p, t); }`),

  D("gWashGhibli", "Ghibli wash — pigment pools in the concave, sky stays airy",
    ["layerKit"],
    /* glsl */ `
  vec3 gWashGhibli(vec2 p, float t) {
    vec3 sky = mix(vec3(0.55, 0.70, 0.80), vec3(0.86, 0.78, 0.62), clamp(p.y * 0.7, 0.0, 1.0));
    float h = lyNdL(p);
    vec3 body = mix(vec3(0.28, 0.36, 0.28), vec3(0.62, 0.70, 0.48), lyAA(h, 0.5));
    float pool = lyVn(p * 8.0) * (1.0 - h);
    body = mix(body, body * vec3(0.78, 0.82, 0.70), pool * 0.35);
    return lyPolice(mix(sky * 0.85, body, lyCover(p)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gWashGhibli(p, t); }`),

  D("gHatchAraki", "Araki hatch — diagonal toner gated to core shadow",
    ["layerKit"],
    /* glsl */ `
  vec3 gHatchAraki(vec2 p, float t) {
    float h = lyNdL(p);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    float core = 1.0 - lyAA(h, 0.24);
    float hatch = step(0.45, fract((p.x + p.y) * 28.0));
    body = mix(body, body * vec3(0.22, 0.18, 0.28), hatch * core * 0.55);
    return mix(lyPaper(p) * 0.55, body, lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gHatchAraki(p, t); }`),

  D("gGreyManhwa", "manhwa grey — one toner plate, one blood red, no rainbow",
    ["layerKit"],
    /* glsl */ `
  vec3 gGreyManhwa(vec2 p, float t) {
    float h = lyNdL(p);
    float g = mix(0.18, 0.62, lyAA(h, 0.48));
    vec3 body = vec3(g * 0.95, g * 0.92, g);
    float slash = lyLine(p.x * 0.7 - p.y * 0.4 - 0.15, 3.2);
    body = mix(body, vec3(0.80, 0.10, 0.16), slash * lyCover(p) * 0.85);
    return lyPolice(mix(vec3(0.78, 0.76, 0.74) * 0.55, body, lyCover(p)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gGreyManhwa(p, t); }`),

  D("gPlasterFresco", "fresco plaster — grit in the fill, gold leaf on the key",
    ["layerKit"],
    /* glsl */ `
  vec3 gPlasterFresco(vec2 p, float t) {
    float grit = lyVn(p * 36.0);
    vec3 plaster = mix(vec3(0.62, 0.52, 0.40), vec3(0.80, 0.70, 0.52), grit);
    float h = lyNdL(p);
    vec3 gold = mix(vec3(0.55, 0.38, 0.16), vec3(0.86, 0.70, 0.36), lyAA(h, 0.62));
    vec3 body = mix(plaster * 0.7, gold, lyAA(h, 0.55));
    return lyPolice(mix(plaster * 0.45, body, lyCover(p)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gPlasterFresco(p, t); }`),

  D("gDuskShinkai", "Shinkai dusk split — warm key, cyan shadow, hard horizon",
    ["layerKit"],
    /* glsl */ `
  vec3 gDuskShinkai(vec2 p, float t) {
    vec3 dusk = mix(vec3(0.20, 0.22, 0.42), vec3(0.86, 0.52, 0.32), lyAA(p.y, 0.42));
    float h = lyNdL(p);
    vec3 body = mix(vec3(0.16, 0.22, 0.40), vec3(0.86, 0.62, 0.40), lyAA(h, 0.5));
    return lyPolice(mix(dusk * 0.8, body, lyCover(p)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gDuskShinkai(p, t); }`),

  D("gSmearImpact", "impact smear — trailing plates on uEmit, figure albedo locked",
    ["layerKit"],
    /* glsl */ `
  vec3 gSmearImpact(vec2 p, float t) {
    vec3 albedo = mix(lyPaper(p) * 0.5, mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.5)), lyCover(p));
    float pulse = step(0.72, fract(t * 2.4));
    float smear = 0.0;
    for (int i = 1; i <= 4; i++) {
      float fi = float(i);
      smear = max(smear, lyCover(p + vec2(fi * 0.045, 0.0)) * (1.0 - fi * 0.18));
    }
    vec3 glow = vec3(0.90, 0.70, 0.42) * smear * pulse * 0.45;
    return lyEmit(albedo, glow);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gSmearImpact(p, t); }`),

  D("gAnalogWeave", "gate weave — 24 fps lateral crawl, dirt as held drawings",
    ["layerKit"],
    /* glsl */ `
  vec3 gAnalogWeave(vec2 p, float t) {
    float ht = lyHold(t, 24.0);
    vec2 q = p + vec2((lyHash(vec2(ht, 0.7)) - 0.5) * 0.004, 0.0);
    vec3 plate = mix(lyPaper(q) * 0.5, mix(LY_FILL, LY_KEY, lyAA(lyNdL(q), 0.5)), lyCover(q));
    float hair = step(0.997, lyHash(vec2(floor(q.x * 90.0), ht)));
    return lyPolice(mix(plate, LY_INK, hair * 0.4));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gAnalogWeave(p, t); }`),

  D("gMappaDiff", "MAPPA diffusion — soft wrap on the terminator, ink stays hard",
    ["layerKit"],
    /* glsl */ `
  vec3 gMappaDiff(vec2 p, float t) {
    float h = lyNdL(p);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.34)), LY_KEY, lyAA(h, 0.68));
    float wrap = smoothstep(0.28, 0.62, h);
    body = mix(body * vec3(0.85, 0.80, 0.92), body, wrap);
    vec3 plate = mix(lyPaper(p) * 0.5, body, lyCover(p));
    return mix(plate, LY_INK, lyLine(lyFigD(p), 1.9) * 0.8);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gMappaDiff(p, t); }`),
];

export const GRAPHIC_PASS_SHADER_COUNT = 20;
if (GRAPHIC_PASSES.length !== GRAPHIC_PASS_SHADER_COUNT) {
  throw new Error(`graphic preview count ${GRAPHIC_PASSES.length} != ${GRAPHIC_PASS_SHADER_COUNT}`);
}
