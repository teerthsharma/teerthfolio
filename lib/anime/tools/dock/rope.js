// Rope / net / hatch lines — 5 operators on the same pier tackle.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockRopeCoil",
    doc: "coiled rope: polar spiral SDF, hemp from C.wood, fwidth lay",
    glsl: /* glsl */ `
    vec3 dockRopeCoil(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.48), q = p - c;
      float a = atan(q.y, q.x), r = length(q);
      float spiral = abs(r - 0.04 - 0.018 * (a + 3.14159 + t * 0.05)) - 0.012;
      vec3 col = mix(DK_DUSK, DK_WOOD, 0.15);
      col = mix(col, DK_ROPE, dkFill(spiral));
      float lay = 0.5 + 0.5 * sin(a * 14.0 + r * 40.0);
      col = mix(col, DK_WET, dkFill(spiral) * lay * 0.35);
      col = mix(col, DK_INK, dkLine(spiral, 1.3) * 0.45);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockRopeCoil(p, t); }`,
  }),
  defineModule({
    name: "dockNetMesh",
    doc: "fishing net: diamond grid with sag, knots at crossings",
    glsl: /* glsl */ `
    vec3 dockNetMesh(vec2 p, float t) {
      float sag = 0.04 * sin(p.x * 3.2) * (1.0 - p.y);
      vec2 q = vec2(p.x, p.y + sag);
      vec2 dmd = abs(fract((q.x + q.y) * 9.0) - 0.5);
      vec2 dmd2 = abs(fract((q.x - q.y) * 9.0) - 0.5);
      float mesh = min(dmd.x, dmd2.x) - 0.04;
      vec2 gv = floor(q * 9.0);
      float knot = length(fract(q * 9.0) - 0.5) - 0.06;
      vec3 col = mix(DK_SEA, DK_DUSK, clamp(p.y, 0.0, 1.0));
      col = mix(col, DK_ROPE, dkFill(mesh) * 0.85);
      col = mix(col, DK_WET, dkFill(knot) * 0.7);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockNetMesh(p, t); }`,
  }),
  defineModule({
    name: "dockHatchLines",
    doc: "hatch lines: drawn diagonal screen on wet deck, pitch in plank space",
    glsl: /* glsl */ `
    vec3 dockHatchLines(vec2 p, float t) {
      vec3 col = mix(DK_WET, DK_WOOD, dkGrain(p) * 0.5);
      float h = (p.x - p.y) * 28.0;
      float g = min(fract(h), 1.0 - fract(h));
      float w = fwidth(h) + 1e-5;
      float hatch = 1.0 - smoothstep(0.08, 0.08 + w * 1.2, g);
      col = mix(col, DK_INK, hatch * 0.45);
      col = mix(col, DK_TAR, dkFill(dkPlankGap(p)) * 0.7);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockHatchLines(p, t); }`,
  }),
  defineModule({
    name: "dockRopeLay",
    doc: "rope lay: helical twist along a cable between two bollards",
    glsl: /* glsl */ `
    vec3 dockRopeLay(vec2 p, float t) {
      vec2 a = vec2(0.18, 0.62), b = vec2(1.22, 0.40);
      vec2 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      vec2 n = normalize(vec2(-ba.y, ba.x));
      float d = length(pa - ba * h);
      float twist = 0.5 + 0.5 * sin(h * 48.0 + t * 0.2);
      float r = 0.016 + 0.006 * twist;
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      col = mix(col, mix(DK_ROPE, DK_WET, twist * 0.4), dkFill(d - r));
      col = mix(col, DK_INK, dkLine(d - r, 1.3) * 0.5);
      col = mix(col, DK_WOOD, dkFill(length(p - a) - 0.03) + dkFill(length(p - b) - 0.03));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockRopeLay(p, t); }`,
  }),
  defineModule({
    name: "dockNetSag",
    doc: "sagging net: catenary between posts, diamond fill hanging in the gap",
    glsl: /* glsl */ `
    vec3 dockNetSag(vec2 p, float t) {
      float x0 = 0.28, x1 = 1.12, y0 = 0.70;
      float u = clamp((p.x - x0) / (x1 - x0), 0.0, 1.0);
      float cat = y0 - 0.22 * (1.0 - 4.0 * (u - 0.5) * (u - 0.5));
      float hang = p.y - cat;
      vec2 q = vec2(p.x, hang);
      float mesh = min(abs(fract((q.x + q.y) * 11.0) - 0.5), abs(fract((q.x - q.y) * 11.0) - 0.5)) - 0.035;
      vec3 col = mix(DK_SEA, DK_DUSK, clamp(p.y * 0.9, 0.0, 1.0));
      float inNet = dkFill(-hang) * dkBand(p.x, x0, x1);
      col = mix(col, DK_ROPE, inNet * dkFill(mesh) * 0.85);
      col = mix(col, DK_HULL, dkFill(dkPilingField(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockNetSag(p, t); }`,
  }),
];
