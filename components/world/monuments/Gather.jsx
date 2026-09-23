"use client";

// Sculpture for the "gather" figure: NVIDIA/NeMo-Relay #481 (place id pr-nemo-relay-481).
//
// The fix (data/showcase.json, this place's figure.desc): the cache key for a
// request's learning profile included the first user message, so one
// unchanging scaffold (model + system prompt + tool schema) fragmented into a
// fresh profile per task and no profile ever grew. Keying on the scaffold
// alone gathers every request into one profile instead.
//
// Retelling: packets fall from a relay spout and fork. Left, each one pops a
// small one-off glass profile (coloured by its message) that holds a single
// observation and fades - a scatter that never grows. Right, the satellite
// (the differing message) fades out in flight and every packet joins one
// growing globe of shells, ringing each time a shell fills, then loops.
// Faster and brighter when `near`.
//
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, MeshBasicMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from "three";
import { glow, mat } from "../palette";

// the figure's own palette (teerthsharma.github.io fig.js, the "gather" figure):
// a violet scaffold and four hues for the first-user-message satellite.
const V5 = "#a66cf0", V7 = "#6b35c4";
const MSG = ["#d96a06", "#0b93ab", "#2456dc", "#d9376e"];
const HUES = MSG.length;

// static layout, in plinth-top local space (footprint stays inside 3.4m).
// BASE grounds the relay on the plinth; it trunks up to FORK, still rising
// on to SPOUT_TOP (where requests keep arriving from), and forks down and
// out to the two outcomes.
const BASE = [0, 0.05, -1];
const FORK = [0, 2.15, -0.85];
const SPOUT_TOP = [0, 4.2, -1.3];
const LEFT_BASE = [-2.0, 1.05, 0.6]; // the scatter of one-off profiles
const RIGHT_BASE = [1.95, 1.95, 0.55]; // the one growing profile

const SLOTS = 6; // left: independent profile slots, each cycles pop -> hold -> fade
const SHELL_N = [8, 14, 20]; // right: dots per shell, inner to outer
const SHELL_R = [0.34, 0.66, 1]; // shell radius as a fraction of GLOBE_R
const SHELL_START = [0, SHELL_N[0], SHELL_N[0] + SHELL_N[1]];
const DOT_CAP = SHELL_N[0] + SHELL_N[1] + SHELL_N[2];
const GLOBE_R = 0.95;

const FALL_T = 0.9, FLIGHT_T = 0.7, SLOT_CYCLE = 2.1, GLOBE_CYCLE = 8;
const frac = (x) => x - Math.floor(x);

// a Fibonacci point set on the unit sphere, one per shell, so the globe's
// dots read as a real packed lattice rather than a grid.
function fibonacciSphere(n, seed) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = ga * i + seed;
    pts.push([r * Math.cos(th), y, r * Math.sin(th)]);
  }
  return pts;
}

