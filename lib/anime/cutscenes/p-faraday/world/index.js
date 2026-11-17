// WORLD for p-faraday: the live blueprint (../live/: sky, bridge, glass, city, fields, figures) and the island it burns back to (island.js).
// The layer's t is real seconds; the picture clock tt = beatT(t) drives the move (fields, Touma, coin, burn), as the live move does.
import { Color, Group, Object3D, Quaternion, Vector3 } from "three";
import { SKY_R } from "../live/backdrop.js";
import { U } from "../live/blue.js";
import { FIELD_T0, SHOT, amberAt, stopped, updateBeam, updateBits, updateFields } from "../live/fields.js";
import { DECK_Y, TRACK_X, TRACK_Y, TRACK_Z, hashN as hash } from "../live/scenery.js";
import { NBULB, NCOLONY, TOUMA, buildWorld } from "../live/world.js";
import { PHI, R, T, beatT, radiusAt, smooth } from "../clock.js";
import { tone } from "../tone.js";
import { buildIsland } from "./island.js";

const CORE = new Vector3(0, 0.9, 0), COIN0 = new Vector3(0.4, 0.9, 0.3), FLING = 3;
const UPY = new Vector3(0, 1, 0), MOON = new Vector3(), V = new Vector3(), HAND = new Vector3(), QW = new Quaternion(), QL = new Quaternion();
const O = new Object3D(), C = new Color(), BASE = new Color("#cfeeff");

