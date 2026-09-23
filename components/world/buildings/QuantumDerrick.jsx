"use client";

// Building for PLACE_BY_ID["qpu"] (resolvent) in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (3.4 m).
//
// Silhouette: a black braced derrick over a borehole, joined by a short
// cambered catwalk to a mint drill shack. The derrick is centred at
// x -0.9, the shack at x +2.0.
//
// Story: down the cable is the proof, back up is the code. A bucket rides
// the cable into the borehole and back, three times, lighting one switch
// lamp per return (softmax, kernel, path product); the third return also
// lights the crown lamp and pulses the collar ring - verified - then a
// 2 s hold and a restart. Near the seal the whole cycle runs 1.8x faster.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CapsuleGeometry, CylinderGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

// ---- geometry helpers, run once in useMemo --------------------------------

const UP = new Vector3(0, 1, 0);
const ONE = new Vector3(1, 1, 1);

// A box stretched and rotated to run between two 3D points (legs, girts,
// braces, rails, cable): the one primitive a braced derrick is built from.
function orient(geo, a, b) {
  const dir = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const len = dir.length() || 0.001;
  dir.normalize();
  const quat = new Quaternion().setFromUnitVectors(UP, dir);
  const mid = new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  geo.applyMatrix4(new Matrix4().compose(mid, quat, ONE));
  geo.userData.length = len;
  return geo;
}
function beam(a, b, size) {
  const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 0.001;
  return orient(new BoxGeometry(size, len, size), a, b);
}
function strut(a, b, radius) {
  const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 0.001;
  return orient(new CylinderGeometry(radius, radius, len, 8), a, b);
}
function boxAt(cx, cy, cz, sx, sy, sz) {
  return new BoxGeometry(sx, sy, sz).translate(cx, cy, cz);
}
function cylAt(cx, cy, cz, r, h, segs = 12) {
  return new CylinderGeometry(r, r, h, segs).translate(cx, cy, cz);
}

// Derrick geometry: 4 legs leaning from a wide base to a narrow top, real
// girt-and-X triangulation between them.
const CX = -0.9; // derrick centre x
const BASE_Y = 0.35;
const TOP_Y = 6.4;
const BASE_R = 1.15; // leg base offset from CX/0
const TOP_R = 0.35; // leg top offset from CX/0
function legAt(sx, sz, y) {
  const t = (y - BASE_Y) / (TOP_Y - BASE_Y);
  return { x: CX + sx * (BASE_R + (TOP_R - BASE_R) * t), y, z: sz * (BASE_R + (TOP_R - BASE_R) * t) };
}

// Catwalk: 5 planks in a gentle camber from the derrick platform edge to the
// shack's west wall (its door sits on the +z / camera-facing wall). Held at
// z 0 to clear the winch drum, whose spec position (0.1, 0.65, 0.9) reaches
// z 0.6-1.2 - any catwalk z past ~0.5 clips through it.
const CW_X0 = 0.4;
const CW_X1 = 1.1;
const CW_Z = 0;
const CW_Y0 = 0.35;
const CW_Y1 = 0.3;
const CW_PEAK = 0.15;
const plankPoints = () => {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    pts.push({
      x: CW_X0 + (CW_X1 - CW_X0) * t,
      y: CW_Y0 + (CW_Y1 - CW_Y0) * t + Math.sin(t * Math.PI) * CW_PEAK,
      z: CW_Z,
    });
  }
  return pts;
};

// Bucket travel: the cable runs perfectly vertical (crown and collar share
// x -0.9, z 0), so travel is one lerp on y.
const CABLE_TOP = { x: CX, y: 6.3, z: 0 };
const CABLE_BOTTOM = { x: CX, y: 0.65, z: 0 };
const BUCKET_TOP_Y = 6.3;
const BUCKET_BOTTOM_Y = 0.15;
const HIDE_Y = 0.62; // just under the collar: the bucket vanishes "into the hole"

const ROUND = 5; // 2.5 s down + 2.5 s up
const ROUNDS = 3;
const HOLD = 2;
const CYCLE = ROUND * ROUNDS + HOLD;

const SWITCH_X = [-0.3, 0, 0.3];

const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

