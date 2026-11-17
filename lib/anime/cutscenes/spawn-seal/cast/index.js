// CAST for spawn-seal: the site's pup opens and closes the cutscene; the approved character (the look) stands from the turn to BACK.
// The character is drawn by the engine's own cel pass in its approved colours; only the shared rim and aura are set here.
import { Group, Vector4 } from "three";
import look from "../../../kit/hero/looks/spawn-seal.js";
import { sitePup } from "./pup.js";
import { BACK, F, SEAL, TURN_T, smooth } from "../clock.js";

const squash = (g, k, s = SEAL.scale) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const sh = ctx.engine.shared;
  sh.uAura ??= { value: new Vector4(0, 3, 1.5, 0.6) };
  look.extras?.(ctx.engine, ctx.seal.hero);
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.3, 0.6, 2.1], blink: [4.6], hop: undefined } });
  const group = new Group();
  group.add(pup.group);
  return {
    group,
    update(t) {
      const char = t >= TURN_T && t < BACK + F(2);
      const into = Math.floor((t - TURN_T) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = char; pup.group.visible = !char;
      pup.update(t);
      if (char) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1));
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      sh.uRimCol.value.set(t < 9.3 ? "#37e8ff" : t < 14.4 ? "#ff9a3a" : "#9fe6ff");
      sh.uRimDir.value.set(-0.5, 0.35, 0.8);
      sh.uAura.value.x = 0.9 * smooth(12.6, 13.05, t) * (1 - smooth(13.6, 14.2, t));
    },
    dispose() {
      ctx.seal.group.visible = true;
      sh.uRimCol.value.set("#ffffff"); sh.uRimDir.value.set(0, 0, 0); sh.uAura.value.x = 0;
      pup.dispose();
    },
  };
}
