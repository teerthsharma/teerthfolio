// the-loop packet shaders: Misfit of Demon King Academy awakening, SILVER LINK. cel (skies, fissure floor, demon circle, magenta column, Magic Eye, Anos hair and jacket, impact plate, grade).
import { defineCut } from "../kit.glsl.js";

const F = "the-loop";
const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
const C = {
  zen: H("#171018"), inkf: H("#1a0e16"), hor: H("#3f130e"), flo: H("#1f090d"), floB: H("#2a0e12"),
  mdk: H("#af1d6a"), mbd: H("#d22aa2"), mln: H("#e955db"), core: H("#f6dcf5"),
  crd: H("#ad2032"), crm: H("#db202b"), crl: H("#ef5064"), lens: H("#641520"), hi: H("#f2e6e7"),
  crack: H("#de9cd2"), glow: H("#6b2a5a"), plateA: H("#a7b83a"), cream: H("#fbf8f2"), card: H("#eeebe5"),
  skyW: H("#e8dbe9"), skyW2: H("#ddcfe0"), cloudW: H("#efe4ef"),
  top: H("#7fb4e8"), blu: H("#cfe4f4"), cloud: H("#e4eef6"), snow: H("#eef2f7"), snowSh: H("#c9d6e4"), ice: H("#b9d4ea"),
  line: H("#5b4d4c"), lineD: H("#42322c"), belly: H("#f8eee0"),
  hair: H("#171018"), hairHi: H("#3a2a3e"), jkt: H("#2a1d2c"), btn: H("#3a2a3e"),
};

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const NUM = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

function T(name, { doc, draws, use, params, uni = {}, deps = [], body, demo }) {
  const m = defineCut(name, F, doc, `${NUM(uni)}\n${body}`, demo ?? `${name}(p, t)`);
  return { ...m, deps: ["cutKit", "loopKit", ...deps], draws, use, suits: F, params, uniforms: U(uni) };
}

export const loopKit = {
  name: "loopKit",
  family: F,
  doc: "the-loop helpers: centred frame-unit uv, 12 fps frame clock, seeded hash, ring, segment, box, Magic Eye emblem",
  deps: ["cutKit"],
  glsl: `uniform float uLpSeed;
uniform float uLpAsp;
vec2 lpU(vec2 p) { return (p - 0.5) * vec2(max(uLpAsp, 0.5), 1.0); }
float lpFrame(float t) { return floor(t * 12.0 + 1e-3) / 12.0; }
float lpH(vec2 p) { return cH21(p + uLpSeed * 0.137); }
float lpSq(float x) { return x * x; }
float lpSeg(vec2 p, vec2 a, vec2 b) { vec2 ab = b - a; float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - h * ab); }
float lpRing(float r, float r0) { return exp(-lpSq((r - r0) / 0.006)); }
float lpBox(vec2 q, vec2 c, vec2 h) { vec2 d = abs(q - c) - h; return max(d.x, d.y); }
float lpTri(vec2 q, float cx, float y0, float w, float hh) { return max(abs(q.x - cx) / w + (q.y - y0) / hh - 1.0, y0 - q.y); }
float lpWing(vec2 p, float fs) {
  float a = exp(-lpSq((length(p - vec2(fs * 0.05, 0.35)) - 0.62) / 0.03));
  return a * step(-0.45, p.y) * step(p.y, 0.15) * step(0.25, fs * p.x);
}
float lpEmblem(vec2 p) {
  vec2 q = vec2(p.x / 0.62, p.y);
  float rho = length(q);
  float e = exp(-lpSq((rho - 0.22) / 0.02)) + exp(-lpSq((rho - 0.38) / 0.02)) + exp(-lpSq((rho - 0.55) / 0.02));
  e += lpWing(p, -1.0) + lpWing(p, 1.0);
  float du = abs(p.y - 0.8), dl = abs(p.y + 0.8);
  e += step(abs(p.x), 0.12 - 0.6 * du) * step(du, 0.12) + step(abs(p.x), 0.12 - 0.6 * dl) * step(dl, 0.12);
  return cAA(clamp(e, 0.0, 1.0), 0.35);
}`,
  uniforms: U({ uLpSeed: 7, uLpAsp: 1.6 }),
  demo: `vec3 demo(vec2 p, float t) { return cCap(mix(CUT_INK, ${C.crm}, lpEmblem((lpU(p) - vec2(0.0, 0.0)) / 0.4))); }`,
};

