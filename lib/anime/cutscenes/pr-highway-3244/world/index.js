// WORLD for pr-highway-3244: the speedway (the live move's sky, track, chariot and rivals), the real island with the Highway, the sky boost, the depth set and the island's life.
// Everything hangs off `shaker`, so the hold can turn the world about the lens while the seal stays calm (menace calm).
import { Group, Matrix4, Quaternion, Euler, Vector3 } from "three";
import buildSpeedway from "./speedway.js";
import buildIsland from "./island.js";
import buildSkyBoost from "./sky.js";
import buildDepth, { loadTable } from "./depth.js";
import buildIslandDress from "./dress.js";
import { C, DOCK, POP, smooth } from "../clock.js";

await loadTable();

const Q = new Quaternion(), Q0 = new Quaternion(), E = new Euler(), M = new Matrix4(), Wi = new Matrix4(), P = new Vector3(), P2 = new Vector3(), S3 = [0, 0, 0];
const ONE = new Vector3(1, 1, 1);

export default function build(ctx) {
  const group = new Group(), shaker = new Group();
  shaker.matrixAutoUpdate = false;
  const speed = buildSpeedway(), island = buildIsland(), sky = buildSkyBoost(ctx), depth = buildDepth(), dress = buildIslandDress(ctx);
  shaker.add(speed.group, island.group, sky.group, depth.group, dress.group);
  group.add(shaker);
  return {
    group,
    update(t, dt, cue) {
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        Q.setFromEuler(E.set(s[1] * k, s[0] * k, 0)).premultiply(Q0.copy(cam.quaternion)).multiply(Q0.copy(cam.quaternion).invert());
        P.copy(cam.position).sub(P2.copy(cam.position).applyQuaternion(Q));
        M.compose(P, Q, ONE);
        shaker.parent.updateWorldMatrix(true, false);
        shaker.matrix.copy(Wi.copy(shaker.parent.matrixWorld).invert()).multiply(M).multiply(shaker.parent.matrixWorld);
      } else shaker.matrix.identity();
      const onSpeed = t >= C.impact && t < C.swap;
      speed.update(t, cam, { speedway: onSpeed });
      island.page(t >= C.enter && t < C.swap, t < C.impact || t >= POP);
      island.update(t);
      dress.update(t);
      sky.update(t, cam?.position);
      depth.update(t, speed.state);
    },
    dispose() {
      for (const x of [speed, island, sky, depth, dress]) x.dispose?.();
    },
  };
}
