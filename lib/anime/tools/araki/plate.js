// araki plate: swath-trowelled plaster ground, two-step contact shadow, katakana sound-word row.
import { defineModule as M, v2, v4, rgb } from "./define.js";

export const arakiTrowelGround = M({
  name: "arakiTrowelGround",
  doc: "static plaster laid in angled trowel swaths: per-swath tone step, fine streaks along the stroke, ridge at each swath edge",
  glsl: `
uniform float uArkSeed2;
uniform float uArkSwath;
vec3 arakiTrowelGround(vec2 p, float t) {
  vec2 g = p / uArkSwath;
  vec2 id = floor(g), f = fract(g) - 0.5;
  float h = arkH21(id + uArkSeed2);
  float a = (h - 0.5) * 1.1;
  vec2 r = vec2(cos(a) * f.x + sin(a) * f.y, -sin(a) * f.x + cos(a) * f.y);
  float streak = arkVn(vec2(r.x * 2.0, r.y * 38.0) + h * 40.0);
  vec3 c = ARK_PLASTER * (1.0 - 0.06 * streak);
  c = mix(c, vec3(0.922, 0.855, 0.631), step(0.45, h) * 0.75);
  c = mix(c, vec3(0.847, 0.718, 0.369), step(0.80, h) * 0.30);
  c = mix(c, vec3(0.627, 0.314, 0.322), step(0.95, h) * 0.28);
  float ridge = arkLine(0.5 - max(abs(f.x), abs(f.y)), 1.2);
  return mix(c, c * 0.82, ridge * 0.8);
}`,
  demoExpr: "arakiTrowelGround(p, t)",
  draws: "A cream plaster wall made of square-ish trowel patches, each tilted a little and finely streaked, some warmer ochre or rose, with a faint ridge between patches.",
  use: "plate",
  params: "uArkSeed2: which patch pattern; uArkSwath: patch size in frame-height units.",
  uniforms: { uArkSeed2: 3, uArkSwath: 0.18 },
});

export const arakiContactBlob = M({
  name: "arakiContactBlob",
  doc: "hard-edged ragged contact shadow in two flat steps, an outer rose-brown pool and a darker core",
  glsl: `
uniform vec4 uArkBlobA;
uniform vec4 uArkBlobB;
uniform vec3 uArkBlobCol;
float arakiBlobR(vec2 p, vec4 b) {
  vec2 q = (p - b.xy) / b.zw;
  return length(q) * (1.0 + 0.12 * (arkVn(normalize(q + vec2(1e-5)) * 1.3 + b.x * 9.0) - 0.5));
}
vec3 arakiContactBlobC(vec3 ground, vec2 p) {
  float rA = arakiBlobR(p, uArkBlobA), rB = arakiBlobR(p, uArkBlobB);
  float pool = max(1.0 - arkAA(rA, 1.0), 1.0 - arkAA(rB, 1.0));
  float core = max(1.0 - arkAA(rA, 0.55), 1.0 - arkAA(rB, 0.55));
  vec3 c = mix(ground, uArkBlobCol, pool * 0.45);
  return mix(c, uArkBlobCol * 0.7, core * 0.25);
}
vec3 arakiContactBlob(vec2 p, float t) { return arakiContactBlobC(ARK_PLASTER, p); }`,
  demoExpr: "arakiContactBlob(p, t)",
  draws: "Two flat rose-brown oval shadows on cream plaster, each with a slightly ragged edge and a darker oval core.",
  use: "mask",
  params: "uArkBlobA, uArkBlobB: x, y centre then x, y radius of each shadow; uArkBlobCol: shadow colour.",
  uniforms: { uArkBlobA: v4(0.7, 0.45, 0.14, 0.05), uArkBlobB: v4(1.0, 0.40, 0.10, 0.04), uArkBlobCol: rgb("#a05052") },
});

