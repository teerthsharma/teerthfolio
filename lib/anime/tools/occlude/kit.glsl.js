// Occlude compositor grammar (screen-glued planes, invert masks, depth-proxy halos).
// Laws: invert then remap so luma <= 0.92; fwidth AA on every mask; no pure black (deep multiply ink);
// screen-space via gl_FragCoord + uRes; uDepth is an optional scalar (default 1.0), never a depth texture —
// discontinuities are a radial + height proxy named honestly.
import { defineModule } from "./define.js";

export const occludeKit = defineModule({
  name: "occludeKit",
  doc: "occlude compositor grammar: luma cap 0.92, fwidth AA, deep-multiply ink, screen uv, height/radial depth proxy",
  uniforms: () => ({
    uRes: { value: { x: 1280, y: 720 } },
    uDepth: { value: 1 },
  }),
  glsl: /* glsl */ `
  uniform vec2 uRes;
  uniform float uDepth;
  const vec3 OC_INK = vec3(0.07, 0.055, 0.085);
  const vec3 OC_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float OC_CAP = 0.92;
  float ocLuma(vec3 c) { return dot(c, OC_LUMA); }
  vec3 ocFloor(vec3 c) { return max(c, vec3(0.035, 0.028, 0.045)); }
  vec3 ocCap(vec3 c) { float L = ocLuma(c); return ocFloor(c * min(1.0, OC_CAP / max(L, 1e-4))); }
  vec3 ocInvert(vec3 c) { return ocCap(vec3(1.0) - c); }
  float ocAA(float d) { float w = fwidth(d) + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float ocStroke(float d, float px) { float w = fwidth(d) + 1e-5; return 1.0 - smoothstep(px * w, (px + 1.4) * w, abs(d)); }
  vec2 ocUV() { return gl_FragCoord.xy / max(uRes, vec2(1.0)); }
  vec2 ocNdc() { return ocUV() * 2.0 - 1.0; }
  vec2 ocP() { vec2 n = ocNdc(); return vec2(n.x * (uRes.x / max(uRes.y, 1.0)), n.y); }
  float ocHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ocVnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(ocHash(i), ocHash(i + vec2(1.0, 0.0)), f.x), mix(ocHash(i + vec2(0.0, 1.0)), ocHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // Honest stand-in: height + radial seat. uDepth (default 1) only scales the proxy.
  float ocDepthProxy(vec2 p) {
    float h = clamp(p.y, 0.0, 1.2);
    vec2 q = (p - vec2(0.72, 0.38)) * vec2(0.65, 1.0);
    float r = length(q);
    float body = smoothstep(0.58, 0.10, r);
    return clamp((h * 0.34 + (1.0 - r) * 0.42 + body * 0.28) * uDepth, 0.0, 1.0);
  }
  float ocEllipse(vec2 p, vec2 c, vec2 rad) { return length((p - c) / max(rad, vec2(1e-4))) - 1.0; }
  float ocBox(vec2 p, vec2 c, vec2 b) { vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float ocStarN(vec2 p, float n, float r, float inner) {
    float a = atan(p.y, p.x), an = 6.2831853 / max(n, 2.0);
    float seg = mod(a + an * 0.5, an) - an * 0.5;
    return length(p) - mix(r, r * inner, clamp(abs(seg) / (an * 0.5), 0.0, 1.0));
  }
  vec3 ocPlate(vec2 p, float t) {
    vec2 uv = vec2(p.x / 1.44, clamp(p.y, 0.0, 1.0));
    vec3 c = mix(vec3(0.18, 0.28, 0.48), vec3(0.72, 0.42, 0.28), uv.x);
    c = mix(c, vec3(0.52, 0.60, 0.36), step(0.55, uv.y) * 0.34);
    c = mix(c, vec3(0.82, 0.58, 0.36), ocAA(ocEllipse(p, vec2(0.72, 0.42), vec2(0.18, 0.22))) * 0.55);
    c += (ocVnoise(p * 38.0 + t * 0.15) - 0.5) * 0.045;
    return ocCap(ocFloor(c));
  }`,
});
