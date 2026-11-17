// p-separatrix packet shaders: fresco plaster, Colosseum plate, Stand card, cloud burst, gold-leaf band, Giorno coat, fresco grade.
import { defineCut } from "../kit.glsl.js";

const F = "p-separatrix";
const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const S = (name, doc, meta, glsl, demoExpr, uni) => ({
  ...defineCut(name, F, doc, glsl, demoExpr),
  deps: ["cutKit", "sxKit", ...(meta.needs ?? [])],
  ...(uni ? { uniforms: U(uni) } : {}),
  suits: "p-separatrix",
  ...meta,
  needs: undefined,
});

export const sxKit = {
  name: "sxKit",
  family: F,
  doc: "p-separatrix helpers: plaster ground, lobed outline, heart, capsule, palette constants",
  deps: ["cutKit"],
  draws: "A shared helper that paints a trowelled plaster ground; the other separatrix tools call it.",
  use: "noise",
  suits: "p-separatrix",
  params: "uSxSeed: static trowel pattern; uSxAspect: frame width over height; uSxScale: metres per frame height",
  uniforms: U({ uSxSeed: 3, uSxAspect: 1.6, uSxScale: 24 }),
  glsl: `
uniform float uSxSeed;
uniform float uSxAspect;
uniform float uSxScale;
const vec3 SX_PLASTER = vec3(0.957, 0.910, 0.784);
const vec3 SX_SINOPIA = vec3(0.702, 0.071, 0.165);
const vec3 SX_COTTO = vec3(0.627, 0.314, 0.322);
const vec3 SX_CORNICE = vec3(0.922, 0.855, 0.631);
const vec3 SX_OCHRE = vec3(0.847, 0.718, 0.369);
const vec3 SX_GOLD = vec3(0.851, 0.643, 0.255);
const vec3 SX_INK = vec3(0.071, 0.047, 0.051);
const vec3 SX_HATCH = vec3(0.110, 0.094, 0.086);
vec3 sxPlaster(vec2 p) {
  float tex = cVn(p * vec2(310.0, 190.0) + uSxSeed);
  vec3 c = SX_PLASTER * (1.0 - 0.06 * tex);
  float s = cFbm(p * vec2(4.0, 11.0) + uSxSeed * 1.7);
  c = mix(c, SX_CORNICE, cAA(s, 0.56) * 0.75);
  c = mix(c, SX_OCHRE, cAA(s, 0.66) * 0.30);
  float d = cFbm(p * vec2(9.0, 3.0) + uSxSeed * 3.1);
  return mix(c, SX_COTTO, cAA(d, 0.70) * 0.28);
}
float sxLobe(vec2 q, float n, float amp, float rot) {
  float a = atan(q.y, q.x + 1e-6);
  return length(q) - (1.0 + amp * (2.0 * abs(sin(0.5 * n * (a + rot))) - 1.0));
}
float sxSeg(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}
float sxHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) { vec2 e = p - vec2(0.25, 0.75); return sqrt(dot(e, e)) - 0.35355339; }
  vec2 a = p - vec2(0.0, 1.0);
  vec2 b = p - vec2(0.5 * max(p.x + p.y, 0.0));
  return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);
}
`,
  demo: `vec3 demo(vec2 p, float t){ return cCap(sxPlaster(p)); }`,
};

export const sxArenaFloor = S("sxArenaFloor", "arena floor: trowelled plaster with the sinopia saddle phase portrait drawn under it",
  { draws: "A cream plaster floor with faint red lines under it: two crossing axes, four hyperbolas and two rings.", use: "plate", params: "uSxScale: metres across the frame height; uSxSeed: trowel patches and line wobble" },
  `vec3 sxArenaFloor(vec2 p, float t){
    vec2 m = (p - vec2(0.5 * uSxAspect, 0.5)) * uSxScale;
    m += (vec2(cVn(p * 37.0 + uSxSeed), cVn(p * 37.0 + 11.0 + uSxSeed)) - 0.5) * 0.06;
    float a = max(cLine(m.x, 1.6), cLine(m.y, 1.6));
    for (int i = 0; i < 4; i++) {
      float cc = 0.5 * exp2(float(i));
      float d = (abs(m.x * m.y) - cc) / max(length(vec2(m.y, m.x)), 0.25);
      a = max(a, cLine(d, 1.0) * 0.9);
    }
    a = max(a, cLine(length(m) - 8.0, 1.0) * 0.8);
    a = max(a, cLine(length(m) - 16.0, 1.0) * 0.8);
    return cCap(sxPlaster(p) * mix(vec3(1.0), SX_SINOPIA, 0.4 * a));
  }`, "sxArenaFloor(p, t)");

