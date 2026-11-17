// p-nerve packet shaders: Death Note rooftop pocket, Madhouse tenebrism (cone spot, rain, bell, Ryuk, folio, final grade).
import { defineCut as M } from "../kit.glsl.js";

const F = "p-nerve";
const SUITS = ["p-nerve"];
const v2 = (x, y) => ({ x, y });

const N = (name, doc, glsl, demoExpr, meta, uniforms, deps = []) => ({
  ...M(name, F, doc, glsl, demoExpr),
  deps: ["cutKit", ...deps],
  ...(uniforms ? { uniforms: () => uniforms } : {}),
  suits: SUITS,
  ...meta,
});

export const nerveSpotCone = N("nerveSpotCone", "cone lamp 3 m up: E = max(amb, (1 - smoothstep(in, out, theta)) cos^3 theta), banded into a hard pool",
  `uniform vec2 uNvPool;
  uniform float uNvConeIn;
  uniform float uNvConeOut;
  uniform float uNvBreath;
  uniform float uNvAmb;
  float nvConeE(vec2 p){
    vec2 q = (p - uNvPool) * vec2(1.0, 2.6);
    float th = atan(length(q) * 4.0 / 3.0);
    float c = cos(th);
    float e = max(uNvAmb, (1.0 - smoothstep(radians(uNvConeIn), radians(uNvConeOut), th)) * c * c * c);
    return e * (1.0 - 0.15 * uNvBreath);
  }
  float nvConeBand(vec2 p){
    float e = nvConeE(p);
    return 0.5 * cAA(e, 0.2) + 0.5 * cAA(e, 0.6);
  }
  vec3 nerveSpotCone(vec2 p, float t){
    float b = nvConeBand(p);
    vec3 ink = vec3(0.039, 0.055, 0.047);
    vec3 cream = vec3(0.949, 0.902, 0.847) * 0.88;
    float edge = cLine(nvConeE(p) - 0.2, 2.0) * 0.4;
    return mix(mix(ink, cream, b * 0.7), cream, edge);
  }`,
  "nerveSpotCone(p, t)",
  {
    draws: "one cold cream pool of light on dark ground, with a hard stepped falloff and a thin glowing edge",
    use: "mask",
    params: "uNvPool: pool centre on screen; uNvConeIn/uNvConeOut: cone half-angles in degrees (14/22, tighten to 9/15); uNvBreath: abs bell pulse that dims the lamp by up to 15 percent; uNvAmb: ambient floor 0.08",
  },
  { uNvPool: { value: v2(0.42, 0.30) }, uNvConeIn: { value: 14 }, uNvConeOut: { value: 22 }, uNvBreath: { value: 0 }, uNvAmb: { value: 0.08 } });

export const nerveRainCone = N("nerveRainCone", "three layers of thin rain streaks that exist only inside the lamp cone, stepping on twos",
  `uniform float uNvRainOn;
  float nvRainLayer(vec2 p, float tt, float speed, float seed){
    vec2 q = vec2(p.x + p.y * 0.06 + seed * 0.173, p.y);
    float cx = q.x * 120.0;
    float h = cH21(vec2(floor(cx), seed));
    float y = fract(q.y * 5.0 + h * 9.0 + tt * speed * 0.2);
    float len = cAA(0.12 - abs(y - 0.5), 0.0);
    float w = 1.0 - smoothstep(0.0, 0.08, abs(fract(cx) - 0.5));
    return w * len * step(0.45, h);
  }
  vec3 nerveRainCone(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    float r = nvRainLayer(p, tt, 9.0, 1.0) * 0.5 + nvRainLayer(p, tt, 11.0, 2.0) * 0.75 + nvRainLayer(p, tt, 13.0, 3.0);
    float inside = cAA(nvConeE(p), 0.2);
    return mix(nerveSpotCone(p, t), vec3(0.812, 0.910, 0.918) * 0.9, min(r, 1.0) * inside * uNvRainOn * 0.8);
  }`,
  "nerveRainCone(p, t)",
  {
    draws: "thin pale-teal rain streaks falling through the lamp pool, with no rain at all in the dark outside it",
    use: "plate",
    params: "t: seconds, held on 12 fps drawings; uNvRainOn: 1 rain, 0 silence after the kill; fall speeds 9, 11, 13 and slant 0.06 fixed",
  },
  { uNvRainOn: { value: 1 } }, ["nerveSpotCone"]);

