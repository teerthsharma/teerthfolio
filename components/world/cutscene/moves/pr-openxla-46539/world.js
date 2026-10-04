// THE KAMINO DIMENSION, assembled: every mesh of the scene and the one
// function that moves them all. The React move (../pr-openxla-46539.jsx) is a
// thin shell around this; nothing here touches React, so a probe can run the
// whole scene on its own. The rig's frame: the pup at the origin facing +z,
// the lens out along +z, the avenue running away along -z.
//
//   const w = makeWorld({ tl, KN });  w.root is the group to mount
//   const o = w.update({ t, cam, width, height, dpr, seal, r, fist, out })
//     -> what the shell applies to the pup and the island: pose hooks, a
//        shake, a jump, the cape's wind, the V's strength, the paint, the reveal
//   w.dispose()

import { Group, Mesh, Vector3 } from "three";
import { signAt } from "../../../../../lib/world/cutscene/timeline";
import { flashQuad, holdFlash, lettering } from "../p-caustic/parts";
import { buildCity } from "./city";
import { beamFx, burstFx, domeFx, geyserFx, halosFx, panelFx, pillarFx, rainFx, smokeFx } from "./fx";
import { hullMaterial, worldMaterial } from "./mesh";
import { NOMU_H, SHOULDER, nomu } from "./nomu";
import { SH, tickShared } from "./print";
import { cardFx, crowdFx, flagsFx, rocksFx } from "./props";
import { sky } from "./sky";

const CORE_Y = 0.9;
export const NOMU_AT = [3.3, -11];
const PILLAR = [-0.4, -26, 8];
const STRIKES = [0.9, 2.45, 4.15, 5.7, 6.55]; // the lightning, before the punch
const V = new Vector3();
const PQ = new Vector3();
const A_AT = [0, 0, 0];
const B_AT = [0, 0, 0];

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const onTwos = (t) => Math.floor(t * 12) / 12;

// the panel quad: held a metre in front of the lens, sized to cover it, in the rig's own space
function holdPanel(mesh, camera, mat, k) {
  const rigGroup = mesh.parent;
  camera.getWorldDirection(PQ);
  PQ.add(camera.position);
  rigGroup.worldToLocal(PQ);
  mesh.position.copy(PQ);
  mesh.quaternion.copy(rigGroup.quaternion).invert().multiply(camera.quaternion);
  const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * 1.06;
  mesh.scale.set(h * camera.aspect, h, 1);
  mat.uniforms.uK.value = k;
  mat.uniforms.uAsp.value = camera.aspect;
}

