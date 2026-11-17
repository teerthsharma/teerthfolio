"use client";

// THE TENSORFLOW RIG (tensorflow/tensorflow #128930): an oil rig in the sea off the north-east shore (lib/world/land.js
// RIG), four legs on the sea floor, a deck, a derrick, a crane and a flare boom burning at its tip; its pipeline comes
// ashore at the wellhead where the seal reads it. One vertex-coloured mesh, plus the flame and its halo.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Quaternion, RingGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RIG } from "../../../lib/world/land";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { SEA_Y } from "../../../lib/world/terrain";
import { C, glow, lamp, mat } from "../palette";

const WELL = PLACE_BY_ID["pr-tensorflow-128930"];
const ORANGE = "#ff8f00"; // tensorflow's accent: the derrick, the crane, the valve wheels
const STEEL = "#55565f";
const PIPE = "#7d838d";

const painted = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const c = new Color(hex);
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
};
const UP = new Vector3(0, 1, 0);
const strut = (a, b, r, hex, seg = 6, open = r < 0.15) => {
  const A = new Vector3(...a);
  const d = new Vector3(...b).sub(A);
  const g = new CylinderGeometry(r, r, d.length(), seg, 1, open).applyQuaternion(new Quaternion().setFromUnitVectors(UP, d.clone().normalize()));
  return painted(g.translate(A.x + d.x / 2, A.y + d.y / 2, A.z + d.z / 2), hex);
};
const box = (w, h, d, x, y, z, hex) => painted(new BoxGeometry(w, h, d).translate(x, y, z), hex);
const drum = (r, h, x, y, z, hex, seg = 8) => painted(new CylinderGeometry(r, r, h, seg).translate(x, y, z), hex);
const flat = (r0, r1, x, y, z, hex, seg = 12) => painted(new RingGeometry(r0, r1, seg).rotateX(-Math.PI / 2).translate(x, y, z), hex);

// A lattice between two chords a(t) and b(t): the chords (unless shared) and zig-zags at n stations.
const lattice = (a, b, n, r, hex, chords = true) => {
  const out = chords ? [strut(a(0), a(1), r * 1.4, hex, 4), strut(b(0), b(1), r * 1.4, hex, 4)] : [];
  for (let i = 0; i < n; i++) out.push(strut(i % 2 ? a(i / n) : b(i / n), i % 2 ? b((i + 1) / n) : a((i + 1) / n), r, hex, 4));
  return out;
};
const lerp3 = (p, q) => (t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];

const H = RIG.half;
const TOP = RIG.deck + 0.8; // the deck's walking surface
const BOOM_BASE = [-H - 1, TOP + 0.4, -H - 1];
const BOOM_DIR = new Vector3(-0.6, 0.45, -0.66).normalize();
const TIP = new Vector3(...BOOM_BASE).addScaledVector(BOOM_DIR, 10);

