// ink: inked lines for painted 2D layers: isoInk(f, level, px) draws a constant-pixel line where a field crosses a level (cloud rims, shadow borders); jaggedInk(f, level, px, j, p) breaks it into tapered jagged clumps (MAPPA hair, cloud tips).
// (3D silhouettes are inked by the engine: hull lines and depth/id set lines in post.js.)
export default {
  name: "ink", doc: "constant-pixel ink lines on level sets of any 2D field, plain or jagged and tapered",
  deps: ["noise"],
  glsl: /* glsl */ `
  float isoInk(float f, float level, float px) { float w = fwidth(f) + 1e-6; return 1.0 - smoothstep(px * 0.5 - 0.5, px * 0.5 + 0.5, abs(f - level) / w); }
  // width breathes with noise along the line: thick clumps, thin tails, gaps where it tapers to 0
  float jaggedInk(float f, float level, float px, float jag, vec2 p) { float k = vn(p * jag) * 1.6 - 0.2; return isoInk(f, level, px * clamp(k, 0.0, 1.4)); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { float f = fbm(p * 4.0);
    vec3 c = mix(vec3(0.02), vec3(0.6, 0.06, 0.12), step(0.5, f));
    return mix(c, vec3(0.0), max(jaggedInk(f, 0.5, 4.0, 40.0, p), isoInk(f, 0.62, 1.5))); }`,
};
