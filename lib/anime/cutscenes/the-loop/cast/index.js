// CAST for the-loop: the pale playable pup opens and closes the cutscene; between them the hero rig (look the-loop) is the character.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { wrapRig, LINE_ON } from "./ramp.js";
import { buildEyes } from "./eyes.js";
import { BACK, liftAt, powerAt, SEAL, smooth, step12, T } from "../clock.js";

const squash = (g, k, s = SEAL.scale) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const sh = ctx.engine.shared, line0 = sh.uLine.value.clone(), group = new Group();
  const rig = wrapRig(ctx), eyes = buildEyes(ctx);
  ctx.seal.group.name = "the-loop-hero";
  const pup = sitePup({ yaw: SEAL.yaw, track: { hop: T.hop, turn: 0, blink: [0.9, 1.6] } });
  group.add(pup.group, eyes.group);
  console.info("the-loop rig", rig.list);
  return {
    group,
    update(t, dt, cue) {
      const on = t >= T.impactA && t < BACK + 2 / 24, into = Math.floor((t - T.impactA) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on; pup.group.visible = !on;
      pup.update(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1));
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      ctx.seal.set?.({ y: on ? liftAt(t) / SEAL.scale : 0 });
      const crimson = smooth(T.shard[0], T.shard[0] + 0.25, t) * (t < T.sky ? 1 : 0);
      rig.u.value.set(on ? 1 : 0, step12(t), powerAt(t), crimson);
      eyes.update(t, cue);
      sh.uLine.value.set(on ? LINE_ON : line0.x, line0.y, line0.z, line0.w);
    },
    dispose() {
      sh.uLine.value.copy(line0);
      ctx.seal.group.visible = true;
      rig.dispose(); eyes.dispose(); pup.dispose();
    },
  };
}