function rig() {
  const parts = [];
  const legs = [[-H, -H], [H, -H], [H, H], [-H, H]];
  for (const [x, z] of legs) {
    parts.push(strut([x, -7, z], [x, RIG.deck + 0.1, z], 0.42, STEEL, 8));
    parts.push(flat(0.5, 1.05, x, SEA_Y + 0.06, z, C.foam)); // the swell breaking round each leg
  }
  legs.forEach(([x, z], i) => {
    const [x2, z2] = legs[(i + 1) % 4];
    for (const y of [0.4, 3.6]) parts.push(strut([x, y, z], [x2, y, z2], 0.13, STEEL));
    parts.push(strut([x, 0.4, z], [x2, 3.6, z2], 0.11, STEEL), strut([x2, 0.4, z2], [x, 3.6, z], 0.11, STEEL));
  });
  parts.push(box(10.4, 0.8, 10.4, 0, RIG.deck + 0.4, 0, STEEL), box(10.6, 0.12, 10.6, 0, TOP - 0.06, 0, "#7d808a"));

  // the derrick over the drill floor, tapering, a lattice on every face, the crown block on top
  const [dx, dz] = [1.2, -1.2];
  parts.push(box(3.4, 1.0, 3.4, dx, TOP + 0.5, dz, STEEL));
  const y0 = TOP + 1;
  const y1 = y0 + 13;
  const corner = (sx, sz) => (t) => [dx + sx * (1.3 - 0.85 * t), y0 + (y1 - y0) * t, dz + sz * (1.3 - 0.85 * t)];
  const corners = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
  corners.forEach((a, i) => parts.push(strut(a(0), a(1), 0.09, ORANGE, 4), ...lattice(a, corners[(i + 1) % 4], 6, 0.06, ORANGE, false)));
  for (let k = 1; k <= 6; k++) corners.forEach((a, i) => parts.push(strut(a(k / 6), corners[(i + 1) % 4](k / 6), 0.07, ORANGE, 4)));
  parts.push(box(1.4, 0.7, 1.4, dx, y1 + 0.35, dz, ORANGE));

  // quarters (their lit windows: windows()), the helideck on their roof, the process module and its tanks
  parts.push(box(4.2, 3.0, 3.6, -2.7, TOP + 1.5, 2.9, C.warmWhite));
  parts.push(drum(2.5, 0.16, -3.4, TOP + 3.1, 3.2, "#3a3b42"), flat(1.45, 1.75, -3.4, TOP + 3.2, 3.2, "#f2c230", 16));
  parts.push(box(3.2, 2.0, 3.0, 1.6, TOP + 1.0, 3.2, "#8d929c"));
  for (const z of [-3.7, -2.3]) parts.push(drum(0.55, 2.4, 3.9, TOP + 1.2, z, "#d6d9de"));

  // the crane: pedestal, cab, a lattice boom out over the sea, the hook line
  parts.push(drum(0.5, 2.2, 4.3, TOP + 1.1, 4.3, ORANGE), box(1.3, 1.1, 1.5, 4.3, TOP + 2.75, 4.3, ORANGE));
  const cb = [4.6, TOP + 3.0, 4.2];
  const cd = new Vector3(0.94 * 0.85, 0.53, -0.34 * 0.85).normalize();
  const ct = new Vector3(...cb).addScaledVector(cd, 9).toArray();
  parts.push(...lattice(lerp3(cb, ct), lerp3([cb[0], cb[1] + 0.55, cb[2]], [ct[0], ct[1] + 0.2, ct[2]]), 6, 0.06, ORANGE));
  parts.push(strut(ct, [ct[0], ct[1] - 3.6, ct[2]], 0.03, STEEL, 4), box(0.35, 0.45, 0.35, ct[0], ct[1] - 3.8, ct[2], STEEL));

  // the flare boom off the north-west corner, its burner at the tip
  const side = new Vector3().crossVectors(BOOM_DIR, UP).normalize().multiplyScalar(0.3);
  const t0 = new Vector3(...BOOM_BASE);
  parts.push(...lattice(lerp3(t0.clone().add(side).toArray(), TIP.clone().add(side).toArray()), lerp3(t0.clone().sub(side).add(UP.clone().multiplyScalar(0.5)).toArray(), TIP.clone().sub(side).toArray()), 10, 0.05, "#c9ccd2"));
  parts.push(drum(0.24, 0.6, TIP.x, TIP.y + 0.3, TIP.z, STEEL, 6));

  // ashore: the wellhead where the pipeline lands, a valve stack on a concrete pad
  const [wx, wz] = [WELL.x - RIG.x, WELL.z - RIG.z];
  parts.push(drum(1.95, 0.16, wx, 0.08, wz, "#c3c6cc", 10), drum(0.22, 1.6, wx, 0.95, wz, PIPE));
  for (const y of [0.4, 0.95, 1.5]) parts.push(drum(0.36, 0.1, wx, y, wz, "#5d626b", 10));
  for (const y of [0.95, 1.5]) parts.push(strut([wx, y, wz + 0.2], [wx, y, wz + 0.36], 0.04, PIPE, 4), painted(new TorusGeometry(0.26, 0.045, 4, 10).translate(wx, y, wz + 0.38), ORANGE));
  parts.push(strut([wx, 1.22, wz], [wx - 0.95, 1.22, wz], 0.12, PIPE), strut([wx - 0.64, 1.22, wz], [wx - 0.56, 1.22, wz], 0.22, "#5d626b", 8));
  parts.push(strut([wx - 0.6, 1.22, wz], [wx - 0.6, 1.45, wz], 0.04, PIPE, 4), painted(new TorusGeometry(0.2, 0.04, 4, 10).rotateX(Math.PI / 2).translate(wx - 0.6, 1.48, wz), ORANGE), drum(0.28, 0.22, wx, 1.86, wz, ORANGE));
  parts.push(strut([wx, 0.42, wz], [wx, 0.42, wz - 1.55], 0.2, PIPE), strut([wx, 0.62, wz - 1.55], [wx, -0.6, wz - 1.55], 0.2, PIPE), strut([wx, 0.42, wz - 0.95], [wx, 0.42, wz - 0.85], 0.3, "#5d626b", 8));

  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

// Two rows of the quarters' windows, on the faces the island's camera sees (south and west).
function windows() {
  const panes = [];
  for (const y of [TOP + 0.9, TOP + 2.0]) {
    for (let i = 0; i < 5; i++) panes.push(new BoxGeometry(0.5, 0.36, 0.05).translate(-4.25 + i * 0.84, y, 4.72));
    for (let i = 0; i < 4; i++) panes.push(new BoxGeometry(0.05, 0.36, 0.5).translate(-4.82, y, 1.55 + i * 0.9));
  }
  return mergeGeometries(panes);
}

const FLAME = new ConeGeometry(0.55, 2.2, 6).translate(0, 1.1, 0);
const HALO = new IcosahedronGeometry(1.5, 1);

export default function OilRig() {
  const geo = useMemo(rig, []);
  const glass = useMemo(windows, []);
  const flame = useRef(null);
  const steel = mat("#ffffff", { vertexColors: true, roughness: 0.6, metalness: 0.2 });
  const fire = lamp("#ffb347", 2.2);
  const halo = glow("#ff9a3c", 0.22);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flame.current) flame.current.scale.set(1 + 0.08 * Math.sin(t * 7.3), 1 + 0.14 * Math.sin(t * 9.1) + 0.08 * Math.sin(t * 15.7), 1 + 0.08 * Math.cos(t * 6.1));
  });
  return (
    <group position={[RIG.x, 0, RIG.z]}>
      <mesh geometry={geo} material={steel} castShadow receiveShadow />
      <mesh geometry={glass} material={lamp()} />
      <group position={[TIP.x, TIP.y + 0.6, TIP.z]}>
        <mesh ref={flame} geometry={FLAME} material={fire} />
        <mesh geometry={HALO} material={halo} position={[0, 1.2, 0]} />
      </group>
    </group>
  );
}
