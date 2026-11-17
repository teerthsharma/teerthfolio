// WORLD layer for p-planimeter: the island and the sunset shell (island.js, shell.js) stand still in the rig frame; the live room (set.js,
// glass.js, light.js, dress.js) turns by TURN and shows once the shell holds the lens. The page's calm hold shakes the room, not the seal.
import { Euler, Group, Quaternion, Vector3 } from "three";
import { BACK, BELL, DOCK, ENTER, GL, TURN, beatT, radiusAt } from "../clock.js";
import { buildOutside } from "./glass.js";
import { buildIsland } from "./island.js";
import { buildLight } from "./light.js";
import { buildDress } from "./dress.js";
import { buildSet } from "./set.js";
import { buildShell } from "./shell.js";

const UP = new Vector3(0, 1, 0), Q_TURN = new Quaternion().setFromAxisAngle(UP, TURN);
const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), S3 = [0, 0, 0], CAM = new Vector3(), ORIGIN = new Vector3(DOCK[0], DOCK[1], DOCK[2]);
const SHELL_C = new Vector3(0, 0.9, 0);
const bellK = (t) => (t >= BELL ? Math.max(0, 1 - (t - BELL) / 0.25) : 0);
const gust = (t) => (t >= GL ? Math.max(0, 1 - (t - GL) / 0.6) : 0);

export default function build(ctx) {
  const group = new Group(), roomG = new Group();
  roomG.quaternion.copy(Q_TURN);
  roomG.visible = false;
  const island = buildIsland(ctx);
  const set = buildSet(ctx);
  const outside = buildOutside(ctx);
  const light = buildLight(ctx, set.shared);
  const dress = buildDress(ctx, set.shared);
  const shell = buildShell(ctx);
  roomG.add(set.group, outside.group, light.group, dress.group, shell.mesh);
  group.add(island.group, roomG);

  return {
    group,
    update(t, dt, cue) {
      const S = beatT(t), cam = ctx.player?.camera;
      if (cam) CAM.copy(cam.position).sub(ORIGIN).applyAxisAngle(UP, -TURN);
      const r = radiusAt(t), inside = r > CAM.distanceTo(SHELL_C) + 0.3;
      shell.set(r, inside);
      roomG.visible = inside;
      island.page(inside, t < ENTER || t >= BACK);
      island.step(t);

      const calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        roomG.quaternion.copy(QA).multiply(Q_TURN);
      } else roomG.quaternion.copy(Q_TURN);

      const tier2 = ctx.atTier(2);
      set.parts.petals.count = tier2 ? 110 : 40;
      light.group.children[0].visible = tier2; // light.js order: shafts, patches, dust
      light.group.children[2].visible = tier2;
      set.setGust(gust(t));
      set.step(S, CAM);
      light.step(S, bellK(t));
      dress.step(S);
      outside.step(S);
    },
    dispose() {
      island.dispose();
      set.dispose();
      outside.dispose();
      light.dispose();
      dress.dispose();
      shell.dispose();
    },
  };
}
