// pr-tensorflow-124410 packet shaders: JoJo Part 3 DIO The World, flat magenta sky, gold Stand card, held colour invert.
import { defineCut } from "../kit.glsl.js";

const F = "pr-tensorflow-124410";
const SUIT = "pr-tensorflow-124410 (JoJo DIO The World)";

const T = (name, doc, glsl, demoExpr, meta, uniforms, deps = []) => ({
  ...defineCut(name, F, doc, glsl, demoExpr),
  deps: ["cutKit", ...deps],
  uniforms: () => Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])),
  suits: SUIT,
  ...meta,
});

export const tfSkyBands = T("tfSkyBands", "three hard flat sky bands, magenta over orchid over orange, no gradient",
  `uniform vec2 uTfSkyEdge;
  vec3 tfSkyBands(vec2 p, float t) {
    vec3 top = vec3(0.7529, 0.1490, 0.8275), mid = vec3(0.8510, 0.2941, 0.8157), hor = vec3(1.0, 0.5412, 0.2275);
    float b1 = cAA(p.y, uTfSkyEdge.x), b2 = cAA(p.y, uTfSkyEdge.y);
    return cCap(mix(mix(hor, mid, b1), top, b2));
  }`, "tfSkyBands(p, t)",
  { draws: "A sky of three flat horizontal bands, deep magenta on top, orchid in the middle and orange at the horizon, with hard edges.", use: "plate", params: "uTfSkyEdge: heights of the horizon-to-middle and middle-to-top band edges." },
  { uTfSkyEdge: { x: 0.30, y: 0.62 } });

export const tfCrestSlab = T("tfCrestSlab", "dam crest in perspective: faceted slab, 5 m joints, faded dash, violet valley shade",
  `uniform vec2 uTfVP;
  uniform float uTfJoint;
  vec3 tfCrestSlab(vec2 p, float t) {
    vec3 c = tfSkyBands(p, t);
    vec3 lit = vec3(0.4902, 0.4039, 0.3137), mid = vec3(0.3490, 0.2824, 0.2118), deep = vec3(0.1647, 0.1333, 0.0941), vio = vec3(0.2902, 0.2275, 0.4157);
    float dy = max(uTfVP.y - p.y, 0.012);
    float below = 1.0 - cAA(p.y, uTfVP.y);
    float X = (p.x - uTfVP.x) / dy * 0.9;
    float Z = 0.9 / dy;
    float far = 1.0 - cAA(Z, 120.0);
    float slab = 1.0 - cAA(abs(X), 2.0);
    float par = mod(floor(Z / uTfJoint), 2.0);
    vec3 face = mix(lit, mid, par);
    face = mix(face, deep, cAA(abs(X), 1.75));
    float jd = (0.5 - abs(fract(Z / uTfJoint) - 0.5)) * uTfJoint;
    face = mix(face, deep, cLine(jd, 1.4) * far);
    float dash = (1.0 - cAA(abs(X), 0.08)) * step(fract(Z / 1.5), 0.5) * far;
    face = mix(face, lit * 1.25, dash * 0.6);
    vec3 side = mix(deep, vio, step(0.0, X));
    vec3 ground = mix(side, face, slab);
    ground = mix(ground, deep, cLine(abs(X) - 2.0, 1.6) * far);
    return cCap(mix(c, ground, below));
  }`, "tfCrestSlab(p, t)",
  { draws: "A grey-brown road slab running away to a horizon, split into lit and mid segments by thin expansion joints, with a faded centre dash and dark curbs.", use: "surface", params: "uTfVP: vanishing point of the crest on screen; uTfJoint: spacing of the expansion joints in metres." },
  { uTfVP: { x: 0.72, y: 0.42 }, uTfJoint: 5 }, ["tfSkyBands"]);

