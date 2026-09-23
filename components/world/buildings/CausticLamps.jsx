"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, ConeGeometry, CylinderGeometry, Object3D, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

// Landmark for PLACE_BY_ID["caustic"] in lib/world/places.js.
//
// Eight lamp posts ring a central lens tower. The heads start aimed on their
// own distinct headings (many questions, many answers), swing in over 3 s to
// aim at one point (the collapse: a language model giving every question the
// same answer), flash the tower's lens and the detector ring, hold (detected
// with no answer key), then fan back out (repaired).
//
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock. Footprint stays inside place.radius (2.2 m); heads
// swing out to ~1.85 m, lens cap top at 2.72 m.

const LAMP_COUNT = 8;
const LAMP_RADIUS = 1.55;
const LAMP_ANGLES = Array.from({ length: LAMP_COUNT }, (_, i) => i * (Math.PI / 4) + Math.PI / 8);
const HEAD_Y = 1.85;
const LENS_OFFSET = 0.28; // from head centre, along the aim, to the lens face
const BEAM_OFFSET = 0.73; // from head centre, along the aim, to the beam's midpoint

// Swing-in 3s, hold+flash 1.5s, swing-out 2s, hold-open 3s.
const CYCLE = 9.5;
const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// One scratch Object3D reused for every instance matrix write: no
// allocations inside useFrame.
const dummy = new Object3D();

export default function CausticLamps({ place }) {
  const near = useUi((s) => s.near === place.id);
  const A = place.color;

  const bodyGeo = useMemo(() => {
    const stage = new CylinderGeometry(2.0, 2.0, 0.2, 20);
    stage.translate(0, 0.1, 0);
    const tower = new CylinderGeometry(0.35, 0.45, 2.0, 12);
    tower.translate(0, 1.0, 0);
    return mergeGeometries([stage, tower]);
  }, []);
  const rimGeo = useMemo(() => new TorusGeometry(2.0, 0.12, 6, 24), []);
  const ringGeo = useMemo(() => new TorusGeometry(0.45, 0.12, 6, 20), []);
  const capGeo = useMemo(() => new SphereGeometry(0.42, 12, 8), []);
  const postGeo = useMemo(() => new BoxGeometry(0.18, 1.5, 0.18), []);
  const headGeo = useMemo(() => new BoxGeometry(0.34, 0.3, 0.5), []);
  const lensGeo = useMemo(() => new BoxGeometry(0.3, 0.24, 0.06), []);
  const beamGeo = useMemo(() => {
    const g = new ConeGeometry(0.25, 0.9, 6);
    // Bake the axis onto local +z, apex trailing at -z (near the lens) and
    // base leading at +z (far out): a per-frame y-rotation alone then aims
    // it, narrow end at the source, same as a real spotlight cone.
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const bodyMat = mat(C.warmWhite);
  const charcoalMat = mat(C.charcoal);
  const ringMat = useMemo(() => lamp(A, 0.6).clone(), [A]);
  const capMat = useMemo(() => {
    const m = mat(C.ice).clone();
    m.emissive.set(A);
    return m;
  }, [A]);
  const lensMat = lamp(A, 1.2);
  const beamMat = glow(A, 0.12);

  const postsRef = useRef(null);
  const headsRef = useRef(null);
  const lensesRef = useRef(null);
  const beamsRef = useRef(null);
  const kRef = useRef(0);
  const phaseRef = useRef(0);

  // Posts never move: place them once instead of every frame.
  useEffect(() => {
    const mesh = postsRef.current;
    if (!mesh) return;
    LAMP_ANGLES.forEach((a, i) => {
      dummy.position.set(Math.sin(a) * LAMP_RADIUS, 0.95, Math.cos(a) * LAMP_RADIUS);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    kRef.current += ((near ? 1 : 0) - kRef.current) * (1 - Math.exp(-4 * dt));
    const k = kRef.current;
    phaseRef.current = (phaseRef.current + dt * (1 + k * 0.5)) % CYCLE;
    const t = phaseRef.current;

    let collapse;
    let flash;
    if (t < 3) {
      collapse = smooth01(t / 3);
      flash = 0;
    } else if (t < 4.5) {
      collapse = 1;
      flash = smooth01((t - 3) / 0.3);
    } else if (t < 6.5) {
      const ct = (t - 4.5) / 2;
      collapse = 1 - smooth01(ct);
      flash = 1 - smooth01(ct);
    } else {
      collapse = 0;
      flash = 0;
    }

    ringMat.emissiveIntensity = Math.max(0.6 + flash * 1.9, 0.6 + k * 1.9);
    capMat.emissiveIntensity = flash * 2.5;

    const heads = headsRef.current;
    const lenses = lensesRef.current;
    const beams = beamsRef.current;
    if (!heads || !lenses || !beams) return;
    for (let i = 0; i < LAMP_COUNT; i++) {
      const a = LAMP_ANGLES[i];
      const aim = a + collapse * Math.PI;
      const dx = Math.sin(aim);
      const dz = Math.cos(aim);
      const px = Math.sin(a) * LAMP_RADIUS;
      const pz = Math.cos(a) * LAMP_RADIUS;

      dummy.position.set(px, HEAD_Y, pz);
      dummy.rotation.set(0, aim, 0);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);

      dummy.position.set(px + dx * LENS_OFFSET, HEAD_Y, pz + dz * LENS_OFFSET);
      dummy.updateMatrix();
      lenses.setMatrixAt(i, dummy.matrix);

      dummy.position.set(px + dx * BEAM_OFFSET, HEAD_Y, pz + dz * BEAM_OFFSET);
      dummy.updateMatrix();
      beams.setMatrixAt(i, dummy.matrix);
    }
    heads.instanceMatrix.needsUpdate = true;
    lenses.instanceMatrix.needsUpdate = true;
    beams.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={bodyGeo} material={bodyMat} castShadow receiveShadow />
      <mesh geometry={rimGeo} material={charcoalMat} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow />
      <mesh geometry={ringGeo} material={ringMat} position={[0, 2.0, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={capGeo} material={capMat} position={[0, 2.3, 0]} />

      <instancedMesh ref={postsRef} args={[postGeo, charcoalMat, LAMP_COUNT]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={headsRef} args={[headGeo, bodyMat, LAMP_COUNT]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={lensesRef} args={[lensGeo, lensMat, LAMP_COUNT]} frustumCulled={false} />
      <instancedMesh ref={beamsRef} args={[beamGeo, beamMat, LAMP_COUNT]} frustumCulled={false} />
    </group>
  );
}