export function makeWorld({ tl, KN }) {
  SH.uCrater.value.set(-3.0 * KN, -6.4, 3.0);
  SH.uPillar.value.set(PILLAR[0], PILLAR[1], PILLAR[2]);
  const city = buildCity(KN);
  const crater = SH.uCrater.value.toArray();
  const sk = sky();
  sk.m.uniforms.uMaxR.value = KN < 1 ? 0.16 : 0.28;
  const wMat = worldMaterial();
  const hMat = hullMaterial();
  const nm = nomu();
  const smoke = smokeFx([...city.info.smoke, { x: crater[0] + 0.4, y: 0.5, z: crater[1], s: 0.9, big: 1.1 }, { x: crater[0] - 0.8, y: 0.3, z: crater[1] - 0.6, s: 0.7 }]);
  const halos = halosFx([{ x: crater[0], y: 1.4, z: crater[1], s: 6.5 }, ...city.info.lamps.filter((l) => l.z < -8)]); // the vent's glow first
  const rain = rainFx([crater[0], crater[1]], KN);
  const pillar = pillarFx(PILLAR);
  const bu = burstFx();
  const bm = beamFx();
  const dm = domeFx();
  const pn = panelFx();
  const gy = geyserFx();
  const cards = cardFx();
  const crowd = crowdFx(city.info.roofs);
  const flags = flagsFx(city.info.flags);
  const rocks = rocksFx(city.groundY, crater, city.info.HW);
  const smash = lettering("SMASH!", "#ec2a8a", -0.1);
  const rip = lettering("RIIIP!", "#d6282b", 0.06);
  const flash = flashQuad("#fff4e4");

  // the meshes
  const mk = (g, m, order = 0) => {
    const x = new Mesh(g, m);
    x.frustumCulled = false;
    x.renderOrder = order;
    return x;
  };
  const root = new Group();
  root.visible = false;
  const shell = mk(sk.g, sk.m, -3);
  shell.position.set(0, CORE_Y, 0);
  const world = new Group();
  const nomuRoot = new Group();
  nomuRoot.position.set(NOMU_AT[0], -NOMU_H, NOMU_AT[1]);
  nomuRoot.scale.setScalar(KN < 1 ? 0.62 : 0.76);
  const armL = new Group();
  armL.position.set(...SHOULDER);
  const armR = new Group();
  armR.position.set(-SHOULDER[0], SHOULDER[1], SHOULDER[2]);
  armL.add(mk(nm.armL, wMat), mk(nm.armL, hMat));
  armR.add(mk(nm.armR, wMat), mk(nm.armR, hMat));
  nomuRoot.add(mk(nm.body, wMat), mk(nm.body, hMat), armL, armR);
  const inst = new Group();
  const geyser = mk(gy.g, gy.m);
  geyser.visible = false;
  inst.add(rocks.rubble, rocks.rubbleH, rocks.debris, rocks.debrisH, crowd.A, crowd.B, flags.obj, smoke.obj, halos.obj, rain.obj, pillar.shaft, pillar.pool, geyser, cards.A, cards.B, cards.M);
  world.add(mk(city.ground, wMat, -1), mk(city.props, wMat), mk(city.props, hMat, -0.5), nomuRoot, inst);
  const burst = mk(bu.g, bu.m, 20);
  const beam = mk(bm.g, bm.m, 19);
  const dome = mk(dm.g, dm.m, 18);
  const panel = mk(pn.g, pn.m, 35);
  for (const x of [burst, beam, dome, panel]) x.visible = false;
  root.add(shell, world, burst, beam, dome, panel, smash, rip);

  const o = { shakeX: 0, shakeY: 0, pupY: 0, pose: { sign: 0, fist: 0, raise: 0, crouch: 0 }, capeOn: false, wind: 0, billow: 0, auraOn: false, auraK: 0, paint: false, reveal: false, held: false, flash };
  const odd = { v: 1 };

  function update(c) {
    const { cam, seal, fist, r, out, width, height, dpr } = c;
    const t = c.t;
    const tt = onTwos(t);
    const hit = tl.lineB; // the punch
    const BRK = tl.lineC - 0.6; // the page tears
    const brk = tt - BRK;
    const broken = brk > 0;
    const age = tt - hit;
    const wide = width / height >= 1;
    tickShared({ gl: { getPixelRatio: () => dpr }, size: { width, height } }, t, broken ? brk : -1);
    odd.v = Math.floor(t * 12) % 2 ? 1 : -1;
    flash.visible = false;

    // the impacts shake the whole frame, two drawings each
    const bump = (a, k) => (tt >= a && tt < a + 0.17 ? k : 0);
    const amp = bump(hit, 0.2) + bump(hit + 0.17, 0.12) + bump(hit + 0.34, 0.07) + bump(2.1, 0.07) + bump(2.5, 0.06) + bump(BRK, 0.1);
    o.shakeX = amp * odd.v;
    o.shakeY = -amp * 0.6 * odd.v;
    root.position.set(seal.x + o.shakeX, o.shakeY, seal.z);

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until the page tears
    V.set(seal.x, CORE_Y, seal.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    shell.visible = r > 0.02 && brk < 1.6;
    shell.scale.setScalar(inside || broken ? 140 : Math.max(r, 0.02));
    const su = sk.m.uniforms;
    su.uInside.value = inside || broken ? 1 : 0;
    world.visible = (inside || broken) && brk < 1.5;
    inst.visible = !broken || brk < 1.4;

    // THE WEATHER: lightning before the punch; the punch opens the sky and winds the storm into a vortex
    let fl = 0;
    if (age < 0) for (const k of STRIKES) fl = Math.max(fl, tt >= k && tt < k + 0.34 ? (Math.floor((tt - k) * 12) % 2 ? 0.45 : 1) * (1 - (tt - k) / 0.34) : 0);
    su.uFlash.value = fl;
    su.uOpen.value = smooth(hit, hit + 2.2, tt);
    su.uSwirl.value = age > 0 ? 0.55 * age : 0;
    SH.uSun.value = smooth(hit + 0.2, hit + 1.9, tt);
    const wind = age < 0 ? 0.3 + 0.2 * Math.sin(tt * 1.3) : 0.6 + 2.6 * Math.exp(-age * 0.9);
    const cx = { tt, cam, wind: wind * 0.9, gone: brk > 1.2, hit, brk: broken ? brk : -1, rise: tl.enter, k: smooth(hit + 0.3, hit + 1.6, tt) };
    smoke.tick(cx);
    halos.tick(cx);
    rain.tick(cx);
    pillar.tick(cx);
    crowd.tick(cx);
    flags.tick({ ...cx, wind: Math.min(1.6, wind) });
    rocks.tick(cx);

    // THE NOMU: out of the street, throws the cards, staggers back at the punch
    const rise = smooth(tl.enter, tl.enter + 1.15, tt);
    const stag = smooth(hit, hit + 0.35, tt) * (1 - smooth(hit + 2.4, hit + 3.4, tt) * 0.35);
    nomuRoot.position.set(NOMU_AT[0] - 0.6 * stag, -(NOMU_H - 0.4) * (1 - rise) ** 2 + (rise < 1 && rise > 0 ? 0.05 * Math.sin(tt * 40) : 0), NOMU_AT[1] - 1.4 * stag);
    nomuRoot.rotation.set(-0.28 * stag + 0.015 * Math.sin(tt * 2.1), -0.18 + 0.05 * Math.sin(tt * 0.9), 0);
    const thrA = smooth(3.1, 3.55, tt) * (1 - smooth(3.55, 4.4, tt));
    const thrB = smooth(3.55, 4.0, tt) * (1 - smooth(4.0, 4.9, tt));
    const guard = smooth(hit, hit + 0.25, tt);
    const bob = 0.03 * Math.sin(tt * 3.3);
    armL.rotation.set(0.15 - 1.6 * thrA - 1.65 * guard * (1 - thrA) + bob, 0, -0.25 * guard);
    armR.rotation.set(0.15 - 1.65 * thrB - 1.65 * guard * (1 - thrB) + bob * 1.3, 0, 0.25 * guard);
    root.updateMatrixWorld(true);
    const hand = (arm, side, to) => {
      V.set(side * 0.75, -4.1, 1.5);
      arm.localToWorld(V);
      root.worldToLocal(V);
      to[0] = V.x;
      to[1] = V.y;
      to[2] = V.z;
    };
    hand(armL, 1, A_AT);
    hand(armR, -1, B_AT);

    // THE CARDS: thrown at the pup, hover either side with outputs that differ, smashed into one at the punch
    const { A, B, M } = cards;
    const nk = KN < 1 ? 0.8 : 1;
    const place = (cd, start, t0c, hov, spin, sign) => {
      const e = smooth(t0c, t0c + 1.0, tt);
      let x = start[0] + (hov[0] - start[0]) * e;
      let y = start[1] + (hov[1] - start[1]) * e + Math.sin(Math.PI * e) * 1.3 + 0.12 * Math.sin(tt * 2.6 + sign) * e;
      let z = start[2] + (hov[2] - start[2]) * e;
      const c2 = smooth(hit - 0.08, hit + 0.1, tt); // the punch calls them in
      x += (fist[0] + 0.3 - x) * c2;
      y += (fist[1] + 0.6 - y) * c2;
      z += (fist[2] + 0.3 - z) * c2;
      cd.position.set(x, y, z);
      cd.rotation.set(0, (1 - e) * spin + 0.18 * sign * (1 - c2), 0.1 * sign * (1 - e * 0.4) + 0.12 * Math.sin(tt * 4 + sign) * (1 - c2));
      const sc = smooth(t0c - 0.05, t0c + 0.25, tt) * (1.05 + 0.12 * Math.sin(tt * 3 + sign));
      cd.scale.setScalar(Math.max(0.0001, sc) * 0.78 * (1 - 0.35 * c2));
      cd.visible = tt > t0c - 0.05 && age < 0.12 && !broken;
    };
    place(A, A_AT, 3.3, [-2.1 * nk, 1.8, 0.9], 9, -1);
    place(B, B_AT, 3.75, [2.2 * nk, 1.8, 0.7], -9, 1);
    const mg = age - 0.12;
    M.visible = mg > 0 && !broken;
    if (M.visible) {
      const pop = 1 + 0.5 * Math.exp(-mg * 6) * Math.cos(mg * 22);
      const e2 = smooth(0, 0.7, mg); // from the smash point to its hover beside the pup
      const hx = -1.55 * nk + 0.15 * Math.sin(tt * 2);
      const hy = 2.5 + 0.18 * Math.sin(tt * 2.4) + 0.25 * smooth(0, 2.5, mg);
      M.position.set(fist[0] + 0.3 + (hx - fist[0] - 0.3) * e2, fist[1] + 0.6 + (hy - fist[1] - 0.6) * e2, fist[2] + 0.3 + (0.8 - fist[2] - 0.3) * e2);
      M.rotation.set(0, 0.1 * Math.sin(tt * 1.5), -0.1 + 0.03 * Math.sin(tt * 3));
      M.scale.setScalar(Math.min(1.0, smooth(0, 0.18, mg) * 1.0) * pop * (wide ? 1 : 0.8));
    }

    // THE HERO: the sign, the raised fist, the crouch, the spring, the punch
    o.pose.sign = signAt(tl, t) * (1 - smooth(1.4, 1.8, tt));
    o.pose.fist = smooth(4.9, 5.7, tt) * (1 - smooth(hit - 0.15, hit, tt)) * out;
    o.pose.raise = smooth(hit - 0.05, hit + 0.1, tt) * (1 - smooth(hit + 2.4, hit + 3.0, tt));
    o.pose.crouch = (smooth(6.3, 6.95, tt) * (1 - smooth(hit - 0.15, hit, tt)) * 0.9 + smooth(BRK, BRK + 0.1, tt) * (1 - smooth(BRK + 0.5, BRK + 0.9, tt)) * 0.5) * out;
    o.pupY = 0.7 * smooth(hit - 0.12, hit + 0.1, tt) * (1 - smooth(hit + 0.5, hit + 1.0, tt)) * out;
    o.held = brk > 0.2; // the printed pup holds a beat into the tear, then snaps back with the island
    o.paint = (inside || tt > tl.bloom[1]) && !o.held;
    o.capeOn = !o.held && tt > 1.3;
    o.wind = Math.min(1.5, 0.28 + (wind - 0.3) * 0.6);
    o.billow = smooth(5.4, 6.6, tt) * 0.35 + smooth(hit - 0.05, hit + 0.18, tt) * 0.65 - smooth(hit + 1.6, hit + 3.0, tt) * 0.45;
    o.auraOn = !o.held && tt > 5.3;
    o.auraK = smooth(5.3, 6.4, tt) * (1 + (age > 0 ? 0.5 * Math.exp(-age * 4) : 0)) * (1 - smooth(hit + 2.2, hit + 3.0, tt));
    o.punch = smooth(hit - 0.05, hit + 0.12, tt) * (1 - smooth(hit + 2.4, hit + 3.0, tt));

    // THE PUNCH: the starburst at the fist, the beam into the clouds, the dome, the crater's geyser, the panel, the word
    const [fx, fy, fz] = fist;
    burst.visible = age > 0 && age < 0.55;
    if (burst.visible) {
      const k = Math.min(1, age / 0.1);
      burst.position.set(fx, fy + 0.3, fz + 0.5);
      burst.quaternion.copy(cam.quaternion);
      burst.scale.setScalar((wide ? 3.8 : 3.0) * (0.4 + 0.6 * k) * (1 + 0.25 * (Math.floor(age * 12) % 2)));
      bu.m.uniforms.uAge.value = age / 0.55;
      bu.m.uniforms.uSpin.value = 0.1 * Math.floor(age * 12);
    }
    beam.visible = age > 0 && age < 0.55;
    if (beam.visible) {
      beam.position.set(fx, fy, fz);
      const w2 = 0.6 + 2.2 * smooth(0, 0.18, age);
      beam.scale.set(w2, 1, w2);
      bm.m.uniforms.uAge.value = age / 0.55;
    }
    dome.visible = age > 0 && age < 1.1;
    if (dome.visible) {
      dome.position.set(fx, fy, fz);
      dome.scale.setScalar(0.3 + 30 * smooth(0, 1.0, age) ** 0.8);
      dm.m.uniforms.uFade.value = (1 - smooth(0.5, 1.1, age)) * (1 - smooth(5, 9, dome.scale.x));
    }
    const gk = Math.max(0.5 * smooth(tl.enter - 0.4, tl.enter + 0.4, tt), smooth(hit + 0.2, hit + 0.6, tt)) * (1 - smooth(hit + 3.2, hit + 4.2, tt));
    geyser.visible = gk > 0.01;
    geyser.position.set(crater[0], -0.8, crater[1]);
    geyser.scale.set(1 + 0.2 * Math.sin(tt * 18), 3 + 2 * Math.sin(tt * 2) + 12 * smooth(hit + 0.2, hit + 1.4, tt), 1 + 0.2 * Math.sin(tt * 14));
    gy.m.uniforms.uK.value = gk;
    // the page's panel border: slams shut on the punch, opens out, and returns to tear at the end
    const pk = Math.max(smooth(hit - 0.04, hit + 0.06, tt) * (1 - smooth(hit + 0.55, hit + 0.9, tt)), smooth(BRK - 1.0, BRK - 0.6, tt));
    panel.visible = pk > 0.01 && brk < 1.1;
    if (panel.visible) {
      holdPanel(panel, cam, pn.m, pk);
      pn.m.uniforms.uCrack.value = smooth(BRK - 0.7, BRK - 0.02, tt);
      pn.m.uniforms.uFall.value = broken ? Math.min(1, brk / 0.95) : 0;
    }
    // the lettering, flat to the lens: SMASH! on the punch, RIIIP! on the tear
    smash.visible = age > 0.04 && age < 0.9;
    if (smash.visible) {
      const pop = Math.min(1, (age - 0.04) / 0.08) * (1 + 0.25 * Math.max(0, 1 - (age - 0.04) / 0.2));
      const w3 = (wide ? 3.8 : 2.7) * pop;
      smash.position.set((wide ? -2.7 : -1.2) + 0.05 * odd.v, wide ? 3.7 : 4.4, 0.8);
      smash.scale.set(w3, w3, 1);
      smash.quaternion.copy(cam.quaternion);
    }
    rip.visible = brk > -0.02 && brk < 1.15;
    if (rip.visible) {
      const pop = Math.min(1, (brk + 0.02) / 0.09) * (1 + 0.25 * Math.max(0, 1 - brk / 0.25));
      const w4 = (wide ? 4.6 : 3.2) * pop;
      rip.position.set((wide ? 0.4 : 0.2) + 0.05 * odd.v, wide ? 2.6 : 3.2, 1.6);
      rip.scale.set(w4, w4, 1);
      rip.quaternion.copy(cam.quaternion);
    }
    // a little warm flash on the punch and a paler one on the tear (never a white-out)
    holdFlash(flash, cam, Math.max(0, 1 - Math.abs(age - 0.04) / 0.09) * 0.16 + Math.max(0, 1 - Math.abs(brk) / 0.1) * 0.14);

    // THE PAGE TEARS: the island the stage hid comes back under the falling shards
    o.reveal = tt > BRK && tt < tl.collapse[0];
    return o;
  }

  function dispose() {
    const geoms = [city.ground, city.props, sk.g, nm.body, nm.armL, nm.armR, bu.g, bm.g, dm.g, pn.g, gy.g, smash.geometry, rip.geometry, flash.geometry];
    for (const g of [...geoms, ...cards.geoms, ...crowd.geoms, ...flags.geoms, ...rocks.geoms, ...pillar.geoms, smoke.obj.geometry, halos.obj.geometry, rain.obj.geometry]) g.dispose();
    const mats = [sk.m, wMat, hMat, bu.m, bm.m, dm.m, pn.m, gy.m, smash.material, rip.material, flash.material, smoke.obj.material, halos.obj.material, rain.obj.material];
    for (const x of [...mats, ...cards.mats, ...crowd.mats, ...flags.mats, ...rocks.mats, ...pillar.mats]) x.dispose();
    smash.material.map?.dispose();
    rip.material.map?.dispose();
    for (const x of [smoke.obj, halos.obj, rain.obj, crowd.A, crowd.B, flags.obj, rocks.rubble, rocks.rubbleH, rocks.debris, rocks.debrisH]) x.dispose();
  }

  return { root, flash, update, dispose };
}
