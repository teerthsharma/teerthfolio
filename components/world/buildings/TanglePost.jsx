"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CatmullRomCurve3, Color, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, lamp, mat } from "../palette";

// Landmark for PLACE_BY_ID["tangle"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (1.8 m).
//
// tangle traces two cables in a photo, counts their crossings and certifies
// whether they're linked -- or refuses and names the crossing to
// re-photograph. The landmark is that pair of cables, live: a Hopf link, one
// lemon and one charcoal, looping once through each other with their ends
// buried in the snow, watched by a boxy camera on a mast. The camera pans to
// each crossing in turn and lights its badge; once both are lit, the
// certificate lamp glows. Every third pass the second crossing is fogged
// over -- the badge stays dark, the camera wags asking for a better shot,
// and nothing gets certified.

const DEG = Math.PI / 180;
const EASE = 4; // shared rate for every ref-eased value: k = 1 - exp(-EASE*dt)
const TILT = 30 * DEG; // the link tilts toward the camera about x

// ---- the link: two circles, each opened with a 50deg gap, their ends
// buried in the snow. Built once at module scope -- the shape never
// changes, only the materials and the badges lit near it do.

function arcPoints(cx, cy, r, gapCenterDeg, gapHalfDeg, segments, plane) {
  const points = [];
  const start = gapCenterDeg + gapHalfDeg;
  const sweep = 360 - gapHalfDeg * 2;
  for (let i = 0; i <= segments; i++) {
    const rad = (start + (i / segments) * sweep) * DEG;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    points.push(plane === "xy" ? new Vector3(cx + r * cos, cy + r * sin, 0) : new Vector3(cx + r * cos, cy, r * sin));
  }
  return points;
}

// Cable A: a vertical circle in the x-y plane, gap at the bottom, ends drop
// straight down into the snow.
function cableAPath() {
  const arc = arcPoints(-0.45, 1.25, 0.9, -90, 25, 40, "xy");
  const g0 = new Vector3(arc[0].x, -0.2, 0);
  const g1 = new Vector3(arc[arc.length - 1].x, -0.2, 0);
  return { curve: new CatmullRomCurve3([g0, ...arc, g1]), ends: [g0, g1] };
}

// Cable B: a flat circle in the x-z plane, gap at the back, ends curve down
// (a bulge outward, then a drop) instead of falling straight.
function cableBPath() {
  const arc = arcPoints(0.45, 1.25, 0.9, -90, 25, 40, "xz");
  const tail = (p) => {
    const dx = p.x - 0.45;
    const dz = p.z;
    const len = Math.hypot(dx, dz) || 1;
    const ox = (dx / len) * 0.3;
    const oz = (dz / len) * 0.3;
    return { mid: new Vector3(p.x + ox, 0.55, p.z + oz), ground: new Vector3(p.x + ox * 0.4, -0.2, p.z + oz * 0.4) };
  };
  const t0 = tail(arc[0]);
  const t1 = tail(arc[arc.length - 1]);
  return { curve: new CatmullRomCurve3([t0.ground, t0.mid, ...arc, t1.mid, t1.ground]), ends: [t0.ground, t1.ground] };
}

const cableA = cableAPath();
const cableB = cableBPath();

function plug(p) {
  const g = new BoxGeometry(0.3, 0.2, 0.2);
  g.translate(p.x, p.y, p.z);
  return g;
}

const LEMON_GEO = mergeGeometries([new TubeGeometry(cableA.curve, 48, 0.15, 8, false), plug(cableA.ends[0]), plug(cableA.ends[1])]);
const CHARCOAL_GEO = mergeGeometries([new TubeGeometry(cableB.curve, 48, 0.15, 8, false), plug(cableB.ends[0]), plug(cableB.ends[1])]);

// Crossings: the two circles share a radius and are offset by exactly that
// radius, so each pierces the other's disc dead centre, at the other's own
// axis point. True pre-tilt coordinates, then tilted to match the link.
function tilt(x, y, z) {
  return new Vector3(x, y * Math.cos(TILT) - z * Math.sin(TILT), y * Math.sin(TILT) + z * Math.cos(TILT));
}
const CROSSING_1 = tilt(0.45, 1.25, 0); // cable A through B's disc
const CROSSING_2 = tilt(-0.45, 1.25, 0); // cable B through A's disc
const CROSSING_1_POS = [CROSSING_1.x, CROSSING_1.y, CROSSING_1.z];
const CROSSING_2_POS = [CROSSING_2.x, CROSSING_2.y, CROSSING_2.z + 0.05];
const FROST_POS = [CROSSING_2.x, CROSSING_2.y, CROSSING_2.z + 0.1];

const MAST_POS = [1.2, 1.1, -0.9];
const HEAD_POS = [1.2, 2.4, -0.9];

function yawTo(from, to) {
  return Math.atan2(to.x - from[0], to.z - from[2]);
}
const YAW_1 = yawTo(HEAD_POS, CROSSING_1);
const YAW_2 = yawTo(HEAD_POS, CROSSING_2);
const YAW_REST = 0;

