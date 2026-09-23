"use client";

// The LAB BUILDING for Epsilon-Hollow (place id p-epsilon-hollow): a bare
// metal OS whose memory, files and scheduler live as points on a sphere
// (data/showcase.json's figure.desc, teerthsharma.github.io/fig.js's
// "collapse —"). The everyday building whose job this performs, done
// spectacularly: an OBSERVATORY — a geodesic globe raised on a tripod over a
// plaza, exactly like a world's-fair planetarium, except this globe really
// is hollow and you can see every one of its points and how they move.
//
// The globe's struts and joints ARE the figure's triangulated unit sphere
// (components/world/monuments/parts/collapse-sphere.js: an icosphere, same
// construction as fig.js's own subdivision), tinted by territory (memory
// blue, files violet, scheduler mint — fig.js's own hex values, kept exact).
// A finer sphere turns the other way inside it around a bare-metal core:
// Epsilon, the context-teleport receptacle, in the place's radiation colour.
// A handful of facets flash coral in turn — an eviction, a point folding
// onto its neighbour, "the only filled shapes in the figure" — and a small
// bright payload rides a fixed thread of light from one point on the shell,
// through the hollow centre, to the point almost opposite, every crossing
// the same duration however far it looks. A ring of motes orbits the globe:
// the kernel's day job is machine learning, so its queries never stop.
//
// Local origin: the snow at the place centre (no plinth); +z faces the
// camera and the dock, so the tripod leaves that side open.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { clamp, smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { buildCollapse } from "./parts/collapse-sphere";

// fig.js's own palette (site.css --blue-500 / --violet-500 / --mint-500 /
// --coral-500), kept exact: the territories and the one eviction colour.
const BLUE = "#2456dc"; // memory
const VIOLET = "#a66cf0"; // files
const MINT = "#0b93ab"; // the scheduler
const CORAL = "#d9376e"; // eviction

const OUTER_R = 1.5;
const INNER_R = 0.6;
const CORE_Y = 2.65; // height of the globe's own centre above the snow
const STRUT_R = 0.065;
const INNER_STRUT_R = 0.075; // a shade chunkier than the outer shell: Epsilon reads as the important mechanism, not a fourth territory
const BEAD_R = 0.115;
const FOLD_COUNT = 4;

const PLATFORM_R = 1.7;
const PLATFORM_H = 0.2;
const LEG_COUNT = 3;
const LEG_TOP_R = 0.11;
const LEG_BOT_R = 0.17;
// three legs, none at +z (0 rad from front): the dock side stays open.
const LEG_ANGLE = (i) => Math.PI / 2 + i * ((Math.PI * 2) / LEG_COUNT);
const LEG_TOP = { r: OUTER_R * 0.68, y: CORE_Y - OUTER_R * 0.72 };
const LEG_BOT = { r: PLATFORM_R * 0.76, y: PLATFORM_H };

const RIM_LAMP_N = 10;

// The sculpture's geometry: pure, deterministic, built once at module scope
// (matches parts/collapse-sphere.js's own contract — no dependency on props).
const SCENE = buildCollapse({
  outerDetail: 1,
  innerDetail: 0,
  outerR: OUTER_R,
  innerR: INNER_R,
  foldCount: FOLD_COUNT,
  territoryHex: [BLUE, VIOLET, MINT],
});

const UPV = new Vector3(0, 1, 0);

// Every strut and leg is a unit cylinder along Y, centred at the origin:
// placing one between two points is a position + quaternion + scale.y.
function segment(dummy, qTmp, vTmp, ax, ay, az, bx, by, bz) {
  vTmp.set(bx - ax, by - ay, bz - az);
  const len = vTmp.length() || 0.001;
  vTmp.normalize();
  qTmp.setFromUnitVectors(UPV, vTmp);
  dummy.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  dummy.quaternion.copy(qTmp);
  dummy.scale.set(1, len, 1);
  dummy.updateMatrix();
}

function pos(angle, radius, y) {
  return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
}

// The ring of orbiting motes — fig.js's own "ring of token traffic": two
// bands, laid out once (the whole ring then spins as one group).
const RING = (() => {
  const bands = [
    { r: OUTER_R * 1.2, y: 0.08, n: 9, off: 0 },
    { r: OUTER_R * 1.34, y: -0.07, n: 9, off: 1 },
  ];
  const items = [];
  for (const b of bands) {
    for (let i = 0; i < b.n; i++) {
      const a = (i / b.n) * Math.PI * 2;
      items.push({ x: Math.cos(a) * b.r, y: b.y, z: Math.sin(a) * b.r, terr: (i + b.off) % 3 });
    }
  }
  return items;
})();

