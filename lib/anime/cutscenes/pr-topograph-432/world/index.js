// WORLD for pr-topograph-432: the throne room (hall.js, its circles, cracks and torn banners), Ainz on his throne (cast/ainz.js) and the island
// the cutscene opens and closes on (island.js). Built in the rig frame: the dock at the origin, the throne toward -z. Drawn on the world's own clock.
import { Euler, Group, Quaternion, Vector2, Vector3 } from "three";
import { buildHall, THRONE_Z, TOP_Y } from "./hall.js";
import { buildIsland } from "./island.js";
import { buildAinz, poseAinz } from "../cast/ainz.js";
import { SH } from "../live/comic.js";
import { DOCK, HIT, T, onTwos, smooth } from "../clock.js";
import { tone } from "../tone.js";

const AT = new Vector3(...DOCK), EYE = new Vector3(), QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), S3 = [0, 0, 0];
const clamp = (x) => Math.min(1, Math.max(0, x));
const bump = (a, b, t) => (t < a || t > b ? 0 : Math.sin((Math.PI * (t - a)) / (b - a)));

export default function build(ctx) {
  const hall = buildHall(), island = buildIsland(), ainz = buildAinz();
  ainz.root.traverse((o) => { const m = o.material; if (m?.isShaderMaterial && !m.fragmentShader.includes("siteTone")) tone(m); });
  const hallRig = new Group(), group = new Group(), renderer = ctx.engine.renderer, size = new Vector2();
  hallRig.add(hall.group, ainz.root);
  group.add(island.group, hallRig);
  return {
    group,
    update(t, dt, cue) {
      const dpr = renderer.getPixelRatio();
      renderer.getSize(size); SH.uTime.value = onTwos(t); SH.uRes.value.set(size.x * dpr, size.y * dpr); SH.uOut.value = 2.6 * dpr;
      const hallOn = t >= T.turn && t < T.back + 2 / 24, islandOn = t < T.impact || t >= T.back;
      hallRig.visible = hallOn;
      island.group.visible = islandOn;
      island.page(hallOn, islandOn);
      const s = onTwos(t);
      const rise = smooth(7.4, 9.7, t) * (1 - smooth(18.0, 19.8, t));
      const open = smooth(9, 11, t) * (1 - smooth(17.4, 18.6, t));
      const flare = clamp(0.12 + smooth(8.4, 10, t) * 0.88 * (1 - smooth(18, 19.6, t)));
      const eye = smooth(T.ignite[0], T.ignite[1], t), jaw = bump(5.0, 5.35, t) + bump(9.0, 9.5, t);
      ainz.root.position.set(0, TOP_Y + 1.15 + 0.78 * rise, THRONE_Z + 0.25 + 2.0 * rise);
      poseAinz(ainz, { rise, open, flare, eye, jaw });
      hall.setCircles({ t: s, bigK: clamp((s - HIT.reveal) / 0.9) });
      hall.tear(clamp((s - HIT.reveal) / 1.4));
      hall.crack("A", clamp((s - HIT.rise) / 0.8));
      hall.crack("B", clamp((s - HIT.staff) / 0.12));
      // the hold: the frame's shake is calmed for the seal's sake (menace.calm), so the room takes the rest of it, turned about the lens
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      hallRig.position.set(0, 0, 0); hallRig.quaternion.identity();
      if (calm < 1 && cam) {
        const sh = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(sh[1] * k, sh[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        hallRig.quaternion.copy(QA);
        hallRig.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }
    },
    dispose() { hall.dispose(); island.dispose(); ainz.dispose(); },
  };
}
