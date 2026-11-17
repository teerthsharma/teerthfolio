// WORLD for p-resolvent: the live courtyard (court.js: sky bubble, keep, walls, trees, far ridges and grove, leaves, grass, shadows, shafts),
// the pale island it opens and closes on (island.js) and the leaf cards of the close shots (near.js). Layer 0, redrawn every step. On the hold
// the page turns about the lens by the camera's shake less the menace calm, so the world shakes and the seal does not (as Sukuna does).
import { Group, Quaternion, Euler, Vector3 } from "three";
import { buildCourt } from "./court.js";
import { buildIsland } from "./island.js";
import { buildNear } from "./near.js";
import { BACK, DOCK, IMPACT } from "../clock.js";

const AT = new Vector3(...DOCK), D = new Vector3(), P = new Vector3(), S3 = [0, 0, 0];
const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler();

export default function build(ctx) {
  const island = buildIsland(), court = buildCourt(ctx), near = buildNear(ctx);
  ctx.court = court.state;
  const page = new Group();
  page.add(court.group, near.group);
  const group = new Group();
  group.add(island.group, page);
  return {
    group,
    update(t, dt, cue) {
      court.update(t);
      const s = court.state, cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      page.position.set(0, 0, 0); page.quaternion.identity();
      if (calm < 1 && cam) {
        const sh = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(sh[1] * k, sh[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        page.quaternion.copy(QA);
        D.copy(cam.position).sub(AT);
        page.position.copy(D).sub(P.copy(D).applyQuaternion(QA));
      }
      island.page(s.inside && !s.gone && s.dis < 0.12, t < IMPACT || t >= BACK);
      island.update(t);
      near.update(t, dt, cue);
    },
    dispose() {
      near.dispose();
      court.dispose();
      island.dispose();
    },
  };
}
