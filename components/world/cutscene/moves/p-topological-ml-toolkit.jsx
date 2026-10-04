// topological-ml-toolkit: A Certain Magical Index, Accelerator's vector
// manipulation, in shape and colour only. The pup takes his look (a white
// shaggy tuft streaming up and back, red eyes, a black-and-grey patterned top,
// coat tails flapping; round head, no ears) and the island converts into
// ACADEMY CITY in bright overcast daylight: crisp cel-shaded towers, rooftop
// wind turbines turning, a wide gridded plaza, signal lights, a rail viaduct
// with a train on it. A storm comes in (bullets, missiles, steel beams, the
// train car torn off the viaduct) and an electric-white vector ARROW appears
// on every one; the pup reverses every vector and each thing rebounds along its
// arrow, tumbling, with a shake on every hit. A Level-5 silhouette steps in
// with a raygun, fires, and has its ray bounced back. The pup seizes the WIND's
// vectors: ribbons of air spiral into a plasma orb overhead, which resolves
// into a soap bubble round a neat grid of glowing feature vectors (a flow with
// a loop in it: the shape of the data, made ordinary). The seal says it. Then
// the orb is released upward and pops like a soap bubble; its shockwave folds
// Academy City shut like a closing city map, and the real island is what was
// there. The pup, itself again, says the flex line; the credit card.
// Frame: the rig (the pup at the origin, the lens out along +z). No post pass:
// the flash is one quad, every effect a mesh. Card: lib/world/cutscene/cards/
// p-topological-ml-toolkit.js. Parts: ./p-topological-ml-toolkit/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CircleGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, Quaternion, Vector3 } from "three";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { flashQuad, holdFlash, islandList, pupParts } from "./p-caustic/parts";
import { arrowPool } from "./p-topological-ml-toolkit/arrows";
import { HINGE, leaves, rotorGeometry, sky } from "./p-topological-ml-toolkit/city";
import { createFlow } from "./p-topological-ml-toolkit/flow";
import { accelerator } from "./p-topological-ml-toolkit/look";
import { createOrb } from "./p-topological-ml-toolkit/orb";
import { RIVAL_AT, RIVAL_YAW, rival as makeRival } from "./p-topological-ml-toolkit/rival";
import { INK, SUN_RIG, celMaterial, celUniforms, pupToon } from "./p-topological-ml-toolkit/shade";
import { POP_AT, T } from "./p-topological-ml-toolkit/timing";
import { registerWarm, takeWarm } from "../prewarm";

const CORE_Y = 0.9;
const UP = new Vector3(0, 1, 0);
const V = new Vector3();
const CAM = new Vector3();
const FWD = new Vector3();
const QR = new Quaternion();
const QC = new Quaternion();
const O = new Object3D();
const AWAY = new Vector3(RIVAL_AT[0], 0, RIVAL_AT[2]).normalize(); // from the pup out past the rival (the knock-back)

