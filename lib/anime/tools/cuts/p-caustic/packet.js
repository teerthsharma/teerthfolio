// p-caustic packet shaders: Jujutsu Kaisen S2 (MAPPA) Sukuna-seal sky, red/cyan two-ink print (sky, rubble, key/fill, face, cut, split, grade).
import { defineCut } from "../kit.glsl.js";

const F = "p-caustic";
const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
const C = { ink: H("#140a0c"), field: H("#070506"), body: H("#3b0b11"), core: H("#2d0e0d"), rimLo: H("#930f20"), rimHi: H("#d3565a"), redL: H("#5c2221"), redLit: H("#993b3c"),
  cyanP: H("#1d2530"), cyanRim: H("#5fd0e6"), cut: H("#f2e6e0"), blood: H("#e5142e"), cyanHi: H("#9fe3f0"), split: H("#758eb2"), back: H("#86aad6"), belly: H("#f8eee0"),
  frk: H("#76614f"), hair: H("#d47a96"), jacket: H("#26111c"), button: H("#c9a24a"), eye: H("#d41c24") };

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const NUM = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

function T(name, { doc, draws, use, params, uni = {}, deps = [], body, demo }) {
  const m = defineCut(name, F, doc, `${NUM(uni)}\n${body}`, demo);
  return { ...m, deps: ["cutKit", "cauKit", ...deps], draws, use, suits: F, params, uniforms: U(uni) };
}

const KIT_UNI = { uCauSeed: 3, uCauEyeX: 0.88, uCauEyeY: 0.36, uCauFaceS: 0.085, uCauCutT: 8.0 };

export const cauKit = {
  name: "cauKit",
  family: F,
  doc: "p-caustic helpers: ink and blood palette, y-down frame units, 12 fps holds, seeded hash, face-local coordinates",
  deps: ["cutKit"],
  glsl: `${NUM(KIT_UNI)}
const vec3 CAU_INK = ${C.ink};
const vec3 CAU_FIELD = ${C.field};
const vec3 CAU_BLOOD = ${C.blood};
const vec3 CAU_CORE = ${C.cut};
const vec3 CAU_CYAN = ${C.cyanRim};
const vec2 CAU_A1 = vec2(0.10, 0.25);
const vec2 CAU_B1 = vec2(2.30, 0.72);
vec2 cauFrame(vec2 p) { return vec2(p.x, 1.0 - p.y); }
float cauHold(float t, float n) { return floor(t * 12.0 / n + 1e-4) * n / 12.0; }
float cauH(float a, float b) { return cH21(vec2(a, b) + uCauSeed * 0.137); }
float cauSmin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float cauSegD(vec2 p, vec2 a, vec2 b, out float s) { vec2 ab = b - a; s = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * s); }
float cauEaseOut3(float x) { float u = 1.0 - clamp(x, 0.0, 1.0); return 1.0 - u * u * u; }
vec2 cauFace(vec2 p) { vec2 f = cauFrame(p); return vec2(f.x - uCauEyeX, uCauEyeY - f.y) / uCauFaceS; }
float cauStroke(vec2 q, vec2 a, vec2 b, float w) { float s; return cFill(cauSegD(q, a, b, s) - w); }
vec3 cauOn(vec4 s, vec3 bg) { return mix(bg, s.rgb, s.a); }
vec3 cauOver(vec4 s) { return cauOn(s, vec3(0.14, 0.09, 0.11)); }`,
  uniforms: U(KIT_UNI),
  demo: `vec3 demo(vec2 p, float t) { return cCap(mix(CAU_INK, CAU_BLOOD * 0.6, cAA(cauH(floor(p.x * 12.0), floor(p.y * 12.0)), 0.5))); }`,
};

