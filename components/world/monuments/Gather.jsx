"use client";

// NVIDIA/NeMo-Relay #481's story (the "gather" figure), grown out of the
// ice island it floats on in the NVIDIA moat (components/world/land/Moat.jsx).
//
// The fix (data/showcase.json, this place's figure.desc): the cache key for a
// request's learning profile included the first user message, so one
// unchanging scaffold (model + system prompt + tool schema) fragmented into a
// fresh profile per task and no profile ever grew. Keying on the scaffold
// alone gathers every request into one profile instead.
//
// Retelling, all in ice: a forked ice spire, lit NVIDIA green from inside.
// Requests fall onto its crown and fork. Left, each one pops a small one-off
// frozen bubble (coloured by its message) that holds a single observation
// and melts: a scatter that never grows. Right, the satellite (the differing
// message) fades out in flight and every packet joins one growing globe of
// shells, ringing each time the globe fills, then loops. Faster when `near`.
//
// Local origin: the ice island's snow top; +z faces the camera and the dock.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, MeshBasicMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from "three";
import { C, glow, mat } from "../palette";

// the figure's own palette (teerthsharma.github.io fig.js, the "gather" figure):
// a violet scaffold and four hues for the first-user-message satellite.
const V5 = "#a66cf0", V7 = "#6b35c4";
const MSG = ["#d96a06", "#0b93ab", "#2456dc", "#d9376e"];
const HUES = MSG.length;

// The spire grows from BASE up to FORK and on to its crown (SPOUT_TOP), where
// the requests arrive; two ice arms fork down and out to the two outcomes.
const BASE = [0, 0, -0.9];
const FORK = [0, 2.15, -0.8];
const SPOUT_TOP = [0, 3.9, -1.1];
const LEFT_BASE = [-1.9, 1.15, 0.5]; // the scatter of one-off profiles
const RIGHT_BASE = [1.85, 1.95, 0.45]; // the one growing profile

const SLOTS = 6; // left: independent profile slots, each cycles pop -> hold -> melt
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

// a static prism between two fixed points (the layout never moves).
function beam(from, to) {
  const a = new Vector3(...from), b = new Vector3(...to);
  return {
    mid: a.clone().lerp(b, 0.5),
    quat: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize()),
    length: a.distanceTo(b),
  };
}
const TRUNK = beam(BASE, FORK);
const SPOUT = beam(FORK, SPOUT_TOP);
const ARM_L = beam(FORK, LEFT_BASE);
const ARM_R = beam(FORK, RIGHT_BASE);

const sphereGeo = new SphereGeometry(1, 10, 8);
const satGeo = new SphereGeometry(1, 8, 6); // shared by satellites and globe dots
const shellGeo = SHELL_R.map((r) => new IcosahedronGeometry(r * GLOBE_R, 1));
const crystalGeo = new IcosahedronGeometry(1, 0);

const iceMat = mat(C.ice, { roughness: 0.3 });
const deepMat = mat(C.deepIce, { roughness: 0.35 });
const shellMat = new MeshBasicMaterial({ color: V5, wireframe: true, transparent: true, opacity: 0.55, toneMapped: false });
const glassMat = mat(V5, { roughness: 0.1, metalness: 0, opacity: 0.22 });
const coreMat = mat(V5, { emissive: V5, emissiveIntensity: 0.7, roughness: 0.35 });
const satMat = mat("#ffffff", { roughness: 0.4 });
const orbMat = mat("#ffffff", { roughness: 0.16, metalness: 0.05, opacity: 0.86 });
const dotMat = mat("#ffffff", { roughness: 0.35, metalness: 0.1 });

