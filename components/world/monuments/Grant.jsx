"use client";

// dsx-ai-factory/topograph #432's story (the "grant" figure, "Gates that
// withdraw a cluster wide reach"), grown out of the ice island it floats on
// in the NVIDIA moat (components/world/land/Moat.jsx).
//
// Retells teerthsharma.github.io's figure: a chart install's ServiceAccount
// (the gem, front and centre on its own knob of ice) used to reach every
// pod, node and daemonset agent in a hall of clear ice nodes, cluster wide:
// coral arcs from the gem to every pod (pods list, the low canopy), every
// node (nodes get/list, the middle) and every agent (daemonsets get, the
// high). Two rings of mint ice crystals (engine.name, provider.name) grow up
// round the install; as their rising edge reaches each canopy, low first,
// that canopy's arcs pull back into the gem with a spark. The gem turns from
// coral to mint, the cluster keeps running the whole time, then the crystals
// melt back and the cycle repeats (figure.desc).
//
// Local origin: the ice island's snow top; +z faces the camera and the dock,
// so the gem stands front and centre and the hall stands behind it.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, CylinderGeometry, Object3D, OctahedronGeometry, QuadraticBezierCurve3, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { smoothstep } from "../life/util";
import { C, mat } from "../palette";
import GrantHall, { REACH } from "./parts/grant-hall";

const dummy = new Object3D();

const CORAL = "#d9376e"; // site.css --coral-500: the old, cluster-wide reach
const MINT = "#0b93ab"; // site.css --mint-500: gated to the rules that apply
const CORAL_C = new Color(CORAL);
const MINT_C = new Color(MINT);

const CYCLE = 11; // s at rest; near speeds this up
const HOLD_CORAL = 0.14; // fully out, coral, before the gates grow
const GATES_UP = 0.5; // the gates finish rising here
const HOLD_MINT = 0.7; // gates up, gem mint
// low canopy (pods list), then mid (nodes get/list), then high (daemonsets
// get) withdraw in this order as the gates rise past each one, and return in
// the reverse order as the gates sink back down.
const CUT = [0.3, 0.62, 0.9];
const APEX = [0.7, 1.35, 2.05]; // how high each canopy's arcs rise over their chord

const INSTALL = [0, 0, 1.12];
const GEM_R = 0.36;
const KNOB_H = 0.42;
const GEM_Y = KNOB_H + GEM_R;
const GATE_R = [0.5, 0.68];
const GATE_N = [10, 13]; // crystals per ring
const GATE_H = 1.7;

function crystalRing(radius, count, offset) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * Math.PI * 2;
    items.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius, ry: -a, h: 0.8 + 0.35 * ((i * 0.618) % 1) });
  }
  return items;
}
const GATE_LAYOUT = [crystalRing(GATE_R[0], GATE_N[0], 0), crystalRing(GATE_R[1], GATE_N[1], Math.PI / GATE_N[1])];

// Gate progress across one cycle: 0 (down) -> 1 (up) -> 1 (held) -> 0 (down
// again), eased through both moves. The gates' height, the gem's colour and
// all three canopies read off this one number, so they stay in lockstep.
function gateProgress(p) {
  if (p < HOLD_CORAL) return 0;
  if (p < GATES_UP) return smoothstep(HOLD_CORAL, GATES_UP, p);
  if (p < HOLD_MINT) return 1;
  return 1 - smoothstep(HOLD_MINT, 1, p);
}
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const canopyVis = (gh, cut) => 1 - smoothstep(cut - 0.05, cut + 0.05, gh);

// Each canopy's arcs, gem-relative (the canopy's group sits on the gem, so
// scaling it pulls every arc back into the gem), merged into one geometry.
const gem = new Vector3(INSTALL[0], GEM_Y, INSTALL[2]);
const canopyGeo = REACH.map((targets, k) =>
  mergeGeometries(
    targets.map(([x, y, z]) => {
      const end = new Vector3(x, y, z).sub(gem);
      const mid = end.clone().multiplyScalar(0.5);
      mid.y += APEX[k];
      return new TubeGeometry(new QuadraticBezierCurve3(new Vector3(), mid, end), 14, 0.06, 5, false);
    }),
  ),
);