export const sxTrowelSweep = S("sxTrowelSweep", "plaster laid bottom to top over bare ground in 12 stepped drawings",
  { draws: "Cream plaster is laid over a dark rose-brown ground in ragged trowel arcs, rising from the bottom edge in twelve steps.", use: "screen", params: "uSxSweep: 0 bare to 1 fully laid, quantised to 12 drawings; uSxSeed: arc roughness" },
  `uniform float uSxSweep;
  vec3 sxTrowelSweep(vec2 p, float t){
    float k = floor(clamp(uSxSweep, 0.0, 1.0) * 12.0 + 1e-4) / 12.0;
    float arc = cFbm(vec2(p.x * 3.0, uSxSeed)) * 0.12 + 0.05 * sin(p.x * 9.0 + uSxSeed);
    float front = k * 1.25 - 0.10 + arc;
    float cov = cAA(front - p.y, 0.0);
    float ridge = cAA(front - p.y, 0.0) * (1.0 - cAA(front - p.y, 0.045));
    vec3 pl = sxPlaster(p);
    float stripe = step(0.5, fract(p.y * 18.0 + arc * 8.0));
    pl = mix(pl, SX_CORNICE, stripe * 0.35);
    pl = mix(pl, SX_OCHRE, ridge * 0.6);
    vec3 bare = vec3(0.30, 0.18, 0.19) * (0.85 + 0.3 * cVn(p * vec2(60.0, 30.0) + uSxSeed));
    return cCap(mix(bare, pl, cov));
  }`, "sxTrowelSweep(p, t)", { uSxSweep: 0.5 });

export const sxFrescoSky = S("sxFrescoSky", "fresco sky: plaster with sinopia lobed cloud-burst outlines, no violet",
  { draws: "A cream plaster sky with three cloud shapes drawn as scalloped red outlines, each with a smaller outline inside.", use: "plate", params: "uSxSeed: cloud positions, sizes and lobe counts (6 to 9)" },
  `vec3 sxFrescoSky(vec2 p, float t){
    vec3 c = sxPlaster(p);
    c = mix(c, SX_CORNICE, cAA(p.y, 0.78) * 0.5);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float h1 = cH21(vec2(fi + 1.0, uSxSeed));
      float h2 = cH21(vec2(fi + 7.0, uSxSeed + 3.0));
      vec2 ce = vec2((0.2 + 0.6 * h1) * uSxAspect, 0.62 + 0.28 * h2);
      float R = 0.16 + 0.10 * h2;
      float n = 6.0 + floor(h1 * 4.0);
      vec2 q = (p - ce) / vec2(R * 1.4, R);
      float d = sxLobe(q, n, 0.20, h1 * 6.28);
      float d2 = sxLobe(q * 1.6, n, 0.20, h1 * 6.28 + 1.0);
      c = mix(c, SX_CORNICE, cAA(-d, 0.0) * 0.6);
      c = mix(c, SX_SINOPIA, max(cLine(d, 1.0) * 0.55, cLine(d2, 1.0) * 0.35));
    }
    return cCap(c);
  }`, "sxFrescoSky(p, t)");

