"use client";

// Building for the "caustic" figure: caustic (place id p-caustic), one of
// the lab projects Teerth built, standing on the snow.
//
// The normal thing, done cooler: a striped lighthouse, its lamp room lit and
// sweeping two beams round the island, faster and brighter the closer the
// seal gets. A ring of small coloured beacon bulbs sits in the lamp room and
// five steadily-lit "proved" lamps ring the gallery deck below it -- purely
// architecture, no numbers, no diagram, no legend to read.
//
// Local origin: the snow at the place centre. +z faces the camera and dock.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D } from "three";
import { useUi } from "../../../lib/world/store";
import { glow, lamp, mat } from "../palette";
import { homePoint, NE } from "./parts/caustic-layout";

const TAU = Math.PI * 2;

// Tower profile: base mound -> foot -> tapered shaft -> gallery -> lamp
// room -> roof. Every radius stays well inside place.radius (3 m).
const BASE_R = 1.05, BASE_H = 0.3;
const FOOT_R = 1.0, FOOT_H = 0.14, FOOT_Y = BASE_H;
const SHAFT_Y = FOOT_Y + FOOT_H, SHAFT_H = 4.6, SHAFT_BASE_R = 0.92, SHAFT_TOP_R = 0.66;
const GALLERY_Y = SHAFT_Y + SHAFT_H, GALLERY_H = 0.16, GALLERY_R = 1.05;
const LAMP_Y = GALLERY_Y + GALLERY_H, LAMP_H = 0.62, LAMP_R = 0.56;
const ROOF_Y = LAMP_Y + LAMP_H, ROOF_H = 0.85, ROOF_R = 0.62;
const FINIAL_Y = ROOF_Y + ROOF_H + 0.1;

const shaftRAt = (y) => {
  const t = Math.min(1, Math.max(0, (y - SHAFT_Y) / SHAFT_H));
  return SHAFT_BASE_R + (SHAFT_TOP_R - SHAFT_BASE_R) * t;
};

const BULB_R = 0.42, BULB_Y = LAMP_Y + LAMP_H / 2; // the beacon ring inside the lamp room
const BOUND_R = 1.0, BOUND_Y = GALLERY_Y + GALLERY_H + 0.1; // the five proved-bound lamps
const BOUND_N = 5;
const RAIL_R = GALLERY_R * 0.97, RAIL_Y = GALLERY_Y + GALLERY_H + 0.09, RAIL_N = 10; // gallery railing: reads "lighthouse" in silhouette

// Two accent stripes plus two accent windows: the classic striped-lighthouse
// silhouette.
const STRIPE_FRACS = [0.2, 0.8], STRIPE_H = 0.5;
const WINDOW_FRACS = [0.12, 0.88], WINDOW_W = 0.22, WINDOW_H = 0.36, WINDOW_D = 0.05;

// Fixed identity colour for the 20 beacon bulbs: a cool teal -> blue ->
// violet gradient by index. Purely decorative -- position and colour are
// set once and never change.
const STOP = [[0x14, 0xb8, 0xc4], [0x4f, 0x7c, 0xff], [0x8a, 0x5c, 0xff]];
function entityColor(i) {
  const f = (i / (NE - 1)) * (STOP.length - 1);
  const k = Math.min(STOP.length - 2, Math.floor(f));
  const s = f - k, a = STOP[k], b = STOP[k + 1];
  return new Color(
    (a[0] + (b[0] - a[0]) * s) / 255,
    (a[1] + (b[1] - a[1]) * s) / 255,
    (a[2] + (b[2] - a[2]) * s) / 255,
  );
}