export const nerveSplashRings = N("nerveSplashRings", "14 splash rings in the pool, each living three drawings and growing 0.04 to 0.12 m",
  `vec3 nerveSplashRings(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    float acc = 0.0;
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float x = tt + cH21(vec2(fi, 7.0));
      float k = floor(fract(x) * 12.0);
      float on = 1.0 - step(3.0, k);
      vec2 hh = cH22(vec2(fi, floor(x) + 3.0));
      float ang = hh.x * 6.28318;
      vec2 ctr = uNvPool + vec2(cos(ang), sin(ang) / 2.6) * sqrt(hh.y) / 4.0;
      float rm = 0.04 + 0.04 * k;
      vec2 e = (p - ctr) / vec2(rm / 4.0, rm / 10.4);
      float d = (length(e) - 1.0) * rm / 4.0;
      acc = max(acc, cLine(d, 1.4) * on * (1.0 - 0.25 * k));
    }
    float inside = cAA(nvConeE(p), 0.2);
    return mix(nerveSpotCone(p, t), vec3(0.812, 0.910, 0.918) * 0.9, acc * inside * 0.8);
  }`,
  "nerveSplashRings(p, t)",
  {
    draws: "small pale rings opening and fading on the wet floor inside the lamp pool",
    use: "plate",
    params: "t: seconds, held on 12 fps drawings; ring centres re-roll each second from fixed hashes; pool centre comes from nerveSpotCone",
  },
  null, ["nerveSpotCone"]);

export const nerveCityCard = N("nerveCityCard", "far painted city card: teal haze banding up to ink, two tower rows with dark windows, a belfry left of centre",
  `uniform float uNvCitySeed;
  vec3 nerveCityCard(vec2 p, float t){
    vec3 ink = vec3(0.039, 0.055, 0.047);
    float y = clamp(p.y, 0.0, 1.0);
    float v = 1.0 - y + (cFbm(p * vec2(4.0, 2.0)) - 0.5) * 0.08;
    vec3 c = cCel3(v, 0.45, 0.75, ink, vec3(0.141, 0.318, 0.337) * 0.4, vec3(0.325, 0.557, 0.561) * 0.5);
    float cxF = p.x * 17.0;
    float hF = 0.08 + 0.16 * cH21(vec2(floor(cxF), uNvCitySeed + 11.0));
    float farM = (1.0 - cAA(abs(fract(cxF) - 0.5), 0.46)) * cAA(hF - p.y, 0.0);
    c = mix(c, vec3(0.141, 0.318, 0.337) * 0.45, farM);
    float cx = p.x * 26.0;
    float hN = 0.10 + 0.24 * cH21(vec2(floor(cx), uNvCitySeed + 1.0));
    float wid = 0.55 + 0.4 * cH21(vec2(floor(cx), uNvCitySeed + 2.0));
    float tower = (1.0 - cAA(abs(fract(cx) - 0.5), wid * 0.5)) * cAA(hN - p.y, 0.0);
    vec2 wc = vec2(cx * 4.0, p.y * 60.0);
    vec2 wf = fract(wc) - 0.5;
    float win = cFill(max(abs(wf.x) - 0.18, abs(wf.y) - 0.22)) * step(0.5, cH21(floor(wc) + uNvCitySeed));
    c = mix(c, mix(vec3(0.165, 0.165, 0.118) * 0.7, ink, win), tower);
    float bx = abs(p.x - 0.40);
    float body = max(bx - 0.016, p.y - 0.30);
    float roof = max(bx - 0.022 * (1.0 - (p.y - 0.30) / 0.07), max(0.30 - p.y, p.y - 0.37));
    float arch = max(bx - 0.008, max(0.22 - p.y, p.y - 0.27));
    c = mix(c, vec3(0.165, 0.165, 0.118) * 0.6, cFill(min(body, roof)));
    c = mix(c, ink, cFill(arch));
    return cCap(mix(c, vec3(0.141, 0.318, 0.337), 0.2 * (1.0 - y)));
  }`,
  "nerveCityCard(p, t)",
  {
    draws: "a dark teal night skyline with two rows of towers, tiny dark windows and a narrow belfry with an open arch",
    use: "plate",
    params: "uNvCitySeed: reshuffles tower heights, widths and lit windows; belfry fixed at x 0.40, haze tint 0.2",
  },
  { uNvCitySeed: { value: 0 } });

