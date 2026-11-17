// WORLD layer for pr-xnnpack-10801: the Las Noches dimension (world/dimension.js, the live ink picture) and the real island it is laid over
// (world/island.js). Both are built in the rig frame; build.js stands this group at the dock and turns it by TURN, so the island lands on the site.
import { Euler, Group, Quaternion, Vector3 } from "three";
import { buildDimension } from "./dimension.js";
import { buildIsland, landOn } from "./island.js";
import { F, HIT, LINE, env, warp } from "../clock.js";

const EYE = new Vector3(), P = new Vector3(), QA = new Quaternion(), QB = new Quaternion(), QC = new Quaternion(), EU = new Euler(), S3 = [0, 0, 0];

export default function build(ctx) {
  const group = new Group(), dim = buildDimension(ctx), island = buildIsland();
  group.add(dim.group, island.group);
  // the hold: the frame's shake is calmed for the seal's sake (menace.calm), so the page takes the rest of it, turned about the lens
  const shakePage = (cue, t) => {
    const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
    dim.group.position.set(0, 0, 0); dim.group.quaternion.identity();
    if (calm >= 1 || !cam) return;
    const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
    cam.updateWorldMatrix(true, false); group.updateWorldMatrix(true, false);
    EYE.setFromMatrixPosition(cam.matrixWorld); group.worldToLocal(EYE); // the lens, in the rig frame
    cam.getWorldQuaternion(QC); group.getWorldQuaternion(QB); QC.premultiply(QB.invert()); // the camera's turn, in the rig frame
    QA.setFromEuler(EU.set(s[1] * k, s[0] * k, 0)); // a small turn about the lens's own axes
    const R = QB.copy(QC).multiply(QA).multiply(QC.invert());
    dim.group.quaternion.copy(R);
    dim.group.position.copy(EYE).sub(P.copy(EYE).applyQuaternion(R)); // rotate the page about the lens, not about the rig's origin
  };
  return {
    group,
    update(t, dt, cue) {
      const on = landOn(t), panel = t >= HIT.brk && t < HIT.brk + F(2); // the break's two frames are the paper/ink panel alone
      island.page(on);
      island.group.visible = on && !panel; // page() leaves the island's sky dome up; off-stage the island is out of the frame entirely
      island.update(t); // the rolling snow cube, on the site's own phase
      dim.group.visible = t >= LINE.impact[0] && env(warp(t)).brk < 1.5 && !panel; // the picture stands from the impact until the glass is gone
      shakePage(cue, t);
      dim.update(t, dt, cue);
    },
    dispose() { dim.dispose(); island.dispose(); },
  };
}
