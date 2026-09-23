"use client";

// MOUNT MUJORUSH: Mount Rushmore, for seals. The massif on the valley's west
// side (lib/world/terrain.js shapes its rough rock) wears a smooth carved
// granite face along its south cliff, and out of it look three giant seal
// pups, one per landed MuJoCo contribution, west to east in the landing
// site's own order: google-deepmind/mujoco #3396, mujoco_warp #1541,
// mujoco #3450. Each wears its merged PR number on its neck, a collar band
// in the district's radiation colour, gold-studded: the only words on the
// mountain. Their crowns are lost in the uncarved rock, the way Rushmore's
// are. One grins, one winks with its tongue out, one wears Rushmore's
// spectacles. A heap of blasted granite lies at each face's foot (the
// reading point: the seal docks at its toe, under the collar).
//
// THE ANOMALY (mujorush's radiation): boulders that broke off the cliff and
// never came down. They hang in the gaps between the faces, bobbing on
// their own slow beat, each speared by a glowing magenta crystal, and
// radioactive crystals push up through the talus. The faces are alive: they
// blink, their eyes follow the seal along the cliff, and the collar of the
// face it stands under pulses.
//
// Nothing here explains anything (SHOW, NEVER TELL): the stories the old
// drafts (monuments/Units, Funnel, Hull) told are not mounted.

import { Center, Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, Object3D, OctahedronGeometry, SphereGeometry } from "three";
import { live, useUi } from "../../../lib/world/store";
import { lamp, mat } from "../palette";
import { buildCliff, buildHeads, COLLAR_FRONT, COLLAR_Y, CRYSTALS, EYES, FACES, FLOATERS, SPARKS, TALUS } from "./parts/mujorush-build";

const RAD = FACES[0].place.radiation;
const CARVED = "#d8c2b3"; // fresh-cut granite, a step warmer and paler than the rock round it
const ROUGH = "#a0948f"; // blasted talus
const FONT = "/fonts/helvetiker_bold.typeface.json";

let stone = null; // built once, shared by every mount
const getStone = () => stone ?? (stone = { cliff: buildCliff(), ...buildHeads() });

const ROCK_GEO = new IcosahedronGeometry(1, 0);
const CRYSTAL_GEO = new OctahedronGeometry(1, 0);
const EYE_GEO = new SphereGeometry(1, 20, 14);
const dummy = new Object3D();
const tint = new Color();
const GRANITE_C = new Color("#b9aea8");
const RAD_C = new Color(RAD);

