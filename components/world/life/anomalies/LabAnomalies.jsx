"use client";

// THE LAB AREAS' ANOMALIES: every one of the eleven radioactive lab areas
// gets one thing from ordinary life, visibly wrong in a charming way,
// echoing its project's own tagline/claim (data/showcase.json). No two use
// the same trick. Each sits at its area's hot spot, clear of the building
// (place.radius 3) and its dock (+z), a few metres behind or beside it.
// Livelier when the seal is in the area (RADIATION_RADIUS), settling while
// it meditates (live.seal.calm) -- see areaPulse() below.
//
// Mounted once, globally, from Districts.jsx (world-space groups, one per
// lab place) -- the same pattern as Radiation.jsx's motes.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLACES, RADIATION_RADIUS } from "../../../../lib/world/places";
import { live } from "../../../../lib/world/store";
import { mulberry32 } from "../spawn";
import { damp, easeOutBack, smoothstep } from "../util";
import { C, glow, lamp, mat } from "../../palette";

// Livelier when the seal stands in this area; settles toward stillness the
// deeper it meditates there (live.seal.calm, 0..1). Never fully freezes.
function areaPulse(place) {
  const s = live.seal;
  if (Math.hypot(s.x - place.x, s.z - place.z) >= RADIATION_RADIUS) return 1;
  return 1.5 - (live.seal.calm || 0) * 1.15;
}

const dummy = new Object3D();

// ---------------------------------------------------------------- resolvent
// "Attention and Markov paths share one operator." Two orbs trace different
// loops -- a circle and a lemniscate -- both parametrised by the same phase,
// so they are secretly the same operator: once a lap they pass through the
// exact same point at the exact same instant and flash together.
const ORB_GEO = new IcosahedronGeometry(0.24, 1);

function TwinPaths({ place }) {
  const A = place.radiation ?? place.color;
  const AX = 6.2, AZ = -1.2;
  const refA = useRef(null);
  const refB = useRef(null);
  const matOrb = useMemo(() => lamp(A, 1.3).clone(), [A]);
  const anim = useRef({ t: 0 });
  useFrame((state, dt) => {
    const a = anim.current;
    a.t += dt * 0.7 * areaPulse(place);
    const t = a.t % (Math.PI * 2);
    const cosT = Math.cos(t), sinT = Math.sin(t);
    const R = 0.85;
    const ax = AX + R * cosT, az = AZ + R * sinT;
    const denom = 1 + sinT * sinT;
    const bx = AX + (R * cosT) / denom, bz = AZ + (R * cosT * sinT) / denom;
    const nearZero = Math.min(t, Math.PI * 2 - t) < 0.18;
    matOrb.emissiveIntensity = nearZero ? 2.6 : 1.3;
    const s = nearZero ? 1.5 : 1;
    if (refA.current) { refA.current.position.set(ax, 0.55, az); refA.current.scale.setScalar(s); }
    if (refB.current) { refB.current.position.set(bx, 0.55, bz); refB.current.scale.setScalar(s); }
  });
  return (
    <>
      <mesh ref={refA} geometry={ORB_GEO} material={matOrb} castShadow />
      <mesh ref={refB} geometry={ORB_GEO} material={matOrb} castShadow />
    </>
  );
}

// ------------------------------------------------------------ epsilon-hollow
// "Memory, files and scheduler, on one sphere." Three boulders float,
// unsupported, in a perfect circular orbit around empty air -- points
// constrained to a sphere with no sphere anyone can see.
const BOULDER_GEO = new IcosahedronGeometry(0.38, 0);

