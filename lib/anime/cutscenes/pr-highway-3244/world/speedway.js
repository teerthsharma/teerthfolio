// The Highway speedway in the rig frame: the live move's sky, track, chariot, king, cape and twelve rivals, driven by the card clock through race.js.
import { Color, Group, InstancedMesh, Matrix4, Mesh, Object3D, InstancedBufferAttribute, PlaneGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BLOCKS, cactus, crowdData, crowdMeshes, desert, flagMaterial, flagPoles, gantry, mesas, oval, rocks, skyDome, stands, tyres } from "../live/land.js";
import { CH_R, CH_WX, CH_WZ, capeMesh, carGeometry, chariotGeometry, chariotWheel } from "../live/car.js";
import { iskandarGeometry, iskandarMeshes, poseArm, poseHead } from "../live/iskandar.js";
import { shadowPool } from "../live/fx.js";
import { FINISH, T } from "../live/path.js";
import { hash, KEY, KEY_U, SUN_SKY, SUN_U, solid } from "../live/shade.js";
import { BETA, CAR_S, heroState, rivalState } from "../race.js";
import { C, POP, TURN, W, smooth, warp } from "../clock.js";
import { toneAll } from "../tone.js";
import { carPaintMaterial } from "./depth.js";

const RIVAL_HEX = ["#1fb8b0", "#8a4fe0", "#9ad62f", "#ff8a1f", "#3d8cf0", "#e0409a", "#ffd21f", "#3fd49a", "#2850d8", "#f4efe4", "#ff6f5a", "#3aa85a"];
const NR = RIVAL_HEX.length, CORE_Y = 0.9, UP = new Vector3(0, 1, 0), RADIUS = 428;
const D = new Object3D(), DW = new Object3D(), MH = new Matrix4(), ZERO = new Matrix4().makeScale(0, 0, 0);
const HS = {}, RS = {};

const cloth = (n) => {
  const g = new PlaneGeometry(1, 1, 12, 6).translate(0.5, 0, 0);
  g.setAttribute("aPh", new InstancedBufferAttribute(Float32Array.from({ length: n }, (_, i) => hash(i, 11) * 6.28), 1));
  return g;
};

