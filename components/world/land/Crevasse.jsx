"use client";

// THE MARGIN (issue #77, west-margin): the tide crack where the West Shelf's ice meets the ground: the slot, one snow
// bridge across it and five thin cracks. One vertex-coloured mesh of ground decals (lib/world/crevasse.js TRIS).

import { useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from "three";
import { TRIS } from "../../../lib/world/crevasse";
import { mat } from "../palette";

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

export default function Crevasse() {
  const geo = useMemo(() => geometryOf(TRIS), []);
  return <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, roughness: 0.3, side: DoubleSide })} receiveShadow />;
}
