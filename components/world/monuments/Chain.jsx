"use client";

// The animated story for facebook/pyrefly #4180 (place id pr-pyrefly-4180),
// grown into THE PYREFLY FLOES landform (components/world/land/Floes.jsx
// draws the basalt pin and the stranded floes; lib/world/land/parts/
// floes-layout.js has the funnel's geometry -- 208 floes hung in the air
// above the river, the anomaly). This file only paints the story onto that
// funnel (data/showcase.json, this place's figure.desc; teerthsharma.
// github.io/fig.js, "chain -- pyrefly-4180"):
//
// The reproducer from the pull request, built as it is built: 208
// two-module strongly connected components, chained so each depends on the
// one before, wound into the funnel that descends to commit at the pin. One
// export change (blue -> mint) enters at the top and propagates down. A
// violet hoop marks where the 100-epoch incremental budget runs out
// (floes-layout DOOR); the change spends the budget reaching it and a
// membrane closes across the hoop -- the door shuts. Forced invalidation
// then produces another export change (coral) on the far side, which runs
// the rest of the funnel into commit with that change still pending.
// Arrival bursts -- Transaction has uncommitted changes -- a swell runs
// back up every still-pending component, and a ring closes around the
// burst and holds it: pinned with should_panic so it cannot return quietly.
// Then everything eases back to blue and the next change enters. Loops
// continuously; faster and brighter near.
//
// Each floe is two lobes (one per module) frozen along a short thick
// pressure ridge, joined to the next floe by a thin ice thread. Every
// position and orientation is baked once from floes-layout.js's FLOES; only
// instance colour and a handful of small meshes move per frame.
//
// Local origin: the pin (floes-layout.js's PIN), at the water plane, y = 0.
// Props: { near }.

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, CylinderGeometry, IcosahedronGeometry, Matrix4, Object3D, Quaternion, TorusGeometry, Vector3 } from "three";
import { glow, mat } from "../palette";
import { COMMIT, DOOR, DOOR_AT, DOOR_AXIS, FLOE, FLOES, frontPoint, N, THREADS } from "../land/parts/floes-layout";

// fig.js's own tokens for this figure (chain(), token() calls) -- the same
// hexes the landing site paints, kept exact rather than reached for place.color.
const BLUE = "#2456dc"; // before / idle
const MINT = "#0b93ab"; // the first change, once it has passed
const CORAL = "#d9376e"; // the second change, on the far side of the door
const CORAL_DARK = "#a0183f"; // the should_panic ring: it catches the coral failure
const VIOLET = "#a66cf0"; // the door: the incremental budget's edge

const RIDGE_R = 0.07; // the short thick ridge freezing a floe's two lobes together
const THREAD_R = 0.028; // the thin ice thread to the next floe

const LOBES_N = N * 2;
const LOBE_GEO = new IcosahedronGeometry(1, 1); // scaled per instance into an ice-chip ellipsoid
const STICK_GEO = new CylinderGeometry(1, 1, 1, 6, 1); // unit cylinder, scaled per instance

const CYCLE_FAR = 9.5; // s per loop, far from the reading point
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
const basisM = new Matrix4();

// Places a unit stick between two points, radius `r`: used once to bake the
// ridge and thread instances, which never move again.
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

const doorTangent = new Vector3(...DOOR_AXIS);
const doorQuat = new Quaternion().setFromUnitVectors(AXIS_Z, doorTangent);

