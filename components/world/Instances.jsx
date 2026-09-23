"use client";

// Instanced copies of one geometry: placed once (boulders), or bobbing on the
// swell (floes). Shared by Island.jsx and Sea.jsx; items are
// { x, z, radius, rotY?, phase? }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Object3D } from "three";

export default function Instances({ geometry, items, material, bob = false, castShadow = true }) {
  const ref = useRef();
  const dummy = useMemo(() => new Object3D(), []);
  const place = (t) => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      const lift = bob ? Math.sin(t * 0.8 + it.phase) * 0.06 : 0;
      dummy.position.set(it.x, bob ? -0.62 + lift : it.radius * 0.35, it.z);
      dummy.rotation.set(0, it.rotY ?? it.phase, bob ? Math.sin(t * 0.6 + it.phase) * 0.03 : 0);
      if (bob) dummy.scale.set(it.radius, 0.35, it.radius);
      else dummy.scale.setScalar(it.radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => place(0));
  useFrame(({ clock }) => bob && place(clock.elapsedTime));
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow />;
}