// Instances placed once.
function Placed({ geometry, material, items, set, castShadow = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    items.forEach((it, i) => {
      set(it);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, set]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow />;
}
const setRock = (b) => {
  dummy.position.set(b.x, b.y, b.z);
  dummy.rotation.set(b.rx, b.ry, 0);
  dummy.scale.set(b.r, b.r * (b.sy ?? 0.78), b.r * (b.sz ?? 0.92));
};
const setCrystal = (c) => {
  dummy.position.set(c.x, c.y + c.h * 0.45, c.z);
  dummy.rotation.set(c.tilt * 0.5, c.ry, c.tilt);
  dummy.scale.set(c.r, c.h, c.r);
};

export default function MujoRush() {
  const near = useUi((s) => s.near);
  const nearFace = FACES.findIndex((f) => f.id === near);
  const g = getStone();

  const collarMats = useMemo(() => FACES.map(() => mat(RAD, { flat: false, roughness: 0.4, emissive: RAD, emissiveIntensity: 0.32 }).clone()), []);
  const floatMat = mat("#ffffff", { roughness: 0.75, emissive: RAD, emissiveIntensity: 0.1 });

  const eyes = useRef(null);
  const sparks = useRef(null);
  const floaters = useRef(null);
  const spears = useRef(null);
  const clock = useRef(0);
  const lift = useRef(1);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const step = Math.min(dt, 0.1);
    const seal = live.seal;

    // the collar of the face the seal stands under pulses
    for (let i = 0; i < collarMats.length; i++) {
      const target = i === nearFace ? 0.8 + 0.3 * Math.sin(t * 5) : 0.32;
      collarMats[i].emissiveIntensity += (target - collarMats[i].emissiveIntensity) * Math.min(1, step * 6);
    }

    // eyes: follow the seal along the cliff, blink on staggered beats
    const em = eyes.current;
    const sm = sparks.current;
    if (em && sm) {
      for (let i = 0; i < EYES.length; i++) {
        const eye = EYES[i];
        const fx = FACES[eye.face].x;
        const look = Math.max(-1, Math.min(1, ((seal?.x ?? fx) - fx) / 14)) * 0.14;
        const beat = (t + eye.face * 1.9) % (4.6 + eye.face * 0.8);
        const shut = beat < 0.2 ? Math.sin((beat / 0.2) * Math.PI) : 0;
        const down = eye.face === nearFace ? -0.06 : 0;
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(eye.x + look, eye.y + down, eye.z);
        dummy.scale.set(eye.sx, eye.sy * (1 - 0.9 * shut), eye.sz);
        dummy.updateMatrix();
        em.setMatrixAt(i, dummy.matrix);
        const sp = SPARKS[i];
        dummy.position.set(eye.x + look + sp.x, eye.y + down + sp.y * (1 - shut), eye.z + sp.z);
        dummy.scale.setScalar(sp.r * (1 - shut));
        dummy.updateMatrix();
        sm.setMatrixAt(i, dummy.matrix);
      }
      em.instanceMatrix.needsUpdate = true;
      sm.instanceMatrix.needsUpdate = true;
    }

    // the floating boulders: livelier while the seal is on the mountain
    const fm = floaters.current;
    const spm = spears.current;
    if (fm && spm) {
      const k = nearFace >= 0 ? 1.7 : 1;
      lift.current += (k - lift.current) * Math.min(1, step * 2);
      clock.current += step * lift.current;
      const c = clock.current;
      for (let i = 0; i < FLOATERS.length; i++) {
        const b = FLOATERS[i];
        dummy.position.set(b.x, b.y + Math.sin(c * b.speed + b.phase) * 0.35 * lift.current, b.z);
        dummy.rotation.set(c * 0.23 * b.speed + b.phase, c * 0.31 * b.speed + i, 0.3 * Math.sin(c * 0.4 + i));
        dummy.scale.set(b.r, b.r * 0.82, b.r * 0.94);
        dummy.updateMatrix();
        fm.setMatrixAt(i, dummy.matrix);
        tint.copy(GRANITE_C).lerp(RAD_C, 0.16 + 0.12 * Math.sin(c * 1.3 + b.phase));
        fm.setColorAt(i, tint);
        dummy.scale.set(b.r * 0.42, b.r * 1.45, b.r * 0.42); // the crystal through it, poking out both ends
        dummy.updateMatrix();
        spm.setMatrixAt(i, dummy.matrix);
      }
      fm.instanceMatrix.needsUpdate = true;
      spm.instanceMatrix.needsUpdate = true;
      if (fm.instanceColor) fm.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* drawn first: it hides the rough terrain cliff behind it, so early-z
          rejects those fragments instead of shading them twice */}
      <mesh geometry={g.cliff} material={mat("#ffffff", { flat: false, roughness: 0.85, vertexColors: true })} renderOrder={-1} receiveShadow />
      <mesh geometry={g.granite} material={mat(CARVED, { flat: false, roughness: 0.72 })} castShadow receiveShadow />
      <mesh geometry={g.blush} material={mat("#ff8fb1", { flat: false, roughness: 0.6 })} />
      <mesh geometry={g.dark} material={mat("#26252c", { flat: false, roughness: 0.45 })} castShadow />
      <mesh geometry={g.gold} material={mat("#ffc233", { flat: false, roughness: 0.3, metalness: 0.55 })} />
      {g.collars.map((geo, i) => (
        <mesh key={FACES[i].id} geometry={geo} material={collarMats[i]} castShadow receiveShadow />
      ))}
      <Suspense fallback={null}>
        {FACES.map((f) => (
          <Center key={f.id} position={[f.x, COLLAR_Y, COLLAR_FRONT - 0.1]} disableZ>
            <Text3D font={FONT} size={0.74} height={0.2} bevelEnabled bevelSize={0.02} bevelThickness={0.03} curveSegments={4} material={mat("#fff8ec", { flat: false, roughness: 0.5, emissive: "#fff8ec", emissiveIntensity: 0.3 })}>
              {f.collar}
            </Text3D>
          </Center>
        ))}
      </Suspense>

      <instancedMesh ref={eyes} args={[EYE_GEO, mat("#121218", { flat: false, roughness: 0.12, metalness: 0.1 }), EYES.length]} frustumCulled={false} />
      <instancedMesh ref={sparks} args={[EYE_GEO, mat("#ffffff", { flat: false, emissive: "#ffffff", emissiveIntensity: 0.9 }), SPARKS.length]} frustumCulled={false} />

      <Placed geometry={ROCK_GEO} material={mat(ROUGH, { roughness: 0.9 })} items={TALUS} set={setRock} castShadow />
      <Placed geometry={CRYSTAL_GEO} material={lamp(RAD, 1.2)} items={CRYSTALS} set={setCrystal} />
      <instancedMesh ref={floaters} args={[ROCK_GEO, floatMat, FLOATERS.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={spears} args={[CRYSTAL_GEO, lamp(RAD, 1.2), FLOATERS.length]} frustumCulled={false} />
    </group>
  );
}