export default function buildSpeedway() {
  const dome = skyDome();
  const sky = new Mesh(dome.g, dome.m);
  sky.position.set(0, CORE_Y, 0);
  sky.renderOrder = -3;
  const dsrt = desert(), ov = oval();
  const standMat = solid({ fogK: 0.0042 });
  const fp = flagPoles();
  const stand = new Mesh(mergeGeometries([stands(), gantry(), fp.poles]), standMat);
  const mesaM = new Mesh(mesas(), standMat);
  const flagMat = flagMaterial();
  const NF = fp.flags.length;
  const flags = new InstancedMesh(cloth(NF + 1), flagMat, NF + 1);
  fp.flags.forEach((f, i) => { D.position.set(f.x, f.y, f.z); D.rotation.set(0, 0, 0); D.scale.set(f.w, f.h, 1); D.updateMatrix(); flags.setMatrixAt(i, D.matrix); });
  D.position.set(FINISH - 8.8, 7.2, -15.3); D.rotation.set(0, 0, 0); D.scale.set(17.6, 1.5, 1); D.updateMatrix(); flags.setMatrixAt(NF, D.matrix);
  D.scale.set(1, 1, 1);
  const crowd = crowdMeshes(crowdData());
  const tyre = tyres(), rock = rocks();
  const cacti = new InstancedMesh(cactus(), solid({ fogK: 0.0042 }), BLOCKS.length + 1);
  for (let i = 0; i <= BLOCKS.length; i++) {
    const s = 0.9 + 0.4 * hash(i, 2);
    D.position.set(i === 0 ? BLOCKS[0] - 6 : BLOCKS[i - 1] + 46, 0, -19.4);
    D.rotation.set(0, hash(i, 1) * 6, 0);
    D.scale.set(s, s, s);
    D.updateMatrix();
    cacti.setMatrixAt(i, D.matrix);
  }
  D.scale.set(1, 1, 1);
  const heroMat = solid({ fogK: 0.0042 });
  const chariot = new Mesh(chariotGeometry(), heroMat);
  const wheels = new InstancedMesh(chariotWheel(), heroMat, 2);
  const cape = capeMesh();
  const king = iskandarMeshes(iskandarGeometry());
  const rivals = new InstancedMesh(carGeometry({ res: 0.7 }), carPaintMaterial(), NR);
  RIVAL_HEX.forEach((h, i) => rivals.setColorAt(i, new Color(h)));
  const shRiv = shadowPool(NR), shHero = shadowPool(1);

  const group = new Group(), world = new Group(), mesaG = new Group(), track = new Group(), hero = new Group(), body = new Group();
  group.add(sky, world, hero, shHero); // the chariot's contact shadow sits outside the track, so it stays on the island road
  dome.m.userData.noTone = true;
  dome.m.uniforms.uGain.value.set(1.18, 1.1, 1.25);
  world.add(mesaG, track);
  mesaG.add(mesaM);
  track.add(new Mesh(dsrt.g, dsrt.m), new Mesh(ov.g, ov.m), stand, flags, crowd.body, crowd.head, crowd.armR, crowd.armL, tyre, rock, cacti, rivals, shRiv);
  hero.add(body, wheels);
  body.add(chariot, cape, king.fill, king.ink);
  group.traverse((o) => { o.frustumCulled = false; });
  track.children[0].renderOrder = -2;
  track.children[1].renderOrder = -1;
  toneAll(group);

  const update = (tc, cam, mode = { speedway: true }) => {
    const t = warp(tc);
    const back = mode?.speedway === false || t >= T.swap;
    const h = heroState(tc, HS);
    SUN_U.value.copy(SUN_SKY).applyAxisAngle(UP, TURN);
    KEY_U.value.copy(KEY).applyAxisAngle(UP, TURN);
    const r = RADIUS * smooth(1.15, 1.6, tc) * (1 - smooth(25.0, 25.4, tc));
    const inside = cam ? r > cam.position.distanceTo(new Vector3(...W([0, CORE_Y, 0]))) + 0.3 : true;
    sky.visible = r > 0.02 && !back;
    sky.scale.setScalar(inside ? 200 : Math.max(r, 0.02));
    dome.m.uniforms.uInside.value = inside ? 1 : 0;
    world.visible = inside && !back && tc >= C.plate;
    track.position.set(h.trackX, h.trackY, h.trackZ);
    track.rotation.y = BETA;
    mesaG.position.set(h.mesaX, 0, h.mesaZ);
    hero.position.set(h.x, h.y, h.z);
    hero.rotation.set(0, h.yaw, 0);
    hero.scale.setScalar(CAR_S);
    body.position.y = h.bob + 0.02;
    body.rotation.set(h.roll, 0, h.pitch);
    const ang = -h.wheelDist / CH_R;
    let wi = 0;
    for (const sz of [-1, 1]) {
      DW.position.set(CH_WX, CH_R, sz * CH_WZ);
      DW.rotation.set(0, 0, ang);
      DW.updateMatrix();
      wheels.setMatrixAt(wi++, DW.matrix);
    }
    wheels.instanceMatrix.needsUpdate = true;
    const cryK = Math.exp(-(((t - T.cry) / 0.45) ** 2));
    const lift = smooth(T.cry - 0.35, T.cry - 0.05, t) * (1 - smooth(T.cover[0] - 0.4, T.cover[0], t)) * (back ? 0 : 1);
    poseArm(king.uniforms.uArm.value, lift);
    poseHead(MH, Math.max(cryK, 0.35 * smooth(2.0, 2.4, t) * (back ? 0 : 1)), 0.05 * Math.sin(tc * 17) * smooth(1.8, 2.2, t) * (1 - 0.7 * cryK));
    king.uniforms.uHead.value.copy(MH);
    hero.visible = t > 1.5 && t < T.leave + 1.1 && 1 - smooth(25.0, 25.4, tc) > 0.01;
    const kingOn = tc < POP;
    king.fill.visible = kingOn; king.ink.visible = kingOn;
    const riv = !back && t > 1.55, on = riv && tc >= C.plate;
    rivals.visible = riv;
    for (let i = 0; i < NR; i++) {
      const rv = rivalState(i, tc, RS);
      D.position.set(rv.x, rv.y, rv.z);
      D.rotation.set(rv.rx, rv.ry, rv.rz);
      D.scale.setScalar(CAR_S);
      D.updateMatrix();
      rivals.setMatrixAt(i, D.matrix);
      D.position.set(rv.shadowX, 0.03, rv.shadowZ);
      D.rotation.set(0, Math.PI, 0);
      D.scale.set(4.6, 1, 2.2);
      D.updateMatrix();
      shRiv.setMatrixAt(i, on ? D.matrix : ZERO);
    }
    rivals.instanceMatrix.needsUpdate = true;
    D.position.set(h.x + 0.5 * CAR_S, h.y + 0.08, h.z - 0.4 * CAR_S); // lifted past the road top (world y 0.15), else depth hides it
    D.rotation.set(0, h.yaw, 0);
    D.scale.set(4.6 * CAR_S, 1, 2.2 * CAR_S);
    D.updateMatrix();
    shHero.setMatrixAt(0, hero.visible && tc >= C.plate ? D.matrix : ZERO);
    shHero.instanceMatrix.needsUpdate = true;
    const ex = 0.62 + 0.38 * Math.max(Math.exp(-(((t - 3.7) / 0.7) ** 2)), Math.exp(-(((t - 6.0) / 0.5) ** 2)));
    for (const c of [crowd.body, crowd.head, crowd.armR, crowd.armL]) { c.material.uniforms.uTime.value = tc; c.material.uniforms.uExcite.value = ex; }
    flagMat.uniforms.uTime.value = tc;
    cape.material.uniforms.uTime.value = tc;
  };

  return {
    group,
    state: HS,
    update,
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose();
        for (const m of [].concat(o.material ?? [])) m?.dispose?.();
      });
      for (const x of [rivals, shRiv, shHero, flags, cacti, wheels]) x.dispose?.();
    },
  };
}