export const cauCloudMass = T("cauCloudMass", {
  doc: "nine metaball storm clouds on the #070506 field, body #3b0b11, shade core #2d0e0d, rim #930f20 to #d3565a on the key side only",
  draws: "Hard-edged maroon storm clouds on a near-black sky, each lit by a thin red rim on its upper-left edge only, drifting right in half-second steps.",
  use: "plate",
  params: "uCauFade: 0 shows only the black field, 1 the full clouds (drive over f12 to f35); drift is 0.01 H per second on 6-frame holds.",
  uni: { uCauFade: 1 },
  body: `float cauCloudD(vec2 f) {
  float d = length(f - vec2(0.15, 0.30)) - 0.22;
  d = cauSmin(d, length(f - vec2(0.40, 0.22)) - 0.30, 0.06);
  d = cauSmin(d, length(f - vec2(0.62, 0.35)) - 0.26, 0.06);
  d = cauSmin(d, length(f - vec2(0.85, 0.25)) - 0.34, 0.06);
  d = cauSmin(d, length(f - vec2(1.10, 0.40)) - 0.28, 0.06);
  d = cauSmin(d, length(f - vec2(1.30, 0.28)) - 0.24, 0.06);
  d = cauSmin(d, length(f - vec2(0.30, 0.55)) - 0.20, 0.06);
  d = cauSmin(d, length(f - vec2(0.75, 0.58)) - 0.22, 0.06);
  return cauSmin(d, length(f - vec2(1.20, 0.60)) - 0.20, 0.06);
}
vec3 cauCloudMass(vec2 p, float t) {
  vec2 f = cauFrame(p);
  f.x -= 0.01 * cauHold(t, 6.0);
  float d = cauCloudD(f);
  float e = 0.004;
  vec2 g = vec2(cauCloudD(f + vec2(e, 0.0)) - d, cauCloudD(f + vec2(0.0, e)) - d) / e;
  vec2 n = g / max(length(g), 1e-4);
  float face = dot(n, vec2(-0.768, -0.640));
  float rim = exp(-pow((d + 0.004) / 0.012, 2.0)) * smoothstep(0.15, 0.55, face);
  vec3 c = mix(${C.body}, ${C.core}, cAA(-d, 0.05));
  c = mix(c, ${C.rimLo}, cAA(rim, 0.25));
  c = mix(c, ${C.rimHi}, cAA(rim, 0.70));
  return mix(CAU_FIELD, mix(CAU_FIELD, c, cFill(d)), uCauFade);
}`,
  demo: "cauCloudMass(p, t)",
});

export const cauHorizonGlow = T("cauHorizonGlow", {
  doc: "low red storm glow #930f20 held to the lower third (y 0.62 to 0.80 H), three flat steps broken by noise so it is not a wash",
  draws: "A dull red glow low on the horizon in three hard steps, uneven along its length, fading out before the ground line.",
  use: "plate",
  params: "uCauGlowY: height of the glow centre in frame units (0.785); uCauGlowAmt: strength of the red against the black field.",
  uni: { uCauGlowY: 0.785, uCauGlowAmt: 0.85 },
  body: `vec3 cauHorizonGlow(vec2 p, float t) {
  vec2 f = cauFrame(p);
  float wob = 0.55 + 0.9 * cFbm(vec2(f.x * 2.2 + uCauSeed, 3.0));
  float g = exp(-pow((f.y - uCauGlowY) / 0.07, 2.0)) * wob * smoothstep(0.60, 0.66, f.y) * (1.0 - smoothstep(0.80, 0.83, f.y));
  float lv = (cAA(g, 0.20) + cAA(g, 0.45) + cAA(g, 0.70)) / 3.0;
  return mix(CAU_FIELD, ${C.rimLo}, lv * uCauGlowAmt);
}`,
  demo: "cauHorizonGlow(p, t)",
});