export const loopCalmSky = T("loopCalmSky", {
  doc: "calm blue day plate with a low cloud band, snow bank and ice-loop arch, drained to plum fracture night in 12 stepped drawings",
  draws: "A flat three-band blue sky with one low cloud band, a snow bank and a pale ice arch on the horizon, which steps to a dark plum night.",
  use: "plate",
  params: "uLpSkDrain: 0 calm day to 1 plum night, quantised to 12 steps; uLpSkExit: 1 draws the snow bank and ice arch (B0 and B9), 0 hides them.",
  uni: { uLpSkDrain: 0.0, uLpSkExit: 1.0 },
  body: `vec3 loopCalmSky(vec2 p, float t) {
  vec2 u = lpU(p);
  float y = p.y;
  vec3 c = mix(mix(${C.blu}, mix(${C.blu}, ${C.top}, 0.5), cAA(y, 0.50)), ${C.top}, cAA(y, 0.72));
  float cx = u.x + 0.02 * lpFrame(t);
  float cl = 0.34 + 0.012 * sin(cx * 11.0 + uLpSeed) + 0.008 * sin(cx * 27.0);
  c = mix(c, ${C.cloud}, cFill(abs(y - cl) - 0.022));
  float bank = 0.27 + 0.03 * sin(u.x * 3.1 + 1.0) + 0.012 * sin(u.x * 8.3);
  vec3 sn = mix(${C.snowSh}, ${C.snow}, cAA(y, bank - 0.045));
  c = mix(c, sn, (1.0 - cAA(y, bank)) * uLpSkExit);
  vec2 a = u - vec2(-0.12, bank - 0.01);
  float arch = max(abs(length(a * vec2(1.0, 1.05)) - 0.20) - 0.028, -a.y);
  c = mix(c, ${C.ice}, cFill(arch) * uLpSkExit);
  c = mix(c, ${C.line}, cLine(arch, 1.6) * 0.8 * uLpSkExit);
  float k = floor(clamp(uLpSkDrain, 0.0, 1.0) * 12.0 + 1e-3) / 12.0;
  vec3 dr = mix(${C.hor}, ${C.zen}, y);
  c = mix(c, dr * (0.75 + 0.5 * cLuma(c)), k);
  return cCap(c);
}`,
});

export const loopFractureSky = T("loopFractureSky", {
  doc: "plum night sky of about 40 Voronoi cells whose edges light up pink as hairline cracks that grow on twos",
  draws: "A flat dark plum sky broken into cells by thin pale-pink cracks that spread outward cell by cell.",
  use: "plate",
  params: "uLpFxCrack: 0 to 1 crack growth, quantised to 12 steps; each cell lights after its own delay, and the crack widens with growth.",
  uni: { uLpFxCrack: 1.0 },
  body: `vec3 loopFractureSky(vec2 p, float t) {
  vec2 u = lpU(p);
  vec3 c = mix(mix(${C.hor}, mix(${C.hor}, ${C.zen}, 0.5), cAA(p.y, 0.35)), ${C.zen}, cAA(p.y, 0.65));
  vec2 g = u * 6.3 + vec2(uLpSeed, 0.0);
  vec2 ip = floor(g), fp = fract(g);
  float f1 = 9.0, f2 = 9.0;
  vec2 id1 = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      float d = length(o + cH22(ip + o) - fp);
      if (d < f1) { f2 = f1; f1 = d; id1 = ip + o; } else if (d < f2) { f2 = d; }
    }
  }
  float edge = f2 - f1;
  float k = floor(clamp(uLpFxCrack, 0.0, 1.0) * 12.0 + 1e-3) / 12.0;
  float on = step(lpH(id1 + 3.0) * 0.6, k);
  float w = 0.025 + 0.04 * k;
  c = mix(c, ${C.glow}, (1.0 - cAA(edge, w * 2.0)) * on * 0.55);
  c = mix(c, ${C.crack}, (1.0 - cAA(edge, w * 0.6)) * on);
  return cCap(c);
}`,
});

