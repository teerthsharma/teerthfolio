// ufotable plates and finish: painted night sky, desert dune plate, split-tone grade, grain on twos.
import { defineUfo } from "./define.js";

export const PLATE = [
  defineUfo("ufoNightSky", {
    doc: "painted night plate: flat navy zenith, four-step horizon ramp in the lowest 15 percent, three lightning-lit cloud bands",
    draws: "A deep blue night sky with three hard-edged cloud bands, each catching a thin blue rim on its upper edge, and a bruised brown glow stepping in at the horizon.",
    use: "plate", suits: "pr-highway-3244, pr-polychrom-79",
    params: "p: uv, y up; t: seconds, cloud drift held to twos; uUfoSkyHz: horizon height 0..1; uUfoFlash: 0..1 lightning lift on the clouds and rims.",
    uni: { uUfoSkyHz: 0.18, uUfoFlash: 0 },
    glsl: `vec3 ufoNightSky(vec2 p, float t) {
  float sky = clamp((p.y - uUfoSkyHz) / max(1.0 - uUfoSkyHz, 1e-3), 0.0, 1.0);
  float m = 1.0 - (ufoAA(sky, 0.035) + ufoAA(sky, 0.075) + ufoAA(sky, 0.115)) / 3.0;
  vec3 col = mix(UFO_NIGHT_TOP, UFO_NIGHT_LOW, m);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float drift = ufoHold(t, 12.0) * 0.01 * (1.0 + fi);
    float e = (ufoFbm(vec2(p.x * 2.2 + drift + fi * 3.1, fi * 5.0)) - 0.5) * 0.10;
    float d = (p.y - (0.58 + 0.13 * fi) - e) / 0.045;
    float body = ufoFill(abs(d) - 1.0);
    col = mix(col, mix(col, UFO_RIM * 0.55, 0.22 + 0.55 * uUfoFlash), body);
    col = mix(col, UFO_RIM, body * ufoAA(d, 0.45) * (0.55 + 0.40 * uUfoFlash));
  }
  return col;
}`,
    demo: `vec3 demo(vec2 p, float t) { return ufoOut(ufoNightSky(p, t)); }`,
  }),

  defineUfo("ufoDunePlate", {
    doc: "desert plate: thin pale sky band over sine dune strips in sand hi / mid / shadow with a jagged two-value shadow contour",
    draws: "A flat yellow desert in perspective strips, each dune a pale crest, a sand body and a jagged darker shadow edge, under a thin grey-green sky line.",
    use: "plate", suits: "pr-highway-3244",
    params: "p: uv, y up; uUfoDuneHz: horizon height 0..1 (0.87 then 0.82 in the packet); uUfoScroll: dune phase, drive from rig distance; uUfoSeed shifts the dune sines.",
    uni: { uUfoDuneHz: 0.84, uUfoScroll: 0 },
    glsl: `vec3 ufoDunePlate(vec2 p, float t) {
  float persp = max(uUfoDuneHz - p.y, 0.0) / max(uUfoDuneHz, 1e-3);
  float w = sqrt(persp + 0.02) * 8.0 + 0.35 * sin(p.x * 4.0 + uUfoSeed) + 0.18 * sin(p.x * 11.0 + 1.7) + uUfoScroll;
  float f = fract(w) + (ufoH(vec2(floor(p.x * 70.0), floor(w))) - 0.5) * 0.10;
  vec3 sand = mix(UFO_SAND, UFO_SAND_SH, ufoAA(f, 0.62));
  sand = mix(UFO_SAND_HI, sand, ufoAA(f, 0.14));
  vec3 sky = mix(vec3(0.659, 0.706, 0.678), vec3(0.616, 0.667, 0.659), ufoAA(p.y, uUfoDuneHz + 0.05));
  return mix(sand, sky, ufoAA(p.y, uUfoDuneHz));
}`,
    demo: `vec3 demo(vec2 p, float t) { return ufoOut(ufoDunePlate(p, t)); }`,
  }),

  defineUfo("ufoGrade", {
    doc: "split-tone grade: night shadow #0b0504 and high #95d0d5, or desert shadow #c9be8d and high #f9fb98, then ink floor and 0.92 cap",
    draws: "The whole picture takes a cool teal cast in the lights and a warm black in the darks, or a cream-yellow wash in the desert.",
    use: "grade", suits: "pr-highway-3244, pr-polychrom-79",
    params: "c: linear colour in; uUfoWorld: 0 night split-tone, 1 desert split-tone; uUfoSplit: 0..1 strength of the tint (0.25 default).",
    uni: { uUfoWorld: 0, uUfoSplit: 0.25 },
    glsl: `vec3 ufoGrade(vec3 c) {
  vec3 sh = mix(vec3(0.0431, 0.0196, 0.0157), vec3(0.7882, 0.7451, 0.5529), uUfoWorld);
  vec3 hi = mix(vec3(0.5843, 0.8157, 0.8353), vec3(0.9765, 0.9843, 0.5961), uUfoWorld);
  float L = ufoLuma(c);
  vec3 tone = mix(sh, hi, smoothstep(0.12, 0.78, L));
  return ufoOut(mix(c, tone * (L / max(ufoLuma(tone), 0.05)), uUfoSplit));
}`,
    demo: `vec3 demo(vec2 p, float t) { return ufoGrade(mix(vec3(0.15, 0.20, 0.50), vec3(0.85, 0.75, 0.55), clamp(p.y, 0.0, 1.0))); }`,
  }),

  defineUfo("ufoGrain", {
    doc: "film grain and paper tooth held on twos, strongest in the mid-tones, masked so it can sit on the sky only",
    draws: "A fine moving speckle and a faint paper tooth over the picture, jumping every second frame, quiet in the deepest darks and brightest lights.",
    use: "noise", suits: "pr-highway-3244, pr-polychrom-79",
    params: "c: colour in; p: uv; t: seconds, held to twos; mask: 0..1 where the grain applies (1 whole frame, 0 none); uUfoGrain: amplitude, 0.035 default.",
    uni: { uUfoGrain: 0.035 },
    glsl: `vec3 ufoGrain(vec3 c, vec2 p, float t, float mask) {
  float h = ufoHold(t, 12.0);
  float n = ufoH(floor(p * 700.0) + vec2(h * 37.0, h * 17.0)) - 0.5;
  float tooth = ufoVn(p * 90.0) - 0.5;
  float L = ufoLuma(c);
  float w = 0.45 + 0.55 * (1.0 - abs(L - 0.5) * 2.0);
  return max(c + (n + tooth * 0.4) * uUfoGrain * w * mask, UFO_INK);
}`,
    demo: `vec3 demo(vec2 p, float t) { return ufoOut(ufoGrain(mix(vec3(0.20, 0.28, 0.50), vec3(0.55, 0.50, 0.40), p.y), p, t, 1.0)); }`,
  }),
];