export const cauRubbleStrip = T("cauRubbleStrip", {
  doc: "Shibuya rubble strip: ink ground line at 0.80 H, five ruined slab skeletons with broken floors and rebar, red-lit tops, cyan-lit right faces, footing mound under the seal",
  draws: "A jagged black strip of ruined office blocks with open floors and thin rebar spikes, red along the tops, cold blue-grey along the right edges, with a low mound where the seal stands.",
  use: "plate",
  params: "uCauSealX: x of the seal footing in frame units; uCauMoundW and uCauMoundH: mound half-width and height. Returns rgb and coverage.",
  uni: { uCauSealX: 0.80, uCauMoundW: 0.30, uCauMoundH: 0.03 },
  body: `const float CAU_BX[5] = float[5](0.18, 0.42, 0.66, 0.90, 1.18);
const float CAU_BH[5] = float[5](0.16, 0.22, 0.12, 0.19, 0.10);
const float CAU_BW[5] = float[5](0.060, 0.080, 0.055, 0.070, 0.065);
float cauGroundY(float x) {
  float j = 0.012 * (cauH(floor(x * 45.0), 7.0) - 0.5);
  float m = uCauMoundH * max(0.0, 1.0 - pow(abs(x - uCauSealX) / uCauMoundW, 2.0));
  return 0.80 + j - m;
}
float cauRubSolid(vec2 f) {
  float s = step(cauGroundY(f.x), f.y);
  float h = 0.80 - f.y;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float dx = f.x - CAU_BX[i];
    float inx = step(abs(dx), CAU_BW[i]);
    float col = floor((dx + CAU_BW[i]) / 0.014);
    float top = CAU_BH[i] * (0.55 + 0.45 * cauH(col, fi + 11.0));
    float row = floor(h / 0.036);
    float fr = fract(h / 0.036);
    float hole = step(0.25, fr) * step(fr, 0.82) * step(0.35, cauH(floor(col / 3.0) + row * 7.0, fi + 3.0)) * step(0.036, h);
    float slab = inx * step(0.0, h) * step(h, top) * (1.0 - hole);
    float cc = -CAU_BW[i] + (col + 0.5) * 0.014;
    float spike = inx * step(0.45, cauH(col, fi + 23.0)) * step(abs(dx - cc), 0.0016) * step(top, h) * step(h, top + 0.035);
    s = max(s, max(slab, spike));
  }
  return s;
}
float cauRubA(vec2 f) {
  vec2 e = fwidth(f) * 0.35;
  return 0.25 * (cauRubSolid(f + e) + cauRubSolid(f - e) + cauRubSolid(f + vec2(e.x, -e.y)) + cauRubSolid(f + vec2(-e.x, e.y)));
}
vec4 cauRubbleStrip(vec2 p, float t) {
  vec2 f = cauFrame(p);
  float a = cauRubA(f);
  float up = cauRubSolid(f + vec2(0.0, -0.006));
  float up2 = cauRubSolid(f + vec2(0.0, -0.0025));
  float rt = cauRubSolid(f + vec2(0.006, 0.0));
  vec3 c = CAU_INK;
  c = mix(c, ${C.cyanP}, (1.0 - rt) * up);
  c = mix(c, ${C.redL}, 1.0 - up);
  c = mix(c, ${C.redLit}, 1.0 - up2);
  return vec4(c, a);
}`,
  demo: "cauOver(cauRubbleStrip(p, t))",
});

export const cauKeyFill = T("cauKeyFill", {
  doc: "red key and cyan fill cel on a surface normal: threshold N.L 0.12, two bands plus ink, hard cyan #5fd0e6 rim on the shade side",
  draws: "A rounded shape split by one hard edge: red-washed on the upper-left, cold blue on the lower-right, a darker ink-toned patch between, and a thin bright cyan line along the shaded rim.",
  use: "surface",
  params: "base: the flat albedo going in; n: view-space normal with z toward the viewer; rimW: rim width as a fraction of grazing angle (0.14). No uniforms.",
  body: `const vec3 CAU_KEYL = vec3(-0.6092, 0.5077, 0.6092);
const vec3 CAU_FILL = vec3(0.8427, -0.2408, 0.4815);
vec3 cauKeyFill(vec3 base, vec3 n, float rimW) {
  float kl = cAA(dot(n, CAU_KEYL), 0.12);
  float fl = cAA(dot(n, CAU_FILL), 0.12);
  vec3 sh = base * vec3(0.72, 0.73, 0.75);
  vec3 lit = base * vec3(1.0, 0.55, 0.55) + vec3(0.10, 0.0, 0.0);
  vec3 fill = sh * vec3(0.55, 0.85, 1.0);
  vec3 dark = mix(sh * vec3(0.55, 0.55, 0.60), CAU_INK, 0.45);
  vec3 c = mix(mix(dark, fill, fl), lit, kl);
  float rim = cAA(1.0 - clamp(n.z, 0.0, 1.0), 1.0 - rimW) * (1.0 - kl);
  return cCap(mix(c, CAU_CYAN, rim));
}`,
  demo: `cauOver(vec4(cauKeyFill(mix(${C.back}, ${C.belly}, cAA(-cN(p).y / 0.469, 0.45)), vec3(cN(p) / 0.469, sqrt(max(0.0, 1.0 - dot(cN(p), cN(p)) / 0.22))), 0.14), cCover(p)))`,
});

export const cauContour = T("cauContour", {
  doc: "inverse-hull ink contour 6.5 px wide, 90 percent heavier on the side facing away from the red key",
  draws: "A thick dark outline around a shape that is noticeably heavier on its shaded lower-right side and slimmer toward the light.",
  use: "line",
  params: "d: signed distance to the silhouette, positive outside; n2: outward 2D normal; px: base width in pixels (6.5). Returns the ink mask.",
  body: `float cauContour(float d, vec2 n2, float px) {
  float fw = fwidth(d) + 1e-6;
  float shade = smoothstep(-0.25, 0.35, -dot(n2 / max(length(n2), 1e-4), vec2(-0.768, 0.640)));
  float w = fw * px * (1.0 + 0.9 * shade);
  return smoothstep(-0.5 * fw, 0.5 * fw, d) * (1.0 - smoothstep(w - 0.5 * fw, w + 0.5 * fw, d));
}`,
  demo: `mix(mix(CAU_FIELD * 3.0, ${C.back} * 0.8, cCover(p)), CAU_INK, cauContour(length(cN(p)) - 0.469, cN(p), 6.5))`,
});

