// Family 10 — FBO-ish composites / hold frames / dual-plate (10).
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo, extra) => defineModule({ name, doc, glsl, demo, ...extra });

export const FBO = [
  D("holdFrameMix", "hold-frame mix: blend a frozen (seeded) plate against live, as if two FBOs",
    /* glsl */ `
  vec3 holdFrameMix(vec3 live, vec3 held, float k) {
    return ocCap(mix(live, held, clamp(k, 0.0, 1.0)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { vec3 live = ocPlate(p, t); vec3 held = ocPlate(p, 1.25); return holdFrameMix(live, held, step(0.0, sin(t * 3.0))); }`),

  D("dualPlateWipe", "dual-plate wipe: two colours as if two RTs, AA x-wipe between them",
    /* glsl */ `
  vec3 dualPlateWipe(vec3 a, vec3 b, float u) {
    float d = ocUV().x - u;
    return mix(a, b, ocAA(-d));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(dualPlateWipe(ocPlate(p, t), ocInvert(ocPlate(p, t)), fract(t * 0.2))); }`),

  D("fboScreenBlend", "FBO screen blend: 1-(1-a)*(1-b), then luma-cap — additive-ish composite",
    /* glsl */ `
  vec3 fboScreenBlend(vec3 a, vec3 b) {
    return ocCap(vec3(1.0) - (vec3(1.0) - a) * (vec3(1.0) - b));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return fboScreenBlend(ocPlate(p, t) * 0.7, vec3(0.42, 0.18, 0.28) * ocAA(ocEllipse(p, vec2(0.72, 0.42), vec2(0.22, 0.18)))); }`),

  D("holdGhost", "hold ghost: a dim, offset earlier plate over live (onion of one frame)",
    /* glsl */ `
  vec3 holdGhost(vec3 live, vec3 held, vec2 pxOff) {
    float g = step(0.4, ocHash(gl_FragCoord.xy * 0.25));
    vec3 ghost = held * vec3(0.62, 0.55, 0.72);
    return ocCap(mix(live, mix(live, ghost, 0.45), g * 0.0 + 0.35));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { vec2 q = p + vec2(0.03, 0.0); return holdGhost(ocPlate(p, t), ocPlate(q, t - 0.2), vec2(4.0, 0.0)); }`),

  D("dualDepthComp", "dual-depth composite: pick plate A or B by the depth-proxy, as two RTs + depth",
    /* glsl */ `
  vec3 dualDepthComp(vec2 p, vec3 nearP, vec3 farP, float cut) {
    float z = ocDepthProxy(p);
    return mix(farP, nearP, ocAA(cut - z));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(dualDepthComp(p, ocPlate(p, t), vec3(0.16, 0.12, 0.22), 0.48)); }`),

  D("fboPremultOver", "premultiplied over: out = src + dst*(1-a), the UBER compositor law",
    /* glsl */ `
  vec3 fboPremultOver(vec3 dst, vec3 src, float a) {
    float al = clamp(a, 0.0, 1.0);
    return ocCap(src * al + dst * (1.0 - al));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { float a = ocAA(-ocEllipse(p, vec2(0.72, 0.42), vec2(0.28, 0.22))); return fboPremultOver(ocPlate(p, t), vec3(0.86, 0.62, 0.22), a * 0.8); }`),

  D("holdStutter", "hold stutter: quantize the source UV in time-steps, a stepped FBO hold",
    /* glsl */ `
  vec3 holdStutter(sampler2D src, vec2 uv, float t, float fps) {
    float hold = floor(t * fps);
    vec2 j = (vec2(ocHash(vec2(hold, 1.0)), ocHash(vec2(hold, 2.0))) - 0.5) * 0.004;
    return ocCap(texture2D(src, uv + j).rgb);
  }`,
    /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { return holdStutter(tSrc, vec2(p.x / 1.44, p.y), t, 4.0); }`,
    { demoTex: true }),

  D("dualPlateSplit", "dual-plate split: left RT vs right RT, vertical AA seam at a ndc x",
    /* glsl */ `
  vec3 dualPlateSplit(vec3 left, vec3 right, float seam) {
    return mix(left, right, ocAA(seam - ocNdc().x));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(dualPlateSplit(ocPlate(p, t), ocCap(ocPlate(p, t) * vec3(0.55, 0.32, 0.82)), 0.0)); }`),

  D("fboAddClamp", "FBO add-clamp: dst + src, then luma 0.92 — the additive layer of a premult pass",
    /* glsl */ `
  vec3 fboAddClamp(vec3 dst, vec3 src) { return ocCap(dst + src); }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { vec3 add = vec3(0.55, 0.28, 0.72) * exp(-length(p - vec2(0.72, 0.42)) * 4.0); return fboAddClamp(ocPlate(p, t) * 0.75, add); }`),

  D("holdOnion", "onion-skin hold: three time-offsets of a generated plate, weighted, as three held FBOs",
    /* glsl */ `
  vec3 holdOnion(vec2 p, float t, float dt) {
    vec3 a = ocPlate(p, t);
    vec3 b = ocPlate(p + vec2(0.012, 0.0), t - dt);
    vec3 c = ocPlate(p + vec2(0.024, 0.0), t - dt * 2.0);
    return ocCap(a * 0.55 + b * 0.28 + c * 0.17);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return holdOnion(p, t, 0.18); }`),
];
