// brushgrass: a non-repeating field of painted grass strokes for 2D plates. Strokes are scattered (one per jittered
// cell, a 3x3 search so long strokes cross cells), each a tapered blade with its own length, width, angle and value;
// three layers at different scales are laid back to front. The caller paints VALUE MASSES first and passes them in;
// the strokes only modulate them (root darker, tip catching the light), the way a BG painter works.
//   brushGrass(p, size, ang, seed) -> vec3(tone 0 root..1 tip, coverage 0..1, stroke random 0..1)
//   p: plate units; size: stroke length in p units; ang: lean from vertical (rad, + = right); seed: layer seed.
//   grassLayers(p, size, ang) -> the three layers composited (size, size*0.7, size*0.5).
export default {
  name: "brushgrass", doc: "non-repeating painted grass strokes: scattered tapered blades, 3 layers, each with its own size, lean and value",
  deps: ["noise"],
  glsl: /* glsl */ `
  vec3 brushGrass(vec2 p, float size, float ang, float seed) {
    vec2 g = p / (size * vec2(0.38, 0.55));
    float fw = length(fwidth(p));                                        // outside the loop: derivatives need uniform flow
    vec2 c = floor(g);
    vec3 acc = vec3(0.0, 0.0, 0.5);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 cc = c + vec2(i, j);
      vec2 r = h22(cc + seed * 13.1), r2 = h22(cc + seed * 7.7 + 31.0);
      if (r2.y < 0.15) continue;                                         // gaps: not every cell grows a stroke
      vec2 base = (cc + r) * size * vec2(0.38, 0.55);
      float a = ang + (r2.x - 0.5) * 0.7 + 0.25 * (vn(base * 3.0) - 0.5);
      float len = size * (0.6 + 0.8 * r.y * r.x), wid = size * (0.08 + 0.09 * r2.y);
      vec2 d = p - base, ax = vec2(sin(a), cos(a));
      float t = dot(d, ax) / len;
      if (t < 0.0 || t > 1.0) continue;
      float bend = 0.18 * len * t * t * sign(a + 1e-3);                   // tips droop with the lean
      float s = abs(dot(d, vec2(ax.y, -ax.x)) + bend) / (wid * (1.0 - t * 0.92));
      float aa = fw / (wid * (1.0 - t * 0.92)) + 0.02;
      float cov = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, s);
      acc = mix(acc, vec3(t, 1.0, h21(cc + seed)), cov);
    }
    return acc;
  }
  vec3 grassLayers(vec2 p, float size, float ang) {
    vec3 a = brushGrass(p, size, ang, 1.0);
    vec3 b = brushGrass(p + 0.37, size * 0.7, ang + 0.1, 2.0);
    vec3 c = brushGrass(p + 0.71, size * 0.5, ang - 0.05, 3.0);
    vec3 o = a; o = mix(o, b, b.y); o = mix(o, c, c.y);
    o.y = max(a.y, max(b.y, c.y));
    return o;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    float mass = fbm(p * 2.5);                                      // value masses first
    vec3 g = grassLayers(p, mix(0.09, 0.03, p.y), 0.35);
    float v = mass + (g.x - 0.5) * 0.5 * g.y - (1.0 - g.y) * 0.1;
    return mix(vec3(0.06, 0.12, 0.04), mix(vec3(0.2, 0.36, 0.1), vec3(0.85, 0.8, 0.35), smoothstep(0.5, 0.85, v)), smoothstep(0.2, 0.55, v)); }`,
};
