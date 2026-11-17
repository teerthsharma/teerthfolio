// The far plates past the Wall and through the gap: a coast, a burning district, a ruined skyline, three sails on the sea and a low haze bank, baked cards in the deployed ramp. The plates burn off with the drawing; the haze fades by its uniform.
import { Group } from "three";
import { bg } from "../../../kit/bg/index.js";
import { mistCard } from "../../../paint.js";
import { T, smooth } from "../clock.js";
import { tone } from "../tone.js";
import { ORDER, burnable } from "./spec.js";

const SHIPS = /* glsl */ `
  vec4 paint(vec2 p) {
    float cov = 0.0, sail = 0.0;
    for (int i = 0; i < 3; i++) {
      vec2 q = vec2(p.x - (3.0 + 6.5 * float(i)), p.y);
      float s = step(0.2, q.y) * step(abs(q.x), 0.38 * (0.95 - q.y)) * step(q.y, 0.95);
      float h = step(q.y, 0.2) * step(0.1, q.y) * step(abs(q.x), 0.55 - (0.2 - q.y) * 1.5);
      sail = max(sail, s);
      cov = max(cov, max(s, h));
    }
    vec3 c = mix(vec3(0.102, 0.055, 0.024), vec3(1.0, 0.957, 0.863), sail);
    return vec4(c, cov);
  }`;
const HAZE = 0.22;

export function buildHorizon(k, ctx) {
  const group = new Group();
  const coast = bg.card(ctx, "mountains", {
    w: 2048, h: 71, size: [2600, 90], at: [0, 45, -760], dark: "#2A1608", mid: "#6A4522", rim: "#E6A833", rimK: 0.9, density: 9, seed: 5, id: 0.99,
  });
  const district = bg.card(ctx, "rooftops", {
    w: 2048, h: 102, size: [1400, 70], at: [0, 35, -600], dark: "#3B2210", mid: "#7A5230", rim: "#E6A833", glow: "#FFCC4D", lit: 0.08, density: 20, seed: 7, id: 0.99,
  });
  const ruins = bg.card(ctx, "ruins", {
    w: 2048, h: 71, size: [1100, 38], at: [0, 19, -330], dark: "#2A1608", mid: "#5A3A1E", rim: "#E6A833", glow: "#FFCC4D", lit: 0.1, density: 14, seed: 11, id: 0.99,
  });
  const ships = ctx.bake.card(SHIPS, { w: 1280, h: 64, size: [320, 16], id: 0.99 });
  ships.position.set(10, 8, -520);
  const haze = mistCard(900, 40, "#fff4ea", HAZE, 3);
  haze.position.set(0, 0, -700);
  haze.renderOrder = ORDER.haze;
  const plates = [coast, district, ruins, ships];
  for (const c of plates) { tone(c.material); burnable(c.material); c.renderOrder = ORDER.far; group.add(c); }
  group.add(haze);

  return {
    group,
    tier: 2,
    update(t, s) {
      haze.material.uniforms.uA.value = HAZE * (1 - smooth(T.burn[0], T.burn[0] + 0.5, s));
    },
    dispose() {
      for (const c of plates) c.userData.dispose?.();
      haze.geometry.dispose();
      haze.material.dispose();
    },
  };
}
