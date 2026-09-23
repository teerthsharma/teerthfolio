"use client";

// Building for PLACE_BY_ID["kernel"]: Epsilon-Hollow, an OS where memory,
// files and the scheduler live as points on one sphere. A chunky server hut
// on four fat stilts, two big fans on its face, and a glassy globe of live
// state cradled on its roof.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (3.4).

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Object3D, Quaternion, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, lamp, mat } from "../palette";

const TAU = Math.PI * 2;
const STILT_X = [-1.95, 1.95];
const STILT_Z = [-1.05, 1.05];
const FAN_X = [-1.25, 1.25];
const FAN_Y = 2.4;
const HOUSING_Z = 1.36;
const ROTOR_Z = 1.58; // proud of the housing's front face, so the blades read
const BLADE_LEN = 0.72; // spec's 0.95 clips the door at this fan spacing; trimmed
const DOT_COUNT = 14;
const DOT_RADIUS = 0.87;

// ---- geometry builders: run once (useMemo), never inside useFrame ----

function box(w, h, d, [x, y, z], rot) {
  const g = new BoxGeometry(w, h, d);
  if (rot) {
    const [rx, ry, rz] = rot;
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
  }
  g.translate(x, y, z);
  return g;
}

function cyl(r, h, [x, y, z], rot) {
  const g = new CylinderGeometry(r, r, h, 8);
  if (rot) {
    const [rx, ry, rz] = rot;
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
  }
  g.translate(x, y, z);
  return g;
}

// A box stretched between two points, for the diagonal stilt braces.
function strut(section, a, b) {
  const p1 = new Vector3(...a);
  const p2 = new Vector3(...b);
  const mid = p1.clone().add(p2).multiplyScalar(0.5);
  const g = new BoxGeometry(section, section, p1.distanceTo(p2));
  const dir = p2.clone().sub(p1).normalize();
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir));
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

function buildCharcoal() {
  const parts = [];
  for (const x of STILT_X) {
    for (const z of STILT_Z) {
      parts.push(box(0.34, 1.1, 0.34, [x, 0.55, z])); // stilt
      parts.push(box(0.6, 0.12, 0.6, [x, 0.06, z])); // foot pad
    }
    parts.push(strut(0.16, [x, 0.1, STILT_Z[0]], [x, 1.1, STILT_Z[1]]));
    parts.push(strut(0.16, [x, 1.1, STILT_Z[0]], [x, 0.1, STILT_Z[1]]));
  }

  // proud edge ribs along all 12 edges of the 4.6 x 2.4 x 2.6 hut box
  const hx = 2.3, hy = 1.2, hz = 1.3, hutY = 2.3;
  for (const y of [hutY - hy, hutY + hy]) {
    for (const z of [-hz, hz]) parts.push(box(4.6, 0.16, 0.16, [0, y, z]));
  }
  for (const x of [-hx, hx]) {
    for (const z of [-hz, hz]) parts.push(box(0.16, 2.4, 0.16, [x, hutY, z]));
  }
  for (const x of [-hx, hx]) {
    for (const y of [hutY - hy, hutY + hy]) parts.push(box(0.16, 0.16, 2.6, [x, y, 0]));
  }

  parts.push(box(4.9, 0.2, 2.9, [0, 3.6, 0])); // roof slab
  for (const x of FAN_X) parts.push(cyl(0.62, 0.24, [x, FAN_Y, HOUSING_Z], [Math.PI / 2, 0, 0])); // fan housing

  const cradle = new TorusGeometry(0.75, 0.14, 6, 14);
  cradle.rotateX(Math.PI / 2);
  cradle.translate(0, 3.85, 0);
  parts.push(cradle);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 2;
    parts.push(cyl(0.08, 0.3, [Math.cos(a) * 0.55, 3.72, Math.sin(a) * 0.55]));
  }

  return mergeGeometries(parts);
}

function buildWood() {
  const start = [0, 0.2, 2.3];
  const end = [0, 0.95, 1.7];
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    parts.push(box(0.9, 0.32, 0.45, [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t,
    ]));
  }
  return mergeGeometries(parts);
}

function buildIndicators() {
  const parts = [];
  const n = 8, spread = 3.4;
  for (let i = 0; i < n; i++) {
    parts.push(box(0.2, 0.14, 0.05, [-spread / 2 + (spread / (n - 1)) * i, 1.45, 1.39]));
  }
  return mergeGeometries(parts);
}

function buildHubs() {
  return mergeGeometries(FAN_X.map((x) => {
    const g = new IcosahedronGeometry(0.16, 0);
    g.translate(x, FAN_Y, ROTOR_Z);
    return g;
  }));
}

function buildBlade() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const g = new BoxGeometry(BLADE_LEN, 0.26, 0.06);
    g.translate(BLADE_LEN / 2, 0, 0); // radial: root at hub, tip outward
    g.rotateX((15 * Math.PI) / 180); // pitch, about its own long axis
    g.rotateZ((i / 4) * TAU);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

function fibonacciSphere(n, r) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push(new Vector3(Math.cos(theta) * rr, y, Math.sin(theta) * rr).multiplyScalar(r));
  }
  return pts;
}

const dummy = new Object3D();
const tmpV = new Vector3();
const smooth = (p) => p * p * (3 - 2 * p);

