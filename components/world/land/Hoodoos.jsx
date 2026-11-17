"use client";

// THE HOODOO GARDEN (lib/world/hoodoos.js): nine hexagonal spires banded in candy colours, each with a cap stone, one merged mesh.

import { useMemo } from "react";
import { Color, CylinderGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BANDS, BAND_STEP, CAP, SPIRES } from "../../../lib/world/hoodoos";
import { heightAt } from "../../../lib/world/terrain";
import { mat } from "../palette";

function paint(geo, pick) {
  const p = geo.attributes.position.array;
  const col = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 9) {
    const y = (p[i + 1] + p[i + 4] + p[i + 7]) / 3;
    const c = new Color(pick(y));
    for (let v = 0; v < 9; v += 3) col.set([c.r, c.g, c.b], i + v);
  }
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  return geo;
}

function spire(s) {
  const y0 = heightAt(s.x, s.z);
  const body = new CylinderGeometry(s.r * 0.6, s.r, s.h, 6).translate(s.x, y0 + s.h / 2, s.z).toNonIndexed();
  const cap = new CylinderGeometry(s.r * 0.8, s.r * 0.8, 0.22, 6).translate(s.x, y0 + s.h + 0.11, s.z).toNonIndexed();
  return [
    paint(body, (y) => BANDS[Math.max(0, Math.floor((y - y0) / BAND_STEP)) % BANDS.length]),
    paint(cap, () => CAP),
  ];
}

export default function Hoodoos() {
  const geo = useMemo(() => mergeGeometries(SPIRES.flatMap(spire)), []);
  return <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true })} castShadow receiveShadow />;
}
