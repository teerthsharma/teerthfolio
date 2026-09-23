"use client";

// Building for PLACE_BY_ID["field"] in lib/world/places.js: Faraday, where
// two fields settle onto one fixed point and only then does their coupling
// E x H rise. A glowing induction coil lies between two round end plates on
// a warm-white/charcoal skid, under a charcoal gantry arch.
//
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Curve, CylinderGeometry, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

const HELIX_R = 0.95;
const HELIX_TURNS = 5.5;
const HELIX_X0 = -1.65;
const HELIX_X1 = 1.65;
const CORE_Y = 1.95;
const PACKETS = 6;

// Animation timeline: PULSES shrinking pulses, then a fixed point, then the
// light column rises, holds and fades before the cycle restarts.
const PULSES = 6;
const PULSE_DUR = 1.2;
const PULSE_PHASE_DUR = PULSES * PULSE_DUR;
const GROW_DUR = 1.5;
const HOLD_DUR = 3.0;
const FADE_DUR = 1.0;
const COLUMN_MAX = 2.1;
const BASE_INTENSITY = 1.2;
const PULSE_A0 = 1.5;
const PULSE_DECAY = 0.6;

// A helix winding around the core (the x axis), x from HELIX_X0 to HELIX_X1.
class HelixCurve extends Curve {
  getPoint(t, target = new Vector3()) {
    const angle = t * HELIX_TURNS * Math.PI * 2;
    return target.set(HELIX_X0 + (HELIX_X1 - HELIX_X0) * t, CORE_Y + HELIX_R * Math.sin(angle), HELIX_R * Math.cos(angle));
  }
}
const helixX = (t) => HELIX_X0 + (HELIX_X1 - HELIX_X0) * t;
const helixY = (t) => CORE_Y + HELIX_R * Math.sin(t * HELIX_TURNS * Math.PI * 2);
const helixZ = (t) => HELIX_R * Math.cos(t * HELIX_TURNS * Math.PI * 2);

