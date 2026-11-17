"use client";

// THE SASTRUGI PLAIN (lib/world/sastrugi.js): one InstancedMesh of ridges, noses up the wind; its shadows are its picture.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Object3D } from "three";
import { BASE, RIDGES } from "../../../lib/world/sastrugi";
import { heightAt } from "../../../lib/world/terrain";
import { useUi } from "../../../lib/world/store";
import { C, mat } from "../palette";

const SCALE = [0.4, 0.6, 1, 1, 1.25];
const detail = (base, tier) => Math.max(1, Math.round(base * SCALE[tier]));

// One ridge in a unit box (x length, y height, z width): tail on the ground, crest, undercut nose lip, eight triangles.
const T = [-0.5, 0, 0];
const A = [0.2, 0, -0.5];
const B = [0.2, 0, 0.5];
const K = [0.25, 1, 0];
const N = [0.5, 0.55, 0];
const F = [0.42, 0, 0];
const TRIS = [[T, A, K], [K, B, T], [A, F, K], [K, F, B], [K, N, F], [K, F, N], [T, A, F], [T, F, B]];

function ridge() {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(TRIS.flat(2), 3));
  return g;
}

const dummy = new Object3D();

export default function Sastrugi() {
  const geo = useMemo(ridge, []);
  const material = mat(C.snow, { side: DoubleSide });
  const ref = useRef(null);
  const tier = useUi((s) => s.tier) ?? 0;
  const count = Math.min(RIDGES.length, detail(BASE, tier));

  useLayoutEffect(() => {
    const mesh = ref.current;
    RIDGES.forEach((r, i) => {
      dummy.position.set(r.x, heightAt(r.x, r.z), r.z);
      dummy.rotation.set(0, r.yaw, 0);
      dummy.scale.set(r.len, r.h, r.w);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geo]);

  useEffect(() => {
    if (ref.current) ref.current.count = count;
  }, [count]);

  return <instancedMesh ref={ref} args={[geo, material, RIDGES.length]} castShadow receiveShadow />;
}
