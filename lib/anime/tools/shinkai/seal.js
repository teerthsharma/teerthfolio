// Seal family: two-value hue-shifted cel ramp, thin coloured line with sun-side rim, dark eye with two highlights.
import { Vector2, Vector3 } from "three";
import { defineModule } from "./define.js";

const SKY = ["shinKit", "shinTwilightSky"];

export const SEAL = [
  defineModule({
    name: "shinCelSeal",
    doc: "two-value cel ramp for a seal coat: hard step at N.L 0, shade shifted toward periwinkle #6a78d8, gentle gradient on the lit side",
    deps: SKY,
    uniforms: () => ({ uShinKey: { value: new Vector3(-0.3, 0.45, 0.84).normalize() } }),
    draws: "a blue-grey seal body shaded in two flat values with a cool periwinkle shade side and a soft lit gradient, no hatching.",
    use: "surface",
    params: "uShinKey: unit light direction in view space; shnCelSeal(nl, coat) takes N.L and the coat colour.",
    glsl: /* glsl */ `
uniform vec3 uShinKey;
vec3 shnCelSeal(float nl, vec3 coat) {
  vec3 tc = shnC(106.0, 120.0, 216.0);
  tc *= max(shnLuma(coat), 1e-3) / max(shnLuma(tc), 1e-3);
  vec3 shade = mix(coat * 0.72, tc * 0.82, 0.5);
  vec3 lit = coat * (0.80 + 0.20 * smoothstep(0.0, 0.9, nl) + 0.10 * max(nl, 0.0));
  return shnCap(mix(shade, lit, shnAA(nl, 0.0)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) {
  vec2 c = (p - vec2(0.8, 0.5)) / 0.32;
  float z2 = 1.0 - dot(c, c);
  vec3 bg = shnSky(p, 0.0);
  if (z2 <= 0.0) return bg;
  return shnCelSeal(dot(vec3(c, sqrt(z2)), uShinKey), shnC(124.0, 147.0, 189.0));
}`,
  }),

  defineModule({
    name: "shinLineRim",
    doc: "thin even coloured line #31233b and a hard peach rim #ffc08a on the sun side, mixed half with the sky colour behind",
    deps: SKY,
    uniforms: () => ({ uShinSunDir: { value: new Vector2(0.0, 0.3).normalize() } }),
    draws: "a thin even dark-violet outline around a figure with one hard peach rim band on the edge facing the sun.",
    use: "line",
    params: "uShinSunDir: screen direction toward the sun; shnSealEdge(d, n, col, sky) takes the signed distance (negative inside), outward normal, fill colour and sky colour behind.",
    glsl: /* glsl */ `
uniform vec2 uShinSunDir;
vec3 shnSealEdge(float d, vec2 n, vec3 col, vec3 sky) {
  float side = shnAA(dot(n, uShinSunDir), 0.5);
  float band = (1.0 - shnAA(d + 0.018, 0.0)) * shnAA(d, -0.018) * side;
  col = mix(col, mix(shnC(255.0, 192.0, 138.0), sky, 0.5), band * 0.8);
  float w = fwidth(d) + 1e-6;
  float ink = 1.0 - smoothstep(0.8 * w, 1.7 * w, abs(d));
  return mix(col, shnC(49.0, 35.0, 59.0), ink);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) {
  vec2 q = (p - vec2(0.8, 0.5)) / vec2(0.34, 0.20);
  float d = (length(q) - 1.0) * 0.20;
  vec3 bg = shnSky(p, 0.0);
  vec3 body = mix(bg, shnC(124.0, 147.0, 189.0), 1.0 - shnAA(d, 0.0));
  return shnSealEdge(d, normalize(q + 1e-5), body, bg);
}`,
  }),

  defineModule({
    name: "shinEye",
    doc: "seal eye: dark brown iris #3a2a2c with a warm lower half #6a4a44, thin upper lid line, one big and one small highlight, blink uniform",
    deps: SKY,
    uniforms: () => ({ uShinBlink: { value: 0 } }),
    draws: "a big dark brown eye with a warmer lower half, a thin lid line above it and two cream highlights, closing under the lid on a blink.",
    use: "card",
    params: "uShinBlink: 0 open to 1 closed; shnEye(q, base) takes eye-local coordinates (iris about 1 unit wide) and the face colour behind.",
    glsl: /* glsl */ `
uniform float uShinBlink;
vec3 shnEye(vec2 q, vec3 base) {
  float lidY = 0.42 - 0.2 * q.x * q.x - 1.0 * uShinBlink;
  float below = 1.0 - shnAA(q.y - lidY, 0.0);
  float iris = 1.0 - shnAA(length(q / vec2(0.5, 0.58)), 1.0);
  vec3 c = mix(shnC(58.0, 42.0, 44.0), shnC(106.0, 74.0, 68.0), shnAA(-q.y, 0.12));
  c = mix(c, shnC(28.0, 22.0, 24.0), 1.0 - shnAA(length(q / vec2(0.2, 0.26)), 1.0));
  c = mix(c, shnC(235.0, 225.0, 215.0), (1.0 - shnAA(length(q - vec2(-0.16, 0.18)), 0.15)) * 0.98);
  c = mix(c, shnC(235.0, 225.0, 215.0), (1.0 - shnAA(length(q - vec2(0.17, -0.2)), 0.07)) * 0.98);
  vec3 o = mix(base, c, iris * below);
  float w = fwidth(q.y - lidY) + 1e-6;
  return mix(o, shnC(42.0, 32.0, 48.0), (1.0 - smoothstep(0.8 * w, 1.7 * w, abs(q.y - lidY))) * (1.0 - shnAA(abs(q.x), 0.7)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnEye((p - vec2(0.8, 0.5)) / 0.22, shnC(124.0, 147.0, 189.0)); }`,
  }),
];