export const tfGantryEdges = T("tfGantryEdges", "gantry of four mint edges between fluted pylons, the coral second edge in three pieces that fall",
  `uniform float uTfFall;
  uniform vec2 uTfSpan;
  float tfGantryBar(vec2 p, vec2 a, vec2 b, float hw) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - hw;
  }
  vec3 tfGantryEdges(vec2 p, float t) {
    vec3 c = tfSkyBands(p, t);
    vec3 lit = vec3(0.4902, 0.4039, 0.3137), mid = vec3(0.3490, 0.2824, 0.2118), ink = vec3(0.0706, 0.0510, 0.0157);
    vec3 mint = vec3(0.2392, 0.8784, 0.6902), coral = vec3(0.9569, 0.3686, 0.3137);
    for (int i = 0; i < 2; i++) {
      float x = i == 0 ? uTfSpan.x : uTfSpan.y;
      float d = max(abs(p.x - x) - 0.018, abs(p.y - 0.55) - 0.27);
      float flute = cFill(abs(fract((p.x - x) * 55.0) - 0.5) * 0.018 - 0.0045);
      c = mix(c, mix(lit, mid, flute), cFill(d));
      c = mix(c, ink, cLine(d, 1.6));
    }
    float fall = clamp(uTfFall, 0.0, 1.0);
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float h = k == 0 ? 4.0 : (k == 1 ? 7.5 : (k == 2 ? 11.0 : 14.0));
      float y = 0.28 + h * 0.0371;
      if (k == 1) {
        for (int j = 0; j < 3; j++) {
          float fj = float(j);
          float f0 = j == 0 ? 0.0 : (j == 1 ? 0.36 : 0.70);
          float f1 = j == 0 ? 0.36 : (j == 1 ? 0.70 : 1.0);
          float gap = 0.006 * smoothstep(0.0, 0.2, fall);
          float xa = mix(uTfSpan.x, uTfSpan.y, f0) + gap, xb = mix(uTfSpan.x, uTfSpan.y, f1) - gap;
          float dy = fall * fall * 0.55 * (0.8 + 0.25 * fj);
          float tilt = fall * 0.12 * (fj - 1.0);
          float d = tfGantryBar(p, vec2(xa, y - dy - tilt), vec2(xb, y - dy + tilt), 0.009);
          float vis = cAA(p.y, 0.12);
          vec3 col = mix(coral * 0.62, coral, cAA(p.y - (y - dy), 0.0));
          c = mix(c, col, cFill(d) * vis);
          c = mix(c, ink, cLine(d, 1.6) * vis);
        }
      } else {
        float d = tfGantryBar(p, vec2(uTfSpan.x, y), vec2(uTfSpan.y, y), 0.009);
        vec3 col = mix(mint * 0.62, mint, cAA(p.y - y, 0.0));
        c = mix(c, col, cFill(d));
        c = mix(c, ink, cLine(d, 1.6));
      }
    }
    return cCap(c);
  }`, "tfGantryEdges(p, t)",
  { draws: "Two fluted brown pylons with four horizontal bars strung between them, three mint and one coral; the coral bar is cut in three and drops out of frame as it falls.", use: "surface", params: "uTfFall: 0 holds the bars, 0 to 1 cracks the coral bar and drops its pieces; uTfSpan: screen x of the two pylons." },
  { uTfFall: 0, uTfSpan: { x: 0.35, y: 1.25 } }, ["tfSkyBands"]);