export const cauHair = T("cauHair", {
  doc: "Sukuna hair: eight tapered pink #d47a96 spikes swept up and back, lit side red-tinted, shade side cut cold, one glossy shard on the key side",
  draws: "A crown of eight sharp pink hair spikes leaning to the left, each pink on its left face and darker cool pink on its right, with a thin pale highlight sliver and a dark outline.",
  use: "surface",
  params: "uCauHairX, uCauHairY: root centre in frame units; uCauHairW, uCauHairH: half-width and tallest spike height in frame units. Returns rgb and coverage.",
  uni: { uCauHairX: 0.80, uCauHairY: 0.30, uCauHairW: 0.20, uCauHairH: 0.135 },
  body: `vec4 cauHair(vec2 p, float t) {
  vec2 f = cauFrame(p);
  vec2 q = vec2(f.x - uCauHairX, uCauHairY - f.y) / vec2(uCauHairW, uCauHairH);
  float best = 1e3, lit = 0.0, shard = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec2 a = vec2(-0.9 + fi * 0.2571, -0.05);
    vec2 b = vec2(a.x * 0.85 - 0.30 - 0.12 * cauH(fi, 9.0), 0.62 + 0.38 * cauH(fi, 5.0));
    float s;
    float dd = cauSegD(q, a, b, s);
    float r = 0.16 * pow(1.0 - s, 0.9) + 0.004;
    dd -= r;
    vec2 o = q - (a + (b - a) * s);
    float sw = 1.0 - cAA(abs(-o.x - 0.5 * r) - 0.015, 0.0);
    float upd = step(dd, best);
    best = mix(best, dd, upd);
    lit = mix(lit, step(o.x, 0.0), upd);
    shard = mix(shard, sw * step(0.25, s) * step(s, 0.7) * step(o.x, 0.0), upd);
  }
  vec3 litC = ${C.hair};
  vec3 c = mix(litC * vec3(0.72, 0.73, 0.75) * vec3(0.85, 0.95, 1.1), litC, lit);
  c = mix(c, ${C.cut} * 0.92, shard);
  float fw = fwidth(best) + 1e-6;
  float ring = cFill(best - fw * 2.0);
  return vec4(mix(CAU_INK, c, cFill(best)), ring);
}`,
  demo: "cauOver(cauHair(p, t))",
});

export const cauFourEyes = T("cauFourEyes", {
  doc: "four red #d41c24 slit eyes in two pairs, hard upper lid, ink ring, one sliver catch-light and a four-ray 30 degree flare driven by uEmit",
  draws: "Two large and two small red almond eyes with narrow dark slits and a heavy upper lid line; when lit, a small white glint and a four-pointed flare sparkle on the large pair.",
  use: "card",
  params: "uCauLid: upper lid height, 1 open to 0.5 half-shut (0.6); uCauEmit: 0 to 1 catch-light and flare strength (the only light above 0.88); eye centre and size from uCauEyeX, uCauEyeY, uCauFaceS.",
  uni: { uCauLid: 0.6, uCauEmit: 1 },
  body: `vec4 cauFourEyes(vec2 p, float t) {
  vec2 q = cauFace(p);
  vec3 col = vec3(0.0);
  float a = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float up = step(fi, 1.5);
    float sx = 1.0 - 2.0 * mod(fi, 2.0);
    vec2 c = mix(vec2(sx * 0.72, -0.72), vec2(sx, 0.0), up);
    vec2 r = mix(vec2(0.38, 0.22), vec2(0.62, 0.36), up);
    vec2 d = (q - c) / r;
    d.y -= 0.25 * sx * d.x;
    float e = length(d) - 1.0;
    float lidY = 2.0 * uCauLid - 1.0;
    float inside = cFill(e) * (1.0 - cAA(d.y, lidY));
    vec3 ec = mix(${C.eye}, ${C.eye} * 0.7, cAA(-d.y, 0.25));
    ec = mix(ec, CAU_INK, 1.0 - cAA(abs(d.x), 0.09));
    float glint = cFill(length((d - vec2(0.38, 0.34)) * vec2(2.4, 0.9)) - 0.25) * uCauEmit;
    ec = mix(ec, CAU_CORE, glint);
    float lid = cLine(d.y - lidY, 2.2) * cFill(e + 0.05);
    ec = mix(ec, CAU_INK, max(lid, cLine(e, 2.2)));
    float m = max(inside, max(lid, cLine(e, 2.2)));
    col = mix(col, ec, m);
    a = max(a, m);
    vec2 lp = c + r * vec2(0.38, 0.34);
    float fl = 0.0;
    for (int k = 0; k < 4; k++) {
      float ang = 0.5236 + float(k) * 1.5708;
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 rel = q - lp;
      float s = dot(rel, dir) / 0.47;
      float perp = abs(rel.x * dir.y - rel.y * dir.x);
      fl = max(fl, step(0.0, s) * step(s, 1.0) * cFill(perp - 0.07 * (1.0 - s)));
    }
    fl *= up * uCauEmit;
    col = mix(col, CAU_CORE, fl);
    a = max(a, fl);
  }
  return vec4(col, a);
}`,
  demo: `cauOn(cauFourEyes(p, t), ${C.back} * 0.6)`,
});