export const loopCastleSky = T("loopCastleSky", {
  doc: "sky-beat plate: pale white-pink sky, drawn crimson castle with lit windows on a cloud band, magenta shard ring around it",
  draws: "A pale sky with a tall crimson castle of towers, spires and red windows standing on a cloud, and a tilted ring of magenta shards around it.",
  use: "plate",
  params: "uLpCsRing: ring rotation in radians (step it on twos); the castle stands left of centre, 0.6 frame-heights wide.",
  uni: { uLpCsRing: 0.0 },
  body: `vec3 loopCastleSky(vec2 p, float t) {
  vec2 u = lpU(p);
  float y = p.y;
  vec3 c = mix(${C.skyW}, ${C.skyW2}, 1.0 - cAA(y, 0.55));
  float cl = 0.26 + 0.012 * sin(u.x * 9.0 + uLpSeed) + 0.006 * sin(u.x * 23.0);
  c = mix(c, ${C.cloudW}, 1.0 - cAA(y, cl));
  vec2 rc = vec2(-0.30, 0.52);
  float dB = 9.0, dF = 9.0;
  for (int k = 0; k < 36; k++) {
    float fk = float(k);
    float a = fk * 0.174533 + uLpCsRing;
    float rr = 0.62 + 0.04 * (lpH(vec2(fk, 2.0)) - 0.5);
    vec2 d = u - (rc + vec2(cos(a) * rr, sin(a) * rr * 0.30));
    float sz = 0.016 + 0.016 * lpH(vec2(fk, 5.0));
    float s = (abs(d.x) / (sz * 0.55) + abs(d.y) / sz - 1.0) * sz;
    if (sin(a) > 0.0) { dB = min(dB, s); } else { dF = min(dF, s); }
  }
  c = mix(c, ${C.mbd}, cFill(dB));
  c = mix(c, ${C.core}, cFill(dB) * (1.0 - cFill(dB + 0.004)));
  vec2 q = vec2(u.x, y);
  float cd = lpBox(q, vec2(-0.30, 0.40), vec2(0.22, 0.14));
  cd = min(cd, lpBox(q, vec2(-0.55, 0.52), vec2(0.035, 0.26)));
  cd = min(cd, lpTri(q, -0.55, 0.78, 0.045, 0.12) * 0.12);
  cd = min(cd, lpBox(q, vec2(-0.08, 0.50), vec2(0.03, 0.24)));
  cd = min(cd, lpTri(q, -0.08, 0.74, 0.04, 0.12) * 0.12);
  cd = min(cd, lpBox(q, vec2(-0.30, 0.60), vec2(0.05, 0.30)));
  cd = min(cd, lpTri(q, -0.30, 0.90, 0.06, 0.08) * 0.08);
  cd = min(cd, lpBox(q, vec2(-0.43, 0.50), vec2(0.03, 0.20)));
  cd = min(cd, lpBox(q, vec2(-0.17, 0.50), vec2(0.03, 0.20)));
  vec3 cs = mix(${C.crd} * 0.8, ${C.crd}, cAA(u.x, -0.30));
  vec2 wc = vec2(u.x * 28.0, y * 20.0);
  vec2 wf = fract(wc);
  float win = cFill(lpBox(wf, vec2(0.5), vec2(0.18, 0.26))) * step(0.45, lpH(floor(wc)));
  cs = mix(cs, ${C.crm}, win * 0.9);
  c = mix(c, cs, cFill(cd));
  c = mix(c, ${C.hor}, cLine(cd, 1.6) * 0.8);
  c = mix(c, ${C.mbd}, cFill(dF));
  c = mix(c, ${C.core}, cFill(dF) * (1.0 - cFill(dF + 0.004)));
  return cCap(c);
}`,
});

export const loopFissureFloor = T("loopFissureFloor", {
  doc: "dark crimson-brown floor split by 9 jagged radial fissures lit crimson from inside, recolourable to the snow of the loop exit",
  draws: "A dark red-brown ground seen at a slant with nine jagged cracks running out from the seal, each glowing red with a pink-red hot centre.",
  use: "surface",
  params: "uLpFlCx, uLpFlCy: crack origin under the seal; uLpFlReach: longest fissure length (grow it on twos from 0); uLpFlSnow: 0 dark floor, 1 snow floor.",
  uni: { uLpFlCx: 0.0, uLpFlCy: -0.18, uLpFlReach: 0.6, uLpFlSnow: 0.0 },
  body: `vec3 loopFissureFloor(vec2 p, float t) {
  vec2 d = lpU(p) - vec2(uLpFlCx, uLpFlCy);
  d.y *= 2.4;
  float r = length(d);
  float a = atan(d.y, d.x);
  float mott = cAA(cFbm(lpU(p) * 6.0 + uLpSeed), 0.62);
  vec3 c = mix(mix(${C.flo}, ${C.floB}, mott), mix(${C.snow}, ${C.snowSh}, mott), uLpFlSnow);
  float best = 9.0, core = 9.0;
  for (int k = 0; k < 9; k++) {
    float fk = float(k);
    float ak = fk * 0.698132 + lpH(vec2(fk, 1.0)) * 0.5;
    float reach = uLpFlReach * (0.55 + 0.45 * lpH(vec2(fk, 2.0)));
    float da = abs(mod(a - ak + 3.14159, 6.28318) - 3.14159);
    float perp = r * da + 0.012 * sin(r * 60.0 + fk * 3.1);
    float w = 0.020 * max(1.0 - r / max(reach, 1e-3), 0.0);
    if (r < reach) { best = min(best, perp - w); core = min(core, perp - w * 0.4); }
  }
  c = mix(c, ${C.crm}, cFill(best));
  c = mix(c, ${C.crl}, cFill(core));
  c = mix(c, ${C.inkf}, cLine(best, 1.4) * 0.7);
  return cCap(c);
}`,
});