export const tfRollerCard = T("tfRollerCard", "painted road roller card in an eight-colour ramp, hangs then drops in three steps",
  `uniform vec2 uTfRollerAt;
  uniform float uTfRollerW;
  uniform float uTfDrop;
  float tfRollerBox(vec2 q, vec2 c, vec2 h) { vec2 d = abs(q - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  vec3 tfRollerCard(vec2 p, float t) {
    vec3 c = tfSkyBands(p, t);
    vec3 r1 = vec3(0.1216, 0.0863, 0.0471), r2 = vec3(0.4275, 0.3490, 0.2314), r3 = vec3(0.8118, 0.4118, 0.0157);
    vec3 r4 = vec3(0.6000, 0.4902, 0.3098), r5 = vec3(0.7412, 0.6392, 0.4275), r6 = vec3(0.9059, 0.8275, 0.5255);
    float drop = floor(clamp(uTfDrop, 0.0, 1.0) * 3.0 + 1e-4) / 3.0;
    vec2 q = (p - uTfRollerAt - vec2(0.0, (1.0 - drop) * 0.19)) / uTfRollerW;
    float dDrum = length(q - vec2(-0.28, -0.12)) - 0.22;
    float dWheel = length(q - vec2(0.30, -0.14)) - 0.13;
    float dBody = tfRollerBox(q, vec2(0.08, 0.0), vec2(0.30, 0.10));
    float dCab = tfRollerBox(q, vec2(0.20, 0.18), vec2(0.13, 0.10));
    float dRoof = tfRollerBox(q, vec2(0.20, 0.30), vec2(0.17, 0.02));
    float dStack = tfRollerBox(q, vec2(-0.06, 0.20), vec2(0.025, 0.12));
    vec3 drum = cCel3(q.y + 0.12, -0.10, 0.12, r1, r4, r5);
    drum = mix(drum, r2, cLine(length(q - vec2(-0.28, -0.12)) - 0.12, 1.6) * 0.8);
    c = mix(c, drum, cFill(dDrum));
    c = mix(c, cCel3(q.y + 0.14, -0.08, 0.08, r1, r2, r4), cFill(dWheel));
    c = mix(c, cCel3(q.y, -0.05, 0.07, r2, r3, r6), cFill(dBody));
    c = mix(c, cCel3(q.y - 0.18, -0.05, 0.07, r2, r3, r5), cFill(dCab));
    float win = tfRollerBox(q, vec2(0.20, 0.19), vec2(0.07, 0.05));
    c = mix(c, r1, cFill(win));
    c = mix(c, r2, cFill(dRoof));
    c = mix(c, r1, cFill(dStack));
    float dAll = min(min(min(dDrum, dWheel), min(dBody, dCab)), min(dRoof, dStack));
    c = mix(c, r1, cLine(dAll, 2.2));
    return cCap(c);
  }`, "tfRollerCard(p, t)",
  { draws: "A flat painted steam road roller, orange body, tan drum and wheel, a window cab with a flat roof and a tall chimney, with a heavy dark outline.", use: "card", params: "uTfRollerAt: screen position of the card; uTfRollerW: card width; uTfDrop: 0 hangs high, steps to 1 in three drawings as it lands." },
  { uTfRollerAt: { x: 1.15, y: 0.55 }, uTfRollerW: 0.55, uTfDrop: 0 }, ["tfSkyBands"]);

export const tfSfxCard = T("tfSfxCard", "sound-effect card: thick ink border, two-tone fill, hard offset shadow, tilt flipping on twos",
  `uniform vec2 uTfCardAt;
  uniform vec2 uTfCardHalf;
  uniform float uTfCardMode;
  float tfSfxBox(vec2 q, vec2 h) { vec2 d = abs(q) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  vec3 tfSfxCard(vec2 p, float t) {
    vec3 c = tfSkyBands(p, t);
    vec3 ink = vec3(0.0706, 0.0510, 0.0157), orange = vec3(0.8118, 0.4118, 0.0157), gold = vec3(0.9098, 0.7216, 0.2902);
    float s = mod(floor(t * 12.0), 2.0) * 2.0 - 1.0;
    float a = 0.0698 * s;
    vec2 q = p - uTfCardAt;
    q = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y);
    float dS = tfSfxBox(q - vec2(0.010, -0.010), uTfCardHalf);
    float d = tfSfxBox(q, uTfCardHalf);
    c = mix(c, ink, cFill(dS) * 0.9);
    vec3 fill = mix(mix(orange * 0.78, orange, cAA(q.y, -0.2 * uTfCardHalf.y)), ink, uTfCardMode);
    vec3 edge = mix(ink, gold, uTfCardMode);
    c = mix(c, edge, cFill(d));
    c = mix(c, fill, cFill(d + 0.010));
    c = mix(c, edge, cLine(d + 0.022, 1.2) * 0.7);
    return cCap(c);
  }`, "tfSfxCard(p, t)",
  { draws: "A tilted flat card with a thick dark border and a hard offset shadow, orange for a katakana sound word or dark with a gold border for the gold MUDA word, tilting the other way every drawing.", use: "card", params: "uTfCardAt: screen centre; uTfCardHalf: half width and height; uTfCardMode: 0 orange katakana card, 1 gold-on-ink MUDA card." },
  { uTfCardAt: { x: 1.20, y: 0.22 }, uTfCardHalf: { x: 0.20, y: 0.055 }, uTfCardMode: 0 }, ["tfSkyBands"]);

