// CAST: the island pup, then the Accelerator character (ctx.seal) between the impact frame and BACK; the swap is under fx/swap.js.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { BACK, LINE, SEAL } from "../clock.js";

const PUP = { sign: [0.45, 0.6, 0.3], hop: BACK, turn: SEAL.yawLens - 0.1, blink: [1.7, 17.4] };
const IN = [0.5, 1.16, 0.97], OUT = [0.6, 1.14, 1.14, 0.96, 0.96];
const squash = (g, k, s = SEAL.scale) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const sh = ctx.engine.shared, line0 = sh.uLine.value.clone(), group = new Group();
  const pup = sitePup({ yaw: SEAL.yaw, track: PUP });
  group.add(pup.group);
  return {
    group,
    update(t) {
      const on = t >= LINE.impact && t < BACK + 2 / 24;
      const into = Math.floor((t - LINE.impact - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = !on;
      pup.update(t);
      if (on) squash(ctx.seal.group, IN[into] ?? (out >= -4 && out < 0 ? 0.86 : 1));
      else squash(pup.group, out >= 2 ? OUT[out - 2] ?? 1 : 1, 1);
      sh.uLine.value.set(on ? 1.9 : line0.x, line0.y, on ? 1 : line0.z, line0.w);
    },
    dispose() {
      sh.uLine.value.copy(line0);
      ctx.seal.group.visible = true;
      pup.dispose();
    },
  };
}