export const sxColosseumTiers = S("sxColosseumTiers", "Colosseum facade: three arched tiers and an attic, voids in cotto with sinopia hatch",
  { draws: "A cream plaster arena wall of three tiers of round arches and a windowed attic, the arch openings hatched in red over rose-brown.", use: "plate", params: "uSxScale: metres across the frame height (wall is 16.4 m tall, bays 3.2 m wide)" },
  `vec3 sxColosseumTiers(vec2 p, float t){
    vec2 m = vec2((p.x - 0.5 * uSxAspect) * uSxScale, p.y * uSxScale - 3.0);
    vec3 sky = sxPlaster(p);
    float onWall = cAA(m.y, 0.0) * (1.0 - cAA(m.y, 16.4));
    float ti = clamp(floor(m.y / 4.4), 0.0, 3.0);
    float attic = step(2.5, ti);
    float ly = m.y - ti * 4.4;
    float bx = mod(m.x + 1.6, 3.2) - 1.6;
    float da = (ly < 1.85) ? abs(bx) - 1.175 : length(vec2(bx, ly - 1.85)) - 1.175;
    float arch = max(da, -ly);
    float win = max(abs(bx) - 0.45, abs(ly - 1.7) - 0.55);
    float dv = mix(arch, win, attic);
    vec3 face = sxPlaster(p);
    float top = mix(4.4, 3.2, attic);
    face = mix(face, SX_COTTO, cAA(ly, top - 0.9) * (1.0 - cAA(ly, top - 0.4)) * 0.45);
    face = mix(face, SX_CORNICE, cAA(ly, top - 0.4));
    face = mix(face, SX_SINOPIA, cLine(ly - (top - 0.4), 1.0) * 0.7);
    float s = dot(vec2(bx, ly), vec2(0.7071, -0.7071));
    float hat = cLine(abs(fract(s / 0.18) - 0.5) * 0.18, 1.0);
    vec3 voidc = mix(SX_COTTO, SX_SINOPIA, hat * 0.55);
    face = mix(face, voidc, cFill(dv));
    face = mix(face, SX_SINOPIA, cLine(dv, 1.0) * 0.85);
    return cCap(mix(sky, face, onWall));
  }`, "sxColosseumTiers(p, t)");

export const sxStatueNiche = S("sxStatueNiche", "one tier-2 niche holding a plaster-relief statue, shadow side in cotto",
  { draws: "An arched niche in rose-brown with a cream relief statue on a plinth, its left half in red-brown shadow and a raised arm.", use: "card", params: "none; the niche sits at the frame centre, 6 m across the frame height" },
  `vec3 sxStatueNiche(vec2 p, float t){
    vec2 m = (p - vec2(0.5 * uSxAspect, 0.5)) * 6.0;
    float dn = (m.y < 1.0) ? abs(m.x) - 0.9 : length(vec2(m.x, m.y - 1.0)) - 0.9;
    dn = max(dn, -m.y - 1.6);
    float st = min(sxSeg(m, vec2(0.0, -1.1), vec2(0.0, -0.3), 0.42), sxSeg(m, vec2(0.0, -0.2), vec2(0.0, 0.25), 0.30));
    st = min(st, length(m - vec2(0.0, 0.62)) - 0.19);
    st = min(st, sxSeg(m, vec2(0.30, 0.25), vec2(0.55, 0.80), 0.07));
    st = min(st, max(abs(m.x) - 0.5, abs(m.y + 1.45) - 0.15));
    vec3 c = sxPlaster(p);
    vec3 niche = mix(SX_COTTO * 0.92, SX_SINOPIA, cLine(abs(fract(dot(m, vec2(0.7071, -0.7071)) / 0.2) - 0.5) * 0.2, 1.0) * 0.45);
    c = mix(c, niche, cFill(dn));
    vec3 fig = mix(SX_COTTO, SX_CORNICE, cAA(m.x + 0.1 * sin(m.y * 5.0), 0.0));
    c = mix(c, fig, cFill(st));
    c = mix(c, SX_SINOPIA, max(cLine(dn, 1.0), cLine(st, 1.0)) * 0.85);
    return cCap(c);
  }`, "sxStatueNiche(p, t)");

