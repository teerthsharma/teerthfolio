"use client";

// Sculpture for the "grant" figure: dsx-ai-factory/topograph #432 (place id
// pr-topograph-432), figure.title "Gates that withdraw a cluster wide reach".
//
// Retells teerthsharma.github.io's figure: a chart install's ServiceAccount
// — the gem, front and centre on its own disc — used to reach every pod,
// node and daemonset agent in a hall of server blades, cluster wide (three
// canopies of coral light: pods list, nodes get/list, daemonsets get). Two
// glass gates (engine.name, provider.name) rise around the install; as their
// edge reaches each canopy, low first, it withdraws into the gem, in that
// order. The gem turns from coral to mint, the floor goes calm, the cluster
// itself keeps running the whole time, and the cycle then repeats
// (figure.desc). Colours are the figure's own (site.css --coral-500 /
// --mint-500), not the org accent, which the plinth already carries.
//
// Local origin: the plinth top; +z faces the camera and the dock, so the gem
// stands front-and-centre and the hall of blades stands behind it.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, MeshBasicMaterial, Object3D, OctahedronGeometry, PlaneGeometry, RingGeometry } from "three";
import { smoothstep } from "../life/util";
import { C, mat } from "../palette";
import GrantHall, { HALL_BOUNDS } from "./parts/grant-hall";

const dummy = new Object3D();

const CORAL = "#d9376e"; // site.css --coral-500: the old, cluster-wide reach
const MINT = "#0b93ab"; // site.css --mint-500: gated to the rules that apply
const CORAL_C = new Color(CORAL);
const MINT_C = new Color(MINT);

const CYCLE = 11; // s at rest; near speeds this up (see useFrame)
const HOLD_CORAL = 0.14; // fully out, coral, before the gates move
const GATES_UP = 0.5; // the gates finish rising here
const HOLD_MINT = 0.7; // gates up, gem mint, floor calm
// low canopy (pods list), then mid (nodes get/list), then high (daemonsets
// get) withdraw in this order as the gates rise past each one, and return in
// the reverse order as the gates sink back down.
const CUT = [0.3, 0.62, 0.9];

const GEM_R = 0.42;
const PED_R = 0.3;
const PED_H = 0.5;
const GEM_Y = PED_H + GEM_R;
// The two gates are rings of short crystal teeth, not a smooth glass sheet —
// a thin wall reads as almost nothing from the island's high, looking-down
// camera; a ring of chunky faceted pillars keeps a strong silhouette at any
// angle and still stays under the island's footprint (radius <= 3.4 m).
const GATE_R = [0.5, 0.68];
const GATE_N = [10, 13]; // pillars per ring
const GATE_H = 1.85;
const PILLAR_TOP_R = 0.05;
const PILLAR_BOT_R = 0.09;
const CANOPY_Y = [0.6, 1.1, 1.65];
const CANOPY_RX = [1.3, 1.55, 1.8];
const CANOPY_RZ = [1.9, 2.15, 2.4];
const CANOPY_Z = -0.1;

function pillarRing(radius, count, offset) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * Math.PI * 2;
    items.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius, ry: -a });
  }
  return items;
}
const GATE_LAYOUT = [pillarRing(GATE_R[0], GATE_N[0], 0), pillarRing(GATE_R[1], GATE_N[1], Math.PI / GATE_N[1])];

// Gate progress across one cycle: 0 (down) -> 1 (up) -> 1 (held) -> 0 (down
// again), eased through both moves. The gates' height, the gem's colour and
// all three canopies read off this one number, so they stay in lockstep the
// way the source figure's rising wall edge drives every cut.
function gateProgress(p) {
  if (p < HOLD_CORAL) return 0;
  if (p < GATES_UP) return smoothstep(HOLD_CORAL, GATES_UP, p);
  if (p < HOLD_MINT) return 1;
  return 1 - smoothstep(HOLD_MINT, 1, p);
}
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const canopyVis = (gh, cut) => 1 - smoothstep(cut - 0.05, cut + 0.05, gh);

// Geometry never changes shape, so it is built once, module-level (matches
// parts/grant-hall.jsx).
const gemGeo = new OctahedronGeometry(GEM_R, 0);
const pedGeo = new CylinderGeometry(PED_R, PED_R * 1.08, PED_H, 24);
const discGeo = new CylinderGeometry(GATE_R[1] + 0.3, GATE_R[1] + 0.34, 0.1, 32);
// A pillar's own base sits at y=0 (baked in via translate), so scaling the
// ring's wrapping group on Y grows every tooth from the ground up together.
const pillarGeo = new CylinderGeometry(PILLAR_TOP_R, PILLAR_BOT_R, GATE_H, 6).translate(0, GATE_H / 2, 0);
const canopyGeo = new RingGeometry(0.72, 1, 48);
const washGeo = new PlaneGeometry(HALL_BOUNDS.width, HALL_BOUNDS.depth);

