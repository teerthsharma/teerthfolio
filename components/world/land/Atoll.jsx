"use client";

// THE CORAL BEACH AND THE ATOLL (E16): a sand beach on the Knot Coast and a ring reef with its lagoon on the open sea.
// One vertex-coloured mesh of lib/world/atoll.js PIECES; no collider, no live parts.

import { useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from "three";
import { PIECES } from "../../../lib/world/atoll";
import { mat } from "../palette";

function geometry() {
  const pos = [];
  const col = [];
  for (const { color, pos: p } of PIECES) {
    const c = new Color(color);
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      col.push(c.r, c.g, c.b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export default function Atoll() {
  const geo = useMemo(geometry, []);
  return <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, roughness: 0.6, side: DoubleSide })} receiveShadow />;
}
