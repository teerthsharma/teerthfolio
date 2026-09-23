"use client";

// Building for the "caustic" figure: caustic (place id p-caustic), one of
// the lab projects Teerth built, standing on the snow.
//
// The normal thing, done cooler: a lighthouse's ordinary job is to send
// many ships to many distinct, correct points of light. This one also does
// the project's trick — it can see its own beam quietly bending every
// ship's thread onto the same wrong point, and say so, without ever being
// told which point was the right one ("hallucination, measurable with no
// ground truth").
//
// Retells the figure's own measured story verbatim in shape, never in
// invented numbers (data/showcase.json's p-caustic figure; landing site
// fig.js, "caustic —"): 20 beacon lamps, each with its own thread to its
// own point on a ring around the tower. Four conditions cycle forever —
// coherent prose, no prefix, random token ids, " the" x128 — bending more
// and more threads onto one glowing point exactly as the figure's own
// counts do (accuracy 1.000 -> 0.550 -> 0.100 -> 0.000; 20 -> 15 -> 3 -> 1
// distinct answers; see parts/caustic-layout.js for the exact grouping,
// which the figure itself says is illustrative — only the counts are the
// measured ones). A green thread is still correct; a coral thread joined a
// group the certificate can prove wrong; an amber thread is wrong alone,
// where the certificate cannot see it. The gold arc round the gallery is
// the project's own AUROC, 0.995 of the circle lit; its five rail lamps
// are its five proved bounds.
//
// Local origin: the snow at the place centre. +z faces the camera and dock.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { useUi } from "../../../lib/world/store";
import { glow, lamp, mat } from "../palette";
import { buildStages, NE, PILE_LOAD } from "./parts/caustic-layout";

const TAU = Math.PI * 2;
const UP = new Vector3(0, 1, 0);

const GREEN = "#22c55e"; // still correct
const AMBER = "#f2a33e"; // wrong alone, the certificate cannot see it

// Tower profile: base mound -> foot -> tapered shaft -> gallery -> lamp
// room -> roof. Every radius stays well inside place.radius (3 m); the
// threads reach out to the ring beyond it, the way a beam of light does.
const BASE_R = 1.05, BASE_H = 0.3;
const FOOT_R = 1.0, FOOT_H = 0.14, FOOT_Y = BASE_H;
const SHAFT_Y = FOOT_Y + FOOT_H, SHAFT_H = 3.55, SHAFT_BASE_R = 0.92, SHAFT_TOP_R = 0.66;
const GALLERY_Y = SHAFT_Y + SHAFT_H, GALLERY_H = 0.16, GALLERY_R = 1.05;
const LAMP_Y = GALLERY_Y + GALLERY_H, LAMP_H = 0.62, LAMP_R = 0.56;
const ROOF_Y = LAMP_Y + LAMP_H, ROOF_H = 0.85, ROOF_R = 0.62;
const FINIAL_Y = ROOF_Y + ROOF_H + 0.1;

const shaftRAt = (y) => {
  const t = Math.min(1, Math.max(0, (y - SHAFT_Y) / SHAFT_H));
  return SHAFT_BASE_R + (SHAFT_TOP_R - SHAFT_BASE_R) * t;
};

const RING_R = 2.2; // each entity's own point, on the snow around the tower
const PILE = [0, 1.3]; // the collapse point: toward the dock, between tower and ring
const BULB_R = 0.42, BULB_Y = LAMP_Y + LAMP_H / 2; // the beacon ring inside the lamp room
const BOUND_R = 1.0, BOUND_Y = GALLERY_Y + GALLERY_H + 0.1; // the five proved-bound lamps
const BOUND_N = 5;
const RAIL_R = GALLERY_R * 0.97, RAIL_Y = GALLERY_Y + GALLERY_H + 0.09, RAIL_N = 10; // gallery railing: reads "lighthouse" in silhouette
const FLARE_MAX = 1.5; // the collapse flare's tallest rise, at full pile load

const HOLD = 2.4, MORPH = 1.1, STAGE_T = HOLD + MORPH, LOOP_T = STAGE_T * 4;
const smoothstep = (x) => x * x * (3 - 2 * x);
const AUROC = 0.995; // data/showcase.json p-caustic specs: "0.995" / "AUROC"