export default function Gather({ place, near }) {
  const coreRef = useRef(); // packet cores: 4 falling + 4 left-flight + 4 right-flight
  const satRef = useRef(); // their satellites (the first user message)
  const orbRef = useRef(); // left: 6 one-observation profiles
  const dotRef = useRef(); // right: the one profile's observations, up to DOT_CAP
  const shellA = useRef(), shellB = useRef(), shellC = useRef();
  const shellRefs = useMemo(() => [shellA, shellB, shellC], [shellA, shellB, shellC]);
  const ringRef = useRef();
  const glowRef = useRef();

  const dummy = useMemo(() => new Object3D(), []);
  // the spire: ice lit green from within, the one accent this place owns
  const spireMat = useMemo(() => mat(place.color, { roughness: 0.3, emissive: place.color, emissiveIntensity: 0.35 }), [place.color]);
  const ringMat = useMemo(() => mat(V7, { emissive: V7, emissiveIntensity: 2, roughness: 0.3, opacity: 0.5 }).clone(), []);
  const glowMat = useMemo(() => glow(V5, 0.25).clone(), []);

  // scattered at different distances and heights, like a fan of rays landing
  // wherever each key happens to hash - never a tidy ring.
  const orbOffset = useMemo(
    () => Array.from({ length: SLOTS }, (_, j) => {
      const a = (j / SLOTS) * Math.PI * 2 + j * 0.9;
      const r = 0.4 + 0.3 * ((j * 1.618) % 1);
      return [Math.cos(a) * r, ((j * 0.7) % 1) * 0.8 - 0.1, Math.sin(a) * r * 0.8 - r * 0.3];
    }),
    [],
  );
  const orbScale = useMemo(() => Array.from({ length: SLOTS }, (_, j) => 0.75 + 0.5 * ((j * 0.618) % 1)), []);
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
        // the source: the scaffold falls past the crown and down the spire's
        // face to the fork, its message circling it
        let k = frac(t / FALL_T - i / HUES);
        let x = SPOUT_TOP[0] + Math.sin(t * 2 + i) * 0.05;
        let y = SPOUT_TOP[1] + 1.2 + (FORK[1] - SPOUT_TOP[1] - 1.2) * k;
        let z = SPOUT_TOP[2] + (FORK[2] - SPOUT_TOP[2]) * k + 0.34;
        const grow = Math.min(1, k * 5);
        placeAt(dummy, core, i, x, y, z, 0.17 * grow);
        placeAt(dummy, sat, i, x + Math.cos(t * 4 + i) * 0.3, y, z + Math.sin(t * 4 + i) * 0.3, 0.1 * grow);

        // left: keyed on everything, so it keeps the message's colour
        k = frac(t / FLIGHT_T - i / HUES - 0.5);
        x = FORK[0] + (LEFT_BASE[0] - FORK[0]) * k;
        y = FORK[1] + (LEFT_BASE[1] - FORK[1]) * k + Math.sin(k * Math.PI) * 0.45;
        z = FORK[2] + (LEFT_BASE[2] - FORK[2]) * k;
        placeAt(dummy, core, HUES + i, x, y, z, 0.14);
        placeAt(dummy, sat, HUES + i, x, y + 0.14, z, 0.09);

        // right: the satellite fades - the message drops out of the key
        x = FORK[0] + (RIGHT_BASE[0] - FORK[0]) * k;
        y = FORK[1] + (RIGHT_BASE[1] - FORK[1]) * k + Math.sin(k * Math.PI) * 0.45;
        z = FORK[2] + (RIGHT_BASE[2] - FORK[2]) * k;
        placeAt(dummy, core, 2 * HUES + i, x, y, z, 0.14);
        placeAt(dummy, sat, 2 * HUES + i, x, y + 0.14, z, 0.09 * (1 - k));
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
        placeAt(dummy, orb, j, LEFT_BASE[0] + ox, LEFT_BASE[1] + oy + Math.sin(t * 1.5 + j) * 0.03, LEFT_BASE[2] + oz, s * 0.34 * orbScale[j]);
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
        placeAt(dummy, dot, d, RIGHT_BASE[0] + slot.x, RIGHT_BASE[1] + slot.y, RIGHT_BASE[2] + slot.z, s * 0.13);
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
      {/* the spire: grows from the ice, forks, and rises on to its crown */}
      <mesh position={[BASE[0], 0.25, BASE[2]]} scale={[0.75, 0.55, 0.7]} castShadow receiveShadow material={deepMat} geometry={crystalGeo} />
      <mesh position={TRUNK.mid} quaternion={TRUNK.quat} castShadow material={spireMat}>
        <cylinderGeometry args={[0.22, 0.42, TRUNK.length, 6]} />
      </mesh>
      <mesh position={SPOUT.mid} quaternion={SPOUT.quat} castShadow material={spireMat}>
        <cylinderGeometry args={[0.12, 0.24, SPOUT.length, 6]} />
      </mesh>
      <mesh position={SPOUT_TOP} scale={[0.26, 0.4, 0.26]} castShadow material={spireMat} geometry={crystalGeo} />
      <mesh position={FORK} scale={0.36} castShadow material={spireMat} geometry={crystalGeo} />
      <mesh position={ARM_L.mid} quaternion={ARM_L.quat} castShadow material={iceMat}>
        <cylinderGeometry args={[0.13, 0.2, ARM_L.length, 6]} />
      </mesh>
      <mesh position={ARM_R.mid} quaternion={ARM_R.quat} castShadow material={iceMat}>
        <cylinderGeometry args={[0.13, 0.2, ARM_R.length, 6]} />
      </mesh>

      {/* left: a scatter of one-off profiles on an ice stalagmite, never grows */}
      <mesh position={[LEFT_BASE[0], (LEFT_BASE[1] - 0.2) / 2, LEFT_BASE[2]]} castShadow receiveShadow material={iceMat}>
        <cylinderGeometry args={[0.12, 0.42, LEFT_BASE[1] - 0.2, 6]} />
      </mesh>
      <instancedMesh ref={orbRef} args={[sphereGeo, orbMat, SLOTS]} />

      {/* right: one profile, a globe of shells that fills and rings, held up
          by its own ice stalagmite */}
      <mesh position={[RIGHT_BASE[0], (RIGHT_BASE[1] - GLOBE_R) / 2, RIGHT_BASE[2]]} castShadow receiveShadow material={iceMat}>
        <cylinderGeometry args={[0.14, 0.44, RIGHT_BASE[1] - GLOBE_R, 6]} />
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
        <torusGeometry args={[GLOBE_R + 0.12, 0.07, 8, 24]} />
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
