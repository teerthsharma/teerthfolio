"use client";

// THE PYREFLY FLOES figure, facebook/pyrefly #4180 (place id
// pr-pyrefly-4180). SUPERSEDED: the ice geometry this file built is now
// baked directly into components/world/land/Floes.jsx's own Funnel
// component, which is what actually renders on the island -- no landform
// imports this file any more. It is kept only because
// components/world/monuments/index.js's SCULPTURES registry still imports
// it by key ("chain"); nothing renders it. Its earlier door/burst/marker
// diagram -- a literal colour-coded progress legend for the PR's algorithm --
// has been removed (SHOW, NEVER TELL forbids a labelled mechanism); only the
// natural ice bake below is left, matching Floes.jsx's Funnel.

import { useEffect, useMemo, useRef } from "react";
import { CylinderGeometry, IcosahedronGeometry, Matrix4, Object3D, Quaternion, Vector3 } from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { C, mat } from "../palette";
import { FLOE, FLOES, N, THREADS } from "../land/parts/floes-layout";

const RADIATION = PLACE_BY_ID["pr-pyrefly-4180"].radiation;

const RIDGE_R = 0.07; // the short thick ridge freezing a floe's two lobes together
const THREAD_R = 0.028; // the thin ice thread to the next floe
const LOBES_N = N * 2;
const LOBE_GEO = new IcosahedronGeometry(1, 1); // scaled per instance into an ice-chip ellipsoid
const STICK_GEO = new CylinderGeometry(1, 1, 1, 6, 1); // unit cylinder, scaled per instance

const dummy = new Object3D();
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

export default function Chain() {
  const lobesRef = useRef(null);
  const ridgesRef = useRef(null);
  const threadsRef = useRef(null);

  const iceMat = useMemo(() => mat(C.ice, { roughness: 0.4, emissive: RADIATION, emissiveIntensity: 0.65 }), []);

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
  }, []);

  return (
    <group>
      <instancedMesh ref={lobesRef} args={[LOBE_GEO, iceMat, LOBES_N]} castShadow frustumCulled={false} />
      <instancedMesh ref={ridgesRef} args={[STICK_GEO, iceMat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={threadsRef} args={[STICK_GEO, iceMat, N]} frustumCulled={false} />
    </group>
  );
}
