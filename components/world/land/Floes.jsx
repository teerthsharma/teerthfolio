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
//     funnel's geometry; monuments/Chain.jsx paints the story onto it: the
//     export change, the door the incremental budget shuts, the burst
//     pinned with should_panic).
//   - Plain floes are stranded along the outflow's banks, afloat and
//     unremarkable: what floes normally do, for the anomaly to read against.
//
// Everything quickens while the seal is at the reading point.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { CylinderGeometry, IcosahedronGeometry, Object3D } from "three";
import { useUi } from "../../../lib/world/store";
import { WATER_Y } from "../../../lib/world/terrain";
import Chain from "../monuments/Chain";
import { C, mat } from "../palette";
import { PIN, PIN_R, PIN_TOP, STRANDED } from "./parts/floes-layout";

const NEAR_ID = "pr-pyrefly-4180";

// The basalt stack the chain commits onto: a squat, slightly tapered pillar
// standing in the shallows, its top at PIN_TOP -- the geometry is built with
// its base already at y = 0, so the mesh sits at the pin's water-plane origin.
const stackGeo = new CylinderGeometry(PIN_R * 0.7, PIN_R * 1.15, PIN_TOP, 7, 1).translate(0, PIN_TOP / 2, 0);
const stackMat = mat(C.charcoal, { roughness: 0.85 });

// Plain stranded floes: small flat ice chips, calm, afloat -- the same
// low-poly ellipsoid language as the chained floes (monuments/Chain.jsx)
// but idle and undramatic.
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

export default function Floes() {
  const near = useUi((s) => s.near) === NEAR_ID;
  return (
    <group>
      <mesh position={[PIN.x, 0, PIN.z]} geometry={stackGeo} material={stackMat} castShadow receiveShadow />
      <group position={[PIN.x, 0, PIN.z]}>
        <Chain near={near} />
      </group>
      <Stranded />
    </group>
  );
}
