"use client";

// The Fountain's ice rise (lib/world/rise.js): marble dais, gold spiral on the crown, two green rills draped on heightAt.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, RingGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RISE, riseHeight } from "../../../lib/world/rise";
import { live } from "../../../lib/world/store";
import { heightAt } from "../../../lib/world/terrain";
import { mat } from "../palette";
import { streamMaterial } from "./parts/moat-uphill";

const TOP = RISE.top;
const GOLD = "#ffc933";
const TAU = Math.PI * 2;
const SPIRAL = { start: 2.5 * Math.PI, run: 5.3, r0: 3.6, pitch: 0.38 }; // continues the inlay arms of Fountain.jsx
const RILLS = [140, 215].map((deg) => (deg * Math.PI) / 180); // azimuths: 0 east, 90 south
const GROUND = (x, z) => Math.max(riseHeight(x, z), heightAt(x, z), 0);
const at = (a, r) => [RISE.x + Math.cos(a) * r, RISE.z + Math.sin(a) * r];

const painted = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const c = new Color(hex);
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
};

const drape = (geo, lift) => {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, lift(p.getX(i), p.getZ(i)));
  return geo;
};

// Ribbons along [x, z] lines, `half` wide each side, lifted by lift(x, z); aLen is metres along a line, as the moat shader reads it.
function ribbons(lines, half, lift) {
  const P = [];
  const L = [];
  const A = [];
  const G = [];
  const I = [];
  for (const pts of lines) {
    const n = pts.length;
    const lens = [0];
    for (let i = 1; i < n; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const base = P.length / 3;
    pts.forEach(([x, z], i) => {
      const [ax, az] = pts[Math.max(0, i - 1)];
      const [bx, bz] = pts[Math.min(n - 1, i + 1)];
      const tl = Math.hypot(bx - ax, bz - az) || 1;
      for (const k of [-1, 1]) {
        const px = x - ((bz - az) / tl) * k * half;
        const pz = z + ((bx - ax) / tl) * k * half;
        P.push(px, lift(px, pz), pz);
        L.push(lens[i]);
        A.push(k);
        G.push(lens[i] / lens[n - 1]);
      }
      if (i < n - 1) {
        const v = base + 2 * i;
        I.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    });
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(P, 3));
  g.setAttribute("aLen", new Float32BufferAttribute(L, 1));
  g.setAttribute("aAcross", new Float32BufferAttribute(A, 1));
  g.setAttribute("aAlong", new Float32BufferAttribute(G, 1));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

function build() {
  const crown = painted(new CylinderGeometry(3.3, 3.5, 0.12, 24).translate(RISE.x, TOP + 0.04, RISE.z), "#f7f4ff");
  const fans = RILLS.map((a) => {
    const [x, z] = at(a, RISE.edge);
    const ring = new RingGeometry(0, 1.6, 16, 2).rotateX(-Math.PI / 2).translate(x, 0, z);
    return painted(drape(ring, (px, pz) => GROUND(px, pz) + 0.04), "#d7f3e4");
  });
  const plain = mergeGeometries([crown, ...fans]);
  plain.computeVertexNormals();
  const spiral = ribbons(
    [0, 1, 2].map((k) => Array.from({ length: 61 }, (_, n) => {
      const t = (SPIRAL.run * n) / 60;
      return at(SPIRAL.start + t + (k * TAU) / 3, SPIRAL.r0 + SPIRAL.pitch * t);
    })),
    0.06,
    () => TOP + 0.03,
  );
  const rills = ribbons(
    RILLS.map((a) => Array.from({ length: 15 }, (_, i) => at(a, 5.8 + ((RISE.edge - 5.8) * i) / 14))),
    0.35,
    (x, z) => GROUND(x, z) + 0.1,
  );
  return { plain, spiral, rills, stream: streamMaterial("#2bdc8a") };
}

export default function FountainRise() {
  const m = useMemo(build, []);
  const matte = mat("#ffffff", { vertexColors: true, roughness: 0.35 });
  const inlay = mat(GOLD, { roughness: 0.3, metalness: 0.9, emissive: GOLD, emissiveIntensity: 0.4 });
  useEffect(
    () => () => {
      for (const g of [m.plain, m.spiral, m.rills]) g.dispose();
      m.stream.dispose();
    },
    [m],
  );
  useFrame(({ clock }) => {
    const s = live.seal;
    if (Math.hypot(s.x - RISE.x, s.z - RISE.z) > 60) return;
    m.stream.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <>
      <mesh geometry={m.plain} material={matte} receiveShadow />
      <mesh geometry={m.spiral} material={inlay} receiveShadow />
      <mesh geometry={m.rills} material={m.stream} />
    </>
  );
}
