// Sky and plate family: painted twilight ramp with night lerp and stars, little clouds, sea of clouds.
import { Vector2 } from "three";
import { defineModule } from "./define.js";

export const SKY = [
  defineModule({
    name: "shinTwilightSky",
    doc: "six-stop measured twilight ramp #264670 to #f0d1c5, painted dab banding, horizon cream band, sun disc, night lerp with stars",
    uniforms: () => ({ uShinSun: { value: new Vector2(0.8, 0.31) }, uShinNight: { value: 0 } }),
    draws: "a violet-blue sky banded in painted steps that warms to a cream horizon, with a small pale sun disc, cooling to a starry night blue on demand.",
    use: "plate",
    params: "uShinSun: sun position in height units (disc, cream band centre, sea sun path); uShinNight: 0 twilight, 1 night with stars.",
    glsl: /* glsl */ `
uniform vec2 uShinSun;
uniform float uShinNight;
vec3 shnSkyDay(float h) {
  vec3 c = shnC(38.0, 70.0, 112.0);
  c = mix(c, shnC(46.0, 88.0, 144.0), shnSeg(h, 0.0, 0.15));
  c = mix(c, shnC(84.0, 95.0, 171.0), shnSeg(h, 0.15, 0.30));
  c = mix(c, shnC(144.0, 116.0, 178.0), shnSeg(h, 0.30, 0.45));
  c = mix(c, shnC(205.0, 168.0, 189.0), shnSeg(h, 0.45, 0.60));
  return mix(c, shnC(240.0, 209.0, 197.0), shnSeg(h, 0.60, 0.69));
}
vec3 shnSkyNight(float h) {
  vec3 c = mix(shnC(12.0, 20.0, 72.0), shnC(20.0, 30.0, 92.0), shnSeg(h, 0.0, 0.35));
  return mix(c, shnC(45.0, 86.0, 160.0), shnSeg(h, 0.35, 0.69));
}
vec3 shnSky(vec2 p, float night) {
  float h = 1.0 - p.y;
  h += 0.012 * (shnFbm(vec2(p.x * 22.0, h * 60.0)) - 0.5);
  h = shnPaint(h, 20.0);
  vec3 c = mix(shnSkyDay(h), shnSkyNight(h), night);
  float g = exp(-pow((p.y - 0.27) / 0.09, 2.0)) * exp(-pow((p.x - uShinSun.x) / 1.1, 2.0));
  c = mix(c, shnC(240.0, 203.0, 194.0), 0.45 * shnPaint(g, 5.0) * (1.0 - night));
  c = mix(c, shnC(255.0, 238.0, 214.0), (1.0 - shnAA(length(p - uShinSun), 0.018)) * (1.0 - night));
  vec2 sg = p * 60.0, ci = floor(sg);
  vec2 f = fract(sg) - 0.5 - (vec2(shnH(ci + 3.7), shnH(ci + 8.1)) - 0.5) * 0.6;
  float star = step(0.985, shnH(ci)) * (1.0 - shnAA(length(f), 0.16));
  c = mix(c, shnC(200.0, 216.0, 255.0), star * 0.55 * smoothstep(0.62, 0.80, p.y) * night);
  return shnCap(c);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnSky(p, uShinNight); }`,
  }),

  defineModule({
    name: "shinCloudPaint",
    doc: "little painted clouds in a horizontal band: hard silhouette, lit pink base #d0a0b6, mid, violet shade #b87ba8",
    deps: ["shinKit", "shinTwilightSky"],
    uniforms: () => ({ uShinCloudY: { value: 0.36 }, uShinDrift: { value: 0.05 } }),
    draws: "a low strip of small flat clouds with violet tops and pink underlit bellies, drifting slowly across the dusk sky.",
    use: "plate",
    params: "uShinCloudY: height of the cloud band; uShinDrift: sideways drift speed in noise units per second.",
    glsl: /* glsl */ `
uniform float uShinCloudY;
uniform float uShinDrift;
float shnCloudM(vec2 q, float band) { return band * smoothstep(0.55, 0.70, shnFbm(q)); }
vec3 shnCloud(vec2 p, float t, vec3 base) {
  float band = exp(-pow((p.y - uShinCloudY) / 0.035, 2.0));
  vec2 q = vec2(p.x * 14.0 + t * uShinDrift, p.y * 40.0);
  float body = shnAA(shnCloudM(q, band), 0.30);
  float lit = body * (1.0 - shnAA(shnCloudM(q - vec2(0.0, 0.7), band), 0.30));
  float mid = body * (1.0 - shnAA(shnCloudM(q - vec2(0.0, 1.6), band), 0.30));
  vec3 c = mix(shnC(184.0, 123.0, 168.0), shnC(197.0, 137.0, 184.0), mid);
  c = mix(c, shnC(208.0, 160.0, 182.0), lit);
  return mix(base, c, body);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnCloud(p, t, shnSky(p, 0.0)); }`,
  }),

  defineModule({
    name: "shinCloudSea",
    doc: "sea of clouds: rolling mound edge, three painted tone bands #eab2bc to #b87ba8, sun path brightening under the sun",
    deps: ["shinKit", "shinTwilightSky"],
    uniforms: () => ({ uShinSeaTop: { value: 0.30 } }),
    draws: "a pink-violet sea of clouds filling the lower frame with soft mounds, brighter in a path beneath the sun.",
    use: "plate",
    params: "uShinSeaTop: height of the cloud-sea edge; the sun path follows uShinSun.x.",
    glsl: /* glsl */ `
uniform float uShinSeaTop;
vec3 shnSea(vec2 p, float t, vec3 base) {
  float x = p.x + t * 0.01;
  float edge = uShinSeaTop + 0.012 * sin(23.0 * x) + 0.03 * exp(-pow((x - 0.45) / 0.22, 2.0)) + 0.022 * exp(-pow((x - 1.15) / 0.18, 2.0)) + 0.008 * (shnFbm(vec2(x * 9.0, 3.0)) - 0.5);
  float inside = 1.0 - shnAA(p.y, edge);
  float v = clamp((edge - p.y) / 0.22, 0.0, 1.0) * 0.7 + shnFbm(vec2(x * 7.0, p.y * 32.0)) * 0.5;
  vec3 c = mix(shnC(234.0, 178.0, 188.0), shnC(212.0, 150.0, 178.0), shnAA(v, 0.45));
  c = mix(c, shnC(184.0, 123.0, 168.0), shnAA(v, 0.80));
  float path = 0.25 + 0.40 * exp(-4.0 * abs(p.x - uShinSun.x));
  c = mix(c, shnC(255.0, 214.0, 160.0), path * 0.5 * (1.0 - shnAA(v, 0.45)));
  return mix(base, shnCap(c), inside);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnSea(p, t, shnSky(p, 0.0)); }`,
  }),
];
