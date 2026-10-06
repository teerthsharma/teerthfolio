// veins: veined smoke: thin branching filaments of blood-mist or cursed energy, the edges of a twice domain-warped Voronoi field, with a soft halo over a faint smoke body.
//   veins(p, scale, warpK, seed) -> vec2(x: vein intensity 0..1+, y: smoke body 0..1); colour and blur it yourself
export default {
  name: "veins", doc: "veined smoke: thin branching blood-mist filaments (edges of a twice-warped Voronoi field) with a soft halo and smoke body",
  deps: ["noise"],
  glsl: /* glsl */ `
  vec2 veins(vec2 p, float scale, float warpK, float seed) {
    vec2 q = warp(p * scale + seed, warpK);
    q = warp(q * 1.2 + 4.1, warpK * 0.5);                          // two warps: the flowing, curling look
    float e1 = vor(q).y, e2 = vor(q * 2.1 + 7.0).y;                 // warped Voronoi edges: a branching network
    float body = smoothstep(0.3, 0.7, fbm(p * scale * 0.5 + seed * 1.7));
    float core = 1.0 - smoothstep(0.0, 0.05, e1), fine = (1.0 - smoothstep(0.0, 0.04, e2)) * 0.5, halo = (1.0 - smoothstep(0.0, 0.3, e1)) * 0.22;
    return vec2((core + fine * body + halo) * body, body); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec2 v = veins(p + vec2(t * 0.01, 0.0), 2.2, 1.1, 3.0);
    return vec3(0.004, 0.0, 0.002) + vec3(0.06, 0.0, 0.01) * v.y + vec3(0.9, 0.03, 0.08) * v.x; }`,
};
