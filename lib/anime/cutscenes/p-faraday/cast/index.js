// CAST for p-faraday: the pale pup, the printed character from the impact to the pass, then the pup again (real seconds, clock.js R).
import { Group } from "three";
import { sitePup } from "./pup.js";
import { printBlueprint } from "./print.js";
import { R, SEAL, smooth } from "../clock.js";

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
const pupYaw = (t) => (t < R.pass ? SEAL.pupYaw : t < R.island + 1 ? SEAL.yawBack : SEAL.yawBack + (SEAL.yawHome - SEAL.yawBack) * smooth(R.island + 1, R.island + 1.15, t));

export default function build(ctx) {
  const sh = ctx.engine.shared, line0 = sh.uLine.value.clone(), group = new Group();
  const print = printBlueprint(ctx);
  const pup = sitePup({ yaw: SEAL.pupYaw, track: { sign: [0.45, 0.5, 0.55], blink: [1.9] } });
  group.add(pup.group);
  return {
    group,
    update(t) {
      const on = t >= R.impact && t < R.pass + 2 / 24;
      const into = Math.floor((t - R.impact - 0.12) * 12 + 1e-6), out = Math.floor((t - R.pass) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = !on;
      pup.update(t);
      pup.group.rotation.y = pupYaw(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1), SEAL.scale);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      print.uBp.value.set(on ? 1 : 0, t, ctx.engine.renderer.getPixelRatio(), 0.12 * smooth(R.glow + 0.4, R.pass, t));
      sh.uLine.value.set(on ? 2.4 : line0.x, line0.y, line0.z, line0.w);
    },
    dispose() { sh.uLine.value.copy(line0); ctx.seal.group.visible = true; print.dispose(); pup.dispose(); },
  };
}