export const cauFaceMarks = T("cauFaceMarks", {
  doc: "Sukuna face marks: two brow chevrons, three cheek stripes a side, cream muzzle pads with three #76614f freckles each, wide toothy grin",
  draws: "Black chevrons over the brows, three short stripes on each cheek, two cream muzzle pads with brown freckles, and a wide curved grin full of square cream teeth.",
  use: "surface",
  params: "placed from uCauEyeX, uCauEyeY, uCauFaceS (face-local units, eye half-spacing = 1). Returns rgb and coverage.",
  body: `vec4 cauFaceMarks(vec2 p, float t) {
  vec2 q = cauFace(p);
  vec3 col = CAU_INK;
  float a = 0.0;
  for (int i = 0; i < 2; i++) {
    float sx = 1.0 - 2.0 * float(i);
    vec2 pc = vec2(sx * 0.55, -1.25);
    float pad = cFill(length((q - pc) / vec2(0.55, 0.38)) - 1.0);
    col = mix(col, ${C.belly}, pad); a = max(a, pad);
    for (int k = 0; k < 3; k++) {
      float fk = float(k) + float(i) * 3.0;
      vec2 fp = pc + vec2(cauH(fk, 31.0) - 0.5, cauH(fk, 37.0) - 0.5) * vec2(0.6, 0.35);
      float fr = cFill(length(q - fp) - 0.035) * pad;
      col = mix(col, ${C.frk}, fr);
    }
    float ink = cauStroke(q, vec2(sx * 0.45, 0.55), vec2(sx, 0.95), 0.065);
    ink = max(ink, cauStroke(q, vec2(sx, 0.95), vec2(sx * 1.62, 0.55), 0.065));
    for (int j = 0; j < 3; j++) {
      float fj = float(j);
      ink = max(ink, cauStroke(q, vec2(sx * 1.55, -0.35 - 0.3 * fj), vec2(sx * 2.05, -0.28 - 0.3 * fj), 0.04));
    }
    col = mix(col, CAU_INK, ink); a = max(a, ink);
  }
  float u = q.x / 1.9;
  float yu = -1.95 + 0.50 * u * u;
  float yl = -2.55 + 0.90 * u * u;
  float md = max(max(q.y - yu, yl - q.y), (abs(q.x) - 1.9) * 0.5);
  float mouth = cFill(md);
  float gap = step(fract(q.x * 2.6 + 0.5), 0.10);
  float teeth = max(step(yu - 0.30, q.y), step(q.y, yl + 0.20)) * (1.0 - gap);
  col = mix(col, CAU_INK, mouth);
  col = mix(col, ${C.belly}, mouth * teeth);
  col = mix(col, CAU_INK, cLine(md, 2.4));
  a = max(a, max(mouth, cLine(md, 2.4)));
  return vec4(col, a);
}`,
  demo: `cauOn(cauFaceMarks(p, t), ${C.back} * 0.5)`,
});

