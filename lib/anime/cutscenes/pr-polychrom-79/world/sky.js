// pr-polychrom-79 / world: the painted domes (GLSL bodies for ctx.bake.sky). `vec3 sky(float az, float el)`.
// az = atan(d.x, -d.z) (0 looks down -z, the way the shots look; +-pi is behind the seal), el = elevation, rad.
// Seamless around the full circle: every noise lookup crossfades its own wrap (perFbm), every portal cell wraps its column.
//
//   CRIMSON  (shots 1-5)  crimson gradient, painted streak clouds, a brighter core behind the portal field, ~200 tiny far portals
//   DARK     (shots 6-7)  the same sky pulled to red-black (K = 0.32) for Ea and Enuma Elish
//   CALM     (shot 8)     the island's own pale sky, so the shatter reveals home
import { V } from "../../../paint.js";

const COMMON = /* glsl */ `
  const float TAU = 6.28318530718;
  const float PI = 3.14159265359;
  // fbm that closes on itself around the azimuth circle: F(x) at x=0 equals F(x - TAU) at x=TAU, crossfaded by x/TAU
  float perFbm(float az, float el, vec2 k, float off) {
    float x = az + PI;
    float a = fbm(vec2(x * k.x, el * k.y + off));
    float b = fbm(vec2((x - TAU) * k.x, el * k.y + off));
    return mix(a, b, x / TAU);
  }`;

// FAR PLATE: 3 grids of portals in (az, el) space, 3x3 neighbour lookups so a disc can overlap its cell.
//   cell size c (rad): .19 / .12 / .075; disc radius c * (.20 .. .34): 2.3-3.7 deg, 1.4-2.3 deg, 0.9-1.5 deg
//   density: p(cell) = (0.28 + 0.6 max(front, 0.8 back)) * window(el), front = exp(-((az+0.35)/1.5)^2): heavier up and to the left
//   disc: d = |R(ang) (dAz cos el, dEl)| / rad, x-axis squashed by foreshortening (0.45..1); tilted ellipse
//   col = (mix(ORANGE, mix(YEL, WHITE, core), smoothstep(.7,.2,d)) (.55 + .5 ring) step(d<1) + RIM rim + GLOW glow)
const FAR = /* glsl */ `
  vec3 farPortals(float az, float el) {
    vec3 col = vec3(0.0);
    for (int L = 0; L < 3; L++) {
      float cellA = L == 0 ? 0.19 : (L == 1 ? 0.12 : 0.075);
      float ncol = floor(TAU / cellA + 0.5), cw = TAU / ncol;
      float cx = floor((az + PI) / cw), cy = floor(el / cellA);
      float fade = L == 0 ? 0.9 : (L == 1 ? 0.7 : 0.55);
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        float ix = cx + float(i), iy = cy + float(j);
        vec2 id = vec2(mod(ix, ncol), iy) + float(L) * 37.0;
        vec2 h = h22(id), h2 = h22(id + 11.3);
        float caz = (ix + 0.2 + 0.6 * h.x) * cw - PI, cel = (iy + 0.2 + 0.6 * h.y) * cellA;
        float front = exp(-pow((caz + 0.35) / 1.5, 2.0)), back = exp(-pow((abs(caz) - PI) / 1.0, 2.0));
        float dens = (0.28 + 0.6 * max(front, back * 0.8)) * smoothstep(0.0, 0.18, cel) * (1.0 - smoothstep(1.2, 1.5, cel));
        if (h2.x > dens) continue;
        float da = az - caz; da -= TAU * floor(da / TAU + 0.5);
        vec2 dd = vec2(da * cos(el), el - cel);
        float rad = cellA * (0.20 + 0.14 * h2.y);
        float ang = h.x * TAU, c = cos(ang), s = sin(ang);
        vec2 q = vec2(c * dd.x + s * dd.y, -s * dd.x + c * dd.y);
        q.x /= mix(0.45, 1.0, h2.y);
        float d = length(q) / rad;
        if (d > 1.6) continue;
        float core = smoothstep(0.32, 0.0, d);
        float rings = 0.5 + 0.5 * sin(d * 16.0 + h.y * TAU);
        vec3 disc = mix(${V("#ffb020")}, mix(${V("#ffe27a")}, ${V("#fff2c0")}, core), smoothstep(0.7, 0.2, d)) * (0.55 + 0.5 * rings);
        float rim = smoothstep(0.1, 0.0, abs(d - 0.96));
        col += (disc * step(d, 1.0) + ${V("#c98a12")} * rim * 1.2 + ${V("#ff8a1a")} * exp(-d * d * 1.8) * 0.35) * fade;
      }
    }
    return min(col, vec3(1.5));
  }`;

