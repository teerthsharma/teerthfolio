// CAST layer for p-monodromy: the approved character (ctx.seal, dressed by the look) and the island's pale pup (sitePup) take turns on the impact
// frame, and Ja'far stands in the storm. The rim is the live's gold sun; the engine's rim is restored at dispose.
import { Group, Vector3 } from "three";
import look from "../../../kit/hero/looks/p-monodromy.js";
import { R, SEAL } from "../clock.js";
import jafar from "./jafar.js";
import { sitePup } from "./pup.js";

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const sh = ctx.engine.shared, rim = { col: sh.uRimCol.value.clone(), dir: sh.uRimDir.value.clone() };
  look.extras(ctx.engine, ctx.seal.hero);
  sh.uRimCol.value.set("#e9b23a");
  sh.uRimDir.value.set(-0.55, 0.58, 0.6);
  const group = new Group(), pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.3], hop: 16.2, turn: 0.22, blink: [24.6] } }), ja = jafar(ctx);
  ctx.seal.group.userData.jaHead = new Vector3();
  group.add(pup.group, ja.group);
  return {
    group,
    update(t) {
      const on = t >= R.swapIn && t < R.fall;
      const into = Math.floor((t - R.swapIn) * 12 + 1e-6), out = Math.floor((t - R.pop) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = t < R.swapIn || t >= R.back - 0.001;
      pup.update(t);
      ja.update(t);
      ja.group.visible = t < R.fall;
      ja.headWorld(ctx.seal.group.userData.jaHead);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1), SEAL.scale);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
    },
    dispose() {
      pup.dispose();
      ja.dispose();
      sh.uRimCol.value.copy(rim.col);
      sh.uRimDir.value.copy(rim.dir);
      ctx.seal.group.visible = true;
      group.removeFromParent();
    },
  };
}
