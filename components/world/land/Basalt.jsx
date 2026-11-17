"use client";

// THE BASALT PAVEMENT (E3, the Giant's Causeway): three low patches of hexagonal prisms by faraday, one InstancedMesh cut by
// quality tier (lib/world/basalt.js PRISMS, interleaved across the patches so any cut keeps all three). No collider.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, CylinderGeometry, Float32BufferAttribute, Object3D } from "three";
import { PRISMS, R } from "../../../lib/world/basalt";
import { detail } from "../../../lib/world/detail";
import { useUi } from "../../../lib/world/store";
import { heightAt } from "../../../lib/world/terrain";
import { mat } from "../palette";

const TOP = new Color("#8f97d9");
const SIDE = new Color("#5a62a8");
const SINK = 0.05; // the base sits this far under heightAt, so no seam shows
const dummy = new Object3D();

function prism() {
  const g = new CylinderGeometry(R, R, 1, 6).translate(0, 0.5, 0).toNonIndexed();
  const normal = g.attributes.normal;
  const col = [];
  for (let i = 0; i < normal.count; i++) {
    const c = normal.getY(i) > 0.5 ? TOP : SIDE;
    col.push(c.r, c.g, c.b);
  }
  return g.setAttribute("color", new Float32BufferAttribute(col, 3));
}

export default function Basalt() {
  const geo = useMemo(prism, []);
  const tier = useUi((s) => s.tier);
  const mesh = useRef(null);

  useLayoutEffect(() => {
    PRISMS.forEach((p, i) => {
      dummy.position.set(p.x, heightAt(p.x, p.z) - SINK, p.z);
      dummy.scale.set(1, p.h + SINK, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, []);

  useEffect(() => {
    mesh.current.count = detail(PRISMS.length, tier);
  }, [tier]);

  return <instancedMesh ref={mesh} args={[geo, mat("#ffffff", { vertexColors: true, roughness: 0.6 }), PRISMS.length]} receiveShadow />;
}
