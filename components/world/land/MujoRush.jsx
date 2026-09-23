"use client";

// MOUNT MUJORUSH: Mount Rushmore, for seals. The massif on the valley's west
// side (lib/world/terrain.js shapes its rough rock) has its south cliff
// carved, and out of the one granite mass look three seal pups, one per
// landed MuJoCo contribution, west to east in the landing site's order:
// the royal seal in a crown (google-deepmind/mujoco #3396), the evil seal
// with little horns (mujoco_warp #1541) and the patrol seal in a cap
// (mujoco #3450). Round heads flowing straight into plump bodies, huge dark
// polished-stone eyes, whisker pads, spots chiselled in; the rock rises
// above and flows round all three. Each pup's merged PR number is engraved
// on its chest, its grooves glowing in the district's radiation: the only
// words on the mountain. Talus at the foot.
//
// THE ANOMALY (mujorush's radiation): boulders that broke off the cliff and
// never came down. They hang in the notches between the heads, bobbing on
// their own slow beat, each speared by a glowing magenta crystal, and
// radioactive crystals push up through the talus. The faces are alive: they
// blink, their eyes follow the seal along the cliff, and the number of the
// pup it stands under pulses.
//
// Nothing here explains anything (SHOW, NEVER TELL): the stories the old
// drafts (monuments/Units, Funnel, Hull) told are not mounted.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, Object3D, OctahedronGeometry, SphereGeometry } from "three";
import { live, useUi } from "../../../lib/world/store";
import { lamp, mat } from "../palette";
import { buildStone, CRYSTALS, EYES, FACES, FLOATERS, SPARKS, TALUS } from "./parts/mujorush-build";

const RAD = FACES[0].place.radiation;

let built = null; // built once, shared by every mount
const getStone = () => built ?? (built = buildStone());

const ROCK_GEO = new IcosahedronGeometry(1, 0);
const CRYSTAL_GEO = new OctahedronGeometry(1, 0);
const EYE_GEO = new SphereGeometry(1, 20, 14);
const dummy = new Object3D();
const tint = new Color();
const GRANITE_C = new Color("#b0a49d");
const RAD_C = new Color(RAD);
// Each eye's light: a carved catchlight (a lit bump of pale granite in the
// polished inlay, never a glossy toy highlight), or on the evil pup a pupil
// glowing in the radiation. SLOT: the eye's index in its own mesh.
const SLOT = SPARKS.map((s, i) => SPARKS.slice(0, i).filter((o) => o.evil === s.evil).length);
const N_EVIL = SPARKS.filter((s) => s.evil).length;

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

  const numberMats = useMemo(() => FACES.map(() => lamp(RAD, 0.7).clone()), []);
  const floatMat = mat("#ffffff", { roughness: 0.75, emissive: RAD, emissiveIntensity: 0.1 });

  const eyes = useRef(null);
  const sparks = useRef(null);
  const pupils = useRef(null);
  const floaters = useRef(null);
  const spears = useRef(null);
  const clock = useRef(0);
  const lift = useRef(1);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const step = Math.min(dt, 0.1);
    const seal = live.seal;

    // the number of the pup the seal stands under pulses
    for (let i = 0; i < numberMats.length; i++) {
      const target = i === nearFace ? 1.3 + 0.5 * Math.sin(t * 5) : 0.7;
      numberMats[i].emissiveIntensity += (target - numberMats[i].emissiveIntensity) * Math.min(1, step * 6);
    }

    // eyes: follow the seal along the cliff, blink on staggered beats, wink
    const em = eyes.current;
    const sm = sparks.current;
    const pm = pupils.current;
    if (em && sm && pm) {
      for (let i = 0; i < EYES.length; i++) {
        const eye = EYES[i];
        const fx = FACES[eye.face].x;
        const look = Math.max(-1, Math.min(1, ((seal?.x ?? fx) - fx) / 14)) * 0.12;
        // A blink every 3.4-4.8 s per face (0.3 s, long enough to catch),
        // every other one a double; the evil pup also winks its right eye,
        // slow and held, every 7 s (the owner: "all eyes must blink, and
        // the middle evil one can wink too").
        const period = 3.4 + eye.face * 0.7;
        const cycle = Math.floor((t + eye.face * 1.9) / period);
        const beat = (t + eye.face * 1.9) % period;
        const blink = (u) => (u >= 0 && u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0);
        let shut = Math.max(blink(beat), cycle % 2 ? blink(beat - 0.42) : 0);
        if (SPARKS[i].evil && i % 2 === 1) {
          const w = (t + 2.3) % 7;
          if (w < 0.9) shut = Math.max(shut, Math.min(1, w / 0.15, (0.9 - w) / 0.2));
        }
        const down = eye.face === nearFace ? -0.05 : 0;
        dummy.rotation.set(eye.rx, 0, 0);
        dummy.position.set(eye.x + look, eye.y + down, eye.z);
        dummy.scale.set(eye.sx, eye.sy * (1 - 0.92 * shut), eye.sz);
        dummy.updateMatrix();
        em.setMatrixAt(i, dummy.matrix);
        const sp = SPARKS[i];
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(eye.x + look * 1.4 + sp.dx, eye.y + down + sp.dy * (1 - shut), eye.z + sp.dz);
        dummy.scale.setScalar(sp.r * (1 - shut));
        dummy.updateMatrix();
        (sp.evil ? pm : sm).setMatrixAt(SLOT[i], dummy.matrix);
      }
      em.instanceMatrix.needsUpdate = true;
      sm.instanceMatrix.needsUpdate = true;
      pm.instanceMatrix.needsUpdate = true;
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
      <mesh geometry={g.stone} material={mat("#ffffff", { flat: false, roughness: 0.85, vertexColors: true })} renderOrder={-1} castShadow receiveShadow />
      <mesh geometry={g.inlay} material={mat("#1c1824", { flat: false, roughness: 0.28 })} />
      <mesh geometry={g.gems} material={lamp(RAD, 1.2)} />
      {g.glows.map((geo, i) => (
        <mesh key={FACES[i].id} geometry={geo} material={numberMats[i]} />
      ))}

      <instancedMesh ref={eyes} args={[EYE_GEO, mat("#1c1824", { flat: false, roughness: 0.28 }), EYES.length]} frustumCulled={false} />
      <instancedMesh ref={sparks} args={[EYE_GEO, mat("#ddd4cc", { flat: false, roughness: 0.9 }), SPARKS.length - N_EVIL]} frustumCulled={false} />
      <instancedMesh ref={pupils} args={[EYE_GEO, lamp(RAD, 1.2), N_EVIL]} frustumCulled={false} />

      <Placed geometry={ROCK_GEO} material={mat("#a89c96", { roughness: 0.9 })} items={TALUS} set={setRock} castShadow />
      <Placed geometry={CRYSTAL_GEO} material={lamp(RAD, 1.2)} items={CRYSTALS} set={setCrystal} />
      <instancedMesh ref={floaters} args={[ROCK_GEO, floatMat, FLOATERS.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={spears} args={[CRYSTAL_GEO, lamp(RAD, 1.2), FLOATERS.length]} frustumCulled={false} />
    </group>
  );
}