export const sxGoldWash = S("sxGoldWash", "three-step gold-cream wash from the upper right, rose-brown shade on the far side",
  { needs: ["sxColosseumTiers"], draws: "A cream-gold light fills the upper-right of the frame in three flat steps, with rose-brown shade on the opposite side and in the darkest areas.", use: "grade", params: "p: frame position that sets the light side; input colour is graded" },
  `vec3 sxGoldWash(vec3 col, vec2 p){
    float l = dot(p - vec2(0.5 * uSxAspect, 0.5), normalize(vec2(0.6, 0.8)));
    vec3 sh = vec3(0.486, 0.298, 0.271);
    vec3 warm = vec3(0.992, 0.988, 0.941);
    col = mix(col, sh, 0.30 * (1.0 - cAA(l, -0.10)));
    col = mix(col, warm, 0.35 * cAA(l, 0.22));
    col = mix(col, sh, 0.40 * (1.0 - cAA(cLuma(col), 0.45)));
    return cCap(col);
  }`, "sxGoldWash(sxColosseumTiers(p, t), p)");

export const sxStandCard = S("sxStandCard", "Gold Experience Requiem card: tall cream double of the seal, plates and orange gems",
  { needs: ["sxFrescoSky"], draws: "A tall cream seal-shaped figure, slightly see-through, with seven polygon plates edged in gold, two orange gems and a two-point crest on the brow.", use: "card", params: "uSxStand: fade 0 to 1 (alpha is 0.88 times it); card spans 0.9 of the frame height at the frame centre" },
  `uniform float uSxStand;
  vec3 sxStandCard(vec2 p, float t){
    vec2 q = p - vec2(0.5 * uSxAspect, 0.5);
    float body = length(q / vec2(0.20, 0.33)) - 1.0;
    body *= 0.2;
    float head = length(q - vec2(0.0, 0.33)) - 0.10;
    float fl = min(sxSeg(q, vec2(-0.17, 0.12), vec2(-0.28, -0.12), 0.045), sxSeg(q, vec2(0.17, 0.12), vec2(0.28, -0.12), 0.045));
    float d = min(min(body, head), fl);
    for (int i = 0; i < 2; i++) {
      float sg = (i == 0) ? -1.0 : 1.0;
      vec2 c = q - vec2(sg * 0.045, 0.43);
      d = min(d, max(abs(c.x) - 0.035 * (1.0 - c.y / 0.1), max(-c.y, c.y - 0.1)));
    }
    float pl = 1.0e3;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 ce; vec2 h;
      if (i < 3) { ce = vec2(0.0, 0.14 - 0.15 * fi); h = vec2(0.14 - 0.02 * fi, 0.06); }
      else if (i < 5) { ce = vec2((i == 3) ? -0.05 : 0.05, 0.34); h = vec2(0.04, 0.035); }
      else { ce = vec2((i == 5) ? -0.235 : 0.235, -0.02); h = vec2(0.022, 0.075); }
      vec2 e = abs(q - ce) - h;
      pl = min(pl, max(e.x, e.y));
    }
    vec3 c = vec3(0.937, 0.902, 0.753);
    c = mix(c, vec3(0.906, 0.863, 0.659), cFill(pl));
    c = mix(c, SX_GOLD, cLine(pl, 1.2));
    c = mix(c, SX_HATCH, cLine(d + 0.012, 1.0) * 0.6);
    vec3 gem = vec3(0.910, 0.510, 0.165);
    c = mix(c, gem, cFill(length(q - vec2(0.0, 0.14)) - 0.018));
    c = mix(c, gem, cFill(length(q - vec2(0.0, 0.31)) - 0.014));
    c = mix(c, vec3(0.957, 0.937, 0.890), cFill(d + 0.012) * (1.0 - cAA(d + 0.012, 0.0)) * cAA(q.x, 0.0));
    return cCap(mix(sxFrescoSky(p, t), c, 0.88 * clamp(uSxStand, 0.0, 1.0) * cFill(d)));
  }`, "sxStandCard(p, t)", { uSxStand: 1 });

