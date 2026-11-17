"use client";

// THE CENOTES (lib/world/cenotes.js): a candy collar on each rim and the turquoise water in each hole, one merged mesh.
// The collar bands are painted by angle round the rim; the water sits 5 cm above heightAt.

import { useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CENOTES, COLLAR, GROUND_VERTS, WATER } from "../../../lib/world/cenotes";
import { heightAt } from "../../../lib/world/terrain";
import { mat } from "../palette";

function paint(geo, pick) {
  const p = geo.attributes.position.array;
  const col = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 9) {
    const m = [0, 1, 2].map((k) => (p[i + k] + p[i + 3 + k] + p[i + 6 + k]) / 3);
    const c = new Color(pick(m[0], m[1], m[2]));
    for (let v = 0; v < 9; v += 3) col.set([c.r, c.g, c.b], i + v);
  }
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  return geo;
}

function collar(c) {
  const g = new TorusGeometry(c.r, COLLAR.tube, 6, COLLAR.segs).rotateX(Math.PI / 2).translate(c.x, heightAt(c.x, c.z) + COLLAR.lift, c.z).toNonIndexed();
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  return paint(g, (x, _y, z) => {
    const band = Math.floor(((Math.atan2(z - c.z, x - c.x) + Math.PI) / (2 * Math.PI)) * COLLAR.bands);
    return COLLAR.colours[band % COLLAR.colours.length];
  });
}

function water() {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(GROUND_VERTS.flat(), 3));
  return paint(g, () => WATER);
}

export default function Cenotes() {
  const geo = useMemo(() => mergeGeometries([...CENOTES.map(collar), water()]), []);
  return <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, side: DoubleSide })} castShadow receiveShadow />;
}
