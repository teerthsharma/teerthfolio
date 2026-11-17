"use client";

// THE WEST SHELF (issue #77, west-margin): the blue cliff of Triton's western ice where it ends on the north-west apron.
// The shelf, its slabs and bands are one vertex-coloured mesh (lib/world/shelf.js TRIS); the fallen blocks at the foot are
// one instanced mesh cut by quality tier; the grotto is a lit arch panel on the face.

import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, Matrix4, Quaternion, Shape, ShapeGeometry, Vector3 } from "three";
import { detail } from "../../../lib/world/detail";
import { BLOCKS, GROTTO, TRIS, blockSites, footFrame, hash } from "../../../lib/world/shelf";
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

// A round-topped arch: a rectangle of height `top - r` under a half disc of radius r.
function arch(r, top) {
  const s = new Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, top - r);
  s.absarc(0, top - r, r, 0, Math.PI, false);
  s.closePath();
  return s;
}

export default function Shelf() {
  const geo = useMemo(() => geometryOf(TRIS), []);
  const blocks = useMemo(blocksMesh, []);
  const panel = useMemo(() => new ShapeGeometry(arch(GROTTO.width / 2, GROTTO.height), 12), []);
  const tier = useUi((s) => s.tier);
  useEffect(() => {
    blocks.count = detail(BLOCKS, tier);
  }, [blocks, tier]);
  const f = footFrame(GROTTO.x);
  return (
    <group>
      <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, roughness: 0.3, side: DoubleSide })} castShadow receiveShadow />
      <primitive object={blocks} castShadow receiveShadow />
      <mesh
        geometry={panel}
        material={lamp("#7fe9ff", 1.2)}
        position={[GROTTO.x + 0.05 * f.nx, heightAt(GROTTO.x, GROTTO.z) + 0.02, GROTTO.z + 0.05 * f.nz]}
        rotation={[0, Math.atan2(f.nx, f.nz), 0]}
      />
    </group>
  );
}