export const nerveBellToll = N("nerveBellToll", "belfry bell swinging on a pivot, damped toll b(t) = e^-(dt/0.35) cos(2 pi 3 dt) at 4, 5 and 6 s",
  `uniform float uNvBellAmp;
  float nvBellB(float t){
    float s = 0.0;
    for (int i = 0; i < 3; i++) {
      float dt = t - (4.0 + float(i));
      float on = step(0.0, dt) * (1.0 - step(1.0, dt));
      s += on * exp(-dt / 0.35) * cos(6.28318 * 3.0 * dt);
    }
    return s;
  }
  vec3 nerveBellToll(vec2 p, float t){
    float b = nvBellB(t);
    float a = uNvBellAmp * b;
    vec2 q = p - vec2(0.40, 0.27);
    q = mat2(cos(a), sin(a), -sin(a), cos(a)) * q;
    float d = max(abs(q.x) - (0.008 - q.y * 0.2), max(q.y, -0.04 - q.y));
    vec3 c = nerveCityCard(p, t);
    c = mix(c, vec3(0.30, 0.22, 0.12) * 0.6, cFill(d));
    return mix(c, vec3(0.949, 0.902, 0.847) * 0.5, cLine(d, 1.6) * abs(b) * 0.8);
  }`,
  "nerveBellToll(p, t)",
  {
    draws: "a small dark bell hanging in the belfry arch that swings on each of three tolls, its rim catching a pale edge as it moves",
    use: "plate",
    params: "t: seconds; uNvBellAmp: swing in radians per unit of the damped wave (0.42); tolls at 4, 5, 6 s each cut at 1 s; nvBellB(t) also drives the lamp breath",
  },
  { uNvBellAmp: { value: 0.42 } }, ["nerveCityCard"]);

export const nerveRoofSlab = N("nerveRoofSlab", "wet maroon roof slab: concrete wet patches, six dark puddle decals with a lamp-side glint, two floor grates",
  `uniform float uNvSlabSeed;
  vec3 nerveRoofSlab(vec2 p, float t){
    vec3 ink = vec3(0.039, 0.055, 0.047);
    vec3 base = vec3(0.102, 0.047, 0.055);
    float wet = cAA(cFbm(p * vec2(7.0, 3.0) + uNvSlabSeed), 0.56);
    base = mix(base, vec3(0.129, 0.157, 0.173) * 0.75, wet * 0.75);
    float pud = 0.0;
    float glint = 0.0;
    for (int i = 0; i < 6; i++) {
      vec2 h = cH22(vec2(float(i), uNvSlabSeed + 5.0));
      vec2 c = uNvPool + vec2((h.x - 0.5) * 0.55, (h.y - 0.5) * 0.16 - 0.02);
      vec2 r = vec2(0.03 + 0.03 * h.y, 0.008 + 0.008 * h.x);
      float d = (length((p - c) / r) - 1.0) * r.y;
      pud = max(pud, cFill(d));
      glint = max(glint, cLine(d, 1.4) * step(p.x, c.x));
    }
    base = mix(base, ink, pud);
    for (int j = 0; j < 2; j++) {
      vec2 g = (p - (uNvPool + vec2(0.34, -0.07 - 0.09 * float(j)))) / vec2(0.10, 0.035);
      float gd = max(abs(g.x) - 1.0, abs(g.y) - 1.0);
      float slit = 1.0 - cAA(abs(fract(g.x * 5.0) - 0.5), 0.2);
      base = mix(base, mix(vec3(0.165, 0.165, 0.118) * 0.7, ink, slit), cFill(gd));
    }
    float eb = nvConeBand(p);
    vec3 cream = vec3(0.949, 0.902, 0.847);
    vec3 c = base * (0.5 + 1.7 * eb) + cream * 0.12 * eb * wet + cream * 0.4 * glint * max(eb, 0.3);
    return cCap(max(c, ink));
  }`,
  "nerveRoofSlab(p, t)",
  {
    draws: "a dark wet rooftop floor lit by one pool of light, with glossy puddle patches that catch a pale edge and a slatted metal grate at the side",
    use: "surface",
    params: "uNvSlabSeed: moves the wet patches and puddle placement; puddles are laid around uNvPool; grates sit right of the pool",
  },
  { uNvSlabSeed: { value: 0 } }, ["nerveSpotCone"]);