function crimson(K, portalGain) {
  return COMMON + FAR + /* glsl */ `
  vec3 sky(float az, float el) {
    // base: dark at the bottom corners, crimson through the middle, the zenith falls back to deep crimson (shadows never grey)
    float hgt = smoothstep(-0.45, 0.0, el), hi = smoothstep(0.0, 0.7, el), top = smoothstep(0.8, 1.5, el);
    vec3 c = mix(${V("#3a0610")}, ${V("#8a0c1e")}, hgt);
    c = mix(c, ${V("#c3122e")}, hi);
    c = mix(c, ${V("#8a0c1e")}, top * 0.7);
    // the brighter core behind the portal field (up and to the left) and a second under the home shot's view
    float g = exp(-(pow((az + 0.5) / 0.7, 2.0) + pow((el - 0.85) / 0.42, 2.0)));
    float g2 = exp(-(pow((abs(az) - PI + 0.2) / 0.9, 2.0) + pow((el - 0.7) / 0.5, 2.0)));
    c += (${V("#ff4a5a")} * 0.4 + ${V("#ff8a1a")} * 0.12) * max(g, g2 * 0.6);
    // painted streak clouds: long thin bands (low x frequency, high y frequency), tilted a little; deep-crimson body,
    // a thin #ff4a5a edge where the field falls off toward the light (n - n2 is a directional derivative)
    float tilt = 0.10 * sin(az * 2.0);
    float n = perFbm(az, el + tilt, vec2(1.1, 6.0), 0.0);
    float n2 = perFbm(az, el + tilt - 0.03, vec2(1.1, 6.0), 0.0);
    float m = smoothstep(0.50, 0.68, n);
    float edge = clamp((n - n2) * 16.0, 0.0, 1.0) * smoothstep(0.46, 0.60, n);
    c = mix(c, ${V("#8a0c1e")} * 0.95, m * 0.55 * (0.4 + 0.6 * hgt));
    c += ${V("#ff4a5a")} * edge * 0.32 * hi;
    // a second, finer layer of wisps near the horizon
    float w = smoothstep(0.55, 0.75, perFbm(az, el, vec2(2.3, 15.0), 5.0));
    c = mix(c, ${V("#3a0610")}, w * 0.25 * (1.0 - hi));
    c = c * ${K.toFixed(3)};
    c += farPortals(az, el) * ${portalGain.toFixed(3)} * (el < 0.0 ? 0.0 : 1.0);
    return c;
  }`;
}

export const SKY_CRIMSON = crimson(1.0, 1.0);
export const SKY_DARK = crimson(0.32, 0.35);

// CALM: island snow, pale blue to warm white at the horizon, a breath of gold, soft cloud banks
export const SKY_CALM = COMMON + /* glsl */ `
  vec3 sky(float az, float el) {
    float up = smoothstep(0.0, 0.9, el);
    vec3 c = mix(${V("#f4f4f0")}, ${V("#c8d8e8")}, up);
    if (el < 0.0) c = mix(${V("#f4f4f0")}, ${V("#c8d8e8")} * 0.82, smoothstep(0.0, -0.4, el));
    c += ${V("#ffe27a")} * exp(-el * el / 0.02) * 0.16;
    float n = perFbm(az, el, vec2(1.2, 4.5), 3.0);
    c = mix(c, vec3(1.0), smoothstep(0.50, 0.76, n) * 0.45 * smoothstep(0.0, 0.25, el));
    c = mix(c, ${V("#8a6a50")} * 1.4, smoothstep(0.62, 0.8, n) * 0.06);
    return c;
  }`;
