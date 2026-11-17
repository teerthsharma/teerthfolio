// CAST for p-epsilon-hollow (Rimuru). Layer 1. The pale playable seal stands on the island; from the turn to the return the hero seal wears the
// Rimuru look where the pup stood. Veldora and the Epsilon Hollow orb are the live cast pieces, placed and timed as the live play has them.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { AT, HIT, SEAL, T, smooth } from "../clock.js";
import { hollowSphere, makeRim } from "../live/slime.js";
import { veldora } from "../live/figures.js";

const IN = [0.5, 1.16, 0.97], OUT = [0.6, 1.14, 1.14, 0.96, 0.96];
const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const sh = ctx.engine.shared, group = new Group(), seal = ctx.seal.group;
  const line0 = sh.uLine.value.clone(), scale0 = seal.scale.clone();
  const light0 = { dir: sh.uLightDir.value.clone(), col: sh.uLightCol.value.clone(), rimDir: sh.uRimDir.value.clone(), rimCol: sh.uRimCol.value.clone() };
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.3, 0.6, 2.1, 0.6], blink: [2.6, 7.4, 22.0] } });
  const rim = makeRim(), vel = veldora(rim), orb = hollowSphere();
  group.add(pup.group, vel.root, orb.root);
  return {
    group,
    update(t) {
      const on = t >= HIT.turn && t < HIT.back;
      const enter = Math.floor((t - HIT.turn) * 12 + 1e-6), leave = Math.floor((t - HIT.back) * 24 + 1e-6);
      seal.visible = on;
      pup.group.visible = !on;
      pup.update(t);
      if (on) squash(seal, enter >= 0 && enter < IN.length ? IN[enter] : leave >= -4 && leave < 0 ? 0.86 : 1, SEAL.rimuruScale);
      else squash(pup.group, leave >= 0 && leave < OUT.length ? OUT[leave] : 1, 1);
      sh.uLine.value.set(on ? 2.4 : line0.x, line0.y, on ? 1 : line0.z, line0.w);
      const war = t >= T.war[0];
      sh.uRimDir.value.set(-0.45, 0.35, -0.6).normalize();
      sh.uRimCol.value.set(war ? "#ffb070" : "#33e6ff");
      sh.uLightDir.value.set(-0.5, 0.62, 0.62).normalize();
      sh.uLightCol.value.set(war ? 1.0 : 0.92, war ? 0.93 : 0.9, war ? 0.86 : 1.0);
      const vk = smooth(2.0, 3.0, t), pull = smooth(13.7, 14.6, t);
      vel.root.position.set(...lerp3([AT.veldora[0], AT.veldora[1] + 0.12 * Math.sin(1.4 * t), AT.veldora[2]], AT.maw, pull));
      vel.root.scale.setScalar(Math.max(0.001, vk * (1 - 0.98 * pull)));
      vel.root.rotation.z = 9 * pull;
      vel.root.visible = vk > 0.01 && pull < 0.995;
      vel.update(t, vk);
      rim.uniforms.uTime.value = t;
      rim.uniforms.uGlow.value = 0.5 + 0.5 * Math.sin(9 * t);
      const hk = smooth(1.4, 2.4, t) * (1 - smooth(9.0, 9.8, t));
      orb.root.position.set(AT.hollow[0], AT.hollow[1] + 0.1 * Math.sin(1.5 * t), AT.hollow[2]);
      orb.root.scale.setScalar(0.95 * hk);
      orb.root.rotation.set(0.4 * t, 0.7 * t, 0);
      orb.root.visible = hk > 0.01;
    },
    dispose() {
      sh.uLine.value.copy(line0);
      sh.uLightDir.value.copy(light0.dir);
      sh.uLightCol.value.copy(light0.col);
      sh.uRimDir.value.copy(light0.rimDir);
      sh.uRimCol.value.copy(light0.rimCol);
      seal.visible = true;
      seal.scale.copy(scale0);
      pup.dispose();
      vel.dispose();
      orb.dispose();
      rim.dispose();
    },
  };
}
