"use client";

// Sculpture for the "chain" figure: facebook/pyrefly #4180 (place id
// pr-pyrefly-4180). Retells the landing figure in 3D (data/showcase.json,
// figure.desc; teerthsharma.github.io/fig.js, "chain — pyrefly-4180"):
//
// The reproducer from the pull request, built as it is built: 208
// two-module strongly connected components, chained so each depends on the
// one before, wound into a tapering coil that descends to commit at its
// foot. One export change (blue -> mint) enters at the top and propagates
// down the coil. A violet hoop marks where the 100-epoch incremental budget
// runs out (labels[1]); the change spends the budget reaching it and a
// membrane closes across the hoop -- the door shuts. Forced invalidation
// then produces another export change (coral) on the far side, which runs
// the rest of the coil into commit with that change still pending
// (labels[2]). Arrival bursts -- Transaction has uncommitted changes
// (labels[3]) -- a swell runs back up every still-pending component, and a
// ring closes around the burst and holds it: pinned with should_panic so it
// cannot return quietly (labels[4]). Then everything eases back to blue and
// the next change enters. Loops continuously; faster and brighter near.
//
// Every bead position is baked once (parts/chain-layout.js, ported from the
// figure's own arc-length coil); only instance colour and a handful of
// small meshes move per frame.
//
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { near }.

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, CylinderGeometry, Object3D, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { glow, mat } from "../palette";
import { CHAIN, CHAIN_COMMIT, CHAIN_DOOR, CHAIN_DOOR_POINT, CHAIN_DOOR_TANGENT, CHAIN_N, chainFrontPoint } from "./parts/chain-layout";

// fig.js's own tokens for this figure (chain(), token() calls) -- the same
// hexes the landing site paints, kept exact rather than reached for place.color.
const BLUE = "#2456dc"; // before / idle
const MINT = "#0b93ab"; // the first change, once it has passed
const CORAL = "#d9376e"; // the second change, on the far side of the door
const CORAL_DARK = "#a0183f"; // the should_panic ring: it catches the coral failure
const VIOLET = "#a66cf0"; // the door: the incremental budget's edge

const BEAD_R = 0.09;
const BOND_R = 0.052; // the short, thick link binding each component's own two beads
const LINK_R = 0.034; // the thin link joining one component to the next

const BEADS_N = CHAIN_N * 2;
const LINKS_N = CHAIN_N; // N-1 component-to-component + 1 final link into commit

const BEAD_GEO = new SphereGeometry(BEAD_R, 8, 6);
const STICK_GEO = new CylinderGeometry(1, 1, 1, 6, 1); // unit cylinder, scaled per instance

const CYCLE_FAR = 9.5; // s per loop, far from the plinth
const CYCLE_NEAR = 6.2; // faster once the seal is close
const EASE_RATE = 4; // shared near/far blend rate: k = 1 - exp(-EASE_RATE*dt)

// Phase boundaries, as a fraction of one cycle.
const WAVE1_END = 0.40; // the first change crosses components 0..DOOR
const SHUT_END = 0.46; // the door finishes shutting
const WAVE2_END = 0.68; // the second change crosses DOOR..N, reaching commit
const BURST_END = 0.72; // the burst and the should_panic ring finish rising
const HOLD_END = 0.86; // held, pinned -- then eases back to blue

const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
const easeClamp = (u) => ease(clamp01(u));

// Scratch, reused every frame -- never allocated inside useFrame.
const dummy = new Object3D();
const scratch = new Color();
const blueColor = new Color(BLUE);
const whiteColor = new Color("#ffffff");
const front3 = [0, 0, 0];

const UP = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);
const qTmp = new Quaternion();
const vTmp = new Vector3();