export default function build(ctx) {
  const group = new Group(), w = buildWorld(), isl = buildIsland(), done = new Set();
  w.bg.rotation.y = PHI;
  w.bg.traverse((o) => { for (const m of [].concat(o.material ?? [])) if (typeof m?.fragmentShader === "string" && !done.has(m)) { done.add(m); tone(m); } });
  group.add(w.bg, isl.group);

  return {
    group,
    update(t, dt = 0) {
      const tt = beatT(t), ts = stopped(tt), cam = ctx.player.camera, f = w.fields;
      let away = -99;
      if (t >= R.glow) away = tt < T.burn[1] ? -0.5 + 7.5 * smooth(T.burn[0], T.burn[1], tt) ** 2 : 7 + 132 * smooth(T.burn[1], T.burn[2], tt);
      const gone = away > 136;
      U.uAway.value = away; U.uTime.value = ts; U.uShot.value = SHOT; U.uAmber.value = amberAt(tt);
      const wind = smooth(SHOT, SHOT + 0.15, ts) * (1 - smooth(SHOT + 1.2, SHOT + 3.2, ts));
      U.uWind.value = wind; U.uAng.value += dt * (0.5 + 4.5 * wind);

      group.updateWorldMatrix(true, true);
      const r = radiusAt(t), inside = r > cam.position.distanceTo(w.bg.localToWorld(V.copy(CORE))) + 0.3;
      const sky = w.skyMesh, show = (inside || away > -90) && !gone;
      sky.visible = r > 0.02 && !gone;
      sky.position.set(0, CORE.y, 0);
      sky.scale.setScalar(show ? SKY_R : Math.max(r, 0.02));
      sky.material.uniforms.uInside.value = inside ? 1 : 0;
      for (const o of w.bg.children) if (o !== sky) o.visible = show;
      sky.material.uniforms.uMoon.value.copy(MOON.set(-0.62, 0.52, -0.58).normalize().applyAxisAngle(UPY, -PHI));

      w.bg.getWorldQuaternion(QW);
      QL.copy(QW).invert().multiply(cam.quaternion);
      updateFields(f, tt, QL);
      updateBits(f, tt, ts, away > 0 ? T.burn[1] + 1.2 : 0);
      updateBeam(f, ts);
      f.core.visible = f.pool.visible = show && tt > 4.85;
      f.arcs.visible = f.rings.visible = f.marks.visible = show && away < 6;

      const settling = tt > FIELD_T0 && tt < 5.3;
      for (let i = 0; i < NBULB; i++) w.bulbs.setColorAt(i, C.copy(BASE).multiplyScalar(settling ? 0.3 + 0.7 * (hash(i, Math.floor(tt * 12)) > 0.4 ? 1 : 0.15) : 1));
      if (w.bulbs.instanceColor) w.bulbs.instanceColor.needsUpdate = true;

      const u = 0.55 - 0.03 * tt, du = 0.004;
      w.car.position.set(TRACK_X(u), TRACK_Y, TRACK_Z(u));
      w.car.rotation.y = -Math.atan2(TRACK_Z(u + du) - TRACK_Z(u - du), TRACK_X(u + du) - TRACK_X(u - du));
      w.carMat.uniforms.uOff.value.copy(w.car.position);
      w.carLineMat.uniforms.uOff.value.copy(w.car.position);

      const run = smooth(T.come[0], T.come[1], tt), hitK = smooth(SHOT, SHOT + 0.25, ts) * (1 - smooth(SHOT + 1.1, SHOT + 2.2, ts));
      const x = T.come[2] + (T.come[3] - T.come[2]) * run + FLING * 0.8 * hitK - 0.6 * smooth(SHOT - 0.5, SHOT - 0.2, ts) * (1 - hitK);
      const tg = w.touma.group;
      tg.position.set(x, (run < 1 && run > 0 ? 0.13 * Math.abs(Math.sin(tt * 9)) : 0) + 1.2 * hitK * (1 - hitK), TOUMA.z);
      tg.rotation.y = Math.atan2(-x, -TOUMA.z);
      tg.rotation.x = 0.2 * Math.sin(Math.PI * run) * (run < 1 ? 1 : 0) - 1.3 * hitK;
      tg.rotation.z = 0.012 * Math.sin(tt * 2.1);
      w.kuroko.group.rotation.z = 0.01 * Math.sin(tt * 2.7 + 1);

      const flinch = smooth(SHOT, SHOT + 0.1, ts) * (1 - smooth(SHOT + 0.5, SHOT + 0.9, ts));
      const cheer = smooth(13.55, 13.95, tt) * (1 - smooth(16.15, 16.55, tt));
      for (let i = 0; i < NCOLONY; i++) {
        const hop = cheer * Math.abs(Math.sin((Math.floor(tt * 12) + i * 3) * 0.8)) * 0.22;
        O.position.set(-13 + i * 1.9 - flinch * 0.12, DECK_Y + 0.16 + hop, 2.4 + 0.2 * Math.sin(i * 2.3));
        O.rotation.set(0, Math.PI / 2 + 0.4 * Math.sin(i * 1.7), 0);
        O.scale.set(0.7, 0.7 * (1 - 0.3 * flinch), 0.7);
        O.updateMatrix();
        w.colBody.setMatrixAt(i, O.matrix);
        w.colHull.setMatrixAt(i, O.matrix);
      }
      w.colBody.instanceMatrix.needsUpdate = w.colHull.instanceMatrix.needsUpdate = true;

      const toss = smooth(T.toss[0], T.toss[1], tt), showCoin = show && tt > T.coin && ts < SHOT + 0.12 && away < 0;
      w.coin.visible = showCoin;
      if (showCoin) {
        const hand = ctx.seal.named?.()?.handR;
        const p = hand ? w.bg.worldToLocal(HAND.copy(hand)) : COIN0;
        const up = Math.sin(Math.PI * toss) * 2.3, fl = Math.max(0, (ts - T.flick) / 0.12);
        w.coin.position.set(p.x + fl * 5, p.y + 0.12 + up + 0.2 * fl, p.z);
        w.coin.rotation.set(toss * Math.PI * 7, 0, 0.5);
        w.coin.scale.setScalar(1 + 0.4 * Math.max(0, 1 - Math.abs(toss - 0.5) * 3));
      }

      isl.page(show && away < 70, t < R.impact || t >= R.pass, t >= R.end - 3 ? t : null);
    },
    dispose() { isl.dispose(); w.dispose(); },
  };
}
