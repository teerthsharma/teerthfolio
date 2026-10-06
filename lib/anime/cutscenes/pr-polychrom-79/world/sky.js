// pr-polychrom-79 / world: the painted domes (GLSL bodies for ctx.bake.sky). `vec3 sky(float az, float el)`.
// az = atan(d.x, -d.z) (0 looks down -z, the way the shots look; +-pi is behind the seal), el = elevation, rad.
//
//   GATES    (shots 1-5)  temple room + gold rings #d9a441. Magenta rgb(155,25,89) is a miss.
//   DARK     (shots 6-7)  the same sky pulled down for Ea and Enuma Elish
//   CALM     (shot 8)     the island's own pale sky, so the shatter reveals home
import { V } from "../../../paint.js";
import { SKY_GATES, SKY_GATES_DARK } from "./gate-rings.js";

export { SKY_GATES as SKY_CRIMSON, SKY_GATES_DARK as SKY_DARK };

const COMMON = /* glsl */ `
  const float TAU = 6.28318530718;
  const float PI = 3.14159265359;
  float perFbm(float az, float el, vec2 k, float off) {
    float x = az + PI;
    float a = fbm(vec2(x * k.x, el * k.y + off));
    float b = fbm(vec2((x - TAU) * k.x, el * k.y + off));
    return mix(a, b, x / TAU);
  }`;

// CALM: island snow, pale blue to warm white at the horizon, a breath of gold, soft cloud banks
export const SKY_CALM = COMMON + /* glsl */ `
  vec3 sky(float az, float el) {
    float up = smoothstep(0.0, 0.9, el);
    vec3 c = mix(${V("#f4f4f0")}, ${V("#c8d8e8")}, up);
    if (el < 0.0) c = mix(${V("#f4f4f0")}, ${V("#c8d8e8")} * 0.82, smoothstep(0.0, -0.4, el));
    c += ${V("#ffe27a")} * exp(-el * el / 0.02) * 0.16;
    float n = perFbm(az, el, vec2(1.2, 4.5), 3.0);
    c = mix(c, ${V("#e8e4d8")}, smoothstep(0.50, 0.76, n) * 0.45 * smoothstep(0.0, 0.25, el));
    c = mix(c, ${V("#8a6a50")} * 1.15, smoothstep(0.62, 0.8, n) * 0.06);
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * min(1.0, 0.92 / max(Y, 1e-4));
  }`;