// Entity identity colour: a cool teal -> blue -> violet gradient by index,
// echoing the figure's own left-hand dot colours. Fixed per entity, never
// changes with the stage — only its thread's outcome colour does.
const STOP = [[0x14, 0xb8, 0xc4], [0x4f, 0x7c, 0xff], [0x8a, 0x5c, 0xff]];
function entityColor(i) {
  const f = (i / (NE - 1)) * (STOP.length - 1);
  const k = Math.min(STOP.length - 2, Math.floor(f));
  const s = f - k, a = STOP[k], b = STOP[k + 1];
  return new Color(
    (a[0] + (b[0] - a[0]) * s) / 255,
    (a[1] + (b[1] - a[1]) * s) / 255,
    (a[2] + (b[2] - a[2]) * s) / 255,
  );
}

export default function Caustic({ place }) {
  const near = useUi((s) => s.near === place.id);
  const accent = place.radiation ?? place.color;

  const stages = useMemo(() => buildStages(RING_R, PILE), []);
  const bulbAt = useMemo(() => {
    const pts = [];
    for (let i = 0; i < NE; i++) {
      const a = (i / NE) * TAU;
      pts.push([Math.sin(a) * BULB_R, BULB_Y, Math.cos(a) * BULB_R]);
    }
    return pts;
  }, []);
  const boundAt = useMemo(() => {
    const pts = [];
    for (let k = 0; k < BOUND_N; k++) {
      const a = (k / BOUND_N) * TAU + 0.3;
      pts.push([Math.sin(a) * BOUND_R, BOUND_Y, Math.cos(a) * BOUND_R]);
    }
    return pts;
  }, []);
  const railAt = useMemo(() => {
    const pts = [];
    for (let k = 0; k < RAIL_N; k++) {
      const a = (k / RAIL_N) * TAU;
      pts.push([Math.sin(a) * RAIL_R, Math.cos(a) * RAIL_R, a]);
    }
    return pts;
  }, []);

  // Materials: bodies stay near-neutral, the accent carries the windows,
  // the bands and the collapse point; the threads are unlit light, additive
  // and tinted per instance through instanceColor (see the note on glowMat
  // below for why that material carries no vertexColors flag).
  const bodyMat = useMemo(() => mat("#f3ede4", { roughness: 0.72 }), []);
  const footMat = useMemo(() => mat("#43434c", { roughness: 0.6 }), []);
  const glassMat = useMemo(() => mat("#dbeaf5", { roughness: 0.25, metalness: 0.1, opacity: 0.55 }), []);
  const bulbMat = useMemo(() => mat("#ffffff", { roughness: 0.3, metalness: 0.15 }), []);
  const bandMat = useMemo(() => lamp(accent, 0.9), [accent]);
  const gaugeMat = useMemo(() => lamp(accent, 1.15), [accent]);
  const pileMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 1, roughness: 0.4 }).clone(), [accent]);
  const pileHalo = useMemo(() => glow(accent, 0.3), [accent]);
  // The climax of the whole story: when most threads collapse onto the pile,
  // a flare rises off it so the bad state reads from as far as the good one
  // does, not just as one brighter dot at the tower's foot.
  const flareMat = useMemo(() => glow(accent, 0.5), [accent]);
  // Per-instance tint comes from instanceColor alone (three applies it to any
  // instancedMesh automatically): the material must NOT also set
  // vertexColors, or it looks for a per-vertex "color" attribute these plain
  // sphere/cylinder geometries do not have, and every instance renders black
  // (see Chain.jsx's own note on this exact gotcha).
  const glowMat = useMemo(() => new MeshBasicMaterial({
    transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }), []);

  const beamRef = useRef();
  const markerRef = useRef();
  const bulbRef = useRef();
  const boundRef = useRef();
  const railRef = useRef();
  const pileRef = useRef();
  const flareRef = useRef();
  const lampRoomRef = useRef();

  const dummy = useMemo(() => new Object3D(), []);
  const startVec = useMemo(() => new Vector3(), []);
  const endVec = useMemo(() => new Vector3(), []);
  const dirVec = useMemo(() => new Vector3(), []);
  const okC = useMemo(() => new Color(GREEN), []);
  const amberC = useMemo(() => new Color(AMBER), []);
  const coralC = useMemo(() => new Color(accent), [accent]);
  const tint = useMemo(() => new Color(), []);
  const dim = useMemo(() => new Color("#3a3a42"), []);
  const litC = useMemo(() => new Color(accent), [accent]);
  const clockRef = useRef(0);

  // Bulbs never move and never change colour: set once.
  useLayoutEffect(() => {
    const mesh = bulbRef.current;
    if (!mesh) return;
    for (let i = 0; i < NE; i++) {
      const [x, y, z] = bulbAt[i];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.085);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, entityColor(i));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bulbAt, dummy]);

  useLayoutEffect(() => {
    const mesh = boundRef.current;
    if (!mesh) return;
    for (let k = 0; k < BOUND_N; k++) {
      const [x, y, z] = boundAt[k];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.1);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [boundAt, dummy]);

  // The gallery railing: short chunky posts round the deck's rim, standing
  // in never changing (a real railing, not part of the story). Set once.
  useLayoutEffect(() => {
    const mesh = railRef.current;
    if (!mesh) return;
    for (let k = 0; k < RAIL_N; k++) {
      const [x, z, a] = railAt[k];
      dummy.position.set(x, RAIL_Y, z);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [railAt, dummy]);

  useFrame((_, dt) => {
    const speed = near ? 1.8 : 1;
    clockRef.current += dt * speed;
    const t = clockRef.current % LOOP_T;
    const stage = Math.floor(t / STAGE_T) % 4;
    const prev = (stage + 3) % 4;
    const within = t - stage * STAGE_T;
    const morphT = within < HOLD ? 0 : smoothstep((within - HOLD) / MORPH);
    const from = stages[prev], to = stages[stage];

    const beams = beamRef.current, markers = markerRef.current;
    const pulse = 0.85 + Math.sin(clockRef.current * 3) * 0.15;
    if (beams && markers) {
      for (let i = 0; i < NE; i++) {
        const a = from[i], b = to[i];
        const x = a.p[0] + (b.p[0] - a.p[0]) * morphT;
        const z = a.p[1] + (b.p[1] - a.p[1]) * morphT;
        const fromC = a.role === "coral" ? coralC : a.role === "amber" ? amberC : okC;
        const toC = b.role === "coral" ? coralC : b.role === "amber" ? amberC : okC;
        tint.copy(fromC).lerp(toC, morphT);

        startVec.set(bulbAt[i][0], bulbAt[i][1], bulbAt[i][2]);
        endVec.set(x, 0.05, z);
        dirVec.subVectors(endVec, startVec);
        const len = Math.max(0.05, dirVec.length());
        dirVec.normalize();
        dummy.position.copy(startVec).addScaledVector(dirVec, len / 2);
        dummy.quaternion.setFromUnitVectors(UP, dirVec);
        dummy.scale.set(0.065, len, 0.065);
        dummy.updateMatrix();
        beams.setMatrixAt(i, dummy.matrix);
        beams.setColorAt(i, tint);

        dummy.position.set(x, 0.045, z);
        dummy.quaternion.identity();
        dummy.scale.setScalar(0.19 * pulse);
        dummy.updateMatrix();
        markers.setMatrixAt(i, dummy.matrix);
        markers.setColorAt(i, tint);
      }
      beams.instanceMatrix.needsUpdate = true;
      if (beams.instanceColor) beams.instanceColor.needsUpdate = true;
      markers.instanceMatrix.needsUpdate = true;
      if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
    }

    // the five proved bounds: one bright lamp ticks round the rail
    const bound = boundRef.current;
    if (bound) {
      const phase = (clockRef.current * 0.6) % BOUND_N;
      for (let k = 0; k < BOUND_N; k++) {
        const d = Math.min(Math.abs(phase - k), BOUND_N - Math.abs(phase - k));
        const on = Math.max(0, 1 - d * 1.6);
        tint.copy(dim).lerp(litC, on);
        bound.setColorAt(k, tint);
      }
      if (bound.instanceColor) bound.instanceColor.needsUpdate = true;
    }

    // the collapse point: brighter and bigger the more threads land on it
    const pileLoad = (PILE_LOAD[prev] + (PILE_LOAD[stage] - PILE_LOAD[prev]) * morphT) / NE;
    pileMat.emissiveIntensity = 0.6 + pileLoad * 2.2 + (near ? 0.4 : 0) + Math.sin(clockRef.current * 4) * 0.12 * (0.3 + pileLoad);
    if (pileRef.current) pileRef.current.scale.setScalar(0.7 + pileLoad * 0.6);
    // the climax flare: a column that only rises once most threads have
    // actually collapsed (pileLoad above half), so the story's bad state is
    // as legible from the dock as the good one's spread of distinct beams.
    if (flareRef.current) {
      const rise = Math.max(0, pileLoad - 0.5) * 2; // 0 below half load, 0..1 above it
      flareRef.current.scale.set(1, FLARE_MAX * rise * (0.85 + Math.sin(clockRef.current * 5) * 0.15), 1);
      flareRef.current.visible = rise > 0.02;
    }

    if (lampRoomRef.current) lampRoomRef.current.rotation.y += dt * (near ? 1.5 : 0.7);
  });

  return (
    <group>
      {/* foundation */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow material={mat("#dbeaf5", { roughness: 0.6 })}>
        <cylinderGeometry args={[BASE_R * 0.85, BASE_R, BASE_H, 9]} />
      </mesh>
      <mesh position={[0, FOOT_Y + FOOT_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <cylinderGeometry args={[FOOT_R * 0.94, FOOT_R, FOOT_H, 9]} />
      </mesh>

      {/* the tower */}
      <mesh position={[0, SHAFT_Y + SHAFT_H / 2, 0]} castShadow receiveShadow material={bodyMat}>
        <cylinderGeometry args={[SHAFT_TOP_R, SHAFT_BASE_R, SHAFT_H, 8]} />
      </mesh>
      <mesh position={[0, SHAFT_Y + SHAFT_H * 0.32, 0]} castShadow material={bandMat}>
        <cylinderGeometry args={[shaftRAt(SHAFT_Y + SHAFT_H * 0.32) + 0.015, shaftRAt(SHAFT_Y + SHAFT_H * 0.32) + 0.015, 0.22, 8]} />
      </mesh>
      <mesh position={[0, SHAFT_Y + SHAFT_H * 0.68, 0]} castShadow material={bandMat}>
        <cylinderGeometry args={[shaftRAt(SHAFT_Y + SHAFT_H * 0.68) + 0.015, shaftRAt(SHAFT_Y + SHAFT_H * 0.68) + 0.015, 0.22, 8]} />
      </mesh>
      {[0.12, 0.88].map((f) => {
        const y = SHAFT_Y + SHAFT_H * f;
        const r = shaftRAt(y);
        return (
          <mesh key={f} position={[Math.sin(0.05) * r, y, Math.cos(0.05) * r]} rotation={[0, 0.05, 0]} material={bandMat}>
            <boxGeometry args={[0.16, 0.46, 0.05]} />
          </mesh>
        );
      })}

      {/* gallery, with the project's own AUROC as an arc of the circle */}
      <mesh position={[0, GALLERY_Y + GALLERY_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <cylinderGeometry args={[GALLERY_R, GALLERY_R * 0.92, GALLERY_H, 10]} />
      </mesh>
      <mesh position={[0, GALLERY_Y + GALLERY_H + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={gaugeMat}>
        <ringGeometry args={[0.6, 0.92, 40, 1, 0, AUROC * TAU]} />
      </mesh>
      <instancedMesh ref={boundRef} args={[undefined, glowMat, BOUND_N]}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <instancedMesh ref={railRef} args={[undefined, footMat, RAIL_N]} castShadow>
        <boxGeometry args={[0.05, 0.16, 0.05]} />
      </instancedMesh>

      {/* lamp room: a slowly turning glass drum around the fixed beacon ring */}
      <group ref={lampRoomRef} position={[0, LAMP_Y + LAMP_H / 2, 0]}>
        <mesh castShadow material={glassMat}>
          <cylinderGeometry args={[LAMP_R, LAMP_R, LAMP_H, 12, 1, true]} />
        </mesh>
      </group>
      <instancedMesh ref={bulbRef} args={[undefined, bulbMat, NE]}>
        <sphereGeometry args={[1, 8, 7]} />
      </instancedMesh>

      {/* roof */}
      <mesh position={[0, ROOF_Y + ROOF_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <coneGeometry args={[ROOF_R, ROOF_H, 10]} />
      </mesh>
      <mesh position={[0, FINIAL_Y, 0]} castShadow material={pileMat}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>

      {/* the 20 threads and where they currently land */}
      <instancedMesh ref={beamRef} args={[undefined, glowMat, NE]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 5, 1, true]} />
      </instancedMesh>
      <instancedMesh ref={markerRef} args={[undefined, glowMat, NE]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>

      {/* the collapse point itself: nobody's true answer, lit brighter the
          more threads currently land on it */}
      <group position={[PILE[0], 0, PILE[1]]}>
        <mesh ref={pileRef} position={[0, 0.16, 0]} castShadow material={pileMat}>
          <sphereGeometry args={[0.28, 12, 8, 0, TAU, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, 0.14, 0]} material={pileHalo} scale={1.6}>
          <sphereGeometry args={[0.28, 10, 6, 0, TAU, 0, Math.PI / 2]} />
        </mesh>
        <mesh ref={flareRef} position={[0, 0.16, 0]} material={flareMat} visible={false} frustumCulled={false}>
          <coneGeometry args={[0.16, 1, 10, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}
