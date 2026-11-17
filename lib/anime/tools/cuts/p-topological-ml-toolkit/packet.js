// p-topological-ml-toolkit (Index III, Accelerator, J.C.Staff): grey glass city, Accelerator seal, red-to-white reflected arrows.
import { Vector2 } from "three";
import { defineCut } from "../kit.glsl.js";

const F = "p-topological-ml-toolkit";
const H = (h) => { const n = parseInt(h.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(", ")})`; };
const T = (name, doc, meta, glsl, demo, uniforms) => ({ ...defineCut(name, F, doc, glsl, demo), suits: [F], ...meta, uniforms });

export const tmlSkyOvercast = T("tmlSkyOvercast", "painted overcast sky: three flat bands from horizon #c8d4e4 to #9aafc8, one cloud-bank stripe",
  { draws: "A pale grey-blue overcast sky in three flat bands with a soft-edged cloud bank near the horizon.", use: "plate", params: "uTmlSkySeed moves the cloud pattern; t steps the drift at 12 fps." },
  `uniform float uTmlSkySeed;
  vec3 tmlSkyOvercast(vec2 p, float t){
    float tf = floor(t * 12.0);
    float y = clamp(p.y, 0.0, 1.0);
    float band = y + (cFbm(vec2(p.x * 0.9 + uTmlSkySeed + tf * 0.004, y * 7.0)) - 0.5) * 0.16;
    vec3 hor = ${H("#c8d4e4")}, mid = ${H("#9aafc8")};
    vec3 c = mix(hor, mix(hor, mid, 0.5), cAA(band, 0.30));
    c = mix(c, mid, cAA(band, 0.58));
    float cloud = cAA(cFbm(vec2(p.x * 1.4 + uTmlSkySeed, y * 16.0) + 3.0), 0.60) * cAA(y, 0.25);
    return cCap(mix(c, mix(c, hor, 0.6), cloud));
  }`, "tmlSkyOvercast(p, t)", () => ({ uTmlSkySeed: { value: 0.0 } }));

export const tmlGlassTowers = T("tmlGlassTowers", "painted glass-tower card: hard horizontal glass bands, mullions, balcony rails, skyline against the overcast",
  { deps: ["cutKit", "tmlSkyOvercast"], draws: "A skyline of grey-blue glass towers, each a stack of lit and shaded glass bands cut by thin dark mullions.", use: "plate", params: "uTmlDepth 0 is the far low-contrast card and 1 the near card with rails; uTmlTowerSeed reshuffles the skyline." },
  `uniform float uTmlTowerSeed; uniform float uTmlDepth;
  vec3 tmlGlassTowers(vec2 p, float t){
    float d = clamp(uTmlDepth, 0.0, 1.0);
    float cx = p.x * mix(7.0, 4.0, d);
    float id = floor(cx), fx = fract(cx);
    float top = 0.34 + 0.46 * cH21(vec2(id, uTmlTowerSeed)) * mix(1.0, 0.8, d);
    float body = cFill(p.y - top) * (1.0 - cAA(abs(fx - 0.5), 0.47));
    float ry = p.y * mix(26.0, 14.0, d);
    float lit = cAA(cH21(vec2(id * 7.0 + floor(ry), uTmlTowerSeed + 1.0)), 0.55);
    vec3 c = mix(${H("#60708c")}, ${H("#7786a3")}, lit);
    float m = fract(cx * 4.0);
    c = mix(c, ${H("#3d4759")}, (1.0 - cAA(min(m, 1.0 - m), 0.06)) * 0.9);
    c = mix(c, ${H("#3d4759")}, 1.0 - cAA(fract(ry), 0.08));
    c = mix(c, ${H("#1c242f")}, (1.0 - cAA(fract(ry * 0.25), 0.05)) * cAA(d, 0.5));
    c = mix(c, ${H("#96a4c2")}, (1.0 - cAA(fx, 0.06)) * mix(0.35, 1.0, d));
    c = mix(${H("#1c242f")}, c, cAA(p.y, 0.10 + 0.05 * d));
    vec3 sky = tmlSkyOvercast(p, t);
    c = mix(c, ${H("#c8d4e4")}, (1.0 - d) * 0.35);
    return cCap(mix(sky, c, body));
  }`, "tmlGlassTowers(p, t)", () => ({ uTmlTowerSeed: { value: 3.0 }, uTmlDepth: { value: 0.5 } }));

export const tmlStreet = T("tmlStreet", "Academy City street: asphalt in three flat steps toward a horizon, dashed lane paint, edge lines",
  { deps: ["cutKit", "tmlSkyOvercast"], draws: "A dark asphalt street running away to the horizon in three flat steps, with dashed centre paint and two edge lines.", use: "surface", params: "uTmlHorizon is the screen height of the horizon; above it the overcast sky shows." },
  `uniform float uTmlHorizon;
  vec3 tmlStreet(vec2 p, float t){
    float hy = max(uTmlHorizon, 1e-3);
    float g = (hy - p.y) / hy;
    float z = 1.0 / (max(g, 0.0) + 0.06);
    float u = (p.x - 0.72) * z * 0.35;
    vec3 a = mix(${H("#3d4759")}, mix(${H("#3d4759")}, ${H("#1c242f")}, 0.5), cAA(g, 0.20));
    a = mix(a, ${H("#1c242f")}, cAA(g, 0.60));
    float dash = cAA(fract(z * 0.5), 0.5) * (1.0 - cAA(abs(u), 0.03));
    float edge = 1.0 - cAA(abs(abs(u) - 1.3), 0.025);
    a = mix(a, ${H("#96a4c2")}, max(dash, edge) * 0.9);
    return cCap(mix(tmlSkyOvercast(p, t), a, cAA(g, 0.0)));
  }`, "tmlStreet(p, t)", () => ({ uTmlHorizon: { value: 0.42 } }));

export const tmlRubbleShards = T("tmlRubbleShards", "six grey three-facet rubble shards that fly in from the left on one path and leave mirrored, spinning on twos",
  { deps: ["cutKit", "tmlStreet"], draws: "Six chunks of grey rubble, each cut into a pale, a mid and a dark facet, flying in from the left toward the seal.", use: "card", params: "uTmlRubbleFlight 0 to 1 is the flight; uTmlRubbleMirror 1 runs the same path back out; uTmlRubbleSeed reshuffles the six." },
  `uniform float uTmlRubbleSeed; uniform float uTmlRubbleFlight; uniform float uTmlRubbleMirror;
  float tmlRubbleCov(vec2 p, float t, out vec3 col){
    float tf = floor(t * 12.0);
    float cov = 0.0;
    col = ${H("#acacb2")};
    for (int j = 0; j < 6; j++) {
      float fj = float(j);
      float h0 = cH21(vec2(fj, uTmlRubbleSeed)), h1 = cH21(vec2(fj + 7.0, uTmlRubbleSeed + 1.3)), h2 = cH21(vec2(fj + 13.0, uTmlRubbleSeed + 2.9));
      vec2 a = vec2(-0.12 - 0.10 * h0, 0.28 + 0.34 * h1);
      vec2 b = vec2(0.62 + 0.06 * h2, 0.36 + 0.18 * h0);
      float f = clamp(uTmlRubbleFlight * 1.2 - 0.04 * fj, 0.0, 1.0);
      float fp = mix(f, 1.0 - f, uTmlRubbleMirror);
      float vis = step(0.001, f) * (1.0 - step(0.999, f));
      vec2 pos = mix(a, b, fp);
      pos.y += 0.06 * sin(3.14159 * fp) * (1.0 - 2.0 * uTmlRubbleMirror);
      float ang = tf * 1.047 * (0.6 + 0.8 * h1) + 6.283 * h2;
      vec2 q = p - pos;
      q = vec2(cos(ang) * q.x + sin(ang) * q.y, -sin(ang) * q.x + cos(ang) * q.y);
      float r = 0.035 + 0.02 * h2;
      float d = -1.0, tone = 0.0;
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        float ak = fk * 2.0944 + (cH21(vec2(fj + fk * 3.0, uTmlRubbleSeed + 5.0)) - 0.5) * 0.7;
        float dk = dot(q, vec2(cos(ak), sin(ak))) - r * (0.55 + 0.45 * cH21(vec2(fk + fj * 5.0, uTmlRubbleSeed + 8.0)));
        if (dk > d || k == 0) { d = dk; tone = fk; }
      }
      float sc = cFill(d) * vis;
      vec3 sh = mix(mix(${H("#d8d8db")}, ${H("#acacb2")}, step(0.5, tone)), ${H("#384150")}, step(1.5, tone));
      col = mix(col, sh, sc);
      cov = max(cov, sc);
    }
    return cov;
  }
  vec3 tmlRubbleShards(vec2 p, float t){
    vec3 col;
    float cov = tmlRubbleCov(p, t, col);
    return cCap(mix(tmlStreet(p, t), col, cov));
  }`, "tmlRubbleShards(p, t)", () => ({ uTmlRubbleSeed: { value: 2.0 }, uTmlRubbleFlight: { value: 0.5 }, uTmlRubbleMirror: { value: 0.0 } }));

export const tmlSealCoat = T("tmlSealCoat", "J.C.Staff animal seal: two-tone grey-blue back, pale flank and belly, muzzle pads with freckles, line thick in shadow",
  { draws: "A chubby blue-grey seal in two flat tones with a cream belly, pale flank, blue flipper tips, freckled muzzle pads and a thin warm line that thickens on the shadow side.", use: "surface", params: "uTmlCoatSeed moves the freckles." },
  `uniform float uTmlCoatSeed;
  float tmlSphereL(vec2 c){
    float z = sqrt(max(0.0, 0.22 - dot(c, c)));
    return 0.5 + 0.5 * dot(normalize(vec3(c, z + 1e-4)), normalize(vec3(-0.4, 0.8, 0.45)));
  }
  vec3 tmlSealCoat(vec2 p, float t){
    vec2 c = cN(p);
    float h = tmlSphereL(c);
    float lit = cAA(h, 0.56);
    vec3 sh = vec3(0.608, 0.541, 0.475);
    float be = length((c - vec2(0.0, -0.10)) / vec2(0.19, 0.27));
    vec3 col = mix(mix(${H("#515c66")}, ${H("#86aad6")}, lit), mix(${H("#d3e2f1")} * sh, ${H("#d3e2f1")}, lit), 1.0 - cAA(be, 1.25));
    col = mix(col, mix(${H("#f8eee0")} * sh, ${H("#f8eee0")}, lit), 1.0 - cAA(be, 0.9));
    for (int s = 0; s < 2; s++) {
      float sd = s == 0 ? -1.0 : 1.0;
      col = mix(col, ${H("#5a7aa8")}, cFill(length((c - vec2(0.30 * sd, -0.16)) / vec2(0.07, 0.035)) - 1.0));
      vec2 pad = vec2(0.04 * sd, 0.145);
      col = mix(col, mix(${H("#f0d9bd")} * sh, ${H("#f0d9bd")}, lit), cFill(length(c - pad) - 0.032));
      for (int k = 0; k < 3; k++) {
        vec2 f = pad + (cH22(vec2(float(k) + 3.0 * sd, uTmlCoatSeed)) - 0.5) * 0.04;
        col = mix(col, ${H("#76614f")}, cFill(length(c - f) - 0.004));
      }
    }
    col = mix(col, ${H("#2a2a30")}, cFill(length((c - vec2(0.0, 0.168)) / vec2(0.014, 0.010)) - 1.0));
    col = mix(col, ${H("#81786b")}, cLine(sqrt(dot(c, c)) - 0.469, mix(2.4, 1.0, h)));
    return cCap(col);
  }`, "mix(CUT_INK * 2.2, tmlSealCoat(p, t), cCover(p))", () => ({ uTmlCoatSeed: { value: 1.0 } }));

export const tmlStringHair = T("tmlStringHair", "Accelerator hair: five tiers of tapered white clumps (7, 5, 6, 5, 4) swept up and back, plus two long wisps",
  { deps: ["cutKit", "tmlSkyOvercast", "tmlSealCoat"], draws: "A tuft of stringy white hair on the seal's head: five tiers of sharp tapered clumps in three greys and two long loose wisps.", use: "surface", params: "uTmlHairSeed varies the clump angles and lengths." },
  `uniform float uTmlHairSeed;
  vec3 tmlStringHair(vec2 p, float t){
    vec3 col = mix(tmlSkyOvercast(p, t), tmlSealCoat(p, t), cCover(p));
    vec2 hc = vec2(0.72, 0.70);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float n = (i == 0) ? 7.0 : ((i == 1) ? 5.0 : ((i == 2) ? 6.0 : ((i == 3) ? 5.0 : 4.0)));
      for (int k = 0; k < 7; k++) {
        if (float(k) >= n) break;
        float fk = float(k);
        float h = cH21(vec2(fi * 11.0 + fk, uTmlHairSeed));
        float a = mix(0.30, 2.84, (fk + 0.5) / n) + 0.14 * (h - 0.5);
        vec2 dir = vec2(cos(a), sin(a));
        vec2 dv = normalize(dir + vec2(0.55, 0.50));
        vec2 q = p - (hc + dir * (0.150 - 0.018 * fi));
        float u = dot(q, dv), v = dot(q, vec2(-dv.y, dv.x));
        float len = 0.085 + 0.016 * fi + 0.03 * h;
        float d = max(abs(v) - (0.020 + 0.006 * h) * (1.0 - u / len), max(-u, u - len));
        vec3 cc = (i < 2) ? mix(${H("#8e97ae")}, ${H("#bfc3d2")}, fi) : mix(${H("#bfc3d2")}, ${H("#e4e6ee")}, cAA(v + 0.30 * u, 0.0));
        col = mix(col, cc, cFill(d));
        col = mix(col, ${H("#81786b")}, cLine(d, 1.2) * 0.55);
      }
    }
    for (int w = 0; w < 2; w++) {
      float fw = float(w);
      float a = 1.50 + 0.55 * fw;
      vec2 dir = vec2(cos(a), sin(a));
      vec2 dv = normalize(dir + vec2(0.70 + 0.20 * fw, 0.35));
      vec2 q = p - (hc + dir * 0.14);
      float u = dot(q, dv), v = dot(q, vec2(-dv.y, dv.x)) - 0.8 * u * u;
      float len = 0.20 - 0.03 * fw;
      float d = max(abs(v) - 0.007 * (1.0 - u / len), max(-u, u - len));
      col = mix(col, ${H("#e4e6ee")}, cFill(d));
      col = mix(col, ${H("#81786b")}, cLine(d, 1.1) * 0.5);
    }
    return cCap(col);
  }`, "tmlStringHair(p, t)", () => ({ uTmlHairSeed: { value: 4.0 } }));

export const tmlStareEye = T("tmlStareEye", "Accelerator eyes: heavy-lidded red iris at rest, pinpoint pupil and one catchlight at the stare, held on six drawings",
  { deps: ["cutKit", "tmlSealCoat"], draws: "Two narrow heavy-lidded red eyes on the seal's face; at the stare the pupils shrink to pinpoints and only one catchlight stays.", use: "surface", params: "uTmlStare 0 to 1 steps through six held drawings from rest to stare; uTmlBlink 1 closes the lids." },
  `uniform float uTmlStare; uniform float uTmlBlink;
  vec3 tmlStareEye(vec2 p, float t){
    vec3 col = tmlSealCoat(p, t);
    float s6 = floor(clamp(uTmlStare, 0.0, 1.0) * 6.0 + 0.5) / 6.0;
    for (int s = 0; s < 2; s++) {
      float sd = s == 0 ? -1.0 : 1.0;
      vec2 q = p - vec2(0.72 + 0.056 * sd, 0.70);
      float rx = 0.028, ry = 0.0315 * mix(1.0, 0.78, s6);
      float d = length(q / vec2(rx, ry)) - 1.0;
      float lidY = mix(ry * mix(0.25, 0.05, s6), -ry, clamp(uTmlBlink, 0.0, 1.0));
      float open = cFill(d) * (1.0 - cAA(q.y, lidY));
      float ri = ry * 0.78;
      float di = length(q - vec2(0.0, -0.002));
      vec3 iris = mix(${H("#c04048")}, ${H("#b0303a")}, s6);
      iris = mix(iris, iris * 0.62, cAA(di / ri, 0.78));
      col = mix(col, ${H("#e4e6ee")}, open);
      col = mix(col, iris, open * cFill(di - ri));
      col = mix(col, ${H("#2a2a30")}, open * cFill(di - ri * mix(0.50, 0.18, s6)));
      col = mix(col, ${H("#f5f5fa")}, open * cFill(length(q - vec2(-0.32, 0.34) * ri) - 0.26 * ri));
      col = mix(col, ${H("#f5f5fa")}, open * cFill(length(q - vec2(0.30, -0.30) * ri) - 0.11 * ri) * (1.0 - step(0.5, s6)));
      float lid = cLine(d, 2.4) * cAA(q.y, -0.2 * ry) + cLine(q.y - lidY, 2.0) * cFill(d + 0.02);
      col = mix(col, ${H("#3b3334")}, clamp(lid, 0.0, 1.0));
    }
    return cCap(col);
  }`, "tmlStareEye(p, t)", () => ({ uTmlStare: { value: 1.0 }, uTmlBlink: { value: 0.0 } }));

export const tmlGrinTeeth = T("tmlGrinTeeth", "mouth that closes from a wide toothy grin to a small w over four held drawings",
  { deps: ["cutKit", "tmlSealCoat"], draws: "A wide curved grin with a row of small white teeth on a dark mouth, or a small two-bowl w when closed.", use: "surface", params: "uTmlGrin 0 is the closed w, 1 the full grin; it steps through four held drawings." },
  `uniform float uTmlGrin;
  vec3 tmlGrinTeeth(vec2 p, float t){
    vec3 col = tmlSealCoat(p, t);
    float g4 = floor(clamp(uTmlGrin, 0.0, 1.0) * 4.0 + 0.5) / 4.0;
    vec2 q = p - vec2(0.72, 0.60);
    float w = 0.0;
    for (int s = 0; s < 2; s++) {
      float sd = s == 0 ? -1.0 : 1.0;
      w = max(w, cLine(abs(length(q - vec2(0.014 * sd, 0.012)) - 0.014), 1.6) * (1.0 - cAA(q.y, 0.012)));
    }
    col = mix(col, ${H("#3b3334")}, w * (1.0 - step(0.01, g4)));
    float hw = mix(0.016, 0.062, g4), depth = 0.04 * g4;
    float xr = clamp(q.x / hw, -1.0, 1.0);
    float yUp = 0.012 * xr * xr;
    float yLo = yUp - depth * (1.0 - xr * xr);
    float d = max(max(q.y - yUp, yLo - q.y), abs(q.x) - hw);
    float open = cFill(d) * step(0.01, g4);
    float row = cAA(q.y, yUp - 0.45 * depth * (1.0 - xr * xr));
    float tooth = cAA(abs(fract(q.x / (hw * 0.2857) + 0.5) - 0.5), 0.05);
    vec3 mouth = mix(${H("#2a1c22")}, mix(${H("#3b3334")}, ${H("#f5f5fa")}, tooth), row);
    col = mix(col, mouth, open);
    col = mix(col, ${H("#3b3334")}, cLine(d, 1.8) * step(0.01, g4));
    return cCap(col);
  }`, "tmlGrinTeeth(p, t)", () => ({ uTmlGrin: { value: 1.0 } }));

export const tmlOutfit = T("tmlOutfit", "Accelerator costume: white striped top with three rows of grey V chevrons, black choker with electrode and hanging cord",
  { deps: ["cutKit", "tmlSealCoat"], draws: "A white striped top on the seal's body with three grey V chevron rows, and a black choker with a small pale square and a cord hanging to the chest.", use: "surface", params: "none; the shade side follows the same key light as the seal coat." },
  `vec3 tmlOutfit(vec2 p, float t){
    vec3 col = tmlSealCoat(p, t);
    vec2 c = cN(p);
    float lit = cAA(tmlSphereL(c), 0.56);
    float top = cAA(0.095 - c.y, 0.0) * cAA(c.y, -0.30) * cCover(p);
    vec3 tc = mix(${H("#8e97ae")}, ${H("#e4e6ee")}, lit);
    for (int k = 0; k < 3; k++) {
      float v = (c.y - (0.02 - 0.08 * float(k))) + abs(c.x) * 0.9;
      tc = mix(tc, mix(${H("#b4b7bf")} * 0.8, ${H("#b4b7bf")}, lit), cLine(v, 2.2) * (1.0 - cAA(abs(c.x), 0.17)));
    }
    col = mix(col, tc, top);
    float band = cFill(abs(c.y - (0.105 - 0.35 * c.x * c.x)) - 0.016) * (1.0 - cAA(abs(c.x), 0.15));
    col = mix(col, ${H("#2a2a30")}, band);
    col = mix(col, ${H("#96a4c2")}, cFill(max(abs(c.x - 0.05), abs(c.y - 0.10)) - 0.009));
    col = mix(col, ${H("#2a2a30")}, cFill(max(abs(c.x) - 0.004, max(c.y - 0.09, -0.07 - c.y))));
    return cCap(col);
  }`, "tmlOutfit(p, t)", () => ({}));

export const tmlKakineSeal = T("tmlKakineSeal", "Kakine as a small costumed seal: blue-grey coat, white collar, swept light-brown hair with one brow lock, pale hard-stare eyes",
  { deps: ["cutKit", "tmlSkyOvercast", "tmlSealCoat"], draws: "A smaller blue-grey seal in a slate-blue coat with a white V collar, swept light-brown hair with one hanging lock, and pale flat-lidded eyes.", use: "surface", params: "uTmlKakineAt is where the small seal stands on screen; the seal is drawn at 0.8 of the hero." },
  `uniform vec2 uTmlKakineAt;
  vec3 tmlKakineSeal(vec2 p, float t){
    vec2 k = (p - uTmlKakineAt) / 0.8 + vec2(0.72, 0.50);
    vec2 c = cN(k);
    float lit = cAA(tmlSphereL(c), 0.56);
    vec3 col = tmlSealCoat(k, t);
    col = mix(col, mix(${H("#46567a")}, ${H("#5f7fa8")}, lit), cAA(0.095 - c.y, 0.0) * cAA(c.y, -0.30));
    col = mix(col, ${H("#f1f3f7")}, cFill(abs(c.y - 0.10 + abs(c.x) * 0.9) - 0.014) * (1.0 - cAA(abs(c.x), 0.12)));
    float line = c.y - (0.21 - 0.25 * c.x);
    float hair = cFill(length(c - vec2(0.0, 0.20)) - 0.18) * cAA(line, 0.0);
    vec3 hc = mix(${H("#c79a6a")}, ${H("#8a6440")}, 1.0 - cAA(line, 0.025));
    hc = mix(hc, ${H("#e9c99a")}, 1.0 - cAA(abs(c.y - (0.29 - 0.18 * c.x)), 0.01));
    col = mix(col, hc, hair);
    col = mix(col, ${H("#8a6440")}, cFill(length((c - vec2(-0.04, 0.18)) / vec2(0.012, 0.04)) - 1.0));
    for (int s = 0; s < 2; s++) {
      vec2 e = vec2(0.05 * (s == 0 ? -1.0 : 1.0), 0.17);
      float open = cFill(length((c - e) / vec2(0.022, 0.016)) - 1.0) * (1.0 - cAA(c.y - e.y, 0.003));
      col = mix(col, ${H("#e9e3d2")}, open);
      col = mix(col, ${H("#2a2a30")}, open * cFill(length(c - e - vec2(0.0, -0.002)) - 0.008));
      col = mix(col, ${H("#3b3334")}, cLine(c.y - e.y - 0.003, 1.6) * (1.0 - cAA(abs(c.x - e.x), 0.024)));
    }
    return cCap(mix(tmlSkyOvercast(p, t), col, cCover(k)));
  }`, "tmlKakineSeal(p, t)", () => ({ uTmlKakineAt: { value: new Vector2(0.17, 0.46) } }));

export const tmlReflectArrows = T("tmlReflectArrows", "18 flat arrows bursting from a centre, shrinking through zero on cos(pi k/12) and returning inward as white arrows",
  { deps: ["cutKit", "tmlSkyOvercast"], draws: "A star of eighteen flat red arrows bursting out from the seal; on the flip they shrink to nothing and come back as white arrows pointing inward with a faint halo.", use: "card", params: "uTmlArrowAt is the centre; uTmlArrowGrow counts arrows grown, one per frame; uTmlArrowFlip is s = cos(pi k/12), red while above 0 and white after; uTmlArrowFade is the exp(-t/0.4) fade; uTmlArrowEmit is the halo on the white arrows." },
  `uniform vec2 uTmlArrowAt; uniform float uTmlArrowGrow; uniform float uTmlArrowFlip; uniform float uTmlArrowFade; uniform float uTmlArrowEmit;
  float tmlArrowDist(vec2 p, out float inward){
    vec2 q = p - uTmlArrowAt;
    float s = clamp(uTmlArrowFlip, -1.0, 1.0);
    inward = step(s, 0.0);
    float sgn = s > 0.0 ? 1.0 : -1.0;
    float dmin = 1.0;
    for (int j = 0; j < 18; j++) {
      float fj = float(j);
      float a = 6.2831853 * fj / 18.0 + 0.1;
      vec2 dir = vec2(cos(a), sin(a));
      float L = 0.3333 + 0.0833 * sin(3.0 * fj);
      float len = abs(s) * L * clamp(uTmlArrowGrow - fj, 0.0, 1.0);
      float w = sgn * (dot(q, dir) - (s > 0.0 ? 0.1111 : 0.1111 + L));
      float v = dot(q, vec2(-dir.y, dir.x));
      float hl = max(min(0.055, 0.6 * len), 1e-3);
      float dS = max(abs(v) - 0.009, max(-w, w - (len - hl)));
      float dH = max(abs(v) - 0.03 * clamp((len - w) / hl, 0.0, 1.0), max(w - len, (len - hl) - w));
      dmin = min(dmin, mix(1.0, min(dS, dH), step(0.004, len)));
    }
    return dmin;
  }
  vec3 tmlReflectArrows(vec2 p, float t){
    float inw;
    float d = tmlArrowDist(p, inw);
    vec3 ac = mix(${H("#e5142e")}, ${H("#f5f5fa")}, inw);
    float halo = exp(-max(d, 0.0) * 22.0) * 0.22 * clamp(uTmlArrowEmit, 0.0, 1.0) * inw;
    vec3 plate = tmlSkyOvercast(p, t) + ${H("#f5f5fa")} * halo;
    return cCap(mix(plate, ac, cFill(d) * clamp(uTmlArrowFade, 0.0, 1.0)));
  }`, "tmlReflectArrows(p, t)", () => ({ uTmlArrowAt: { value: new Vector2(0.72, 0.46) }, uTmlArrowGrow: { value: 18 }, uTmlArrowFlip: { value: 1 }, uTmlArrowFade: { value: 1 }, uTmlArrowEmit: { value: 0 } }));

export const tmlGradeSplit = T("tmlGradeSplit", "last-pass grade: luma cap 0.92, split tone #202935 / #d8d5d6, grain on twos, ink floor lifted to #0b0e12",
  { deps: ["cutKit", "tmlGlassTowers"], draws: "The whole frame in cool shadows and warm-grey highlights, with faint stepped grain and no pure white or pure black.", use: "grade", params: "uTmlGradeMix is the split-tone strength (0.35); uTmlGrainAmp is the grain amplitude (0.02); t steps the grain at 12 fps." },
  `uniform float uTmlGradeMix; uniform float uTmlGrainAmp;
  vec3 tmlGrade(vec3 c, vec2 p, float t){
    c = c * min(1.0, 0.92 / max(cLuma(c), 1e-4));
    float Y = cLuma(c);
    float w = smoothstep(0.2, 0.8, Y);
    c *= mix(mix(vec3(1.0), ${H("#202935")}, uTmlGradeMix), mix(vec3(1.0), ${H("#d8d5d6")}, uTmlGradeMix), w);
    c += (cH21(gl_FragCoord.xy + floor(t * 12.0) * 7.31) - 0.5) * 2.0 * uTmlGrainAmp * (1.0 - Y);
    c = mix(${H("#0b0e12")}, c, smoothstep(0.035, 0.08, cLuma(c)));
    return cCap(c);
  }`, "tmlGrade(tmlGlassTowers(p, t), p, t)", () => ({ uTmlGradeMix: { value: 0.35 }, uTmlGrainAmp: { value: 0.02 } }));

export const CUT_SHADERS = [
  tmlSkyOvercast, tmlGlassTowers, tmlStreet, tmlRubbleShards,
  tmlSealCoat, tmlStringHair, tmlStareEye, tmlGrinTeeth, tmlOutfit, tmlKakineSeal,
  tmlReflectArrows, tmlGradeSplit,
];
export const CUT_SHADER_COUNT = 12;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-topological-ml-toolkit cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
