// Fog / sea-breath / lamp bloom clamp — 6 operators over the slip.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockFogSlip",
    doc: "fog over slip: height-weighted fbm wisps, dusk grey never milky",
    glsl: /* glsl */ `
    vec3 dockFogSlip(vec2 p, float t) {
      vec3 base = mix(DK_SEA, DK_DUSK, clamp(p.y, 0.0, 1.0));
      float fog = dkFogAmt(p, t);
      vec3 col = mix(base, DK_FOG, fog * 0.72);
      col = mix(col, DK_SOD * 0.35, exp(-dot(p - dkLampP(), p - dkLampP()) * 8.0) * 0.4);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockFogSlip(p, t); }`,
  }),
  defineModule({
    name: "dockSeaBreath",
    doc: "sea-breath: vapor sheet at the waterline, domain-warped, fwidth fade",
    glsl: /* glsl */ `
    vec3 dockSeaBreath(vec2 p, float t) {
      vec3 col = mix(DK_SEA, dkSky(p), dkFill(-dkWater(p)));
      vec2 q = p + 0.12 * vec2(dkFbm(p * 2.0 + t * 0.1), dkFbm(p * 2.2 - t * 0.08));
      float lip = 1.0 - smoothstep(0.0, 0.12, abs(q.y - DK_WATER_Y));
      float wisp = smoothstep(0.4, 0.75, dkFbm(q * 4.0 + t * 0.15));
      col = mix(col, DK_FOG, lip * wisp * 0.7);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSeaBreath(p, t); }`,
  }),
  defineModule({
    name: "dockLampBloom",
    doc: "sodium bloom: disc + exp falloff, then dkCap so luma never exceeds 0.92",
    glsl: /* glsl */ `
    vec3 dockLampBloom(vec2 p, float t) {
      vec2 lp = dkLampP();
      float r = length(p - lp);
      vec3 col = dkSky(p);
      col = mix(col, DK_SEA, dkFill(dkWater(p)) * 0.65);
      float core = dkFill(r - 0.028);
      float bloom = exp(-r * r * 22.0);
      col = mix(col, DK_SOD, core * 0.9);
      col += DK_SOD * bloom * 0.45;
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockLampBloom(p, t); }`,
  }),
  defineModule({
    name: "dockFogBand",
    doc: "horizontal fog band: one layer over the slip, fwidth top and bottom",
    glsl: /* glsl */ `
    vec3 dockFogBand(vec2 p, float t) {
      vec3 col = mix(DK_SEA, DK_DUSK, clamp((p.y - 0.1) * 1.2, 0.0, 1.0));
      float band = dkBand(p.y + 0.03 * dkFbm(vec2(p.x * 2.0, t * 0.1)), 0.28, 0.52);
      col = mix(col, DK_FOG, band * 0.68);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockFogBand(p, t); }`,
  }),
  defineModule({
    name: "dockBreathCurl",
    doc: "curling breath: two-octave warp, ribbons peeling off the waterline",
    glsl: /* glsl */ `
    vec3 dockBreathCurl(vec2 p, float t) {
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      vec2 w1 = vec2(dkFbm(p * 1.8 + t * 0.09), dkFbm(p * 1.6 - t * 0.07));
      vec2 q = p + 0.18 * w1 + 0.08 * vec2(dkFbm(p * 4.0 + 3.0), dkFbm(p * 3.6 + 8.0));
      float curl = abs(sin(q.x * 6.0 + q.y * 9.0 + t * 0.4));
      float mask = (1.0 - smoothstep(0.0, 0.2, abs(p.y - DK_WATER_Y - 0.06))) * dkLine(curl - 0.35, 2.0);
      col = mix(col, DK_FOG, mask * 0.75);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockBreathCurl(p, t); }`,
  }),
  defineModule({
    name: "dockLampHaloClamp",
    doc: "lamp halo with hard luma clamp: bloom written then forced through dkOut",
    glsl: /* glsl */ `
    vec3 dockLampHaloClamp(vec2 p, float t) {
      vec2 lp = dkLampP();
      float r = length(p - lp);
      vec3 col = mix(DK_INK, DK_DUSK, clamp(p.y * 0.8, 0.0, 1.0));
      col = mix(col, DK_SEA, dkFill(dkWater(p)) * 0.7);
      float halo = exp(-r * 3.6) + 0.55 * exp(-r * r * 14.0);
      col += DK_SOD * halo * 0.85;
      col = mix(col, DK_SOD, dkFill(r - 0.022));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockLampHaloClamp(p, t); }`,
  }),
];