export const loopDemonCircle = T("loopDemonCircle", {
  doc: "Maou Gakuin demon circle: 6 rings, 3-arch band, 6/2 hexagram, 12 diamond spokes, 48-block tick band, white core, 12 fps spin",
  draws: "A flat magenta magic circle of thin pink rings, a six-point star, twelve diamond spokes and a ring of block glyphs around a pale core, on plum.",
  use: "card",
  params: "uLpDcCx, uLpDcCy: centre; uLpDcR: full radius; uLpDcPop: size from the pop table 0.38, 0.68, 0.99, 1.0 (0 hides it); uLpDcSpin: rad/s, stepped at 12 fps; uLpDcHex and uLpDcSpoke: weights (1.0 and 0.4 for the 6-fold launch pad, 0.4 and 1.0 for the 12-fold stack); uLpDcTilt: vertical squash.",
  uni: { uLpDcCx: 0.0, uLpDcCy: 0.0, uLpDcR: 0.38, uLpDcPop: 1.0, uLpDcSpin: 0.22, uLpDcHex: 1.0, uLpDcSpoke: 0.4, uLpDcTilt: 1.0 },
  body: `vec2 lpCircle(vec2 p, float spin, float wh, float ws) {
  float a = atan(p.y, p.x) + spin, r = length(p);
  vec2 q = r * vec2(cos(a), sin(a));
  float v = lpRing(r, 0.40) + lpRing(r, 0.52) + lpRing(r, 0.75) + lpRing(r, 0.88) + lpRing(r, 0.93) + lpRing(r, 0.95);
  v += exp(-lpSq((r - 0.80 - 0.05 * abs(cos(3.0 * a))) / 0.006));
  float hd = 9.0;
  for (int k = 0; k < 6; k++) {
    float t0 = 6.2832 * float(k) / 6.0 - 1.5708, t1 = 6.2832 * float(k + 2) / 6.0 - 1.5708;
    hd = min(hd, lpSeg(q, 0.52 * vec2(cos(t0), sin(t0)), 0.52 * vec2(cos(t1), sin(t1))));
  }
  v += wh * exp(-lpSq(hd / 0.007));
  float sk = 6.2832 / 12.0, ak = mod(a + sk * 0.5, sk) - sk * 0.5;
  vec2 uv = r * vec2(cos(ak), sin(ak));
  float body = ws * step(abs(uv.x - 0.28) / 0.11 + abs(uv.y) / 0.035, 1.0);
  body += step(0.885, r) * step(r, 0.925) * step(0.2, cos(48.0 * a)) * step(-0.3, cos(144.0 * a));
  return vec2(clamp(v, 0.0, 1.0), clamp(body, 0.0, 1.0));
}
vec3 loopDemonCircle(vec2 p, float t) {
  vec2 q = (lpU(p) - vec2(uLpDcCx, uLpDcCy)) / max(uLpDcR * uLpDcPop, 1e-3);
  q.y /= max(uLpDcTilt, 0.1);
  float r = length(q);
  vec2 lb = lpCircle(q, uLpDcSpin * lpFrame(t), uLpDcHex, uLpDcSpoke);
  float on = step(0.01, uLpDcPop) * (1.0 - cAA(r, 1.02));
  vec3 c = ${C.zen};
  c = mix(c, ${C.mbd}, cAA(lb.y, 0.5) * on);
  c = mix(c, ${C.mln}, cAA(lb.x, 0.5) * on);
  c = mix(c, ${C.core}, (1.0 - cAA(r, 0.11)) * on);
  return cCap(c);
}`,
});

