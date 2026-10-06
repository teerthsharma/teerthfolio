// Sodium / green nav / red nav lights — 5 operators. All ends go through dkOut.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockSodiumLamp",
    doc: "sodium lamp disc: C.lamp / C.lampGlow at dusk, core + falloff, luma capped",
    glsl: /* glsl */ `
    vec3 dockSodiumLamp(vec2 p, float t) {
      vec2 lp = dkLampP();
      float r = length(p - lp);
      vec3 col = dkSky(p);
      col = mix(col, DK_SEA, dkFill(dkWater(p)) * 0.6);
      col = mix(col, DK_SOD, dkFill(r - 0.03));
      col += DK_SOD * exp(-r * r * 26.0) * 0.5;
      float pole = dkBox(p, vec2(lp.x, 0.58), vec2(0.012, 0.22));
      col = mix(col, DK_HULL, dkFill(pole));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSodiumLamp(p, t); }`,
  }),
  defineModule({
    name: "dockNavGreen",
    doc: "green starboard nav: marine green point, tight falloff, never neon lime",
    glsl: /* glsl */ `
    vec3 dockNavGreen(vec2 p, float t) {
      vec2 c = vec2(1.18, 0.52);
      float r = length(p - c);
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      col = mix(col, DK_HULL, dkFill(dkBox(p, vec2(1.05, 0.48), vec2(0.18, 0.08))));
      col = mix(col, DK_NAV_G, dkFill(r - 0.018));
      col += DK_NAV_G * exp(-r * r * 40.0) * 0.55;
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockNavGreen(p, t); }`,
  }),
  defineModule({
    name: "dockNavRed",
    doc: "red port nav: deep port red, same falloff grammar as starboard",
    glsl: /* glsl */ `
    vec3 dockNavRed(vec2 p, float t) {
      vec2 c = vec2(0.26, 0.52);
      float r = length(p - c);
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      col = mix(col, DK_HULL, dkFill(dkBox(p, vec2(0.40, 0.48), vec2(0.18, 0.08))));
      col = mix(col, DK_NAV_R, dkFill(r - 0.018));
      col += DK_NAV_R * exp(-r * r * 40.0) * 0.55;
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockNavRed(p, t); }`,
  }),
  defineModule({
    name: "dockSodiumPool",
    doc: "sodium pool on wet deck: elongated reflection, anisotropic sheen",
    glsl: /* glsl */ `
    vec3 dockSodiumPool(vec2 p, float t) {
      vec2 lp = dkLampP();
      vec3 col = mix(DK_WET, DK_WOOD, dkGrain(p) * 0.45);
      col = mix(col, DK_TAR, dkFill(dkPlankGap(p)) * 0.75);
      vec2 q = (p - vec2(lp.x, DK_DECK_Y)) * vec2(1.4, 3.2);
      float pool = exp(-dot(q, q) * 6.0);
      col = mix(col, DK_SOD * 0.55, pool * 0.7 * dkWetSheen(p, t));
      col = mix(col, DK_SEA, dkFill(dkWater(p)) * 0.85);
      col = mix(col, DK_SOD, dkFill(length(p - lp) - 0.024));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSodiumPool(p, t); }`,
  }),
  defineModule({
    name: "dockNavPair",
    doc: "red/green pair across the slip: port and starboard on one dusk grade",
    glsl: /* glsl */ `
    vec3 dockNavPair(vec2 p, float t) {
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      vec2 L = vec2(0.22, 0.50), R = vec2(1.22, 0.50);
      float rl = length(p - L), rr = length(p - R);
      col += DK_NAV_R * exp(-rl * rl * 28.0) * 0.7;
      col += DK_NAV_G * exp(-rr * rr * 28.0) * 0.7;
      col = mix(col, DK_NAV_R, dkFill(rl - 0.016));
      col = mix(col, DK_NAV_G, dkFill(rr - 0.016));
      col = mix(col, DK_FOG, dkFogAmt(p, t) * 0.25);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockNavPair(p, t); }`,
  }),
];