function OrbitingBoulders({ place }) {
  const A = place.radiation ?? place.color;
  const AX = -6.0, AZ = -1.4;
  const r1 = useRef(null), r2 = useRef(null), r3 = useRef(null);
  const matBoulder = mat(C.ice, { emissive: A, emissiveIntensity: 0.4 });
  const anim = useRef({ t: 0 });
  useFrame((state, dt) => {
    const a = anim.current;
    a.t += dt * 0.8 * areaPulse(place);
    const t = a.t;
    const R = 1.1, Y = 2.1;
    [r1, r2, r3].forEach((ref, i) => {
      if (!ref.current) return;
      const ang = t + i * ((Math.PI * 2) / 3);
      ref.current.position.set(AX + R * Math.cos(ang), Y + Math.sin(t * 1.3 + i) * 0.15, AZ + R * Math.sin(ang));
      ref.current.rotation.x = t * 0.6 + i;
      ref.current.rotation.y = t * 0.4 + i;
    });
  });
  return (
    <>
      <mesh ref={r1} geometry={BOULDER_GEO} material={matBoulder} castShadow />
      <mesh ref={r2} geometry={BOULDER_GEO} material={matBoulder} castShadow />
      <mesh ref={r3} geometry={BOULDER_GEO} material={matBoulder} castShadow />
    </>
  );
}

// ------------------------------------------------------------- aether-lang
// "Loops stop when their shape stops changing." A top spins out a ring
// groove in the snow; the ring's glow fills in exactly as far as the top
// has travelled. Only when the ring closes -- its shape stops changing --
// does the top stop dead, mid-spin, and hold.
function buildTopGeo() {
  const cone = new ConeGeometry(0.28, 0.5, 7);
  cone.rotateX(Math.PI); // apex down
  cone.translate(0, 0.25, 0); // apex at y=0, wide top at y=0.5
  const handle = new CylinderGeometry(0.075, 0.075, 0.22, 6);
  handle.translate(0, 0.61, 0);
  cone.deleteAttribute("uv");
  handle.deleteAttribute("uv");
  return mergeGeometries([cone, handle]);
}
const TOP_GEO = buildTopGeo();
const FROZEN_RING_GEO = new RingGeometry(0.42, 0.55, 32);

function FrozenTop({ place }) {
  const A = place.radiation ?? place.color;
  const AX = 6.4, AZ = -0.6;
  const topRef = useRef(null);
  const matTop = mat(C.charcoal, { emissive: A, emissiveIntensity: 0.3 });
  const matRing = useMemo(() => glow(A, 0).clone(), [A]);
  const anim = useRef({ phase: 0, spin: 0 });
  const DRAW = 2.4, HOLD = 0.7, FADE = 0.3;
  const CYCLE = DRAW + HOLD + FADE;
  useFrame((state, dt) => {
    const a = anim.current;
    const pulse = areaPulse(place);
    a.phase = (a.phase + dt * pulse) % CYCLE;
    const ph = a.phase;
    const spinning = ph < DRAW || ph >= DRAW + HOLD;
    if (spinning) a.spin += dt * 10 * pulse;
    const orbitAngle = ph < DRAW ? (ph / DRAW) * Math.PI * 2 : Math.PI * 2;
    const R = 0.55;
    if (topRef.current) {
      topRef.current.position.set(AX + R * Math.cos(orbitAngle), 0, AZ + R * Math.sin(orbitAngle));
      topRef.current.rotation.y = a.spin;
    }
    let op;
    if (ph < DRAW) op = ph / DRAW;
    else if (ph < DRAW + HOLD) op = 1;
    else op = 1 - (ph - DRAW - HOLD) / FADE;
    matRing.opacity = Math.max(0, Math.min(1, op)) * 0.85;
  });
  return (
    <>
      <mesh ref={topRef} geometry={TOP_GEO} material={matTop} castShadow />
      <mesh geometry={FROZEN_RING_GEO} material={matRing} position={[AX, 0.02, AZ]} rotation={[-Math.PI / 2, 0, 0]} />
    </>
  );
}