export const sxCloudBurst = S("sxCloudBurst", "gold-cream cloud burst: hard lobes and three broad wedges, grows, swells and rewinds",
  { needs: ["sxFrescoSky"], draws: "A bright cream-gold burst of scalloped cloud lobes with three wide flat wedges reaching out, on a fresco sky; no thin rays.", use: "card", params: "uSxBurst: 0 nothing to 0.999 full; uSxSwell: 0 to 1 widens the ring by a quarter; uSxSeed: lobe count 6 to 9 and wedge angles" },
  `uniform float uSxBurst;
  uniform float uSxSwell;
  vec3 sxCloudBurst(vec2 p, float t){
    vec3 back = sxFrescoSky(p, t);
    float R = 0.5 * clamp(uSxBurst, 0.0, 1.0) * (1.0 + 0.25 * clamp(uSxSwell, 0.0, 1.0));
    vec2 q = (p - vec2(0.64 * uSxAspect, 0.60)) / max(R, 1e-3);
    float n = 6.0 + floor(mod(uSxSeed, 4.0));
    float d = sxLobe(q, n, 0.14, uSxSeed);
    float r = length(q);
    float a = atan(q.y, q.x + 1e-6);
    float wedge = 0.0;
    for (int i = 0; i < 3; i++) {
      float ang = 0.5 + 2.1 * float(i) + 0.37 * uSxSeed;
      float da = abs(mod(a - ang + 3.14159265, 6.2831853) - 3.14159265);
      float w = 0.17 * (1.0 - 0.45 * clamp((r - 1.0) / 1.4, 0.0, 1.0));
      wedge = max(wedge, cAA(w - da, 0.0) * cAA(r, 0.85) * (1.0 - cAA(r, 2.3)));
    }
    vec3 c = mix(back, vec3(0.953, 0.918, 0.800), wedge * 0.9);
    c = mix(c, vec3(0.953, 0.886, 0.690), cAA(-d, 0.0));
    c = mix(c, vec3(0.957, 0.937, 0.890), cAA(-d, 0.22));
    c = mix(c, vec3(1.0, 0.945, 0.85), (1.0 - cAA(abs(d), 0.03)) * cAA(-d, -0.03));
    c = mix(c, SX_COTTO, cLine(d, 1.0) * 0.35);
    return cCap(mix(back, c, step(0.003, R)));
  }`, "sxCloudBurst(p, t)", { uSxBurst: 0.9, uSxSwell: 0 });

export const sxGoldLeafBand = S("sxGoldLeafBand", "gold-leaf band laid along the corner diagonal, craquelure over red bole, seal left bare",
  { draws: "A broad band of gold leaf runs corner to corner, cracked in a fine web that shows red underneath, with plaster and red sketch lines in the corners and a hole around the seal.", use: "mask", params: "uSxLeafK: drawing 0 to 11 (half-width 110 px of a 1280 wide frame at 11); uSxSealX, uSxSealY, uSxSealRX, uSxSealRY: seal ellipse kept clear plus 6 px" },
  `uniform float uSxLeafK;
  uniform float uSxSealX;
  uniform float uSxSealY;
  uniform float uSxSealRX;
  uniform float uSxSealRY;
  vec3 sxGoldLeafBand(vec2 p, float t){
    vec3 back = sxPlaster(p) * mix(vec3(1.0), SX_SINOPIA, 0.4 * cLine(cFbm(p * 3.0 + uSxSeed) - 0.5, 1.0));
    float d = (p.x - p.y * uSxAspect) / sqrt(1.0 + uSxAspect * uSxAspect);
    d += (cFbm(p * 30.0 + uSxSeed) - 0.5) * 0.02;
    float hw = 0.2054 * smoothstep(0.0, 11.0, clamp(uSxLeafK, 0.0, 11.0));
    float leaf = cAA(hw - abs(d), 0.0);
    vec2 se = (p - vec2(uSxSealX, uSxSealY)) / vec2(uSxSealRX, uSxSealRY);
    float dd = (length(se) - 1.0) * min(uSxSealRX, uSxSealRY) - 0.0112;
    leaf *= cAA(dd, 0.0);
    vec3 gold = SX_GOLD * (0.85 + 0.15 * cFbm(p * 60.0));
    float u1 = p.x * 47.0 + 5.0 * sin(p.y * 31.0);
    float v1 = p.y * 53.0 + 4.0 * sin(p.x * 37.0);
    float u2 = (p.x + p.y) * 41.0 + 4.0 * sin(p.y * 23.0);
    float v2 = (p.x - p.y) * 59.0 + 3.0 * sin(p.x * 29.0);
    float cr = max(max(cLine(sin(u1), 1.0), cLine(sin(v1), 1.0)), max(cLine(sin(u2), 1.0), cLine(sin(v2), 1.0)));
    cr *= cAA(cFbm(p * 7.0 + uSxSeed), 0.40);
    gold = mix(gold, SX_SINOPIA * 0.8, cr * 0.9);
    return cCap(mix(back, gold, leaf));
  }`, "sxGoldLeafBand(p, t)", { uSxLeafK: 11, uSxSealX: 0.8, uSxSealY: 0.35, uSxSealRX: 0.12, uSxSealRY: 0.18 });

