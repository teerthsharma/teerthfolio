"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Object3D, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

// Landmark for PLACE_BY_ID["emfield"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (2.0 m).
//
// Electromagnetic-Field-Data-Simulator, "Toroidal Pulse" scenario: a big
// teal ring stood on a stepped plinth like a portal, three slider knobs on
// its front face. One knob slides to a new spot every few seconds and the
// part of the field it owns -- the bead chase around the ring, the core's
// pulse, the glow shell's size -- reshapes with it.

const RING_CENTER_Y = 2.18;
const RING_OUTER_R = 1.48; // torus R 1.2 + tube 0.28: where the beads ride
const BEAD_COUNT = 16;
const KNOB_X = [-0.7, 0, 0.7];
const KNOB_Y = 0.795;
const KNOB_Z = 1.2;
const KNOB_TRAVEL = 0.15; // slot is 0.6 long, knob 0.26 wide
const EASE = 4; // shared rate for every ref-eased value: k = 1 - exp(-EASE*dt)

const dummy = new Object3D();

export default function PulseRing({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;

  // Materials. Ring/knobs/beads never change colour, so the cached palette
  // instances are shared as-is; only the core's emissive breathes, so it
  // gets its own clone per palette.js's rule (never mutate a cached mat()).
  const warmMat = useMemo(() => mat(C.warmWhite), []);
  const charcoalMat = useMemo(() => mat(C.charcoal), []);
  const ringMat = useMemo(() => mat(A), [A]);
  const knobMat = useMemo(() => mat(A), [A]);
  const beadMat = useMemo(() => lamp("#e8fffb", 1.5), []);
  const coreMat = useMemo(() => lamp(A, 1.2).clone(), [A]);
  const glowMat = useMemo(() => glow(A, 0.22), [A]);

  // Static geometry, merged so the plinth cap and cradle are one draw call.
  const baseGeo = useMemo(() => new CylinderGeometry(1.7, 1.7, 0.3, 12), []);
  const charcoalGeo = useMemo(() => {
    const cap = new CylinderGeometry(1.3, 1.3, 0.25, 12);
    cap.translate(0, 0.43, 0);
    const cradle = new BoxGeometry(0.9, 0.35, 0.7);
    cradle.translate(0, 0.72, 0);
    return mergeGeometries([cap, cradle]);
  }, []);
  const ringGeo = useMemo(() => new TorusGeometry(1.2, 0.28, 12, 32), []);
  const slotGeo = useMemo(() => new BoxGeometry(0.6, 0.1, 0.16), []);
  const coreGeo = useMemo(() => new IcosahedronGeometry(0.35, 0), []);
  const shellGeo = useMemo(() => new SphereGeometry(0.7, 16, 12), []);
  const beadGeo = useMemo(() => new SphereGeometry(0.14, 10, 8), []);
  const knobGeo = useMemo(() => new BoxGeometry(0.26, 0.22, 0.26), []);

  const slotsRef = useRef(null);
  const beadsRef = useRef(null);
  const knobsRef = useRef(null);
  const coreRef = useRef(null);
  const shellRef = useRef(null);

  // Slots never move: place the three instances once.
  useEffect(() => {
    const inst = slotsRef.current;
    if (!inst) return;
    for (let i = 0; i < KNOB_X.length; i++) {
      dummy.position.set(KNOB_X[i], 0.605, KNOB_Z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }, []);

  // One knob slides to a new position every few seconds; the field property
  // it owns (bead speed, core pulse, glow size) reads its eased value.
  const knobPos = useRef([0.5, -0.3, -0.6]); // eased, -1..1
  const knobTarget = useRef([0.5, -0.3, -0.6]);
  const knobTurn = useRef(0); // which knob moves next
  const knobTimer = useRef(0);
  const nearK = useRef(0); // eased 0 (far) -> 1 (near)
  const chasePhase = useRef(0); // accumulated bead rotation, radians

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;

    const period = 4 - 2 * nearK.current; // 4s far, 2s near
    knobTimer.current += dt;
    if (knobTimer.current >= period) {
      knobTimer.current = 0;
      const i = knobTurn.current;
      knobTarget.current[i] = knobTarget.current[i] > 0 ? -1 : 1;
      knobTurn.current = (i + 1) % 3;
    }
    for (let i = 0; i < 3; i++) {
      knobPos.current[i] += (knobTarget.current[i] - knobPos.current[i]) * k;
    }

    const t = state.clock.elapsedTime;
    const speedT = (knobPos.current[0] + 1) / 2; // 0..1
    const ampT = (knobPos.current[1] + 1) / 2;
    const sizeT = (knobPos.current[2] + 1) / 2;

    // Beads chase the ring's outer rim; near doubles the flow.
    const speed = (0.35 + speedT * 1.55) * (1 + nearK.current);
    chasePhase.current += speed * dt;
    const beads = beadsRef.current;
    if (beads) {
      for (let i = 0; i < BEAD_COUNT; i++) {
        const u = (i / BEAD_COUNT) * Math.PI * 2 + chasePhase.current;
        dummy.position.set(Math.cos(u) * RING_OUTER_R, RING_CENTER_Y + Math.sin(u) * RING_OUTER_R, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
      }
      beads.instanceMatrix.needsUpdate = true;
    }

    // Knobs slide along their slots.
    const knobs = knobsRef.current;
    if (knobs) {
      for (let i = 0; i < 3; i++) {
        dummy.position.set(KNOB_X[i] + knobPos.current[i] * KNOB_TRAVEL, KNOB_Y, KNOB_Z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        knobs.setMatrixAt(i, dummy.matrix);
      }
      knobs.instanceMatrix.needsUpdate = true;
    }

    // Core pulse: amplitude from knob 2, emissive brighter near.
    const amp = 0.03 + ampT * 0.2;
    if (coreRef.current) coreRef.current.scale.setScalar(1 + amp * Math.sin(t * 3));
    coreMat.emissiveIntensity = 1.2 + nearK.current * 1;

    // Glow shell breathes; its base size follows knob 3. Kept well inside
    // the ring's inner hole (0.92 m) so it stays a pulse, not a fill.
    const shellSize = 0.5 + sizeT * 0.35;
    if (shellRef.current) shellRef.current.scale.setScalar(shellSize + 0.04 * Math.sin(t * 1.5));
  });

  return (
    <group>
      <mesh castShadow receiveShadow geometry={baseGeo} material={warmMat} position={[0, 0.15, 0]} />
      <mesh castShadow receiveShadow geometry={charcoalGeo} material={charcoalMat} />
      <instancedMesh ref={slotsRef} args={[slotGeo, charcoalMat, KNOB_X.length]} receiveShadow />

      <mesh castShadow receiveShadow geometry={ringGeo} material={ringMat} position={[0, RING_CENTER_Y, 0]} />
      <instancedMesh ref={beadsRef} args={[beadGeo, beadMat, BEAD_COUNT]} />
      <instancedMesh ref={knobsRef} args={[knobGeo, knobMat, KNOB_X.length]} castShadow receiveShadow />

      <mesh ref={coreRef} geometry={coreGeo} material={coreMat} position={[0, RING_CENTER_Y, 0]} />
      <mesh ref={shellRef} geometry={shellGeo} material={glowMat} position={[0, RING_CENTER_Y, 0]} />
    </group>
  );
}
