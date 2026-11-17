"use client";

// THE PINK DUNES (lib/world/dunes.js): 26 barchan crescents as one InstancedMesh, the three lagoons as one decal mesh.
// The crescents are yawed by the wind in the layout; standing parts stand on heightAt, the lagoons sit 6 cm above it.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Object3D } from "three";
import { CRESCENT, GROUND_VERTS, RIDGES } from "../../../lib/world/dunes";
import { detail } from "../../../lib/world/detail";
import { heightAt } from "../../../lib/world/terrain";
import { useUi } from "../../../lib/world/store";
import { SURFACE, mat } from "../palette";

const LAGOON = "#7de3ff";
const dummy = new Object3D();

function crescents() {
  const g = new BufferGeometry();
  const col = CRESCENT.flatMap((t) => {
    const c = new Color(t.c);
    return [c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b];
  });
  g.setAttribute("position", new Float32BufferAttribute(CRESCENT.flatMap((t) => t.p.flat()), 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

function lagoons() {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(GROUND_VERTS.flat(), 3));
  return g;
}

export default function Dunes() {
  const geo = useMemo(crescents, []);
  const pools = useMemo(lagoons, []);
  const tier = useUi((s) => s.tier);
  const ref = useRef(null);
  const count = Math.min(RIDGES.length, detail(RIDGES.length, tier));

  useLayoutEffect(() => {
    const mesh = ref.current;
    RIDGES.forEach((r, i) => {
      dummy.position.set(r.x, heightAt(r.x, r.z), r.z);
      dummy.scale.set(r.size, r.h, r.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geo]);

  useEffect(() => {
    if (ref.current) ref.current.count = count;
  }, [count]);

  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat("#ffffff", { vertexColors: true, side: DoubleSide }), RIDGES.length]} castShadow receiveShadow />
      <mesh geometry={pools} material={mat(LAGOON, { side: DoubleSide, roughness: SURFACE.water.roughness })} receiveShadow />
    </>
  );
}