// ----------------------------------------------------------------- caustic
// "Hallucination, measurable with no ground truth." A rainbow, which should
// only ever be a bent arc, closes into a full loop -- hovering, breathing.
const RAINBOW_COLORS = ["#ff3b3b", "#ff9d3b", "#ffe23b", "#3bff6a", "#3bb8ff", "#8a3bff"];

// One merged, per-vertex-coloured geometry instead of six separate meshes
// (the same setColor + mergeGeometries pattern Radiation.jsx uses for its
// trefoil signs) -- one draw call for all six rings.
function setColor(geometry, hex) {
  const c = new Color(hex);
  const n = geometry.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geometry;
}
const RING_GEO = mergeGeometries(
  RAINBOW_COLORS.map((hex, i) => setColor(new TorusGeometry(0.6 + i * 0.09, 0.075, 8, 28), hex)),
  false,
);
const RING_MAT = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });

function ClosedRainbow({ place }) {
  const AX = -6.2, AZ = -1.0, AY = 2.1;
  const groupRef = useRef(null);
  const anim = useRef({ t: 0 });
  useFrame((state, dt) => {
    const a = anim.current;
    a.t += dt * areaPulse(place);
    if (groupRef.current) {
      groupRef.current.rotation.z = a.t * 0.25;
      groupRef.current.scale.setScalar(1 + 0.05 * Math.sin(a.t * 1.4));
    }
  });
  return (
    <group ref={groupRef} position={[AX, AY, AZ]}>
      <mesh geometry={RING_GEO} material={RING_MAT} castShadow />
    </group>
  );
}

// --------------------------------------------------------------- monodromy
// "Can it be undone? Topology answers." Five ice shards, tallest first,
// visibly count backwards -- shrinking away one at a time -- then reset and
// count down again.
const ICICLE_GEO = new ConeGeometry(0.16, 1, 6).translate(0, 0.5, 0); // base pinned at y=0
// A jittered cluster (both x and z vary, never collinear) with heights that
// don't sort by position, and a shrink order that isn't index order either --
// so the group never reads as a sorted bar chart / descending staircase.
const ICICLE_OFFSETS = [
  [-0.55, -0.12], [0.48, -0.42], [-0.08, 0.5], [0.38, 0.2], [-0.42, 0.38],
];
const ICICLE_BASE_H = [0.64, 1.0, 0.28, 0.82, 0.46];
const ICICLE_ORDER = [2, 4, 0, 3, 1]; // which shard shrinks at slot i