export const nerveParapet = N("nerveParapet", "back-edge parapet with a thin rail and posts over the city card, plus a shorter receding stretch at left",
  `vec3 nerveParapet(vec2 p, float t){
    vec3 conc = vec3(0.129, 0.157, 0.173);
    vec3 shade = vec3(0.039, 0.055, 0.047);
    float recede = 1.0 - cAA(p.x, 0.22);
    float lo = 0.42 + 0.04 * recede;
    float hi = 0.52 - 0.02 * recede;
    float body = cAA(p.y, lo) * (1.0 - cAA(p.y, hi));
    vec3 w = mix(conc * 0.55, shade, cAA(p.x, 0.5) * 0.5);
    w = mix(w, conc, cAA(p.y, hi - 0.025));
    w = mix(w, shade, cLine(0.5 - abs(fract(p.x * 4.0) - 0.5), 1.2) * 0.7);
    float rail = cFill(abs(p.y - 0.54) - 0.006);
    float post = cFill(max(abs(fract(p.x / 0.12) - 0.5) * 0.12 - 0.004, abs(p.y - 0.53) - 0.02));
    w = mix(w, shade, max(rail, post) * (1.0 - body));
    vec3 c = mix(nerveCityCard(p, t), w * (0.45 + 0.9 * nvConeBand(p)), max(body, max(rail, post)));
    return cCap(c);
  }`,
  "nerveParapet(p, t)",
  {
    draws: "a low grey concrete wall with a lit top edge and a thin railing in front of the far city, with a shorter dimmer stretch running off to the left",
    use: "plate",
    params: "p: screen position, wall band y 0.42 to 0.52 and rail at 0.54; the left stretch (x below 0.22) is lower and shorter; joints every 0.25 in x",
  },
  null, ["nerveSpotCone", "nerveCityCard"]);

