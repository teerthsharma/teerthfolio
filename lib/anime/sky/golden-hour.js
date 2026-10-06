// golden-hour sky (Madhouse Frieren): a low sun, a peach-to-lavender gradient by angle from the sun, flat painted
// cloud bands lit gold on the sun side and plum in shadow, a warm bloom around the disc. Baked once (paint.bakedDome).
//   goldenHourSky(renderer, { sun: [az, el] rad, az: [a0, a1], el: [e0, e1], palette: { glow, warm, rose, zenith, cloudLit, cloudShade, disc } })
import { bakedDome, V } from "../paint.js";

export function goldenHourSky(renderer, o = {}) {
  const p = { glow: "#ffe6b8", warm: "#f8b890", rose: "#e3a6b6", zenith: "#a9a2d6", cloudLit: "#ffd7a8", cloudShade: "#c48aa6", disc: "#fff0c8", ...(o.palette ?? {}) };
  const [sa, se] = o.sun ?? [0.55, 0.12];
  return bakedDome(renderer, /* glsl */ `
    vec3 sky(float az, float el) {
      vec2 p = vec2(az, el), S = vec2(${sa.toFixed(3)}, ${se.toFixed(3)});
      float d = length((p - S) * vec2(0.8, 1.2));
      vec3 c = ramp4(smoothstep(0.0, 1.3, d), ${V(p.glow)}, ${V(p.warm)}, ${V(p.rose)}, ${V(p.zenith)});
      // cloud bands: long flat strokes, lit edge toward the sun (a value shift, not a gradient)
      vec2 q = warp(vec2(az * 2.4, el * 9.0) + vec2(0.0, 1.0), 0.5);
      float f = fbm(q), cl = smoothstep(0.55, 0.6, f) * smoothstep(0.03, 0.12, el);
      float lit = step(fbm(q - normalize(S - p) * vec2(0.25, 0.6)), f);
      c = mix(c, mix(${V(p.cloudShade)}, ${V(p.cloudLit)}, lit), cl * 0.85);
      c += ${V(p.disc)} * (exp(-d * 9.0) * 1.2 + (1.0 - smoothstep(0.02, 0.026, d)) * 2.0);
      return c;
    }`, { tools: ["noise"], az: o.az ?? [-1.2, 1.2], el: o.el ?? [-0.3, 1.0], pxPerRad: o.pxPerRad ?? 900 });
}

export default { name: "golden-hour", doc: "baked golden-hour dome: sun-angle gradient, flat painted cloud bands lit on the sun side, warm disc" };
