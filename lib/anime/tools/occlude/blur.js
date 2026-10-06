// Family 9 — blur / tap kernel / bloom-clamp / edge overlay (15).
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo, extra) => defineModule({ name, doc, glsl, demo, ...extra });

export const BLUR = [
  D("tapBlur", "downsample-ish tap blur: 5-tap plus (centre + 4 diamond), not a real mip",
    /* glsl */ `
  vec3 tapBlur(sampler2D src, vec2 uv, vec2 res) {
    vec2 o = 1.0 / max(res, vec2(1.0));
    vec3 c = texture2D(src, uv).rgb * 0.5;
    c += texture2D(src, uv + vec2(o.x, 0.0)).rgb * 0.125;
    c += texture2D(src, uv - vec2(o.x, 0.0)).rgb * 0.125;
    c += texture2D(src, uv + vec2(0.0, o.y)).rgb * 0.125;
    c += texture2D(src, uv - vec2(0.0, o.y)).rgb * 0.125;
    return ocCap(c);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return tapBlur(tSrc, vec2(p.x / 1.44, p.y), vec2(128.0)); }`,
    { demoTex: true }),

  D("bloomClamp", "bilateral-ish bloom clamp: add excess above 0.72, then force luma <= 0.92",
    /* glsl */ `
  vec3 bloomClamp(vec3 c, float knee) {
    float L = ocLuma(c);
    vec3 excess = max(c - vec3(knee), vec3(0.0));
    return ocCap(c + excess * 0.45);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return bloomClamp(ocPlate(p, t) * 1.15, 0.72); }`),

  D("edgeInkOverlay", "edge-aware overlay: multiply ink on darks only, gated by fwidth luma",
    /* glsl */ `
  vec3 edgeInkOverlay(vec3 plate, vec3 ink) {
    float L = ocLuma(plate);
    float e = smoothstep(0.015, 0.09, fwidth(L) * 14.0);
    float dark = 1.0 - smoothstep(0.22, 0.55, L);
    return ocCap(mix(plate, plate * ink, e * dark));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return edgeInkOverlay(ocPlate(p, t), vec3(0.22, 0.16, 0.28)); }`),

  D("tapBlurDir", "directional tap blur: 7-tap along a vector, a cheap motion smear",
    /* glsl */ `
  vec3 tapBlurDir(sampler2D src, vec2 uv, vec2 dir, vec2 res) {
    vec2 o = dir / max(res, vec2(1.0));
    vec3 c = vec3(0.0);
    c += texture2D(src, uv - o * 3.0).rgb * 0.07;
    c += texture2D(src, uv - o * 2.0).rgb * 0.12;
    c += texture2D(src, uv - o).rgb * 0.18;
    c += texture2D(src, uv).rgb * 0.26;
    c += texture2D(src, uv + o).rgb * 0.18;
    c += texture2D(src, uv + o * 2.0).rgb * 0.12;
    c += texture2D(src, uv + o * 3.0).rgb * 0.07;
    return ocCap(c);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return tapBlurDir(tSrc, vec2(p.x / 1.44, p.y), vec2(2.0, 0.4), vec2(180.0)); }`,
    { demoTex: true }),

  D("bloomShoulder", "bloom shoulder: soft knee above 0.8 then ocCap — emissive only, never 1.0 whites",
    /* glsl */ `
  vec3 bloomShoulder(vec3 c) {
    vec3 s = mix(c, vec3(0.8) + 0.2 * (vec3(1.0) - exp(-(c - 0.8) / 0.2)), step(0.8, c));
    return ocCap(s);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return bloomShoulder(ocPlate(p, t) * (0.9 + 0.4 * ocUV().x)); }`),

  D("darkMultiplyInk", "multiply ink on darks only: no edge gate, a value-key overlay",
    /* glsl */ `
  vec3 darkMultiplyInk(vec3 plate, vec3 ink, float cut) {
    float m = 1.0 - smoothstep(cut, cut + 0.22, ocLuma(plate));
    return ocCap(mix(plate, plate * ink, m));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return darkMultiplyInk(ocPlate(p, t), vec3(0.28, 0.18, 0.36), 0.32); }`),

  D("boxTap5", "5x5 box tap (step 2): 9 samples, a chunkier downsample-ish flatten",
    /* glsl */ `
  vec3 boxTap5(sampler2D src, vec2 uv, vec2 res) {
    vec2 o = 2.0 / max(res, vec2(1.0));
    vec3 c = vec3(0.0);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++)
      c += texture2D(src, uv + vec2(float(i), float(j)) * o).rgb;
    return ocCap(c / 9.0);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return boxTap5(tSrc, vec2(p.x / 1.44, p.y), vec2(96.0)); }`,
    { demoTex: true }),

  D("crossBokeh", "cross bokeh: 5-tap plus + 4-tap diagonals, a cheap anime sparkle blur",
    /* glsl */ `
  vec3 crossBokeh(sampler2D src, vec2 uv, vec2 res) {
    vec2 o = 2.5 / max(res, vec2(1.0));
    vec3 c = texture2D(src, uv).rgb * 0.28;
    c += texture2D(src, uv + vec2(o.x, 0.0)).rgb * 0.10;
    c += texture2D(src, uv - vec2(o.x, 0.0)).rgb * 0.10;
    c += texture2D(src, uv + vec2(0.0, o.y)).rgb * 0.10;
    c += texture2D(src, uv - vec2(0.0, o.y)).rgb * 0.10;
    c += texture2D(src, uv + o).rgb * 0.08;
    c += texture2D(src, uv - o).rgb * 0.08;
    c += texture2D(src, uv + vec2(o.x, -o.y)).rgb * 0.08;
    c += texture2D(src, uv + vec2(-o.x, o.y)).rgb * 0.08;
    return ocCap(c);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return crossBokeh(tSrc, vec2(p.x / 1.44, p.y), vec2(140.0)); }`,
    { demoTex: true }),

  D("bloomLumaGate", "bloom only where luma > gate, then cap — a highlight pick, not a pyramid",
    /* glsl */ `
  vec3 bloomLumaGate(vec3 c, float gate) {
    float L = ocLuma(c);
    vec3 hi = c * smoothstep(gate, gate + 0.12, L);
    return ocCap(c + hi * 0.35);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return bloomLumaGate(ocPlate(p, t) * 1.1, 0.55); }`),

  D("sobelInk", "Sobel-ish ink: 3x3 luma taps, overlay multiply on the gradient",
    /* glsl */ `
  vec3 sobelInk(sampler2D src, vec2 uv, vec2 res, vec3 ink) {
    vec2 o = 1.0 / max(res, vec2(1.0));
    float tl = ocLuma(texture2D(src, uv + vec2(-o.x, o.y)).rgb);
    float t = ocLuma(texture2D(src, uv + vec2(0.0, o.y)).rgb);
    float tr = ocLuma(texture2D(src, uv + vec2(o.x, o.y)).rgb);
    float l = ocLuma(texture2D(src, uv + vec2(-o.x, 0.0)).rgb);
    float r = ocLuma(texture2D(src, uv + vec2(o.x, 0.0)).rgb);
    float bl = ocLuma(texture2D(src, uv + vec2(-o.x, -o.y)).rgb);
    float b = ocLuma(texture2D(src, uv + vec2(0.0, -o.y)).rgb);
    float br = ocLuma(texture2D(src, uv + vec2(o.x, -o.y)).rgb);
    float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
    float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
    float e = smoothstep(0.08, 0.35, abs(gx) + abs(gy));
    vec3 plate = texture2D(src, uv).rgb;
    return ocCap(mix(plate, plate * ink, e));
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return sobelInk(tSrc, vec2(p.x / 1.44, p.y), vec2(256.0), vec3(0.18, 0.12, 0.22)); }`,
    { demoTex: true }),

  D("bilateralIsh", "bilateral-ish bloom clamp: 5-tap, weight by luma delta, then ocCap",
    /* glsl */ `
  vec3 bilateralIsh(sampler2D src, vec2 uv, vec2 res) {
    vec2 o = 1.5 / max(res, vec2(1.0));
    vec3 c0 = texture2D(src, uv).rgb;
    float L0 = ocLuma(c0);
    vec3 acc = c0; float wsum = 1.0;
    vec3 s0 = texture2D(src, uv + vec2(o.x, 0.0)).rgb; float w0 = exp(-abs(ocLuma(s0) - L0) * 8.0); acc += s0 * w0; wsum += w0;
    vec3 s1 = texture2D(src, uv - vec2(o.x, 0.0)).rgb; float w1 = exp(-abs(ocLuma(s1) - L0) * 8.0); acc += s1 * w1; wsum += w1;
    vec3 s2 = texture2D(src, uv + vec2(0.0, o.y)).rgb; float w2 = exp(-abs(ocLuma(s2) - L0) * 8.0); acc += s2 * w2; wsum += w2;
    vec3 s3 = texture2D(src, uv - vec2(0.0, o.y)).rgb; float w3 = exp(-abs(ocLuma(s3) - L0) * 8.0); acc += s3 * w3; wsum += w3;
    return ocCap(acc / wsum);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return bilateralIsh(tSrc, vec2(p.x / 1.44, p.y), vec2(180.0)); }`,
    { demoTex: true }),

  D("bloomSoftClamp", "soft bloom clamp: add a blurred-ish self * excess, hard luma 0.92",
    /* glsl */ `
  vec3 bloomSoftClamp(vec3 c) {
    float L = ocLuma(c);
    vec3 bloom = c * max(L - 0.62, 0.0) * 1.4;
    return ocCap(c + bloom);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return bloomSoftClamp(ocPlate(p, t) * 1.2); }`),

  D("overlayDarks", "overlay blend on darks: Photoshop overlay vs ink, only L < 0.5",
    /* glsl */ `
  vec3 overlayDarks(vec3 plate, vec3 ink) {
    vec3 ov = mix(2.0 * plate * ink, vec3(1.0) - 2.0 * (vec3(1.0) - plate) * (vec3(1.0) - ink), step(0.5, plate));
    float m = 1.0 - smoothstep(0.35, 0.62, ocLuma(plate));
    return ocCap(mix(plate, ov, m));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return overlayDarks(ocPlate(p, t), vec3(0.32, 0.18, 0.42)); }`),

  D("tapKawaseApprox", "Kawase-ish downsample tap: centre*0.5 + 4 corners*0.125 (matches composer DOWN)",
    /* glsl */ `
  vec3 tapKawaseApprox(sampler2D src, vec2 uv, vec2 res) {
    vec2 o = 1.0 / max(res, vec2(1.0));
    vec3 c = texture2D(src, uv).rgb * 0.5;
    c += (texture2D(src, uv - o).rgb + texture2D(src, uv + o).rgb
        + texture2D(src, uv + vec2(o.x, -o.y)).rgb + texture2D(src, uv - vec2(o.x, -o.y)).rgb) * 0.125;
    return ocCap(c);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return tapKawaseApprox(tSrc, vec2(p.x / 1.44, p.y), vec2(160.0)); }`,
    { demoTex: true }),

  D("edgeAwareGrade", "edge-aware grade: 3-stop ramp only on fwidth edges, interiors stay",
    /* glsl */ `
  vec3 edgeAwareGrade(vec3 plate, vec3 a, vec3 b, vec3 c) {
    float L = ocLuma(plate);
    vec3 g = L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0);
    float e = smoothstep(0.012, 0.08, fwidth(L) * 16.0);
    return ocCap(mix(plate, g, e));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return edgeAwareGrade(ocPlate(p, t), vec3(0.14, 0.08, 0.22), vec3(0.62, 0.22, 0.38), vec3(0.88, 0.74, 0.40)); }`),
];