function BackwardIcicles({ place }) {
  const A = place.radiation ?? place.color;
  const AX = 6.0, AZ = -1.6;
  const meshRef = useRef(null);
  const matIce = mat(C.ice, { emissive: A, emissiveIntensity: 0.5 });
  const anim = useRef({ phase: 0 });
  const SLOT = 0.85, SHRINK = 0.5;
  const CYCLE = 5 * SLOT;
  useFrame((state, dt) => {
    const a = anim.current;
    a.phase = (a.phase + dt * areaPulse(place)) % CYCLE;
    for (let i = 0; i < 5; i++) {
      const slot = ICICLE_ORDER[i];
      const startAt = i * SLOT;
      let mul;
      if (a.phase < startAt) mul = 1;
      else if (a.phase < startAt + SHRINK) mul = 1 - smoothstep(startAt, startAt + SHRINK, a.phase) * 0.9;
      else mul = 0.1;
      const [ox, oz] = ICICLE_OFFSETS[slot];
      dummy.position.set(AX + ox, 0, AZ + oz);
      dummy.scale.set(1, ICICLE_BASE_H[slot] * mul, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(slot, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={meshRef} args={[ICICLE_GEO, matIce, 5]} castShadow />;
}

// ------------------------------------------------------- topological-ml-toolkit
// "The shape of data, as an ordinary feature." Ordinary snowfall, inverted:
// a small patch of snow falls upward into the sky instead of down.
const SNOW_GEO = new IcosahedronGeometry(0.09, 0);
const SNOW_N = 10;

function UpwardSnow({ place }) {
  const AX = -6.4, AZ = -0.8;
  const A = place.radiation ?? place.color;
  const meshRef = useRef(null);
  const matSnow = mat("#fbfaf7", { emissive: A, emissiveIntensity: 0.45 });
  const seeds = useMemo(() => {
    const rand = mulberry32(20260930);
    return Array.from({ length: SNOW_N }, () => ({
      x: (rand() - 0.5) * 1.1,
      z: (rand() - 0.5) * 1.1,
      speed: 0.45 + rand() * 0.35,
      offset: rand() * 3.4,
      sway: rand() * Math.PI * 2,
    }));
  }, []);
  const anim = useRef({ t: 0 });
  useFrame((state, dt) => {
    const a = anim.current;
    a.t += dt * areaPulse(place);
    for (let i = 0; i < SNOW_N; i++) {
      const s = seeds[i];
      const y = (a.t * s.speed + s.offset) % 3.4;
      const sway = Math.sin(a.t * 1.4 + s.sway) * 0.14;
      dummy.position.set(AX + s.x + sway, y, AZ + s.z);
      dummy.scale.setScalar(0.6 + 0.4 * Math.min(1, y / 0.6));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={meshRef} args={[SNOW_GEO, matSnow, SNOW_N]} castShadow />;
}

// ----------------------------------------------------------------- faraday
// "The field coupling, found rather than assumed." A rivulet of meltwater
// runs visibly uphill along a snowbank -- the coupling nothing assumed it
// would have.
const RAMP_GEO = (() => {
  const geo = new BoxGeometry(0.9, 0.18, 2.4);
  const tilt = 22 * (Math.PI / 180);
  geo.rotateX(-tilt);
  geo.translate(0, 0.1 + 1.2 * Math.sin(tilt), 0);
  return geo;
})();
const DROPLET_GEO = new IcosahedronGeometry(0.13, 0);

function UphillTrickle({ place }) {
  const A = place.radiation ?? place.color;
  const AX = 6.2, AZ = -1.2;
  const meshRef = useRef(null);
  const matRamp = mat(C.ice, { emissive: A, emissiveIntensity: 0.15, roughness: 0.5 });
  const matWater = lamp(A, 1.0);
  const anim = useRef({ t: 0 });
  const N = 6;
  const LOW = [AX, 0.14, AZ - 1.11];
  const HIGH = [AX, 0.92, AZ + 1.11];
  useFrame((state, dt) => {
    const a = anim.current;
    a.t += dt * 0.55 * areaPulse(place);
    for (let i = 0; i < N; i++) {
      const u = (a.t + i / N) % 1;
      dummy.position.set(
        LOW[0] + (HIGH[0] - LOW[0]) * u,
        LOW[1] + (HIGH[1] - LOW[1]) * u,
        LOW[2] + (HIGH[2] - LOW[2]) * u,
      );
      dummy.scale.setScalar(0.7 + 0.3 * Math.sin(u * Math.PI));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <mesh geometry={RAMP_GEO} material={matRamp} position={[AX, 0, AZ]} receiveShadow castShadow />
      <instancedMesh ref={meshRef} args={[DROPLET_GEO, matWater, N]} castShadow />
    </>
  );
}

// -------------------------------------------------------------------- nerve
// "The control that could kill my result." A splash bursts outward, holds
// -- suspended, unfalling -- then collapses back to nothing and bursts
// again: the control replayed every cycle.
const SPLASH_DIRS = Array.from({ length: 8 }, (_, i) => {
  const ang = (i / 8) * Math.PI * 2;
  const elev = 0.6 + 0.35 * (i % 2);
  return [Math.cos(ang) * 0.8, elev, Math.sin(ang) * 0.8];
});

function FrozenSplash({ place }) {
  const A = place.radiation ?? place.color;
  const AX = -6.0, AZ = -1.8;
  const meshRef = useRef(null);
  const matDrop = lamp(A, 1.1);
  const anim = useRef({ t: 0 });
  const BURST = 0.35, HOLD = 2.4, COLLAPSE = 0.35;
  const CYCLE = BURST + HOLD + COLLAPSE;
  useFrame((state, dt) => {
    const a = anim.current;
    a.t = (a.t + dt * areaPulse(place)) % CYCLE;
    const t = a.t;
    let k;
    if (t < BURST) k = easeOutBack(t / BURST);
    else if (t < BURST + HOLD) k = 1;
    else k = 1 - smoothstep(BURST + HOLD, CYCLE, t);
    const bobbing = t > BURST && t < BURST + HOLD;
    for (let i = 0; i < 8; i++) {
      const [dx, dy, dz] = SPLASH_DIRS[i];
      const bob = bobbing ? Math.sin(state.clock.elapsedTime * 2 + i) * 0.03 : 0;
      dummy.position.set(AX + dx * k, 0.1 + dy * k + bob, AZ + dz * k);
      dummy.scale.setScalar(0.85 + 0.3 * k);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={meshRef} args={[DROPLET_GEO, matDrop, 8]} castShadow />;
}

// -------------------------------------------------------------- separatrix
// "Decided by the data, not by rounding." A snowball -- which should always
// round -- refuses: it stays a perfect cube while it bounces and rolls.
const CUBE_GEO = new BoxGeometry(0.6, 0.6, 0.6);

function CubeSnowball({ place }) {
  const A = place.radiation ?? place.color;
  const AX = 6.4, AZ = -1.0;
  const ref = useRef(null);
  const matCube = mat(C.snow, { emissive: A, emissiveIntensity: 0.32 });
  const anim = useRef({ t: 0, squash: 1 });
  const BOUNCE_T = 1.6;
  useFrame((state, dt) => {
    const a = anim.current;
    a.t += dt * areaPulse(place);
    const cyclePos = (a.t % BOUNCE_T) / BOUNCE_T;
    const hop = Math.abs(Math.sin(cyclePos * Math.PI));
    const y = 0.31 + hop * 0.22;
    const landing = cyclePos > 0.92 || cyclePos < 0.08;
    a.squash += ((landing ? 0.7 : 1) - a.squash) * damp(10, dt);
    if (ref.current) {
      ref.current.position.set(AX, y, AZ);
      ref.current.rotation.y = a.t * 0.9;
      ref.current.rotation.x = a.t * 0.5;
      ref.current.scale.set(1 / Math.sqrt(a.squash), a.squash, 1 / Math.sqrt(a.squash));
    }
  });
  return <mesh ref={ref} geometry={CUBE_GEO} material={matCube} castShadow />;
}

// -------------------------------------------------------------- planimeter
// "Exact, or refused." A fish leaps -- and refuses to complete the jump: it
// freezes exactly at the top of its arc, holds, then sinks straight back
// down without ever landing.
function buildFishGeo() {
  const body = new SphereGeometry(0.26, 8, 6);
  body.scale(1.8, 0.62, 1);
  const tail = new BoxGeometry(0.14, 0.34, 0.44);
  tail.translate(-0.62, 0, 0);
  body.deleteAttribute("uv");
  tail.deleteAttribute("uv");
  return mergeGeometries([body, tail]);
}
const FISH_GEO = buildFishGeo();

function RefusingFish({ place }) {
  const A = place.radiation ?? place.color;
  const AX = -6.2, AZ = -1.4;
  const ref = useRef(null);
  const matFish = mat(C.ice, { emissive: A, emissiveIntensity: 0.5 });
  const anim = useRef({ t: 0 });
  const RISE = 0.7, HOLD = 1.6, SINK = 0.5;
  const CYCLE = RISE + HOLD + SINK;
  useFrame((state, dt) => {
    const a = anim.current;
    a.t = (a.t + dt * areaPulse(place)) % CYCLE;
    const t = a.t;
    let y, tilt, x;
    if (t < RISE) {
      const k = smoothstep(0, RISE, t);
      y = 0.15 + k * 1.3;
      x = k * 0.3;
      tilt = 0.5 * (1 - k);
    } else if (t < RISE + HOLD) {
      y = 1.45 + Math.sin((t - RISE) * 3) * 0.03;
      x = 0.3;
      tilt = 0;
    } else {
      const k = (t - RISE - HOLD) / SINK;
      y = 1.45 - k * 1.3;
      x = 0.3;
      tilt = -0.6 * k;
    }
    if (ref.current) {
      ref.current.position.set(AX + x, y, AZ);
      ref.current.rotation.z = tilt;
    }
  });
  return <mesh ref={ref} geometry={FISH_GEO} material={matFish} castShadow />;
}

// ------------------------------------------------------------------ tangle
// "It refuses rather than guesses." A rope ties itself into a knot, holds,
// then unties back to a loose loop -- no hands.
const ROPE_N = 24;
const ROPE_LOOP = [];
const ROPE_KNOT = [];
for (let i = 0; i < ROPE_N; i++) {
  const th = (i / ROPE_N) * Math.PI * 2;
  ROPE_LOOP.push([0.6 * Math.cos(th), 0.55, 0.6 * Math.sin(th)]);
  const rr = 0.35 * (1 + 0.4 * Math.cos(2 * th));
  ROPE_KNOT.push([rr * Math.cos(th), 0.55 + 0.22 * Math.sin(3 * th), rr * Math.sin(th)]);
}
const BEAD_GEO = new IcosahedronGeometry(0.1, 0);

function SelfTyingRope({ place }) {
  const A = place.radiation ?? place.color;
  const AX = 5.8, AZ = -1.8;
  const meshRef = useRef(null);
  const matBead = mat(A, { emissive: A, emissiveIntensity: 0.5 });
  const anim = useRef({ phase: 0 });
  const CYCLE = 4.2;
  useFrame((state, dt) => {
    const a = anim.current;
    a.phase = (a.phase + dt * areaPulse(place)) % CYCLE;
    const ph = a.phase;
    let u;
    if (ph < 1.0) u = 0;
    else if (ph < 2.0) u = smoothstep(1.0, 2.0, ph);
    else if (ph < 3.2) u = 1;
    else u = 1 - smoothstep(3.2, 4.2, ph);
    for (let i = 0; i < ROPE_N; i++) {
      const [lx, ly, lz] = ROPE_LOOP[i];
      const [kx, ky, kz] = ROPE_KNOT[i];
      dummy.position.set(AX + lx + (kx - lx) * u, ly + (ky - ly) * u, AZ + lz + (kz - lz) * u);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={meshRef} args={[BEAD_GEO, matBead, ROPE_N]} castShadow />;
}

// ---------------------------------------------------------------- component

const LAB_TRICKS = {
  "p-resolvent": TwinPaths,
  "p-epsilon-hollow": OrbitingBoulders,
  "p-aether-lang": FrozenTop,
  "p-caustic": ClosedRainbow,
  "p-monodromy": BackwardIcicles,
  "p-topological-ml-toolkit": UpwardSnow,
  "p-faraday": UphillTrickle,
  "p-nerve": FrozenSplash,
  "p-separatrix": CubeSnowball,
  "p-planimeter": RefusingFish,
  "p-tangle": SelfTyingRope,
};

const LAB_PLACES = PLACES.filter((p) => p.section === "lab");

export default function LabAnomalies() {
  return (
    <>
      {LAB_PLACES.map((place) => {
        const Trick = LAB_TRICKS[place.id];
        if (!Trick) return null;
        return (
          <group key={place.id} position={[place.x, 0, place.z]}>
            <Trick place={place} />
          </group>
        );
      })}
    </>
  );
}
