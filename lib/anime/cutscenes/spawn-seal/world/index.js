// WORLD for spawn-seal: the live cave and war plain (set.js) and the statue island (island.js), composed in the rig frame.
// Every piece is redrawn on each step (the shots are `moving`); the island hides while the cave or the war is the picture.
import { Euler, Group, Quaternion, Vector3 } from "three";
import { buildSet } from "./set.js";
import { buildIsland } from "./island.js";
import { DOCK } from "../clock.js";

const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), EYE = new Vector3(), AT = new Vector3(...DOCK), S3 = [0, 0, 0];

export default function build(ctx) {
  const group = new Group(), page = new Group();
  const island = buildIsland(), set = buildSet(ctx);
  page.add(set.group);
  group.add(island.group, page);
  return {
    group,
    update(t, dt, cue) {
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      // the hold: the frame's shake is calmed for the seal's sake, so the set takes the rest of it, turned about the lens
      page.position.set(0, 0, 0); page.quaternion.identity();
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        page.quaternion.copy(QA); page.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }
      island.page(t >= 1.12 && t < 14.4);
      island.update(t);
      set.update(t, dt, cue);
    },
    dispose() { set.dispose(); island.dispose(); },
  };
}