export const sxFoldHatch = S("sxFoldHatch", "JoJo fold hatching: bundles of 3 to 6 parallel strokes at 172.5 degrees on the shadow side",
  { needs: ["sxSealGoldRim"], draws: "Short parallel dark strokes in bundles of three to six lean across the shaded folds of a surface, tapering at their ends.", use: "surface", params: "col: surface colour in; shade: 0 lit to 1 shadow, strokes appear above 0.5; uSxSeed: bundle sizes" },
  `vec3 sxFoldHatch(vec3 col, vec2 p, float shade){
    float s = dot(p, vec2(0.13053, 0.99144)) / 0.009;
    float bundle = floor(s / 6.0);
    float n = 3.0 + floor(cH21(vec2(bundle, uSxSeed)) * 4.0);
    float on = step(floor(s - bundle * 6.0), n - 1.0);
    float line = cLine(abs(fract(s) - 0.5) * 0.009, 1.2);
    float along = dot(p, vec2(-0.99144, 0.13053)) * 9.0 + cH21(vec2(floor(s), 7.0));
    float tp = fract(along);
    float tap = step(0.15, tp) * (1.0 - step(0.85, tp));
    float m = line * on * tap * cAA(shade, 0.5);
    return mix(col, SX_HATCH, m * 0.9);
  }`, "sxFoldHatch(sxSealGoldRim(p, t), p, 1.0 - cNdL(p))");

export const sxSealGoldRim = S("sxSealGoldRim", "harp-seal body in two hard tones with one gold rim band toward the Stand",
  { draws: "A round blue-grey seal body with a pale flank and cream belly in flat light and shade tones, a heavy ink contour and one hard gold band on its right edge.", use: "surface", params: "none; body circle at (0.72, 0.5); key from upper front, rim from behind right" },
  `vec3 sxSealGoldRim(vec2 p, float t){
    vec2 c = cN(p);
    float R = sqrt(0.22);
    vec3 N = normalize(vec3(c, sqrt(max(0.22 - dot(c, c), 0.0))));
    float ndl = dot(N, normalize(vec3(-0.45, 0.75, 0.48)));
    float lit = cAA(ndl, 0.29);
    vec3 dorsal = vec3(0.525, 0.667, 0.839);
    vec3 flank = vec3(0.827, 0.886, 0.945);
    vec3 belly = vec3(0.973, 0.933, 0.878);
    vec3 base = mix(flank, dorsal, cAA(N.y, 0.25));
    base = mix(belly, base, cAA(N.y, -0.30));
    vec3 col = mix(base * 0.47, base, lit);
    float rim = step(0.5, pow(1.0 - max(N.z, 0.0), 5.0)) * step(0.0, dot(N, normalize(vec3(0.60, 0.35, -0.70))) + 0.3);
    col = mix(col, SX_GOLD, rim);
    float ln = cLine(length(c) - R, mix(1.6, 3.4, 1.0 - lit));
    col = mix(col, mix(vec3(0.031, 0.031, 0.027), SX_INK, 0.5), ln);
    return cCap(mix(sxPlaster(p), col, cFill(length(c) - R)));
  }`, "sxSealGoldRim(p, t)");