export default function Chain({ near }) {
  const lobesRef = useRef(null);
  const ridgesRef = useRef(null);
  const threadsRef = useRef(null);
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

  // Bake every lobe, ridge and thread position once: the funnel never
  // moves, only its colour does. Also seat the hoop and membrane on the door.
  useEffect(() => {
    const lobes = lobesRef.current, ridges = ridgesRef.current, threads = threadsRef.current;
    if (!lobes || !ridges || !threads) return;
    for (let i = 0; i < N; i++) {
      const f = FLOES[i];
      const off = FLOE.lobeOff * f.scale;
      const a = [f.c[0] - f.x[0] * off, f.c[1] - f.x[1] * off, f.c[2] - f.x[2] * off];
      const b = [f.c[0] + f.x[0] * off, f.c[1] + f.x[1] * off, f.c[2] + f.x[2] * off];

      basisM.makeBasis(new Vector3(...f.x), new Vector3(...f.y), new Vector3(...f.z));
      qTmp.setFromRotationMatrix(basisM);
      dummy.quaternion.copy(qTmp);
      dummy.scale.set(FLOE.lobeX * f.scale, FLOE.thick * f.scale, FLOE.lobeZ * f.scale);
      dummy.position.set(a[0], a[1], a[2]);
      dummy.updateMatrix();
      lobes.setMatrixAt(i * 2, dummy.matrix);
      dummy.position.set(b[0], b[1], b[2]);
      dummy.updateMatrix();
      lobes.setMatrixAt(i * 2 + 1, dummy.matrix);

      placeStick(a, b, RIDGE_R);
      ridges.setMatrixAt(i, dummy.matrix);

      const [t, h] = THREADS[i];
      placeStick(t, h, THREAD_R);
      threads.setMatrixAt(i, dummy.matrix);
    }
    lobes.instanceMatrix.needsUpdate = true;
    ridges.instanceMatrix.needsUpdate = true;
    threads.instanceMatrix.needsUpdate = true;

    if (hoopRef.current) {
      hoopRef.current.position.set(...DOOR_AT);
      hoopRef.current.quaternion.copy(doorQuat);
    }
    if (membraneRef.current) {
      membraneRef.current.position.set(...DOOR_AT);
      membraneRef.current.quaternion.copy(doorQuat);
    }
  }, []);

  useFrame((_, dt) => {
    nearK.current += ((near ? 1 : 0) - nearK.current) * (1 - Math.exp(-EASE_RATE * dt));
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * nearK.current;
    phase.current = (phase.current + dt / cycle) % 1;
    const p = phase.current;
    const glowMul = 1 + 0.6 * nearK.current;

    const wave1Front = p < WAVE1_END ? DOOR * easeClamp(p / WAVE1_END) : DOOR;
    const doorShut = p < WAVE1_END ? 0
      : p < SHUT_END ? easeClamp((p - WAVE1_END) / (SHUT_END - WAVE1_END))
      : p < HOLD_END ? 1
      : 1 - easeClamp((p - HOLD_END) / (1 - HOLD_END));
    const wave2Front = p < SHUT_END ? DOOR
      : p < WAVE2_END ? DOOR + (N - DOOR) * easeClamp((p - SHUT_END) / (WAVE2_END - SHUT_END))
      : N;
    const burstPulse = Math.exp(-Math.pow((p - WAVE2_END) / 0.02, 2));
    const ringAmt = p < WAVE2_END ? 0
      : p < BURST_END ? easeClamp((p - WAVE2_END) / (BURST_END - WAVE2_END))
      : p < HOLD_END ? 1
      : 1 - easeClamp((p - HOLD_END) / (1 - HOLD_END));
    const swellU = p < WAVE2_END ? -1 : (p - WAVE2_END) / 0.08;
    const swellActive = swellU >= 0 && swellU <= 1;
    const swellPos = N - (N - DOOR) * easeClamp(swellU);
    const resetT = p < HOLD_END ? 0 : easeClamp((p - HOLD_END) / (1 - HOLD_END));

    // Every component's colour: blue -> mint ahead of the door, blue ->
    // coral beyond it, a bright swell running back up the pending span
    // right after the burst, then everything eases back to blue.
    const lobes = lobesRef.current, ridges = ridgesRef.current, threads = threadsRef.current;
    for (let i = 0; i < N; i++) {
      const passed = i < DOOR ? i < wave1Front : i < wave2Front;
      scratch.set(i < DOOR ? (passed ? MINT : BLUE) : passed ? CORAL : BLUE);
      if (resetT > 0) scratch.lerp(blueColor, resetT);
      if (swellActive && i >= DOOR) {
        const d = i - swellPos;
        scratch.lerp(whiteColor, Math.exp(-(d * d) / 90) * 0.85);
      }
      if (lobes) { lobes.setColorAt(i * 2, scratch); lobes.setColorAt(i * 2 + 1, scratch); }
      if (ridges) ridges.setColorAt(i, scratch);
      if (threads) threads.setColorAt(i, scratch);
    }
    if (lobes?.instanceColor) lobes.instanceColor.needsUpdate = true;
    if (ridges?.instanceColor) ridges.instanceColor.needsUpdate = true;
    if (threads?.instanceColor) threads.instanceColor.needsUpdate = true;

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
        frontPoint(wave1Front, front3);
        marker1Ref.current.position.set(front3[0], front3[1], front3[2]);
        marker1GlowRef.current.position.copy(marker1Ref.current.position);
      }
    }
    const m2On = p > SHUT_END && p < WAVE2_END;
    if (marker2Ref.current && marker2GlowRef.current) {
      marker2Ref.current.scale.setScalar(m2On ? 1 : 0);
      marker2GlowRef.current.scale.setScalar(m2On ? 1 : 0);
      if (m2On) {
        frontPoint(wave2Front, front3);
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
      <instancedMesh ref={lobesRef} args={[LOBE_GEO, mat("#ffffff", { roughness: 0.4, emissive: BLUE, emissiveIntensity: 0.22 }), LOBES_N]} castShadow frustumCulled={false} />
      <instancedMesh ref={ridgesRef} args={[STICK_GEO, mat("#ffffff", { roughness: 0.4, emissive: BLUE, emissiveIntensity: 0.22 }), N]} castShadow frustumCulled={false} />
      <instancedMesh ref={threadsRef} args={[STICK_GEO, mat("#ffffff", { roughness: 0.5, emissive: BLUE, emissiveIntensity: 0.15 }), N]} frustumCulled={false} />

      <mesh ref={hoopRef} material={hoopMat.current}>
        <torusGeometry args={[0.32, 0.045, 8, 20]} />
      </mesh>
      <mesh ref={membraneRef} material={membraneMat.current} scale={0.001}>
        <circleGeometry args={[0.3, 20]} />
      </mesh>

      <mesh ref={burstRef} position={COMMIT} material={burstMat.current}>
        <sphereGeometry args={[0.16, 12, 10]} />
      </mesh>
      <mesh ref={burstGlowRef} position={COMMIT} material={glow("#ffffff", 0.35)}>
        <sphereGeometry args={[0.34, 10, 8]} />
      </mesh>
      <mesh ref={ringRef} position={COMMIT} material={ringMat.current} scale={0.001}>
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
