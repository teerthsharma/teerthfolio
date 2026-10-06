// grade: the finishing stack of a frame as functions: gradient map by value, film grain (luma-weighted, two scales), IGN grain, vignette.
//   gradientMap(col, shadow, mid, light); filmGrain(col, fc, seed, amount); ign(fc, seed); vignette(col, uv, k)
export default {
  name: "grade", doc: "gradient map by value, luma-weighted film grain, IGN grain and vignette",
  glsl: /* glsl */ `
  vec3 gradientMap(vec3 col, vec3 a, vec3 b, vec3 c) { float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
    return L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0); }
  float ign(vec2 fc, float seed) { return fract(52.9829189 * fract(dot(fc + seed * 5.588238, vec2(0.06711056, 0.00583715)))); }
  float grainHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 filmGrain(vec3 col, vec2 fc, float seed, float amount) { // silver grain: strongest in the mids, clumped at two scales
    float g = (grainHash(fc + seed) - 0.5) * 0.7 + (grainHash(floor(fc / 2.0) + seed * 1.7) - 0.5) * 0.3;
    float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
    return max(col + g * amount * (0.25 + 4.0 * L * (1.0 - L)), 0.0); }
  vec3 vignette(vec3 col, vec2 uv, float k) { vec2 d = uv - 0.5; return col * (1.0 - k * dot(d, d) * 2.0); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec2 uv = vec2(p.x / 1.44, p.y);
    vec3 c = gradientMap(vec3(uv.x), vec3(0.02, 0.0, 0.05), vec3(0.6, 0.05, 0.1), vec3(1.0, 0.85, 0.7));
    if (uv.y < 0.5) c = filmGrain(c, gl_FragCoord.xy, floor(t * 12.0), 0.25);
    return vignette(c, uv, 0.9); }`,
};