export const loopAuraColumn = T("loopAuraColumn", {
  doc: "three-band flat magenta aura column standing on the seal, widening upward, edge flicker on twos, spike at the peak",
  draws: "A tall column rising from one point: dark magenta outside, brighter magenta inside and a white-pink core, hard-edged, with a jittering outline.",
  use: "mask",
  params: "uLpAuCx: column axis; uLpAuBase: base height; uLpAuW0 and uLpAuW1: width at the base and at the top; uLpAuTop: column height; uLpAuSpike: extra width fraction at the peak (0.4 at 6.2 s).",
  uni: { uLpAuCx: 0.0, uLpAuBase: -0.2, uLpAuW0: 0.14, uLpAuW1: 0.24, uLpAuTop: 0.7, uLpAuSpike: 0.0 },
  body: `vec3 loopAuraColumn(vec2 p, float t) {
  vec2 u = lpU(p);
  float dy = u.y - uLpAuBase;
  float k = clamp(dy / max(uLpAuTop, 0.01), 0.0, 1.0);
  float w = mix(uLpAuW0, uLpAuW1, k) * (1.0 + uLpAuSpike);
  float fl = (lpH(vec2(floor(dy * 18.0), lpFrame(t) * 12.0)) - 0.5) * 0.16;
  float x = abs(u.x - uLpAuCx);
  float on = step(0.0, dy) * (1.0 - cAA(dy, uLpAuTop));
  vec3 c = ${C.zen};
  c = mix(c, ${C.mdk}, (1.0 - cAA(x, w * 0.5 * (1.0 + fl))) * on);
  c = mix(c, ${C.mbd}, (1.0 - cAA(x, w * 0.31 * (1.0 + fl * 0.7))) * on);
  c = mix(c, ${C.core}, (1.0 - cAA(x, w * 0.13)) * on);
  return cCap(c);
}`,
});

export const loopSpeckColumn = T("loopSpeckColumn", {
  doc: "about 200 hard 1 to 2 px dots in seven magenta and crimson colours pouring upward in a column, stepped at 12 fps",
  draws: "Small flat round dots in magenta, crimson and dark brown rising in a column, thinning toward the top, with a few pale-pink ones.",
  use: "noise",
  params: "uLpSpCx: column axis; uLpSpBase: start height; uLpSpR: column radius; uLpSpTop: column height; uLpSpRise: rise speed in cells per second (14 m/s is about 168).",
  uni: { uLpSpCx: 0.0, uLpSpBase: -0.2, uLpSpR: 0.2, uLpSpTop: 0.7, uLpSpRise: 168.0 },
  body: `vec3 loopSpeckColumn(vec2 p, float t) {
  vec2 u = lpU(p);
  vec2 g = vec2((u.x - uLpSpCx) / max(uLpSpR, 1e-3) * 10.0, (u.y - uLpSpBase) * 14.0 - lpFrame(t) * uLpSpRise / 12.0);
  vec2 id = floor(g), fc = fract(g);
  float k = clamp((u.y - uLpSpBase) / max(uLpSpTop, 0.01), 0.0, 1.0);
  float inCol = step(abs(g.x), 10.0) * step(0.0, u.y - uLpSpBase) * step(u.y - uLpSpBase, uLpSpTop);
  float on = step(0.62, lpH(id)) * step(lpH(id + 29.0), 1.0 - k) * inCol;
  vec2 pos = vec2(0.2 + 0.6 * lpH(id + 7.0), 0.2 + 0.6 * lpH(id + 13.0));
  float rad = (1.0 + lpH(id + 3.0)) / 800.0;
  float m = cFill(length((fc - pos) * vec2(uLpSpR / 10.0, 1.0 / 14.0)) - rad) * on;
  float i = floor(lpH(id + 21.0) * 7.0);
  vec3 col = ${C.mdk};
  if (i > 0.5) col = ${C.mbd};
  if (i > 1.5) col = ${C.mln};
  if (i > 2.5) col = ${C.crd};
  if (i > 3.5) col = ${C.crm};
  if (i > 4.5) col = ${C.crl};
  if (i > 5.5) col = ${C.flo};
  col = mix(col, ${C.core}, step(0.9, lpH(id + 41.0)));
  return cCap(mix(${C.zen}, col, m));
}`,
});

