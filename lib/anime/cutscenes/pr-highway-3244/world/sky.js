// pr-highway-3244 WORLD / E1 + E2: the ufotable sunset dome, baked once over the full azimuth ring (the camera arcs all round the seal).
// GLSL `vec3 sky(float az, float el)`; az = atan(d.x, -d.z), el = asin(d.y), so d = (sin az cos el, sin el, -cos az cos el).
// The function depends on d only (never on az alone), so the texture is continuous across the az = +-pi seam.
//
// GRADIENT (bible E1). h = clamp(d.y, 0, 1)^0.7 (stretches the low sky, where the colour lives)
//   c = gold #ff9e1f                         h = 0
//     -> rose #ff478f  smoothstep(0.00, 0.14, h)
//     -> violet #9e4de6 smoothstep(0.10, 0.40, h)
//     -> zenith #291480 smoothstep(0.35, 0.95, h)
//   thin FLAT horizon strips (ufotable bands): v += band(y, y0, y1) * tint, hard edged, never a gradient.
// SUN. S = unit vector (JS), sd = d . S, ang = acos(sd)
//   glow   += #ffb352 * 0.5 * max(sd,0)^5  +  #ffdc8c * max(sd,0)^40
//   halo    = #ffd890 * 0.4 * exp(-(ang / 0.07)^2)                         (8 deg)
//   disc    = #fff7db * 3.0 where ang < 0.0140 rad (1.6 deg), AA by fwidth; core #fffbe8 * 5 where ang < 0.006
//   streak  = #ffe0a0 * 0.9 * exp(-|dEl| 480) * exp(-|dAz| 3.2): ONE horizontal anamorphic streak at the sun only.
//   total sun luma is capped at 6 so the plate blooms but never whites the pup (the pup is excluded from bloom anyway).
// CLOUDS: hard flat cel. Project onto a plane q = d.xz / (y + 0.10) (continuous around the ring); density
//   f(p) = fbm(1.2 p) + 0.35 cov(y) - 0.18, cloud = f > 0.5, cov(y) = smoothstep(0.0, 0.07, y) (1 - 0.6 smoothstep(0.5, 0.9, y))
//   Three flat bands from neighbour taps (the same field sampled 0.16 up / down the sky and 0.14 toward the sun):
//     belly #ff8085   the tap BELOW is empty (warm underlight)
//     crown #ffd073   the tap ABOVE or TOWARD THE SUN is empty (rim of the low sun)
//     body  #ffdbb8   otherwise
//   1 px darker value edge: f < 0.5 + 1.5 fwidth(f)  ->  colour x 0.84.   Clouds melt into the horizon gold below y = 0.10.
// SEA (egg 3, Oceanus): a thin deep-violet strip on the far horizon behind the sun, 0 < y < 0.011, |dAz| < 1.1 rad,
//   a gold glitter column  exp(-|dAz| 14) with fbm stripes; mesa cards occlude it.
import { bakeSkyBody } from "./skyBody.js";

export function buildSky(ctx) {
  const sky = ctx.bake.sky(bakeSkyBody(), {
    az: [-Math.PI, Math.PI], el: [-0.12, 1.3], pxPerRad: 650,
    tools: ["noise"],
  });
  return sky;
}
