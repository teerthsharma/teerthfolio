// Ea's pose for pr-polychrom-79 in camera space: the hilt and the drill tip are targets in NDC and depth, so the blade stays on screen by construction.
import { F, HIT, smooth } from "../clock.js";

export const EA = { hiltRest: [0.66, -0.62, 2.0], hiltHold: [0.8, -0.55, 2.2], tipRest: [0.5, 0.8, 2.0], tipHold: [0.14, 0.3, 2.2], len: 1.62 }; // [ndc x, ndc y, depth m]
// Recoil: hilt and tip move +0.12 NDC x for two frames after the blast and after the flash.
const kick = (t) => ([HIT.blast, HIT.flash].some((h) => t >= h && t < h + F(2)) ? 0.12 : 0);

export function eaFrame(t, fov, aspect) {
  const th = Math.tan((fov * Math.PI) / 360), k = smooth(18.0, 19.2, t), kx = kick(t);
  const cam = ([nx, ny, z]) => [nx * z * th * aspect, ny * z * th, z];
  const mix = (a, b) => {
    const A = cam(a), B = cam(b);
    return A.map((v, i) => v + (B[i] - v) * k);
  };
  const hilt = mix(EA.hiltRest, EA.hiltHold), tip = mix(EA.tipRest, EA.tipHold);
  for (const p of [hilt, tip]) p[0] += kx * p[2] * th * aspect;
  const d = tip.map((v, i) => v - hilt[i]), L = Math.hypot(...d);
  return {
    on: t >= 14.4 && t < HIT.shatter,
    draw: smooth(14.4, 16.4, t),
    hilt,
    axis: d.map((v) => v / L),
    s: L / EA.len,
    tip,
    tipNdc: [tip[0] / (tip[2] * th * aspect), tip[1] / (tip[2] * th)],
  };
}
