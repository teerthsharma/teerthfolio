// Pools of pr-highway-3244: tyre smoke, confetti and speed streaks in the track frame; the Ka-chow glint, cream flash and chequered page in the rig frame.
import { Group, Object3D, Quaternion, Vector3 } from "three";
import { BETA, CAR_S, heroState } from "../race.js";
import { C, DOCK, TURN, rotY, smooth, warp } from "../clock.js";
import { FINISH, START, T, heroDist, heroSpeed, heroZ } from "../live/path.js";
import { confetti, glint, pageFlag, smokePool, streaks } from "../live/fx.js";
import { flashQuad, holdFlash } from "../live/parts.js";
import { hash } from "../live/shade.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const UP = new Vector3(0, 1, 0);
const QT = new Quaternion().setFromAxisAngle(UP, -TURN);
const toRig = (v) => { const r = rotY(-TURN, [v.x - DOCK[0], v.y - DOCK[1], v.z - DOCK[2]]); return v.set(r[0], r[1], r[2]); };
const raceAt = (t) => {
  const v = heroSpeed(t), vz = (heroZ(t + 0.03) - heroZ(t - 0.03)) / 0.06;
  return { lx: START[0] - heroDist(t), lz: heroZ(t), d: v > 1 ? clamp(2.8 * Math.atan2(vz, v + 4), -0.85, 0.85) : 0 };
};

export default function buildPools(ctx) {
  const group = new Group(), track = new Group(), D = new Object3D(), V = new Vector3(), QL = new Quaternion();
  track.rotation.y = BETA;
  const smoke = smokePool(110), conf = confetti(240), streak = streaks(120), star = glint(), flash = flashQuad("#fff1d0"), page = pageFlag();
  track.add(smoke.mesh, conf, streak);
  group.add(track, star, flash, page);
  return {
    group,
    update(tc, cam) {
      const t = warp(tc), back = t >= T.swap, h = heroState(tc);
      track.position.set(h.trackX, h.trackY, h.trackZ);
      for (let k = 0; k < 110; k++) {
        const tb = 3.5 + k * 0.022, age = t - tb;
        if (age < 0 || age > 1.05 || back) {
          D.position.set(0, -50, 0); D.rotation.set(0, 0, 0); D.scale.setScalar(0.0001); D.updateMatrix();
          smoke.mesh.setMatrixAt(k, D.matrix); smoke.alpha.array[k] = 0;
          continue;
        }
        const R = raceAt(tb), vzb = (heroZ(tb + 0.03) - heroZ(tb - 0.03)) / 0.06;
        const e = Math.max(1 - ramp(tb, T.go + 0.6, T.go + 1.2), clamp(Math.abs(vzb) / 1.6) * (tb > 4.0 ? 1 : 0)) * (tb < T.cross ? 1 : 0);
        const side = k % 2 ? 1 : -1;
        const sx = R.lx + 1.2 * CAR_S * Math.cos(R.d), sz = R.lz + side * 0.8 * CAR_S - 1.2 * CAR_S * Math.sin(R.d);
        const life = age / 1.05, sc = (0.3 + 1.7 * Math.sqrt(life)) * (0.6 + 0.4 * e);
        D.position.set(sx + 2.5 * age + 0.4 * side * hash(k, 3) * age, 0.3 + age + 0.5 * hash(k, 4) * age, sz + side * 0.9 * age * hash(k, 5));
        D.rotation.set(0, 0, 0); D.scale.set(sc, sc * 0.8, sc); D.updateMatrix();
        smoke.mesh.setMatrixAt(k, D.matrix);
        smoke.alpha.array[k] = e > 0.25 ? 0.85 * Math.pow(1 - life, 1.3) * clamp(e * 1.3) : 0;
      }
      smoke.mesh.instanceMatrix.needsUpdate = true;
      smoke.alpha.needsUpdate = true;

      const cu = conf.material.uniforms;
      cu.uT.value = t;
      cu.uB1.value = T.go - 0.1;
      cu.uC1.value.set(START[0] - 4, 0, -17);
      cu.uB2.value = T.cross - 0.15;
      cu.uC2.value.set(FINISH - 6, 0, -6);
      conf.visible = !back && t > 3;

      streak.material.uniforms.uSpeed.value = h.speedK;
      streak.visible = !back && h.speedK > 0.05 && !group.userData.noStreaks;

      const kc = t - T.kachow;
      QL.copy(QT).multiply(cam.quaternion);
      star.visible = kc > 0 && kc < 0.5 && !back;
      if (star.visible) {
        star.position.set(h.x + 2.15 * CAR_S * Math.cos(h.yaw), h.y + 0.62 * CAR_S, h.z - 2.15 * CAR_S * Math.sin(h.yaw));
        star.quaternion.copy(QL);
        const pk = Math.sin(Math.PI * clamp(kc / 0.5));
        star.scale.setScalar(Math.max(3.0 * Math.pow(pk, 0.7), 0.001));
        star.material.uniforms.uA.value = 1.4 * pk;
        star.material.uniforms.uSpin.value = kc * 4;
      }

      const kb = t - T.cry;
      holdFlash(flash, cam, Math.max(Math.max(0, 1 - Math.abs(kc - 0.04) / 0.1) * 0.22, Math.max(0, 1 - Math.abs(kb) / 0.12) * 0.5) * (back ? 0 : 1));
      const gt = ctx.player?.t ?? tc;
      if (gt >= C.cry && gt < C.cry + 2 / 24) flash.visible = false;
      if (flash.visible) { toRig(flash.position); flash.quaternion.premultiply(QT); }

      const cover = smooth(T.cover[0], T.cover[1], t), turnK = smooth(T.turn[0], T.turn[1], t);
      page.visible = cover > 0.001 && turnK < 0.999;
      if (page.visible) {
        const hgt = 2 * Math.tan((cam.fov * Math.PI) / 360) * 1.2;
        cam.getWorldDirection(V);
        page.position.copy(cam.position).addScaledVector(V, 1.2);
        toRig(page.position);
        page.quaternion.copy(QT).multiply(cam.quaternion);
        const u = page.material.uniforms;
        u.uCover.value = cover;
        u.uTurn.value = turnK;
        u.uH.value = hgt * 1.04;
        u.uW.value = hgt * cam.aspect * 1.04;
        u.uT.value = t;
      }
    },
    dispose() {
      for (const m of [smoke.mesh, conf, streak, star, flash, page]) { m.geometry.dispose(); m.material.dispose(); }
    },
  };
}
