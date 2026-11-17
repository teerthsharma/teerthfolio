"use client";

// THE OLD DELTA (issue #77, the south quarter): frost-cracked polygons, a moraine arc with its 9 m breach, a whale skeleton.
// Two merged meshes: the ground (laid on heightAt) and the stones and bones (standing on heightAt, casting shadows).

import { useMemo } from "react";
import { BoxGeometry, BufferGeometry, CircleGeometry, Color, Float32BufferAttribute, IcosahedronGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ACROSS, CRACKS, DISC_R, RIBS, SKULL, STONES, strip, VERTEBRAE } from "../../../lib/world/delta";
import { heightAt } from "../../../lib/world/terrain";
import { mat } from "../palette";

const BONE = "#e9e2d3";
const CRACK = "#b9c9da";
const GRANITE = "#b9aea8";
const DARK = "#62636f";
const SNOW = "#f0f2f7";
const SKY = 0.55; // a boulder face whose normal is steeper than this is snow-capped

const painted = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new Color(hex);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
};

function ribbon(pl) {
  const pts = strip(pl);
  const idx = [];
  for (let i = 0; i + 3 < pts.length; i += 2) idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pts.flatMap(([x, z]) => [x, heightAt(x, z) + 0.06, z]), 3));
  g.setIndex(idx);
  return painted(g, CRACK);
}

function disc({ x, z }) {
  const g = new CircleGeometry(DISC_R, 10).rotateX(-Math.PI / 2).translate(x, 0, z);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)) + 0.04);
  return painted(g, BONE);
}

function boulder({ x, z, r, dark, cap }, i) {
  const g = new IcosahedronGeometry(1, 0).scale(r, 0.7 * r, r).rotateY(i * 1.3).translate(x, heightAt(x, z) + 0.55 * r, z);
  const p = g.attributes.position;
  const rock = new Color(dark ? DARK : GRANITE);
  const snow = new Color(SNOW);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const n = new Vector3();
  const d = new Vector3();
  const colors = [];
  for (let f = 0; f < p.count; f += 3) {
    a.fromBufferAttribute(p, f);
    b.fromBufferAttribute(p, f + 1);
    c.fromBufferAttribute(p, f + 2);
    n.subVectors(b, a).cross(d.subVectors(c, a)).normalize();
    const k = cap && n.y > SKY ? snow : rock;
    for (let v = 0; v < 3; v++) colors.push(k.r, k.g, k.b);
  }
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  return g.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

function skull() {
  const { x, z, dir, len, wide, high } = SKULL;
  const g = new BoxGeometry(len, high, wide).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getX(i) + len / 2) / len;
    p.setY(i, (p.getY(i) + high / 2) * (1 - 0.5 * t));
    p.setZ(i, p.getZ(i) * (1 - 0.6 * t));
  }
  return painted(g.rotateY(Math.atan2(-dir[1], dir[0])).translate(x, heightAt(x, z), z), BONE);
}

function rib({ x, z, s }) {
  const g = new TorusGeometry(1.3, 0.09, 5, 10, Math.PI).scale(s, s, s).rotateY(Math.atan2(-ACROSS[1], ACROSS[0])).translate(x, heightAt(x, z), z);
  return painted(g, BONE);
}

function groundGeometry() {
  const g = mergeGeometries([...CRACKS.map(ribbon), ...VERTEBRAE.map(disc)]);
  g.computeVertexNormals();
  return g;
}

function stoneGeometry() {
  const g = mergeGeometries([skull(), ...RIBS.map(rib), ...STONES.map(boulder)]);
  g.computeVertexNormals();
  return g;
}

export default function Delta() {
  const ground = useMemo(groundGeometry, []);
  const stones = useMemo(stoneGeometry, []);
  const surface = mat("#ffffff", { vertexColors: true, roughness: 0.7 });
  return (
    <>
      <mesh geometry={ground} material={surface} receiveShadow />
      <mesh geometry={stones} material={surface} castShadow receiveShadow />
    </>
  );
}
