"use client";

// THE GRAVEYARD (lib/world/bergs.js): tabular bergs in the open sea past the rims, four grounded on the west shoal and two in
// transit. One vertex-coloured mesh for the bergs, their keels and foam rings; the bergy bits are one instanced mesh.

import { useEffect, useMemo, useRef } from "react";
import { CircleGeometry, Color, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Object3D, Path, Shape, ShapeGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BERGS, BITS, BITS_BASE, PINNACLE } from "../../../lib/world/bergs";
import { useUi } from "../../../lib/world/store";
import { SEA_Y } from "../../../lib/world/terrain";
import { C, mat } from "../palette";

const TIER_SCALE = [0.4, 0.6, 1, 1, 1.25];
const tierCount = (base, tier) => Math.max(1, Math.round(base * (TIER_SCALE[tier] ?? 1)));

const DRAFT = 1.5;
const KEEL = 1.3;
const BEVEL = 0.4;
const FOAM = 0.4;

const SNOW = new Color(C.snow);
const ICE = new Color(C.ice);
const DEEP = new Color(C.deepIce);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function paint(geo, tone) {
  const g = (geo.index ? geo.toNonIndexed() : geo).deleteAttribute("uv").deleteAttribute("normal");
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    tone(c, pos.getY(i));
    c.toArray(col, i * 3);
  }
  return g.setAttribute("color", new Float32BufferAttribute(col, 3));
}

function berg({ x, z, w, d, free, turn, tilt = 0 }) {
  const top = SEA_Y + free;
  const h = free + DRAFT;
  const body = new RoundedBoxGeometry(w, h, d, 1, BEVEL);
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > h / 2 - 0.01) p.setY(i, h / 2 + (hash(p.getX(i), p.getZ(i)) - 0.5) * 0.6);
  }
  body.rotateZ(tilt).rotateY(turn).translate(x, top - h / 2, z);
  const sides = (c, y) => (y > top - BEVEL ? c.copy(SNOW) : c.copy(DEEP).lerp(ICE, clamp01((y - SEA_Y) / (top - BEVEL - SEA_Y))));
  const keel = new CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(KEEL * w / 2, 1, KEEL * d / 2).rotateY(turn).translate(x, SEA_Y + 0.02, z);
  const outline = new Shape();
  outline.absellipse(0, 0, w / 2 + FOAM, d / 2 + FOAM, 0, Math.PI * 2, false, 0);
  const inner = new Path();
  inner.absellipse(0, 0, w / 2, d / 2, 0, Math.PI * 2, true, 0);
  outline.holes.push(inner);
  const foam = new ShapeGeometry(outline, 24).rotateX(-Math.PI / 2).rotateY(turn).translate(x, SEA_Y + 0.04, z);
  return [paint(body, sides), paint(keel, (c) => c.set(C.shallows)), paint(foam, (c) => c.set(C.foam))];
}

function spire() {
  const base = SEA_Y - 2;
  const h = PINNACLE.top + 2;
  const top = base + h;
  const g = new CylinderGeometry(0.9, PINNACLE.r, h, 6, 1).translate(PINNACLE.x, base + h / 2, PINNACLE.z);
  return paint(g, (c, y) => (y > top - 0.01 ? c.copy(SNOW) : c.copy(DEEP).lerp(ICE, clamp01((y - base) / h))));
}

function ice() {
  const g = mergeGeometries([...BERGS.flatMap((b) => berg(b)), spire()]);
  g.computeVertexNormals();
  return g;
}

const skin = mat("#ffffff", { vertexColors: true, roughness: 0.4 });
const bitGeo = new IcosahedronGeometry(1, 1);
const bitMat = mat(C.ice, { roughness: 0.4 });
const dummy = new Object3D();

export default function Bergs() {
  const tier = useUi((s) => s.tier);
  const geo = useMemo(ice, []);
  const bits = useRef(null);

  useEffect(() => {
    const m = bits.current;
    if (!m) return;
    BITS.forEach((b, i) => {
      dummy.position.set(b.x, SEA_Y + 0.05, b.z);
      dummy.rotation.set(0, b.yaw, 0);
      dummy.scale.set(b.r, b.h, b.r * 0.8);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);

  useEffect(() => {
    if (bits.current) bits.current.count = tierCount(BITS_BASE, tier);
  }, [tier]);

  return (
    <group>
      <mesh geometry={geo} material={skin} castShadow receiveShadow />
      <instancedMesh ref={bits} args={[bitGeo, bitMat, BITS.length]} castShadow receiveShadow />
    </group>
  );
}