export const nerveRyukPlate = N("nerveRyukPlate", "gaunt costumed Ryuk plate rising in six holds: spiky hair, ragged cloak, maroon lit edge, two pale round eyes",
  `uniform float uNvRyukT0;
  float nvRyukD(vec2 q){
    float d1 = (length((q - vec2(0.5, 0.86)) / vec2(0.075, 0.095)) - 1.0) * 0.075;
    float d2 = max(abs(q.x - 0.5) - 0.03, abs(q.y - 0.74) - 0.08);
    float hw = 0.09 + 0.30 * pow(clamp(1.0 - q.y / 0.76, 0.0, 1.0), 0.9) - 0.025 * abs(fract(q.y * 13.0) - 0.5) * 2.0 * (1.0 - q.y);
    float d3 = max(abs(q.x - 0.5) - hw, q.y - 0.76);
    float ytop = 0.93 + 0.065 * (1.0 - abs(fract((q.x - 0.5) * 7.5 + 0.5) * 2.0 - 1.0));
    float d4 = max(abs(q.x - 0.5) - 0.115, max(q.y - ytop, 0.82 - q.y));
    return min(min(d1, d2), min(d3, d4));
  }
  vec3 nerveRyukPlate(vec2 p, float t){
    float k = clamp(floor((t - uNvRyukT0) / 0.25 + 1e-4), 0.0, 5.0);
    float hf = k < 0.5 ? 0.2727 : (k < 1.5 ? 0.5455 : (k < 2.5 ? 0.8636 : (k < 3.5 ? 0.9545 : 1.0)));
    vec2 q = vec2(p.x, p.y + (1.0 - hf));
    float m = cFill(nvRyukD(q));
    float edge = m * (1.0 - cFill(nvRyukD(q - vec2(0.012, 0.0))));
    vec3 c = vec3(0.07, 0.09, 0.10);
    c = mix(c, vec3(0.039, 0.055, 0.047), m);
    c = mix(c, vec3(0.227, 0.063, 0.125), edge);
    vec2 el = q - vec2(0.46, 0.86);
    vec2 er = q - vec2(0.54, 0.86);
    float eye = max(cFill(length(el) - 0.022), cFill(length(er) - 0.022));
    float pup = max(cFill(length(el + vec2(0.003, 0.0)) - 0.008), cFill(length(er + vec2(0.003, 0.0)) - 0.008));
    c = mix(c, vec3(0.875, 0.890, 0.722) * 0.9, eye);
    return cCap(mix(c, vec3(0.039, 0.055, 0.047), pup));
  }`,
  "nerveRyukPlate(p, t)",
  {
    draws: "a tall dark spiky-haired figure in a ragged cloak with a thin maroon edge light on its left and two pale round eyes, growing upward in six jumps",
    use: "card",
    params: "p: plate-local uv 0..1; t: seconds; uNvRyukT0: start of the rise (6.5 s); hold heights 0.6, 1.2, 1.9, 2.1, 2.2, 2.2 of 2.2, 0.25 s each",
  },
  { uNvRyukT0: { value: 6.5 } });

export const nerveFolioCard = N("nerveFolioCard", "red folio slab sliding in from the right to 0.38 W over 12 drawings at 24 fps, cream lettering bars, ink border",
  `uniform float uNvFolioW;
  uniform float uNvFolioT0;
  vec3 nerveFolioCard(vec2 p, float t){
    vec3 ink = vec3(0.039, 0.055, 0.047);
    float k = clamp(floor((t - uNvFolioT0) * 24.0 + 1e-4), 0.0, 11.0);
    float x0 = uNvFolioW * (1.0 - 0.38 * smoothstep(0.0, 8.0, k));
    float d = x0 - p.x;
    vec2 u = vec2((p.x - x0) / (uNvFolioW * 0.38), p.y);
    vec3 c = vec3(0.702, 0.090, 0.122);
    vec3 cream = vec3(0.957, 0.937, 0.890);
    float big = cFill(max(abs(u.x - 0.5) - 0.34, abs(u.y - 0.62) - 0.04));
    float s1 = cFill(max(abs(u.x - 0.40) - 0.25, abs(u.y - 0.46) - 0.012));
    float s2 = cFill(max(abs(u.x - 0.45) - 0.30, abs(u.y - 0.40) - 0.012));
    float s3 = cFill(max(abs(u.x - 0.36) - 0.21, abs(u.y - 0.34) - 0.012));
    c = mix(c, cream, max(max(big, s1), max(s2, s3)));
    c = mix(c, ink, cLine(d, 2.0));
    vec3 bg = vec3(0.10, 0.12, 0.13) * (0.8 + 0.4 * p.y);
    return cCap(mix(bg, c, cFill(-d)));
  }`,
  "nerveFolioCard(p, t)",
  {
    draws: "a flat red slab with a thin black border and pale lettering bars sliding in from the right edge over a dark grey ground",
    use: "card",
    params: "p.x spans 0 to uNvFolioW; t: seconds; uNvFolioT0: slide start (8.0 s); k = 0..11 drawings at 24 fps, eased by smoothstep(0, 8, k) to 0.38 of the width",
  },
  { uNvFolioW: { value: 1 }, uNvFolioT0: { value: 8 } });

