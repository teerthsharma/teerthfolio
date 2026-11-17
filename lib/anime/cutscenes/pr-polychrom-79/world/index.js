// WORLD for pr-polychrom-79: the island (shown whenever the pale pup is), the Gate of Babylon (dome, portals, vault, motes) and the wind behind the King, one plate on the live clock.
// The world turns about the lens for the hold's shake (menace.calm) and jolts in the build-ups (joltAt, the same grid as the wind); the seal stays still. Layer 0, drawn behind the cast.
// The whole world hides under the opaque plates (plateAt), so their draws do not add to the frame.
import { Euler, Group, Quaternion, Vector3 } from "three";
import { buildGate } from "./gate.js";
import { buildIsland } from "./island.js";
import { buildWind } from "./wind.js";
import { DOCK, F, HIT, T, TURN, joltAt, plateAt } from "../clock.js";

const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), S3 = [0, 0, 0];
const L = new Vector3(), D = new Vector3(...DOCK), R = new Vector3(), UP = new Vector3(), RT = new Vector3();

export default function build(ctx) {
  const island = buildIsland({ stand: ctx.scene.stand }), gate = buildGate(ctx), wind = buildWind(ctx), group = new Group();
  group.add(island.group, gate.group, wind.group);
  ctx.volleyAt = (t) => gate.volleyAt(t);
  const standAt = (t) => { let s = null; for (const e of ctx.scene.stand ?? []) if (e.t <= t) s = e; return s; };
  return {
    group,
    update(t, dt, cue) {
      const king = t >= TURN + F(1) && t < T.edge;
      island.page(king, !king);
      island.update(t, standAt(t));
      const cam = ctx.player.camera;
      gate.update(t, cam);
      wind.update(t, cam);
      const tr = cue?.t ?? t, under = tr >= HIT.flash + F(3) - 1e-6 && tr <= HIT.flash + F(4) + 1e-6;
      const calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      if (calm < 1) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        L.copy(cam.position).sub(D);
        group.quaternion.copy(QA);
        group.position.copy(L).sub(R.copy(L).applyQuaternion(QA));
      } else {
        group.quaternion.identity();
        group.position.set(0, 0, 0);
      }
      group.visible = !plateAt(tr);
      island.group.visible = !under;
      if (under) gate.group.visible = false;
      const [jx, jy] = joltAt(t);
      jolt(jx, jy, cam, group);
    },
    dispose() { island.dispose(); gate.dispose(); wind.dispose(); },
  };
}

// a stepped shove of the whole world, in frame heights from joltAt; the King is never moved here
function jolt(jx, jy, cam, group) {
  if (!jx && !jy) return;
  const m = 2 * cam.position.distanceTo(D) * Math.tan((cam.fov * Math.PI) / 360);
  UP.set(0, 1, 0).applyQuaternion(cam.quaternion); RT.set(1, 0, 0).applyQuaternion(cam.quaternion);
  group.position.addScaledVector(RT, jx * m).addScaledVector(UP, jy * m);
}