const gemGeo = new OctahedronGeometry(GEM_R, 0);
const knobGeo = new CylinderGeometry(0.2, 0.42, KNOB_H, 7);
// A crystal's own base sits at y = 0, so scaling the ring's group on Y
// grows every crystal from the ice up together.
const crystalGeo = new CylinderGeometry(0.02, 0.12, GATE_H, 5).translate(0, GATE_H / 2, 0);

const knobMat = mat(C.deepIce, { roughness: 0.35 });
const gateMat = mat(MINT, { roughness: 0.2, metalness: 0.15, emissive: MINT, emissiveIntensity: 0.35 });
const arcMat = mat(CORAL, { roughness: 0.5, emissive: CORAL, emissiveIntensity: 0.8 });

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
        dummy.scale.set(1, it.h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, []);

  // cloned once per mount (never mutate a cached mat())
  const gemMat = useMemo(() => mat(CORAL, { roughness: 0.25, metalness: 0.2, emissive: CORAL, emissiveIntensity: 0.55 }).clone(), []);

  useFrame((state) => {
    const speed = near ? 1.8 : 1;
    const t = state.clock.elapsedTime * speed;
    const p = (t % CYCLE) / CYCLE;
    const gh = gateProgress(p);
    const flash = Math.max(bump(gh, CUT[0], 0.05), bump(gh, CUT[1], 0.05), bump(gh, CUT[2], 0.05));

    const gateScale = Math.max(0.001, gh);
    if (gateGroupRefs.current[0]) gateGroupRefs.current[0].scale.y = gateScale;
    if (gateGroupRefs.current[1]) gateGroupRefs.current[1].scale.y = gateScale;

    // the gem: coral (granted cluster wide) -> mint (gated), with a spark on
    // every rule it loses.
    gemMat.color.lerpColors(CORAL_C, MINT_C, gh);
    gemMat.emissive.copy(gemMat.color);
    gemMat.emissiveIntensity = (0.5 + flash * 1.6) * (near ? 1.3 : 1);
    if (gemRef.current) {
      gemRef.current.scale.setScalar(1 + flash * 0.3);
      gemRef.current.rotation.y = t * 0.3;
    }

    // the three canopies withdraw into the gem in order as gh rises past
    // each cut, and come back out in reverse as gh falls back past it.
    for (let k = 0; k < 3; k++) {
      const ring = canopyRefs.current[k];
      if (!ring) continue;
      const vis = canopyVis(gh, CUT[k]);
      ring.visible = vis > 0.01;
      ring.scale.setScalar(0.03 + 0.97 * vis);
    }
  });

  return (
    <group>
      {/* the install: a knob of ice, a gem for its ServiceAccount, two rings
          of crystals (engine.name, provider.name) that grow together */}
      <group position={INSTALL}>
        <mesh position={[0, KNOB_H / 2 - 0.04, 0]} castShadow receiveShadow material={knobMat} geometry={knobGeo} />
        <mesh ref={gemRef} position={[0, GEM_Y, 0]} castShadow material={gemMat} geometry={gemGeo} />
        {GATE_LAYOUT.map((items, ring) => (
          <group key={ring} ref={(el) => (gateGroupRefs.current[ring] = el)}>
            <instancedMesh ref={(el) => (gateMeshRefs.current[ring] = el)} args={[crystalGeo, gateMat, items.length]} castShadow />
          </group>
        ))}
      </group>

      {/* the reach: coral arcs from the gem to every pod, node and agent */}
      {canopyGeo.map((geo, k) => (
        <mesh key={k} ref={(el) => (canopyRefs.current[k] = el)} position={gem} geometry={geo} material={arcMat} />
      ))}

      {/* the hall: it keeps running the whole time (figure.desc) */}
      <GrantHall accent={place.color} />
    </group>
  );
}