export const nerveGradeFinal = N("nerveGradeFinal", "final grade: split-tone #202821 / #dbdfd7 at 0.35, grain on twos weighted (1 - Y), ink floor, 0.92 cap, 2.39:1 letterbox",
  `uniform float uNvGrain;
  uniform float uNvGradeSeed;
  vec3 nerveGradeFinal(vec3 col, vec2 p, float t){
    vec3 ink = vec3(0.039, 0.055, 0.047);
    vec3 sh = vec3(0.125, 0.157, 0.129);
    vec3 hi = vec3(0.859, 0.875, 0.843);
    float w = smoothstep(0.2, 0.8, cLuma(col));
    vec3 c = mix(col, mix(sh, hi, w), 0.35);
    float tick = floor(t * 12.0 + 1e-4);
    float h = cH21(floor(p * vec2(640.0, 400.0)) + vec2(tick * 7.13, tick * 3.71 + uNvGradeSeed));
    c = max(c + uNvGrain * (1.0 - cLuma(c)) * (h - 0.5), 0.0);
    c = mix(ink, c, smoothstep(0.035, 0.08, cLuma(c)));
    c = cCap(c);
    float bar = 1.0 - cAA(0.33475 - abs(p.y - 0.5), 0.0);
    return mix(c, ink, bar);
  }`,
  "nerveGradeFinal(mix(vec3(0.02, 0.05, 0.06), vec3(0.95, 0.9, 0.85), clamp(p.x * 0.7, 0.0, 1.0)) * (0.3 + 0.7 * p.y), p, t)",
  {
    draws: "the whole frame turned cold in the shadows and pale in the highs, with visible grain in the darks, no black below a deep green-grey and wide black bars top and bottom",
    use: "grade",
    params: "col: input colour; p: screen uv 0..1 in y for the letterbox (bars 0.16525 each); t: seconds, grain re-rolls 12 times a second; uNvGrain: grain weight 0.04; uNvGradeSeed: grain seed",
  },
  { uNvGrain: { value: 0.04 }, uNvGradeSeed: { value: 0 } });

export const nerveSealFur = N("nerveSealFur", "Light-seal fur: blue-grey dorsal, flank and belly bands, hard two-tone cel, cream rim band, freckled muzzle pad",
  `vec3 nerveSealFur(vec2 p, float t){
    vec2 n = cN(p);
    float h = cNdL(p);
    float by = n.y / 0.469;
    vec3 dors = vec3(0.525, 0.667, 0.839);
    vec3 flank = vec3(0.827, 0.886, 0.945);
    vec3 belly = vec3(0.973, 0.933, 0.878);
    vec3 lit = mix(mix(belly, flank, cAA(by, -0.30)), dors, cAA(by, 0.35));
    vec3 c = mix(mix(vec3(0.247, 0.318, 0.369), lit * 0.55, 0.5), lit, cAA(h, 0.46));
    c = mix(c, vec3(0.949, 0.902, 0.847) * 0.9, cAA(length(n) / 0.469, 0.86) * cAA(h, 0.32) * 0.8);
    vec2 tip = (n - vec2(0.06, -0.20)) / vec2(0.09, 0.04);
    c = mix(c, vec3(0.353, 0.478, 0.659), cFill((length(tip) - 1.0) * 0.04));
    vec2 pad = (n - vec2(-0.17, -0.03)) / vec2(0.075, 0.045);
    float padM = cFill((length(pad) - 1.0) * 0.045);
    c = mix(c, vec3(0.941, 0.851, 0.741), padM);
    c = mix(c, vec3(0.463, 0.380, 0.310), padM * step(0.88, cH21(floor(p * 120.0))));
    c = mix(c, vec3(0.039, 0.055, 0.047), cFill(length(n - vec2(-0.235, -0.01)) - 0.012));
    return cCap(mix(vec3(0.059, 0.082, 0.071), c, cCover(p)));
  }`,
  "nerveSealFur(p, t)",
  {
    draws: "a round seal body in pale blue-grey fur, darker blue on the back and cream on the belly, with a light edge band, a freckled pink muzzle and a darker flipper tip",
    use: "surface",
    params: "p: screen position; body centred on the kit sphere cN; cel threshold 0.46 on N.L; band splits at by -0.30 and 0.35; shade #3f515e",
  });

