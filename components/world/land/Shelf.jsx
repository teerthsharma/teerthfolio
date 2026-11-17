"use client";

// THE WEST SHELF (issue #77, west-margin): the blue cliff of Triton's western ice where it ends on the north-west apron.
// The face, its firn bands, slabs and the grotto recess are one vertex-coloured mesh (lib/world/shelf.js TRIS); the fallen
// blocks at the foot are one instanced mesh cut by quality tier; the grotto's back wall is a lit panel 2.2 m inside.

import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, Vector3 } from "three";
import { detail } from "../../../lib/world/detail";
import { BLOCKS, GROTTO, TOP, TRIS, blockSites, footFrame, hash } from "../../../lib/world/shelf";
import { heightAt } from "../../../lib/world/terrain";
import { useUi } from "../../../lib/world/store";
import { C, lamp, mat } from "../palette";

const UP = new Vector3(0, 1, 0);

function geometryOf(tris) {
  const pos = new Float32Array(tris.length * 9);
  const col = new Float32Array(tris.length * 9);
  tris.forEach((tri, i) => tri.forEach((v, k) => {
    const c = new Color(v[3]);
    pos.set([v[0], v[1], v[2]], (i * 3 + k) * 3);
    col.set([c.r, c.g, c.b], (i * 3 + k) * 3);
  }));
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function blocksMesh() {
  const m = new InstancedMesh(new IcosahedronGeometry(1, 0), mat(C.ice, { roughness: 0.5 }), BLOCKS);
  blockSites().forEach(({ x, z, r }, i) => {
    const q = new Quaternion().setFromAxisAngle(UP, hash(i, 14) * Math.PI * 2);
    m.setMatrixAt(i, new Matrix4().compose(new Vector3(x, heightAt(x, z) + 0.8 * r, z), q, new Vector3(r, 0.8 * r, r)));
  });
  m.computeBoundingSphere();
  return m;
}

export default function Shelf() {
  const geo = useMemo(() => geometryOf(TRIS), []);
  const top = useMemo(() => geometryOf(TOP), []);
  const blocks = useMemo(blocksMesh, []);
  const back = useMemo(() => new PlaneGeometry(GROTTO.width, GROTTO.height).translate(0, GROTTO.height / 2, 0), []);
  const tier = useUi((s) => s.tier);
  useEffect(() => {
    blocks.count = detail(BLOCKS, tier);
  }, [blocks, tier]);
  const f = footFrame(GROTTO.x);
  return (
    <group>
      <mesh geometry={top} material={mat("#ffffff", { vertexColors: true, roughness: 0.3, side: DoubleSide })} castShadow />
      <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, roughness: 0.3, side: DoubleSide })} castShadow receiveShadow />
      <primitive object={blocks} castShadow receiveShadow />
      <mesh
        geometry={back}
        material={lamp("#7fe9ff", 0.8)}
        position={[GROTTO.x - f.nx * GROTTO.depth, GROTTO.floor + 0.02, GROTTO.z - f.nz * GROTTO.depth]}
        rotation={[0, Math.atan2(f.nx, f.nz), 0]}
      />
    </group>
  );
}
