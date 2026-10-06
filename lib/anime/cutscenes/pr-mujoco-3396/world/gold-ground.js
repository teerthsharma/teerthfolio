// GOLD-GROUND PLASTER sheet behind the triptych. Egg-tempera intonaco + gold leaf, not brown stone.
// Baked card: paint(p), p.x in [0, asp], p.y in [0, 1]. The 3 s lens reads this as the Wall, not a banner field.
//
// MATHS
//   plaster = mix(paper #d4c4b0, cream #efe4cf, fbm(p*5)). Leaf = mix(goldA, goldB, fbm(p*16)).
//   field = mix(plaster, leaf, 0.62 + 0.2 * (fbm(p*2.2) - 0.5)).
//   craquelure: 1 - smoothstep(0, 1.7 fwidth(F2-F1), vor(p*5.5).y). Spolvero: 6 px dots on shade.
//   luma cap 0.92. Compose noise + grunge + cel.
// TOOLKIT: noise, cel, grunge.

export const GROUND_TOOLS = ["noise", "cel", "grunge"];

export const meta = {
  name: "fresco-plaster",
  params: {
    paper: { def: "#d4c4b0" },
    plaster: { def: "#efe4cf" },
    gold: { def: "#d4a017" },
    lumaMax: { def: 0.92 },
  },
};

export function goldGroundGLSL() {
  return /* glsl */ `
  const vec3 PAPER = vec3(0.8314, 0.7686, 0.6902);
  const vec3 PLASTER = vec3(0.9373, 0.8941, 0.8118);
  const vec3 GOLD_A = vec3(0.7216, 0.5176, 0.1804);
  const vec3 GOLD_B = vec3(0.8941, 0.7059, 0.3216);
  const vec3 SEPIA = vec3(0.3529, 0.2314, 0.1333);
  const vec3 VIOLET = vec3(0.3569, 0.3098, 0.4353);

  vec3 capLuma(vec3 c) {
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * min(1.0, 0.920 / max(Y, 1e-4));
  }
  vec4 paint(vec2 p) {
    float plasterN = fbm(p * 5.0);
    vec3 plaster = mix(PAPER, PLASTER, plasterN);
    plaster *= grunge2(p * 3.2, 0.32, 0.22);
    float leafN = fbm(p * 16.0 + 2.4);
    vec3 leaf = mix(GOLD_A, GOLD_B, smoothstep(0.30, 0.72, leafN));
    float gild = celStep(fbm(p * 2.2), 0.46);
    vec3 col = mix(plaster, leaf, 0.58 + 0.22 * gild);
    vec2 vc = vor(p * 5.5);
    float cr = 1.0 - smoothstep(0.0, max(0.022, fwidth(vc.y) * 1.7), vc.y);
    col = mix(col, SEPIA, cr * 0.38);
    col = mix(col, VIOLET, (1.0 - plasterN) * 0.08);
    vec2 g = fract(p * 72.0) - 0.5;
    float dots = 1.0 - smoothstep(0.16, 0.23, length(g));
    col = mix(col, SEPIA, dots * cr * 0.28);
    float frame = min(min(p.y, 1.0 - p.y), min(p.x / 2.2, 1.0 - p.x / 2.2));
    col = mix(col, SEPIA, (1.0 - smoothstep(0.012, 0.04, frame)) * 0.4);
    return vec4(capLuma(col), 1.0);
  }`;
}
