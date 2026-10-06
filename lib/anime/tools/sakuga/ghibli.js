// Family — Ghibli wash. Wet-on-wet watercolor, no cel edge on the world.
import { T } from "./define.js";

const F = "ghibli";

export const GHIBLI = [
  T("ghibliSkyWash", F, "Ghibli sky: wet-on-wet bands, horizon dissolves, paint not a gradient ramp",
    `vec3 ghibliSkyWash(vec2 p, float t) {
      float y = p.y + skFbm(p * 2.2) * 0.08;
      vec3 low = vec3(0.72, 0.78, 0.80);
      vec3 mid = SK_GHIB_SKY;
      vec3 high = vec3(0.36, 0.48, 0.72);
      vec3 sky = y < 0.5 ? mix(low, mid, y * 2.0) : mix(mid, high, y * 2.0 - 1.0);
      float bleed = skFbm(p * 3.4 + vec2(0.0, t * 0.02));
      sky = mix(sky, mix(SK_GHIB_CLOUD, SK_GHIB_SKY, 0.4), bleed * 0.22);
      float tooth = skVn(p * 28.0) * 0.04;
      return sky * (0.96 + tooth);
    }`, "ghibliSkyWash(p, t)"),

  T("ghibliCloudPile", F, "piled painted clouds: soft ovals, value stacks, not simplex puffs",
    `vec3 ghibliCloudPile(vec2 p, float t) {
      vec3 sky = mix(SK_GHIB_SKY * 1.05, vec3(0.40, 0.54, 0.74), skAA(p.y, 0.62));
      float pile = 0.0;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 c = vec2(0.12 + fi * 0.16, 0.58 + 0.08 * sin(fi * 1.7));
        vec2 rad = vec2(0.20, 0.08) * (0.85 + 0.2 * skH21(vec2(fi, 2.0)));
        float d = skEllipse(p, c, rad) + skFbm(p * 6.0 + fi) * 0.06;
        pile = max(pile, skFill(d) * mix(0.55, 0.95, skAA(p.y, c.y - 0.04)));
      }
      vec3 cloud = mix(SK_GHIB_SKY * 0.9, SK_GHIB_CLOUD, 0.82);
      vec3 shade = mix(cloud, vec3(0.62, 0.66, 0.72), 0.35);
      float under = skFbm(p * 5.0);
      cloud = mix(shade, cloud, skAA(under, 0.45));
      return mix(sky, cloud, pile);
    }`, "ghibliCloudPile(p, t)"),

  T("ghibliGrassWash", F, "meadow wash: two green plates bleed into the sky, watercolor edge not a cut",
    `vec3 ghibliGrassWash(vec2 p, float t) {
      float hill = 0.38 + skFbm(vec2(p.x * 2.4, 0.2)) * 0.10;
      float field = 1.0 - skAA(p.y, hill);
      vec3 sky = mix(vec3(0.70, 0.76, 0.80), SK_GHIB_SKY, skAA(p.y, 0.55));
      float stripe = skFbm(vec2(p.x * 8.0, p.y * 14.0));
      vec3 grass = mix(SK_GHIB_GRASS, SK_GHIB_FIELD, skAA(stripe, 0.48));
      grass = mix(grass, SK_GHIB_FIELD * 1.1, skAA(p.y, hill - 0.08) * 0.35);
      float bleed = smoothstep(hill - 0.06, hill + 0.05, p.y);
      vec3 col = mix(grass, sky, bleed);
      return mix(col, grass, field * (1.0 - bleed * 0.5));
    }`, "ghibliGrassWash(p, t)"),
];