// Places a unit stick between two points, radius `r`: used once to bake the
// bond and link instances, which never move again.
function placeStick(p0, p1, r) {
  vTmp.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  const len = Math.max(0.001, vTmp.length());
  vTmp.normalize();
  qTmp.setFromUnitVectors(UP, vTmp);
  dummy.position.set((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
  dummy.quaternion.copy(qTmp);
  dummy.scale.set(r, len, r);
  dummy.updateMatrix();
}

const doorTangent = new Vector3(...CHAIN_DOOR_TANGENT);
const doorQuat = new Quaternion().setFromUnitVectors(AXIS_Z, doorTangent);

export default function Chain({ near }) {
  const beadsRef = useRef(null);
  const bondsRef = useRef(null);
  const linksRef = useRef(null);
  const hoopRef = useRef(null);
  const membraneRef = useRef(null);
  const burstRef = useRef(null);
  const burstGlowRef = useRef(null);
  const ringRef = useRef(null);
  const marker1Ref = useRef(null);
  const marker1GlowRef = useRef(null);
  const marker2Ref = useRef(null);
  const marker2GlowRef = useRef(null);

  const hoopMat = useRef(null);
  const membraneMat = useRef(null);
  const burstMat = useRef(null);
  const ringMat = useRef(null);
  const marker1Mat = useRef(null);
  const marker2Mat = useRef(null);
  if (!hoopMat.current) hoopMat.current = mat(VIOLET, { roughness: 0.35, emissive: VIOLET, emissiveIntensity: 0.45 }).clone();
  if (!membraneMat.current) membraneMat.current = mat(VIOLET, { roughness: 0.15, metalness: 0.1, emissive: VIOLET, emissiveIntensity: 0.75, opacity: 0.7 }).clone();
  if (!burstMat.current) burstMat.current = mat("#ffffff", { roughness: 0.2, emissive: "#ffffff", emissiveIntensity: 1 }).clone();
  if (!ringMat.current) ringMat.current = mat(CORAL_DARK, { roughness: 0.3, emissive: CORAL_DARK, emissiveIntensity: 0.8 }).clone();
  if (!marker1Mat.current) marker1Mat.current = mat(MINT, { roughness: 0.25, emissive: MINT, emissiveIntensity: 1.4 }).clone();
  if (!marker2Mat.current) marker2Mat.current = mat(CORAL, { roughness: 0.25, emissive: CORAL, emissiveIntensity: 1.4 }).clone();

  const nearK = useRef(0);
  const phase = useRef(0);

  // Bake every bead, bond and link position once: the coil never moves,
  // only its colour does. Also seat the hoop and membrane on the door.
  useEffect(() => {
    const beads = beadsRef.current, bonds = bondsRef.current, links = linksRef.current;
    if (!beads || !bonds || !links) return;
    for (let i = 0; i < CHAIN_N; i++) {
      const { a, b } = CHAIN[i];
      dummy.position.set(a[0], a[1], a[2]);
      dummy.quaternion.identity();
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      beads.setMatrixAt(i * 2, dummy.matrix);
      dummy.position.set(b[0], b[1], b[2]);
      dummy.updateMatrix();
      beads.setMatrixAt(i * 2 + 1, dummy.matrix);

      placeStick(a, b, BOND_R);
      bonds.setMatrixAt(i, dummy.matrix);

      const next = i < CHAIN_N - 1 ? CHAIN[i + 1].a : CHAIN_COMMIT;
      placeStick(b, next, LINK_R);
      links.setMatrixAt(i, dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;
    bonds.instanceMatrix.needsUpdate = true;
    links.instanceMatrix.needsUpdate = true;

    if (hoopRef.current) {
      hoopRef.current.position.set(...CHAIN_DOOR_POINT);
      hoopRef.current.quaternion.copy(doorQuat);
    }
    if (membraneRef.current) {
      membraneRef.current.position.set(...CHAIN_DOOR_POINT);
      membraneRef.current.quaternion.copy(doorQuat);
    }
  }, []);

  useFrame((_, dt) => {
    nearK.current += ((near ? 1 : 0) - nearK.current) * (1 - Math.exp(-EASE_RATE * dt));
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + dt / cycle) % 1;
    const p = phase.current;
    const glowMul = 1 + 0.6 * nearK.current;

    const wave1Front = p < WAVE1_END ? CHAIN_DOOR * easeClamp(p / WAVE1_END) : CHAIN_DOOR;
    const doorShut = p < WAVE1_END ? 0
      : p < SHUT_END ? easeClamp((p - WAVE1_END) / (SHUT_END - WAVE1_END))
      : p < HOLD_END ? 1
      : 1 - easeClamp((p - HOLD_END) / (1 - HOLD_END));
    const wave2Front = p < SHUT_END ? CHAIN_DOOR
      : p < WAVE2_END ? CHAIN_DOOR + (CHAIN_N - CHAIN_DOOR) * easeClamp((p - SHUT_END) / (WAVE2_END - SHUT_END))
      : CHAIN_N;
    const burstPulse = Math.exp(-Math.pow((p - WAVE2_END) / 0.02, 2));
    const ringAmt = p < WAVE2_END ? 0
      : p < BURST_END ? easeClamp((p - WAVE2_END) / (BURST_END - WAVE2_END))
      : p < HOLD_END ? 1
      : 1 - easeClamp((p - HOLD_END) / (1 - HOLD_END));
    const swellU = p < WAVE2_END ? -1 : (p - WAVE2_END) / 0.08;
    const swellActive = swellU >= 0 && swellU <= 1;
    const swellPos = CHAIN_N - (CHAIN_N - CHAIN_DOOR) * easeClamp(swellU);
    const resetT = p < HOLD_END ? 0 : easeClamp((p - HOLD_END) / (1 - HOLD_END));

    // Every component's colour: blue -> mint ahead of the door, blue ->
    // coral beyond it, a bright swell running back up the pending span
    // right after the burst, then everything eases back to blue.
    const beads = beadsRef.current, bonds = bondsRef.current, links = linksRef.current;
    for (let i = 0; i < CHAIN_N; i++) {
      const passed = i < CHAIN_DOOR ? i < wave1Front : i < wave2Front;
      scratch.set(i < CHAIN_DOOR ? (passed ? MINT : BLUE) : passed ? CORAL : BLUE);
      if (resetT > 0) scratch.lerp(blueColor, resetT);
      if (swellActive && i >= CHAIN_DOOR) {
        const d = i - swellPos;
        scratch.lerp(whiteColor, Math.exp(-(d * d) / 90) * 0.85);
      }
      if (beads) { beads.setColorAt(i * 2, scratch); beads.setColorAt(i * 2 + 1, scratch); }
      if (bonds) bonds.setColorAt(i, scratch);
      if (links) links.setColorAt(i, scratch);
    }
    if (beads?.instanceColor) beads.instanceColor.needsUpdate = true;
    if (bonds?.instanceColor) bonds.instanceColor.needsUpdate = true;
    if (links?.instanceColor) links.instanceColor.needsUpdate = true;

    hoopMat.current.emissiveIntensity = (0.45 + 0.5 * doorShut) * glowMul;
    membraneMat.current.opacity = 0.15 + 0.5 * doorShut;
    if (membraneRef.current) membraneRef.current.scale.setScalar(Math.max(0.001, doorShut));

    // Commit sits there quietly at rest; it only flares white at the burst.
    burstMat.current.emissiveIntensity = (0.35 + 3.8 * burstPulse) * glowMul;
    if (burstRef.current) burstRef.current.scale.setScalar(0.7 + burstPulse * 2.1);
    if (burstGlowRef.current) burstGlowRef.current.scale.setScalar((0.5 + burstPulse * 2.4) * glowMul);

    ringMat.current.emissiveIntensity = (0.8 + 0.6 * ringAmt) * glowMul;
    if (ringRef.current) ringRef.current.scale.setScalar(ringAmt);

    const m1On = p > 0.01 && p < WAVE1_END;
    if (marker1Ref.current && marker1GlowRef.current) {
      marker1Ref.current.scale.setScalar(m1On ? 1 : 0);
      marker1GlowRef.current.scale.setScalar(m1On ? 1 : 0);
      if (m1On) {
        chainFrontPoint(wave1Front, front3);
        marker1Ref.current.position.set(front3[0], front3[1], front3[2]);
        marker1GlowRef.current.position.copy(marker1Ref.current.position);
      }
    }
    const m2On = p > SHUT_END && p < WAVE2_END;
    if (marker2Ref.current && marker2GlowRef.current) {
      marker2Ref.current.scale.setScalar(m2On ? 1 : 0);
      marker2GlowRef.current.scale.setScalar(m2On ? 1 : 0);
      if (m2On) {
        chainFrontPoint(wave2Front, front3);
        marker2Ref.current.position.set(front3[0], front3[1], front3[2]);
        marker2GlowRef.current.position.copy(marker2Ref.current.position);
      }
    }
  });

  return (
    <group>
      {/* Per-instance colour comes from instanceColor (set via setColorAt),
          which three.js applies to any instancedMesh automatically -- the
          material itself must NOT set vertexColors: with no per-vertex
          "color" attribute on these geometries that flag zeroes vColor
          before the per-instance multiply, i.e. every instance goes black. */}
      <instancedMesh ref={beadsRef} args={[BEAD_GEO, mat("#ffffff", { roughness: 0.4, emissive: BLUE, emissiveIntensity: 0.22 }), BEADS_N]} castShadow frustumCulled={false} />
      <instancedMesh ref={bondsRef} args={[STICK_GEO, mat("#ffffff", { roughness: 0.4, emissive: BLUE, emissiveIntensity: 0.22 }), CHAIN_N]} castShadow frustumCulled={false} />
      <instancedMesh ref={linksRef} args={[STICK_GEO, mat("#ffffff", { roughness: 0.5, emissive: BLUE, emissiveIntensity: 0.15 }), LINKS_N]} frustumCulled={false} />

      <mesh ref={hoopRef} material={hoopMat.current}>
        <torusGeometry args={[0.32, 0.045, 8, 20]} />
      </mesh>
      <mesh ref={membraneRef} material={membraneMat.current} scale={0.001}>
        <circleGeometry args={[0.3, 20]} />
      </mesh>

      <mesh ref={burstRef} position={CHAIN_COMMIT} material={burstMat.current}>
        <sphereGeometry args={[0.16, 12, 10]} />
      </mesh>
      <mesh ref={burstGlowRef} position={CHAIN_COMMIT} material={glow("#ffffff", 0.35)}>
        <sphereGeometry args={[0.34, 10, 8]} />
      </mesh>
      <mesh ref={ringRef} position={CHAIN_COMMIT} material={ringMat.current} scale={0.001}>
        <torusGeometry args={[0.34, 0.045, 8, 20]} />
      </mesh>

      <mesh ref={marker1Ref} material={marker1Mat.current} scale={0}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>
      <mesh ref={marker1GlowRef} material={glow(MINT, 0.4)} scale={0}>
        <sphereGeometry args={[0.26, 10, 8]} />
      </mesh>
      <mesh ref={marker2Ref} material={marker2Mat.current} scale={0}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>
      <mesh ref={marker2GlowRef} material={glow(CORAL, 0.4)} scale={0}>
        <sphereGeometry args={[0.26, 10, 8]} />
      </mesh>
    </group>
  );
}
