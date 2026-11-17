// WORLD for p-epsilon-hollow: the live cave and battlefield (../live/world.js), the pale island the scene opens and closes on (island.js) and the
// foreground dressing (dress.js). All of it is the plate, redrawn each step: the shots are moving. The seal stands at the origin, facing +z.
import { Euler, Group, Quaternion, Vector3 } from "three";
import { caveWorld, battlefield } from "../live/world.js";
import { makeRim } from "../live/slime.js";
import { HIT, T, smooth } from "../clock.js";
import { tone } from "../tone.js";
import { buildIsland } from "./island.js";
import { buildDress } from "./dress.js";

const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), EYE = new Vector3(), AT0 = new Vector3(), S3 = [0, 0, 0];

export default function build(ctx) {
  const group = new Group(), rim = makeRim();
  const cave = caveWorld(), war = battlefield(rim), isl = buildIsland(), dress = buildDress();
  group.add(cave.root, war.root, isl.group, dress.group);
  const toned = new Set(); // tone() is not idempotent: a material shared by two meshes must be wrapped once
  group.traverse((o) => { for (const m of [].concat(o.material ?? [])) if (m.isShaderMaterial && !toned.has(m)) { toned.add(m); tone(m); } });
  const [dressCave, dressWar] = dress.group.children;
  return {
    group,
    update(t, dt, cue) {
      const island = t < HIT.plop || t >= T.back[0];
      isl.page(island);
      cave.root.visible = war.root.visible = t >= HIT.plop && t < T.back[0] + 0.1;
      const k = smooth(T.war[0], T.war[1], t), gone = smooth(T.gone[0], T.gone[1], t), eat = smooth(T.eat[0], T.eat[1], t);
      // the hold: the frame's shake is calmed for the seal's sake (menace.calm), so the world takes the rest of it, turned about the lens
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      group.position.set(0, 0, 0); group.quaternion.identity();
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), a = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * a, s[0] * a, 0))).multiply(QB.copy(cam.quaternion).invert());
        group.quaternion.copy(QA);
        group.position.copy(EYE.copy(cam.position).sub(AT0)).applyQuaternion(QA).negate().add(EYE);
      }
      cave.update(t, k, gone, Math.min(1, eat * 1.05));
      rim.uniforms.uTime.value = t;
      war.update(t, k, smooth(T.rain[0], T.rain[1], t), 1 - gone);
      dress.update(t, k);
      const tier2 = ctx.atTier(2);
      dressCave.visible = dressCave.visible && tier2 && cave.root.visible;
      dressWar.visible = dressWar.visible && tier2 && war.root.visible;
    },
    dispose() {
      cave.dispose(); war.dispose(); isl.dispose(); dress.dispose(); rim.dispose();
    },
  };
}
