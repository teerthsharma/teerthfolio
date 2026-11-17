// WORLD for pr-openxla-46539: the Kamino night as the live site draws it (../live/, ported from moves/pr-openxla-46539/world.js),
// the XLA Geyser island (island.js), the far skyline and the near street (far.js, near.js), and the glass that breaks on the Smash (T27).
// Frame: the pup at the origin facing +z; the lens and the avenue are in this frame, and the group stands at DOCK. Every value is a pure
// function of the clock (clock.js phase), so a scrubbed frame equals a played one.
import { AdditiveBlending, ConeGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, OctahedronGeometry, ShaderMaterial, Shape, ShapeGeometry, Vector2, Vector3, Color } from "three";
import { buildCity } from "../live/city.js";
import { beamFx, burstFx, domeFx, dustFx, geyserFx, halosFx, pillarFx, rainFx, smokeFx, vortexFx } from "../live/fx.js";
import { hullMaterial, worldMaterial } from "../live/mesh.js";
import { NOMU_H, SHOULDER, nomu } from "../live/nomu.js";
import { gloveGeo } from "../live/punch.js";
import { SH, tickShared } from "../live/print.js";
import { cardFx, crowdFx, flagsFx, rocksFx, wreckFx } from "../live/props.js";
import { sky } from "../live/sky.js";
import { ghostsFx, ringFx } from "../live/smash.js";
import { hash, put, hide } from "../live/support.js";
import { BRK, CORE_Y, DASH_TO, IMP, LAW, NOMU_AT, PILLAR, OFF, phase, picT, radiusAt, smooth } from "../clock.js";
import { tone } from "../tone.js";
import { buildIsland } from "./island.js";
import { buildFar } from "./far.js";
import { buildNear } from "./near.js";

// a ShaderMaterial prints through the site's tone map once; a MeshBasicMaterial has no fragment shader and is left alone
const T = (m) => (m?.fragmentShader ? tone(m) : m);
const UP = new Vector3(0, 1, 0), DIR = new Vector3(), PQ = new Vector3(), HP = new Vector3(), HQ = new Vector3(), SZ = new Vector2();
const FLECKS = 120;
const FLECK_COL = ["#F7F0DB", "#120E1A", "#FFE31A"];
const fleckMat = () => T(new ShaderMaterial({
  vertexShader: "varying vec3 vC; void main() { vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
  fragmentShader: "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }",
}));

// a flat-to-the-lens quad pinned at normalised screen (nx, ny), d metres out, `frac` of the screen wide, in the root's space
function pin(mesh, root, cam, nx, ny, d, frac) {
  const h = 2 * d * Math.tan((cam.fov * Math.PI) / 360), w = h * cam.aspect;
  cam.getWorldDirection(HP).multiplyScalar(d).add(cam.position);
  HQ.set(1, 0, 0).applyQuaternion(cam.quaternion);
  HP.addScaledVector(HQ, (nx * w) / 2);
  HQ.set(0, 1, 0).applyQuaternion(cam.quaternion);
  HP.addScaledVector(HQ, (ny * h) / 2);
  root.worldToLocal(HP);
  mesh.position.copy(HP);
  mesh.quaternion.copy(cam.quaternion);
  mesh.scale.set(frac * w, frac * w, 1);
}

const CARD_AT = [NOMU_AT[0] + 2, 4.0, NOMU_AT[1] + 1];
const mk = (g, m, order = 0) => {
  const x = new Mesh(g, m);
  x.frustumCulled = false;
  x.renderOrder = order;
  return x;
};
// a card's flight: thrown from the Nomu's side, hovers, and is called into the fist at the hit (world.js `place`)
function cardPlace(cd, start, t0c, hov, spin, sign, ph, fist) {
  const tt = ph.tt, age = ph.age;
  const e = smooth(t0c, t0c + 1.0, tt);
  let x = start[0] + (hov[0] - start[0]) * e;
  let y = start[1] + (hov[1] - start[1]) * e + Math.sin(Math.PI * e) * 1.3 + 0.12 * Math.sin(tt * 2.6 + sign) * e;
  let z = start[2] + (hov[2] - start[2]) * e;
  const c2 = smooth(LAW.lineB + 1.02, LAW.lineB + 1.2, tt);
  x += (fist[0] + 0.3 - x) * c2;
  y += (fist[1] + 0.6 - y) * c2;
  z += (fist[2] + 0.3 - z) * c2;
  cd.position.set(x, y, z);
  cd.rotation.set(0, (1 - e) * spin + 0.18 * sign * (1 - c2), 0.1 * sign * (1 - e * 0.4) + 0.12 * Math.sin(tt * 4 + sign) * (1 - c2));
  const sc = smooth(t0c - 0.05, t0c + 0.25, tt) * (1.05 + 0.12 * Math.sin(tt * 3 + sign));
  cd.scale.setScalar(Math.max(0.0001, sc) * 0.78 * (1 - 0.35 * c2));
  cd.visible = tt > t0c - 0.05 && age < 0.12 && !ph.broken;
}

