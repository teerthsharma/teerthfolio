"use client";

// THE PYREFLY FLOES (facebook/pyrefly #4180, place id pr-pyrefly-4180): the
// river's outflow east of the NVIDIA moat (lib/world/river.js), where the
// moat's water leaves for the sea.
//
//   - THE ANOMALY, the radiation made visible: the reproducer's 208 chained
//     components do not float on the river. They hang in the air above it,
//     wound into a funnel -- a whirlpool lifted off the water and hung up to
//     dry -- pinned at the bottom to a basalt stack standing in the
//     shallows, where the chain commits (parts/floes-layout.js has the
//     funnel's geometry: 208 two-lobed ice floes on a pressure ridge, tied
//     to the next by a thin ice thread). The whole coil turns slowly on the
//     pin, like a mobile hung to dry, and glows in pyrefly's own radiation
//     colour -- ice, not a progress legend: show, never tell.
//   - Plain floes are stranded along the outflow's banks, afloat and
//     unremarkable: what floes normally do, for the anomaly to read against.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CylinderGeometry, IcosahedronGeometry, Matrix4, Object3D, Quaternion, Vector3 } from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import { WATER_Y } from "../../../lib/world/terrain";
import { C, mat } from "../palette";
import { FLOE, FLOES, N, PIN, PIN_R, PIN_TOP, STRANDED, THREADS } from "./parts/floes-layout";

const NEAR_ID = "pr-pyrefly-4180";
const RADIATION = PLACE_BY_ID[NEAR_ID].radiation;

// The basalt stack the chain commits onto: a squat, slightly tapered pillar
// standing in the shallows, its top at PIN_TOP -- the geometry is built with
// its base already at y = 0, so the mesh sits at the pin's water-plane origin.
const stackGeo = new CylinderGeometry(PIN_R * 0.7, PIN_R * 1.15, PIN_TOP, 7, 1).translate(0, PIN_TOP / 2, 0);
const stackMat = mat(C.charcoal, { roughness: 0.85 });

// Plain stranded floes: small flat ice chips, calm, afloat -- the same
// low-poly ellipsoid language as the chained floes but idle and undramatic.
const FREEBOARD = 0.07;
const strandedGeo = new IcosahedronGeometry(1, 1);
const strandedMat = mat(C.ice, { roughness: 0.4 });
const dummy = new Object3D();

function Stranded() {
  const ref = useRef(null);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < STRANDED.length; i++) {
      const s = STRANDED[i];
      const bob = Math.sin(t * 0.8 + i * 2.3) * 0.02;
      dummy.position.set(s.x, WATER_Y + FREEBOARD + bob, s.z);
      dummy.rotation.set(Math.sin(t * 0.6 + i) * 0.03, s.yaw, Math.cos(t * 0.5 + i) * 0.03);
      dummy.scale.set(0.3 * s.scale, 0.16 * s.scale, 0.24 * s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[strandedGeo, strandedMat, STRANDED.length]} castShadow receiveShadow frustumCulled={false} />;
}

// ---- the funnel: 208 floes, baked once from floes-layout.js -----------------
//
// Every position and orientation is static (the reproducer's shape); only
// the whole coil's slow turn and its glow move per frame. No per-instance
// colour, no travelling markers, no door -- the diagram lived in the earlier
// monuments/Chain.jsx draft and is not carried over.

const RIDGE_R = 0.07; // the short thick ridge freezing a floe's two lobes together
const THREAD_R = 0.028; // the thin ice thread to the next floe
const LOBES_N = N * 2;
const LOBE_GEO = new IcosahedronGeometry(1, 1); // scaled per instance into an ice-chip ellipsoid
const STICK_GEO = new CylinderGeometry(1, 1, 1, 6, 1); // unit cylinder, scaled per instance
const EASE_RATE = 4; // near/far blend rate: k = 1 - exp(-EASE_RATE*dt)

const UP = new Vector3(0, 1, 0);
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

function Funnel({ near }) {
  const groupRef = useRef(null);
  const lobesRef = useRef(null);
  const ridgesRef = useRef(null);
  const threadsRef = useRef(null);
  const nearK = useRef(0);

  // Ice base, a rim glow in the district's own radiation colour, loud enough
  // to read against pale snow and ice from a distance -- one static material
  // shared by every instance, never a per-frame colour loop.
  const iceMat = useMemo(() => mat(C.ice, { roughness: 0.4, emissive: "#ff00ff", emissiveIntensity: 5 }).clone(), []);

  useEffect(() => {
    const lobes = lobesRef.current, ridges = ridgesRef.current, threads = threadsRef.current;
    console.log("funnel bake", N, lobes?.count, ridges?.count, threads?.count);
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
    if (typeof window !== "undefined") window.__floesDebug = { lobes, ridges, threads, group: groupRef.current, iceMat };
  }, []);

  const three = useThree();
  useEffect(() => {
    if (typeof window !== "undefined") window.__floesThree = three;
  }, [three]);

  // The last floe commits onto the pin's centre (floes-layout's COMMIT sits
  // on the y axis), so turning this whole group around y leaves that point
  // fixed: the coil spins slowly on its pin, like a mobile hung to dry.
  useFrame((_, dt) => {
    nearK.current += ((near ? 1 : 0) - nearK.current) * (1 - Math.exp(-EASE_RATE * dt));
    if (groupRef.current) groupRef.current.rotation.y += (0.05 + 0.1 * nearK.current) * dt;
    iceMat.emissiveIntensity = 0.65 + 0.35 * nearK.current;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={lobesRef} args={[LOBE_GEO, iceMat, LOBES_N]} castShadow frustumCulled={false} />
      <instancedMesh ref={ridgesRef} args={[STICK_GEO, iceMat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={threadsRef} args={[STICK_GEO, iceMat, N]} frustumCulled={false} />
    </group>
  );
}

export default function Floes() {
  const near = useUi((s) => s.near) === NEAR_ID;
  return (
    <group>
      <mesh position={[PIN.x, 0, PIN.z]} geometry={stackGeo} material={stackMat} castShadow receiveShadow />
      <group position={[PIN.x, 0, PIN.z]}>
        <Funnel near={near} />
      </group>
      <Stranded />
    </group>
  );
}
