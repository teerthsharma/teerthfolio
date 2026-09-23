"use client";

// The BUILDING for Aether-Lang (place id p-aether-lang): a lab project, no
// plinth, standing on the snow. Local origin: the snow at the place centre;
// +z faces the camera and the dock.
//
// data/showcase.json: "Loops stop when their shape stops changing" — a
// language where a loop's own exit test is the shape of its state. The
// normal thing, done cooler: a carousel, a ride that is nothing but a loop,
// normally stopped by a timer or an operator's hand. This one has no timer
// either: it runs its own beat — spin up, cruise, decelerate to a dead
// stop, hold the lock — and only then lets go and starts its next run on
// its own. SHOW, NEVER TELL: the story is carried by that beat alone, never
// by a diagram of the runtime's own math (no nodes, no edges, no plotted
// shape).

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Object3D, TorusGeometry,
} from "three";
import { C, glow, lamp, mat } from "../palette";

// --- timeline (seconds): the ride's own beat, not a counted loop ---------
const ACCEL = 1.1; // spinning up
const CRUISE = 1.6; // top speed
const DECEL = 1.3; // decelerating to a dead stop
const LOCK = 1.1; // holds the lock — the ride's own "done", nothing counted it
const CYCLE = ACCEL + CRUISE + DECEL + LOCK;
const SPIN_MAX = 1.15; // rad/s at cruise
const LAMP_COUNT = 10; // lights riding the rail, evenly spaced

// --- the building's own geometry (place-independent, built once) ----------
const RING_SCALE = 1.7; // world metres, the rail's radius
const TIER_Y = 2.35; // height of the carousel platform
const SPOKE_COUNT = 4;
const WINDOW_COUNT = 6;

const POLE_TOP_R = 0.17; // the centre mast's radius at platform height, where the spokes start
const PLATFORM_TOP = 0.35; // the foot's top — the drum's own base
const DRUM_H = TIER_Y - PLATFORM_TOP; // the drum: a solid body between the foot and the platform
const WINDOW_Y = PLATFORM_TOP + DRUM_H * 0.55;
const WINDOW_R = 1.96;

// The rim sits well above the platform: measured in real Chrome, a low roof
// put the canopy's underside in front of the platform along the follow
// camera's own sightline and hid the ride no matter the capture angle.
// Extra headroom between TIER_Y and the roof is what lets the camera
// actually see the ride it is supposed to watch.
const RIM_Y = 5.4; // the canopy rim, where the support cage ends
const CAGE_H = RIM_Y - TIER_Y; // the open cage: platform to roof, so the ride shows through it
const POLE_H = RIM_Y - PLATFORM_TOP; // the centre mast reaches the same rim the cage does
const SUPPORT_COUNT = 8; // the cage: real poles a carousel roof actually stands on
const HALF_SUPPORT = SUPPORT_COUNT / 2; // split evenly, alternating charcoal/accent below
const SUPPORT_R = 1.93;

const FOOT_GEO = new CylinderGeometry(1.9, 2.05, 0.35, 10);
const DRUM_GEO = new CylinderGeometry(SUPPORT_R, 1.9, DRUM_H, 10); // flush with the foot below, the cage above
const POLE_GEO = new CylinderGeometry(0.14, POLE_TOP_R, POLE_H, 8);
const SUPPORT_GEO = new CylinderGeometry(0.09, 0.09, CAGE_H, 8);
const RAIL_GEO = new TorusGeometry(RING_SCALE, 0.07, 8, 20); // a real rail now: chunky, not a hairline guide
const SPOKE_LEN = RING_SCALE - POLE_TOP_R;
const SPOKE_GEO = new BoxGeometry(0.12, 0.12, SPOKE_LEN);
const CANOPY_GEO = new ConeGeometry(1.95, 1.3, 10);
const RIM_GEO = new TorusGeometry(1.95, 0.07, 6, 10);
const WINDOW_GEO = new BoxGeometry(0.34, 0.42, 0.1);
const FINIAL_GEO = new IcosahedronGeometry(0.17, 0);
const LAMP_GEO = new IcosahedronGeometry(0.2, 0); // a bulb big enough to read as a point of light at game distance