export default function build(ctx) {
  const KN = (ctx.player?.camera?.aspect ?? 1.78) < 0.8 ? 0.62 : 1;
  const group = new Group(), root = new Group();
  SH.uCrater.value.set(-3.0 * KN, -6.4, 3.0);
  SH.uPillar.value.set(PILLAR[0], PILLAR[1], PILLAR[2]);
  const city = buildCity(KN);
  const crater = SH.uCrater.value.toArray();
  const sk = sky();
  sk.m.uniforms.uMaxR.value = KN < 1 ? 0.24 : 0.36;
  const wMat = T(worldMaterial()), hMat = T(hullMaterial());
  const nm = nomu();
  const smoke = smokeFx([...city.info.smoke, { x: crater[0] + 0.4, y: 0.5, z: crater[1], s: 0.9, big: 1.1 }, { x: crater[0] - 0.8, y: 0.3, z: crater[1] - 0.6, s: 0.7 }]);
  const halos = halosFx([{ x: crater[0], y: 1.4, z: crater[1], s: 6.5 }, ...city.info.lamps.filter((l) => l.z < -8)]);
  const rain = rainFx([crater[0], crater[1]], KN);
  const pillar = pillarFx(PILLAR);
  const bu = burstFx(), bm = beamFx(), dm = domeFx(), dust = dustFx(), gy = geyserFx(), vx = vortexFx();
  const cards = cardFx(), crowd = crowdFx(city.info.roofs), flags = flagsFx(city.info.flags);
  const rocks = rocksFx(city.groundY, crater, city.info.HW), wreck = wreckFx(city.info.chunks, city.groundY);
  const ring = ringFx(), ghosts = ghostsFx();
  for (const m of [smoke.obj.material, halos.obj.material, rain.obj.material, pillar.shaft.material, pillar.pool.material, bu.m, bm.m, dm.m, dust.m, gy.m, vx.m, ring.m, ...ghosts.ms, ...cards.mats, ...crowd.mats, ...flags.mats, ...rocks.mats, ...wreck.mats]) T(m);
  T(sk.m);

  const kamino = new Group();
  const nomuRoot = new Group();
  nomuRoot.position.set(NOMU_AT[0], -NOMU_H, NOMU_AT[1]);
  nomuRoot.scale.set((KN < 1 ? 0.7 : 0.9) * 1.4, KN < 1 ? 0.7 : 0.9, (KN < 1 ? 0.7 : 0.9) * 1.4);
  const armL = new Group(), armR = new Group();
  armL.position.set(...SHOULDER);
  armR.position.set(-SHOULDER[0], SHOULDER[1], SHOULDER[2]);
  armL.add(mk(nm.armL, wMat), mk(nm.armL, hMat));
  armR.add(mk(nm.armR, wMat), mk(nm.armR, hMat));
  nomuRoot.add(mk(nm.body, wMat), mk(nm.body, hMat), armL, armR);
  const gloveG = gloveGeo();
  const glove = new Group();
  glove.add(mk(gloveG, wMat), mk(gloveG, hMat));
  glove.visible = false;
  const inst = new Group();
  const geyser = mk(gy.g, gy.m);
  geyser.visible = false;
  inst.add(rocks.rubble, rocks.rubbleH, rocks.debris, rocks.debrisH, wreck.mesh, wreck.hull, crowd.A, crowd.B, flags.obj, smoke.obj, halos.obj, rain.obj, pillar.shaft, pillar.pool, geyser, cards.A, cards.B, cards.M);
  kamino.add(mk(city.ground, wMat, -1), mk(city.props, wMat), mk(city.props, hMat, -0.5), nomuRoot, inst);
  const burst = mk(bu.g, bu.m, 20), beam = mk(bm.g, bm.m, 19), dome = mk(dm.g, dm.m, 18), dustMesh = mk(dust.g, dust.m, 17);
  dustMesh.visible = false;
  const vortex = mk(vx.g, vx.m, 12);
  for (const x of [burst, beam, dome, vortex]) x.visible = false;
  const shell = mk(sk.g, sk.m, -3);
  shell.position.set(0, CORE_Y, 0);
  root.add(shell, kamino, glove, burst, beam, dome, dustMesh, vortex, ring.mesh, ...ghosts.meshes);

  const coneM = new MeshBasicMaterial({ color: "#fff4c2", transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false });
  const speedCone = new Mesh(new ConeGeometry(0.9, 5, 12, 1, true), coneM);
  speedCone.frustumCulled = false;
  speedCone.visible = false;
  const starShape = new Shape();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 0.42 : 1;
    if (i) starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else starShape.moveTo(rr, 0);
  }
  const starM = new MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false });
  const impactStar = new Mesh(new ShapeGeometry(starShape), starM);
  impactStar.frustumCulled = false;
  impactStar.renderOrder = 30;
  impactStar.visible = false;
  root.add(speedCone, impactStar);

  const flecks = new InstancedMesh(new OctahedronGeometry(1, 0), fleckMat(), FLECKS);
  flecks.frustumCulled = false;
  const col = new Color();
  for (let i = 0; i < FLECKS; i++) flecks.setColorAt(i, col.set(i % 5 === 0 ? FLECK_COL[2] : i % 2 ? FLECK_COL[0] : FLECK_COL[1]));
  flecks.instanceColor.needsUpdate = true;
  flecks.visible = false;
  root.add(flecks);

  const island = buildIsland();
  const far = buildFar(SH, KN), near = buildNear(SH, KN);
  group.add(island.group, far.group, near.group, root);

  const fistOf = () => {
    const h = ctx.seal?.named?.()?.handR;
    if (!h) return [0.9, 2.2, 0.4];
    const p = h.clone();
    root.updateMatrixWorld(true);
    root.worldToLocal(p);
    return [p.x, p.y, p.z];
  };

  function update(t, dt, cue) {
    const cam = ctx.player?.camera;
    if (!cam) return;
    const tr = cue?.t ?? t;
    const ph = phase(t, tr);
    const { tt, age, brk, broken } = ph;
    const r = radiusAt(t);
    const wide = cam.aspect >= 1;
    const sz = ctx.engine.renderer.getSize(SZ);
    tickShared({ gl: { getPixelRatio: () => ctx.engine.renderer.getPixelRatio() }, size: { width: sz.x, height: sz.y } }, picT(t), broken ? brk : -1);
    root.updateMatrixWorld(true);
    const cp = root.worldToLocal(cam.position.clone());
    const V = new Vector3(0, CORE_Y, 0);
    const inside = r > cp.distanceTo(V) + 0.3;
    shell.visible = r > 0.02 && brk < 1.6;
    shell.scale.setScalar(inside || broken ? 140 : Math.max(r, 0.02));
    const su = sk.m.uniforms;
    su.uInside.value = inside || broken ? 1 : 0;
    su.uFlash.value = ph.fl;
    su.uOpen.value = ph.open;
    su.uSwirl.value = ph.swirl;
    su.uBlast.value = ph.blast;
    SH.uSun.value = ph.sun;
    kamino.visible = (inside || broken) && brk < 1.5;
    inst.visible = !broken || brk < 1.4;
    const fist = fistOf();
    const [fx, fy, fz] = fist;

    const cx = { tt, cam, wind: ph.windRaw * 0.9, gone: brk > 1.2, hit: LAW.lineB + 1.1, brk: broken ? brk : -1, rise: LAW.enter, k: smooth(LAW.lineB + 1.4, LAW.lineB + 2.7, tt) };
    smoke.tick(cx); halos.tick(cx); rain.tick(cx); pillar.tick(cx); crowd.tick(cx);
    flags.tick({ ...cx, wind: Math.min(1.6, ph.windRaw) });
    rocks.tick(cx);
    wreck.tick({ age, brk: broken ? brk : -1 });
    crowd.A.visible = crowd.B.visible = !(age > 0.1);
    flags.obj.visible = !(age > 0.1);

    const bl = ph.bl;
    nomuRoot.position.set(NOMU_AT[0] + 5 * bl, -(NOMU_H - 0.4) * (1 - ph.rise) ** 2 + (ph.rise < 1 && ph.rise > 0 ? 0.05 * Math.sin(tt * 40) : 0) + 24 * bl * bl, NOMU_AT[1] - 26 * bl);
    nomuRoot.visible = age < 1.5;
    nomuRoot.rotation.set(-0.28 * ph.stag - 3.2 * bl + 0.015 * Math.sin(tt * 2.1), -0.8 + 0.05 * Math.sin(tt * 0.9) + 1.5 * bl, 1.2 * bl);
    const bob = 0.03 * Math.sin(tt * 3.3);
    armL.rotation.set(0.15 - 1.6 * ph.thrA - 1.65 * ph.guard * (1 - ph.thrA) + bob, 0, -0.25 * ph.guard);
    armR.rotation.set(0.15 - 1.65 * ph.thrB - 1.65 * ph.guard * (1 - ph.thrB) + bob * 1.3, 0, 0.25 * ph.guard);

    cardPlace(cards.A, CARD_AT, 3.3, [-2.1, 1.8, 0.9], 9, -1, ph, fist);
    cardPlace(cards.B, CARD_AT, 3.75, [2.2, 1.8, 0.7], -9, 1, ph, fist);
    const mg = age - 0.12, M = cards.M;
    M.visible = mg > 0 && !broken;
    if (M.visible) {
      const pop = 1 + 0.5 * Math.exp(-mg * 6) * Math.cos(mg * 22);
      const e2 = smooth(0, 0.7, mg), hx = -2.6 + 0.15 * Math.sin(tt * 2), hy = 3.0 + 0.18 * Math.sin(tt * 2.4) + 0.25 * smooth(0, 2.5, mg);
      M.position.set(fx + 0.3 + (hx - fx - 0.3) * e2, fy + 0.6 + (hy - fy - 0.6) * e2, fz + 0.3 + (0.8 - fz - 0.3) * e2);
      M.rotation.set(0, 0.1 * Math.sin(tt * 1.5), -0.1 + 0.03 * Math.sin(tt * 3));
      M.scale.setScalar(Math.min(1.0, smooth(0, 0.18, mg)) * pop * (wide ? 1 : 0.8));
    }

    const dk = ph.dk;
    speedCone.visible = (ph.flying || ph.flyingBack) && !broken && tt < LAW.collapse[0];
    if (speedCone.visible) {
      DIR.set(DASH_TO[0], 0, DASH_TO[1]).normalize().multiplyScalar(ph.flying ? 1 : -1);
      speedCone.quaternion.setFromUnitVectors(UP, DIR);
      speedCone.position.set(DASH_TO[0] * dk, 0.9, DASH_TO[1] * dk).addScaledVector(DIR, -2.5);
      coneM.opacity = 0.35 + 0.2 * Math.sin(tt * 60);
    }
    impactStar.visible = age >= 0 && age < 0.3;
    if (impactStar.visible) {
      impactStar.position.set(DASH_TO[0], 1.1, DASH_TO[1] + 0.8);
      impactStar.quaternion.copy(cam.quaternion);
      impactStar.scale.setScalar(2.5 * (0.6 + 0.4 * Math.min(1, age / 0.08)));
      impactStar.rotation.z += 0.2 * Math.floor(age * 12);
    }

    glove.visible = ph.punch > 0.05 && !broken;
    glove.position.set(fx, fy, fz);
    glove.scale.setScalar(0.6 + 0.4 * ph.punch);
    if (ph.fk > 0.001) {
      cam.getWorldDirection(PQ);
      PQ.multiplyScalar(1.4).add(cam.position);
      root.worldToLocal(PQ);
      glove.position.lerp(PQ, ph.fk);
      glove.scale.setScalar(glove.scale.x + ph.fk * 1.25 * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect * 1.4 * 2.2);
    }

    burst.visible = age > 0 && age < 0.55;
    if (burst.visible) {
      const k = Math.min(1, age / 0.1);
      burst.position.set(fx, fy + 0.3, fz + 0.5);
      burst.quaternion.copy(cam.quaternion);
      burst.scale.setScalar((wide ? 2.4 : 2.0) * (0.4 + 0.6 * k) * (1 + 0.25 * (Math.floor(age * 12) % 2)));
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
    vortex.visible = age > 0.05 && tt < BRK + 0.9;
    if (vortex.visible) {
      vx.m.uniforms.uK.value = smooth(0.1, 1.2, age) * (1 - smooth(BRK - 0.9, BRK - 0.1, tt));
      vx.m.uniforms.uSpin.value = 0.35 * Math.max(0, age) + 0.6 * (1 - Math.exp(-Math.max(0, age) * 1.5));
      vx.m.uniforms.uOpen.value = smooth(0.1, 3.0, age);
      pin(vortex, root, cam, 0.1, 0.5, 8, (wide ? 0.3 : 0.6) * (1 + 0.2 * smooth(0, 4, age)));
    }
    dome.visible = age > 0 && age < 1.0;
    dustMesh.visible = dome.visible;
    if (dome.visible) {
      const x = Math.min(1, age / 0.6), R = 0.5 + 39.5 * (1 - (1 - x) ** 2.4);
      dome.position.set(IMP[0], IMP[1], IMP[2]);
      dome.scale.setScalar(R);
      dm.m.uniforms.uFade.value = 1 - smooth(0.55, 1.0, age);
      dustMesh.position.set(IMP[0], 0, IMP[2]);
      dustMesh.scale.set(R * 0.96, 1.5 + 2.5 * Math.min(1, age / 0.3), R * 0.96);
      dust.m.uniforms.uK.value = (1 - smooth(0.45, 1.0, age)) * 0.9;
      dust.m.uniforms.uAge.value = age;
    }
    const gk = ph.gk;
    geyser.visible = gk > 0.01;
    geyser.position.set(crater[0], -0.8, crater[1]);
    geyser.scale.set(1 + 0.2 * Math.sin(tt * 18), 3 + 2 * Math.sin(tt * 2) + 12 * smooth(LAW.lineB + 1.3, LAW.lineB + 2.5, tt), 1 + 0.2 * Math.sin(tt * 14));
    gy.m.uniforms.uK.value = gk;

    const rg = ring.mesh;
    rg.visible = age > 0 && age < 0.75;
    if (rg.visible) {
      rg.position.set(fx, fy, fz + 0.6);
      rg.quaternion.copy(cam.quaternion);
      rg.scale.setScalar(0.4 + 9 * smooth(0, 0.75, age) ** 0.7);
      ring.m.opacity = 1 - smooth(0.2, 0.75, age);
    }
    for (let i = 0; i < ghosts.meshes.length; i++) {
      const gm = ghosts.meshes[i], dd = ph.du - 0.045 * (i + 1);
      const gk2 = smooth(0.4, 1.1, dd) - smooth(1.3, 2.0, dd);
      gm.visible = (ph.flying || ph.flyingBack) && gk2 > 0.01 && gk2 < 0.99 && !broken && tt < LAW.collapse[0];
      if (gm.visible) {
        gm.position.set(DASH_TO[0] * gk2, 0.8 + 0.5 * Math.sin(Math.PI * Math.min(1, Math.max(0, (dd - 0.4) / 0.7))), DASH_TO[1] * gk2);
        gm.scale.set(1, 0.9, 1.5);
        ghosts.ms[i].opacity = 0.42 - i * 0.07;
      }
    }

    // T27: the glass and masonry flecks thrown out of the blown blocks, one instanced set, each drawn in its own flight window
    let alive = 0;
    for (let i = 0; i < FLECKS; i++) {
      const tau = tt - LAW.lineB - 1.1 - 0.35 * hash(i, 1);
      if (tau < 0 || tau > 1.3 || broken) { hide(flecks, i); continue; }
      alive++;
      const a = Math.PI * 2 * hash(i, 3), rad = 8 + 30 * hash(i, 2), q = 0.9 * (1 - tau / 1.3);
      put(flecks, i, IMP[0] + Math.cos(a) * rad, 2 + 10 * hash(i, 4) + (3 + 5 * hash(i, 5)) * tau - 4.9 * tau * tau, IMP[2] + Math.sin(a) * rad * 0.5, q);
    }
    flecks.instanceMatrix.needsUpdate = true;
    flecks.visible = alive > 0 && !OFF.has("flecks");

    island.page(inside || broken, !ph.held);
    island.reveal(smooth(BRK, BRK + 0.2, tt));
    island.update(tt);
    far.group.visible = near.group.visible = kamino.visible;
    far.update(tt, ph);
    near.update(tt, ph);

    const S = (ctx.set ??= {});
    S.ox = { wind: ph.wind, billow: ph.billow, auraOn: ph.auraOn, auraK: ph.auraK, capeOn: ph.capeOn, punch: ph.punch };
  }

  function dispose() {
    group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    island.dispose?.(); far.dispose?.(); near.dispose?.();
  }

  return { group, update, dispose };
}