export const tfStandCard = T("tfStandCard", "flat gold Stand silhouette card in three plate values, rises in six holds, hard gold rim",
  `uniform vec2 uTfStandAt;
  uniform float uTfStandH;
  uniform float uTfRise;
  uniform float uTfFade;
  float tfStandSeg(vec2 q, vec2 a, vec2 b, float hw) {
    vec2 pa = q - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - hw;
  }
  vec3 tfStandCard(vec2 p, float t) {
    vec3 c = tfSkyBands(p, t);
    vec3 dk = vec3(0.7333, 0.5333, 0.2353), md = vec3(0.9098, 0.7216, 0.2902), lt = vec3(0.9412, 0.7412, 0.2706), rimc = vec3(0.9765, 0.9255, 0.4706), ink = vec3(0.0706, 0.0510, 0.0157);
    float rise = floor(clamp(uTfRise, 0.0, 1.0) * 6.0 + 1e-4) / 6.0;
    float sway = 0.006 * (mod(floor(t * 12.0), 2.0) * 2.0 - 1.0);
    vec2 q = vec2((p.x - uTfStandAt.x - sway) / uTfStandH, (p.y - uTfStandAt.y) / uTfStandH + 1.0 - rise);
    float dHead = length(q - vec2(0.0, 0.88)) - 0.07;
    float dNeck = max(abs(q.x) - 0.03, abs(q.y - 0.80) - 0.04);
    float dTorso = max(abs(q.x) - (0.17 - 0.25 * max(0.66 - q.y, 0.0)), abs(q.y - 0.62) - 0.19);
    float dArmL = tfStandSeg(q, vec2(-0.19, 0.72), vec2(-0.30, 0.38), 0.045);
    float dArmR = tfStandSeg(q, vec2(0.19, 0.72), vec2(0.30, 0.38), 0.045);
    float dLegL = max(abs(q.x + 0.07) - 0.055, abs(q.y - 0.20) - 0.20);
    float dLegR = max(abs(q.x - 0.07) - 0.055, abs(q.y - 0.20) - 0.20);
    float d = min(min(min(dHead, dNeck), min(dTorso, dArmL)), min(min(dArmR, dLegL), dLegR));
    float v = 0.5 - 0.55 * q.x + 0.15 * (q.y - 0.5);
    vec3 gold = cCel3(v, 0.38, 0.66, dk, md, lt);
    float onTorso = cFill(dTorso);
    float seam = max(max(cLine(q.x, 1.3), cLine(q.y - 0.70, 1.3)), cLine(q.y - 0.54, 1.3)) * onTorso;
    gold = mix(gold, dk * 0.78, seam);
    float rim = cFill(d) * (1.0 - cFill(d + 0.018));
    gold = mix(gold, rimc, rim);
    float crest = cAA(p.y, uTfStandAt.y);
    c = mix(c, gold, cFill(d) * crest * (1.0 - clamp(uTfFade, 0.0, 1.0)));
    c = mix(c, ink, cLine(p.y - uTfStandAt.y, 2.0) * cFill(d) * (1.0 - clamp(uTfFade, 0.0, 1.0)));
    return cCap(c);
  }`, "tfStandCard(p, t)",
  { draws: "A flat gold silhouette of a muscular figure with a plated chest, lit gold on one side and shadow gold on the other, with a bright yellow rim, climbing up out of the ground in six steps.", use: "card", params: "uTfStandAt: screen x and the ground line it rises from; uTfStandH: card height; uTfRise: 0 to 1 in six holds; uTfFade: 1 removes it." },
  { uTfStandAt: { x: 0.95, y: 0.40 }, uTfStandH: 0.62, uTfRise: 1, uTfFade: 0 }, ["tfSkyBands"]);