export const arakiKanaRow = M({
  name: "arakiKanaRow",
  doc: "katakana sound words drawn as stroke segments (ゴゴゴ, ザ・ワールド, ドドド) in orange with ink outline and hard offset shadow, tilt flipping on twos",
  glsl: `
uniform float uArkWord;
uniform vec2 uArkKanaAt;
uniform float uArkKanaSize;
uniform float uArkKanaWeight;
uniform float uArkKanaTilt;
uniform vec3 uArkKanaFill;
uniform vec3 uArkKanaBg;
const float ARK_WORDS[18] = float[18](0.0, 0.0, 0.0, -1.0, -1.0, -1.0, 1.0, 6.0, 2.0, 5.0, 3.0, 4.0, 4.0, 4.0, 4.0, -1.0, -1.0, -1.0);
float arkDaku(vec2 q, vec2 o) {
  return min(arkSeg(q, o + vec2(0.0, 0.0), o + vec2(0.03, -0.10)), arkSeg(q, o + vec2(0.08, -0.02), o + vec2(0.11, -0.12)));
}
float arkKanaD(vec2 q, float g) {
  float d = 9.0;
  if (g < 0.5) {
    d = min(d, arkSeg(q, vec2(0.14, 0.78), vec2(0.80, 0.78)));
    d = min(d, arkSeg(q, vec2(0.80, 0.78), vec2(0.80, 0.20)));
    d = min(d, arkSeg(q, vec2(0.14, 0.20), vec2(0.80, 0.20)));
    d = min(d, arkDaku(q, vec2(0.84, 0.97)));
  } else if (g < 1.5) {
    d = min(d, arkSeg(q, vec2(0.10, 0.72), vec2(0.78, 0.72)));
    d = min(d, arkSeg(q, vec2(0.32, 0.90), vec2(0.32, 0.60)));
    d = min(d, arkSeg(q, vec2(0.62, 0.90), vec2(0.62, 0.60)));
    d = min(d, arkSeg(q, vec2(0.58, 0.70), vec2(0.40, 0.14)));
    d = min(d, arkDaku(q, vec2(0.80, 0.97)));
  } else if (g < 2.5) {
    d = min(d, arkSeg(q, vec2(0.15, 0.78), vec2(0.15, 0.58)));
    d = min(d, arkSeg(q, vec2(0.15, 0.78), vec2(0.85, 0.78)));
    d = min(d, arkSeg(q, vec2(0.85, 0.78), vec2(0.84, 0.60)));
    d = min(d, arkSeg(q, vec2(0.84, 0.60), vec2(0.55, 0.15)));
  } else if (g < 3.5) {
    d = min(d, arkSeg(q, vec2(0.28, 0.78), vec2(0.28, 0.30)));
    d = min(d, arkSeg(q, vec2(0.28, 0.30), vec2(0.12, 0.18)));
    d = min(d, arkSeg(q, vec2(0.50, 0.80), vec2(0.50, 0.28)));
    d = min(d, arkSeg(q, vec2(0.72, 0.78), vec2(0.74, 0.45)));
    d = min(d, arkSeg(q, vec2(0.74, 0.45), vec2(0.92, 0.20)));
  } else if (g < 4.5) {
    d = min(d, arkSeg(q, vec2(0.30, 0.92), vec2(0.30, 0.10)));
    d = min(d, arkSeg(q, vec2(0.30, 0.55), vec2(0.72, 0.40)));
    d = min(d, arkDaku(q, vec2(0.74, 0.97)));
  } else if (g < 5.5) {
    d = min(d, arkSeg(q, vec2(0.05, 0.50), vec2(0.95, 0.50)));
  } else {
    d = min(d, length(q - vec2(0.5, 0.5)));
  }
  return d;
}
float arakiKanaDist(vec2 pt, float word) {
  float d = 9.0;
  for (int i = 0; i < 6; i++) {
    float gid = ARK_WORDS[int(word) * 6 + i];
    if (gid > -0.5) d = min(d, arkKanaD(pt - vec2(float(i) * 0.78, 0.0), gid));
  }
  return d;
}
vec3 arakiKanaRow(vec2 p, float t) {
  float a = uArkKanaTilt * (mod(floor(t * 12.0), 2.0) * 2.0 - 1.0);
  vec2 r = (p - uArkKanaAt) / uArkKanaSize;
  vec2 pt = vec2(cos(a) * r.x + sin(a) * r.y, -sin(a) * r.x + cos(a) * r.y);
  float d = arakiKanaDist(pt, uArkWord);
  float ds = arakiKanaDist(pt - vec2(0.06, -0.06), uArkWord);
  float w = uArkKanaWeight;
  vec3 c = uArkKanaBg;
  c = mix(c, ARK_INK, arkFill((ds - w - 0.035) * uArkKanaSize) * 0.85);
  c = mix(c, ARK_INK, arkFill((d - w - 0.035) * uArkKanaSize));
  vec3 fill = mix(uArkKanaFill * 0.8, mix(uArkKanaFill, ARK_PLASTER, 0.3), arkAA(pt.y + 0.3 * pt.x, 0.5));
  return mix(c, fill, arkFill((d - w) * uArkKanaSize));
}`,
  demoExpr: "arakiKanaRow(p, t)",
  draws: "A row of chunky orange katakana characters with a thick ink outline and a hard black-brown drop shadow, upper half of each stroke lighter, the row tipping left and right twelve times a second.",
  use: "card",
  params: "uArkWord: 0 ゴゴゴ, 1 ザ・ワールド, 2 ドドド; uArkKanaAt: lower-left of the word; uArkKanaSize: glyph height; uArkKanaWeight: stroke half-width in glyph units; uArkKanaTilt: radians flipped on twos; uArkKanaFill, uArkKanaBg: colours.",
  uniforms: { uArkWord: 1, uArkKanaAt: v2(0.30, 0.38), uArkKanaSize: 0.22, uArkKanaWeight: 0.07, uArkKanaTilt: 0.04, uArkKanaFill: rgb("#cf6904"), uArkKanaBg: rgb("#4a3a6a") },
});

export const PLATE = [arakiTrowelGround, arakiContactBlob, arakiKanaRow];
