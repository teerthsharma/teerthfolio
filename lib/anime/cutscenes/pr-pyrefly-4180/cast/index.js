// CAST for pr-pyrefly-4180: the pale playable pup (cast/pup.js) opens the cutscene and is what the character turns back into at BACK; the approved
// character (the look, unedited) stands between the impact and BACK, printed in the paper's value steps (cast/print.js), on the hero rig from ctx.seal.
import { Group } from "three";
import { BACK, LINE } from "../clock.js";
import { sitePup } from "./pup.js";
import { printCharacter } from "./print.js";

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const S = ctx.scene.seal.scale;
  const pup = sitePup({ yaw: 0, track: { sign: [0.45, 0.6, 0.3] }, hull: [BACK, 26.0] });
  const printed = printCharacter(ctx, { ember: 0.55 });
  const group = new Group();
  group.add(pup.group);
  return {
    group,
    update(t) {
      const on = t >= LINE.impact && t < BACK + 2 / 24;
      const into = Math.floor((t - LINE.impact - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on && !ctx.pf?.gone;
      pup.group.visible = !on;
      pup.update(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1), S);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      printed.uPf.value.x = on ? 1 : 0;
      printed.update(t);
    },
    dispose() { pup.dispose(); printed.dispose(); ctx.seal.group.visible = true; },
  };
}
