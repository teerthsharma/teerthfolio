// WORLD for p-topological-ml-toolkit: Academy City, the storm, the wind, the orb and the rival (live/, the live modules), and the island (island.js).
// The rig is in the seal's frame (the seal at the origin, the lens on +z) and stands at the dock through build.js. Animated parts are layer 1 (redrawn every step).
import { CircleGeometry, Euler, Group, InstancedMesh, Mesh, Object3D, Quaternion, Vector3 } from "three";
import { arrowPool } from "../live/arrows.js";
import { HINGE, leaves, rotorGeometry, sky } from "../live/city.js";
import { createFlow } from "../live/flow.js";
import { createOrb } from "../live/orb.js";
import { RIVAL_AT, RIVAL_YAW, rival as makeRival } from "../live/rival.js";
import { INK, SUN_RIG, celMaterial, celUniforms, flat } from "../live/shade.js";
import { POP_AT, T, smooth, warp, DOCK } from "../clock.js";
import { buildIsland } from "./island.js";

const CORE_Y = 0.9, UP = new Vector3(0, 1, 0), AT = new Vector3(...DOCK), AWAY = new Vector3(RIVAL_AT[0], 0, RIVAL_AT[2]).normalize();
const V = new Vector3(), CAM = new Vector3(), FWD = new Vector3(), EYE = new Vector3(), QC = new Quaternion(), QA = new Quaternion(), QB = new Quaternion();
const EU = new Euler(), O = new Object3D(), S3 = [0, 0, 0];