const FOOT_MAT = mat(C.warmWhite, { roughness: 0.82 });
const DRUM_MAT = mat(C.warmWhite, { roughness: 0.8 }); // the body stays near-neutral; its windows carry the colour
const POLE_MAT = mat(C.charcoal, { roughness: 0.4, metalness: 0.15 });
const RAIL_MAT = mat(C.charcoal, { roughness: 0.3, metalness: 0.5 });
const SPOKE_MAT = mat(C.charcoal, { roughness: 0.5 });

// Scratch reused every frame: never allocate inside useFrame.
const dummy = new Object3D();

const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
const ease = (u) => { const c = clamp01(u); return c * c * (3 - 2 * c); };

export default function Aether({ place, near }) {
  const glowColor = place.radiation ?? place.color;

  const spokeRef = useRef();
  const windowRef = useRef();
  const supportRef = useRef();
  const supportAccentRef = useRef();
  const lampRef = useRef();
  const spinRef = useRef();
  const clock = useRef(0);
  const pop = useRef(0);
  const wasLocked = useRef(false);

  // The building's own accent, on the building — not only on trim: the
  // canopy and half the cage poles wear the radiation colour, so it reads
  // on the silhouette from the dock, not just up close on a finial.
  const lampMat = useMemo(() => mat(glowColor, { emissive: glowColor, emissiveIntensity: 0.9, roughness: 0.35 }), [glowColor]);
  const rimMat = useMemo(() => mat(glowColor, { roughness: 0.45 }), [glowColor]);
  const canopyMat = useMemo(() => mat(glowColor, { roughness: 0.5 }), [glowColor]);
  const windowMat = useMemo(() => lamp(glowColor), [glowColor]);
  const accentPoleMat = useMemo(() => mat(glowColor, { roughness: 0.4, metalness: 0.15 }), [glowColor]);
  const finialMat = useMemo(() => mat(glowColor, { emissive: glowColor, emissiveIntensity: 1.1, roughness: 0.3 }).clone(), [glowColor]);

  // Every static instance — the drum's windows, the cage poles, the
  // platform's spokes, the lamps riding the rail — placed once. Nothing
  // here moves on its own; the whole platform group turns as one piece.
  useLayoutEffect(() => {
    const sm = spokeRef.current;
    if (sm) {
      for (let i = 0; i < SPOKE_COUNT; i++) {
        const a = (i * Math.PI * 2) / SPOKE_COUNT;
        const mid = POLE_TOP_R + SPOKE_LEN / 2;
        dummy.position.set(Math.sin(a) * mid, 0, Math.cos(a) * mid);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        sm.setMatrixAt(i, dummy.matrix);
      }
      sm.instanceMatrix.needsUpdate = true;
    }
    const wm = windowRef.current;
    if (wm) {
      for (let i = 0; i < WINDOW_COUNT; i++) {
        const a = (i * Math.PI * 2) / WINDOW_COUNT;
        dummy.position.set(Math.sin(a) * WINDOW_R, WINDOW_Y, Math.cos(a) * WINDOW_R);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        wm.setMatrixAt(i, dummy.matrix);
      }
      wm.instanceMatrix.needsUpdate = true;
    }
    // the cage: real poles from the drum to the canopy rim, alternating
    // charcoal and accent so the colour reads on the silhouette
    const cm = supportRef.current;
    const ca = supportAccentRef.current;
    if (cm && ca) {
      let ci = 0, ai = 0;
      for (let i = 0; i < SUPPORT_COUNT; i++) {
        const a = (i * Math.PI * 2) / SUPPORT_COUNT;
        dummy.position.set(Math.sin(a) * SUPPORT_R, TIER_Y + CAGE_H / 2, Math.cos(a) * SUPPORT_R);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        if (i % 2 === 0) ca.setMatrixAt(ai++, dummy.matrix);
        else cm.setMatrixAt(ci++, dummy.matrix);
      }
      cm.instanceMatrix.needsUpdate = true;
      ca.instanceMatrix.needsUpdate = true;
    }
    // the lamps: fixed on the rail, inside the spin group — they ride the
    // ring around, they never move on their own
    const lm = lampRef.current;
    if (lm) {
      for (let i = 0; i < LAMP_COUNT; i++) {
        const a = (i * Math.PI * 2) / LAMP_COUNT;
        dummy.position.set(Math.sin(a) * RING_SCALE, 0, Math.cos(a) * RING_SCALE);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        lm.setMatrixAt(i, dummy.matrix);
      }
      lm.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame((_, dt) => {
    const boost = near ? 1.6 : 1;
    clock.current += dt * boost;
    const t = clock.current % CYCLE;

    // spin/slow/lock/release: the ride's own beat
    let v;
    if (t < ACCEL) v = SPIN_MAX * ease(t / ACCEL);
    else if (t < ACCEL + CRUISE) v = SPIN_MAX;
    else if (t < ACCEL + CRUISE + DECEL) v = SPIN_MAX * (1 - ease((t - ACCEL - CRUISE) / DECEL));
    else v = 0; // locked, holding

    const locked = t >= ACCEL + CRUISE + DECEL;
    if (wasLocked.current && !locked) pop.current = 1; // just let go — the ride catches again
    wasLocked.current = locked;
    pop.current = Math.max(0, pop.current - dt / 0.5);

    if (spinRef.current) {
      spinRef.current.rotation.y += v * dt * boost;
      const s = 1 + pop.current * 0.12; // a small catch-bounce on release, not a bell
      spinRef.current.scale.set(1, s, 1);
    }
    finialMat.emissiveIntensity = (1.0 + 0.45 * Math.sin(clock.current * 3)) * (near ? 1.35 : 1);
  });

  return (
    <group>
      <mesh position={[0, 0.175, 0]} castShadow receiveShadow material={FOOT_MAT} geometry={FOOT_GEO} />

      {/* the drum: a solid body between the foot and the platform, so the
          base reads as a standing carousel and not an open cage */}
      <mesh position={[0, PLATFORM_TOP + DRUM_H / 2, 0]} castShadow receiveShadow material={DRUM_MAT} geometry={DRUM_GEO} />
      <instancedMesh ref={windowRef} args={[WINDOW_GEO, windowMat, WINDOW_COUNT]} frustumCulled={false} />

      <mesh position={[0, PLATFORM_TOP + POLE_H / 2, 0]} castShadow material={POLE_MAT} geometry={POLE_GEO} />

      {/* the cage: real poles from the platform to the canopy rim, so the
          ride reads as a standing carousel and not a parasol on a stick —
          half in the project's colour, half charcoal, both visible through
          to the lamps turning inside */}
      <instancedMesh ref={supportRef} args={[SUPPORT_GEO, POLE_MAT, HALF_SUPPORT]} castShadow frustumCulled={false} />
      <instancedMesh ref={supportAccentRef} args={[SUPPORT_GEO, accentPoleMat, HALF_SUPPORT]} castShadow frustumCulled={false} />

      <mesh position={[0, RIM_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={rimMat} geometry={RIM_GEO} />
      <mesh position={[0, RIM_Y + 0.65, 0]} castShadow material={canopyMat} geometry={CANOPY_GEO} />
      <group position={[0, RIM_Y + 1.47, 0]}>
        <mesh material={finialMat} geometry={FINIAL_GEO} />
        <mesh material={glow(glowColor, 0.28)}>
          <sphereGeometry args={[0.42, 12, 10]} />
        </mesh>
      </group>

      {/* the carousel platform: spokes, rail and the lamps that ride it,
          all turning together — a real ride, spinning up, cruising,
          decelerating to a dead stop, holding, then letting go again */}
      <group ref={spinRef} position={[0, TIER_Y, 0]}>
        <instancedMesh ref={spokeRef} args={[SPOKE_GEO, SPOKE_MAT, SPOKE_COUNT]} frustumCulled={false} />
        <mesh rotation={[Math.PI / 2, 0, 0]} material={RAIL_MAT} geometry={RAIL_GEO} />
        <instancedMesh ref={lampRef} args={[LAMP_GEO, lampMat, LAMP_COUNT]} frustumCulled={false} />
      </group>
    </group>
  );
}