function setDotAt(mesh, i, pos, scale) {
  dummy.position.copy(pos);
  dummy.scale.setScalar(Math.max(scale, 0.0001));
  dummy.rotation.set(0, 0, 0);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

export default function KernelVault({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);
  const kRef = useRef(0);

  const charcoalGeo = useMemo(buildCharcoal, []);
  const woodGeo = useMemo(buildWood, []);
  const indicatorGeo = useMemo(buildIndicators, []);
  const hubGeo = useMemo(buildHubs, []);
  const bladeGeo = useMemo(buildBlade, []);

  const charcoalMat = mat(C.charcoal);
  const iceMat = mat(C.ice);
  const globeMat = mat(C.ice, { roughness: 0.35 });
  const woodMat = mat(C.wood);
  const glassMat = mat("#2a2e3a");
  const doorMat = mat(A);
  const bladeMat = mat(A);
  const windowMat = lamp(C.lamp);
  const indicatorMat = lamp(A, 1.2);
  const hubMat = mat(C.warmWhite);
  const dotMat = useMemo(() => lamp(A, 1.3).clone(), [A]);

  // Fixed "home" address for every dot: eviction folds one onto its nearest
  // neighbour and it always grows back at this same address, so the shape
  // never changes, only the pulse of a fold-and-refill travels through it.
  const dotHome = useMemo(() => fibonacciSphere(DOT_COUNT, DOT_RADIUS), []);
  const nearest = useMemo(() => dotHome.map((p, i) => {
    let bestJ = (i + 1) % DOT_COUNT, bestD = -Infinity;
    for (let j = 0; j < DOT_COUNT; j++) {
      if (j === i) continue;
      const d = p.dot(dotHome[j]);
      if (d > bestD) { bestD = d; bestJ = j; }
    }
    return bestJ;
  }), [dotHome]);

  const fanA = useRef();
  const fanB = useRef();
  const globeGroup = useRef();
  const dotsMesh = useRef();
  const evict = useRef({ dot: 0, phase: "idle", t: 0 });
  const evictTimer = useRef(0);

  useEffect(() => {
    const m = dotsMesh.current;
    if (!m) return;
    dotHome.forEach((p, i) => setDotAt(m, i, p, 1));
    m.instanceMatrix.needsUpdate = true;
  }, [dotHome]);

  useFrame((_, dt) => {
    const target = near ? 1 : 0;
    kRef.current += (target - kRef.current) * (1 - Math.exp(-4 * dt));
    const k = kRef.current;

    const fanSpeed = TAU * (0.6 + 2.4 * k); // 0.6 -> 3 rev/s
    if (fanA.current) fanA.current.rotation.z += fanSpeed * dt;
    if (fanB.current) fanB.current.rotation.z += fanSpeed * dt;

    if (globeGroup.current) globeGroup.current.rotation.y += 0.15 * dt;
    dotMat.emissiveIntensity = 1.3 + 0.9 * k;

    const m = dotsMesh.current;
    if (!m) return;

    const interval = 2.5 - 1.3 * k; // 2.5s idle -> 1.2s near
    evictTimer.current += dt;
    const ev = evict.current;
    if (evictTimer.current >= interval) {
      evictTimer.current = 0;
      if (ev.phase !== "idle") setDotAt(m, ev.dot, dotHome[ev.dot], 1); // finish any interrupted fold
      ev.dot = Math.floor(Math.random() * DOT_COUNT);
      ev.phase = "slide";
      ev.t = 0;
    }

    if (ev.phase === "slide") {
      ev.t += dt;
      const p = Math.min(ev.t / 0.8, 1);
      const e = smooth(p);
      tmpV.copy(dotHome[ev.dot]).lerp(dotHome[nearest[ev.dot]], e);
      if (tmpV.lengthSq() > 0) tmpV.normalize().multiplyScalar(DOT_RADIUS); // stay on the sphere
      setDotAt(m, ev.dot, tmpV, 1 - e);
      if (p >= 1) { ev.phase = "grow"; ev.t = 0; }
    } else if (ev.phase === "grow") {
      ev.t += dt;
      const p = Math.min(ev.t / 0.5, 1);
      setDotAt(m, ev.dot, dotHome[ev.dot], smooth(p));
      if (p >= 1) ev.phase = "idle";
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh castShadow receiveShadow geometry={charcoalGeo} material={charcoalMat} />
      <mesh castShadow receiveShadow geometry={woodGeo} material={woodMat} />
      <mesh geometry={indicatorGeo} material={indicatorMat} />
      <mesh geometry={hubGeo} material={hubMat} />

      <mesh castShadow receiveShadow position={[0, 2.3, 0]} material={iceMat}>
        <boxGeometry args={[4.6, 2.4, 2.6]} />
      </mesh>
      <mesh position={[0, 2.0, 1.34]} material={doorMat}>
        <boxGeometry args={[0.9, 1.8, 0.08]} />
      </mesh>
      <mesh position={[0, 2.4, 1.4]} material={windowMat}>
        <boxGeometry args={[0.4, 0.3, 0.03]} />
      </mesh>
      <mesh position={[0, 1.45, 1.33]} material={glassMat}>
        <boxGeometry args={[4.0, 0.3, 0.06]} />
      </mesh>

      <mesh ref={fanA} castShadow position={[FAN_X[0], FAN_Y, ROTOR_Z]} geometry={bladeGeo} material={bladeMat} />
      <mesh ref={fanB} castShadow position={[FAN_X[1], FAN_Y, ROTOR_Z]} geometry={bladeGeo} material={bladeMat} />

      <group ref={globeGroup} position={[0, 4.6, 0]}>
        <mesh castShadow receiveShadow material={globeMat}>
          <icosahedronGeometry args={[0.85, 2]} />
        </mesh>
        <instancedMesh ref={dotsMesh} args={[undefined, undefined, DOT_COUNT]} material={dotMat}>
          <icosahedronGeometry args={[0.13, 1]} />
        </instancedMesh>
      </group>
    </group>
  );
}