export const loopShardSphere = T("loopShardSphere", {
  doc: "60 flat magenta facets gathered into a ball, a thin pale edge between facets, hard two-step lighting, spin on twos",
  draws: "A ball made of sixty flat pink-magenta facets with thin pale seams, lit from the upper left, turning in steps.",
  use: "surface",
  params: "uLpSsCx, uLpSsCy: centre; uLpSsR: radius (2.2 m); uLpSsSpin: rad/s (0.6), stepped at 12 fps.",
  uni: { uLpSsCx: 0.0, uLpSsCy: 0.0, uLpSsR: 0.26, uLpSsSpin: 0.6 },
  body: `vec3 loopShardSphere(vec2 p, float t) {
  vec2 q = (lpU(p) - vec2(uLpSsCx, uLpSsCy)) / max(uLpSsR, 1e-3);
  float rr = dot(q, q);
  vec3 n = vec3(q, sqrt(max(1.0 - rr, 0.0)));
  float sp = uLpSsSpin * lpFrame(t);
  vec3 m = vec3(cos(sp) * n.x + sin(sp) * n.z, n.y, -sin(sp) * n.x + cos(sp) * n.z);
  vec2 g = vec2((atan(m.x, m.z) / 6.28318 + 0.5) * 10.0, (asin(clamp(m.y, -1.0, 1.0)) / 3.14159 + 0.5) * 6.0);
  vec2 id = floor(g), fc = fract(g);
  vec3 f = mix(${C.mbd}, ${C.mln}, step(0.55, lpH(id)));
  f = mix(f * 0.8, f, cAA(dot(n, normalize(vec3(-0.45, 0.55, 0.7))) * 0.5 + 0.5, 0.45));
  float e = 1.0 - smoothstep(0.045, 0.07, min(min(fc.x, 1.0 - fc.x), min(fc.y, 1.0 - fc.y)));
  f = mix(f, ${C.core}, e);
  return cCap(mix(${C.zen}, f, cFill(length(q) - 1.0)));
}`,
});

export const loopDestructionEye = T("loopDestructionEye", {
  doc: "seal eye as Anos: dark red lens, two pale highlights, heavy upper lid, and the red Destruction Eye emblem of 3 nested ovals, 2 wing arcs and 2 triangles",
  draws: "One large dark-red eye with two white highlights and a half-closed lid; when lit, a red emblem of nested ovals, curved wings and two small triangles glows in the lens.",
  use: "surface",
  params: "uLpEyCx, uLpEyCy: eye centre; uLpEyR: lens radius; uLpEyEmblem: 0 calm, 1 emblem lit; uLpEyLid: 0 shut to 1 open, 0.45 calm and 0.7 in power beats (open fraction).",
  uni: { uLpEyCx: 0.0, uLpEyCy: 0.0, uLpEyR: 0.12, uLpEyEmblem: 1.0, uLpEyLid: 0.45 },
  body: `vec3 loopDestructionEye(vec2 p, float t) {
  vec2 q = (lpU(p) - vec2(uLpEyCx, uLpEyCy)) / max(uLpEyR, 1e-3);
  vec3 skin = ${C.belly} * 0.86;
  float lens = length(q * vec2(0.85, 1.0)) - 1.0;
  float inL = cFill(lens);
  vec3 c = mix(skin, ${C.lens}, inL);
  c = mix(c, ${C.crm}, lpEmblem(q) * uLpEyEmblem * inL);
  c = mix(c, ${C.hi}, cFill(length(q - vec2(-0.35, 0.42)) - 0.17) * inL);
  c = mix(c, ${C.hi}, cFill(length(q - vec2(0.30, -0.30)) - 0.06) * inL);
  float lidY = 1.0 - 2.0 * clamp(uLpEyLid, 0.0, 1.0);
  c = mix(c, skin, cAA(q.y, lidY) * inL);
  c = mix(c, ${C.line}, cLine(q.y - lidY, 3.0) * inL);
  c = mix(c, ${C.line}, cLine(lens, 2.0) * 0.8);
  return cCap(c);
}`,
});

export const loopHairSwept = T("loopHairSwept", {
  doc: "Anos hair on the seal: flat black dome with tapered hanging clumps, a swept forelock over the brow, one hard highlight cut",
  draws: "A flat black cap of hair on a pale round head, its lower edge cut into pointed clumps, one long lock swept across the brow, and a single dusky-purple highlight stripe.",
  use: "surface",
  params: "uLpHrCx, uLpHrCy: head centre; uLpHrR: head radius; the forelock falls to the viewer's left.",
  uni: { uLpHrCx: 0.0, uLpHrCy: 0.0, uLpHrR: 0.3 },
  body: `vec3 loopHairSwept(vec2 p, float t) {
  vec2 q = (lpU(p) - vec2(uLpHrCx, uLpHrCy)) / max(uLpHrR, 1e-3);
  float head = length(q) - 1.0;
  float yEdge = 0.36 - 0.30 * fract(q.x * 2.6 + 0.15);
  float dome = max(head, yEdge - q.y);
  float lock = max(max(length(q - vec2(-0.05, 0.35)) - 0.62, -(length(q - vec2(0.22, 0.55)) - 0.70)), max(q.y - 0.40, max(-0.25 - q.y, q.x - 0.25)));
  float hair = min(dome, lock);
  vec3 c = mix(${C.zen}, ${C.belly} * 0.86, cFill(head));
  vec3 hc = mix(${C.hair}, ${C.hairHi}, step(abs(q.x * 0.8 + q.y * 0.6 - 0.42), 0.06) * step(0.35, q.y));
  c = mix(c, hc, cFill(hair));
  c = mix(c, ${C.lineD}, cLine(hair, 2.0) * 0.9);
  return cCap(c);
}`,
});