export const tfFistSmears = T("tfFistSmears", "forty gold fist smears re-rolled every drawing, streaming from the Stand toward the lens",
  `uniform vec2 uTfSmearFrom;
  uniform float uTfSmearW;
  float tfSmearSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  vec3 tfFistSmears(vec2 p, float t) {
    vec3 c = tfSkyBands(p, t);
    vec3 gold = vec3(0.9098, 0.7216, 0.2902), hot = vec3(0.9765, 0.9255, 0.4706), ink = vec3(0.0706, 0.0510, 0.0157);
    float step12 = floor(t * 12.0);
    for (int i = 0; i < 40; i++) {
      float fi = float(i);
      vec2 h = cH22(vec2(fi + 1.0, step12 * 0.137 + 0.5));
      float h3 = cH21(vec2(fi * 0.31 + 2.0, step12 + 7.0));
      vec2 s0 = uTfSmearFrom + vec2((h.x * 2.0 - 1.0) * 1.2 * uTfSmearW, (h.y * 2.0 - 1.0) * 0.22);
      vec2 dir = normalize(s0 - uTfSmearFrom + vec2(0.0001, 0.0));
      float r0 = 0.10 + 0.55 * h3;
      vec2 a = uTfSmearFrom + dir * r0;
      vec2 b = a + dir * uTfSmearW * 0.9 * 1.15;
      float d = tfSmearSeg(p, a, b) - uTfSmearW * 0.12 * 0.5;
      float core = tfSmearSeg(p, a, b) - uTfSmearW * 0.04;
      c = mix(c, ink, cLine(d, 1.4) * 0.8);
      c = mix(c, gold, cFill(d));
      c = mix(c, hot, cFill(core) * 0.7);
    }
    return cCap(c);
  }`, "tfFistSmears(p, t)",
  { draws: "A barrage of forty short gold streaks with pale cores flying outward from one point, scattered afresh each drawing.", use: "card", params: "uTfSmearFrom: screen point the smears fly from; uTfSmearW: seal width that scales their length, width and lateral spread." },
  { uTfSmearFrom: { x: 0.95, y: 0.52 }, uTfSmearW: 0.4 }, ["tfSkyBands"]);

export const tfTimeStopSphere = T("tfTimeStopSphere", "growing negative sphere with a 3 px gold ring and an uninverted catchlight, held until it fills the frame",
  `uniform vec2 uTfStopAt;
  uniform float uTfStopH;
  uniform float uTfK;
  vec3 tfTimeStopSphere(vec3 col, vec2 p, float keep) {
    vec3 gold = vec3(0.9098, 0.7216, 0.2902);
    float k = clamp(floor(uTfK + 1e-4), 0.0, 11.0);
    float r = 1.4 * uTfStopH * smoothstep(0.0, 9.0, k);
    float d = length(p - uTfStopAt) - r;
    float inside = (1.0 - cAA(d, 0.0)) * step(0.0001, r);
    vec3 neg = vec3(0.035) + 0.92 * (vec3(1.0) - col);
    vec3 c = mix(col, neg, inside * (1.0 - keep));
    c = mix(c, gold, cLine(d, 3.0) * step(0.5, r));
    return cCap(c);
  }`, "tfTimeStopSphere(tfSkyBands(p, t), p, 1.0 - cAA(length(p - vec2(0.70, 0.52)), 0.012))",
  { draws: "A negative circle swelling from the hero, every colour inside it flipped, edged by a thin gold ring, with one small highlight left in its true colour; at the end the whole frame is the negative.", use: "screen", params: "uTfStopAt: sphere centre on the hero; uTfStopH: image height that scales the radius; uTfK: drawing index 0 to 11 at 24 fps; the third argument is 1 on catchlight pixels to leave them unflipped." },
  { uTfStopAt: { x: 0.72, y: 0.52 }, uTfStopH: 1, uTfK: 5 }, ["tfSkyBands"]);