// Rim lamps: the platform's "windows" — short bollards standing on its edge
// so their glow reads from the island's looking-down camera, in the
// radiation colour (see below).
const RIM_LAMP_H = 0.24;
const RIM_LAMPS = Array.from({ length: RIM_LAMP_N }, (_, i) => {
  const a = (i / RIM_LAMP_N) * Math.PI * 2;
  return [Math.sin(a) * PLATFORM_R * 0.94, PLATFORM_H + RIM_LAMP_H / 2, Math.cos(a) * PLATFORM_R * 0.94, a];
});

// Geometry, built once and shared (never allocated inside render/useFrame).
const strutGeo = new CylinderGeometry(STRUT_R, STRUT_R, 1, 6);
const innerStrutGeo = new CylinderGeometry(INNER_STRUT_R, INNER_STRUT_R, 1, 6);
const beadGeo = new IcosahedronGeometry(BEAD_R, 0);
const legGeo = new CylinderGeometry(LEG_TOP_R, LEG_BOT_R, 1, 8);
const platformGeo = new CylinderGeometry(PLATFORM_R, PLATFORM_R * 1.06, PLATFORM_H, 28);
const moteGeo = new IcosahedronGeometry(0.075, 0);
const coreGeo = new IcosahedronGeometry(0.26, 1);
const innerGlowGeo = new IcosahedronGeometry(INNER_R * 1.1, 1);
const payloadGeo = new IcosahedronGeometry(0.13, 0);
const rimLampGeo = new CylinderGeometry(0.05, 0.06, RIM_LAMP_H, 6);
const threadGeo = new CylinderGeometry(0.032, 0.032, 1, 6);

const foldGeoms = SCENE.folds.map((f) => {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(f.verts, 3));
  geo.computeVertexNormals();
  return geo;
});

// The teleport thread: fixed once (start -> end run through the hollow
// centre), never rebuilt — only the payload riding it moves.
const threadDir = new Vector3(
  SCENE.travel.end[0] - SCENE.travel.start[0],
  SCENE.travel.end[1] - SCENE.travel.start[1],
  SCENE.travel.end[2] - SCENE.travel.start[2],
);
const threadLen = threadDir.length();
threadDir.normalize();
const threadQuat = new Quaternion().setFromUnitVectors(UPV, threadDir);
const threadMid = [
  (SCENE.travel.start[0] + SCENE.travel.end[0]) / 2,
  (SCENE.travel.start[1] + SCENE.travel.end[1]) / 2,
  (SCENE.travel.start[2] + SCENE.travel.end[2]) / 2,
];

const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const PAYLOAD_PERIOD = 3.4; // s: one crossing, either direction — fig.js: "every jump takes the same time"