export const nerveLightEye = N("nerveLightEye", "Light-seal eye: amber ring that turns red on the kill, dark lens, pale lit-side sclera rim, hard 1.4x ink ring, one catchlight",
  `uniform float uNvEyeRed;
  vec3 nerveLightEye(vec2 p, float t){
    vec2 q = p - vec2(0.5, 0.5);
    float r = length(q);
    vec3 c = vec3(0.525, 0.667, 0.839) * 0.85;
    float litSide = cAA(dot(q, vec2(-0.6, 0.8)), 0.0);
    c = mix(c, vec3(0.851, 0.867, 0.835), cFill(r - 0.16) * litSide);
    c = mix(c, vec3(0.659, 0.400, 0.165), cFill(r - 0.14));
    c = mix(c, mix(vec3(0.659, 0.400, 0.165), vec3(0.702, 0.090, 0.122), uNvEyeRed), cFill(r - 0.14) * cAA(r, 0.09));
    c = mix(c, vec3(0.125, 0.137, 0.173), cFill(r - 0.085));
    c = mix(c, vec3(0.039, 0.055, 0.047), cLine(r - 0.195, 2.0));
    c = mix(c, vec3(0.949, 0.902, 0.847) * 0.92, cFill(length(q - vec2(-0.04, 0.05)) - 0.018));
    return cCap(c);
  }`,
  "nerveLightEye(p, t)",
  {
    draws: "a big round eye with an amber-brown ring around a dark centre, a pale crescent on the lit side, one bright dot and a thick dark outline",
    use: "card",
    params: "p: eye-local uv, centre (0.5, 0.5), iris radius 0.14, lens 0.085; uNvEyeRed: 0 amber to 1 red ring (kill, 8.0 to 8.5 s)",
  },
  { uNvEyeRed: { value: 0 } });

export const nerveLEye = N("nerveLEye", "L-seal eye: huge pale sclera disc, dark lens with a dot pupil, hard upper lid, three hatched under-eye lines, widening flinch",
  `uniform float uNvWiden;
  vec3 nerveLEye(vec2 p, float t){
    vec2 q = p - vec2(0.5, 0.52);
    float R = 0.20 * (1.0 + 0.12 * uNvWiden);
    vec3 skin = vec3(0.78, 0.80, 0.80);
    vec3 c = skin;
    float sc = cFill(length(q) - R);
    c = mix(c, vec3(0.851, 0.867, 0.835), sc);
    c = mix(c, vec3(0.125, 0.137, 0.173), cFill(length(q - vec2(0.0, -0.01)) - 0.55 * R));
    c = mix(c, vec3(0.039, 0.055, 0.047), cFill(length(q - vec2(0.0, -0.01)) - 0.016));
    float lid = cAA(q.y - 0.62 * R, 0.0);
    c = mix(c, vec3(0.55, 0.58, 0.58), lid * sc);
    c = mix(c, vec3(0.039, 0.055, 0.047), cLine(q.y - 0.62 * R, 2.0) * sc);
    for (int i = 0; i < 3; i++) {
      float y = -R * 1.22 - 0.035 * float(i) + 0.16 * q.x * q.x;
      c = mix(c, vec3(0.227, 0.227, 0.259), cLine(q.y - y, 1.2) * (1.0 - cAA(abs(q.x), 0.16)));
    }
    c = mix(c, vec3(0.949, 0.902, 0.847) * 0.92, cFill(length(q - vec2(-0.05, 0.03)) - 0.018));
    return cCap(c);
  }`,
  "nerveLEye(p, t)",
  {
    draws: "an enormous round white eye with a dark centre and tiny dot pupil, a hard flat upper lid and three short tired lines under it",
    use: "card",
    params: "p: eye-local uv, centre (0.5, 0.52); uNvWiden: 0 to 1 grows the sclera 12 percent on each toll flinch",
  },
  { uNvWiden: { value: 0 } });

export const CUT_PACKET = [
  nerveSpotCone, nerveRainCone, nerveSplashRings, nerveCityCard, nerveBellToll, nerveRoofSlab, nerveParapet,
  nerveRyukPlate, nerveFolioCard, nerveGradeFinal, nerveSealFur, nerveLightEye, nerveLEye,
];
export const CUT_PACKET_COUNT = 13;
export default CUT_PACKET;
