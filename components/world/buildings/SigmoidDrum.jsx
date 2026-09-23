"use client";

// Landmark for PLACE_BY_ID["sigmoid"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (2.0 m).
//
// A drum observatory ringed with glowing glass rods: the rods carry a
// travelling wave, and a purple orb circles a quarter-turn ahead of the
// wave's crest -- the model imagining its next internal state before the
// rods catch up. Every 20 s it overreaches to a half-turn lead, pales and
// stops: the refusal to act on a prediction it no longer trusts.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Color, CylinderGeometry, Object3D, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { damp, smoothstep, wrapAngle } from "../life/util";
import { C, glow, lamp, mat } from "../palette";

const ROD_COUNT = 16;
const ROD_RADIUS = 1.5;
const ROD_STEP = (Math.PI * 2) / ROD_COUNT;
const ORB_RADIUS = 1.2;
const ORB_Y = 3.0;

// The 20 s "refuses a prediction it no longer trusts" cycle: pull ahead to
// a half turn, hold, then ease back to the normal lead.
const CYCLE = 20;
const PULL_START = 17.5;
const PULL_DUR = 0.5;
const STOP_DUR = 1.5;
const EASE_DUR = 0.5;

// ---- static geometry, built once ------------------------------------------

const CHARCOAL_GEO = mergeGeometries(
  [
    new CylinderGeometry(1.3, 1.3, 0.2, 16).translate(0, 0.1, 0), // base ring
    new CylinderGeometry(1.3, 1.3, 0.18, 16).translate(0, 1.39, 0), // top cap
  ],
  false,
);
const DRUM_GEO = new CylinderGeometry(1.2, 1.2, 1.3, 16).translate(0, 0.65, 0);
const WINDOW_GEO = mergeGeometries(
  [
    new BoxGeometry(0.22, 0.3, 0.12).translate(-0.32, 0.75, 1.2),
    new BoxGeometry(0.22, 0.3, 0.12).translate(0.32, 0.75, 1.2),
  ],
  false,
);
const DOME_GEO = new SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.48, 0);
const ROD_GEO = new BoxGeometry(0.18, 1, 0.18).translate(0, 0.5, 0); // base at y 0, top at y 1

const dummy = new Object3D();

export default function SigmoidDrum({ place }) {
  const near = useUi((s) => s.near === place.id);
  const A = place.color;

  const charcoalMat = useMemo(() => mat(C.charcoal, { flat: true, roughness: 0.7 }), []);
  const warmMat = useMemo(() => mat(C.warmWhite, { flat: true, roughness: 0.75 }), []);
  const windowMat = useMemo(() => lamp(C.lamp), []);
  const iceMat = useMemo(() => mat(C.ice, { flat: true, roughness: 0.55 }), []);
  const rodMat = useMemo(() => lamp(A, 0.9), [A]);

  // Orb and its glow shell change colour/intensity live (near, refusal), so
  // each gets its own clone of the shared cached material to mutate.
  const orbMat = useMemo(() => lamp(A, 1.6).clone(), [A]);
  const glowMat = useMemo(() => glow(A).clone(), [A]);
  const accentColor = useMemo(() => new Color(A), [A]);
  const paleColor = useMemo(() => new Color("#f4f0fa"), []);

  const rodsRef = useRef(null);
  const orbGroupRef = useRef(null);
  const kRef = useRef(0); // eased 0..1 toward `near`
  const phaseRef = useRef(0); // accumulated wave phase (omega * t)
  const frozenRef = useRef(0); // orb angle captured at the moment it stops
  const stoppedRef = useRef(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * damp(4, dt);
    const k = kRef.current;

    phaseRef.current += 0.8 * dt * (1 + 0.5 * k); // 1x to 1.5x near
    const phase = phaseRef.current;
    const crest = phase + Math.PI / 2; // angle where sin(theta - phase) peaks
    const normalLead = (0.25 + 0.25 * k) * Math.PI * 2; // quarter to half turn near

    const cycle = state.clock.elapsedTime % CYCLE;
    let orbTheta;
    let glowMix; // 0 = trusted accent glow, 1 = refused, pale and dim
    if (cycle < PULL_START) {
      orbTheta = crest + normalLead;
      glowMix = 0;
      stoppedRef.current = false;
    } else if (cycle < PULL_START + PULL_DUR) {
      const u = smoothstep(0, 1, (cycle - PULL_START) / PULL_DUR);
      orbTheta = crest + normalLead + (Math.PI - normalLead) * u; // toward a half turn
      glowMix = u;
      stoppedRef.current = false;
    } else if (cycle < PULL_START + PULL_DUR + STOP_DUR) {
      if (!stoppedRef.current) {
        frozenRef.current = crest + Math.PI;
        stoppedRef.current = true;
      }
      orbTheta = frozenRef.current;
      glowMix = 1;
    } else {
      const u = smoothstep(0, 1, (cycle - PULL_START - PULL_DUR - STOP_DUR) / EASE_DUR);
      const target = crest + normalLead;
      orbTheta = frozenRef.current + wrapAngle(target - frozenRef.current) * u;
      glowMix = 1 - u;
      stoppedRef.current = false;
    }

    // Rods: a travelling wave around the ring.
    const rods = rodsRef.current;
    if (rods) {
      for (let i = 0; i < ROD_COUNT; i++) {
        const theta = i * ROD_STEP;
        const h = 1 + 0.55 * Math.sin(theta - phase);
        dummy.position.set(Math.sin(theta) * ROD_RADIUS, 0, Math.cos(theta) * ROD_RADIUS);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        rods.setMatrixAt(i, dummy.matrix);
      }
      rods.instanceMatrix.needsUpdate = true;
    }

    // Orb: imagines a point ahead of the wave, refusing when it has gone too far.
    if (orbGroupRef.current) {
      orbGroupRef.current.position.set(Math.sin(orbTheta) * ORB_RADIUS, ORB_Y, Math.cos(orbTheta) * ORB_RADIUS);
    }
    orbMat.color.copy(accentColor).lerp(paleColor, glowMix);
    orbMat.emissive.copy(accentColor).lerp(paleColor, glowMix);
    orbMat.emissiveIntensity = (1.6 + 0.8 * k) * (1 - glowMix) + 0.6 * glowMix;
    glowMat.color.copy(accentColor).lerp(paleColor, glowMix);
    glowMat.opacity = 0.22 * (1 - 0.5 * glowMix);
  });

  return (
    <group>
      <mesh castShadow receiveShadow geometry={CHARCOAL_GEO} material={charcoalMat} />
      <mesh castShadow receiveShadow geometry={DRUM_GEO} material={warmMat} />
      <mesh geometry={WINDOW_GEO} material={windowMat} />
      <mesh castShadow receiveShadow geometry={DOME_GEO} material={iceMat} />
      <instancedMesh ref={rodsRef} args={[ROD_GEO, rodMat, ROD_COUNT]} castShadow frustumCulled={false} />
      <group ref={orbGroupRef}>
        <mesh castShadow material={orbMat}>
          <sphereGeometry args={[0.28, 10, 8]} />
        </mesh>
        <mesh material={glowMat}>
          <sphereGeometry args={[0.55, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}