export const loopJacket = T("loopJacket", {
  doc: "dark academy jacket in three flat bands with a stand collar, thin crimson trim at its top edge and a plum button row",
  draws: "A dark plum-black jacket with a high stand collar edged by a thin crimson line and four plum buttons down the front, in three flat shades.",
  use: "surface",
  params: "uLpJkCx, uLpJkCy: neck centre; uLpJkR: head-scale radius; jacket lit #2a1d2c, shade x0.86, deep x0.66.",
  uni: { uLpJkCx: 0.0, uLpJkCy: -0.2, uLpJkR: 0.3 },
  body: `vec3 loopJacket(vec2 p, float t) {
  vec2 q = (lpU(p) - vec2(uLpJkCx, uLpJkCy)) / max(uLpJkR, 1e-3);
  float body = length((q - vec2(0.0, -1.15)) / vec2(1.25, 1.0)) - 1.0;
  float nx = clamp(q.x / 1.25, -1.0, 1.0);
  float ndl = dot(vec3(nx, 0.0, sqrt(1.0 - nx * nx)), normalize(vec3(-0.5, 0.7, 0.6))) * 0.5 + 0.5;
  vec3 c = cCel3(ndl, 0.35, 0.62, ${C.jkt} * 0.66, ${C.jkt} * 0.86, ${C.jkt});
  float collar = max(lpBox(q, vec2(0.0, -0.20), vec2(0.62, 0.15)), -(length(q) - 0.45));
  vec3 o = mix(${C.zen}, c, cFill(body));
  o = mix(o, ${C.belly} * 0.86, cFill(length(q) - 0.45) * cFill(body));
  o = mix(o, ${C.jkt} * 0.95, cFill(collar));
  float trim = cFill(lpBox(q, vec2(0.0, -0.05), vec2(0.62, 0.02))) * (1.0 - cFill(length(q) - 0.45));
  o = mix(o, ${C.crd}, trim);
  o = mix(o, ${C.lineD}, cLine(body, 1.6) * 0.8);
  o = mix(o, ${C.hairHi}, cFill(lpBox(q, vec2(0.0, -0.75), vec2(0.008, 0.55))) * cFill(body) * 0.8);
  for (int k = 0; k < 4; k++) {
    float by = -0.5 - 0.22 * float(k);
    o = mix(o, ${C.btn}, cFill(length(q - vec2(0.07, by)) - 0.045));
  }
  return cCap(o);
}`,
});

export const loopImpactPlate = T("loopImpactPlate", {
  doc: "impact frame as a flat plate: seal as one ink shape with a black fringe, eyes dark or lit red, yellow-green plate (A) or cream plate with ink rings (B)",
  draws: "A flat full-frame colour with the seal as a single dark shape; in the first version a yellow-green plate, in the second a cream plate with dark ellipse rings around the seal.",
  use: "plate",
  params: "uLpImCx, uLpImCy: seal centre; uLpImR: seal height; uLpImEyes: 0 dark eyes, 1 red emblem eyes; uLpImNeg: 0 yellow-green plate, 1 cream plate with 4 ink rings.",
  uni: { uLpImCx: 0.0, uLpImCy: 0.0, uLpImR: 0.3, uLpImEyes: 0.0, uLpImNeg: 0.0 },
  body: `vec3 loopImpactPlate(vec2 p, float t) {
  vec2 q = (lpU(p) - vec2(uLpImCx, uLpImCy)) / max(uLpImR, 1e-3);
  float body = length((q - vec2(0.0, -0.55)) / vec2(0.85, 1.0)) - 1.0;
  float head = length((q - vec2(0.0, 0.55)) / vec2(0.9, 0.85)) - 1.0;
  float yEdge = 0.68 - 0.20 * fract(q.x * 3.0 + 0.5);
  float sil = min(body, min(head, max(length(q - vec2(0.0, 0.6)) - 0.95, yEdge - q.y)));
  vec3 c = mix(${C.plateA}, ${C.cream}, uLpImNeg);
  float rings = 0.0;
  for (int k = 0; k < 4; k++) {
    float rr = 1.15 + 0.7 * float(k) + 0.1 * float(k * k);
    rings = max(rings, cLine(length((q - vec2(0.0, -0.9)) / vec2(1.0, 0.35)) - rr, 2.2));
  }
  c = mix(c, ${C.inkf}, rings * uLpImNeg);
  c = mix(c, ${C.inkf}, cFill(sil));
  vec2 e1 = (q - vec2(-0.38, 0.48)) / 0.2, e2 = (q - vec2(0.38, 0.48)) / 0.2;
  float lensM = max(cFill(length(e1) - 1.0), cFill(length(e2) - 1.0));
  c = mix(c, ${C.lens}, lensM * uLpImEyes);
  c = mix(c, ${C.crm}, max(lpEmblem(e1), lpEmblem(e2)) * lensM * uLpImEyes);
  return cCap(c);
}`,
});