export const tfFrame = T("tfFrame", "2.39:1 letterbox bars and round iris in studio ink, never black",
  `uniform float uTfAspect;
  uniform float uTfIris;
  uniform vec2 uTfIrisAt;
  vec3 tfFrame(vec3 col, vec2 p, float t) {
    vec3 ink = vec3(0.0706, 0.0510, 0.0157);
    float bar = 0.5 * (1.0 - min(uTfAspect / 2.39, 1.0));
    float inImg = cAA(p.y, bar) * (1.0 - cAA(p.y, 1.0 - bar));
    float inIris = 1.0 - cAA(length(p - uTfIrisAt), uTfIris);
    return mix(ink, col, inImg * inIris);
  }`, "tfFrame(tfSkyBands(p, t), p, t)",
  { draws: "Dark brown bars above and below the picture and a round opening that closes onto the hero, with a hard edge.", use: "mask", params: "uTfAspect: frame width over height; uTfIris: iris radius, 1.4 open, 0 closed; uTfIrisAt: iris centre on the hero." },
  { uTfAspect: 1.6, uTfIris: 1.4, uTfIrisAt: { x: 0.72, y: 0.5 } }, ["tfSkyBands"]);

export const tfGrade = T("tfGrade", "split tone, 12 fps grain, luma cap 0.92 and ink floor lift in one pass",
  `uniform vec2 uTfRes;
  vec3 tfGrade(vec3 c, vec2 p, float t) {
    vec3 ts = vec3(0.1882, 0.1333, 0.0471), th = vec3(0.9765, 0.9765, 0.6980), ink = vec3(0.0706, 0.0510, 0.0157);
    float y = cLuma(c);
    float w = smoothstep(0.2, 0.8, y);
    vec3 tint = mix(mix(vec3(1.0), ts / cLuma(ts), 0.35), mix(vec3(1.0), th / cLuma(th), 0.35), w);
    c *= tint;
    vec2 cell = floor(p * uTfRes.y) + vec2(17.0 * floor(12.0 * t), 0.0);
    c += 0.03 * (1.0 - cLuma(c)) * (cH21(cell) - 0.5);
    float y2 = cLuma(c);
    c *= min(1.0, 0.92 / max(y2, 1e-4));
    float lift = 1.0 - smoothstep(0.035, 0.08, cLuma(c));
    return mix(c, max(c, ink), lift);
  }`, "tfGrade(tfCrestSlab(p, t), p, t)",
  { draws: "The whole frame warmed toward brown in the shadows and pale yellow in the lights, with fine film grain that changes twelve times a second and no pixel darker than the studio ink.", use: "grade", params: "uTfRes: output pixel size that sets the grain cell." },
  { uTfRes: { x: 1280, y: 800 } }, ["tfCrestSlab"]);

