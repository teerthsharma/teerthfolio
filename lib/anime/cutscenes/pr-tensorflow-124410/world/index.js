// WORLD for pr-tensorflow-124410: the island round the dock, and the dimension (dam set, gantry, figures, props) built at 1:1 and shown at K.
// The world layer is the only writer of the shared uniforms (live/shared.js); cast and fx bind the same objects. Frame: the dock at the group origin.
import { Euler, Group, Quaternion, Vector3 } from "three";
import { araki } from "../live/shared.js";
import { setPalette } from "../live/ink.js";
import { buildIsland } from "./island.js";
import { buildSet } from "./set.js";
import { buildGantry } from "./gantry.js";
import { buildFigures } from "./figures.js";
import { buildProps } from "./props.js";
import { DOCK, FOV, FRAME, HIT, K, LINE, SWAP, T, barrAt, g, negAt, palAt, panelAt, shiftAt, smooth, tearK, tearU, worldT } from "../clock.js";

const SPHERE = 40, AT = new Vector3(...DOCK), EYE = new Vector3(), S3 = [0, 0, 0];
const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler();
const hit = (tt, h, k) => (tt >= h && tt < h + 0.17 ? k : 0);

export default function build(ctx) {
  const U = araki(ctx).U;
  const island = buildIsland(), set = buildSet(ctx, U), gantry = buildGantry(ctx, U), figures = buildFigures(ctx, U), props = buildProps(ctx, U);
  const group = new Group(), pageG = new Group(), rig = new Group();
  rig.add(set.group, gantry.group, figures.group, props.group);
  rig.scale.setScalar(K);
  pageG.add(rig);
  island.group.rotation.y = -FRAME; // the island is in world axes; the group is turned by FRAME for the dimension
  group.add(island.group, pageG);
  const aux = { inside: false, torn: false, gone: false, tearK: 0, quake: 0, ringAge: 0, barr: 0 };

  return {
    group,
    update(t, dt, cue) {
      const tt = t, wt = worldT(tt), torn = tt >= SWAP, tk = tearK(tt);
      const r = SPHERE * smooth(T.bloom[0], T.bloom[1], tt), cam = ctx.player?.camera;
      const dist = cam ? cam.position.distanceTo(AT) : 0;
      aux.inside = r > dist + 0.3;
      aux.torn = torn;
      aux.tearK = tk;
      aux.gone = torn && tk >= 1;
      aux.barr = barrAt(tt);
      aux.quake = aux.barr * 0.05 + hit(tt, HIT.drown, 0.08);
      aux.ringAge = gantry.ringAge(tt);

      U.uTime.value = wt;
      U.uInvert.value = (tt >= 5 && tt < 7.2) || negAt(tt) ? 1 : 0;
      const dpr = ctx.engine.renderer?.getPixelRatio?.() ?? 1;
      U.uCell.value = 7 * dpr;
      ctx.engine.renderer?.getDrawingBufferSize?.(U.uRes.value);
      setPalette(U, palAt(tt));
      U.uShift.value = shiftAt(tt);
      const pn = panelAt(tt);
      if (pn) U.uPanel.value.set(...pn);
      else U.uPanel.value.set(0, 0, 0, 0);
      U.uTear.value = torn ? tearU(tt) : -1;

      // the island's land is hidden while the dimension covers it (inside the sphere, from the bloom) and comes back after the tear, in four waves
      island.page((aux.inside || tt > 1.6) && !torn, tt < LINE.impact || torn);
      island.ring(Math.min(1, Math.max(0, (g(tt) - LINE.impact) / 0.4333)));
      island.wave(torn ? tk : 1);
      rig.visible = tt >= LINE.impact;

      // the hold: the frame's shake is calmed for the seal's sake, so the dimension takes the rest of it, turned about the lens
      const calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      pageG.position.set(0, 0, 0);
      pageG.quaternion.identity();
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * FOV * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        pageG.quaternion.copy(QA);
        pageG.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }

      set.update(tt, wt, aux);
      gantry.update(tt, wt, aux);
      figures.update(tt, wt, aux);
      props.update(tt, wt, aux);
    },
    dispose() {
      set.dispose?.(); gantry.dispose?.(); figures.dispose?.(); props.dispose?.(); island.dispose?.();
    },
  };
}