// a static cylinder between two fixed points, computed once (the layout
// never moves, so this costs nothing per frame).
function useBeam(from, to) {
  return useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to);
    const length = a.distanceTo(b);
    const mid = a.clone().lerp(b, 0.5);
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return { mid, quat, length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function Gather({ place, near }) {
  const coreRef = useRef(); // packet cores: 4 spout + 4 left-flight + 4 right-flight
  const satRef = useRef(); // their satellites (the first user message)
  const orbRef = useRef(); // left: 6 one-observation profiles
  const dotRef = useRef(); // right: the one profile's observations, up to DOT_CAP
  const shellA = useRef(), shellB = useRef(), shellC = useRef();
  const shellRefs = useMemo(() => [shellA, shellB, shellC], [shellA, shellB, shellC]);
  const ringRef = useRef();
  const glowRef = useRef();

  const dummy = useMemo(() => new Object3D(), []);
  const trunkBeam = useBeam(BASE, FORK);
  const spoutBeam = useBeam(FORK, SPOUT_TOP);
  const leftBeam = useBeam(FORK, LEFT_BASE);
  const rightBeam = useBeam(FORK, RIGHT_BASE);

  const sphereGeo = useMemo(() => new SphereGeometry(1, 10, 8), []);
  const satGeo = useMemo(() => new SphereGeometry(1, 8, 6), []); // shared by satellites and globe dots
  const shellGeo = useMemo(() => SHELL_R.map((r) => new IcosahedronGeometry(r * GLOBE_R, 1)), []);
  const shellMat = useMemo(() => new MeshBasicMaterial({ color: V5, wireframe: true, transparent: true, opacity: 0.55, toneMapped: false }), []);
  const glassMat = useMemo(() => mat(V5, { roughness: 0.1, metalness: 0, opacity: 0.22 }), []);

  const coreMat = useMemo(() => mat(V5, { emissive: V5, emissiveIntensity: 0.7, roughness: 0.35 }), []);
  const satMat = useMemo(() => mat("#ffffff", { roughness: 0.4 }), []);
  const orbMat = useMemo(() => mat("#ffffff", { roughness: 0.16, metalness: 0.05, opacity: 0.86 }), []);
  const dotMat = useMemo(() => mat("#ffffff", { roughness: 0.35, metalness: 0.1 }), []);
  const ringMat = useMemo(() => mat(V7, { emissive: V7, emissiveIntensity: 2, roughness: 0.3, opacity: 0.5 }).clone(), []);
  const glowMat = useMemo(() => glow(V5, 0.25).clone(), []);

  // scattered at different distances and heights, like a fan of rays landing
  // wherever each key happens to hash - never a tidy ring.
  const orbOffset = useMemo(
    () => Array.from({ length: SLOTS }, (_, j) => {
      const a = (j / SLOTS) * Math.PI * 2 + j * 0.9;
      const r = 0.35 + 0.24 * ((j * 1.618) % 1);
      return [Math.cos(a) * r, ((j * 0.7) % 1) * 0.7 - 0.15, Math.sin(a) * r * 0.8 - r * 0.3];
    }),
    [],
  );
  const orbScale = useMemo(() => Array.from({ length: SLOTS }, (_, j) => 0.7 + 0.5 * ((j * 0.618) % 1)), []);
  const dotSlot = useMemo(() => {
    const out = [];
    SHELL_N.forEach((n, s) => {
      for (const [x, y, z] of fibonacciSphere(n, s * 0.8)) {
        out.push({ x: x * SHELL_R[s] * GLOBE_R, y: y * SHELL_R[s] * GLOBE_R, z: z * SHELL_R[s] * GLOBE_R, shell: s });
      }
    });
    return out;
  }, []);

  // colours are fixed per instance: set once, then only matrices move.
  useLayoutEffect(() => {
    if (satRef.current) {
      for (let i = 0; i < HUES; i++) {
        const c = new Color(MSG[i]);
        satRef.current.setColorAt(i, c);
        satRef.current.setColorAt(HUES + i, c);
        satRef.current.setColorAt(2 * HUES + i, c);
      }
      satRef.current.instanceColor.needsUpdate = true;
    }
    if (orbRef.current) {
      for (let j = 0; j < SLOTS; j++) orbRef.current.setColorAt(j, new Color(MSG[j % HUES]));
      orbRef.current.instanceColor.needsUpdate = true;
    }
    if (dotRef.current) {
      const v5 = new Color(V5), v7 = new Color(V7);
      dotSlot.forEach((s, d) => dotRef.current.setColorAt(d, v5.clone().lerp(v7, (s.shell / 2) * 0.5)));
      dotRef.current.instanceColor.needsUpdate = true;
    }
  }, [dotSlot]);

  useFrame((state) => {
    const speed = near ? 1.6 : 1;
    const t = state.clock.elapsedTime * speed;
    const core = coreRef.current, sat = satRef.current;

    if (core && sat) {
      for (let i = 0; i < HUES; i++) {
        // the source: the scaffold falls with its message circling it
        let k = frac(t / FALL_T - i / HUES);
        let x = SPOUT_TOP[0] + (FORK[0] - SPOUT_TOP[0]) * k + Math.sin(t * 2 + i) * 0.05;
        let y = SPOUT_TOP[1] + (FORK[1] - SPOUT_TOP[1]) * k;
        let z = SPOUT_TOP[2] + (FORK[2] - SPOUT_TOP[2]) * k;
        placeAt(dummy, core, i, x, y, z, 0.13);
        placeAt(dummy, sat, i, x + Math.cos(t * 4 + i) * 0.24, y, z + Math.sin(t * 4 + i) * 0.24, 0.07);

        // left: keyed on everything, so it keeps the message's colour
        k = frac(t / FLIGHT_T - i / HUES - 0.5);
        x = FORK[0] + (LEFT_BASE[0] - FORK[0]) * k;
        y = FORK[1] + (LEFT_BASE[1] - FORK[1]) * k + Math.sin(k * Math.PI) * 0.35;
        z = FORK[2] + (LEFT_BASE[2] - FORK[2]) * k;
        placeAt(dummy, core, HUES + i, x, y, z, 0.11);
        placeAt(dummy, sat, HUES + i, x, y + 0.1, z, 0.06);

        // right: the satellite fades - the message drops out of the key
        x = FORK[0] + (RIGHT_BASE[0] - FORK[0]) * k;
        y = FORK[1] + (RIGHT_BASE[1] - FORK[1]) * k + Math.sin(k * Math.PI) * 0.35;
        z = FORK[2] + (RIGHT_BASE[2] - FORK[2]) * k;
        placeAt(dummy, core, 2 * HUES + i, x, y, z, 0.11);
        placeAt(dummy, sat, 2 * HUES + i, x, y + 0.1, z, 0.06 * (1 - k));
      }
      core.instanceMatrix.needsUpdate = true;
      sat.instanceMatrix.needsUpdate = true;
    }

    const orb = orbRef.current;
    if (orb) {
      for (let j = 0; j < SLOTS; j++) {
        const k = frac(t / SLOT_CYCLE - j * 0.617);
        let s = 0;
        if (k < 0.12) s = k / 0.12;
        else if (k < 0.62) s = 1;
        else if (k < 0.85) s = 1 - (k - 0.62) / 0.23;
        const [ox, oy, oz] = orbOffset[j];
        placeAt(dummy, orb, j, LEFT_BASE[0] + ox, LEFT_BASE[1] + oy + Math.sin(t * 1.5 + j) * 0.03, LEFT_BASE[2] + oz, s * 0.3 * orbScale[j]);
      }
      orb.instanceMatrix.needsUpdate = true;
    }

    const raw = frac(t / GLOBE_CYCLE); // the one profile's fullness, this loop
    const dot = dotRef.current;
    if (dot) {
      const landed = raw * DOT_CAP;
      for (let d = 0; d < DOT_CAP; d++) {
        const since = landed - d;
        const s = since < 0 ? 0 : since < 1 ? 0.55 + 0.45 * since : 1;
        const slot = dotSlot[d];
        placeAt(dummy, dot, d, RIGHT_BASE[0] + slot.x, RIGHT_BASE[1] + slot.y, RIGHT_BASE[2] + slot.z, s * 0.12);
      }
      dot.instanceMatrix.needsUpdate = true;
    }

    shellRefs.forEach((ref, s) => {
      if (!ref.current) return;
      const start = SHELL_START[s] / DOT_CAP;
      ref.current.scale.setScalar(Math.min(1, Math.max(0, (raw - start) / 0.05)));
    });

    const toWrap = Math.min(raw, 1 - raw);
    const pulse = toWrap < 0.05 ? 1 - toWrap / 0.05 : 0;
    if (ringRef.current) ringRef.current.scale.setScalar(0.9 + 0.5 * pulse);
    ringMat.opacity = 0.55 * pulse;
    if (glowRef.current) glowRef.current.scale.setScalar(0.5 + 0.55 * raw);
    glowMat.opacity = (0.14 + 0.22 * raw) * (near ? 1.5 : 1);
  });

  return (
    <group>
      {/* the relay: grounded on the plinth, trunking up to the fork, still
          rising on as the spout the requests fall from */}
      <mesh position={[BASE[0], BASE[1] - 0.05, BASE[2]]} castShadow receiveShadow material={mat("#43434c", { roughness: 0.6 })}>
        <cylinderGeometry args={[0.34, 0.4, 0.22, 20]} />
      </mesh>
      <mesh position={trunkBeam.mid} quaternion={trunkBeam.quat} castShadow material={mat(place.color, { roughness: 0.5 })}>
        <cylinderGeometry args={[0.24, 0.3, trunkBeam.length, 8]} />
      </mesh>
      <mesh position={spoutBeam.mid} quaternion={spoutBeam.quat} castShadow material={mat(place.color, { roughness: 0.5 })}>
        <cylinderGeometry args={[0.19, 0.24, spoutBeam.length, 8]} />
      </mesh>
      <mesh position={SPOUT_TOP} castShadow material={mat(place.color, { roughness: 0.5 })}>
        <sphereGeometry args={[0.32, 10, 8]} />
      </mesh>
      <mesh position={FORK} castShadow material={mat(place.color, { roughness: 0.5 })}>
        <sphereGeometry args={[0.3, 10, 8]} />
      </mesh>
      <mesh position={leftBeam.mid} quaternion={leftBeam.quat} castShadow material={mat("#43434c", { roughness: 0.65 })}>
        <cylinderGeometry args={[0.13, 0.17, leftBeam.length, 6]} />
      </mesh>
      <mesh position={rightBeam.mid} quaternion={rightBeam.quat} castShadow material={mat("#43434c", { roughness: 0.65 })}>
        <cylinderGeometry args={[0.13, 0.17, rightBeam.length, 6]} />
      </mesh>

      {/* left: a scatter of one-off profiles, never grows - a thin ray to
          each, since every key hashes to its own spot */}
      <mesh position={[LEFT_BASE[0], (LEFT_BASE[1] - 0.45) / 2, LEFT_BASE[2]]} castShadow receiveShadow material={mat("#43434c", { roughness: 0.65 })}>
        <cylinderGeometry args={[0.17, 0.24, LEFT_BASE[1] - 0.45, 12]} />
      </mesh>
      <mesh position={[LEFT_BASE[0], LEFT_BASE[1] - 0.45, LEFT_BASE[2]]} castShadow receiveShadow material={mat("#43434c", { roughness: 0.7 })}>
        <cylinderGeometry args={[0.72, 0.8, 0.2, 24]} />
      </mesh>
      {orbOffset.map(([ox, oy, oz], j) => (
        <Line
          key={j}
          points={[FORK, [LEFT_BASE[0] + ox, LEFT_BASE[1] + oy, LEFT_BASE[2] + oz]]}
          color={MSG[j % HUES]}
          lineWidth={1}
          transparent
          opacity={0.35}
        />
      ))}
      <instancedMesh ref={orbRef} args={[sphereGeo, orbMat, SLOTS]} />

      {/* right: one profile, a globe of shells that fills and rings - the
          glass shell stays visible at every fill level, so it always reads
          as one object even early in the loop */}
      <mesh position={[RIGHT_BASE[0], (RIGHT_BASE[1] - GLOBE_R - 0.3) / 2, RIGHT_BASE[2]]} castShadow receiveShadow material={mat("#43434c", { roughness: 0.65 })}>
        <cylinderGeometry args={[0.19, 0.26, RIGHT_BASE[1] - GLOBE_R - 0.3, 12]} />
      </mesh>
      <mesh position={[RIGHT_BASE[0], RIGHT_BASE[1] - GLOBE_R - 0.3, RIGHT_BASE[2]]} castShadow receiveShadow material={mat("#43434c", { roughness: 0.7 })}>
        <cylinderGeometry args={[0.56, 0.64, 0.2, 24]} />
      </mesh>
      <mesh ref={glowRef} position={RIGHT_BASE} material={glowMat}>
        <sphereGeometry args={[GLOBE_R * 1.6, 12, 10]} />
      </mesh>
      <mesh position={RIGHT_BASE} material={glassMat}>
        <sphereGeometry args={[GLOBE_R, 20, 16]} />
      </mesh>
      {shellGeo.map((geo, s) => (
        <mesh key={s} ref={shellRefs[s]} position={RIGHT_BASE} geometry={geo} material={shellMat} />
      ))}
      <instancedMesh ref={dotRef} args={[satGeo, dotMat, DOT_CAP]} castShadow />
      <mesh ref={ringRef} position={RIGHT_BASE} rotation={[Math.PI / 2, 0, 0]} material={ringMat}>
        <torusGeometry args={[GLOBE_R + 0.1, 0.045, 8, 24]} />
      </mesh>

      {/* the stream: packets and their first-user-message satellite */}
      <instancedMesh ref={coreRef} args={[sphereGeo, coreMat, HUES * 3]} />
      <instancedMesh ref={satRef} args={[satGeo, satMat, HUES * 3]} />
    </group>
  );
}

function placeAt(dummy, mesh, index, x, y, z, scale) {
  if (!mesh) return;
  dummy.position.set(x, y, z);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}