export default function build(ctx) {
  const U = celUniforms(), skyM = sky(U), cityMat = celMaterial(U), rotG = rotorGeometry();
  const city = leaves().map(({ g, rotors }) => {
    const mesh = new Mesh(g, cityMat), rot = new InstancedMesh(rotG, cityMat, Math.max(1, rotors.length));
    mesh.frustumCulled = rot.frustumCulled = false;
    const group = new Group();
    group.add(mesh, rot);
    return { group, mesh, rot, rotors, angle: Float32Array.from(rotors, (r) => r[4]) };
  });
  city[1].group.position.set(0, 0.05, HINGE[1]);
  city[2].group.position.set(0, -0.05, HINGE[2] - HINGE[1]);
  city[3].group.position.set(0, 0.05, HINGE[3] - HINGE[2]);
  city[1].group.add(city[2].group);
  city[2].group.add(city[3].group);
  const world = new Group();
  world.add(city[0].group, city[1].group);

  const arrows = arrowPool(140), flow = createFlow(U, arrows), orb = createOrb(arrows), rv = makeRival(U);
  const rivalG = new Group();
  rivalG.add(rv.body, rv.arm);
  rivalG.visible = false;
  const disc = new CircleGeometry(1, 32).rotateX(-Math.PI / 2), shadowM = flat(INK, { opacity: 0.3 });
  const shadowPup = new Mesh(disc, shadowM);
  shadowPup.position.set(0.05, 0.06, -0.1);
  shadowPup.scale.set(1.3, 1, 1);
  const shadowRival = new Mesh(disc, shadowM);
  shadowRival.scale.set(0.8, 1, 0.8);
  shadowRival.visible = false;

  const shell = new Mesh(skyM.g, skyM.m);
  shell.position.set(0, CORE_Y, 0);
  shell.renderOrder = -3;
  shell.frustumCulled = false;
  const dyn = new Group();
  dyn.add(...flow.meshes, ...arrows.meshes, orb.group, rivalG, shadowPup, shadowRival);
  const rig = new Group();
  rig.userData.layer = 1;
  rig.add(shell, world, dyn);
  rig.visible = false;

  const island = buildIsland();
  const page = new Group();
  page.add(island.group, rig);
  const group = new Group();
  group.add(page);

  return {
    group,
    update(t, dt, cue) {
      const tt = warp(t), cam = ctx.player?.camera;
      if (!cam) return;
      const calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      page.position.set(0, 0, 0);
      page.quaternion.identity();
      if (calm < 1) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        page.quaternion.copy(QA);
        page.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }

      const out = 1 - smooth(T.collapse[0], T.collapse[1], tt);
      const r = T.radius * smooth(T.bloom[0], T.bloom[1], tt) * out;
      V.set(AT.x, AT.y + CORE_Y, AT.z);
      const inside = r > cam.position.distanceTo(V) + 0.3;
      const wave = tt >= T.pop ? 3.4 * smooth(T.pop, T.pop + 0.95, tt) : -1;
      const skyU = skyM.m.uniforms;
      shell.visible = r > 0.02 && wave < 3.3;
      shell.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
      skyU.uInside.value = inside ? 1 : 0;
      skyU.uWave.value = wave;
      skyU.uPop.value.set(AT.x + POP_AT[0], AT.y + POP_AT[1], AT.z + POP_AT[2]).sub(cam.position).normalize();
      U.uSun.value.copy(SUN_RIG);
      U.uTime.value = tt;
      U.uFlat.value = smooth(T.fold[0], T.fold[0] + 0.5, tt);
      const foldK = smooth(T.fold[0], T.fold[1], tt);
      world.visible = inside && tt < T.vanish[1];
      world.scale.setScalar(Math.max(0.0001, 1 - smooth(T.vanish[0], T.vanish[1], tt)));
      rig.visible = tt >= T.bloom[0] && tt < T.vanish[1];
      island.page(inside);
      island.show(tt > T.reveal);
      island.update(t);

      const [f0, f1] = T.fold, span = f1 - f0;
      const fo = (d) => smooth(f0 + d * span, f0 + d * span + 0.55 * span + 0.2, tt);
      city[1].group.rotation.x = Math.PI * fo(0);
      city[2].group.rotation.x = -Math.PI * fo(0.12);
      city[3].group.rotation.x = Math.PI * fo(0.24);

      const storm = 1 + 2 * smooth(2.0, 3.0, tt) * (1 - smooth(5.5, 6.6, tt));
      const still = 1 - 0.88 * smooth(5.8, 7.0, tt);
      for (const l of city) {
        l.rot.visible = foldK < 0.02 && l.rotors.length > 0;
        if (!l.rot.visible) continue;
        for (let i = 0; i < l.rotors.length; i++) {
          const [x, y, z, sc] = l.rotors[i];
          l.angle[i] += dt * (2.2 / Math.sqrt(sc)) * storm * still;
          O.position.set(x, y, z);
          O.rotation.set(0, 0, l.angle[i]);
          O.scale.setScalar(sc);
          O.updateMatrix();
          l.rot.setMatrixAt(i, O.matrix);
        }
        l.rot.instanceMatrix.needsUpdate = true;
      }

      CAM.copy(cam.position).sub(AT);
      QC.copy(cam.quaternion);
      flow.update(tt, CAM, QC, cam.getWorldDirection(FWD));
      orb.update(tt, CAM, QC);

      const hit = flow.rivalHit, ri = smooth(T.rivalIn[0], T.rivalIn[1], tt), kb = smooth(hit, hit + 0.3, tt), rOut = 1 - smooth(f0, f0 + 0.45, tt);
      const pop = ri * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.rivalIn[0]) / 0.5)));
      const jit = tt > hit && tt < hit + 0.7 ? 0.03 * (Math.floor(t * 12) % 2 ? 1 : -1) : 0;
      rivalG.visible = ri > 0.01 && rOut > 0.01;
      rivalG.position.set(RIVAL_AT[0] + AWAY.x * 0.9 * kb + jit, 0, RIVAL_AT[2] + AWAY.z * 0.9 * kb);
      rivalG.rotation.set(-0.3 * kb, RIVAL_YAW, 0);
      rivalG.scale.set(rOut, Math.max(pop, 0.001) * rOut, rOut);
      rv.arm.rotation.x = 1.25 * (1 - smooth(T.rivalArm[0], T.rivalArm[1], tt)) + 0.5 * smooth(hit, hit + 0.25, tt);
      const ch = smooth(T.charge[0], T.charge[1], tt) * (1 - smooth(T.fire, T.fire + 0.04, tt));
      rv.ball.visible = rv.hull.visible = ch > 0.01;
      rv.ball.scale.setScalar(Math.max(ch, 0.001));
      rv.hull.scale.setScalar(Math.max(ch * 1.28, 0.001));
      shadowRival.visible = rivalG.visible;
      shadowRival.position.set(rivalG.position.x, 0.06, rivalG.position.z);
    },
    dispose() {
      island.dispose();
      flow.dispose();
      orb.dispose();
      rv.dispose();
      arrows.dispose();
      skyM.g.dispose();
      skyM.m.dispose();
      cityMat.dispose();
      rotG.dispose();
      for (const l of city) { l.mesh.geometry.dispose(); l.rot.dispose(); }
      disc.dispose();
      shadowM.dispose();
    },
  };
}