export default function Collapse({ place, near }) {
  const accent = place.radiation ?? place.color;

  const outerSpin = useRef();
  const innerSpin = useRef();
  const ringSpin = useRef();
  const strutMesh = useRef();
  const beadMesh = useRef();
  const innerMesh = useRef();
  const legMesh = useRef();
  const moteMesh = useRef();
  const rimLampMesh = useRef();
  const payloadRef = useRef();

  const strutMat = useMemo(() => mat("#ffffff", { roughness: 0.35, metalness: 0.05 }), []);
  const beadMat = useMemo(() => mat("#ffffff", { roughness: 0.55, metalness: 0 }), []);
  // Epsilon reads as light, not as a fourth territory: a strong emissive
  // floor keeps it legible even when the accent colour is itself a blue,
  // close to the outer shell's own "memory" territory.
  const innerMat = useMemo(() => mat(accent, { roughness: 0.2, metalness: 0.1, emissive: accent, emissiveIntensity: 1.1 }).clone(), [accent]);
  const legMat = useMemo(() => mat(C.charcoal, { roughness: 0.55, metalness: 0.1 }), []);
  const platformMat = useMemo(() => mat(C.warmWhite, { roughness: 0.85 }), []);
  const moteMat = useMemo(() => mat("#ffffff", { roughness: 0.4, emissive: "#ffffff", emissiveIntensity: 0.3 }), []);
  const rimLampMat = useMemo(() => lamp(accent, 1).clone(), [accent]);
  const coreMat = useMemo(() => lamp(C.lamp, 1.2).clone(), []);
  const payloadMat = useMemo(() => mat(accent, { roughness: 0.2, emissive: accent, emissiveIntensity: 1.1 }).clone(), [accent]);
  const threadMat = useMemo(
    () => new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [accent],
  );
  const foldMats = useMemo(() => foldGeoms.map(() => mat(CORAL, { roughness: 0.4, emissive: CORAL, emissiveIntensity: 0.35 }).clone()), []);

  // Layout: every strut, bead, leg, mote and lamp is placed exactly once —
  // none of this geometry ever changes shape, only colours and materials
  // animate per frame.
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const qTmp = new Quaternion();
    const vTmp = new Vector3();
    const scratch = new Color();

    const { positions: ep, colors: ec } = SCENE.outer;
    const edgeCount = ep.length / 6;
    if (strutMesh.current) {
      for (let i = 0; i < edgeCount; i++) {
        const b = i * 6;
        segment(dummy, qTmp, vTmp, ep[b], ep[b + 1], ep[b + 2], ep[b + 3], ep[b + 4], ep[b + 5]);
        strutMesh.current.setMatrixAt(i, dummy.matrix);
        strutMesh.current.setColorAt(i, scratch.setRGB(ec[b], ec[b + 1], ec[b + 2]));
      }
      strutMesh.current.instanceMatrix.needsUpdate = true;
      if (strutMesh.current.instanceColor) strutMesh.current.instanceColor.needsUpdate = true;
    }

    const { positions: pp, colors: pc, count: beadCount } = SCENE.points;
    if (beadMesh.current) {
      for (let i = 0; i < beadCount; i++) {
        dummy.position.set(pp[i * 3], pp[i * 3 + 1], pp[i * 3 + 2]);
        dummy.quaternion.identity();
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        beadMesh.current.setMatrixAt(i, dummy.matrix);
        beadMesh.current.setColorAt(i, scratch.setRGB(pc[i * 3], pc[i * 3 + 1], pc[i * 3 + 2]));
      }
      beadMesh.current.instanceMatrix.needsUpdate = true;
      if (beadMesh.current.instanceColor) beadMesh.current.instanceColor.needsUpdate = true;
    }

    const { positions: ip } = SCENE.inner;
    const innerEdgeCount = ip.length / 6;
    if (innerMesh.current) {
      for (let i = 0; i < innerEdgeCount; i++) {
        const b = i * 6;
        segment(dummy, qTmp, vTmp, ip[b], ip[b + 1], ip[b + 2], ip[b + 3], ip[b + 4], ip[b + 5]);
        innerMesh.current.setMatrixAt(i, dummy.matrix);
      }
      innerMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (legMesh.current) {
      for (let i = 0; i < LEG_COUNT; i++) {
        const a = LEG_ANGLE(i);
        const [bx, by, bz] = pos(a, LEG_BOT.r, LEG_BOT.y);
        const [tx, ty, tz] = pos(a, LEG_TOP.r, LEG_TOP.y);
        segment(dummy, qTmp, vTmp, bx, by, bz, tx, ty, tz);
        legMesh.current.setMatrixAt(i, dummy.matrix);
      }
      legMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (moteMesh.current) {
      RING.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.quaternion.identity();
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        moteMesh.current.setMatrixAt(i, dummy.matrix);
        moteMesh.current.setColorAt(i, scratch.set(it.terr === 0 ? BLUE : it.terr === 1 ? VIOLET : MINT));
      });
      moteMesh.current.instanceMatrix.needsUpdate = true;
      if (moteMesh.current.instanceColor) moteMesh.current.instanceColor.needsUpdate = true;
    }

    if (rimLampMesh.current) {
      RIM_LAMPS.forEach(([x, y, z, a], i) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        rimLampMesh.current.setMatrixAt(i, dummy.matrix);
      });
      rimLampMesh.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame((state, dt) => {
    const speed = near ? 1.7 : 1;
    const bright = near ? 1.35 : 1;
    const t = state.clock.elapsedTime;

    if (outerSpin.current) outerSpin.current.rotation.y += dt * 0.09 * speed;
    if (innerSpin.current) innerSpin.current.rotation.y -= dt * 0.22 * speed;
    if (ringSpin.current) ringSpin.current.rotation.y += dt * 0.3 * speed;

    // eviction: the facets take turns flashing coral, staggered around one
    // shared cycle — "the population thins, the shape never changes".
    const cycle = 5.2 / speed;
    foldMats.forEach((m, i) => {
      const phase = ((t + (i * cycle) / foldMats.length) % cycle) / cycle;
      const flash = bump(phase, 0.08, 0.09);
      m.opacity = clamp(0.05 + flash * 0.95, 0, 1);
      m.emissiveIntensity = (0.25 + flash * 1.6) * bright;
    });

    // the teleport: a payload shuttles start -> end -> start through the
    // hollow, unfolding (a brief pop) as it arrives at either end.
    const p = ((t * speed) % (PAYLOAD_PERIOD * 2)) / PAYLOAD_PERIOD;
    const raw = p < 1 ? p : 2 - p;
    const travelT = smoothstep(0, 1, raw);
    const pop = bump(raw, 0, 0.07) + bump(raw, 1, 0.07);
    if (payloadRef.current) {
      payloadRef.current.position.set(
        SCENE.travel.start[0] + (SCENE.travel.end[0] - SCENE.travel.start[0]) * travelT,
        SCENE.travel.start[1] + (SCENE.travel.end[1] - SCENE.travel.start[1]) * travelT,
        SCENE.travel.start[2] + (SCENE.travel.end[2] - SCENE.travel.start[2]) * travelT,
      );
      payloadRef.current.scale.setScalar(1 + pop * 0.9);
    }
    payloadMat.emissiveIntensity = (1 + pop * 1.8) * bright;
    threadMat.opacity = (0.22 + pop * 0.35) * bright;

    // the bare metal core: burning, steady.
    coreMat.emissiveIntensity = (1.1 + 0.25 * Math.sin(t * 2.3)) * bright;
    innerMat.emissiveIntensity = (1.05 + 0.35 * Math.sin(t * 1.7)) * bright;
    rimLampMat.emissiveIntensity = (0.9 + 0.2 * Math.sin(t * 1.3 + 1)) * bright;
  });

  return (
    <group>
      {/* the plaza: a platform on tripod legs, exactly like a world's-fair
          observatory, three legs so the dock side (+z) stays open */}
      <mesh position={[0, PLATFORM_H / 2, 0]} castShadow receiveShadow material={platformMat} geometry={platformGeo} />
      <instancedMesh ref={legMesh} args={[legGeo, legMat, LEG_COUNT]} castShadow receiveShadow />
      <instancedMesh ref={rimLampMesh} args={[rimLampGeo, rimLampMat, RIM_LAMP_N]} />

      {/* the globe: OS state as a hollow, triangulated planet */}
      <group position={[0, CORE_Y, 0]}>
        <group ref={outerSpin}>
          <instancedMesh ref={strutMesh} args={[strutGeo, strutMat, SCENE.outer.positions.length / 6]} castShadow />
          <instancedMesh ref={beadMesh} args={[beadGeo, beadMat, SCENE.points.count]} castShadow />
          {foldGeoms.map((geo, i) => (
            <mesh key={i} position={SCENE.folds[i].centroid} geometry={geo} material={foldMats[i]} />
          ))}
        </group>

        {/* Epsilon: the finer hollow sphere, turning the other way, around
            the bare metal at the centre */}
        <group ref={innerSpin}>
          <instancedMesh ref={innerMesh} args={[innerStrutGeo, innerMat, SCENE.inner.positions.length / 6]} castShadow />
          <mesh geometry={innerGlowGeo} material={glow(accent, 0.22)} />
        </group>
        <mesh geometry={coreGeo} material={coreMat} />

        {/* the file's payload: rides a fixed thread of light through the
            hollow, the same duration however far it looks */}
        <mesh position={threadMid} quaternion={threadQuat} scale={[1, threadLen, 1]} geometry={threadGeo} material={threadMat} />
        <mesh ref={payloadRef} geometry={payloadGeo} material={payloadMat} />

        {/* the ring: token traffic, because the kernel's day job is machine
            learning */}
        <group ref={ringSpin}>
          <instancedMesh ref={moteMesh} args={[moteGeo, moteMat, RING.length]} />
        </group>
      </group>
    </group>
  );
}