// Cycle timeline (seconds), looping. Every third cycle the second crossing
// is fogged over and the camera asks for a re-shoot instead of certifying.
const T_DWELL1_END = 4; // pan to crossing 1 + a 3 s dwell
const T_PAN2_END = 5;
const T_DWELL2_END = 6.5;
const T_CERT_END = 8.5;
const CYCLE = 9.5;
const T_WAG_END = T_DWELL1_END + 3; // 7: pan toward crossing 2 (fogged), then wag
const T_CLEAR_END = T_WAG_END + 1; // 8: frost clears
const WAG_AMP = 0.3;
const WAG_FREQ = Math.PI * 2;

export default function TanglePost({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;

  const snowMat = useMemo(() => mat(C.snow, { roughness: 0.9 }), []);
  const lemonMat = useMemo(() => mat(A), [A]);
  const charcoalMat = useMemo(() => mat(C.charcoal), []);
  const headMat = useMemo(() => mat(C.warmWhite), []);
  const lensMat = useMemo(() => lamp(A, 0.8), [A]);
  const frostMat = useMemo(() => mat(C.snow, { opacity: 0.85 }), []);
  const certMat = useMemo(() => lamp(A).clone(), [A]);
  const badge1Mat = useMemo(() => {
    const m = mat(C.ice).clone();
    m.emissive = new Color(A);
    m.emissiveIntensity = 0;
    return m;
  }, [A]);
  const badge2Mat = useMemo(() => {
    const m = mat(C.ice).clone();
    m.emissive = new Color(A);
    m.emissiveIntensity = 0;
    return m;
  }, [A]);

  const pivotRef = useRef(null);
  const frostRef = useRef(null);
  const anim = useRef({ cycleT: 0, cycleIndex: 0 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = anim.current;
    s.cycleT += dt;
    if (s.cycleT >= CYCLE) {
      s.cycleT -= CYCLE;
      s.cycleIndex = (s.cycleIndex + 1) % 3;
    }
    const t = s.cycleT;
    const obscured = s.cycleIndex === 2;
    const isNear = nearRef.current;

    let yawTarget = YAW_REST;
    if (t < T_DWELL1_END) yawTarget = YAW_1;
    else if (!obscured) {
      if (t < T_CERT_END) yawTarget = YAW_2;
    } else if (t < T_WAG_END) {
      yawTarget = YAW_2 + Math.sin((t - T_DWELL1_END) * WAG_FREQ) * WAG_AMP;
    }
    const panK = 1 - Math.exp(-EASE * (isNear ? 1.6 : 1) * dt);
    const pivot = pivotRef.current;
    if (pivot) pivot.rotation.y += (yawTarget - pivot.rotation.y) * panK;

    const k = 1 - Math.exp(-EASE * dt);
    const badge1Target = t >= 1.5 ? 1.2 : 0;
    badge1Mat.emissiveIntensity += (badge1Target - badge1Mat.emissiveIntensity) * k;

    const badge2Target = !obscured && t >= T_PAN2_END + 0.3 ? 1.2 : 0;
    badge2Mat.emissiveIntensity += (badge2Target - badge2Mat.emissiveIntensity) * k;

    const certTarget = isNear || (!obscured && t >= T_DWELL2_END && t < T_CERT_END) ? 1.8 : 0.15;
    certMat.emissiveIntensity += (certTarget - certMat.emissiveIntensity) * k;

    const frostTarget = obscured && t >= T_DWELL1_END && t < T_CLEAR_END ? 1 : 0;
    const frost = frostRef.current;
    if (frost) frost.scale.setScalar(Math.max(frost.scale.x + (frostTarget - frost.scale.x) * k, 0.001));
  });

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.1, 0]} material={snowMat}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 20]} />
      </mesh>

      <group rotation={[TILT, 0, 0]}>
        <mesh castShadow receiveShadow geometry={LEMON_GEO} material={lemonMat} />
        <mesh castShadow receiveShadow geometry={CHARCOAL_GEO} material={charcoalMat} />
      </group>

      <mesh castShadow receiveShadow position={MAST_POS} material={charcoalMat}>
        <boxGeometry args={[0.16, 2.2, 0.16]} />
      </mesh>

      <group ref={pivotRef} position={HEAD_POS}>
        <mesh castShadow receiveShadow material={headMat}>
          <boxGeometry args={[0.5, 0.36, 0.4]} />
        </mesh>
        <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]} material={lensMat}>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 10]} />
        </mesh>
        <mesh position={[0, 0.34, 0]} material={certMat}>
          <sphereGeometry args={[0.16, 12, 10]} />
        </mesh>
      </group>

      <mesh position={CROSSING_1_POS} rotation={[Math.PI / 2, 0, 0]} material={badge1Mat}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 16]} />
      </mesh>
      <mesh position={CROSSING_2_POS} rotation={[Math.PI / 2, 0, 0]} material={badge2Mat}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 16]} />
      </mesh>

      <mesh ref={frostRef} position={FROST_POS} scale={[0.001, 0.001, 0.001]} material={frostMat}>
        <icosahedronGeometry args={[0.3, 0]} />
      </mesh>
    </group>
  );
}