export const tfSealCoat = T("tfSealCoat", "harp-seal pup coat: blue back, pale flank, cream belly, hard shade, hatched fur clumps, dark flipper tips",
  `vec3 tfSealCoat(vec2 p, float t) {
    vec3 c = tfSkyBands(p, t);
    vec3 dors = vec3(0.5255, 0.6667, 0.8392), flank = vec3(0.8275, 0.8863, 0.9451), belly = vec3(0.9725, 0.9333, 0.8784) * 0.94;
    vec3 tip = vec3(0.3529, 0.4784, 0.6588), strokeC = vec3(0.2510, 0.3020, 0.3490), shade = vec3(0.478, 0.455, 0.416);
    vec2 q = cN(p);
    float v = q.y / 0.469;
    vec3 coat = mix(mix(belly, flank, cAA(v, -0.45)), dors, cAA(v, 0.15));
    coat *= mix(shade, vec3(1.0), cAA(cNdL(p), 0.5));
    vec2 dir = vec2(-0.3827, 0.9239);
    for (int i = 0; i < 3; i++) {
      vec2 cc = i == 0 ? vec2(-0.22, 0.04) : (i == 1 ? vec2(0.22, 0.04) : vec2(0.0, -0.22));
      vec2 r = q - cc;
      float mask = 1.0 - cAA(length(r / vec2(0.075, 0.06)), 1.0);
      float u = dot(r, dir) + (cVn(r * 60.0) - 0.5) * 0.004;
      float stroke = cFill(abs(fract(u / 0.022 + 0.5) - 0.5) * 0.022 - 0.0035);
      coat = mix(coat, strokeC, stroke * mask);
    }
    float tl = length((q - vec2(-0.34, -0.30)) / vec2(0.07, 0.035)) - 1.0;
    float tr = length((q - vec2(0.34, -0.30)) / vec2(0.07, 0.035)) - 1.0;
    coat = mix(coat, tip, max(cFill(tl), cFill(tr)));
    return cCap(mix(c, coat, cCover(p)));
  }`, "tfSealCoat(p, t)",
  { draws: "A round seal body with a blue-grey back, a pale flank and a cream belly, one hard shadow edge, three small patches of slanted dark fur strokes and dark flipper tips.", use: "surface", params: "none; centred on the hero point." },
  {}, ["tfSkyBands"]);

export const tfDioEye = T("tfDioEye", "pair of red upturned angry eyes, heavy angular ink brow, hard lower lid, one cream catchlight",
  `uniform float uTfOpen;
  float tfEyeBrow(vec2 q, vec2 a, vec2 b, float hw) {
    vec2 m = (a + b) * 0.5, e = normalize(b - a);
    vec2 r = q - m;
    vec2 u = vec2(dot(r, e), dot(r, vec2(-e.y, e.x)));
    vec2 d = abs(u) - vec2(length(b - a) * 0.5, hw);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  vec3 tfDioEye(vec2 p, float t) {
    vec3 c = tfSealCoat(p, t);
    vec3 ink = vec3(0.0706, 0.0510, 0.0157), iris = vec3(0.7529, 0.1569, 0.2275), low = vec3(0.3529, 0.0392, 0.1020), cat = vec3(0.9569, 0.9373, 0.8902);
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      vec2 q = p - vec2(0.72 + sg * 0.13, 0.56);
      float yy = q.y - 0.28 * q.x * sg;
      yy = yy < 0.0 ? yy * 1.4 : yy;
      float open = clamp(uTfOpen, 0.15, 1.0);
      float lens = length(vec2(q.x / 0.085, yy / (0.042 * open))) - 1.0;
      float irisD = length(q - vec2(0.0, 0.0)) - 0.036;
      vec3 eye = mix(ink, mix(low, iris, cAA(q.y, -0.006)), cFill(irisD));
      eye = mix(eye, low, cAA(yy, 0.018 * open) * cFill(irisD));
      float dot0 = length(q - vec2(0.012, 0.010)) - 0.008;
      eye = mix(eye, cat, cFill(dot0));
      c = mix(c, eye, cFill(lens));
      c = mix(c, ink, cLine(lens, 2.0));
      vec2 a = vec2(0.72 + sg * 0.13 - sg * 0.09, 0.56 + 0.05), b = vec2(0.72 + sg * 0.13 + sg * 0.11, 0.56 + 0.095);
      float br = tfEyeBrow(p, a, b, 0.012);
      c = mix(c, ink, cFill(br));
    }
    return cCap(c);
  }`, "tfDioEye(p, t)",
  { draws: "Two wide low eyes with red irises, upturned outer corners, a flat lower lid and a single cream highlight, each under a thick slanted dark brow on a blue seal face.", use: "card", params: "uTfOpen: lid opening from 0.15 narrowed to 1 fully open." },
  { uTfOpen: 1 }, ["tfSealCoat"]);