export default function QuantumDerrick({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  const kRef = useRef(0); // 0..1, eased toward `near`
  const clockRef = useRef(0); // animation-seconds accumulator, speeds up with k
  const bucketRef = useRef(null); // group: bucket + its glow shell move together
  const winchRef = useRef(null);
  const crownGlowRef = useRef(null);

  // ---- static, merged-per-material geometry --------------------------------
  const merged = useMemo(() => {
    const charcoal = [];
    const warmWhite = [];

    // legs
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      charcoal.push(beam(legAt(sx, sz, BASE_Y), legAt(sx, sz, TOP_Y), 0.2));
    }
    // girt frames
    for (const h of [1.8, 3.3, 4.8, 6.4]) {
      const p11 = legAt(1, 1, h);
      const p1n = legAt(1, -1, h);
      const pn1 = legAt(-1, 1, h);
      const pnn = legAt(-1, -1, h);
      charcoal.push(beam(p11, p1n, 0.16), beam(p1n, pnn, 0.16), beam(pnn, pn1, 0.16), beam(pn1, p11, 0.16));
    }
    // one X per face per bay: real triangulation
    for (const [yA, yB] of [[BASE_Y, 1.8], [1.8, 3.3], [3.3, 4.8], [4.8, 6.4]]) {
      for (const sx of [1, -1]) {
        charcoal.push(beam(legAt(sx, 1, yA), legAt(sx, -1, yB), 0.13));
        charcoal.push(beam(legAt(sx, -1, yA), legAt(sx, 1, yB), 0.13));
      }
      for (const sz of [1, -1]) {
        charcoal.push(beam(legAt(1, sz, yA), legAt(-1, sz, yB), 0.13));
        charcoal.push(beam(legAt(-1, sz, yA), legAt(1, sz, yB), 0.13));
      }
    }
    charcoal.push(boxAt(CX, 6.6, 0, 1.0, 0.5, 1.0)); // crown block
    charcoal.push(strut(CABLE_TOP, CABLE_BOTTOM, 0.06)); // cable
    charcoal.push(cylAt(CX, 0.5, 0, 0.5, 0.3, 16)); // collar
    charcoal.push(boxAt(2.0, 1.99, 0, 2.0, 0.18, 2.2)); // shack roof
    charcoal.push(boxAt(1.4, 0.65, 1.04, 0.7, 1.3, 0.08)); // shack door, +z face, near the catwalk side

    // catwalk: wood planks + a charcoal handrail on each side
    const pts = plankPoints();
    const wood = pts.map((p) => boxAt(p.x, p.y, p.z, 0.3, 0.14, 0.8));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      charcoal.push(beam({ x: a.x, y: a.y + 0.35, z: CW_Z - 0.42 }, { x: b.x, y: b.y + 0.35, z: CW_Z - 0.42 }, 0.12));
      charcoal.push(beam({ x: a.x, y: a.y + 0.35, z: CW_Z + 0.42 }, { x: b.x, y: b.y + 0.35, z: CW_Z + 0.42 }, 0.12));
    }

    warmWhite.push(boxAt(CX, 0.18, 0, 2.6, 0.35, 2.6)); // borehole platform
    for (const cx of [1.1, 2.9]) {
      for (const cz of [-1, 1]) {
        warmWhite.push(beam({ x: cx, y: 0, z: cz }, { x: cx, y: 1.9, z: cz }, 0.15)); // shack corner trim
      }
    }

    return {
      charcoal: mergeGeometries(charcoal, false),
      warmWhite: mergeGeometries(warmWhite, false),
      wood: mergeGeometries(wood, false),
      shackWalls: boxAt(2.0, 0.95, 0, 1.8, 1.9, 2.0),
      hole: cylAt(CX, 0.36, 0, 0.42, 0.03, 16),
    };
  }, []);

  // small animated-part geometries, built once
  const ringGeo = useMemo(() => new TorusGeometry(0.55, 0.12, 10, 24), []);
  const crownLampGeo = useMemo(() => new SphereGeometry(0.24, 14, 10), []);
  const crownGlowGeo = useMemo(() => new SphereGeometry(0.3, 12, 8), []);
  const switchGeo = useMemo(() => new CylinderGeometry(0.14, 0.14, 0.08, 12), []);
  const windowGeo = useMemo(() => new BoxGeometry(0.5, 0.4, 0.05), []);
  const bucketGeo = useMemo(() => new CapsuleGeometry(0.22, 0.35, 4, 8), []);
  const bucketGlowGeo = useMemo(() => new CapsuleGeometry(0.28, 0.35, 4, 8), []);
  const drumGeo = useMemo(() => new CylinderGeometry(0.3, 0.3, 0.7, 16).rotateZ(Math.PI / 2), []);
  const discGeo = useMemo(() => new CylinderGeometry(0.32, 0.32, 0.04, 16).rotateZ(Math.PI / 2), []);

  // ---- materials -------------------------------------------------------
  const charcoalMat = mat(C.charcoal);
  const warmWhiteMat = mat(C.warmWhite);
  const woodMat = mat(C.wood);
  const accentMat = mat(A);
  const holeMat = mat("#1c1f28");
  const bucketMat = lamp(A, 1.2);
  const bucketGlowMat = glow(A);

  // cloned so each instance's emissive can be animated independently of
  // every other building that also uses lamp(A)/glow(A) with this colour
  const ringMat = useMemo(() => mat(A, { emissive: A, emissiveIntensity: 0.2 }).clone(), [A]);
  const crownLampMat = useMemo(() => lamp(A).clone(), [A]);
  const crownGlowMat = useMemo(() => glow(A, 0.28).clone(), [A]);
  const switchMats = useMemo(() => SWITCH_X.map(() => lamp(A).clone()), [A]);
  const windowMat = useMemo(() => lamp(C.lamp, 0.8).clone(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);

    kRef.current += ((near ? 1 : 0) - kRef.current) * ease(4, dt);
    const k = kRef.current;

    clockRef.current += dt * (1 + k * 0.8); // near: cycle runs 1.8x faster
    const t = clockRef.current % CYCLE;
    const inRound = t < ROUND * ROUNDS;
    const rt = inRound ? t % ROUND : 0;
    const descending = inRound && rt < 2.5;
    const litCount = Math.min(ROUNDS, Math.floor(t / ROUND));
    const isHold = !inRound;

    const travel = inRound ? (descending ? rt / 2.5 : 1 - (rt - 2.5) / 2.5) : 0;
    const bucketY = BUCKET_TOP_Y + (BUCKET_BOTTOM_Y - BUCKET_TOP_Y) * travel;
    if (bucketRef.current) {
      bucketRef.current.position.y = bucketY;
      bucketRef.current.visible = bucketY > HIDE_Y;
    }
    if (winchRef.current && inRound) {
      winchRef.current.rotation.x += dt * (1 + k * 0.8) * (descending ? 6 : -6);
    }

    const eR = ease(6, dt);
    for (let i = 0; i < switchMats.length; i++) {
      const target = i < litCount ? 1.3 : 0.15;
      switchMats[i].emissiveIntensity += (target - switchMats[i].emissiveIntensity) * eR;
    }

    const crownTarget = isHold ? 1.6 : 0.15;
    crownLampMat.emissiveIntensity += (crownTarget - crownLampMat.emissiveIntensity) * eR;
    if (crownGlowRef.current) {
      const glowTarget = isHold ? 1.6 : 1.0;
      const s = crownGlowRef.current.scale.x;
      crownGlowRef.current.scale.setScalar(s + (glowTarget - s) * eR);
    }

    const ringTarget = isHold ? 0.9 + Math.sin(t * 9) * 0.5 : 0.2;
    ringMat.emissiveIntensity += (ringTarget - ringMat.emissiveIntensity) * eR;

    windowMat.emissiveIntensity = 0.8 + k * 0.7;
  });

  return (
    <group>
      <mesh geometry={merged.charcoal} material={charcoalMat} castShadow receiveShadow />
      <mesh geometry={merged.warmWhite} material={warmWhiteMat} castShadow receiveShadow />
      <mesh geometry={merged.wood} material={woodMat} castShadow receiveShadow />
      <mesh geometry={merged.shackWalls} material={accentMat} castShadow receiveShadow />
      <mesh geometry={merged.hole} material={holeMat} receiveShadow />

      <mesh geometry={ringGeo} material={ringMat} position={[CX, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={crownLampGeo} material={crownLampMat} position={[CX, 7.05, 0]} />
      <mesh ref={crownGlowRef} geometry={crownGlowGeo} material={crownGlowMat} position={[CX, 7.05, 0]} />

      {SWITCH_X.map((dx, i) => (
        <mesh key={dx} geometry={switchGeo} material={switchMats[i]} position={[CX + dx, 6.6, 0.54]} rotation={[Math.PI / 2, 0, 0]} />
      ))}

      <group ref={winchRef} position={[0.1, 0.65, 0.9]}>
        <mesh geometry={drumGeo} material={charcoalMat} castShadow />
        <mesh geometry={discGeo} material={accentMat} position={[0.37, 0, 0]} />
        <mesh geometry={discGeo} material={accentMat} position={[-0.37, 0, 0]} />
      </group>

      <group ref={bucketRef} position={[CX, BUCKET_TOP_Y, 0]}>
        <mesh geometry={bucketGeo} material={bucketMat} castShadow />
        <mesh geometry={bucketGlowGeo} material={bucketGlowMat} />
      </group>

      <mesh geometry={windowGeo} material={windowMat} position={[2.5, 1.1, 1.03]} />
    </group>
  );
}
