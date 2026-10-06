// Analog anime print grammar. GRADE last: rosette, laid tooth, gate, book, fresco, dusk.
// Laws: luma ≤ 0.92; fwidth AA; ink is indigo, never #000; screens and paper, not CGI grain.

import { defineModule } from "./define.js";

export const KIT_GLSL = /* glsl */ `
  const vec3 PR_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float PR_CAP = 0.92;
  const vec3 PR_INK = vec3(0.08, 0.09, 0.18);
  const vec3 PR_UMBER = vec3(0.18, 0.11, 0.07);
  const vec3 PR_PAPER = vec3(0.86, 0.82, 0.74);
  const vec3 PR_TOOTH = vec3(0.76, 0.72, 0.64);
  const vec3 PR_VERSO = vec3(0.82, 0.78, 0.70);
  const vec3 PR_CYAN = vec3(0.18, 0.46, 0.54);
  const vec3 PR_MAG = vec3(0.64, 0.16, 0.38);
  const vec3 PR_YEL = vec3(0.80, 0.70, 0.24);
  const vec3 PR_LIME = vec3(0.78, 0.74, 0.62);
  const vec3 PR_OCHRE = vec3(0.70, 0.46, 0.22);
  const vec3 PR_SINO = vec3(0.56, 0.18, 0.14);
  const vec3 PR_GOLD = vec3(0.82, 0.62, 0.28);
  const vec3 PR_DUSK_W = vec3(0.88, 0.52, 0.28);
  const vec3 PR_DUSK_C = vec3(0.16, 0.24, 0.42);
  const vec3 PR_KEY = vec3(0.88, 0.72, 0.54);
  const vec3 PR_MID = vec3(0.50, 0.38, 0.34);
  const vec3 PR_FILL = vec3(0.16, 0.22, 0.36);
  const float PR_ANG_C = 0.261799;
  const float PR_ANG_M = 1.309000;
  const float PR_ANG_Y = 0.0;
  const float PR_ANG_K = 0.785398;

  float prLuma(vec3 c) { return dot(max(c, vec3(0.0)), PR_LUMA); }
  vec3 prFloor(vec3 c) { return max(c, PR_INK); }
  vec3 prCap(vec3 c) { return c * min(1.0, PR_CAP / max(prLuma(c), 1e-4)); }
  vec3 prOut(vec3 c) { return prCap(prFloor(c)); }

  float prAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float prFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float prLine(float d, float px) { float w = fwidth(d) + 1e-6; return 1.0 - smoothstep(px * w * 0.5, w * (px * 0.5 + 0.9), abs(d)); }
  float prBand(float v, float a, float b) { return prAA(v, a) * (1.0 - prAA(v, b)); }
  float prHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1e-4); }

  float prH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2 prH22(vec2 p) { float a = prH21(p); return vec2(a, prH21(p + a + 17.0)); }
  float prVn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(prH21(i), prH21(i + vec2(1.0, 0.0)), f.x), mix(prH21(i + vec2(0.0, 1.0)), prH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float prFbm(vec2 p) { return prVn(p) * 0.50 + prVn(p * 2.07 + 1.3) * 0.30 + prVn(p * 4.13 + 4.1) * 0.20; }

  mat2 prRot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  float prDot(vec2 p, float ang, float dpi, float radius) {
    vec2 q = prRot(ang) * p * dpi;
    float d = length(fract(q) - 0.5);
    float w = fwidth(d) * 1.15 + 1e-5;
    return 1.0 - smoothstep(radius - w, radius + w, d);
  }

  float prRadius(float cover) {
    return 0.56 * sqrt(clamp(cover, 0.0, 1.0));
  }

  float prGain(float cover, float g) {
    float c = clamp(cover, 0.0, 1.0);
    return clamp(c + g * c * (1.0 - c), 0.0, 1.0);
  }

  vec3 prKeepL(vec3 src, vec3 dst) {
    float L = prLuma(src);
    return dst * (L / max(prLuma(dst), 1e-4));
  }

  vec3 prSphereN(vec2 p) {
    vec2 c = p - vec2(0.72, 0.50);
    float z = sqrt(max(0.0, 0.22 - dot(c, c)));
    return normalize(vec3(c, z + 1e-4));
  }
  float prCover(vec2 p) {
    vec2 c = p - vec2(0.72, 0.50);
    return prFill(dot(c, c) - 0.22);
  }
  float prNdL(vec2 p) { return 0.5 + 0.5 * dot(prSphereN(p), normalize(vec3(-0.45, 0.55, 0.7))); }
  vec3 prCel3(float h) {
    return mix(mix(PR_FILL, PR_MID, prAA(h, 0.38)), PR_KEY, prAA(h, 0.72));
  }
  vec3 prPaper(vec2 p) {
    float fiber = prVn(vec2(p.x * 17.0 + p.y * 2.1, p.y * 3.2)) * 0.52 + prVn(p * 38.0) * 0.16;
    float tooth = smoothstep(0.34, 0.72, prFbm(p * 8.5));
    return mix(PR_TOOTH, PR_PAPER, fiber) * mix(0.93, 1.0, tooth);
  }
  vec3 prPlate(vec2 p, float t) {
    return prOut(mix(prPaper(p) * 0.52, prCel3(prNdL(p)), prCover(p)));
  }

  float prLaidAmt(vec2 p) {
    float warp = (prFbm(p * 2.4) - 0.5) * 0.35;
    float laid = abs(fract((p.y + warp * 0.04) * 18.0) - 0.5);
    float chain = abs(fract((p.x + warp * 0.08) * 3.2) - 0.5);
    float lw = fwidth(p.y * 18.0) + 1e-5;
    float cw = fwidth(p.x * 3.2) + 1e-5;
    float lines = (1.0 - smoothstep(0.12 - lw, 0.12 + lw, laid)) * 0.55;
    lines += (1.0 - smoothstep(0.16 - cw, 0.16 + cw, chain)) * 0.35;
    return lines;
  }

  vec2 prGateJ(float t) {
    float h = prHold(t, 24.0);
    return (prH22(vec2(h, 3.7)) - 0.5) * vec2(0.0042, 0.0024);
  }

  float prHingeX(float t, float from, float span) {
    return from + fract(t * 0.14) * span;
  }

  vec2 prVor(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      float d = length(g + prH22(i + g) - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return vec2(d1, d2 - d1);
  }
`;

export const printKit = {
  name: "printKit",
  doc: "analog anime print: CMY rosette, laid tooth, analog gate, book leaf, fresco lime, dusk split. luma 0.92, indigo ink, fwidth",
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prPlate(p, t); }`,
};

export function P(name, family, doc, glsl) {
  const mod = defineModule({
    name,
    doc,
    glsl: /* glsl */ `\n${glsl}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(prPlate(p, t), p, t); }`,
  });
  mod.family = family;
  return mod;
}