export const loopGrade = T("loopGrade", {
  doc: "Misfit grade: plum and pink-white split tone in power beats, luma cap 0.92, ink-floor lift, 2.39:1 ink letterbox that slides in",
  draws: "The finished picture with plum shadows, pink-white highlights, nothing brighter than 0.92 or darker than the studio ink, and dark cinema bars top and bottom.",
  use: "grade",
  params: "uLpGrSplit: split-tone strength (0.35 in power beats f26 to f145, 0 elsewhere); uLpGrBar: bar slide 0 to 1 (full by f11).",
  uni: { uLpGrSplit: 0.35, uLpGrBar: 1.0 },
  deps: ["loopAuraColumn"],
  demo: "loopGrade(loopAuraColumn(p, t), p)",
  body: `vec3 loopGrade(vec3 col, vec2 p) {
  float y = cLuma(col);
  vec3 ts = ${C.zen} / cLuma(${C.zen}), th = vec3(0.9922, 0.9059, 0.9922) / cLuma(vec3(0.9922, 0.9059, 0.9922));
  float w = smoothstep(0.2, 0.8, y);
  col *= mix(mix(vec3(1.0), ts, uLpGrSplit), mix(vec3(1.0), th, uLpGrSplit), w);
  col = cCap(col);
  col = mix(${C.inkf}, col, smoothstep(0.035, 0.08, cLuma(col)));
  float tgt = 0.5 - min(uLpAsp / 2.39, 1.0) * 0.5;
  float bar = step(0.5 - tgt * clamp(uLpGrBar, 0.0, 1.0), abs(p.y - 0.5));
  return mix(col, ${C.inkf}, bar);
}`,
});

export const loopCreditCard = T("loopCreditCard", {
  doc: "cream credit card with ink border and crimson rule that lands on twos in the lower left of the calm sky",
  draws: "A flat cream card with a thin dark border, a red rule across its top and three dark text lines, dropping in two steps onto a blue sky.",
  use: "card",
  params: "uLpCdT0: time the card starts to land; the card sits lower left and appears in 2 drawings (halfway, then landed).",
  uni: { uLpCdT0: 17.6667 },
  deps: ["loopCalmSky"],
  body: `vec3 loopCreditCard(vec2 p, float t) {
  vec2 u = lpU(p);
  float k = floor((t - uLpCdT0) * 6.0 + 1e-3);
  float off = (1.0 - step(0.5, k)) * 0.22;
  vec2 q = u - vec2(-0.45, -0.24 + off);
  float d = lpBox(q, vec2(0.0), vec2(0.28, 0.13));
  float on = step(-0.5, k);
  vec3 c = loopCalmSky(p, t);
  c = mix(c, ${C.card}, cFill(d) * on);
  c = mix(c, ${C.inkf}, cLine(d, 1.8) * on);
  c = mix(c, ${C.crm}, cFill(lpBox(q, vec2(0.0, 0.10), vec2(0.28, 0.012))) * on);
  c = mix(c, ${C.inkf}, cFill(lpBox(q, vec2(-0.05, 0.03), vec2(0.20, 0.010))) * on);
  c = mix(c, ${C.inkf}, cFill(lpBox(q, vec2(-0.09, -0.03), vec2(0.16, 0.010))) * on);
  c = mix(c, ${C.inkf}, cFill(lpBox(q, vec2(-0.02, -0.09), vec2(0.23, 0.010))) * on);
  return cCap(c);
}`,
});

export const CUT_SHADERS = [
  loopKit, loopCalmSky, loopFractureSky, loopCastleSky, loopFissureFloor, loopDemonCircle, loopAuraColumn, loopSpeckColumn,
  loopShardSphere, loopDestructionEye, loopHairSwept, loopJacket, loopImpactPlate, loopGrade, loopCreditCard,
];
export const CUT_SHADER_COUNT = 15;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`the-loop cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
