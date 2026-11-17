// ufotable effects: emissive bloom, stepped bolt, Gate ripple wall, steel weapon card, Enuma wind.
import { defineUfo } from "./define.js";

const S = "pr-highway-3244, pr-polychrom-79";

export const FX = [
  defineUfo("ufoBloom", {
    doc: "bloom from an emissive shape only: gaussian halo plus a wide skirt, then a soft knee that keeps the sum under white",
    draws: "A gold disc with a thick warm glow round it that fades smoothly into the night and never burns out to pure white.",
    use: "screen", suits: S,
    params: "base: colour under the glow; glow: emissive colour; d: signed distance to the emissive shape; r: halo radius in d units; uUfoBloomK: halo strength, 1 default.",
    uni: { uUfoBloomK: 1 },
    glsl: `vec3 ufoKnee(vec3 c) {
  float L = ufoLuma(c);
  float k = L < 0.70 ? L : 0.70 + 0.22 * (1.0 - exp(-(L - 0.70) / 0.22));
  return c * (k / max(L, 1e-4));
}
vec3 ufoBloom(vec3 base, vec3 glow, float d, float r) {
  float dd = max(d, 0.0);
  float halo = exp(-dd / max(r, 1e-4)) * 0.55 + exp(-dd / max(r * 4.0, 1e-4)) * 0.25;
  vec3 c = base + glow * (halo * uUfoBloomK);
  return ufoKnee(mix(c, glow, 1.0 - ufoAA(d, 0.0)));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec2 q = p - vec2(0.8, 0.5);
  return ufoOut(ufoBloom(UFO_NIGHT_TOP * 0.8, UFO_GOLD, length(q) - 0.05, 0.05));
}`,
  }),

  defineUfo("ufoBolt", {
    doc: "stepped lightning: polyline jag redrawn on twos, bolt-white core, cyan body, purple edge band, three flat widths",
    draws: "A jagged vertical lightning bolt with a near-white core, a cyan body and a purple outer band, each a hard flat width, redrawn every second frame.",
    use: "screen", suits: "pr-highway-3244",
    params: "p: uv; a, b: bolt start and end; t: seconds, jag held to twos, the seed uUfoSeed picks the shape; uUfoBoltAmp: sideways jag amplitude in uv, 0.05 default. Returns rgb and coverage.",
    uni: { uUfoBoltAmp: 0.05 },
    glsl: `vec4 ufoBolt(vec2 p, vec2 a, vec2 b, float t) {
  vec2 ab = b - a;
  float L2 = max(dot(ab, ab), 1e-5);
  float sr = dot(p - a, ab) / L2;
  float s = clamp(sr, 0.0, 1.0);
  vec2 n = normalize(vec2(-ab.y, ab.x));
  float h = ufoHold(t, 12.0);
  float x = s * 14.0;
  float k = floor(x);
  float off = mix(ufoH(vec2(k, h + 1.7)), ufoH(vec2(k + 1.0, h + 1.7)), fract(x)) - 0.5;
  float cd = abs(dot(p - a, n) - off * uUfoBoltAmp * 2.0 * sin(3.14159265 * s)) / mix(1.0, 0.45, s);
  vec3 col = mix(UFO_PURPLE, UFO_CYAN, ufoFill(cd - 0.0075));
  col = mix(col, UFO_BOLT, ufoFill(cd - 0.0026));
  return vec4(col, ufoFill(cd - 0.018) * ufoAA(sr, 0.0) * (1.0 - ufoAA(sr, 1.0)));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec4 b = ufoBolt(p, vec2(1.2, 0.97), vec2(1.05, 0.12), t);
  return ufoOut(mix(mix(UFO_NIGHT_TOP, UFO_NIGHT_LOW, 1.0 - p.y) * 0.8, b.rgb, b.a));
}`,
  }),

  defineUfo("ufoGateWall", {
    doc: "Gate of Babylon wall: three layers of flat gold ripple discs on a jittered grid, concentric ring bands, no ink line",
    draws: "A wall of round gold portals in three sizes, each a pale core inside bands of gold rings with an orange edge on one side, spaced wide apart so they never form a carpet.",
    use: "plate", suits: "pr-polychrom-79",
    params: "p: uv, y up; t: seconds, rings turn on twos; uUfoGateR: near-layer radius in uv (0.065 is 0.13 H diameter); uUfoGateX: x beyond which no portal is drawn. Mid and far layers are 0.69 and 0.42 of that radius. Returns rgb and coverage.",
    uni: { uUfoGateR: 0.065, uUfoGateX: 1.05 },
    glsl: `vec4 ufoGateRipple(vec2 q, float t) {
  float r = length(q);
  float ring = ufoAA(fract(r * 3.0 - ufoHold(t, 12.0) * 0.5), 0.5);
  vec3 col = mix(UFO_GOLD * 0.88, UFO_GOLD, ring);
  col = mix(col, UFO_CORE, 1.0 - ufoAA(r, 0.30));
  col = mix(col, UFO_ORANGE, ufoAA(r, 0.78) * ufoAA(dot(q, vec2(-0.6, -0.8)), 0.0));
  return vec4(col, ufoFill(r - 1.0));
}
vec4 ufoGateWall(vec2 p, float t) {
  vec4 acc = vec4(0.0);
  for (int L = 0; L < 3; L++) {
    float fl = float(2 - L);
    float R = uUfoGateR * (fl < 0.5 ? 1.0 : (fl < 1.5 ? 0.69 : 0.42));
    float cell = R * 5.4;
    vec2 id0 = floor(p / cell);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 id = id0 + vec2(float(i), float(j));
        vec2 c = (id + 0.5 + (vec2(ufoH(id + fl * 17.0), ufoH(id + fl * 29.0 + 5.0)) - 0.5) * 0.5) * cell;
        float on = step(0.35, ufoH(id + fl * 41.0 + 2.0)) * (1.0 - ufoAA(c.x, uUfoGateX));
        vec4 rp = ufoGateRipple((p - c) / (R * (0.8 + 0.25 * ufoH(id + 9.0))), t + ufoH(id) * 3.0);
        float a = rp.a * on;
        acc.rgb = mix(acc.rgb, rp.rgb, a);
        acc.a = max(acc.a, a);
      }
    }
  }
  return acc;
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec4 g = ufoGateWall(p, t);
  return ufoOut(mix(mix(vec3(0.48, 0.05, 0.04), vec3(0.71, 0.17, 0.12), 1.0 - p.y), g.rgb, g.a));
}`,
  }),

  defineUfo("ufoWeaponCard", {
    doc: "steel weapon card from an SDF: sword, spear or axe in a hard three-band ramp with a gold collar or guard",
    draws: "A single straight steel blade, spear or axe in three flat tones, pale along its lit edge and near-black on the other, with a gold guard where the blade meets the grip.",
    use: "card", suits: "pr-polychrom-79",
    params: "q: card-local coordinates, weapon runs along +x from 0 to 1, y across; kind: 0 sword, 1 spear, 2 axe, keep it constant for one draw. Returns rgb and coverage.",
    glsl: `vec4 ufoWeaponCard(vec2 q, float kind) {
  float k = mod(floor(kind + 0.5), 3.0);
  float d = 1.0, across = 0.0, gold = 0.0;
  if (k < 0.5) {
    float w = 0.085 * (1.0 - 0.8 * clamp(q.x, 0.0, 1.0));
    float g = min(max(abs(q.x + 0.02) - 0.03, abs(q.y) - 0.22), max(abs(q.x + 0.16) - 0.13, abs(q.y) - 0.035));
    d = min(max(abs(q.y) - w, max(-q.x, q.x - 1.0)), g);
    across = q.y / max(w, 1e-3);
    gold = ufoFill(g);
  } else if (k < 1.5) {
    float u = clamp((q.x - 0.55) / 0.45, 0.0, 1.0);
    float wh = 0.08 * (1.0 - pow(abs(2.0 * u - 1.0), 2.0));
    float head = max(abs(q.y) - wh, max(0.55 - q.x, q.x - 1.0));
    float collar = max(abs(q.x - 0.53) - 0.03, abs(q.y) - 0.03);
    d = min(min(head, max(abs(q.y) - 0.014, max(-0.6 - q.x, q.x - 0.6))), collar);
    across = q.y / max(wh, 0.02);
    gold = ufoFill(collar);
  } else {
    vec2 e = vec2(0.20, 0.17);
    float head = max(length((q - vec2(0.55, 0.13)) / e) - 1.0, 1.0 - length((q - vec2(0.46, 0.13)) / e)) * 0.17;
    float collar = max(abs(q.x - 0.40) - 0.03, abs(q.y) - 0.035);
    d = min(min(head, max(abs(q.y) - 0.016, max(-0.5 - q.x, q.x - 0.7))), collar);
    across = (q.y - 0.13) / 0.17;
    gold = ufoFill(collar);
  }
  vec3 col = mix(mix(UFO_STEEL_DEEP, UFO_STEEL_MID, ufoAA(across, -0.35)), UFO_STEEL_LIT, ufoAA(across, 0.35));
  return vec4(mix(col, UFO_GOLD * 0.9, gold), ufoFill(d));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec4 w = ufoWeaponCard((p - vec2(0.5, 0.5)) * 2.0, mod(floor(t), 3.0));
  return ufoOut(mix(vec3(0.48, 0.05, 0.04), w.rgb, w.a));
}`,
  }),

  defineUfo("ufoEnumaWind", {
    doc: "Enuma Elish wind: a logarithmic spiral of hard red arms turning on twos, hotter at the core, fading to nothing at the rim",
    draws: "A red spiral of five hard-edged arms whirling out from a point, deep crimson in the middle and a lighter red outward, turning in steps.",
    use: "screen", suits: "pr-polychrom-79",
    params: "q: coordinates centred on the spiral, outer radius 1; t: seconds, rotation held to twos; uUfoArms: arm count, an integer (5); uUfoTwist: spiral tightness (6). Returns rgb and coverage.",
    uni: { uUfoArms: 5, uUfoTwist: 6 },
    glsl: `vec4 ufoEnumaWind(vec2 q, float t) {
  float r = length(q);
  float ph = atan(q.y, q.x) * uUfoArms / 6.2831853 + log(r + 0.05) * uUfoTwist / 6.2831853 - ufoHold(t, 12.0) * 0.25;
  float arm = ufoAA(0.5 + 0.5 * sin(ph * 6.2831853), 0.6);
  vec3 col = mix(UFO_RED, UFO_RED_HOT, 1.0 - ufoAA(r, 0.35));
  return vec4(col, arm * 0.85 * ufoAA(r, 0.05) * (1.0 - ufoAA(r, 1.0)));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec4 w = ufoEnumaWind((p - vec2(0.8, 0.5)) / 0.45, t);
  return ufoOut(mix(vec3(0.30, 0.04, 0.03), w.rgb, w.a));
}`,
  }),
];