// Static materials (only the mesh's own scale/opacity animates, never these):
const pedMat = mat(C.charcoal);
const discMat = mat(C.warmWhite, { roughness: 0.75 });
const gateMat = mat(MINT, { roughness: 0.2, metalness: 0.15, emissive: MINT, emissiveIntensity: 0.35 });

export default function Grant({ place, near }) {
  const gemRef = useRef();
  const gateGroupRefs = useRef([]);
  const gateMeshRefs = useRef([]);
  const canopyRefs = useRef([]);

  useLayoutEffect(() => {
    GATE_LAYOUT.forEach((items, ring) => {
      const mesh = gateMeshRefs.current[ring];
      if (!mesh) return;
      items.forEach((it, idx) => {
        dummy.position.set(it.x, 0, it.z);
        dummy.rotation.set(0, it.ry, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, []);

  // Animated materials are cloned per mount (palette.js's rule: never mutate
  // a cached mat()/glow() result — clone once, mutate the clone).
  const gemMat = useMemo(() => mat(CORAL, { roughness: 0.25, metalness: 0.2, emissive: CORAL, emissiveIntensity: 0.55 }).clone(), []);
  const canopyMats = useMemo(
    () => CUT.map(() => new MeshBasicMaterial({ color: CORAL, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide })),
    [],
  );
  const washMat = useMemo(() => new MeshBasicMaterial({ color: CORAL, transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), []);

  useFrame((state) => {
    const speed = near ? 1.8 : 1;
    const bright = near ? 1.3 : 1;
    const t = state.clock.elapsedTime * speed;
    const p = (t % CYCLE) / CYCLE;
    const gh = gateProgress(p);
    const flash = Math.max(bump(gh, CUT[0], 0.05), bump(gh, CUT[1], 0.05), bump(gh, CUT[2], 0.05));

    if (typeof window !== "undefined") window.__grantDebug = { near, speed, t, p, gh };
    const gateScale = Math.max(0.001, gh);
    if (gateGroupRefs.current[0]) gateGroupRefs.current[0].scale.y = gateScale;
    if (gateGroupRefs.current[1]) gateGroupRefs.current[1].scale.y = gateScale;

    // the gem: coral (granted cluster wide) -> mint (gated), with a spark on
    // every rule it loses.
    gemMat.color.lerpColors(CORAL_C, MINT_C, gh);
    gemMat.emissive.copy(gemMat.color);
    gemMat.emissiveIntensity = (0.5 + flash * 1.6) * bright;
    if (gemRef.current) {
      gemRef.current.scale.setScalar(1 + flash * 0.28);
      gemRef.current.rotation.y = t * 0.3;
    }

    // the three canopies withdraw into the gem in order as gh rises past
    // each cut, and return in reverse order as gh falls back past it.
    let reach = 0;
    for (let k = 0; k < 3; k++) {
      const vis = canopyVis(gh, CUT[k]);
      reach += vis;
      const s = 0.08 + 0.92 * vis;
      const ring = canopyRefs.current[k];
      if (ring) ring.scale.set(CANOPY_RX[k] * s, CANOPY_RZ[k] * s, 1);
      canopyMats[k].opacity = 0.44 * vis * bright;
    }
    washMat.opacity = 0.2 * (reach / 3) * bright;
  });

  return (
    <group>
      {/* the install: a disc, a gem for its ServiceAccount, two rings of
          crystal teeth (engine.name, provider.name) that rise together */}
      <group position={[0, 0, 1.7]}>
        <mesh position={[0, 0.05, 0]} receiveShadow material={discMat} geometry={discGeo} />
        <mesh position={[0, PED_H / 2, 0]} castShadow receiveShadow material={pedMat} geometry={pedGeo} />
        <mesh ref={gemRef} position={[0, GEM_Y, 0]} castShadow material={gemMat} geometry={gemGeo} />
        {GATE_LAYOUT.map((items, ring) => (
          <group key={ring} ref={(el) => (gateGroupRefs.current[ring] = el)}>
            <instancedMesh ref={(el) => (gateMeshRefs.current[ring] = el)} args={[pillarGeo, gateMat, items.length]} castShadow />
          </group>
        ))}
      </group>

      {/* the reach: three canopies over the whole hall — low (pods list),
          mid (nodes get/list), high (daemonsets get) — that withdraw into
          the gem as the gates rise past them */}
      {CUT.map((_, k) => (
        <mesh
          key={k}
          ref={(el) => (canopyRefs.current[k] = el)}
          position={[0, CANOPY_Y[k], CANOPY_Z]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={canopyMats[k]}
          geometry={canopyGeo}
        />
      ))}
      <mesh position={[0, 0.02, HALL_BOUNDS.z]} rotation={[-Math.PI / 2, 0, 0]} material={washMat} geometry={washGeo} />

      {/* the hall: it keeps running the whole time (figure.desc) */}
      <GrantHall accent={place.color} />
    </group>
  );
}
