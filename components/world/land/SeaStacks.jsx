"use client";

// THE SEA STACKS AND THE ARCH (lib/world/seastacks.js): two stacks and a natural arch standing in the sea, banded teal over gold.
// The arch is a half torus with a leg at each end, its opening turned to the rig; one merged mesh, no collider.

import { useMemo } from "react";
import { Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARCH, BANDS, BAND_STEP, STACKS } from "../../../lib/world/seastacks";
import { SEA_Y, heightAt } from "../../../lib/world/terrain";
import { mat } from "../palette";

function paint(geo) {
  const p = geo.attributes.position.array;
  const col = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 9) {
    const y = (p[i + 1] + p[i + 4] + p[i + 7]) / 3;
    const c = new Color(BANDS[Math.floor((y - SEA_Y) / BAND_STEP) & 1]);
    for (let v = 0; v < 9; v += 3) col.set([c.r, c.g, c.b], i + v);
  }
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  return geo;
}

function stack(s) {
  const base = heightAt(s.x, s.z) - 0.8;
  const h = s.top - base;
  return new CylinderGeometry(s.r * 0.82, s.r, h, 7).translate(s.x, base + h / 2, s.z).toNonIndexed();
}

function arch() {
  const th = Math.atan2(ARCH.toward[0] - ARCH.x, ARCH.toward[1] - ARCH.z);
  const yc = ARCH.top - ARCH.R - ARCH.tube;
  const vault = new TorusGeometry(ARCH.R, ARCH.tube, 6, 12, Math.PI).rotateY(th).translate(ARCH.x, yc, ARCH.z).toNonIndexed();
  const legs = [-1, 1].map((side) => {
    const ex = ARCH.x + side * ARCH.R * Math.cos(th);
    const ez = ARCH.z - side * ARCH.R * Math.sin(th);
    const base = heightAt(ex, ez) - 0.6;
    return new CylinderGeometry(ARCH.tube, ARCH.tube, yc - base, 6).translate(ex, base + (yc - base) / 2, ez).toNonIndexed();
  });
  return [vault, ...legs];
}

export default function SeaStacks() {
  const geo = useMemo(() => mergeGeometries([...STACKS.map(stack), ...arch()].map(paint)), []);
  return <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, side: DoubleSide })} castShadow receiveShadow />;
}