export default function Caustic({ place }) {
  const near = useUi((s) => s.near === place.id);
  const accent = place.radiation ?? place.color;

  const bulbAt = useMemo(() => {
    const pts = [];
    for (let i = 0; i < NE; i++) {
      const [x, z] = homePoint(i, BULB_R);
      pts.push([x, BULB_Y, z]);
    }
    return pts;
  }, []);
  const boundAt = useMemo(() => {
    const pts = [];
    for (let k = 0; k < BOUND_N; k++) {
      const a = (k / BOUND_N) * TAU + 0.3;
      pts.push([Math.sin(a) * BOUND_R, BOUND_Y, Math.cos(a) * BOUND_R]);
    }
    return pts;
  }, []);
  const railAt = useMemo(() => {
    const pts = [];
    for (let k = 0; k < RAIL_N; k++) {
      const a = (k / RAIL_N) * TAU;
      pts.push([Math.sin(a) * RAIL_R, Math.cos(a) * RAIL_R, a]);
    }
    return pts;
  }, []);

  const bodyMat = useMemo(() => mat("#f3ede4", { roughness: 0.72 }), []);
  const footMat = useMemo(() => mat("#43434c", { roughness: 0.6 }), []);
  const bulbMat = useMemo(() => mat("#ffffff", { roughness: 0.3, metalness: 0.15 }), []);
  const bandMat = useMemo(() => lamp(accent, 0.9), [accent]);
  const boundMat = useMemo(() => lamp(accent, 1.4), [accent]);
  const pileMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 1, roughness: 0.4 }), [accent]);
  // A lit lamp room, not a pale glass drum: an emissive facetted drum whose
  // intensity climbs when the seal is close. Cloned so this building's own
  // near-boost never leaks into another building's cached lamp(accent, 1.3).
  const lampRoomMat = useMemo(() => lamp(accent, 1.3).clone(), [accent]);
  const sweepMat = useMemo(() => glow(accent, 0.16), [accent]);

  const bulbRef = useRef();
  const boundRef = useRef();
  const railRef = useRef();
  const lampRoomRef = useRef();
  const dummy = useMemo(() => new Object3D(), []);

  // Bulbs never move and never change colour: set once.
  useLayoutEffect(() => {
    const mesh = bulbRef.current;
    if (!mesh) return;
    for (let i = 0; i < NE; i++) {
      const [x, y, z] = bulbAt[i];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.085);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, entityColor(i));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bulbAt, dummy]);

  // The five proved bounds: steadily lit (they are proved, not guessed), so
  // position, scale and colour are all set once.
  useLayoutEffect(() => {
    const mesh = boundRef.current;
    if (!mesh) return;
    for (let k = 0; k < BOUND_N; k++) {
      const [x, y, z] = boundAt[k];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.17);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [boundAt, dummy]);

  // The gallery railing: short chunky posts round the deck's rim, standing
  // in never changing (a real railing, not part of any story). Set once.
  useLayoutEffect(() => {
    const mesh = railRef.current;
    if (!mesh) return;
    for (let k = 0; k < RAIL_N; k++) {
      const [x, z, a] = railAt[k];
      dummy.position.set(x, RAIL_Y, z);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [railAt, dummy]);

  // Faster and brighter when near: the lens climbs, the sweep spins up --
  // the tower's one light-beam behaviour.
  useFrame((_, dt) => {
    lampRoomMat.emissiveIntensity = 1.3 + (near ? 0.6 : 0);
    if (lampRoomRef.current) lampRoomRef.current.rotation.y += dt * (near ? 1.5 : 0.7);
  });

  return (
    <group>
      {/* foundation */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow material={mat("#dbeaf5", { roughness: 0.6 })}>
        <cylinderGeometry args={[BASE_R * 0.85, BASE_R, BASE_H, 9]} />
      </mesh>
      <mesh position={[0, FOOT_Y + FOOT_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <cylinderGeometry args={[FOOT_R * 0.94, FOOT_R, FOOT_H, 9]} />
      </mesh>

      {/* the tower */}
      <mesh position={[0, SHAFT_Y + SHAFT_H / 2, 0]} castShadow receiveShadow material={bodyMat}>
        <cylinderGeometry args={[SHAFT_TOP_R, SHAFT_BASE_R, SHAFT_H, 8]} />
      </mesh>
      {STRIPE_FRACS.map((f) => {
        const y = SHAFT_Y + SHAFT_H * f;
        const r = shaftRAt(y) + 0.015;
        return (
          <mesh key={f} position={[0, y, 0]} castShadow material={bandMat}>
            <cylinderGeometry args={[r, r, STRIPE_H, 8]} />
          </mesh>
        );
      })}
      {WINDOW_FRACS.map((f) => {
        const y = SHAFT_Y + SHAFT_H * f;
        const r = shaftRAt(y);
        return (
          <mesh key={f} position={[Math.sin(0.05) * r, y, Math.cos(0.05) * r]} rotation={[0, 0.05, 0]} material={bandMat}>
            <boxGeometry args={[WINDOW_W, WINDOW_H, WINDOW_D]} />
          </mesh>
        );
      })}

      {/* gallery */}
      <mesh position={[0, GALLERY_Y + GALLERY_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <cylinderGeometry args={[GALLERY_R, GALLERY_R * 0.92, GALLERY_H, 10]} />
      </mesh>
      <instancedMesh ref={boundRef} args={[undefined, boundMat, BOUND_N]}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      {boundAt.map(([x, , z], k) => (
        <mesh key={k} position={[x, BOUND_Y - 0.14, z]} material={footMat}>
          <cylinderGeometry args={[0.06, 0.06, 0.22, 6]} />
        </mesh>
      ))}
      <instancedMesh ref={railRef} args={[undefined, footMat, RAIL_N]} castShadow>
        <boxGeometry args={[0.12, 0.3, 0.12]} />
      </instancedMesh>
      <mesh position={[0, RAIL_Y + 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={footMat}>
        <torusGeometry args={[RAIL_R, 0.06, 6, 20]} />
      </mesh>

      {/* lamp room: a lit, facetted drum around the fixed beacon ring, with
          a pair of sweep beams that show its rotation from the dock */}
      <group ref={lampRoomRef} position={[0, LAMP_Y + LAMP_H / 2, 0]}>
        <mesh castShadow material={lampRoomMat}>
          <cylinderGeometry args={[LAMP_R, LAMP_R, LAMP_H, 12, 1, true]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[3, 0, 0]} material={sweepMat}>
          <coneGeometry args={[0.9, 6, 10, 1, true]} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[-3, 0, 0]} material={sweepMat}>
          <coneGeometry args={[0.9, 6, 10, 1, true]} />
        </mesh>
      </group>
      <instancedMesh ref={bulbRef} args={[undefined, bulbMat, NE]}>
        <sphereGeometry args={[1, 8, 7]} />
      </instancedMesh>

      {/* roof */}
      <mesh position={[0, ROOF_Y + ROOF_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <coneGeometry args={[ROOF_R, ROOF_H, 10]} />
      </mesh>
      <mesh position={[0, FINIAL_Y, 0]} castShadow material={pileMat}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>
    </group>
  );
}