// The world, built by the shared prewarm (cutscene/prewarm.js) while the seal walks up to the dock.
function buildWorld() {
  const U = celUniforms();
  const skyM = sky(U);
  const cityMat = celMaterial(U);
  const rotG = rotorGeometry();
  const leaf = leaves().map(({ g, rotors }) => {
    const mesh = new Mesh(g, cityMat);
    mesh.frustumCulled = false;
    const rot = new InstancedMesh(rotG, cityMat, Math.max(1, rotors.length));
    rot.frustumCulled = false;
    const group = new Group();
    group.add(mesh, rot);
    return { group, mesh, rot, rotors, angle: Float32Array.from(rotors, (r) => r[4]) };
  });
  // the creases: A is fixed, B hinges at -22, C at B's far end, D at C's
  leaf[1].group.position.set(0, 0.05, HINGE[1]);
  leaf[2].group.position.set(0, -0.05, HINGE[2] - HINGE[1]);
  leaf[3].group.position.set(0, 0.05, HINGE[3] - HINGE[2]);
  leaf[1].group.add(leaf[2].group);
  leaf[2].group.add(leaf[3].group);
  const arrows = arrowPool(140);
  const flow = createFlow(U, arrows);
  const orb = createOrb(arrows);
  const rival = makeRival(U);
  const rivalG = new Group();
  rivalG.add(rival.body, rival.arm);
  rivalG.visible = false;
  const shadowG = new CircleGeometry(1, 32).rotateX(-Math.PI / 2);
  const shadowM = new MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false, fog: false });
  const shadowPup = new Mesh(shadowG, shadowM);
  shadowPup.position.set(0.05, 0.06, -0.1);
  shadowPup.scale.set(1.3, 1, 1.0);
  const shadowRival = new Mesh(shadowG, shadowM);
  shadowRival.scale.set(0.8, 1, 0.8);
  shadowRival.visible = false;
  const flash = flashQuad("#e4f1ff");
  return { U, skyM, cityMat, leaf, rotG, arrows, flow, orb, rival, rivalG, shadowG, shadowM, shadowPup, shadowRival, flash };
}
registerWarm("p-topological-ml-toolkit", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const pup = useRef(null);
  const shake = useRef(new Vector3());

  const m = useMemo(() => takeWarm("p-topological-ml-toolkit", buildWorld), []);

  const costume = useRef(null);
  const toon = useRef(null);
  const island = useRef([]);
  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    toon.current = p?.root ? pupToon(p.root, m.U) : null;
    if (p?.head && p.rear) {
      costume.current = accelerator(p, m.U);
      p.head.add(costume.current.hair);
      p.rear.add(costume.current.top);
    }
    return () => {
      costume.current?.dispose();
      costume.current = null;
      toon.current?.dispose();
      toon.current = null;
      pup.current = null;
      // everything the scene built goes with it
      m.arrows.dispose();
      m.flow.dispose();
      m.orb.dispose();
      m.rival.dispose();
      m.skyM.g.dispose();
      m.skyM.m.dispose();
      m.cityMat.dispose();
      m.rotG.dispose();
      for (const l of m.leaf) {
        l.mesh.geometry.dispose();
        l.rot.dispose();
      }
      m.shadowG.dispose();
      m.shadowM.dispose();
      m.flash.geometry.dispose();
      m.flash.material.dispose();
    };
  }, [scene, m]);

  // every impact shakes the whole frame two drawings each: the city and the pup together (after Seal.jsx places it)
  // a skip clears the arrival: nothing of the city draws for the frame before this unmounts
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      toon.current?.set(false);
      if (costume.current) costume.current.hair.visible = costume.current.top.visible = false;
      if (costume.current?.eyes) costume.current.eyes.visible = false;
      return;
    }
    if (p?.root && mode === "full") p.root.position.add(shake.current);
  }, -0.5);

  useCutFrame((t, state, dt) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    const c = costume.current;
    if (!full) {
      if (c) c.hair.visible = c.top.visible = false;
      if (c?.eyes) c.eyes.visible = false;
      toon.current?.set(false);
      shake.current.set(0, 0, 0);
      return;
    }
    const tt = onTwos(t);
    const cam = state.camera;
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const gone = tt >= T.vanish[1] - 0.1; // the shut map is gone: the pup is itself again
    const turn = turnFor(card, place, s.x, s.z);
    QR.setFromAxisAngle(UP, turn);

    // the rig: the pup at the origin, shaken two drawings each by the hit under way
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    const amp = m.flow.shakeAt(tt);
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);
    g.rotation.y = turn;

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until the map folds away
    const r = tl.radius * smooth(tl.bloom[0], tl.bloom[1], t) * out;
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const U = m.U;
    const skyU = m.skyM.m.uniforms;
    const wave = tt >= T.pop ? 3.4 * smooth(T.pop, T.pop + 0.95, tt) : -1;
    shellRef.current.visible = r > 0.02 && wave < 3.3;
    shellRef.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    skyU.uInside.value = inside ? 1 : 0;
    skyU.uWave.value = wave;
    skyU.uPop.value.set(POP_AT[0], POP_AT[1], POP_AT[2]).applyQuaternion(QR).add(g.position).sub(cam.position).normalize();
    U.uTime.value = t;
    U.uSun.value.copy(SUN_RIG).applyAxisAngle(UP, turn);
    const foldK = smooth(T.fold[0], T.fold[1], tt);
    U.uFlat.value = smooth(T.fold[0], T.fold[0] + 0.5, tt);
    world.current.visible = inside && tt < T.vanish[1];
    world.current.scale.setScalar(Math.max(0.0001, 1 - smooth(T.vanish[0], T.vanish[1], tt)));

    // the lens in the rig's frame (for the billboards and the arrows)
    g.updateWorldMatrix(true, false);
    CAM.copy(cam.position).sub(g.position).applyAxisAngle(UP, -turn);
    cam.getWorldDirection(FWD).applyAxisAngle(UP, -turn);
    QC.copy(QR).invert().multiply(cam.quaternion);

    // THE MAP FOLDS SHUT: the leaves turn up and over in an accordion, each a beat after the last
    const [f0, f1] = T.fold;
    const span = f1 - f0;
    const fo = (d) => smooth(f0 + d * span, f0 + d * span + 0.55 * span + 0.2, tt);
    m.leaf[1].group.rotation.x = Math.PI * fo(0);
    m.leaf[2].group.rotation.x = -Math.PI * fo(0.12);
    m.leaf[3].group.rotation.x = Math.PI * fo(0.24);

    // THE TURBINES spin (faster in the storm, slowing as the pup takes the wind); they are gone once the map folds
    const storm = 1 + 2 * smooth(2.0, 3.0, tt) * (1 - smooth(5.5, 6.6, tt));
    const calm = 1 - 0.88 * smooth(5.8, 7.0, tt);
    for (const l of m.leaf) {
      l.rot.visible = foldK < 0.02 && l.rotors.length > 0;
      if (!l.rot.visible) continue;
      for (let i = 0; i < l.rotors.length; i++) {
        const [x, y, z, sc] = l.rotors[i];
        l.angle[i] += dt * (2.2 / Math.sqrt(sc)) * storm * calm;
        O.position.set(x, y, z);
        O.rotation.set(0, 0, l.angle[i]);
        O.scale.setScalar(sc);
        O.updateMatrix();
        l.rot.setMatrixAt(i, O.matrix);
      }
      l.rot.instanceMatrix.needsUpdate = true;
    }

    // THE STORM, ITS ARROWS AND THEIR REVERSAL; THE WIND, THE ORB, THE GRID, THE POP
    m.flow.update(tt, CAM, QC, FWD);
    m.orb.update(tt, CAM, QC);

    // THE RIVAL: steps in (a pop on twos), raises the raygun, charges, fires; the ray comes back and throws it
    const rv = m.rival;
    const hit = m.flow.rivalHit;
    const ri = smooth(T.rivalIn[0], T.rivalIn[1], tt);
    const kb = smooth(hit, hit + 0.3, tt);
    const rivalOut = 1 - smooth(f0, f0 + 0.45, tt);
    const pop = ri * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.rivalIn[0]) / 0.5)));
    m.rivalG.visible = ri > 0.01 && rivalOut > 0.01;
    m.rivalG.position.set(RIVAL_AT[0] + AWAY.x * 0.9 * kb + (tt > hit && tt < hit + 0.7 ? 0.03 * odd : 0), 0, RIVAL_AT[2] + AWAY.z * 0.9 * kb);
    m.rivalG.rotation.set(-0.3 * kb, RIVAL_YAW, 0);
    m.rivalG.scale.set(rivalOut, Math.max(pop, 0.001) * rivalOut, rivalOut);
    rv.arm.rotation.x = 1.25 * (1 - smooth(T.rivalArm[0], T.rivalArm[1], tt)) + 0.5 * smooth(hit, hit + 0.25, tt);
    const ch = smooth(T.charge[0], T.charge[1], tt) * (1 - smooth(T.fire, T.fire + 0.04, tt));
    rv.ball.visible = rv.hull.visible = ch > 0.01;
    rv.ball.scale.setScalar(Math.max(ch, 0.001));
    rv.hull.scale.setScalar(Math.max(ch * 1.28, 0.001));
    m.shadowRival.visible = m.rivalG.visible;
    m.shadowRival.position.set(m.rivalG.position.x, 0.06, m.rivalG.position.z);

    // THE PUP: the look grows in on the sign (an overshoot), the cel twin takes the pup into the dimension, and both
    // let go the instant the shut map has gone
    toon.current?.set((inside || tt > tl.bloom[1]) && !gone);
    if (c) {
      const k = smooth(T.costume[0], T.costume[1], tt);
      const grow = k * (1 + 0.18 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.costume[0]) / 0.7)));
      c.hair.visible = c.top.visible = k > 0.01 && !gone;
      if (c.eyes) c.eyes.visible = c.hair.visible;
      c.hair.scale.setScalar(Math.max(grow, 0.01));
      c.top.scale.setScalar(Math.max(0.6 + 0.4 * grow, 0.01));
      // the tuft streams in the wind (harder as the pup takes the wind)
      const gust = 0.04 + 0.1 * smooth(5.7, 7.0, tt) * (1 - smooth(T.release, T.release + 0.4, tt));
      c.hair.rotation.set(gust * Math.sin(tt * 5.1), 0.05 * Math.sin(tt * 3.7), 0.04 * Math.sin(tt * 4.3));
    }
    // the pup: the sign, the flippers up for the storm and the wind, a flick upward to let the bubble go, the fist on the flex
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.raise = smooth(T.raise[0], T.raise[1], tt) * (1 - smooth(T.release - 0.05, T.release + 0.12, tt));
    live.pose.point = smooth(T.release, T.release + 0.12, tt) * (1 - smooth(T.pop + 0.15, T.pop + 0.5, tt));
    live.pose.crouch = (amp > 0.15 ? 0.45 : 0) * (1 - smooth(f0, f0 + 0.2, tt));
    live.pose.fist = smooth(T.vanish[1], T.vanish[1] + 0.3, tt) * out;

    // the flash: a little at a heavy hit, more as the bubble pops (tinted, never a white-out)
    const fl = Math.max(0, 1 - Math.abs(tt - T.pop - 0.04) / 0.1) * 0.32 + Math.max(0, 1 - Math.abs(tt - T.resolve[0] - 0.05) / 0.1) * 0.12 + (amp > 0.15 ? 0.1 : 0);
    holdFlash(m.flash, cam, fl);

    // REALITY: the island the stage hid comes back under the folding map
    if (tt > T.reveal && tt < tl.collapse[0]) for (const o of island.current) o.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={m.skyM.g} material={m.skyM.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <primitive object={m.leaf[0].group} />
          <primitive object={m.leaf[1].group} />
        </group>
        <group>
          {m.flow.meshes.map((x) => (
            <primitive key={x.uuid} object={x} />
          ))}
          {m.arrows.meshes.map((x) => (
            <primitive key={x.uuid} object={x} />
          ))}
          <primitive object={m.orb.group} />
          <primitive object={m.rivalG} />
          <primitive object={m.shadowPup} />
          <primitive object={m.shadowRival} />
        </group>
      </group>
    </>
  );
}