export const cauJacket = T("cauJacket", {
  doc: "Sukuna outfit: high collar to the cheeks and torso in maroon-ink #26111c (not indigo), one gold #c9a24a button, black wrist bands",
  draws: "A very dark maroon high-collared jacket with two tall collar wings rising beside the face, a small gold button at the throat, and two black bands across the flipper wrists.",
  use: "surface",
  params: "collar and button placed from uCauEyeX, uCauEyeY, uCauFaceS; uCauWristX, uCauWristY, uCauWristA: raised wrist band centre (frame units) and tilt in radians, mirrored for the other flipper. Returns rgb and coverage.",
  uni: { uCauWristX: 1.05, uCauWristY: 0.50, uCauWristA: 0.35 },
  body: `float cauBand(vec2 f, vec2 c, float ang) {
  vec2 d = f - c;
  vec2 r = vec2(cos(ang) * d.x + sin(ang) * d.y, -sin(ang) * d.x + cos(ang) * d.y);
  return cFill(max(abs(r.x) - 0.05, abs(r.y) - 0.016));
}
vec4 cauJacket(vec2 p, float t) {
  vec2 q = cauFace(p);
  vec2 f = cauFrame(p);
  float body = max(abs(q.x) - 4.2, q.y + 3.1);
  float sl, sr;
  float dl = cauSegD(q, vec2(-1.75, -3.0), vec2(-1.95, -0.35), sl) - 0.55;
  float dr = cauSegD(q, vec2(1.75, -3.0), vec2(1.95, -0.35), sr) - 0.55;
  float dm = min(body, min(dl, dr));
  vec3 base = ${C.jacket};
  vec3 c = mix(base, base * vec3(1.35, 1.1, 1.1), cAA(-q.x, 0.2));
  c = mix(c, base * vec3(0.7, 0.95, 1.5), cAA(q.x, 1.2));
  c = mix(c, CAU_INK, max(cLine(body, 2.2), max(cLine(dl, 2.2), cLine(dr, 2.2))));
  c = mix(c, CAU_INK, cLine(q.x, 1.6) * step(q.y, -3.2));
  c = mix(c, ${C.button}, cFill(length(q - vec2(0.0, -3.7)) - 0.2));
  c = mix(c, CAU_INK, cLine(length(q - vec2(0.0, -3.7)) - 0.2, 1.8));
  float wb = max(cauBand(f, vec2(uCauWristX, uCauWristY), uCauWristA), cauBand(f, vec2(2.0 * uCauEyeX - uCauWristX, uCauWristY), -uCauWristA));
  c = mix(c, CAU_INK, wb);
  return vec4(c, max(cFill(dm), wb));
}`,
  demo: `cauOn(cauJacket(p, t), ${C.back} * 0.5)`,
});

export const cauDismantle = T("cauDismantle", {
  doc: "the Dismantle cut: three tapered knife strokes, core #f2e6e0, ink edge, drawn on over two 24 fps frames each, fading exp(-t/0.5) from 8.5 s, no glow",
  draws: "Three long clean white knife lines slashing diagonally across the frame, widest in the middle and thin as hairs at both ends, each with a dark edge, drawn one after another and then fading away.",
  use: "line",
  params: "uCauCutT: time of the cut (8.0); stroke i draws over 24 fps frames 2i to 2i+1; endpoints are in frame units, y down. Returns rgb and alpha.",
  body: `const vec2 CAU_SA[3] = vec2[3](vec2(0.10, 0.25), vec2(0.30, 0.55), vec2(0.0, 0.05));
const vec2 CAU_SB[3] = vec2[3](vec2(2.30, 0.72), vec2(2.20, 0.95), vec2(1.90, 0.40));
vec4 cauDismantle(vec2 p, float t) {
  vec2 f = cauFrame(p);
  float k = floor((t - uCauCutT) * 24.0 + 0.001);
  float fade = mix(1.0, exp(-(t - uCauCutT - 0.5) / 0.5), step(0.0, t - uCauCutT - 0.5));
  vec3 col = vec3(0.0);
  float a = 0.0;
  for (int i = 0; i < 3; i++) {
    float prog = clamp((k - 2.0 * float(i) + 1.0) * 0.5, 0.0, 1.0);
    vec2 ab = CAU_SB[i] - CAU_SA[i];
    float L = length(ab);
    float s = dot(f - CAU_SA[i], ab) / (L * L);
    float d = abs(ab.x * (f.y - CAU_SA[i].y) - ab.y * (f.x - CAU_SA[i].x)) / L;
    float hw = 0.006 * pow(max(sin(3.14159265 * clamp(s, 0.0, 1.0)), 0.0), 0.6) + 0.0006;
    float along = cAA(s, 0.0) * (1.0 - cAA(s, prog));
    float edge = cFill(d - hw - 0.004) * along;
    col = mix(col, mix(CAU_INK, CAU_CORE, cFill(d - hw)), edge);
    a = max(a, edge);
  }
  return vec4(col, a * fade);
}`,
  demo: `cauOver(cauDismantle(p, uCauCutT + 0.25 + mod(t, 0.5)))`,
});

