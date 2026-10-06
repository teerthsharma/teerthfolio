// huegrade: the MAPPA single-hue grade: push the whole frame toward one dominant hue by value (dark -> mid -> light of that hue) while an accent mask keeps ONE saturated accent hue untouched.
//   accentMask(col, accentHue 0..1, width) -> 0..1; hueGrade(col, dark, mid, light, amount, keep)
export default {
  name: "huegrade", doc: "single-hue grade by value with one protected accent hue (MAPPA: crimson-black frame, cyan accent)",
  glsl: /* glsl */ `
  vec3 rgb2hsv(vec3 c) { vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y), e = 1e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }
  float accentMask(vec3 col, float hue, float width) { vec3 h = rgb2hsv(max(col, 0.0)); float d = abs(fract(h.x - hue + 0.5) - 0.5);
    return (1.0 - smoothstep(width * 0.5, width, d)) * smoothstep(0.2, 0.45, h.y); }
  vec3 hueGrade(vec3 col, vec3 dark, vec3 mid, vec3 light, float amount, float keep) {
    float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 g = L < 0.5 ? mix(dark, mid, L * 2.0) : mix(mid, light, min(L * 2.0 - 1.0, 1.0));
    keep = max(keep, smoothstep(0.9, 1.4, L));               // emissive is an accent by definition: it keeps its colour and blooms
    return mix(col, g, amount * (1.0 - keep)); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 c = vec3(0.5 + 0.5 * sin(p.x * 9.0 + vec3(0.0, 2.0, 4.0)));
    float k = accentMask(c, 0.5, 0.08);
    return p.y > 0.5 ? c : hueGrade(c, vec3(0.01, 0.0, 0.01), vec3(0.35, 0.02, 0.07), vec3(1.0, 0.75, 0.78), 1.0, k); }`,
};
