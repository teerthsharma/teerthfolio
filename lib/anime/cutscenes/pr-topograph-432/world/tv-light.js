// tv-light: Nazarick hall as an American show (Castlevania / Invincible). Key + fill + rim. Not clay, not manga tone.
// TOOLKIT: engine/anime:lib/anime/style/rim-strip.js  (this branch has no rim-strip)
//
// Maths (p in height units, y up):
//   key  = exp(-|p - K|^2 / sK) * KEY   K = (0.22 asp, 0.62), sK = 0.18   hard-ish falloff, then 3-step posterise
//   fill = FILL * (1 - keyMask)         #1a0c24, the unlit volume
//   rim  = exp(-((x - asp + 0.08)/0.05)^2) * GOLD   hairline from camera-right
//   q3(v) = (floor(v*3) + smoothstep(0, fwidth(v*3), fract(v*3))) / 3
//   luma cap 0.92; ink is fill, never #000
import { V } from "../../../paint.js";

export const meta = {
  params: {
    key: { default: "#a23cff" },
    fill: { default: "#1a0c24" },
    rim: { default: "#d9a441" },
  },
};

export const GLSL = /* glsl */ `
  const vec3 TV_KEY  = ${V("#a23cff")};
  const vec3 TV_FILL = ${V("#1a0c24")};
  const vec3 TV_RIM  = ${V("#d9a441")};
  const vec3 TV_HALL = ${V("#2a1840")};
  float tvQ3(float v) {
    float f = v * 3.0, w = fwidth(f) + 1e-4;
    return (floor(f) + smoothstep(0.0, w, fract(f))) / 3.0;
  }
  vec3 tvCap(vec3 c) {
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * min(1.0, 0.92 / max(Y, 1e-4));
  }
  vec3 tvHall(vec2 p, float asp) {
    vec2 k = p - vec2(asp * 0.22, 0.62);
    float key = exp(-dot(k, k) / 0.18);
    key = tvQ3(key);
    float fill = 1.0 - key;
    float rim = exp(-pow((p.x - asp + 0.08) / 0.05, 2.0)) * (0.35 + 0.65 * smoothstep(0.15, 0.85, p.y));
    rim = tvQ3(rim);
    vec3 c = mix(TV_FILL, TV_HALL, smoothstep(1.0, 0.35, p.y));
    c = mix(c, TV_KEY, key * 0.72);
    c = mix(c, TV_RIM, rim * 0.55);
    c = mix(c, TV_FILL, fill * 0.25);
    return tvCap(c);
  }`;
