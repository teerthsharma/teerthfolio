// WORLD for p-nerve (layer 0): the live rooftop in the rain on the live clock (../live/), the pastel island it breaks into, the station,
// the props and the far city. The dimension is up from the turn to the break; the island is whole before the turn and from the break.
// In the hold the world turns about the lens by the camera shake the seal's calm withholds (the seal and the cast stay still).
import { Euler, Group, Mesh, Quaternion, Vector3 } from "three";
import { disposeScenery, buildScenery } from "../live/world.js";
import { tickWorld } from "../live/tick.js";
import { U } from "../live/look.js";
import { buildIsland } from "./island.js";
import { buildHut } from "./hut.js";
import { buildProps } from "./props.js";
import { buildFar } from "./far.js";
import { buildPeaks } from "./peaks.js";
import { BACK, BOOST, CORE_Y, DOCK, LINE, SKY_R, T, unwarp } from "../clock.js";
import { tone } from "../tone.js";

const AT = new Vector3(...DOCK), FALLBACK = { aspect: 1.78 };
const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), EYE = new Vector3(), S3 = [0, 0, 0];

export default function build(ctx) {
  const m = buildScenery();
  const island = buildIsland(ctx), hut = buildHut(), props = buildProps(), far = buildFar(ctx), peaks = buildPeaks(ctx);
  island.group.add(peaks.group);
  const dome = new Mesh(m.dome.g, m.dome.m);
  dome.position.set(0, CORE_Y, 0);
  dome.scale.setScalar(SKY_R);
  dome.renderOrder = -3;
  dome.frustumCulled = false;
  m.dome.m.uniforms.uInside.value = 1;
  const rig = new Group();
  rig.add(dome, m.roof.group, m.city.group, m.tower.group, m.realm.group, m.beam.mesh, m.rain.group, m.splashes.mesh, m.grains.mesh, m.motes.mesh, far.group);
  const group = new Group();
  group.add(island.group, hut.group, props.group, rig);
  const seen = new Set();
  group.traverse((o) => {
    const mat = o.material;
    if (!mat?.isShaderMaterial || seen.has(mat)) return;
    seen.add(mat);
    if (!mat.userData.toned) { tone(mat); mat.userData.toned = true; }
  });

  return {
    group,
    update(t, dt, cue) {
      const tt = unwarp(t), cam = ctx.player?.camera;
      // the hold: the seal's calm (menace.calm) keeps the shake off the seal, so the world turns about the lens by the rest of it
      const calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      group.position.set(0, 0, 0); group.quaternion.identity();
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        group.quaternion.copy(QA); group.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }
      const dim = t >= LINE.cut && t < BACK + 1.7, pale = t < LINE.cut || t >= BACK;
      U.uBoost.value = BOOST ? 1 : 0;
      tickWorld(m, tt, cam ?? FALLBACK, tt - T.crunch, { origin: AT });
      rig.visible = dim;
      island.set(pale, pale);
      hut.group.visible = pale;
      props.group.visible = pale;
      hut.update(t);
      far.update(tt);
    },
    dispose() {
      island.dispose(); hut.dispose(); props.dispose(); far.dispose(); peaks.dispose();
      disposeScenery(m);
    },
  };
}