// Geometry builders: each returns a BufferGeometry already positioned in
// local space, ready to merge into one static mesh per material.
function box(w, h, d, x, y, z) {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
// Cylinder with its axis along x (the default is y).
function cylX(r, len, x, y, z) {
  const g = new CylinderGeometry(r, r, len, 20, 1);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
// Torus with its hole facing x (the default faces z).
function torusX(r, tube, x, y, z) {
  const g = new TorusGeometry(r, tube, 10, 28);
  g.rotateY(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
// Skid-runner tip: a box swept up about the origin so its outer edge lifts
// like a sled tip while its inner edge stays low against the runner.
function wedge(xEnd, z, dir) {
  const g = new BoxGeometry(0.5, 0.3, 0.34);
  g.translate(dir * 0.25, 0, 0);
  g.rotateZ(dir * 0.55);
  g.translate(xEnd, 0.15, z);
  return g;
}

export default function FieldCoils({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  const charcoalGeo = useMemo(
    () =>
      mergeGeometries(
        [
          box(5.2, 0.3, 0.34, 0, 0.15, 0.85),
          box(5.2, 0.3, 0.34, 0, 0.15, -0.85),
          wedge(2.6, 0.85, 1),
          wedge(-2.6, 0.85, -1),
          wedge(2.6, -0.85, 1),
          wedge(-2.6, -0.85, -1),
          torusX(1.25, 0.14, 1.9, CORE_Y, 0),
          torusX(1.25, 0.14, -1.9, CORE_Y, 0),
          cylX(0.45, 3.5, 0, CORE_Y, 0),
          torusX(1.05, 0.12, -0.9, CORE_Y, 0),
          torusX(1.05, 0.12, 0, CORE_Y, 0),
          torusX(1.05, 0.12, 0.9, CORE_Y, 0),
          box(0.3, 4.0, 0.3, 2.45, 2.0, 0),
          box(0.3, 4.0, 0.3, -2.45, 2.0, 0),
          box(5.2, 0.34, 0.4, 0, 4.1, 0),
          box(1.4, 0.15, 0.8, 0, 1.375, -2.0), // control box's charcoal top
        ],
        false,
      ),
    [],
  );
  const warmGeo = useMemo(
    () =>
      mergeGeometries(
        [
          box(5.0, 0.4, 2.2, 0, 0.5, 0), // deck
          cylX(1.25, 0.3, 1.9, CORE_Y, 0), // end plates
          cylX(1.25, 0.3, -1.9, CORE_Y, 0),
          box(1.4, 1.3, 0.8, 0, 0.65, -2.0), // control box
        ],
        false,
      ),
    [],
  );
  const coilGeo = useMemo(() => new TubeGeometry(new HelixCurve(), 400, 0.15, 8, false), []);
  const domeGeo = useMemo(() => new SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const packetGeo = useMemo(() => new SphereGeometry(0.2, 10, 8), []);
  const columnGeo = useMemo(() => {
    const g = new CylinderGeometry(0.5, 0.5, 1, 16, 1, true);
    g.translate(0, 0.5, 0); // spans y 0..1 so scale.y doubles as world height
    return g;
  }, []);

  const charcoalMat = mat(C.charcoal);
  const warmMat = mat(C.warmWhite);
  const packetMat = lamp("#fff1c4", 1.5);
  const columnMat = glow(A, 0.2);
  // These two animate their own emissiveIntensity every frame, so each gets
  // its own clone: mutating the shared cached material would leak into
  // every other place that happens to use lamp(A, ...).
  const coilMat = useMemo(() => lamp(A, 1.2).clone(), [A]);
  const domeMat = useMemo(() => lamp(A, 0.3).clone(), [A]);

  const packetRefs = useRef([]);
  const packetT = useRef(new Float32Array(PACKETS).map((_, i) => i / PACKETS));
  const columnRef = useRef();
  const kRef = useRef(0);
  const phase = useRef("pulse"); // "pulse" -> "grow" -> "hold" -> "fade" -> "pulse"
  const phaseT = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    kRef.current += ((near ? 1 : 0) - kRef.current) * (1 - Math.exp(-4 * dt));
    const k = kRef.current;

    let p = phase.current;
    let t = phaseT.current;
    if (p === "pulse") {
      t += dt * (1 + k); // near: packets race twice as fast, steady state arrives sooner
      if (t >= PULSE_PHASE_DUR) {
        p = "grow";
        t = 0;
      }
    } else if (p === "grow") {
      t += dt;
      if (t >= GROW_DUR) {
        p = "hold";
        t = 0;
      }
    } else if (p === "hold") {
      t += dt * (1 - k); // near: the column holds at full height while the seal stays
      if (t >= HOLD_DUR) {
        p = "fade";
        t = 0;
      }
    } else {
      t += dt;
      if (t >= FADE_DUR) {
        p = "pulse";
        t = 0;
        for (let i = 0; i < PACKETS; i++) packetT.current[i] = i * 0.02; // bunch up to race again
      }
    }
    phase.current = p;
    phaseT.current = t;

    if (p === "pulse") {
      const n = Math.min(PULSES - 1, Math.floor(t / PULSE_DUR));
      const amp = PULSE_A0 * PULSE_DECAY ** n;
      const local = (t % PULSE_DUR) / PULSE_DUR;
      coilMat.emissiveIntensity = BASE_INTENSITY + amp * Math.sin(local * Math.PI * 2);
      domeMat.emissiveIntensity = 0.3 + (1 - amp / PULSE_A0) * 1.7;
      const packetSpeed = 0.5 * (amp / PULSE_A0) * (1 + k);
      for (let i = 0; i < PACKETS; i++) {
        let pt = packetT.current[i] + dt * packetSpeed;
        pt -= Math.floor(pt);
        packetT.current[i] = pt;
        const ref = packetRefs.current[i];
        if (ref) ref.position.set(helixX(pt), helixY(pt), helixZ(pt));
      }
    } else {
      coilMat.emissiveIntensity = BASE_INTENSITY;
      domeMat.emissiveIntensity = 2.0;
      for (let i = 0; i < PACKETS; i++) {
        const pt = i / PACKETS;
        const ref = packetRefs.current[i];
        if (ref) ref.position.set(helixX(pt), helixY(pt), helixZ(pt));
      }
    }

    let h = 0;
    if (p === "grow") h = COLUMN_MAX * (t / GROW_DUR);
    else if (p === "hold") h = COLUMN_MAX;
    else if (p === "fade") h = COLUMN_MAX * (1 - t / FADE_DUR);
    const col = columnRef.current;
    if (col) {
      col.visible = h > 0.01;
      col.scale.y = Math.max(h, 0.0001);
    }
  });

  return (
    <group>
      <mesh geometry={charcoalGeo} material={charcoalMat} castShadow receiveShadow />
      <mesh geometry={warmGeo} material={warmMat} castShadow receiveShadow />
      <mesh geometry={coilGeo} material={coilMat} castShadow />
      <mesh geometry={domeGeo} material={domeMat} position={[0, 1.45, -2.0]} castShadow />
      <mesh ref={columnRef} geometry={columnGeo} material={columnMat} position={[0, CORE_Y, 0]} />
      {Array.from({ length: PACKETS }, (_, i) => (
        <mesh key={i} ref={(el) => (packetRefs.current[i] = el)} geometry={packetGeo} material={packetMat} />
      ))}
    </group>
  );
}
