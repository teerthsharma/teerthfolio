// WORLD for p-tangle: the live picture in its rig frame (../live/world.js steps), its render boost (value, glare, far), the island (island.js) and the live driver (drive.js).
// The set turns about the lens in the hold (menace.calm), so the world takes the shake and the seal does not.
import { Group, NormalBlending, Quaternion, Euler, Vector3 } from "three";
import { buildSteps } from "../live/world.js";
import { buildIsland } from "./island.js";
import { makeDrive } from "./drive.js";
import { applyValue } from "./value.js";
import { patchLake } from "./glare.js";
import { buildFar } from "./far.js";
import { DOCK, TURN } from "../clock.js";
import { tone } from "../tone.js";

const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), S3 = [0, 0, 0], DV = new Vector3(), RV = new Vector3(), AT = new Vector3(...DOCK);

export default function build(ctx) {
  const { W, steps } = buildSteps();
  steps.forEach((s) => s());
  ctx.tg = { ...(ctx.tg ?? {}), U: W.U, W };
  applyValue(W);
  patchLake(W);
  const island = buildIsland(), far = buildFar(ctx, W.U), drive = makeDrive(ctx, W, null);
  island.group.rotation.y = -TURN;
  const page = new Group(), group = new Group();
  page.add(island.group, W.root, far.group);
  group.add(page);
  const toned = new Set();
  W.root.traverse((o) => {
    const m = o.material;
    if (o.isMesh && m?.isShaderMaterial && m.blending === NormalBlending && !toned.has(m)) { toned.add(m); tone(m); }
  });
  const tier = (n) => (ctx.atTier ? ctx.atTier(n) : true);
  return {
    group,
    update(t, dt, cue) {
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      page.position.set(0, 0, 0); page.quaternion.identity();
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        page.quaternion.copy(QA);
        DV.copy(cam.position).sub(AT);
        page.position.copy(DV).sub(RV.copy(DV).applyQuaternion(QA));
      }
      drive.update(t);
      island.update(t);
      island.show(!drive.state.inside || drive.state.dis > 0.03);
      far.group.visible = tier(3) && drive.state.inside;
      far.update(t, drive.state);
    },
    dispose() { drive.dispose?.(); island.dispose(); far.dispose(); W.dispose(); },
  };
}