export const tfDioJacket = T("tfDioJacket", "open yellow jacket over a black shirt with gold shoulder studs, bracers and a dark hem",
  `vec3 tfDioJacket(vec2 p, float t) {
    vec3 c = tfSealCoat(p, t);
    vec3 jm = vec3(0.9490, 0.7216, 0.1882), jl = vec3(1.0, 0.8235, 0.2902), js = vec3(0.5412, 0.3529, 0.0627), hem = vec3(0.2275, 0.1255, 0.0314);
    vec3 sh = vec3(0.1490, 0.1490, 0.2510), shd = vec3(0.0392, 0.0392, 0.0706), gold = vec3(0.9098, 0.7216, 0.1725), stud = vec3(1.0, 0.8863, 0.4784), ink = vec3(0.0706, 0.0510, 0.0157);
    vec2 q = cN(p);
    float below = cAA(-(q.y + 0.02), 0.0) * cCover(p);
    float vHalf = 0.04 + max(-q.y - 0.02, 0.0) * 0.35;
    float vOpen = 1.0 - cAA(abs(q.x), vHalf);
    vec3 jac = cCel3(cNdL(p), 0.36, 0.64, js, jm, jl);
    jac = mix(jac, hem, cAA(-q.y, 0.30));
    vec3 shirt = mix(shd, sh, cAA(cNdL(p), 0.45));
    vec3 body = mix(jac, shirt, vOpen);
    c = mix(c, body, below);
    c = mix(c, ink, cLine(abs(q.x) - vHalf, 1.6) * below);
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      float ds = length(q - vec2(sg * 0.20, -0.04)) - 0.018;
      c = mix(c, stud, cFill(ds) * cCover(p));
      c = mix(c, ink, cLine(ds, 1.4) * cCover(p));
      vec2 br = abs(q - vec2(sg * 0.36, -0.20)) - vec2(0.03, 0.05);
      float db = length(max(br, 0.0)) + min(max(br.x, br.y), 0.0);
      c = mix(c, gold, cFill(db));
      c = mix(c, ink, cLine(db, 1.4));
    }
    return cCap(c);
  }`, "tfDioJacket(p, t)",
  { draws: "The lower body wrapped in a bright yellow jacket in three flat tones with a dark hem, open in a widening black shirt wedge down the middle, with two gold studs high on the shoulders and two gold bracers on the flippers.", use: "surface", params: "none; centred on the hero point." },
  {}, ["tfSealCoat"]);

export const tfInkShadow = T("tfInkShadow", "outer ink hull whose width follows the light: 1.6 px lit side to 3.4 px shadow side",
  `uniform float uTfInkH;
  vec3 tfInkShadow(vec3 col, vec2 p, float t) {
    vec3 ink = vec3(0.0706, 0.0510, 0.0157), warm = vec3(0.1373, 0.1294, 0.1294);
    float nl = 2.0 * cNdL(p) - 1.0;
    float w = (1.6 + 1.8 * smoothstep(0.3, -0.5, nl)) * uTfInkH / 800.0;
    float d = length(cN(p)) - sqrt(0.22);
    float ln = cLine(d, w) * step(0.0, d + 0.002);
    vec3 lc = mix(warm, ink, smoothstep(0.3, -0.5, nl));
    return mix(col, lc, ln);
  }`, "tfInkShadow(mix(tfSkyBands(p, t), tfSealCoat(p, t), cCover(p)), p, t)",
  { draws: "A dark outline hugging the outside of a round body, thin on the lit upper left and heavy on the shadowed lower right.", use: "line", params: "uTfInkH: output height in pixels over 800 that scales the line width." },
  { uTfInkH: 800 }, ["tfSkyBands", "tfSealCoat"]);

export const PACKET_SHADERS = [
  tfSkyBands, tfCrestSlab, tfGantryEdges, tfRollerCard, tfSfxCard, tfStandCard, tfFistSmears,
  tfTimeStopSphere, tfFrame, tfGrade, tfSealCoat, tfDioEye, tfDioJacket, tfInkShadow,
];
export default PACKET_SHADERS;
