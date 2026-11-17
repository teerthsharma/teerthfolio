// THE CHARACTER: the hero rig as Iskandar's rider; the pup becomes it under the impact frame and turns back at POP.
import { C, LINE, POP, SEAL, smooth } from "../clock.js";

export const TRACK = [
  { t: 1.15, expr: "rider-laugh", dur: 0.1, hold: 1.0, out: 0.2 },
  { t: 2.54, pose: "sit", dur: 0.2, hold: 99 },
  { t: 7.55, pose: "rider-cry", dur: 0.12, hold: 1.4, out: 0.3 },
  { t: 7.55, expr: "awe", dur: 0.1, hold: 1.0, out: 0.3 },
  { t: 7.55, set: { catch: { col: "#ffe099", glow: 1.8, n: 2 } }, dur: 0.1, hold: 1.2, out: 0.3 },
  { t: 8.274, pose: "rider-brace", dur: 0.15, hold: 1.5, out: 0.4 },
  { t: 9.9, expr: "smirk", dur: 0.2, hold: 5.0, out: 0.3 },
];

export const FRAMES = { wide: 0.18, mid: 0.3, close: 0.45, hold: 0.6 };

export const fit = (box, want) => {
  const h = box ? box[3] - box[1] : 0;
  return h > 1e-4 ? h / want : 1;
};

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
// the pup is the site's size on the dock, the live 0.58 on the shoulder, and grows back to full size as it hops down at the collapse
const pupScale = (t) => 1 - (1 - SEAL.pup) * smooth(C.hop[0], C.hop[1], t) * (1 - smooth(LINE.collapse[0], LINE.collapse[1], t));

export function makeSwap(ctx, pup) {
  return {
    update(t) {
      const on = t >= C.impact && t < POP + 2 / 24;
      const into = Math.floor((t - C.impact - 0.12) * 12 + 1e-6), out = Math.floor((t - POP) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = !on;
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1), SEAL.char);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, pupScale(t));
    },
    dispose() {
      ctx.seal.group.visible = true;
      pup.group.visible = true;
    },
  };
}
