// CAST for p-planimeter: the pale pup (cast/pup.js) opens and closes the cutscene; the approved character takes the room from ENTER to BACK.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { BACK, ENTER, PUP_YAW, R, TURN } from "../clock.js";
import { SEAL_SCALE } from "./scale.js";

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const sh = ctx.engine.shared, group = new Group(), roomEnd = R.collapse[1];
  const pup = sitePup({ yaw: PUP_YAW + TURN, track: { sign: [0.45, 1.47, 3.0] } });
  group.add(pup.group);
  return {
    group,
    update(t) {
      const on = t >= ENTER && t < BACK, into = Math.floor((t - ENTER) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = !on;
      pup.update(t);
      pup.setRoom(t >= ENTER && t < roomEnd ? 1 : 0);
      if (on) {
        squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 ? 0.86 : 1), SEAL_SCALE);
        sh.uRimCol.value.setRGB(1.0, 0.78, 0.42);
      } else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
    },
    dispose() { pup.dispose(); ctx.seal.group.visible = true; },
  };
}
