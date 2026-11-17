// WORLD for pr-pyrefly-4180: the kiri-e paper stage, layer 0, redrawn every step. The theatre, the clock and the flats are the live move's (play/),
// the set and the backdrop are the render boost (set.js, backdrop.js, atmo.js; `?boost=off` leaves them out for the probes), and the pale island
// is the site's own (island.js). The rig frame is the dock; the group is turned onto the site by TURN, so the island is turned back here.
import { Euler, Group, Matrix4, Quaternion, Vector3 } from "three";
import { BACK, DOCK, LINE, TURN } from "../clock.js";
import { buildPlay } from "../play/index.js";
import { worldLayers, worldMaterials } from "../live/world.js";
import { toneAll } from "../tone.js";
import { buildIsland } from "./island.js";
import { setLayers } from "./set.js";
import { backdropLayers, backdropMaterials } from "./backdrop.js";
import { buildAtmo } from "./atmo.js";

const AT = new Vector3(...DOCK), EYE = new Vector3(), S3 = [0, 0, 0];
const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler();
const MW = new Matrix4(), MR = new Matrix4(), MT = new Matrix4(), MI = new Matrix4();

export default function build(ctx) {
  const boost = new URLSearchParams(globalThis.location?.search ?? "").get("boost") !== "off";
  const mats = toneAll({ ...worldMaterials(), ...backdropMaterials() });
  const layers = [...worldLayers(), ...(boost ? [...setLayers(), ...backdropLayers()] : [])];
  const island = buildIsland();
  island.group.rotation.y = -TURN;
  const play = buildPlay({ mats, layers, aspect: ctx.aspect() });
  const atmo = buildAtmo(mats);
  ctx.pf = play.state;

  const group = new Group(), page = new Group();
  group.add(island.group, page);
  page.add(play.root, atmo.root);

  return {
    group,
    update(t, dt, cue) {
      // the hold: the frame's shake is calmed for the seal's sake (menace.calm), so the page takes the rest of it, turned about the lens
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      page.position.set(0, 0, 0); page.quaternion.identity(); page.scale.set(1, 1, 1);
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        EYE.copy(cam.position);
        group.updateWorldMatrix(true, false);
        MW.makeTranslation(EYE.x, EYE.y, EYE.z).multiply(MR.makeRotationFromQuaternion(QA)).multiply(MT.makeTranslation(-EYE.x, -EYE.y, -EYE.z));
        page.matrix.multiplyMatrices(MI.copy(group.matrixWorld).invert(), MW).multiply(group.matrixWorld).decompose(page.position, page.quaternion, page.scale);
      }
      play.update(t, { cam, aspect: ctx.aspect(), tip: null });
      const st = play.state;
      island.page((st.inside || t > 1.6) && t < 26.0, t < LINE.impact || t >= BACK + 2 / 24);
      atmo.update(t, ctx.tier ?? 3, st);
    },
    dispose() {
      play.dispose(); island.dispose(); atmo.dispose();
      for (const m of Object.values(mats)) m.dispose?.();
    },
  };
}