export const sxCoatHearts = S("sxCoatHearts", "Giorno coat on the seal: pink two-tone, three heart cut-outs down the chest, gold hem",
  { draws: "A pink coat in two flat tones across the seal's torso with three cream heart-shaped holes in a column down the chest and a gold hem line.", use: "surface", params: "none; hearts at x 0.72, y 0.44 / 0.34 / 0.24, 0.035 tall" },
  `vec3 sxCoatHearts(vec2 p, float t){
    float cov = cCover(p);
    vec3 col = mix(sxPlaster(p), vec3(0.827, 0.886, 0.945), cov);
    float coat = cov * cAA(0.52 - p.y, 0.0) * cAA(p.y, 0.20);
    vec3 pink = mix(vec3(0.722, 0.333, 0.604), vec3(0.851, 0.522, 0.741), cAA(cNdL(p), 0.5));
    col = mix(col, pink, coat);
    float hem = coat * (1.0 - cAA(abs(p.y - 0.215), 0.012));
    col = mix(col, vec3(0.941, 0.784, 0.376), hem);
    float s = 0.035;
    for (int i = 0; i < 3; i++) {
      vec2 q = (p - vec2(0.72, 0.44 - 0.10 * float(i))) / s + vec2(0.0, 0.5);
      float d = sxHeart(q) * s;
      col = mix(col, vec3(0.973, 0.933, 0.878), cFill(d) * coat);
      col = mix(col, SX_INK, cLine(d, 1.2) * coat * 0.8);
    }
    return cCap(col);
  }`, "sxCoatHearts(p, t)");

export const sxGradeFresco = S("sxGradeFresco", "fresco grade: split-tone, grain on twos, luma cap 0.92, ink floor lift",
  { needs: ["sxColosseumTiers", "sxGoldWash"], draws: "The picture takes warm grey shadows and cream highlights, a fine grain that changes twelve times a second, no pixel brighter than 0.92 and none darker than the brown-black ink.", use: "grade", params: "t: scene time (grain re-rolls on floor(12 t)); uSxSeed: grain pattern" },
  `vec3 sxGradeFresco(vec3 col, vec2 p, float t){
    float Y = cLuma(col);
    vec3 tone = mix(vec3(0.212, 0.165, 0.196), vec3(0.929, 0.933, 0.831), smoothstep(0.2, 0.8, Y));
    col = mix(col, tone, 0.35);
    float g = cH21(floor(p * 800.0) + floor(t * 12.0 + 1e-4) * 7.13 + uSxSeed);
    col += (g - 0.5) * 0.06 * (1.0 - Y);
    float L = cLuma(col);
    col *= min(1.0, 0.92 / max(L, 1e-4));
    return mix(SX_INK, col, smoothstep(0.035, 0.08, cLuma(col)));
  }`, "sxGradeFresco(sxGoldWash(sxColosseumTiers(p, t), p), p, t)");

export const sxIrisBars = S("sxIrisBars", "2.39:1 letterbox in studio ink with a round iris closing on the hero",
  { needs: ["sxFrescoSky"], draws: "Brown-black bars top and bottom crop the frame to wide-screen, and a round opening centred on the hero grows or shrinks, the rest dark ink.", use: "screen", params: "uSxIrisX, uSxIrisY, uSxIrisR: iris centre and radius in frame-height units; uSxAspect: frame width over height" },
  `uniform float uSxIrisX;
  uniform float uSxIrisY;
  uniform float uSxIrisR;
  vec3 sxIrisBars(vec3 col, vec2 p){
    float hb = min(uSxAspect / 2.39, 1.0) * 0.5;
    float bars = cAA(abs(p.y - 0.5) - hb, 0.0);
    float iris = cAA(length(p - vec2(uSxIrisX, uSxIrisY)) - uSxIrisR, 0.0);
    return mix(col, SX_INK, max(bars, iris));
  }`, "sxIrisBars(sxFrescoSky(p, t), p)", { uSxIrisX: 0.8, uSxIrisY: 0.5, uSxIrisR: 0.45 });

export const PACKET = [
  sxKit, sxArenaFloor, sxTrowelSweep, sxFrescoSky, sxColosseumTiers, sxStatueNiche, sxGoldWash,
  sxStandCard, sxCloudBurst, sxGoldLeafBand, sxFoldHatch, sxSealGoldRim, sxCoatHearts, sxGradeFresco, sxIrisBars,
];
export const PACKET_COUNT = 15;
if (PACKET.length !== PACKET_COUNT) throw new Error(`p-separatrix packet: ${PACKET.length} != ${PACKET_COUNT}`);
export default PACKET;