export const cauFrameSplit = T("cauFrameSplit", {
  doc: "frame-split resample along stroke 1: the half-plane above the seam slides 14 px at k6, drifts to 22 px over 2 s on six holds, 2 px #f2e6e0 seam",
  draws: "The whole picture sliced along one straight diagonal line and the upper half slid sideways along it, so shapes no longer meet across a thin pale seam.",
  use: "screen",
  params: "cauSplitUv(p, t): the coordinate to sample the scene at; cauSeamLine(p, t): the seam mask to paint over it. uCauCutT: time of the cut (8.0). The seam follows (0.10,0.25) to (2.30,0.72) in frame units.",
  body: `float cauSplitOff(float t) {
  float k = floor((t - uCauCutT) * 24.0 + 0.001);
  float q = floor(clamp((t - uCauCutT - 0.5) / 2.0, 0.0, 1.0) * 6.0) / 6.0;
  float drift = (14.0 + 8.0 * cauEaseOut3(q)) / 800.0;
  return mix(14.0 / 800.0 * step(6.0, k), drift, step(0.0, t - uCauCutT - 0.5));
}
vec2 cauSplitUv(vec2 p, float t) {
  vec2 f = cauFrame(p);
  vec2 dir = normalize(CAU_B1 - CAU_A1);
  float above = step(0.0, dot(f - CAU_A1, vec2(dir.y, -dir.x)));
  vec2 g = f - dir * cauSplitOff(t) * above;
  return vec2(g.x, 1.0 - g.y);
}
float cauSeamLine(vec2 p, float t) {
  vec2 dir = normalize(CAU_B1 - CAU_A1);
  float sd = dot(cauFrame(p) - CAU_A1, vec2(dir.y, -dir.x));
  return cLine(sd, 2.0) * step(5.5, floor((t - uCauCutT) * 24.0 + 0.001));
}`,
  demo: `mix(mix(CAU_INK * 2.0, ${C.rimLo}, cAA(fract(cauSplitUv(p, uCauCutT + 0.25 + mod(t, 2.0)).x * 6.0), 0.55)) * mix(1.0, 0.6, cAA(fract(cauSplitUv(p, uCauCutT + 0.25 + mod(t, 2.0)).y * 9.0), 0.6)), CAU_CORE, cauSeamLine(p, uCauCutT + 0.25 + mod(t, 2.0)))`,
});

export const cauGrade = T("cauGrade", {
  doc: "p-caustic grade: three-step red/cyan duotone blended 35 percent, split tone, luma cap 0.92, ink-floor lift, grain on twos, flat #e5142e on 24 fps frame k=8",
  draws: "The whole picture pushed into only dark ink, red and pale cyan with a fine paper grain, nothing white or black, then for one instant the entire frame flat blood red.",
  use: "grade",
  params: "uCauAmt: duotone blend over the scene (0.35); uCauGrain: grain amplitude (0.03); uCauCutT: the blood frame is 24 fps frame 8 after it. Call cauGrade(rgb, p, t) last.",
  uni: { uCauAmt: 0.35, uCauGrain: 0.03 },
  body: `vec3 cauGrade(vec3 c, vec2 p, float t) {
  if (abs(floor((t - uCauCutT) * 24.0 + 0.001) - 8.0) < 0.5) return CAU_BLOOD;
  float y = cLuma(c);
  vec3 red = CAU_BLOOD * (0.50 + 0.9 * (y - 0.12));
  vec3 cy = ${C.cyanHi} * clamp(0.35 + 0.8 * (y - 0.40), 0.0, 0.85);
  vec3 duo = mix(mix(CAU_INK, red, cAA(y, 0.12)), cy, cAA(y, 0.40));
  c = mix(c, duo, uCauAmt);
  c = mix(c, ${C.split}, 0.45 * smoothstep(0.40, 0.90, y));
  c = mix(c, CAU_INK, 0.45 * (1.0 - smoothstep(0.0, 0.12, y)));
  c = c * min(1.0, 0.92 / max(cLuma(c), 1e-4));
  y = cLuma(c);
  c = mix(CAU_INK, c, smoothstep(0.035, 0.08, y));
  float h = cH21(floor(p * 400.0) + 17.0 * floor(t * 12.0) + uCauSeed);
  c += uCauGrain * (1.0 - cLuma(c)) * (h - 0.5);
  return clamp(c, 0.0, 1.0);
}`,
  demo: "cauGrade(vec3(0.5 + 0.5 * sin(p.x * 5.0), 0.5 + 0.5 * sin(p.y * 7.0 + 1.0), 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 4.0)), p, uCauCutT - 1.0 + mod(t, 0.5))",
});

