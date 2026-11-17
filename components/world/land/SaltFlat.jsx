"use client";

// THE SALT FLAT (E12, Uyuni): a hexagonal crust of ground decals on the open west, mirror-glossy from GOOD up.
// One vertex-coloured mesh; no collider. Positions are lib/world/saltflat.js BASE (floor) and CRUST (lines).

import { useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from "three";
import { featuresForTier } from "../../../lib/quality/modes";
import { BASE, COLORS, CRUST } from "../../../lib/world/saltflat";
import { useUi } from "../../../lib/world/store";
import { mat } from "../palette";

function geometry() {
  const floor = new Color(COLORS.base);
  const crust = new Color(COLORS.crust);
  const pos = [...BASE, ...CRUST];
  const col = [];
  for (let i = 0; i < pos.length / 3; i++) {
    const c = i < BASE.length / 3 ? floor : crust;
    col.push(c.r, c.g, c.b);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export default function SaltFlat() {
  const geo = useMemo(geometry, []);
  const tier = useUi((s) => s.tier);
  const mirror = featuresForTier(tier).shaders;
  return <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, roughness: mirror ? 0.12 : 0.92, side: DoubleSide })} receiveShadow />;
}
