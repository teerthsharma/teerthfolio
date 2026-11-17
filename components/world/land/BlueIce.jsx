"use client";

// THE BLUE ICE (plan 2.3): snow snakes streaming over the polished ice, cryoconite holes, a meteorite in its melt cup and one
// route flag. One vertex-coloured mesh; decals sit 4 cm above heightAt, standing parts stand on it.

import { useMemo } from "react";
import { BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FLAG, HOLES, METEORITE, SNAKES, WIND, decal } from "../../../lib/world/blueice";
import { heightAt } from "../../../lib/world/terrain";
import { C, mat } from "../palette";

const rgb = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };
const ICE = rgb("#f5f9fd");
const HOLE = rgb("#3b4a5c");
const RIM = rgb("#a9d4ee");
const CUP = rgb("#8fc3e0");
const FLAG_RED = rgb("#ff4d6a");

const vert = (x, y, z, c) => [x, y, z, c[0], c[1], c[2]];
const up = (a, b, c) => (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) >= 0;
const tri = (out, a, b, c) => (up(a, b, c) ? out.push(a, b, c) : out.push(a, c, b));
const quad = (out, a, b, c, d) => { tri(out, a, b, c); tri(out, a, c, d); };
const ground = (x, z, lift) => [x, decal(x, z, lift), z];

function toGeo(verts) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(verts.flatMap((v) => v.slice(0, 3)), 3));
  g.setAttribute("color", new Float32BufferAttribute(verts.flatMap((v) => v.slice(3)), 3));
  return g;
}

function painted(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const c = rgb(hex);
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => c).flat(), 3));
  return g;
}

function snake(out, { x, z, dir, len, wide }) {
  const n = Math.max(6, Math.ceil(len));
  const side = [-dir[1], dir[0]];
  const edge = (k, sign) => {
    const t = k / n;
    const w = (wide / 2) * Math.sin(Math.PI * t) ** 0.6;
    const px = x + dir[0] * (t - 0.5) * len + sign * side[0] * w;
    const pz = z + dir[1] * (t - 0.5) * len + sign * side[1] * w;
    return vert(px, decal(px, pz), pz, ICE);
  };
  for (let k = 0; k < n; k++) quad(out, edge(k, 1), edge(k + 1, 1), edge(k + 1, -1), edge(k, -1));
}

function disc(out, x, z, r, c, n, lift = 0.04) {
  const at = (k) => {
    const a = (2 * Math.PI * k) / n;
    return vert(...ground(x + r * Math.cos(a), z + r * Math.sin(a), lift), c);
  };
  const o = vert(...ground(x, z, lift), c);
  for (let k = 0; k < n; k++) tri(out, o, at(k), at(k + 1));
}

function ring(out, x, z, r0, r1, c, n, lift) {
  const at = (k, r) => {
    const a = (2 * Math.PI * k) / n;
    return vert(...ground(x + r * Math.cos(a), z + r * Math.sin(a), lift), c);
  };
  for (let k = 0; k < n; k++) quad(out, at(k, r0), at(k, r1), at(k + 1, r1), at(k + 1, r0));
}

function flag(out) {
  const y = heightAt(FLAG.x, FLAG.z) + FLAG.pole;
  tri(
    out,
    vert(FLAG.x, y - 0.1, FLAG.z, FLAG_RED),
    vert(FLAG.x + 0.7 * WIND[0], y - 0.3, FLAG.z + 0.7 * WIND[1], FLAG_RED),
    vert(FLAG.x, y - 0.5, FLAG.z, FLAG_RED),
  );
}

function blueIce() {
  const out = [];
  for (const s of SNAKES) snake(out, s);
  for (const h of HOLES) {
    disc(out, h.x, h.z, h.r, HOLE, 8);
    ring(out, h.x, h.z, h.r, h.r + 0.06, RIM, 8, 0.06);
  }
  disc(out, METEORITE.x, METEORITE.z, METEORITE.cup, CUP, 12);
  flag(out);
  const rock = new IcosahedronGeometry(0.28, 0).scale(1, 0.7, 1).translate(METEORITE.x, heightAt(METEORITE.x, METEORITE.z) + 0.16, METEORITE.z);
  const pole = new CylinderGeometry(0.035, 0.035, FLAG.pole, 6).translate(FLAG.x, heightAt(FLAG.x, FLAG.z) + FLAG.pole / 2, FLAG.z);
  return mergeGeometries([toGeo(out), painted(rock, C.charcoal), painted(pole, C.wood)]);
}

export default function BlueIce() {
  const geo = useMemo(blueIce, []);
  return <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, roughness: 0.5, side: DoubleSide })} receiveShadow />;
}
