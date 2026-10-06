// Shared cutscene stash law. Every cuts/<dock> module prepends this.
// Ink is indigo / umber, never #000. Edges use fwidth. Lit luma ≤ 0.92.

export const KIT = /* glsl */ `
const vec3 CUT_INK = vec3(0.0902, 0.0784, 0.1412);
const vec3 CUT_UMBER = vec3(0.1647, 0.1098, 0.0784);
const vec3 LUMA_W = vec3(0.2126, 0.7152, 0.0722);

float cLuma(vec3 c) { return dot(max(c, 0.0), LUMA_W); }
vec3 cCap(vec3 c) { float L = cLuma(c); return c * min(1.0, 0.92 / max(L, 1e-4)); }
float cAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float cFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float cLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float cH21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 cH22(vec2 p) { float a = cH21(p); return vec2(a, cH21(p + a + 17.0)); }
float cVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cH21(i), cH21(i + vec2(1.0, 0.0)), f.x), mix(cH21(i + vec2(0.0, 1.0)), cH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float cFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * cVn(p); p *= 2.03; a *= 0.5; } return s; }
vec3 cCel3(float v, float t1, float t2, vec3 dark, vec3 mid, vec3 lit) {
  return mix(mix(dark, mid, cAA(v, t1)), lit, cAA(v, t2));
}
float cHatch(vec2 fc, float pitch) {
  float px = max(fc.y / 720.0, 1.0);
  float h = (fc.x - fc.y) / (pitch * px);
  float g = min(fract(h), 1.0 - fract(h));
  return 1.0 - smoothstep(0.08, 0.14, g);
}
float cStar4(vec2 p, float r) {
  p = abs(p); float s = (sqrt(p.x) + sqrt(p.y)) / sqrt(max(r, 1e-4));
  return pow(clamp(1.0 - s, 0.0, 1.0), 1.6);
}
vec3 cInvert(vec3 c) { return cCap(vec3(1.0) - c); }
float cVig(vec2 p, float k) {
  vec2 d = p - 0.5;
  return clamp(1.0 - k * dot(d, d) * 3.2, 0.0, 1.0);
}
vec2 cN(vec2 p) { return p - vec2(0.72, 0.50); }
float cCover(vec2 p) { return cAA(0.22 - dot(cN(p), cN(p)), 0.0); }
float cNdL(vec2 p) {
  vec2 c = cN(p); float z = sqrt(max(0.0, 0.22 - dot(c, c)));
  return 0.5 + 0.5 * dot(normalize(vec3(c, z + 1e-4)), normalize(vec3(-0.45, 0.55, 0.7)));
}

// Flipper signs. kind: 0 gojo, 1 clap, 2 two, 3 point, 4 book, 5 wave, 6 pocket, 7 staff, 8 slash.
vec3 cFlip(vec3 col, vec2 p, vec2 c, vec2 rad) {
  float d = length((p - c) / rad) - 1.0;
  col = mix(col, vec3(0.78, 0.62, 0.54), cFill(d) * cCover(p));
  col = mix(col, CUT_INK, cLine(d, 1.2) * 0.55);
  return col;
}
vec3 cSign(vec3 col, vec2 p, float t, float kind) {
  vec2 chest = vec2(0.72, 0.46);
  float ht = floor(t * 8.0 + 1e-5) / 8.0;
  if (kind < 0.5) {
    col = cFlip(col, p, chest + vec2(-0.05, 0.0), vec2(0.055, 0.028));
    col = cFlip(col, p, chest + vec2(0.05, 0.0), vec2(0.055, 0.028));
  } else if (kind < 1.5) {
    float slap = abs(fract(ht * 2.0) * 2.0 - 1.0);
    col = cFlip(col, p, chest + vec2(-0.05 - 0.02 * slap, -0.02), vec2(0.05, 0.026));
    col = cFlip(col, p, chest + vec2(0.05 + 0.02 * slap, -0.02), vec2(0.05, 0.026));
  } else if (kind < 2.5) {
    col = cFlip(col, p, chest + vec2(0.08, 0.06), vec2(0.018, 0.055));
    col = cFlip(col, p, chest + vec2(0.11, 0.08), vec2(0.016, 0.050));
  } else if (kind < 3.5) {
    col = cFlip(col, p, chest + vec2(0.10, 0.04), vec2(0.016, 0.070));
  } else if (kind < 4.5) {
    vec2 q = abs(p - (chest + vec2(-0.07, 0.02))) / vec2(0.045, 0.055);
    float book = max(q.x, q.y) - 1.0;
    col = mix(col, vec3(0.22, 0.16, 0.12), cFill(book) * cCover(p));
    col = mix(col, CUT_INK, cLine(book, 1.2) * 0.6);
  } else if (kind < 5.5) {
    float w = sin(ht * 6.2832);
    col = cFlip(col, p, chest + vec2(0.10, 0.06 + 0.03 * w), vec2(0.04, 0.022));
  } else if (kind < 6.5) {
    col = cFlip(col, p, chest + vec2(-0.10, -0.04), vec2(0.04, 0.022));
    col = cFlip(col, p, chest + vec2(0.10, -0.04), vec2(0.04, 0.022));
  } else if (kind < 7.5) {
    float staff = cLine(abs((p.x - 0.86) - (p.y - 0.40) * 0.15) - 0.008, 1.4) * cAA(0.82 - p.y, 0.0);
    col = mix(col, vec3(0.55, 0.38, 0.18), staff * 0.85);
    col = cFlip(col, p, chest + vec2(0.10, 0.00), vec2(0.04, 0.022));
  } else {
    float slash = cLine(abs((p.x - 0.62) - (p.y - 0.50) * 1.2) - 0.01, 1.6) * cCover(p);
    col = mix(col, vec3(0.82, 0.78, 0.70), slash * 0.70);
    col = cFlip(col, p, chest + vec2(0.08, 0.02), vec2(0.045, 0.022));
  }
  return cCap(col);
}
`;

export const cutKit = {
  name: "cutKit",
  family: "cuts",
  doc: "cutscene stash grammar: fwidth AA, indigo ink, luma cap 0.92",
  glsl: KIT,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    float h = cNdL(p);
    vec3 c = cCel3(h, 0.38, 0.72, vec3(0.16, 0.14, 0.24), vec3(0.48, 0.38, 0.36), vec3(0.86, 0.72, 0.58));
    return cCap(mix(CUT_INK * 2.2, c, cCover(p)));
  }`,
};

export function defineCut(name, family, doc, glsl, demoExpr) {
  return {
    name,
    family,
    doc,
    deps: ["cutKit"],
    glsl,
    demo: `vec3 demo(vec2 p, float t){ return cCap(${demoExpr}); }`,
  };
}
