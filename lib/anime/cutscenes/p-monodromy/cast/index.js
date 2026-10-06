// CAST layer for p-monodromy (CAST agent). Layer 1. The hero seal is ctx.seal (locked; poses come from scene.seal.track); this layer
// dresses it (Sinbad, then the Baal Djinn Equip) and stages every victim and extra as a costumed seal: Jafar, 8 Al-Thamen, the Sindria crowd.
// Cues read (all optional, bible times are the fallback): "strike" (also "bolt", "zzaap", "baraqq") starts the blow, default 6.4 s.
// The world freezes 8.4-9.6 (the shatter): cast time holds at 8.4 so nothing moves under the shards; the blow then runs backward 10.0-11.3.
import { buildHero } from "./hero.js";
import { buildVictims } from "./victims.js";

const FREEZE = [8.4, 9.6];
export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const hero = buildHero(ctx), vic = buildVictims(ctx);
  group.add(vic.group);
  ctx.setLayer(group, 1);
  return {
    group,
    update(t, dt, cue) {
      const tt = t >= FREEZE[0] && t < FREEZE[1] ? FREEZE[0] : t;
      hero.update(tt, cue);
      vic.update(tt, cue);
    },
    dispose() { hero.dispose(); vic.dispose(); },
  };
}