export const cauIrisBars = T("cauIrisBars", {
  doc: "2.39:1 letterbox bars 132.2 px in ink #140a0c, iris-in f0 to f11 from the flipper tip, iris-out f132 to f143 on the chest, ink edge, easeOutCubic on twos",
  draws: "Thick dark cinema bars above and below the picture, and a dark curtain with a round hole that opens from one small point at the start and closes again on the seal at the end.",
  use: "mask",
  params: "uCauIrisX, uCauIrisY: iris-in centre (flipper tip); uCauOutX, uCauOutY: iris-out centre (chest). Frame units, y down. Returns ink and coverage.",
  uni: { uCauIrisX: 0.98, uCauIrisY: 0.45, uCauOutX: 0.80, uCauOutY: 0.60 },
  body: `vec4 cauIrisBars(vec2 p, float t) {
  vec2 f = cauFrame(p);
  float bars = 1.0 - cAA(f.y, 0.16525) * (1.0 - cAA(f.y, 0.83475));
  float fi = floor(t * 12.0 + 1e-3);
  float rin = 1.92 * cauEaseOut3(fi / 11.0);
  float rout = 1.92 * (1.0 - cauEaseOut3((fi - 132.0) / 11.0));
  float outer = step(11.0, t);
  vec2 c = mix(vec2(uCauIrisX, uCauIrisY), vec2(uCauOutX, uCauOutY), outer);
  float r = mix(rin, rout, outer);
  float curtain = 1.0 - cFill(length(f - c) - r);
  return vec4(CAU_INK, max(bars, curtain));
}`,
  demo: `cauOn(cauIrisBars(p, mod(t, 1.0)), ${C.rimLo} * 0.6)`,
});

export const cauDustFlecks = T("cauDustFlecks", {
  doc: "48 ash flecks 2 to 6 px, lit side #d3565a and ink #140a0c, rising 0.05 H/s with jitter on twos, none over the seal face",
  draws: "Small round ember and ash specks, some red and some black, drifting slowly up through the picture, jumping slightly every twelfth of a second, with a clear patch over the face.",
  use: "noise",
  params: "uCauKeepX, uCauKeepY, uCauKeepR: keep-out circle over the face in frame units; fades in from 1.0 s. Returns rgb and coverage.",
  uni: { uCauKeepX: 0.88, uCauKeepY: 0.40, uCauKeepR: 0.20 },
  body: `vec4 cauDustFlecks(vec2 p, float t) {
  vec2 f = cauFrame(p);
  float rise = 0.05 * max(t - 1.0, 0.0);
  float jf = floor(t * 12.0 + 1e-3);
  vec3 col = CAU_INK;
  float a = 0.0;
  for (int i = 0; i < 48; i++) {
    float fi = float(i);
    vec2 c = vec2(cauH(fi, 41.0) * 1.6 + (cauH(fi, jf) - 0.5) * 0.004, 0.8335 - 0.667 * fract(cauH(fi, 43.0) + rise / 0.667));
    float rad = (1.0 + 2.0 * cauH(fi, 47.0)) / 800.0;
    float m = cFill(length(f - c) - rad);
    col = mix(col, mix(CAU_INK, ${C.rimHi}, step(0.5, cauH(fi, 53.0))), m);
    a = max(a, m);
  }
  float keep = smoothstep(uCauKeepR, uCauKeepR * 1.15, length(f - vec2(uCauKeepX, uCauKeepY)));
  return vec4(col, a * keep * smoothstep(1.0, 1.2, t));
}`,
  demo: `cauOn(cauDustFlecks(p, 2.0 + mod(t, 8.0)), CAU_FIELD * 2.0)`,
});

export const PACKET_SHADERS = [
  cauKit, cauCloudMass, cauHorizonGlow, cauRubbleStrip, cauKeyFill, cauContour, cauHair,
  cauFourEyes, cauFaceMarks, cauJacket, cauDismantle, cauFrameSplit, cauGrade, cauIrisBars, cauDustFlecks,
];
export const PACKET_COUNT = 15;
if (PACKET_SHADERS.length !== PACKET_COUNT) {
  throw new Error(`p-caustic packet: ${PACKET_SHADERS.length} != ${PACKET_COUNT}`);
}
